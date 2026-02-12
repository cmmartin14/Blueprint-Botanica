"use client";

import { useState, useRef, useEffect } from "react";
import { LuSprout, LuSend, LuX } from "react-icons/lu";
import { useCalendarStore } from "../stores/calendarStore";
import type { CalendarAssistantAction } from "../stores/calendarStore";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatContextPayload {
  location?: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
  };
  timezone?: string;
  locale?: string;
  currentDateISO?: string;
}

interface ChatApiResponse {
  message?: string;
  actions?: CalendarAssistantAction[];
  error?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isAssistantAction = (value: unknown): value is CalendarAssistantAction => {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  if (value.type === "add_calendar_event") {
    const payload = value.payload;
    return (
      isRecord(payload) &&
      typeof payload.title === "string" &&
      typeof payload.date === "string"
    );
  }

  if (value.type === "add_calendar_note") {
    const payload = value.payload;
    return (
      isRecord(payload) &&
      typeof payload.content === "string"
    );
  }

  return false;
};

const Chatbot = ({ isOpen, onClose }: ChatbotProps) => {
  const applyAssistantAction = useCalendarStore((state) => state.applyAssistantAction);
  const addAlert = useCalendarStore((state) => state.addAlert);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [geoContext, setGeoContext] = useState<ChatContextPayload["location"]>();
  const [geoAttempted, setGeoAttempted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Let's get started! ",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Ask once per session for coarse location so weather/zone tools can use it.
  useEffect(() => {
    if (!isOpen || geoAttempted) return;
    setGeoAttempted(true);

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoContext({
          latitude: Number(position.coords.latitude.toFixed(3)),
          longitude: Number(position.coords.longitude.toFixed(3)),
          accuracyMeters: Math.round(position.coords.accuracy),
        });
      },
      () => {
        // Continue without location if denied or unavailable.
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 10 * 60 * 1000,
      }
    );
  }, [isOpen, geoAttempted]);

  // Keep component mounted long enough for a soft close animation.
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      return;
    }

    if (!shouldRender) return;
    setIsClosing(true);
    const timeout = window.setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [isOpen, shouldRender]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const context: ChatContextPayload = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: navigator.language,
      currentDateISO: new Date().toISOString(),
      ...(geoContext ? { location: geoContext } : {}),
    };

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          context,
        }),
      });

      const data = (await response.json()) as ChatApiResponse;
      if (Array.isArray(data.actions)) {
        const validActions = data.actions.filter(isAssistantAction);
        for (const action of validActions) {
          applyAssistantAction(action);
        }
        if (validActions.length > 0) {
          addAlert(`Chatbot added ${validActions.length} calendar item(s).`);
        }
      }
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          data.message ||
          data.error ||
          "I'm having trouble connecting to the garden network right now.",
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 w-80 md:w-96 h-[500px] bg-white rounded-2xl shadow-[0_16px_45px_rgba(0,45,30,0.22)] border border-[#B7C398] flex flex-col z-[100] overflow-hidden font-sans ${
        isClosing ? "chatbot-shell-exit" : "chatbot-shell-enter"
      }`}
    >
      {/* Header */}
      <div className="bg-[#00563B] p-4 flex items-center justify-between text-[#B7C398]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#F28C28] rounded-full flex items-center justify-center text-[#fff7ed] shadow-[0_8px_18px_rgba(242,140,40,0.35)] ring-2 ring-[#ffd7ac] transition-transform duration-300 hover:scale-105">
            <LuSprout size={24} />
          </div>
          <div>
            <h3 className="font-bold text-white">Clementine</h3>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="chatbot-close-btn rounded-full p-2 transition-all duration-200"
            aria-label="Close chatbot"
          >
            <LuX size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#F5F7F0] space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`chatbot-message-in max-w-[80%] p-3 rounded-xl text-sm ${
                msg.role === "user"
                  ? "bg-[#00563B] text-white rounded-tr-none"
                  : "bg-white text-gray-800 border border-[#B7C398]/30 rounded-tl-none shadow-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="chatbot-thinking-card bg-white p-3 rounded-xl rounded-tl-none border border-[#B7C398]/30 shadow-sm">
              <span className="flex items-center gap-2">
                <LuSprout size={14} className="chatbot-thinking-sprout text-[#f28c28]" />
                <span className="text-xs text-gray-600">Clementine is thinking</span>
                <span className="flex items-center gap-1.5">
                  <span className="chatbot-typing-dot" />
                  <span className="chatbot-typing-dot" style={{ animationDelay: "0.14s" }} />
                  <span className="chatbot-typing-dot" style={{ animationDelay: "0.28s" }} />
                </span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-[#B7C398]/20">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your garden..."
            className="flex-1 px-4 py-2 border border-[#B7C398]/50 rounded-full focus:outline-none focus:border-[#00563B] focus:ring-2 focus:ring-[#00563B]/20 bg-[#F5F7F0]/50 text-gray-800 placeholder:text-gray-500 text-sm transition-all duration-200"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 bg-[#00563B] text-[#000000] rounded-full hover:bg-[#004b34] hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
          >
            <LuSend size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chatbot;
