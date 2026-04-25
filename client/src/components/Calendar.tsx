// Calendar.tsx
"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
} from "react";
import { useCalendarStore } from "../stores/calendarStore";
import { useGardenStore } from "../types/garden";
import {
  ICON_WINDOW_POPUP_DURATION_MS,
  CHATBOT_POPUP_EASE,
  CHATBOT_POPUP_EXIT_EASE,
} from "../lib/motion";

type Props = {
  isOpen: boolean;
  onClose?: () => void;
  defaultFullscreen?: boolean;
  sidebarMode?: boolean;
};

type WeatherDay = {
  date: string;
  temp: { min: number; max: number };
  icon: string;
  description: string;
};

type WeatherData = {
  city: string;
  country: string;
  timezone: number;
  current?: { temp: number; icon: string; description: string };
  daily: WeatherDay[];
};

type FrostDateEstimate = {
  firstFrost: string;
  lastFrost: string;
  label: string;
};

const DEFAULT_WINDOW_POSITION = { x: 24, y: 96 };
const WINDOW_MARGIN = 8;
const WINDOW_MIN_TOP = 72;

const toYmd = (d: Date) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const getProjectedFrostDates = (
  zone?: string | null,
  year = new Date().getFullYear()
): FrostDateEstimate | null => {
  if (!zone) return null;

  const zoneNumber = parseInt(zone.toString().replace(/[^\d]/g, ""), 10);

  const frostByZone: Record<number, { first: string; last: string }> = {
    1: { first: "08-01", last: "06-30" },
    2: { first: "08-20", last: "06-10" },
    3: { first: "09-15", last: "05-15" },
    4: { first: "09-25", last: "05-05" },
    5: { first: "10-05", last: "04-25" },
    6: { first: "10-15", last: "04-15" },
    7: { first: "10-25", last: "04-05" },
    8: { first: "11-10", last: "03-20" },
    9: { first: "12-01", last: "02-20" },
    10: { first: "12-20", last: "01-20" },
    11: { first: "01-15", last: "01-15" },
    12: { first: "01-15", last: "01-15" },
    13: { first: "01-15", last: "01-15" },
  };

  const estimate = frostByZone[zoneNumber];
  if (!estimate) return null;

  return {
    firstFrost: `${year}-${estimate.first}`,
    lastFrost: `${year}-${estimate.last}`,
    label: `Estimated from USDA Zone ${zoneNumber}`,
  };
};

const toDateTimeLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  const hh = `${d.getHours()}`.padStart(2, "0");
  const mm = `${d.getMinutes()}`.padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
};

