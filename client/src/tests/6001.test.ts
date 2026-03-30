import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../app/api/chat/route";

const mockSendMessage = vi.fn();
const mockStartChat = vi.fn();
const mockGetGenerativeModel = vi.fn();
const mockFetch = vi.fn();

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
  vi.stubGlobal("fetch", mockFetch);

  mockGetGenerativeModel.mockReturnValue({
    startChat: mockStartChat,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
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

  it("accepts an image-only user message", async () => {
    mockStartChat.mockReturnValue({
      sendMessage: mockSendMessage,
    });

    mockSendMessage.mockResolvedValueOnce(
      createMockResponse({
        text: "That looks like a healthy herb seedling.",
        functionCalls: [],
      })
    );

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: "",
            image: {
              mimeType: "image/png",
              data: "ZmFrZQ==",
              filename: "seedling.png",
            },
          },
        ],
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("That looks like a healthy herb seedling.");
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          text: "User uploaded an image without additional text. Analyze the image and ask a concise follow-up question if needed.",
        }),
        expect.objectContaining({
          inlineData: {
            mimeType: "image/png",
            data: "ZmFrZQ==",
          },
        }),
      ])
    );
  });

  it("returns 400 for an invalid image attachment", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: "What plant is this?",
            image: {
              mimeType: "text/plain",
              data: "ZmFrZQ==",
            },
          },
        ],
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Image attachment is invalid or too large.");
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

  it("infers reminder date from reminderAt in user timezone", async () => {
    mockStartChat.mockReturnValue({
      sendMessage: mockSendMessage,
    });

    mockSendMessage.mockResolvedValueOnce(
      createMockResponse({
        functionCalls: [
          {
            name: "add_calendar_note",
            args: {
              content: "Start seedlings",
              reminderAtISO: "2026-03-06T01:00:00.000Z",
            },
          },
        ],
      })
    );

    mockSendMessage.mockResolvedValueOnce(
      createMockResponse({
        text: "Reminder added!",
        functionCalls: [],
      })
    );

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Remind me tonight" }],
        context: {
          timezone: "America/Chicago",
        },
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.actions).toHaveLength(1);
    expect(json.actions[0]).toEqual({
      type: "add_calendar_note",
      payload: {
        content: "Start seedlings",
        date: "2026-03-05",
        reminderAt: "2026-03-06T01:00:00.000Z",
      },
    });
  });

  it("uses the perenual plant source for plant search tool calls", async () => {
    mockStartChat.mockReturnValue({
      sendMessage: mockSendMessage,
    });

    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 42,
              common_name: "Basil",
              scientific_name: ["Ocimum basilicum"],
              default_image: {
                medium_url: "https://images.example/basil.jpg",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    mockSendMessage.mockResolvedValueOnce(
      createMockResponse({
        functionCalls: [
          {
            name: "search_plants",
            args: {
              query: "basil",
            },
          },
        ],
      })
    );

    mockSendMessage.mockResolvedValueOnce(
      createMockResponse({
        text: "Here are some basil options.",
        functionCalls: [],
      })
    );

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Find basil plants" }],
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Here are some basil options.");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost/api/perenual?q=basil",
      { cache: "no-store" }
    );
    expect(mockSendMessage).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([
        expect.objectContaining({
          functionResponse: {
            name: "search_plants",
            response: {
              ok: true,
              results: [
                {
                  id: 42,
                  common_name: "Basil",
                  scientific_name: ["Ocimum basilicum"],
                  image_url: "https://images.example/basil.jpg",
                },
              ],
              totalShown: 1,
            },
          },
        }),
      ])
    );
  });

  it("uses the perenual plant source for plant details tool calls", async () => {
    mockStartChat.mockReturnValue({
      sendMessage: mockSendMessage,
    });

    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 42,
          common_name: "Basil",
          scientific_name: ["Ocimum basilicum"],
          default_image: {
            medium_url: "https://images.example/basil.jpg",
          },
          cycle: "Annual",
          watering: "Average",
          sunlight: ["Full Sun"],
          hardiness: { min: "10", max: "11" },
          care_level: "Low",
          description: "A fragrant culinary herb.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    mockSendMessage.mockResolvedValueOnce(
      createMockResponse({
        functionCalls: [
          {
            name: "get_plant_details",
            args: {
              plantId: 42,
            },
          },
        ],
      })
    );

    mockSendMessage.mockResolvedValueOnce(
      createMockResponse({
        text: "Basil prefers full sun and average watering.",
        functionCalls: [],
      })
    );

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Tell me about basil" }],
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Basil prefers full sun and average watering.");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost/api/perenual?id=42",
      { cache: "no-store" }
    );
    expect(mockSendMessage).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([
        expect.objectContaining({
          functionResponse: {
            name: "get_plant_details",
            response: {
              ok: true,
              plant: {
                id: 42,
                common_name: "Basil",
                scientific_name: ["Ocimum basilicum"],
                image_url: "https://images.example/basil.jpg",
                cycle: "Annual",
                watering: "Average",
                sunlight: ["Full Sun"],
                hardiness: { min: "10", max: "11" },
                care_level: "Low",
                description: "A fragrant culinary herb.",
                growth: null,
              },
            },
          },
        }),
      ])
    );
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
