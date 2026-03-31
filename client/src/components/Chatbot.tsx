"use client";

import { useEffect, useRef, useState } from "react";
import {
  LuHistory,
  LuImage,
  LuMessageSquare,
  LuPlus,
  LuSend,
  LuSprout,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import { useCalendarStore } from "../stores/calendarStore";
import type { CalendarAssistantAction } from "../stores/calendarStore";

interface ChatImageAttachment {
  mimeType: string;
  data: string;
  filename?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: ChatImageAttachment;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
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

type ChatView = "chat" | "history";

const CHATBOT_POPUP_DURATION_MS = 500;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const DEFAULT_CHAT_TITLE = "New chat";
const DEFAULT_ASSISTANT_MESSAGE =
  "Let's get started! How can I help with your garden today?";

const historyTimestampFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createWelcomeMessage = (): Message => ({
  id: createId(),
  role: "assistant",
  content: DEFAULT_ASSISTANT_MESSAGE,
});

const createChatSession = (): ChatSession => {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title: DEFAULT_CHAT_TITLE,
    messages: [createWelcomeMessage()],
    createdAt: now,
    updatedAt: now,
  };
};

const sortChatsByUpdatedAt = (sessions: ChatSession[]) =>
  [...sessions].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isAssistantAction = (
  value: unknown
): value is CalendarAssistantAction => {
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
    return isRecord(payload) && typeof payload.content === "string";
  }

  return false;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read image data."));
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read image data."));
    };

    reader.readAsDataURL(file);
  });

const fileToImageAttachment = async (
  file: File
): Promise<ChatImageAttachment> => {
  const dataUrl = await readFileAsDataUrl(file);
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);

  if (!match) {
    throw new Error("Unsupported image format.");
  }

  return {
    mimeType: match[1],
    data: match[2],
    filename: file.name,
  };
};

const imageAttachmentToDataUrl = (image: ChatImageAttachment) =>
  `data:${image.mimeType};base64,${image.data}`;

const summarizeMessage = (message: Message) => {
  const text = message.content.trim();
  if (text) return text;
  if (message.image?.filename) return `Photo: ${message.image.filename}`;
  if (message.image) return "Photo shared";
  return "";
};

const buildChatTitle = (message: Message) => {
  const summary = summarizeMessage(message);
  if (!summary) return DEFAULT_CHAT_TITLE;
  return summary.length <= 32
    ? summary
    : `${summary.slice(0, 29).trimEnd()}...`;
};

const getChatPreview = (chat: ChatSession) => {
  const lastMeaningfulMessage = [...chat.messages]
    .reverse()
    .find((message) => summarizeMessage(message));

  return lastMeaningfulMessage
    ? summarizeMessage(lastMeaningfulMessage)
    : DEFAULT_ASSISTANT_MESSAGE;
};

const formatChatTimestamp = (iso: string) => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return historyTimestampFormatter.format(parsed);
};

