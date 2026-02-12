"use client";
import { useEffect, useMemo, useState } from "react";
import { useCalendarStore } from "../stores/calendarStore";

type Props = {
  isOpen: boolean;
  onClose?: () => void;
  defaultFullscreen?: boolean;
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

const toYmd = (d: Date) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${dd}`;
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
}: Props) {
  const [isFullscreen, setIsFullscreen] = useState(defaultFullscreen);
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [city, setCity] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
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

  useEffect(() => {
    if (!isOpen) setIsFullscreen(false);
  }, [isOpen]);

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

  const toggleFullscreen = () => setIsFullscreen((v) => !v);

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
    const markerMap = new Map<string, { notes: number }>();

    for (const note of notes) {
      if (!note.date) continue;
      const cur = markerMap.get(note.date) ?? { notes: 0 };
      cur.notes += 1;
      markerMap.set(note.date, cur);
    }

    return markerMap;
  }, [notes]);

  const selectedNotes = useMemo(() => {
    if (!selectedYmd) return [];
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

  const submitNote = (e: React.FormEvent) => {
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

  return (
    <div
      data-testid="calendar-window"
      className={`fixed z-50 overflow-hidden rounded-[32px] bg-[#F7FBF5] shadow-[0_20px_48px_rgba(25,64,41,0.2)] border border-[#d7e6d2] transition-all duration-300 ease-in-out ${
        isFullscreen ? "inset-24" : "top-24 left-6 w-[980px] h-[620px]"
      } ${isOpen ? "" : "hidden"}`}
    >
      <div className="flex items-center justify-between border-b border-[#d7e6d2] bg-[#ecf5e8] px-5 py-3.5">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-green-900">Calendar</h2>
          {weather?.city && (
            <span className="text-sm text-green-700">
              • Weather for <strong>{weather.city}</strong>
              {weather.country ? `, ${weather.country}` : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="calendar-close-btn rounded-full p-2 text-green-700 hover:bg-green-100 hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-green-300"
              aria-label="Close"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-md p-1 text-green-700 transition-colors hover:bg-green-100 hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-green-300"
            aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
          >
            {isFullscreen ? (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 3H5a2 2 0 0 0-2 2v4" />
                <path d="M15 21h4a2 2 0 0 0 2-2v-4" />
                <path d="M21 9V5a2 2 0 0 0-2-2h-4" />
                <path d="M3 15v4a2 2 0 0 0 2 2h4" />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3h6v6" />
                <path d="M9 21H3v-6" />
                <path d="M21 9l-7-7" />
                <path d="M3 15l7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100%-53px)] flex-col lg:flex-row bg-[#f3f8f1]">
        <div className="lg:w-1/2 p-5 border-b lg:border-b-0 lg:border-r border-[#dce9d8]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setMonthCursor(
                    new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1)
                  )
                }
                className="rounded-xl border border-[#d7e6d2] px-2.5 py-1 text-green-700 hover:bg-[#eef6ea]"
                aria-label="Previous month"
              >
                ‹
              </button>
              <button
                onClick={() => setMonthCursor(new Date())}
                className="rounded-xl border border-[#d7e6d2] px-2.5 py-1 text-green-700 hover:bg-[#eef6ea]"
              >
                Today
              </button>
              <button
                onClick={() =>
                  setMonthCursor(
                    new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1)
                  )
                }
                className="rounded-xl border border-[#d7e6d2] px-2.5 py-1 text-green-700 hover:bg-[#eef6ea]"
                aria-label="Next month"
              >
                ›
              </button>
            </div>
            <div className="text-green-900 font-semibold">{monthLabel}</div>
          </div>

          <div className="mt-3 grid grid-cols-7 text-center text-xs text-green-700">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {grid.map((cell, i) => {
              const inMonth = cell.inMonth;
              const isSelected = selectedDate ? isSameDay(cell.date, selectedDate) : false;
              const marker = markersByDate.get(toYmd(cell.date));
              const classes = [
                "relative rounded-xl border px-2.5 py-2.5 text-center transition-all duration-150",
                "border-[#d7e6d2]",
                inMonth ? "text-green-900" : "text-gray-400",
                isSelected ? "bg-[#eaf6e6] ring-1 ring-[#8cc69f]" : "hover:bg-[#eef6ea]",
              ].join(" ");
              return (
                <button
                  key={`${toYmd(cell.date)}-${i}`}
                  onClick={() => setSelectedDate(new Date(cell.date))}
                  className={classes}
                >
                  <div className="text-sm">
                    {cell.date.getDate()}
                    {cell.isToday && (
                      <span className="ml-1 inline-block h-2 w-2 rounded-full bg-green-500 align-middle" />
                    )}
                  </div>
                  {marker && marker.notes > 0 && (
                    <div className="mt-1 flex items-center justify-center gap-1">
                      {marker.notes > 0 && (
                        <span
                          className="inline-block h-2 w-2 rounded-full bg-amber-500"
                          title={`${marker.notes} note(s)`}
                        />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:w-1/2 p-5 overflow-y-auto space-y-5">
          <section className="rounded-2xl border border-[#d7e6d2] bg-white/90 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-green-900">Weather</h3>
            <div className="mt-2 flex gap-2">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Search city (e.g., Denton, US)"
                className="w-full rounded-xl border border-[#d7e6d2] bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-300"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && city.trim()) fetchByCity(city.trim());
                }}
              />
              <button
                onClick={() => city.trim() && fetchByCity(city.trim())}
                className="rounded-xl border border-[#d7e6d2] px-3 text-sm text-green-700 hover:bg-[#eef6ea]"
              >
                Search
              </button>
            </div>
            <button
              onClick={useMyLocation}
              className="mt-2 rounded-xl border border-[#d7e6d2] px-3 py-2 text-sm text-green-700 hover:bg-[#eef6ea]"
            >
              Use my location
            </button>

            {loading && <p className="mt-3 text-sm text-green-700">Loading weather…</p>}
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            {!loading && !error && weather && (
              <div className="mt-3 space-y-3">
                {selectedForecast ? (
                  <div className="rounded-2xl border border-[#d7e6d2] bg-[#f9fcf7] p-3.5">
                    <div className="text-xs text-green-700">
                      Forecast for {selectedYmd}
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <img
                        src={`https://openweathermap.org/img/wn/${selectedForecast.icon}@2x.png`}
                        alt=""
                        className="h-10 w-10"
                      />
                      <div>
                        <div className="text-sm font-medium text-green-900 capitalize">
                          {selectedForecast.description}
                        </div>
                        <div className="text-sm text-green-800">
                          {Math.round(selectedForecast.temp.min)}° /{" "}
                          {Math.round(selectedForecast.temp.max)}°
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#d7e6d2] bg-[#f9fcf7] p-3.5">
                    <div className="text-xs text-green-700">Current</div>
                    {weather.current ? (
                      <div className="mt-1 flex items-center gap-3">
                        <img
                          src={`https://openweathermap.org/img/wn/${weather.current.icon}@2x.png`}
                          alt=""
                          className="h-10 w-10"
                        />
                        <div>
                          <div className="text-sm font-medium text-green-900 capitalize">
                            {weather.current.description}
                          </div>
                          <div className="text-sm text-green-800">
                            {Math.round(weather.current.temp)}°
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-green-700">
                        Select a date or search a city.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!loading && !error && weather && nextFourDaysForecast.length > 0 && (
              <div className="mt-3 rounded-2xl border border-[#d7e6d2] bg-[#f9fcf7] p-3.5">
                <div className="text-xs font-semibold text-green-800">Next 4 days</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {nextFourDaysForecast.map((day) => (
                    <button
                      key={day.date}
                      onClick={() => setSelectedDate(new Date(day.date))}
                      className="rounded-xl border border-[#dce9d8] bg-white p-2 text-left hover:bg-[#eef6ea]"
                    >
                      <div className="text-xs text-green-700">{day.date}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <img
                          src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                          alt=""
                          className="h-6 w-6"
                        />
                        <div>
                          <div className="text-xs text-green-900 capitalize">
                            {day.description}
                          </div>
                          <div className="text-xs text-green-800">
                            {Math.round(day.temp.min)}° / {Math.round(day.temp.max)}°
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!loading && !error && !weather && (
              <p className="mt-3 text-sm text-green-700">
                Search a city or use your location to see the forecast.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-[#d7e6d2] bg-white/90 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-green-900">Notes & reminders</h3>
            <p className="mt-1 text-xs text-green-700">
              Selected date: {selectedYmd ?? "None"}
            </p>

            <form onSubmit={submitNote} className="mt-3 space-y-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write a reminder note..."
                className="w-full rounded-xl border border-[#d7e6d2] bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-300"
                rows={2}
              />
              <input
                type="datetime-local"
                value={noteReminderAt}
                onChange={(e) => setNoteReminderAt(e.target.value)}
                className="w-full rounded-xl border border-[#d7e6d2] bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
              />
              <input
                type="email"
                value={noteReminderEmail}
                onChange={(e) => setNoteReminderEmail(e.target.value)}
                placeholder="Reminder email override (optional)"
                className="w-full rounded-xl border border-[#d7e6d2] bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-300"
              />
              <button
                type="submit"
                className="rounded-xl border border-[#d7e6d2] px-3 py-2 text-sm text-green-700 hover:bg-[#eef6ea]"
              >
                Add note
              </button>
            </form>

            <div className="mt-3">
              <label className="text-xs text-green-800">Default reminder email</label>
              <input
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-xl border border-[#d7e6d2] bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-300"
              />
            </div>

            <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
              {selectedNotes.length === 0 ? (
                <p className="text-xs text-green-700">No notes for this date yet.</p>
              ) : (
                selectedNotes.map((note) => (
                  <div key={note.id} className="rounded-xl border border-[#dce9d8] bg-[#f9fcf7] p-2.5">
                    <p className="text-sm text-green-900">{note.content}</p>
                    <p className="mt-1 text-xs text-green-700">
                      {note.date ? `Date: ${note.date}` : "General note"}
                      {note.reminderAt
                        ? ` • Reminder: ${new Date(note.reminderAt).toLocaleString()}`
                        : ""}
                    </p>
                    <button
                      onClick={() => removeNote(note.id)}
                      className="mt-1 text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#d7e6d2] bg-white/90 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-green-900">Alerts</h3>
            <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-xs text-green-700">No active alerts.</p>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-[#dce9d8] bg-[#f9fcf7] p-2.5">
                    <p className="text-xs text-green-900">{alert.message}</p>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="mt-1 text-xs text-green-700 hover:underline"
                    >
                      Dismiss
                    </button>
                  </div>
                ))
              )}
            </div>
            {upcomingReminders.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-green-800">Upcoming reminders</p>
                <ul className="mt-1 space-y-1">
                  {upcomingReminders.map((note) => (
                    <li key={note.id} className="text-xs text-green-700">
                      {new Date(note.reminderAt as string).toLocaleString()} • {note.content}
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
