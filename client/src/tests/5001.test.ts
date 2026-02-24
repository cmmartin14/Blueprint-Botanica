import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "../app/api/auth/user/route"; 
import { stackServerApp } from "@/stack/server";

vi.mock("@/stack/server", () => ({
  stackServerApp: {
    getUser: vi.fn(),
  },
}));

describe("GET /api/user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    (stackServerApp.getUser as any).mockResolvedValueOnce(null);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ error: "Unauthorized" });
  });

  it("returns user data when authenticated", async () => {
    (stackServerApp.getUser as any).mockResolvedValueOnce({
      id: "user_123",
      primaryEmail: "john@example.com",
      displayName: "John Doe",
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      id: "user_123",
      email: "john@example.com",
      name: "John Doe",
    });
  });

  it("falls back to email prefix if displayName is missing", async () => {
    (stackServerApp.getUser as any).mockResolvedValueOnce({
      id: "user_456",
      primaryEmail: "jane@example.com",
      displayName: null,
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      id: "user_456",
      email: "jane@example.com",
      name: "jane",
    });
  });

  it("returns 500 if getUser throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    (stackServerApp.getUser as any).mockRejectedValueOnce(
      new Error("Database failure")
    );

    const response = await GET();
    const json = await response.json();

    expect(consoleSpy).toHaveBeenCalled();
    expect(response.status).toBe(500);
    expect(json).toEqual({ error: "Internal server error" });
  });
});