const Chatbot = ({ isOpen, onClose }: ChatbotProps) => {
  const applyAssistantAction = useCalendarStore(
    (state) => state.applyAssistantAction
  );
  const addAlert = useCalendarStore((state) => state.addAlert);

  const initialChatRef = useRef<ChatSession | null>(null);
  if (!initialChatRef.current) {
    initialChatRef.current = createChatSession();
  }

  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const [chatView, setChatView] = useState<ChatView>("chat");
  const [geoContext, setGeoContext] = useState<ChatContextPayload["location"]>();
  const [geoAttempted, setGeoAttempted] = useState(false);
  const [chats, setChats] = useState<ChatSession[]>(() => [
    initialChatRef.current as ChatSession,
  ]);
  const [activeChatId, setActiveChatId] = useState(
    () => (initialChatRef.current as ChatSession).id
  );
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<ChatImageAttachment | null>(
    null
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChat =
    chats.find((chat) => chat.id === activeChatId) ?? chats[0] ?? null;
  const activeMessages = activeChat?.messages ?? [];
  const activeChatTitle = activeChat?.title ?? DEFAULT_CHAT_TITLE;
  const isLoading = loadingChatId !== null;
  const isActiveChatLoading = activeChat?.id === loadingChatId;

  const resetComposer = () => {
    setInput("");
    setPendingImage(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const appendMessageToChat = (chatId: string, message: Message) => {
    const updatedAt = new Date().toISOString();

    setChats((previousChats) =>
      sortChatsByUpdatedAt(
        previousChats.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: [...chat.messages, message],
                title:
                  chat.title === DEFAULT_CHAT_TITLE && message.role === "user"
                    ? buildChatTitle(message)
                    : chat.title,
                updatedAt,
              }
            : chat
        )
      )
    );
  };

  const handleStartNewChat = () => {
    if (isLoading) return;

    const newChat = createChatSession();
    setChats((previousChats) => [newChat, ...previousChats]);
    setActiveChatId(newChat.id);
    setChatView("chat");
    resetComposer();
  };

  const handleOpenChat = (chatId: string) => {
    setActiveChatId(chatId);
    setChatView("chat");
    resetComposer();
  };

  const handleDeleteChat = (chatId: string) => {
    if (loadingChatId === chatId) return;

    const remainingChats = chats.filter((chat) => chat.id !== chatId);
    const nextChats =
      remainingChats.length > 0 ? remainingChats : [createChatSession()];
    const deletedActiveChat = activeChatId === chatId;

    setChats(nextChats);

    if (deletedActiveChat) {
      setActiveChatId(nextChats[0].id);
      resetComposer();
    }
  };

  useEffect(() => {
    if (!isOpen || chatView !== "chat") return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, chatView, isActiveChatLoading, isOpen]);

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
      () => {},
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 10 * 60 * 1000,
      }
    );
  }, [isOpen, geoAttempted]);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      if (!shouldRender) {
        setShouldRender(true);
        setIsEntering(true);
        setPosition({ x: 0, y: 0 });

        let rafId = 0;
        let rafId2 = 0;
        rafId = window.requestAnimationFrame(() => {
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

    const timeout = window.setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
    }, CHATBOT_POPUP_DURATION_MS + 100);

    return () => window.clearTimeout(timeout);
  }, [isOpen, shouldRender]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    setPosition({
      x: event.clientX - dragStartRef.current.x,
      y: event.clientY - dragStartRef.current.y,
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const clearPendingImage = () => {
    setPendingImage(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("Please upload an image under 4 MB.");
      event.target.value = "";
      return;
    }

    try {
      const image = await fileToImageAttachment(file);
      setPendingImage(image);
    } catch {
      setUploadError("I couldn't read that image. Try a different file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedInput = input.trim();
    if ((!trimmedInput && !pendingImage) || isLoading || !activeChat) return;

    const currentChatId = activeChat.id;
    const userMessage: Message = {
      id: createId(),
      role: "user",
      content: trimmedInput,
      ...(pendingImage ? { image: pendingImage } : {}),
    };

    const nextMessages = [...activeChat.messages, userMessage];
    appendMessageToChat(currentChatId, userMessage);
    resetComposer();
    setLoadingChatId(currentChatId);

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
          messages: nextMessages,
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

      appendMessageToChat(currentChatId, {
        id: createId(),
        role: "assistant",
        content:
          data.message ||
          data.error ||
          "I'm having trouble connecting to the garden network right now.",
      });
    } catch (error) {
      console.error("Chat error:", error);
      appendMessageToChat(currentChatId, {
        id: createId(),
        role: "assistant",
        content: "I'm having trouble connecting to the garden network right now.",
      });
    } finally {
      setLoadingChatId((currentLoadingChatId) =>
        currentLoadingChatId === currentChatId ? null : currentLoadingChatId
      );
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
      <div
        className={`w-[340px] md:w-[400px] h-[580px] bg-[#F7FBF5] rounded-[32px] shadow-[0_24px_64px_rgba(242,140,40,0.15)] border border-[#dce9d8] flex flex-col overflow-hidden font-sans transition-all origin-bottom-right ${
          isVisible
            ? "opacity-100 scale-100"
            : "opacity-0 scale-75 pointer-events-none"
        }`}
        style={{
          transitionDuration: `${CHATBOT_POPUP_DURATION_MS}ms`,
          transitionTimingFunction: isVisible
            ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
            : "cubic-bezier(0.4, 0, 1, 1)",
        }}
      >
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`bg-[#ecf5e8]/90 backdrop-blur-md px-5 py-4 border-b border-[#dce9d8] touch-none ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 pointer-events-none">
              <div className="w-10 h-10 bg-[#F28C28] rounded-full flex items-center justify-center text-white shadow-[0_4px_14px_rgba(242,140,40,0.4)] ring-2 ring-orange-200 transition-transform duration-300">
                <LuSprout size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-green-900 tracking-tight">
                  Clementine
                </h3>
                <p className="text-xs text-green-800/70">
                  {chatView === "history" ? "Conversation history" : activeChatTitle}
                </p>
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

          <div className="mt-4 flex items-center gap-2">
            <div className="flex items-center rounded-full border border-[#dce9d8] bg-white/80 p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setChatView("chat")}
                className={`group flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  chatView === "chat"
                    ? "bg-[#F28C28] text-white shadow-sm"
                    : "text-green-900 hover:bg-[#f4faf2] hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(34,84,61,0.12)]"
                }`}
              >
                <LuMessageSquare
                  size={16}
                  className="transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6"
                />
                <span>Chat</span>
              </button>
              <button
                type="button"
                onClick={() => setChatView("history")}
                className={`group flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  chatView === "history"
                    ? "bg-[#F28C28] text-white shadow-sm"
                    : "text-green-900 hover:bg-[#f4faf2] hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(34,84,61,0.12)]"
                }`}
              >
                <LuHistory
                  size={16}
                  className="transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6"
                />
                <span>History</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleStartNewChat}
              disabled={isLoading}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-[#dce9d8] bg-white/80 px-3 py-2 text-sm font-medium text-green-900 shadow-sm transition-all hover:border-[#F28C28]/40 hover:text-[#F28C28] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LuPlus size={16} />
              <span>New chat</span>
            </button>
          </div>
        </div>

        {chatView === "history" ? (
          <div className="flex-1 overflow-y-auto bg-gradient-to-br from-[#f5fbf3] to-[#eef6ea] p-4 space-y-3 custom-scrollbar">
            <div className="rounded-[24px] border border-[#dce9d8] bg-white/85 p-4 shadow-sm">
              <p className="text-sm font-semibold text-green-950">
                Conversation history
              </p>
              <p className="mt-1 text-sm text-green-800/70">
                Reopen an older thread, start a fresh one, or remove chats you no
                longer need.
              </p>
            </div>

            {chats.map((chat) => {
              const preview = getChatPreview(chat);
              const isActive = chat.id === activeChatId;
              const isBusy = chat.id === loadingChatId;

              return (
                <div
                  key={chat.id}
                  className={`group rounded-[24px] border p-3 shadow-sm transition-all duration-200 ${
                    isActive
                      ? "border-[#F28C28]/40 bg-white hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(242,140,40,0.16)]"
                      : "border-[#dce9d8] bg-[#f9fcf7] hover:-translate-y-1 hover:border-[#F28C28]/30 hover:bg-white hover:shadow-[0_16px_30px_rgba(34,84,61,0.12)]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenChat(chat.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-green-950 transition-colors duration-200 group-hover:text-[#c56f1b]">
                          {chat.title}
                        </p>
                        {isActive && (
                          <span className="rounded-full bg-[#F28C28]/10 px-2 py-0.5 text-[11px] font-medium text-[#c56f1b]">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm text-green-800/75 transition-colors duration-200 group-hover:text-green-900">
                        {preview}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-green-700/60">
                        <span>{formatChatTimestamp(chat.updatedAt)}</span>
                        {isBusy && <span className="text-[#c56f1b]">Waiting for reply</span>}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteChat(chat.id)}
                      disabled={isBusy}
                      className="rounded-full p-2 text-green-800/65 transition-all hover:bg-white hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Delete ${chat.title}`}
                    >
                      <LuTrash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 bg-gradient-to-br from-[#f5fbf3] to-[#eef6ea] space-y-5 custom-scrollbar">
              {activeMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  } animate-in slide-in-from-bottom-2 fade-in duration-300`}
                  style={{ animationFillMode: "both" }}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 text-[15px] leading-relaxed shadow-sm transition-all duration-200 hover:shadow-md ${
                      message.role === "user"
                        ? "bg-[#F28C28] text-white rounded-[24px] rounded-br-sm"
                        : "bg-white text-green-950 border border-[#dce9d8] rounded-[24px] rounded-tl-sm"
                    }`}
                  >
                    <div className="space-y-3">
                      {message.image && (
                        <img
                          src={imageAttachmentToDataUrl(message.image)}
                          alt={message.image.filename || "Uploaded garden image"}
                          className="max-h-56 w-full rounded-[18px] object-cover bg-white/20"
                        />
                      )}
                      {message.content && (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isActiveChatLoading && (
                <div className="flex justify-start animate-in fade-in duration-200">
                  <div className="bg-white px-4 py-3 rounded-[24px] rounded-tl-sm border border-orange-200 shadow-sm">
                    <span className="flex items-center gap-2">
                      <div
                        className="flex items-center gap-2 animate-bounce"
                        style={{ animationDuration: "1.5s" }}
                      >
                        <LuSprout size={16} className="text-[#F28C28]" />
                        <span className="text-sm text-orange-800/90 font-medium">
                          Clementine is thinking
                        </span>
                      </div>
                      <span className="flex items-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 bg-orange-400/60 rounded-full animate-pulse" />
                        <span
                          className="w-1.5 h-1.5 bg-orange-400/60 rounded-full animate-pulse"
                          style={{ animationDelay: "0.2s" }}
                        />
                        <span
                          className="w-1.5 h-1.5 bg-orange-400/60 rounded-full animate-pulse"
                          style={{ animationDelay: "0.4s" }}
                        />
                      </span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-1" />
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-4 bg-white/80 backdrop-blur-md border-t border-[#dce9d8]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="sr-only"
              />

              {pendingImage && (
                <div className="mb-3 rounded-2xl border border-[#dce9d8] bg-[#f7fbf5] p-3 shadow-sm">
                  <div className="flex items-start gap-3">
                    <img
                      src={imageAttachmentToDataUrl(pendingImage)}
                      alt={pendingImage.filename || "Pending upload"}
                      className="h-16 w-16 rounded-2xl object-cover border border-[#dce9d8]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-green-950">
                        {pendingImage.filename || "Attached image"}
                      </p>
                      <p className="text-xs text-green-800/70">
                        This will be sent with your next message.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={clearPendingImage}
                      className="rounded-full p-2 text-green-800/70 transition-colors hover:bg-white hover:text-green-950"
                      aria-label="Remove attached image"
                    >
                      <LuX size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              )}

              {uploadError && (
                <p className="mb-3 text-sm text-rose-700">{uploadError}</p>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-[#dce9d8] bg-[#f9fcf7] text-green-900 transition-all duration-200 hover:border-[#F28C28]/40 hover:text-[#F28C28] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Upload image"
                >
                  <LuImage size={18} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask Clementine or upload a photo..."
                  className="flex-1 px-5 py-3 border border-[#dce9d8] rounded-full focus:outline-none focus:ring-2 focus:ring-[#F28C28]/40 bg-[#f9fcf7] text-green-950 placeholder:text-green-700/50 text-[15px] transition-all duration-200 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={isLoading || (!input.trim() && !pendingImage)}
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center bg-[#F28C28] text-white rounded-full hover:bg-[#d97a21] hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 disabled:hover:bg-[#F28C28] transition-all duration-200 shadow-sm"
                >
                  <LuSend size={18} className="mr-0.5" />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Chatbot;
