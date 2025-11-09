import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    if (!API_KEY) return NextResponse.json({ error: "Missing OPENWEATHER_API_KEY" }, { status: 500 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    let latitude: number | null = null;
    let longitude: number | null = null;
    let metaCity = ""; let metaCountry = "";

    if (lat && lon) {
      latitude = Number(lat); longitude = Number(lon);
    } else if (q) {
      // Direct geocoding -> lat/lon
      const geo = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=1&appid=${API_KEY}`);
      if (!geo.ok) return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
      const [g] = await geo.json();
      if (!g) return NextResponse.json({ error: "Location not found" }, { status: 404 });
      latitude = g.lat; longitude = g.lon; metaCity = g.name; metaCountry = g.country ?? "";
    } else {
      return NextResponse.json({ error: "Provide q or lat/lon" }, { status: 400 });
    }

    // Current weather
    const currentRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`, { cache: "no-store" });
    if (!currentRes.ok) return NextResponse.json({ error: "Current weather failed" }, { status: 502 });
    const current = await currentRes.json();

    // 5-day / 3-hour forecast
    const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`, { cache: "no-store" });
    if (!forecastRes.ok) return NextResponse.json({ error: "Forecast failed" }, { status: 502 });
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