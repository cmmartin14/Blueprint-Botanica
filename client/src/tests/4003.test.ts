import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../app/api/reminders/email/route"; 

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("POST /api/reminder-email", () => {

  it("returns 400 if recipient email is missing", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ subject: "Test", text: "Hello" }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ error: "Recipient email is required." });
  });

  it("returns 400 if neither text nor html is provided", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ to: "test@example.com" }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({
      error: "At least one of text or html is required.",
    });
  });

  it("simulates email when EMAIL_SIMULATION=1", async () => {
    vi.stubEnv("EMAIL_SIMULATION", "1");

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        to: "test@example.com",
        text: "Hello",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, simulated: true });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns 500 if RESEND_API_KEY or EMAIL_FROM missing", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        to: "test@example.com",
        text: "Hello",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toContain("Email service not configured");
  });

  it("sends email successfully", async () => {
    vi.stubEnv("RESEND_API_KEY", "fake_key");
    vi.stubEnv("EMAIL_FROM", "from@example.com");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "email_123" }),
    });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        to: "test@example.com",
        subject: "Reminder",
        text: "Hello world",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer fake_key",
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, id: "email_123" });
  });

  it("returns 502 if resend API responds non-OK", async () => {
    vi.stubEnv("RESEND_API_KEY", "fake_key");
    vi.stubEnv("EMAIL_FROM", "from@example.com");

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Bad request" }),
    });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        to: "test@example.com",
        text: "Hello world",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json).toEqual({
      error: "Failed to send email.",
      details: { error: "Bad request" },
    });
  });

  it("returns 500 if fetch throws", async () => {
    vi.stubEnv("RESEND_API_KEY", "fake_key");
    vi.stubEnv("EMAIL_FROM", "from@example.com");

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        to: "test@example.com",
        text: "Hello world",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toContain("Network error");
  });

});
