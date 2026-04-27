import { NextRequest, NextResponse } from "next/server";

const normalizeApiKey = (value: string | undefined) => {
  if (!value) return "";
  return value.trim().replace(/^['"]|['"]$/g, "");
};

const toFiniteNumber = (value: string | null): number | null => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildUpstreamError = async (response: Response, fallback: string) => {
  try {
    const payload = await response.json();
    const message =
      typeof payload?.message === "string"
        ? payload.message
        : typeof payload?.error === "string"
          ? payload.error
          : fallback;
    return `${fallback}: ${message}`;
  } catch {
    return fallback;
  }
};

const toClientStatus = (upstreamStatus: number): number => {
  if (upstreamStatus === 404) return 404;
  if (upstreamStatus >= 400 && upstreamStatus < 500) return upstreamStatus;
  return 502;
};

export async function GET(req: NextRequest) {
  try {
    const API_KEY = normalizeApiKey(process.env.OPENWEATHER_API_KEY);
    if (!API_KEY) return NextResponse.json({ error: "Missing OPENWEATHER_API_KEY" }, { status: 500 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const latitudeParam = toFiniteNumber(searchParams.get("lat"));
    const longitudeParam = toFiniteNumber(searchParams.get("lon"));

    let latitude: number | null = null;
    let longitude: number | null = null;
    let metaCity = ""; let metaCountry = "";
    if (latitudeParam != null && longitudeParam != null) {
      latitude = latitudeParam;
      longitude = longitudeParam;
    } else if (q) {
      // Direct geocoding -> lat/lon (same flow as the previously working route).
      const geo = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=1&appid=${API_KEY}`,
        { cache: "no-store" }
      );
      if (!geo.ok) {
        const message = await buildUpstreamError(geo, "Geocoding failed");
        return NextResponse.json({ error: message }, { status: toClientStatus(geo.status) });
      }
      const geoPayload = await geo.json();
      const firstResult = Array.isArray(geoPayload) ? geoPayload[0] : undefined;
      if (!firstResult) {
        return NextResponse.json({ error: "Location not found" }, { status: 404 });
      }
      latitude = toFiniteNumber(String(firstResult?.lat));
      longitude = toFiniteNumber(String(firstResult?.lon));
      metaCity = typeof firstResult?.name === "string" ? firstResult.name : "";
      metaCountry =
        typeof firstResult?.country === "string" ? firstResult.country : "";
      if (latitude == null || longitude == null) {
        return NextResponse.json({ error: "Location not found" }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: "Provide q or lat/lon" }, { status: 400 });
    }

    // Current weather
    const currentRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`,
      { cache: "no-store" }
    );
    if (!currentRes.ok) {
      const message = await buildUpstreamError(currentRes, "Current weather failed");
      return NextResponse.json({ error: message }, { status: toClientStatus(currentRes.status) });
    }
    const current = await currentRes.json();

    // 5-day / 3-hour forecast
    const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`, { cache: "no-store" });
    if (!forecastRes.ok) {
      const message = await buildUpstreamError(forecastRes, "Forecast failed");
      return NextResponse.json({ error: message }, { status: toClientStatus(forecastRes.status) });
    }
    const forecast = await forecastRes.json();

    const tz: number = forecast.city?.timezone ?? 0; // seconds
    const cityName: string = metaCity || forecast.city?.name || current.name || "";
    const country: string = metaCountry || forecast.city?.country || "";

    // Group 3-hour entries into daily buckets in the *city's* local time
    const byDay = new Map<string, { min: number; max: number; icon: string; description: string }>();

    for (const item of forecast.list as any[]) {
      const dt: number = item.dt; // seconds UTC
      const local = new Date((dt + tz) * 1000); // shift by tz then treat as UTC
      const y = local.getUTCFullYear();
      const m = `${local.getUTCMonth() + 1}`.padStart(2, "0");
      const d = `${local.getUTCDate()}`.padStart(2, "0");
      const key = `${y}-${m}-${d}`;

      const tmin = item.main.temp_min as number;
      const tmax = item.main.temp_max as number;
      const icon = item.weather?.[0]?.icon || "01d";
      const desc = item.weather?.[0]?.description || "";

      const cur = byDay.get(key);
      if (!cur) byDay.set(key, { min: tmin, max: tmax, icon, description: desc });
      else byDay.set(key, {
        min: Math.min(cur.min, tmin),
        max: Math.max(cur.max, tmax),
        icon: cur.icon, // keep first
        description: cur.description,
      });
    }

    const daily = Array.from(byDay.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(0, 6) // 5–6 days
      .map(([date, v]) => ({ date, temp: { min: v.min, max: v.max }, icon: v.icon, description: v.description }));

    const payload = {
      city: cityName,
      country,
      timezone: tz,
      current: current?.main ? {
        temp: current.main.temp,
        icon: current.weather?.[0]?.icon || "01d",
        description: current.weather?.[0]?.description || "",
      } : undefined,
      daily,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}