import {
  FunctionCall,
  FunctionCallingMode,
  GoogleGenerativeAI,
  SchemaType,
} from "@google/generative-ai";
import { NextResponse } from "next/server";

type Role = "user" | "assistant";

interface ChatMessage {
  role: Role;
  content: string;
}

interface ChatContext {
  location?: {
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number;
  };
  timezone?: string;
  locale?: string;
  currentDateISO?: string;
}

interface ChatRequestBody {
  messages?: ChatMessage[];
  context?: ChatContext;
}

type ChatAction =
  | {
      type: "add_calendar_event";
      payload: {
        title: string;
        date: string;
        time?: string;
        details?: string;
      };
    }
  | {
      type: "add_calendar_note";
      payload: {
        content: string;
        date?: string;
        reminderAt?: string;
        reminderEmail?: string;
      };
    };

const TOOL_NAMES = {
  GET_WEATHER: "get_weather",
  GET_HARDINESS_ZONE_BY_ZIP: "get_hardiness_zone_by_zip",
  GET_ZONE_DETAILS: "get_zone_details",
  SEARCH_PLANTS: "search_plants",
  GET_PLANT_DETAILS: "get_plant_details",
  ADD_CALENDAR_EVENT: "add_calendar_event",
  ADD_CALENDAR_NOTE: "add_calendar_note",
} as const;

const parseNumberArg = (
  args: Record<string, unknown>,
  key: string
): number | undefined => {
  const value = args[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const parseStringArg = (
  args: Record<string, unknown>,
  key: string
): string | undefined => {
  const value = args[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const fetchJson = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  let data: any = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: data?.error || `Request failed (${response.status})`,
      data,
    };
  }

  return { ok: true, status: response.status, data };
};

const buildContextPrompt = (context?: ChatContext) => {
  if (!context) return "";

  const lines: string[] = [];
  if (context.location?.latitude != null && context.location?.longitude != null) {
    lines.push(
      `Approximate user location coordinates: lat ${context.location.latitude}, lon ${context.location.longitude}.`
    );
  }
  if (context.timezone) lines.push(`User timezone: ${context.timezone}.`);
  if (context.locale) lines.push(`User locale: ${context.locale}.`);
  if (context.currentDateISO) lines.push(`Current user timestamp: ${context.currentDateISO}.`);

  if (lines.length === 0) return "";
  return `Client context (provided by app, use when helpful):\n- ${lines.join("\n- ")}`;
};

const parseYmdArg = (
  args: Record<string, unknown>,
  key: string
): string | undefined => {
  const value = parseStringArg(args, key);
  if (!value) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
};

const parseTimeArg = (
  args: Record<string, unknown>,
  key: string
): string | undefined => {
  const value = parseStringArg(args, key);
  if (!value) return undefined;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value) ? value : undefined;
};

const parseIsoDateArg = (
  args: Record<string, unknown>,
  key: string
): string | undefined => {
  const value = parseStringArg(args, key);
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
};

