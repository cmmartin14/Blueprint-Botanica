import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET as getZip } from "../app/api/zipcode/[zip]/route";
import { GET as getZones } from "../app/api/zones/route";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

/* ---------------- ZIPCODE TESTS ---------------- */

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/zipcode/[zip]", () => {
  it("returns zone when API responds correctly", async () => {
    const fakeZip = "75088";

    mockFetch.mockResolvedValueOnce({
      json: async () => ({ zone: "8b" }),
    });

    const req = new Request(`https://example.com/api/zipcode/${fakeZip}`);
    const res = await getZip(req);

    const json = await res.json();
    expect(json).toEqual({ zone: "8b" });
  });

  it("returns 404 if zone not found", async () => {
    const fakeZip = "00000";

    mockFetch.mockResolvedValueOnce({
      json: async () => ({}),
    });

    const req = new Request(`https://example.com/api/zipcode/${fakeZip}`);
    const res = await getZip(req);

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toEqual({ error: "Zone not found" });
  });

  it("returns 500 if fetch fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const req = new Request(`https://example.com/api/zipcode/75088`);
    const res = await getZip(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ error: "Server error" });
  });
});

/* ---------------- ZONES TESTS ---------------- */

vi.mock("@prisma/client", () => {
  const mockFindMany = vi.fn();
  const mockDisconnect = vi.fn();
  return {
    PrismaClient: vi.fn(() => ({
      zones: { findMany: mockFindMany },
      $disconnect: mockDisconnect,
    })),
  };
});

describe("GET /api/zones", () => {
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = new (PrismaClient as any)();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns all zones successfully", async () => {
    const fakeZones = [
      { id: 1, zone: "1a", temp_min: -60, temp_max: -55 },
      { id: 2, zone: "2a", temp_min: -50, temp_max: -45 },
    ];

    prismaMock.zones.findMany.mockResolvedValueOnce(fakeZones);

    const res = await getZones();
    expect(res).toBeInstanceOf(NextResponse);

    const json = await res.json();
    expect(json).toEqual(fakeZones);
    expect(prismaMock.zones.findMany).toHaveBeenCalledWith({
      orderBy: { id: "asc" },
    });
  });

  it("returns 500 if Prisma throws an error", async () => {
    prismaMock.zones.findMany.mockRejectedValueOnce(
      new Error("Database error")
    );

    const res = await getZones();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Failed to fetch zones" });
  });
});
