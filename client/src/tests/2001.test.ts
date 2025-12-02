import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "../app/api/trefle/route"; 

// Mock global fetch
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  vi.stubEnv("TREFLE_TOKEN", "fake_token"); 
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("GET /api/trefle", () => {
  it("returns plant data when Trefle responds correctly", async () => {
    const fakeQuery = "rose";

    const fakeData = {
      data: [{ id: 1, common_name: "Rose", scientific_name: "Rosa" }],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fakeData,
    });

    const req = new Request(`https://example.com/api/trefle?q=${fakeQuery}`);
    const res = await GET(req);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "https://trefle.io/api/v1/plants/search?q=rose&token=fake_token"
      )
    );

    const json = await res.json();
    expect(json).toEqual(fakeData);
  });

  it("returns 500 if TREFLE_TOKEN is missing", async () => {
    vi.unstubAllEnvs(); // remove TREFLE_TOKEN

    const req = new Request(`https://example.com/api/trefle?q=sunflower`);
    const res = await GET(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ error: "Server misconfigured" });
  });

  it("returns 500 if Trefle returns non-OK response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => "Service Unavailable",
    });

    const req = new Request(`https://example.com/api/trefle?q=tulip`);
    const res = await GET(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ error: "Trefle API error" });
  });

  it("returns 500 if fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));

    const req = new Request(`https://example.com/api/trefle?q=lily`);
    const res = await GET(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ error: "Server fetch failed" });
  });
});
