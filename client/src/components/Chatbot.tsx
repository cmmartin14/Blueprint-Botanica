"use client";

import { useState, useRef, useEffect } from "react";
import { LuSprout, LuSend, LuX, LuGripHorizontal } from "react-icons/lu";
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

const CHATBOT_POPUP_DURATION_MS = 500;

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
  
  // Animation and Render State
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  
  // Dragging State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Chat and Context State
  const [geoContext, setGeoContext] = useState<ChatContextPayload["location"]>();
  const [geoAttempted, setGeoAttempted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Let's get started! How can I help with your garden today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, isLoading]);

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
      () => {}, // Continue without location if denied or unavailable.
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 10 * 60 * 1000,
      }
    );
  }, [isOpen, geoAttempted]);

  // Handle bouncy open/close animation mounting
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      if (!shouldRender) {
        setShouldRender(true);
        setIsEntering(true);
        // Reset position when reopened
        setPosition({ x: 0, y: 0 });

        let rafId = 0;
        let rafId2 = 0;
        rafId = window.requestAnimationFrame(() => {
          // Double RAF ensures one paint in the hidden state before transitioning in.
          rafId2 = window.requestAnimationFrame(() => {
            setIsEntering(false);
          });
        });

        return () => {
          window.cancelAnimationFrame(rafId);
          window.cancelAnimationFrame(rafId2);
        };
      }
      return;
    }

    if (!shouldRender) return;
    setIsEntering(false);
    setIsClosing(true);
    // Wait for the exit animation to finish before unmounting
    const timeout = window.setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
    }, CHATBOT_POPUP_DURATION_MS + 100); 

    return () => window.clearTimeout(timeout);
  }, [isOpen, shouldRender]);

  // --- Drag Handlers ---
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Prevent dragging if the user clicks a button (like the close button)
    if ((e.target as HTMLElement).closest("button")) return;
    
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };
  // ---------------------

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

  const isVisible = isOpen && !isClosing && !isEntering;

  return (
    <div
      className="fixed bottom-6 right-6 z-[100]"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
    >
      {/* Bouncy Inner Shell */}
      <div
        className={`w-[340px] md:w-[400px] h-[580px] bg-[#F7FBF5] rounded-[32px] shadow-[0_24px_64px_rgba(242,140,40,0.15)] border border-[#dce9d8] flex flex-col overflow-hidden font-sans transition-all origin-bottom-right ${
          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
        }`}
        style={{
          transitionDuration: `${CHATBOT_POPUP_DURATION_MS}ms`,
          transitionTimingFunction: isVisible
            ? "cubic-bezier(0.34, 1.56, 0.64, 1)" // Custom bouncy spring curve
            : "cubic-bezier(0.4, 0, 1, 1)",
        }}
      >
        {/* Header / Drag Handle */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`bg-[#ecf5e8]/90 backdrop-blur-md px-5 py-4 flex items-center justify-between border-b border-[#dce9d8] touch-none ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          <div className="flex items-center gap-3 pointer-events-none">
            <div className="w-10 h-10 bg-[#F28C28] rounded-full flex items-center justify-center text-white shadow-[0_4px_14px_rgba(242,140,40,0.4)] ring-2 ring-orange-200 transition-transform duration-300">
              <LuSprout size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-green-900 tracking-tight">Clementine</h3>
              <div className="flex items-center gap-1.5 text-xs text-[#F28C28]/80 font-medium">
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2.5 text-[#F28C28] transition-all duration-200 hover:bg-orange-50 hover:shadow-sm hover:text-[#d97a21] focus:outline-none focus:ring-2 focus:ring-[#F28C28]/40"
            aria-label="Close chatbot"
          >
            <LuX size={18} strokeWidth={3} />
          </button>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-5 bg-gradient-to-br from-[#f5fbf3] to-[#eef6ea] space-y-5 custom-scrollbar">
          {messages.map((msg, index) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 fade-in duration-300`}
              style={{ animationFillMode: 'both' }}
            >
              <div
                className={`max-w-[85%] px-4 py-3 text-[15px] leading-relaxed shadow-sm transition-all duration-200 hover:shadow-md ${
                  msg.role === "user"
                    ? "bg-[#F28C28] text-white rounded-[24px] rounded-br-sm"
                    : "bg-white text-green-950 border border-[#dce9d8] rounded-[24px] rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start animate-in fade-in duration-200">
              <div className="bg-white px-4 py-3 rounded-[24px] rounded-tl-sm border border-orange-200 shadow-sm">
                <span className="flex items-center gap-2">
                  <div className="flex items-center gap-2 animate-bounce" style={{ animationDuration: '1.5s' }}>
                    <LuSprout size={16} className="text-[#F28C28]" />
                    <span className="text-sm text-orange-800/90 font-medium">Clementine is thinking</span>
                  </div>
                  <span className="flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 bg-orange-400/60 rounded-full animate-pulse" />
                    <span className="w-1.5 h-1.5 bg-orange-400/60 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <span className="w-1.5 h-1.5 bg-orange-400/60 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                  </span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-1" />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-4 bg-white/80 backdrop-blur-md border-t border-[#dce9d8]">
          <div className="flex gap-2 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Clementine..."
              className="flex-1 px-5 py-3 pr-12 border border-[#dce9d8] rounded-full focus:outline-none focus:ring-2 focus:ring-[#F28C28]/40 bg-[#f9fcf7] text-green-950 placeholder:text-green-700/50 text-[15px] transition-all duration-200 shadow-inner"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square flex items-center justify-center bg-[#F28C28] text-white rounded-full hover:bg-[#d97a21] hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 disabled:hover:bg-[#F28C28] transition-all duration-200 shadow-sm"
            >
              <LuSend size={18} className="mr-0.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;