const runGardenTool = async (
  functionCall: FunctionCall,
  baseUrl: string,
  context?: ChatContext,
  onAction?: (action: ChatAction) => void
) => {
  const args = (functionCall.args ?? {}) as Record<string, unknown>;

  if (functionCall.name === TOOL_NAMES.GET_WEATHER) {
    const lat = parseNumberArg(args, "latitude") ?? context?.location?.latitude;
    const lon = parseNumberArg(args, "longitude") ?? context?.location?.longitude;
    const q = parseStringArg(args, "locationQuery");

    const search = new URLSearchParams();
    if (lat != null && lon != null) {
      search.set("lat", String(lat));
      search.set("lon", String(lon));
    } else if (q) {
      search.set("q", q);
    } else {
      return {
        ok: false,
        error:
          "Missing weather lookup input. Provide latitude/longitude or locationQuery.",
      };
    }

    const weather = await fetchJson(`${baseUrl}/api/weather?${search.toString()}`);
    return weather.ok
      ? {
          ok: true,
          weather: weather.data,
        }
      : weather;
  }

  if (functionCall.name === TOOL_NAMES.GET_HARDINESS_ZONE_BY_ZIP) {
    const zip = parseStringArg(args, "zipCode");
    if (!zip) return { ok: false, error: "zipCode is required." };

    const zone = await fetchJson(
      `${baseUrl}/api/zipcode/${encodeURIComponent(zip)}`
    );
    return zone.ok ? { ok: true, ...zone.data } : zone;
  }

  if (functionCall.name === TOOL_NAMES.GET_ZONE_DETAILS) {
    const zoneValue = parseStringArg(args, "zone");
    if (!zoneValue) return { ok: false, error: "zone is required." };

    const zone = await fetchJson(
      `${baseUrl}/api/zones/${encodeURIComponent(zoneValue.toLowerCase())}`
    );
    return zone.ok ? { ok: true, zone: zone.data } : zone;
  }

  if (functionCall.name === TOOL_NAMES.SEARCH_PLANTS) {
    const query = parseStringArg(args, "query");
    if (!query) return { ok: false, error: "query is required." };

    const plants = await fetchJson(
      `${baseUrl}/api/trefle?q=${encodeURIComponent(query)}`
    );

    if (!plants.ok) return plants;

    const data = Array.isArray(plants.data?.data) ? plants.data.data : [];
    const trimmed = data.slice(0, 8).map((plant: any) => ({
      id: plant.id,
      common_name: plant.common_name,
      scientific_name: plant.scientific_name,
      image_url: plant.image_url,
    }));

    return {
      ok: true,
      results: trimmed,
      totalShown: trimmed.length,
    };
  }

  if (functionCall.name === TOOL_NAMES.GET_PLANT_DETAILS) {
    const plantId = parseNumberArg(args, "plantId");
    if (plantId == null) return { ok: false, error: "plantId is required." };

    const details = await fetchJson(`${baseUrl}/api/trefle?id=${plantId}`);
    if (!details.ok) return details;

    const plant = details.data?.data;
    if (!plant) return { ok: false, error: "Plant details not found." };

    return {
      ok: true,
      plant: {
        id: plant.id,
        common_name: plant.common_name,
        scientific_name: plant.scientific_name,
        image_url: plant.image_url,
        growth: plant.growth || plant.main_species?.growth || null,
      },
    };
  }

  if (functionCall.name === TOOL_NAMES.ADD_CALENDAR_EVENT) {
    const title = parseStringArg(args, "title");
    const date = parseYmdArg(args, "date");
    const time = parseTimeArg(args, "time");
    const details = parseStringArg(args, "details");

    if (!title) return { ok: false, error: "title is required." };
    if (!date) {
      return {
        ok: false,
        error: "date is required in YYYY-MM-DD format.",
      };
    }

    const action: ChatAction = {
      type: "add_calendar_event",
      payload: {
        title,
        date,
        ...(time ? { time } : {}),
        ...(details ? { details } : {}),
      },
    };
    onAction?.(action);

    return {
      ok: true,
      queued: true,
      action,
    };
  }

  if (functionCall.name === TOOL_NAMES.ADD_CALENDAR_NOTE) {
    const content = parseStringArg(args, "content");
    const date = parseYmdArg(args, "date");
    const reminderEmail = parseStringArg(args, "reminderEmail");
    let reminderAt = parseIsoDateArg(args, "reminderAtISO");
    const reminderMinutesFromNow = parseNumberArg(args, "reminderMinutesFromNow");

    if (!content) return { ok: false, error: "content is required." };

    if (!reminderAt && reminderMinutesFromNow != null && reminderMinutesFromNow > 0) {
      const now = context?.currentDateISO
        ? new Date(context.currentDateISO)
        : new Date();
      reminderAt = new Date(now.getTime() + reminderMinutesFromNow * 60_000).toISOString();
    }

    const action: ChatAction = {
      type: "add_calendar_note",
      payload: {
        content,
        ...(date ? { date } : {}),
        ...(reminderAt ? { reminderAt } : {}),
        ...(reminderEmail ? { reminderEmail } : {}),
      },
    };
    onAction?.(action);

    return {
      ok: true,
      queued: true,
      action,
    };
  }

  return {
    ok: false,
    error: `Unknown tool requested: ${functionCall.name}`,
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const messages = body.messages;
    const context = body.context;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set" },
        { status: 500 }
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.content || typeof lastMessage.content !== "string") {
      return NextResponse.json(
        { error: "Last message is missing content" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      tools: [
        {
          functionDeclarations: [
            {
              name: TOOL_NAMES.GET_WEATHER,
              description:
                "Get current weather and short-term forecast for a location. Prefer lat/lon if available.",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  latitude: { type: SchemaType.NUMBER },
                  longitude: { type: SchemaType.NUMBER },
                  locationQuery: {
                    type: SchemaType.STRING,
                    description:
                      "Fallback city/location query, e.g. 'Austin, TX'.",
                  },
                },
              },
            },
            {
              name: TOOL_NAMES.GET_HARDINESS_ZONE_BY_ZIP,
              description:
                "Get USDA-style hardiness zone from a US ZIP code.",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  zipCode: { type: SchemaType.STRING },
                },
                required: ["zipCode"],
              },
            },
            {
              name: TOOL_NAMES.GET_ZONE_DETAILS,
              description:
                "Get local zone details and temperature range for a hardiness zone such as '8b'.",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  zone: { type: SchemaType.STRING },
                },
                required: ["zone"],
              },
            },
            {
              name: TOOL_NAMES.SEARCH_PLANTS,
              description:
                "Search plants by common or scientific name to suggest candidates.",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  query: { type: SchemaType.STRING },
                },
                required: ["query"],
              },
            },
            {
              name: TOOL_NAMES.GET_PLANT_DETAILS,
              description:
                "Get detailed plant growth guidance from a plant id returned by search_plants.",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  plantId: { type: SchemaType.NUMBER },
                },
                required: ["plantId"],
              },
            },
            {
              name: TOOL_NAMES.ADD_CALENDAR_EVENT,
              description:
                "Queue creation of a calendar event for the user. Use only when user asks to create/add/schedule an event.",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  title: { type: SchemaType.STRING },
                  date: {
                    type: SchemaType.STRING,
                    description: "Date in YYYY-MM-DD format.",
                  },
                  time: {
                    type: SchemaType.STRING,
                    description: "24-hour time HH:mm if user provided one.",
                  },
                  details: { type: SchemaType.STRING },
                },
                required: ["title", "date"],
              },
            },
            {
              name: TOOL_NAMES.ADD_CALENDAR_NOTE,
              description:
                "Queue creation of a calendar note/reminder. Use only when user asks to add or save a note/reminder.",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  content: { type: SchemaType.STRING },
                  date: {
                    type: SchemaType.STRING,
                    description:
                      "Optional date in YYYY-MM-DD format. Include when tied to a specific day.",
                  },
                  reminderAtISO: {
                    type: SchemaType.STRING,
                    description: "Optional reminder timestamp in ISO-8601 format.",
                  },
                  reminderMinutesFromNow: {
                    type: SchemaType.NUMBER,
                    description:
                      "Optional relative reminder delay in minutes if exact datetime is unknown.",
                  },
                  reminderEmail: {
                    type: SchemaType.STRING,
                    description:
                      "Optional email override for this reminder, if user provided one.",
                  },
                },
                required: ["content"],
              },
            },
          ],
        },
      ],
      systemInstruction: {
        role: "system",
        parts: [
          {
            text: `You are Clementine, the gardening assistant for Blueprint Botanica.
Help users plan gardens, select plants, troubleshoot issues, and make climate-aware recommendations.
Use tools for weather, hardiness zone, and plant data when factual lookup is needed.
When users ask to add events or notes/reminders to calendar, call the calendar tools.
Interpret relative time words like "tomorrow" using the provided current timestamp and timezone context.
If a required value is missing, ask a concise clarifying question.
Keep responses concise, practical, and specific.`,
          },
        ],
      },
    });

    let history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content || "" }],
    }));

    if (history.length > 0 && history[0].role === "model") {
      history = history.slice(1);
    }

    const chat = model.startChat({
      history,
      toolConfig: {
        functionCallingConfig: { mode: FunctionCallingMode.AUTO },
      },
      generationConfig: {
        maxOutputTokens: 600,
      },
    });

    const contextPrompt = buildContextPrompt(context);
    const userPrompt = contextPrompt
      ? `${contextPrompt}\n\nUser request:\n${lastMessage.content}`
      : lastMessage.content;

    const baseUrl = new URL(request.url).origin;
    const actions: ChatAction[] = [];
    let result = await chat.sendMessage(userPrompt);
    let response = await result.response;

    const maxToolRounds = 4;
    for (let i = 0; i < maxToolRounds; i += 1) {
      const functionCalls = response.functionCalls();
      if (!functionCalls || functionCalls.length === 0) break;

      const functionResponses = await Promise.all(
        functionCalls.map(async (functionCall) => ({
          functionResponse: {
            name: functionCall.name,
            response: await runGardenTool(functionCall, baseUrl, context, (action) => {
              actions.push(action);
            }),
          },
        }))
      );

      result = await chat.sendMessage(functionResponses);
      response = await result.response;
    }

    const text = response.text();

    return NextResponse.json({
      message:
        text ||
        "I couldn't generate a response right now. Please try again with a more specific gardening question.",
      actions,
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process chat request" },
      { status: 500 }
    );
  }
}
