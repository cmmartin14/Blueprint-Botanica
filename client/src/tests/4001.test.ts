import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "../app/api/weather/route"; // adjust path
import { NextRequest } from "next/server";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  vi.stubEnv("OPENWEATHER_API_KEY", "fake_key");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("GET /api/weather", () => {
  it("returns weather data successfully (via q param)", async () => {
    // Step 1: mock geocoding response
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: 1, lon: 2, name: "TestCity", country: "TC" }],
      })
      // Step 2: mock current weather response
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          main: { temp: 22 },
          weather: [{ icon: "02d", description: "clear" }],
          name: "TestCity",
        }),
      })
      // Step 3: mock forecast response
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          city: { timezone: 0, name: "TestCity", country: "TC" },
          list: [
            {
              dt: 1700000000,
              main: { temp_min: 20, temp_max: 25 },
              weather: [{ icon: "02d", description: "clear sky" }],
            },
          ],
        }),
      });

    const req = new NextRequest("https://example.com/api/weather?q=TestCity");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.city).toBe("TestCity");
    expect(json.current.temp).toBe(22);
    expect(json.daily.length).toBeGreaterThan(0);
  });

  it("returns 400 when missing both q and lat/lon", async () => {
    const req = new NextRequest("https://example.com/api/weather");
    const res = await GET(req);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Provide q or lat/lon" });
  });

  it("returns 500 if missing API key", async () => {
    vi.unstubAllEnvs(); // remove OPENWEATHER_API_KEY
    const req = new NextRequest("https://example.com/api/weather?q=anything");
    const res = await GET(req);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Missing OPENWEATHER_API_KEY" });
  });

  it("returns 404 if location not found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const req = new NextRequest("https://example.com/api/weather?q=Unknown");
    const res = await GET(req);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Location not found" });
  });

  it("returns 502 if geocoding fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    });

    const req = new NextRequest("https://example.com/api/weather?q=Paris");
    const res = await GET(req);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Geocoding failed" });
  });

  it("returns 500 if fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network down"));
    const req = new NextRequest("https://example.com/api/weather?q=Paris");
    const res = await GET(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/network down/i);
  });
});
