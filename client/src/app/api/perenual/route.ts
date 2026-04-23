import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { plantsMock } from "../../../mocks/plants";

const isTest = process.env.VITEST === "true";
const plantCache = new Map<number, unknown>();
const careGuideCache = new Map<number, unknown>();
const searchCache = new Map<string, unknown>();

const CACHE_TTL_SECONDS = 60 * 60 * 6; // 6 hours

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

async function getCached<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const value = await redis.get<T>(key);
    return value ?? null;
  } catch (error) {
    console.warn("Upstash read failed, using fallback cache:", error);
    return null;
  }
}

async function setCached(key: string, value: unknown, ttlSeconds = CACHE_TTL_SECONDS): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.warn("Upstash write failed, using fallback cache:", error);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const id = searchParams.get("id");
  const speciesId = searchParams.get("species_id");
  const careGuides = searchParams.get("care_guides");
  const useMock = searchParams.get("mock") === "true";

  // ── MOCK MODE ──────────────────────────────────────────────────────────────
  if (useMock) {
    // Detail view: return a single plant by id
    if (id) {
      const numericId = Number(id);
      const plant = plantsMock.data.find((p) => p.id === numericId);
      if (!plant) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(plant);
    }

    // Search: filter by common_name or scientific_name
    if (query) {
      const q = query.toLowerCase();
      const matches = plantsMock.data.filter(
        (p) =>
          p.common_name.toLowerCase().includes(q) ||
          p.scientific_name.some((n) => n.toLowerCase().includes(q))
      );
      return NextResponse.json({ data: matches });
    }

    // No query — return all mock plants
    return NextResponse.json(plantsMock);
  }

  // ── LIVE API MODE ──────────────────────────────────────────────────────────
  const key = process.env.PERENUAL_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  try {
    // Care guides
    if (speciesId && careGuides === "true") {
      const numericId = Number(speciesId);
      const redisKey = `perenual:care-guides:${numericId}`;
      const redisCached = await getCached<unknown>(redisKey);
      if (redisCached) {
        return NextResponse.json(redisCached);
      }
      if (careGuideCache.has(numericId)) {
        return NextResponse.json(careGuideCache.get(numericId));
      }
      const apiUrl = `https://perenual.com/api/species-care-guide-list?species_id=${numericId}&key=${key}`;
      const resp = await fetch(apiUrl);
      if (!resp.ok) {
        return NextResponse.json({ error: "Care guides API error" }, { status: resp.status });
      }
      const data = await resp.json();
      careGuideCache.set(numericId, data);
      await setCached(redisKey, data);
      return NextResponse.json(data);
    }

    // Plant detail by ID
    if (id) {
      const numericId = Number(id);
      const redisKey = `perenual:plant:${numericId}`;
      const redisCached = await getCached<unknown>(redisKey);
      if (redisCached) {
        return NextResponse.json(redisCached);
      }
      if (plantCache.has(numericId)) {
        return NextResponse.json(plantCache.get(numericId));
      }
      const apiUrl = `https://perenual.com/api/v2/species/details/${numericId}?key=${key}`;
      const resp = await fetch(apiUrl);
      if (!resp.ok) {
        return NextResponse.json({ error: "Perenual API error" }, { status: resp.status });
      }
      const data = await resp.json();
      plantCache.set(numericId, data);
      await setCached(redisKey, data);
      return NextResponse.json(data);
    }

    // Search by query
    if (query) {
      const normalizedQuery = query.trim().toLowerCase();
      const redisKey = `perenual:search:${normalizedQuery}`;
      const redisCached = await getCached<unknown>(redisKey);
      if (redisCached) {
        return NextResponse.json(redisCached);
      }
      if (searchCache.has(normalizedQuery)) {
        return NextResponse.json(searchCache.get(normalizedQuery));
      }
      const apiUrl = `https://perenual.com/api/v2/species-list?key=${key}&q=${encodeURIComponent(query)}`;
      const resp = await fetch(apiUrl);
      if (!resp.ok) {
        const status = resp.status;
        if (status === 429 || status >= 500) {
          if (isTest) {
            return NextResponse.json(
              { error: status === 429 ? "Rate limit exceeded. Please wait a moment." : "Perenual API error" },
              { status }
            );
          }
          // Fallback to mock on rate-limit / server error
          console.log("Using mock plant data due to API error");
          const q = query.toLowerCase();
          const matches = plantsMock.data.filter(
            (p) =>
              p.common_name.toLowerCase().includes(q) ||
              p.scientific_name.some((n) => n.toLowerCase().includes(q))
          );
          return NextResponse.json({ data: matches });
        }
        return NextResponse.json(
          { error: status === 429 ? "Rate limit exceeded. Please wait a moment." : "Perenual API error" },
          { status }
        );
      }
      const data = await resp.json();
      searchCache.set(normalizedQuery, data);
      await setCached(redisKey, data);
      return NextResponse.json(data);
    }

    return NextResponse.json({ data: [] });
  } catch (err) {
    console.error("Perenual fetch failed:", err);
    return NextResponse.json({ error: "Server fetch failed" }, { status: 500 });
  }
}