export default function CalendarWindow({
  isOpen,
  onClose,
  defaultFullscreen = false,
  sidebarMode = false,
}: Props) {
  const windowRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(defaultFullscreen);
  const [windowPosition, setWindowPosition] = useState(DEFAULT_WINDOW_POSITION);
  const [dragState, setDragState] = useState<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [city, setCity] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const gardenZone = useGardenStore((state) => state.hardinessZone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [noteText, setNoteText] = useState("");
  const [noteReminderAt, setNoteReminderAt] = useState("");
  const [noteReminderEmail, setNoteReminderEmail] = useState("");

  const {
    notes,
    alerts,
    notificationEmail,
    addNote,
    removeNote,
    markReminderSent,
    addAlert,
    dismissAlert,
    setNotificationEmail,
  } = useCalendarStore();

  const isDragging = dragState !== null;

  useEffect(() => {
    if (!isOpen) setIsFullscreen(false);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !isFullscreen) return;
    setDragState(null);
  }, [isOpen, isFullscreen]);

  useEffect(() => {
    if (!sidebarMode) return;
    setIsFullscreen(false);
    setDragState(null);
  }, [sidebarMode]);

  useEffect(() => {
    if (!selectedDate) return;
    if (noteReminderAt) return;
    const defaultReminder = new Date(selectedDate);
    defaultReminder.setHours(9, 0, 0, 0);
    setNoteReminderAt(toDateTimeLocal(defaultReminder));
  }, [selectedDate, noteReminderAt]);

  useEffect(() => {
    const checkDueReminders = async () => {
      const now = Date.now();
      const due = notes.filter((note) => {
        if (!note.reminderAt || note.reminderSentAt) return false;
        const ts = new Date(note.reminderAt).getTime();
        return Number.isFinite(ts) && ts <= now;
      });

      for (const note of due) {
        const to = note.reminderEmail || notificationEmail;
        const subject = "Blueprint Botanica reminder";
        const selectedLabel = note.date ? ` (${note.date})` : "";
        const text = `Reminder${selectedLabel}: ${note.content}`;

        if (!to) {
          addAlert(`Reminder due (no email set): ${note.content}`, note.id);
          markReminderSent(note.id);
          continue;
        }

        try {
          const response = await fetch("/api/reminders/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to, subject, text }),
          });

          if (!response.ok) {
            addAlert(`Reminder due, email failed to ${to}: ${note.content}`, note.id);
          } else {
            addAlert(`Reminder emailed to ${to}: ${note.content}`, note.id);
          }
        } catch {
          addAlert(`Reminder due, email send error: ${note.content}`, note.id);
        } finally {
          markReminderSent(note.id);
        }
      }
    };

    void checkDueReminders();
    const timer = window.setInterval(() => {
      void checkDueReminders();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [notes, notificationEmail, addAlert, markReminderSent]);

  useEffect(() => {
    if (isFullscreen) return;

    const keepWindowVisible = () => {
      const rect = windowRef.current?.getBoundingClientRect();
      if (!rect) return;

      const maxX = Math.max(WINDOW_MARGIN, window.innerWidth - rect.width - WINDOW_MARGIN);
      const maxY = Math.max(WINDOW_MIN_TOP, window.innerHeight - rect.height - WINDOW_MARGIN);

      setWindowPosition((current) => ({
        x: Math.min(Math.max(current.x, WINDOW_MARGIN), maxX),
        y: Math.min(Math.max(current.y, WINDOW_MIN_TOP), maxY),
      }));
    };

    keepWindowVisible();
    window.addEventListener("resize", keepWindowVisible);
    return () => window.removeEventListener("resize", keepWindowVisible);
  }, [isFullscreen]);

  const toggleFullscreen = () => setIsFullscreen((v) => !v);

  const clampWindowPosition = (nextX: number, nextY: number) => {
    const rect = windowRef.current?.getBoundingClientRect();
    if (!rect) return { x: nextX, y: nextY };

    const maxX = Math.max(WINDOW_MARGIN, window.innerWidth - rect.width - WINDOW_MARGIN);
    const maxY = Math.max(WINDOW_MIN_TOP, window.innerHeight - rect.height - WINDOW_MARGIN);

    return {
      x: Math.min(Math.max(nextX, WINDOW_MARGIN), maxX),
      y: Math.min(Math.max(nextY, WINDOW_MIN_TOP), maxY),
    };
  };

  const handleHeaderPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isFullscreen) return;
    if ((event.target as HTMLElement).closest("button")) return;

    const rect = windowRef.current?.getBoundingClientRect();
    if (!rect) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    });
  };

  const handleHeaderPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    setWindowPosition(
      clampWindowPosition(
        event.clientX - dragState.offsetX,
        event.clientY - dragState.offsetY
      )
    );
  };

  const handleHeaderPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setDragState(null);
  };

  const monthLabel = useMemo(
    () =>
      monthCursor.toLocaleString(undefined, { month: "long", year: "numeric" }),
    [monthCursor]
  );

  function daysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  function isSameDay(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function isFrostProneDate(date: Date, frostDates: FrostDateEstimate | null) {
    if (!frostDates) return false;
  
    const ymd = toYmd(date);
  
    return ymd <= frostDates.lastFrost || ymd >= frostDates.firstFrost;
  }

  const grid = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();

    const first = new Date(year, month, 1);
    const startWeekday = first.getDay();
    const total = daysInMonth(year, month);

    const cells: { date: Date; inMonth: boolean; isToday: boolean }[] = [];

    for (let i = 0; i < startWeekday; i += 1) {
      const d = new Date(year, month, 1 - (startWeekday - i));
      cells.push({ date: d, inMonth: false, isToday: isSameDay(d, new Date()) });
    }

    for (let day = 1; day <= total; day += 1) {
      const date = new Date(year, month, day);
      cells.push({ date, inMonth: true, isToday: isSameDay(date, new Date()) });
    }

    while (cells.length % 7 !== 0 || cells.length < 42) {
      const last = cells[cells.length - 1]?.date ?? new Date(year, month, total);
      const next = new Date(last);
      next.setDate(last.getDate() + 1);
      cells.push({ date: next, inMonth: false, isToday: isSameDay(next, new Date()) });
    }

    return cells;
  }, [monthCursor]);

  async function fetchByCity(q: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/weather?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(`Weather lookup failed (${res.status})`);
      const data: WeatherData = await res.json();
      setWeather(data);
    } catch (e: any) {
      setError(e.message || "Failed to fetch weather");
    } finally {
      setLoading(false);
    }
  }

  async function useMyLocation() {
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`);
          if (!res.ok) throw new Error(`Weather lookup failed (${res.status})`);
          const data: WeatherData = await res.json();
          setWeather(data);
        } catch (e: any) {
          setError(e.message || "Failed to fetch weather");
        } finally {
          setLoading(false);
        }
      },
      (geoErr) => {
        setLoading(false);
        setError(geoErr.message);
      },
      { enableHighAccuracy: true }
    );
  }

  const selectedYmd = selectedDate ? toYmd(selectedDate) : null;
  const projectedFrostDates = useMemo(
    () => getProjectedFrostDates(gardenZone, monthCursor.getFullYear()),
    [gardenZone, monthCursor]
  );

  const selectedForecast = useMemo(() => {
    if (!weather || !selectedYmd) return null;
    return weather.daily.find((d) => d.date === selectedYmd) || null;
  }, [weather, selectedYmd]);

  const nextFourDaysForecast = useMemo(() => {
    if (!weather) return [];
    const cityNow = new Date(Date.now() + weather.timezone * 1000);
    const cityTodayYmd = `${cityNow.getUTCFullYear()}-${`${cityNow.getUTCMonth() + 1}`.padStart(2, "0")}-${`${cityNow.getUTCDate()}`.padStart(2, "0")}`;
    return weather.daily.filter((day) => day.date > cityTodayYmd).slice(0, 4);
  }, [weather]);

  const markersByDate = useMemo(() => {
    const markerMap = new Map<string, { notes: number; firstFrost?: boolean; lastFrost?: boolean }>();

    for (const note of notes) {
      if (!note.date) continue;
      const cur = markerMap.get(note.date) ?? { notes: 0 };
      cur.notes += 1;
      markerMap.set(note.date, cur);
    }

    if (projectedFrostDates) {
      const first = markerMap.get(projectedFrostDates.firstFrost) ?? { notes: 0 };
      first.firstFrost = true;
      markerMap.set(projectedFrostDates.firstFrost, first);
    
      const last = markerMap.get(projectedFrostDates.lastFrost) ?? { notes: 0 };
      last.lastFrost = true;
      markerMap.set(projectedFrostDates.lastFrost, last);
    }

    return markerMap;
  }, [notes, projectedFrostDates]);

  const selectedNotes = useMemo(() => {
    if (!selectedYmd) {
      return [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return notes
      .filter((note) => note.date === selectedYmd || !note.date)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [notes, selectedYmd]);

  const upcomingReminders = useMemo(
    () =>
      notes
        .filter((note) => note.reminderAt && !note.reminderSentAt)
        .sort((a, b) => (a.reminderAt || "").localeCompare(b.reminderAt || ""))
        .slice(0, 8),
    [notes]
  );

  const submitNote = (e: FormEvent) => {
    e.preventDefault();
    const created = addNote({
      source: "user",
      content: noteText,
      date: selectedYmd || undefined,
      reminderAt: noteReminderAt ? new Date(noteReminderAt).toISOString() : undefined,
      reminderEmail: noteReminderEmail || undefined,
    });
    if (!created) return;

    if (created.reminderAt && !(created.reminderEmail || notificationEmail)) {
      addAlert("Reminder saved, but no email is configured for delivery.", created.id);
    }
    setNoteText("");
    setNoteReminderEmail("");
  };

  const windowStyle = sidebarMode
    ? undefined
    : {
        ...(isFullscreen ? {} : { left: `${windowPosition.x}px`, top: `${windowPosition.y}px` }),
        ...(isDragging
          ? {}
          : {
              transitionDuration: `${ICON_WINDOW_POPUP_DURATION_MS}ms`,
              transitionTimingFunction: isOpen
                ? CHATBOT_POPUP_EASE
                : CHATBOT_POPUP_EXIT_EASE,
            }),
      };

  return (
    <div
      ref={windowRef}
      data-testid="calendar-window"
      className={`overflow-hidden border border-[#dce9d8] bg-[#F7FBF5] ${
        sidebarMode
          ? "relative h-full w-full rounded-[24px] border-0 shadow-none"
          : `fixed z-50 rounded-[32px] shadow-[0_24px_64px_rgba(25,64,41,0.15)] ${
              isDragging ? "transition-none" : "transition-all"
            } ${isFullscreen ? "inset-12 md:inset-20" : "h-[660px] w-[980px] max-w-[95vw]"} ${
              isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
            }`
      } ${sidebarMode && !isOpen ? "pointer-events-none opacity-0" : ""}`}
      style={windowStyle}
    >
      {/* Header section */}
      <div
        className={`flex items-center justify-between border-b border-[#dce9d8] bg-[#ecf5e8]/80 px-6 py-4 backdrop-blur-md ${
          sidebarMode
            ? "rounded-t-[24px]"
            : isFullscreen
              ? ""
              : isDragging
                ? "cursor-grabbing select-none"
                : "cursor-grab"
        }`}
        onPointerDown={sidebarMode ? undefined : handleHeaderPointerDown}
        onPointerMove={sidebarMode ? undefined : handleHeaderPointerMove}
        onPointerUp={sidebarMode ? undefined : handleHeaderPointerUp}
        onPointerCancel={sidebarMode ? undefined : handleHeaderPointerUp}
        style={!sidebarMode && !isFullscreen ? { touchAction: "none" } : undefined}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-green-900 tracking-tight">Calendar</h2>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="chatbot-pop-trigger rounded-full p-2.5 text-green-700 hover:bg-white hover:shadow-sm hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-[#8cc69f] [--chatbot-pop-hover-transform:translateY(-1px)_scale(1.04)_rotate(6deg)]"
              aria-label="Close"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          )}
          {!sidebarMode && (
            <button
              type="button"
              onClick={toggleFullscreen}
              className="chatbot-pop-trigger rounded-full p-2.5 text-green-700 hover:bg-white hover:shadow-sm hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-[#8cc69f] [--chatbot-pop-hover-transform:translateY(-1px)_scale(1.04)]"
              aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
            >
              {isFullscreen ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="h-[calc(100%-69px)] overflow-y-auto rounded-b-[24px] bg-gradient-to-br from-[#f5fbf3] to-[#eef6ea] custom-scrollbar">
        <div className="space-y-6 p-6 lg:p-8">
          {/* Calendar Section */}
          <section className="rounded-[28px] border border-[#dce9d8] bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-bold text-green-900">{monthLabel}</h3>
                <p className="mt-1 text-sm text-green-800/70">
                  Scroll down for weather, notes and reminders, and active alerts.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-[#dce9d8] bg-white/60 p-1 shadow-sm">
                <button
                  onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
                  className="chatbot-pop-trigger flex h-8 w-8 items-center justify-center rounded-full text-green-700 hover:bg-white hover:shadow-sm [--chatbot-pop-hover-transform:translateY(-1px)_scale(1.04)]"
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <button
                  onClick={() => setMonthCursor(new Date())}
                  className="chatbot-pop-trigger rounded-full px-4 py-1 text-sm font-medium text-green-700 hover:bg-white hover:shadow-sm [--chatbot-pop-hover-transform:translateY(-1px)_scale(1.02)]"
                >
                  Today
                </button>
                <button
                  onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
                  className="chatbot-pop-trigger flex h-8 w-8 items-center justify-center rounded-full text-green-700 hover:bg-white hover:shadow-sm [--chatbot-pop-hover-transform:translateY(-1px)_scale(1.04)]"
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="mb-2 grid grid-cols-7 text-center text-sm font-medium text-green-800/60">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {grid.map((cell, i) => {
                const inMonth = cell.inMonth;
                const isSelected = selectedDate ? isSameDay(cell.date, selectedDate) : false;
                const marker = markersByDate.get(toYmd(cell.date));
                const isFrostProne = cell.inMonth && isFrostProneDate(cell.date, projectedFrostDates);
                const classes = [
                  "relative flex aspect-square w-full flex-col items-center justify-center rounded-[20px] border-2 transition-all duration-200 ease-out",
                  inMonth
                    ? isFrostProne
                      ? "bg-sky-100/70 text-green-900"
                      : "bg-white/40 text-green-900"
                    : "border-transparent bg-transparent text-green-900/30",
                  isSelected
                    ? "z-10 scale-105 border-sky-500 bg-sky-50 shadow-sm"
                    : "border-transparent hover:border-[#dce9d8] hover:bg-white hover:shadow-sm",
                ].join(" ");
                return (
                  <button
                    key={`${toYmd(cell.date)}-${i}`}
                    onClick={() => setSelectedDate(new Date(cell.date))}
                    className={classes}
                  >
                    <div className="flex flex-col items-center text-[15px] font-medium">
                      {cell.date.getDate()}
                      {cell.isToday && (
                        <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-green-500" />
                      )}
                    </div>
                    {marker?.lastFrost && (
                      <div className="absolute left-1 right-1 bottom-1 rounded-full bg-sky-100 px-1 py-0.5 text-[9px] font-bold text-sky-700">
                        Last frost
                      </div>
                    )}

                    {marker?.firstFrost && (
                      <div className="absolute left-1 right-1 bottom-1 rounded-full bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-700">
                        First frost
                      </div>
                    )}

                    {marker && marker.notes > 0 && !marker.firstFrost && !marker.lastFrost && (
                      <div className="absolute bottom-1.5 flex gap-0.5">
                        {Array.from({ length: Math.min(marker.notes, 3) }).map((_, idx) => (
                          <span key={idx} className="block h-1.5 w-1.5 rounded-full bg-amber-400" />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-[#dce9d8] bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
            <h3 className="text-base font-bold text-green-900">
              Projected Frost Dates
            </h3>

            {projectedFrostDates ? (
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-[18px] border border-sky-100 bg-sky-50 px-4 py-3">
                  <div className="font-semibold text-green-900">Last Spring Frost</div>
                  <div className="text-sky-700">{projectedFrostDates.lastFrost}</div>
                </div>

                <div className="rounded-[18px] border border-blue-100 bg-blue-50 px-4 py-3">
                  <div className="font-semibold text-green-900">First Fall Frost</div>
                  <div className="text-blue-700">{projectedFrostDates.firstFrost}</div>
                </div>

                <p className="text-xs text-green-700/70">
                  {projectedFrostDates.label}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-green-700/70">
                Set your garden hardiness zone to show projected frost dates.
              </p>
            )}
          </section>

          {/* Weather Card */}
          <section className="rounded-[28px] border border-[#dce9d8] bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
            <h3 className="text-base font-bold text-green-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
              Weather
            </h3>
            <div className="mt-4 flex gap-2">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Search city (e.g., Denton, US)"
                className="w-full rounded-full border border-[#dce9d8] bg-white px-5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8cc69f] transition-all"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && city.trim()) fetchByCity(city.trim());
                }}
              />
              <button
                onClick={() => city.trim() && fetchByCity(city.trim())}
                className="rounded-full bg-green-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors shadow-sm"
              >
                Search
              </button>
            </div>
            <button
              onClick={useMyLocation}
              className="mt-3 w-full rounded-full border-2 border-dashed border-[#dce9d8] px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-white hover:border-[#8cc69f] transition-all"
            >
              Use my exact location
            </button>

            {loading && <p className="mt-4 text-sm text-green-700 animate-pulse">Loading weather data…</p>}
            {error && <p className="mt-4 text-sm text-red-500 bg-red-50 p-3 rounded-2xl">{error}</p>}

            {!loading && !error && weather && (
              <div className="mt-5 space-y-4">
                {selectedForecast ? (
                  <div className="rounded-[20px] bg-gradient-to-r from-[#eef6ea] to-[#f5fbf3] border border-[#dce9d8] p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">
                        Forecast for {selectedYmd}
                      </div>
                      <div className="text-lg font-bold text-green-900 capitalize">
                        {selectedForecast.description}
                      </div>
                      <div className="text-sm font-medium text-green-800/80">
                        {Math.round(selectedForecast.temp.min)}° / {Math.round(selectedForecast.temp.max)}°
                      </div>
                    </div>
                    <img src={`https://openweathermap.org/img/wn/${selectedForecast.icon}@2x.png`} alt="" className="h-16 w-16 drop-shadow-sm" />
                  </div>
                ) : (
                  <div className="rounded-[20px] bg-gradient-to-r from-[#eef6ea] to-[#f5fbf3] border border-[#dce9d8] p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Current</div>
                      {weather.current ? (
                        <>
                          <div className="text-lg font-bold text-green-900 capitalize">
                            {weather.current.description}
                          </div>
                          <div className="text-sm font-medium text-green-800/80">
                            {Math.round(weather.current.temp)}°
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-green-700">Select a date or search a city.</div>
                      )}
                    </div>
                    {weather.current && (
                      <img src={`https://openweathermap.org/img/wn/${weather.current.icon}@2x.png`} alt="" className="h-16 w-16 drop-shadow-sm" />
                    )}
                  </div>
                )}
              </div>
            )}

            {!loading && !error && weather && nextFourDaysForecast.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-bold text-green-800 uppercase tracking-wider mb-2">Next 4 days</div>
                <div className="grid grid-cols-2 gap-3">
                  {nextFourDaysForecast.map((day) => (
                    <button
                      key={day.date}
                      onClick={() => setSelectedDate(new Date(day.date))}
                      className="rounded-[16px] border border-[#dce9d8] bg-white p-3 text-left hover:border-[#8cc69f] hover:shadow-sm transition-all group"
                    >
                      <div className="text-xs font-semibold text-green-700 mb-1">{day.date}</div>
                      <div className="flex items-center gap-2">
                        <img src={`https://openweathermap.org/img/wn/${day.icon}.png`} alt="" className="h-8 w-8 group-hover:scale-110 transition-transform" />
                        <div>
                          <div className="text-xs font-medium text-green-900 capitalize truncate w-16">
                            {day.description}
                          </div>
                          <div className="text-xs text-green-800/80">
                            {Math.round(day.temp.min)}° / {Math.round(day.temp.max)}°
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Notes Card */}
          <section className="rounded-[28px] border border-[#dce9d8] bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-green-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Notes & Reminders
              </h3>
              <span className="text-xs font-medium bg-[#eef6ea] text-green-800 px-3 py-1 rounded-full border border-[#dce9d8]">
                {selectedYmd ?? "All dates"}
              </span>
            </div>

            <form onSubmit={submitNote} className="space-y-3">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Jot down a reminder or observation..."
                className="w-full rounded-[20px] border border-[#dce9d8] bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8cc69f] transition-all resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={noteReminderAt}
                  onChange={(e) => setNoteReminderAt(e.target.value)}
                  className="flex-1 rounded-full border border-[#dce9d8] bg-white px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#8cc69f] transition-all"
                />
                <button
                  type="submit"
                  disabled={!noteText.trim()}
                  className="rounded-full bg-green-800 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  Save
                </button>
              </div>
              <input
                type="email"
                value={noteReminderEmail}
                onChange={(e) => setNoteReminderEmail(e.target.value)}
                placeholder="Send reminder to specific email (optional)"
                className="w-full rounded-full border border-[#dce9d8] bg-white px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8cc69f] transition-all"
              />
            </form>

            <div className="mt-5 border-t border-[#dce9d8] pt-5">
              <label className="block text-xs font-bold text-green-800 uppercase tracking-wider mb-2">Default Alert Email</label>
              <input
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-full border border-[#dce9d8] bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8cc69f] transition-all"
              />
            </div>

            <div className="mt-5 space-y-3">
              {selectedNotes.length === 0 ? (
                <div className="text-center py-4 text-sm text-green-700/60 italic border-2 border-dashed border-[#dce9d8] rounded-[20px]">
                  No notes yet.
                </div>
              ) : (
                selectedNotes.map((note) => (
                  <div key={note.id} className="group rounded-[20px] border border-[#dce9d8] bg-white p-4 shadow-sm hover:shadow-md transition-all relative">
                    <p className="text-sm font-medium text-green-900 pr-6">{note.content}</p>
                    <div className="mt-2 flex flex-wrap gap-2 items-center text-xs text-green-700/80">
                      {note.date && <span className="bg-[#f5fbf3] px-2 py-1 rounded-md">{note.date}</span>}
                      {note.reminderAt && (
                        <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-md flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {new Date(note.reminderAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeNote(note.id)}
                      className="absolute top-3 right-3 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-red-50 rounded-full"
                      title="Delete Note"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Alerts Card */}
          <section className="rounded-[28px] border border-[#dce9d8] bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
            <h3 className="text-base font-bold text-green-900 flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              Active Alerts
            </h3>
            
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-3 text-sm text-green-700/60 italic border-2 border-dashed border-[#dce9d8] rounded-[20px]">
                  All caught up!
                </div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start justify-between rounded-[16px] border border-amber-200 bg-amber-50 p-3 shadow-sm">
                    <p className="text-sm font-medium text-amber-900 mr-2">{alert.message}</p>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-full transition-colors whitespace-nowrap"
                    >
                      Dismiss
                    </button>
                  </div>
                ))
              )}
            </div>

            {upcomingReminders.length > 0 && (
              <div className="mt-5 border-t border-[#dce9d8] pt-4">
                <p className="text-xs font-bold text-green-800 uppercase tracking-wider mb-2">Upcoming</p>
                <ul className="space-y-2">
                  {upcomingReminders.map((note) => (
                    <li key={note.id} className="flex items-center gap-2 text-sm text-green-800 bg-white border border-[#dce9d8] p-2 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                      <span className="font-medium truncate">{note.content}</span>
                      <span className="text-xs text-green-600/80 ml-auto whitespace-nowrap">
                        {new Date(note.reminderAt as string).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
