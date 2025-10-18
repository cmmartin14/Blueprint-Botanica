import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "../../app/api/zipcode/[zip]/route"; // adjust path to your route

// Mock global fetch
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

    // Mock the API response
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ zone: "Zone 7" }),
    });

    const req = new Request(`https://example.com/api/zipcode/${fakeZip}`);
    const res = await GET(req);

    const json = await res.json();
    expect(json).toEqual({ zone: "8b" });
  });

  it("returns 404 if zone not found", async () => {
    const fakeZip = "00000";

    mockFetch.mockResolvedValueOnce({
      json: async () => ({}), // no zone property
    });

    const req = new Request(`https://example.com/api/zipcode/${fakeZip}`);
    const res = await GET(req);

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toEqual({ error: "Zone not found" });
  });

  it("returns 500 if fetch fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const req = new Request(`https://example.com/api/zipcode/75088`);
    const res = await GET(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ error: "Server error" });
  });
});
