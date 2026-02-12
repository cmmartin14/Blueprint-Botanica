import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  details?: string;
  source: "user" | "assistant";
  createdAt: string;
}

export interface CalendarNote {
  id: string;
  content: string;
  date?: string; // YYYY-MM-DD
  reminderAt?: string; // ISO timestamp
  reminderEmail?: string;
  reminderSentAt?: string; // ISO timestamp
  source: "user" | "assistant";
  createdAt: string;
}

export interface CalendarAlert {
  id: string;
  message: string;
  createdAt: string;
  noteId?: string;
}

export type CalendarAssistantAction =
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

type AddEventInput = Omit<CalendarEvent, "id" | "createdAt">;
type AddNoteInput = Omit<CalendarNote, "id" | "createdAt">;

interface CalendarStoreState {
  events: CalendarEvent[];
  notes: CalendarNote[];
  alerts: CalendarAlert[];
  notificationEmail: string;
  addEvent: (event: AddEventInput) => CalendarEvent | null;
  removeEvent: (id: string) => void;
  addNote: (note: AddNoteInput) => CalendarNote | null;
  removeNote: (id: string) => void;
  markReminderSent: (noteId: string) => void;
  addAlert: (message: string, noteId?: string) => void;
  dismissAlert: (alertId: string) => void;
  setNotificationEmail: (email: string) => void;
  applyAssistantAction: (action: CalendarAssistantAction) => void;
}

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeDate = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined;
};

const normalizeTime = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed) ? trimmed : undefined;
};

const normalizeIsoDateTime = (value?: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
};

const createEventFromInput = (input: AddEventInput): CalendarEvent | null => {
  const title = input.title?.trim();
  const date = normalizeDate(input.date);
  if (!title || !date) return null;

  return {
    id: createId(),
    title,
    date,
    time: normalizeTime(input.time),
    details: input.details?.trim() || undefined,
    source: input.source,
    createdAt: new Date().toISOString(),
  };
};

const createNoteFromInput = (input: AddNoteInput): CalendarNote | null => {
  const content = input.content?.trim();
  if (!content) return null;

  return {
    id: createId(),
    content,
    date: normalizeDate(input.date),
    reminderAt: normalizeIsoDateTime(input.reminderAt),
    reminderEmail: input.reminderEmail?.trim() || undefined,
    reminderSentAt: input.reminderSentAt,
    source: input.source,
    createdAt: new Date().toISOString(),
  };
};

export const useCalendarStore = create<CalendarStoreState>()(
  persist(
    (set, get) => ({
      events: [],
      notes: [],
      alerts: [],
      notificationEmail: "",
      addEvent: (event) => {
        const created = createEventFromInput(event);
        if (!created) return null;
        set((state) => ({ events: [created, ...state.events] }));
        return created;
      },
      removeEvent: (id) =>
        set((state) => ({
          events: state.events.filter((event) => event.id !== id),
        })),
      addNote: (note) => {
        const created = createNoteFromInput(note);
        if (!created) return null;
        set((state) => ({ notes: [created, ...state.notes] }));
        return created;
      },
      removeNote: (id) =>
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== id),
        })),
      markReminderSent: (noteId) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId
              ? { ...note, reminderSentAt: new Date().toISOString() }
              : note
          ),
        })),
      addAlert: (message, noteId) =>
        set((state) => ({
          alerts: [
            {
              id: createId(),
              message,
              createdAt: new Date().toISOString(),
              noteId,
            },
            ...state.alerts,
          ].slice(0, 25),
        })),
      dismissAlert: (alertId) =>
        set((state) => ({
          alerts: state.alerts.filter((alert) => alert.id !== alertId),
        })),
      setNotificationEmail: (email) =>
        set({ notificationEmail: email.trim() }),
      applyAssistantAction: (action) => {
        if (action.type === "add_calendar_event") {
          get().addEvent({
            source: "assistant",
            title: action.payload.title,
            date: action.payload.date,
            time: action.payload.time,
            details: action.payload.details,
          });
          return;
        }

        if (action.type === "add_calendar_note") {
          get().addNote({
            source: "assistant",
            content: action.payload.content,
            date: action.payload.date,
            reminderAt: action.payload.reminderAt,
            reminderEmail: action.payload.reminderEmail,
          });
        }
      },
    }),
    {
      name: "blueprint-botanica-calendar",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        events: state.events,
        notes: state.notes,
        alerts: state.alerts,
        notificationEmail: state.notificationEmail,
      }),
    }
  )
);

