import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "../app/api/perenual/route";

// Mock global fetch
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  vi.stubEnv("PERENUAL_KEY", "fake_key");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("GET /api/perenual", () => {

  it("returns plant list when query is provided", async () => {
    const fakeQuery = "rose";

    const fakeData = {
      data: [{ id: 1, common_name: "Rose" }],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fakeData,
    });

    const req = new Request(
      `https://example.com/api/perenual?q=${fakeQuery}`
    );

    const res = await GET(req);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "https://perenual.com/api/species-list"
      )
    );

    const json = await res.json();
    expect(json).toEqual(fakeData);
  });

  it("returns plant details when id is provided", async () => {
    const fakeData = {
      id: 123,
      common_name: "Rose",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fakeData,
    });

    const req = new Request(
      `https://example.com/api/perenual?id=123`
    );

    const res = await GET(req);
    const json = await res.json();

    expect(json).toEqual(fakeData);
  });

  it("returns 500 if PERENUAL_KEY is missing", async () => {
    vi.unstubAllEnvs(); // remove PERENUAL_KEY

    const req = new Request(
      `https://example.com/api/perenual?q=rose`
    );

    const res = await GET(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ error: "Server misconfigured" });
  });

  it("returns perenual error status when API responds non-OK", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    });

    const req = new Request(
      `https://example.com/api/perenual?q=tulip`
    );

    const res = await GET(req);

    expect(res.status).toBe(429);
    const json = await res.json();

    expect(json).toEqual({
      error: "Rate limit exceeded. Please wait a moment.",
    });
  });

  it("returns 500 if fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));

    const req = new Request(
      `https://example.com/api/perenual?q=lily`
    );

    const res = await GET(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ error: "Server fetch failed" });
  });

});
