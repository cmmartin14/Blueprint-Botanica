import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../app/api/chat/route";

const mockSendMessage = vi.fn();
const mockStartChat = vi.fn();
const mockGetGenerativeModel = vi.fn();

vi.mock("@google/generative-ai", () => {
  class MockGoogleGenerativeAI {
    constructor(_: string) {}
    getGenerativeModel = mockGetGenerativeModel;
  }

  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
    FunctionCallingMode: { AUTO: "AUTO" },
    SchemaType: {
      OBJECT: "object",
      STRING: "string",
      NUMBER: "number",
    },
  };
});


beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "fake-key");

  mockGetGenerativeModel.mockReturnValue({
    startChat: mockStartChat,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const createMockResponse = ({
  text = "",
  functionCalls = [],
}: {
  text?: string;
  functionCalls?: any[];
}) => ({
  response: Promise.resolve({
    text: () => text,
    functionCalls: () => functionCalls,
  }),
});

describe("POST /api/chat", () => {
  it("returns 500 if GEMINI_API_KEY missing", async () => {
    vi.unstubAllEnvs();

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("GEMINI_API_KEY is not set");
  });

  it("returns 400 for invalid messages", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [] }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid messages format");
  });

  it("returns 400 if last message missing content", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user" }],
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Last message is missing content");
  });

  it("returns plain text response with no tools", async () => {
    mockStartChat.mockReturnValue({
      sendMessage: mockSendMessage,
    });

    mockSendMessage.mockResolvedValueOnce(
      createMockResponse({
        text: "Hello gardener 🌱",
        functionCalls: [],
      })
    );

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hi" }],
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      message: "Hello gardener 🌱",
      actions: [],
    });
  });

  it("handles tool call and queues calendar action", async () => {
    mockStartChat.mockReturnValue({
      sendMessage: mockSendMessage,
    });

    mockSendMessage.mockResolvedValueOnce(
      createMockResponse({
        functionCalls: [
          {
            name: "add_calendar_event",
            args: {
              title: "Water tomatoes",
              date: "2026-03-01",
            },
          },
        ],
      })
    );

    mockSendMessage.mockResolvedValueOnce(
      createMockResponse({
        text: "Event added!",
        functionCalls: [],
      })
    );

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [
          { role: "user", content: "Remind me to water tomatoes on March 1" },
        ],
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Event added!");
    expect(json.actions).toHaveLength(1);
    expect(json.actions[0]).toEqual({
      type: "add_calendar_event",
      payload: {
        title: "Water tomatoes",
        date: "2026-03-01",
      },
    });
  });

  it("returns 500 if Gemini throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockStartChat.mockImplementation(() => {
      throw new Error("Gemini crashed");
    });

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hi" }],
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(consoleSpy).toHaveBeenCalled();
    expect(res.status).toBe(500);
    expect(json.error).toBe("Gemini crashed");
  });
});
