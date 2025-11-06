"use client";
import { useEffect, useMemo, useState } from "react";
import Image from 'next/image';

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

export default function CalendarWindow({ isOpen, onClose, defaultFullscreen = false }: Props) {
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

  useEffect(() => {
    if (!isOpen) setIsFullscreen(false);
  }, [isOpen]);

  

  const toggleFullscreen = () => setIsFullscreen((v) => !v);

  const monthLabel = useMemo(() =>
    monthCursor.toLocaleString(undefined, { month: "long", year: "numeric" }),
  [monthCursor]);

  function daysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  const grid = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();

    const first = new Date(year, month, 1);
    const startWeekday = first.getDay(); 
    const total = daysInMonth(year, month);

    const cells: { date: Date; inMonth: boolean; isToday: boolean }[] = [];

    // leading days from prev month
    for (let i = 0; i < startWeekday; i++) {
      const d = new Date(year, month, 1 - (startWeekday - i));
      cells.push({ date: d, inMonth: false, isToday: isSameDay(d, new Date()) });
    }
    // current month
    for (let d = 1; d <= total; d++) {
      const date = new Date(year, month, d);
      cells.push({ date, inMonth: true, isToday: isSameDay(date, new Date()) });
    }
    // trailing days to fill 6x7 grid
    while (cells.length % 7 !== 0 || cells.length < 42) {
      const last = cells[cells.length - 1]?.date ?? new Date(year, month, total);
      const next = new Date(last);
      next.setDate(last.getDate() + 1);
      cells.push({ date: next, inMonth: false, isToday: isSameDay(next, new Date()) });
    }
    return cells;
  }, [monthCursor]);

  function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  async function fetchByCity(q: string) {
    setLoading(true); setError(null);
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
    if (!navigator.geolocation) { setError("Geolocation not supported"); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
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
    }, (err) => { setLoading(false); setError(err.message); }, { enableHighAccuracy: true });
  }

  function dayKey(d: Date) { return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
  function toYMD(d: Date) {
    const y = d.getFullYear();
    const m = `${d.getMonth()+1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  const selectedYmd = selectedDate ? toYMD(selectedDate) : null;
  const selectedForecast = useMemo(() => {
    if (!weather || !selectedYmd) return null;
    return weather.daily.find(d => d.date === selectedYmd) || null;
  }, [weather, selectedYmd]);

  return (
    <div className={`fixed z-50 rounded-2xl bg-white shadow-2xl border border-green-200 transition-all duration-300 ease-in-out ${
      isFullscreen ? "inset-24" : "top-24 left-6 w-[880px] h-[560px]"
    } ${isOpen ? "" : "hidden"}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-green-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-green-900">Calendar</h2>
          {weather?.city && (
            <span className="text-sm text-green-700">• Weather for <strong>{weather.city}</strong>{weather.country ? `, ${weather.country}` : ''}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-green-700 transition-colors hover:bg-green-100 hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-green-300"
              aria-label="Close"
            >
              {/* X icon */}
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
            </button>
          )}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-md p-1 text-green-700 transition-colors hover:bg-green-100 hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-green-300"
            aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
          >
            {isFullscreen ? (
              // Exit fullscreen
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 3H5a2 2 0 0 0-2 2v4" />
                <path d="M15 21h4a2 2 0 0 0 2-2v-4" />
                <path d="M21 9V5a2 2 0 0 0-2-2h-4" />
                <path d="M3 15v4a2 2 0 0 0 2 2h4" />
              </svg>
            ) : (
              // Enter fullscreen
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6" />
                <path d="M9 21H3v-6" />
                <path d="M21 9l-7-7" />
                <path d="M3 15l7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex h-[calc(100%-49px)] flex-col md:flex-row">
        {/* Left: Calendar */}
        <div className="md:w-2/3 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
                className="rounded-md border border-green-200 px-2 py-1 text-green-700 hover:bg-green-50"
                aria-label="Previous month"
              >
                ‹
              </button>
              <button
                onClick={() => setMonthCursor(new Date())}
                className="rounded-md border border-green-200 px-2 py-1 text-green-700 hover:bg-green-50"
              >
                Today
              </button>
              <button
                onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
                className="rounded-md border border-green-200 px-2 py-1 text-green-700 hover:bg-green-50"
                aria-label="Next month"
              >
                ›
              </button>
            </div>
            <div className="text-green-900 font-semibold">{monthLabel}</div>
          </div>

          <div className="mt-3 grid grid-cols-7 text-center text-xs text-green-700">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {grid.map((cell, i) => {
              const inMonth = cell.inMonth;
              const isSelected = selectedDate ? isSameDay(cell.date, selectedDate) : false;
              const classes = [
                "relative rounded-lg border px-2 py-2 text-center transition-colors",
                "border-green-200",
                inMonth ? "text-green-900" : "text-gray-400",
                isSelected ? "bg-green-100 ring-2 ring-green-400" : "hover:bg-green-50",
              ].join(" ");
              return (
                <button
                  key={`${dayKey(cell.date)}-${i}`}
                  onClick={() => setSelectedDate(new Date(cell.date))}
                  className={classes}
                >
                  <div className="text-sm">
                    {cell.date.getDate()}
                    {cell.isToday && (
                      <span className="ml-1 inline-block h-2 w-2 rounded-full bg-green-500 align-middle"/>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Weather */}
        <div className="md:w-1/3 border-t md:border-t-0 md:border-l border-green-200 p-4 flex flex-col">
          <h3 className="text-sm font-semibold text-green-900">Weather</h3>

          <div className="mt-2 flex gap-2">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Search city (e.g., Denton, US)"
              className="w-full rounded-md border border-green-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              onKeyDown={(e) => { if (e.key === 'Enter' && city.trim()) fetchByCity(city.trim()); }}
            />
            <button
              onClick={() => city.trim() && fetchByCity(city.trim())}
              className="rounded-md border border-green-200 px-3 text-sm text-green-700 hover:bg-green-50"
            >
              Search
            </button>
          </div>
          <button
            onClick={useMyLocation}
            className="mt-2 rounded-md border border-green-200 px-3 py-2 text-sm text-green-700 hover:bg-green-50"
          >
            Use my location
          </button>

          {loading && <p className="mt-3 text-sm text-green-700">Loading weather…</p>}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          {!loading && !error && weather && (
            <div className="mt-3 space-y-3 overflow-y-auto">
              {selectedForecast ? (
                <div className="rounded-xl border border-green-200 p-3">
                  <div className="text-xs text-green-700">Forecast for {selectedYmd}</div>
                  <div className="mt-1 flex items-center gap-3">
                    <Image src={`https://openweathermap.org/img/wn/${selectedForecast.icon}@2x.png`} alt="" className="h-10 w-10"/>
                    <div>
                      <div className="text-sm font-medium text-green-900 capitalize">{selectedForecast.description}</div>
                      <div className="text-sm text-green-800">{Math.round(selectedForecast.temp.min)}° / {Math.round(selectedForecast.temp.max)}°</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-green-200 p-3">
                  <div className="text-xs text-green-700">Current</div>
                  {weather.current ? (
                    <div className="mt-1 flex items-center gap-3">
                      <Image src={`https://openweathermap.org/img/wn/${weather.current.icon}@2x.png`} alt="" className="h-10 w-10"/>
                      <div>
                        <div className="text-sm font-medium text-green-900 capitalize">{weather.current.description}</div>
                        <div className="text-sm text-green-800">{Math.round(weather.current.temp)}°</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-green-700">Select a date or search a city.</div>
                  )}
                </div>
              )}

              <div>
                <div className="text-xs font-semibold text-green-800">Next days</div>
                <ul className="mt-1 divide-y divide-green-100 rounded-xl border border-green-200">
                  {weather.daily.map((d) => (
                    <li key={d.date} className="flex items-center justify-between p-2">
                      <button onClick={() => setSelectedDate(new Date(d.date))} className="flex items-center gap-3">
                        <Image src={`https://openweathermap.org/img/wn/${d.icon}.png`} alt="" className="h-6 w-6"/>
                        <span className="text-sm text-green-900">{d.date}</span>
                      </button>
                      <span className="text-sm text-green-800">{Math.round(d.temp.min)}° / {Math.round(d.temp.max)}°</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {!loading && !error && !weather && (
            <p className="mt-3 text-sm text-green-700">Search a city or use your location to see the forecast.</p>
          )}
        </div>
      </div>
    </div>
  );
}