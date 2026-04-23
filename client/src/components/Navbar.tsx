// Navbar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import VariableWindow from "./VariableWindow";
import { GiOakLeaf } from "react-icons/gi";
import { TbHomeEdit } from "react-icons/tb";
import { HiX } from "react-icons/hi";
import { FaEdit, FaSearch, FaCalendarAlt, FaRegUser, FaCog, FaMobileAlt } from "react-icons/fa";
import { RiDeleteBin6Line, RiSave3Line } from "react-icons/ri";
import { IoFolderOutline } from "react-icons/io5";
import { saveGarden, listGardens, loadGarden, deleteGarden } from "../actions/gardenActions";
import { GardenState, useGardenStore } from "../types/garden";
import { useUser } from "@stackframe/stack";
import Chatbot from "./Chatbot";
import { LuMenu, LuSprout } from "react-icons/lu";
import { useSidebarStore } from "../stores/sidebarStore";
import {
  CHATBOT_POPUP_DURATION_MS,
  CHATBOT_POPUP_EASE,
  CHATBOT_POPUP_EXIT_EASE,
  ICON_WINDOW_POPUP_DURATION_MS,
} from "../lib/motion";

type NavbarProps = {
  onOpenSearch?: () => void;
  onOpenCalendar?: () => void;
};

const Navbar = ({ onOpenSearch, onOpenCalendar }: NavbarProps) => {
  // ====== STATE ======
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [date, setDate] = useState("");
  const [temp, setTemp] = useState<number | null>(null);
  const [isVariableOpen, setIsVariableOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [city, setCity] = useState<string | null>(null);
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [weatherCondition, setWeatherCondition] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [savedList, setSavedList] = useState<{ id: string; name: string; updatedAt: Date }[]>([]);
  const [showSavedList, setShowSavedList] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);

  // ====== Canvas store (edit mode) ======
  const gardenState = useGardenStore();
  const { id, name, shapes, beds, loadGarden: loadIntoStore } = useGardenStore();
  const { editMode, setEditMode, gridMode, shapeMode, setGridMode, setShapeMode } = useGardenStore();
  const toggleEdit = () => setEditMode(!editMode);

  // ====== HANDLERS ======
  const toggleVariableWindow = () => setIsVariableOpen((prev) => !prev);
  const toggleChatWindow = () => setIsChatOpen((prev) => !prev);

  const user = useUser({ or: 'return-null' });
  const toggleSearch = useSidebarStore((state) => state.toggleSearch);
  const toggleCalendar = useSidebarStore((state) => state.toggleCalendar);
  const handleSearchClick = onOpenSearch ?? toggleSearch;
  const handleCalendarClick = onOpenCalendar ?? toggleCalendar;

  const formatTemperature = (tempC: number) => {
    if (unit === "C") return `${tempC.toFixed(0)}°C`;
    return `${((tempC * 9) / 5 + 32).toFixed(0)}°F`;
  };

  const getStateAbbreviation = (stateName: string): string | null => {
    const states: Record<string, string> = {
      Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
      Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
      Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
      Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
      Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS",
      Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH",
      "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC",
      "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA",
      "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN",
      Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA",
      "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
    };
    return states[stateName] || null;
  };

  const weatherDescriptions: Record<number, string> = {
    0: "Clear", 1: "Mostly Clear", 2: "Partly Cloudy", 3: "Overcast",
    45: "Foggy", 48: "Rime Fog", 51: "Light Drizzle", 53: "Drizzle",
    55: "Dense Drizzle", 56: "Freezing Drizzle", 57: "Freezing Drizzle",
    61: "Light Rain", 63: "Rain", 65: "Heavy Rain", 66: "Freezing Rain",
    67: "Freezing Rain", 71: "Light Snow", 73: "Snow", 75: "Heavy Snow",
    80: "Showers", 81: "Heavy Showers", 82: "Violent Showers",
    95: "Thunderstorms", 99: "Hail",
  };

  const getWeatherIcon = (condition: string) => {
    const lower = condition.toLowerCase();
    if (lower.includes("clear")) return "☀️";
    if (lower.includes("cloud") || lower.includes("overcast")) return "☁️";
    if (lower.includes("rain") || lower.includes("shower")) return "🌧️";
    if (lower.includes("drizzle")) return "🌦️";
    if (lower.includes("snow") || lower.includes("hail")) return "❄️";
    if (lower.includes("thunder")) return "⛈️";
    if (lower.includes("fog")) return "🌫️";
    return "🌤️";
  };
  
  const handleSave = async () => {
    if (!user) return;
      const gardenName = prompt("Enter garden name:", "My Garden");
      if (!gardenName) return;

      const state = useGardenStore.getState();

      const payload: GardenState = {
        ...state,
        name: gardenName,
        editMode: false,
      };
      const { id: savedId } = await saveGarden(user.id, payload);
      useGardenStore.setState({ id: savedId });
  };

  const handleOpenFolder = async () => {
    if (!user) return;
    const list = await listGardens(user.id);
    setSavedList(list);
    setShowSavedList(true);
  };

  const handleLoad = async (gardenId: string) => {
    if (!user) return;
    const state = await loadGarden(user.id, gardenId);
    if (state) loadIntoStore(state);
    setShowSavedList(false);
  };

  const handleDelete = async (gardenId: string, gardenName: string) => {
    if (!user) return;
    const confirmed = window.confirm(`Delete "${gardenName}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteGarden(user.id, gardenId);
      setSavedList((prev) => prev.filter((garden) => garden.id !== gardenId));
      if (id === gardenId) useGardenStore.setState({ id: "" });
    } catch (error) {
      console.error("Failed to delete garden:", error);
      window.alert("Could not delete this garden. Please try again.");
    }
  };

  const getPopupMotionStyle = (isVisible: boolean) => ({
    transitionDuration: `${ICON_WINDOW_POPUP_DURATION_MS}ms`,
    transitionTimingFunction: isVisible ? CHATBOT_POPUP_EASE : CHATBOT_POPUP_EXIT_EASE,
  });

  const iconBtnClass =
    "chatbot-pop-trigger relative flex h-10 w-10 items-center justify-center rounded-2xl bg-transparent text-slate-500 hover:bg-emerald-100 hover:text-emerald-700 hover:shadow-[0_12px_24px_-18px_rgba(5,150,105,0.85)] focus:outline-none focus:ring-2 focus:ring-emerald-400";

  // ====== EFFECTS ======
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const now = new Date();
    setDate(now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }));
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const fetchWeather = (latitude: number, longitude: number) => {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`)
        .then((res) => res.json())
        .then((data) => {
          if (data.current) {
            if (data.current.temperature_2m !== undefined) setTemp(data.current.temperature_2m);
            if (data.current.weather_code !== undefined) setWeatherCondition(weatherDescriptions[data.current.weather_code] || "Unknown");
          }
        }).catch((err) => console.error(err));

      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
        .then((res) => res.json())
        .then((geoData) => {
          if (geoData.address) {
            const cityName = geoData.address.city || geoData.address.town || geoData.address.village || "Unknown";
            const stateAbbr = getStateAbbreviation(geoData.address.state || "");
            setCity(stateAbbr ? `${cityName}, ${stateAbbr}` : cityName);
          }
        }).catch((err) => console.error(err));
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchWeather(pos.coords.latitude, pos.coords.longitude);
          const int = setInterval(() => fetchWeather(pos.coords.latitude, pos.coords.longitude), 600000);
          return () => clearInterval(int);
        },
        () => fetchWeather(30.27, -97.74)
      );
    }
  }, [mounted]);

  if (!mounted) return null;

  // ====== RENDER ======
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 pointer-events-none">
        <nav className="pointer-events-auto relative flex w-full items-center gap-3 border-b border-white/70 bg-white/82 px-4 py-3 shadow-[0_16px_36px_-18px_rgba(15,23,42,0.22)] backdrop-blur-xl md:px-6 lg:px-8">
          
          {/* ====== Left: Logo ===== */}
          <div className="flex min-w-0 flex-1 items-center">
            <Link href="/" className="group flex items-center gap-2.5 px-1.5">
              <div className="chatbot-pop-trigger flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-500/30 [--chatbot-pop-hover-transform:translateY(-2px)_scale(1.08)_rotate(6deg)]">
                <GiOakLeaf size={24} />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-lg font-black text-slate-800 tracking-tight group-hover:text-emerald-600 transition-colors leading-none">
                  Blueprint
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 leading-none">
                  Botanica
                </span>
              </div>
            </Link>
          </div>

          {/* ====== Center: Icon Island ===== */}
          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:flex items-center gap-2 rounded-full border border-white/80 bg-slate-100/92 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_26px_-20px_rgba(15,23,42,0.5)]">
            <button onClick={toggleEdit} className={iconBtnClass} title="Edit Mode">
              <FaEdit size={18} />
            </button>
            <button onClick={toggleVariableWindow} className={iconBtnClass} title="Plant Settings">
              <TbHomeEdit size={20} />
            </button>
            <button onClick={handleSearchClick} className={iconBtnClass} title="Search">
              <FaSearch size={18} />
            </button>
            <button onClick={handleCalendarClick} className={iconBtnClass} title="Calendar">
              <FaCalendarAlt size={18} />
            </button>

            <div className="h-6 w-px bg-slate-200" />

            <div className="relative">
              <button
                onClick={() => setIsSaveMenuOpen(!isSaveMenuOpen)}
                className={iconBtnClass}
                title="Save Options"
              >
                <RiSave3Line size={20} />
              </button>
              
              <div
                aria-hidden={!isSaveMenuOpen}
                className={`absolute top-full left-1/2 -translate-x-1/2 mt-4 w-48 rounded-2xl border border-slate-100 bg-white/95 p-2 shadow-2xl backdrop-blur-2xl transition-all z-50 ${
                  isSaveMenuOpen ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95"
                }`}
                style={getPopupMotionStyle(isSaveMenuOpen)}
              >
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => {
                      handleSave();
                      setIsSaveMenuOpen(false);
                    }}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 active:scale-95 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <RiSave3Line size={16} />
                    Save garden
                  </button>
                  <button
                    onClick={() => {
                      window.alert("Garden link sent to phone!");
                      setIsSaveMenuOpen(false);
                    }}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 active:scale-95 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <FaMobileAlt size={16} />
                    Send to phone
                  </button>
                </div>
              </div>
            </div>
            <button onClick={handleOpenFolder} className={iconBtnClass} title="Saved Gardens">
              <IoFolderOutline size={20} />
            </button>

            <div className="h-6 w-px bg-slate-200" />

            <Link href={user ? "/settings" : "/handler/sign-up"} className={iconBtnClass} title={user ? "Profile Settings" : "Profile"}>
              <FaRegUser size={18} />
            </Link>

            <div className="relative">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={iconBtnClass}
                title="Canvas Settings"
              >
                <FaCog size={18} />
              </button>
              
              <div
                aria-hidden={!isSettingsOpen}
                className={`absolute top-full left-1/2 -translate-x-1/2 mt-4 w-64 rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-2xl backdrop-blur-2xl transition-all z-50 ${
                  isSettingsOpen ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95"
                }`}
                style={getPopupMotionStyle(isSettingsOpen)}
              >
                <div className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="font-black text-slate-800 text-xs uppercase tracking-widest">Canvas Settings</span>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="chatbot-pop-trigger rounded-full p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                  >
                    <HiX size={16} />
                  </button>
                </div>
                
                <div className="flex flex-col gap-3 p-1">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-slate-500">Grid Style</span>
                    <div className="flex rounded-lg bg-slate-100 p-1">
                      <button
                        onClick={() => setGridMode("dots")}
                        className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 active:scale-95 ${gridMode === "dots" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
                      >
                        White Dots
                      </button>
                      <button
                        onClick={() => setGridMode("lines")}
                        className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 active:scale-95 ${gridMode === "lines" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
                      >
                        White Lines
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-slate-500">Shape Color</span>
                    <div className="flex rounded-lg bg-slate-100 p-1">
                      <button
                        onClick={() => setShapeMode("white")}
                        className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 active:scale-95 ${shapeMode === "white" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
                      >
                        White
                      </button>
                      <button
                        onClick={() => setShapeMode("brown")}
                        className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 active:scale-95 ${shapeMode === "brown" ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
                      >
                        Earth Brown
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={toggleChatWindow}
              className={`chatbot-pop-trigger group relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/30 [--chatbot-pop-hover-transform:translateY(-2px)_scale(1.03)] ${
                isChatOpen
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/40"
                  : "bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white hover:shadow-md hover:shadow-orange-500/30"
              }`}
            >
              <LuSprout size={18} />
              <span>Clementine</span>
            </button>
          </div>

          {/* ====== Right: Weather + Mobile Menu ===== */}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
            <div className="hidden min-w-0 lg:flex items-center rounded-full border border-slate-200/50 bg-slate-100/80 p-1 pr-3 shadow-inner">
              <div className="flex h-7 max-w-[12rem] items-center justify-center truncate rounded-full bg-white px-2.5 text-xs font-bold text-slate-700 shadow-sm xl:max-w-[16rem]">
                {city || "Locating..."}
              </div>
              
              {weatherCondition && (
                <div className="flex items-center gap-1.5 ml-2.5 text-xs font-bold text-slate-600">
                  <span className="text-base animate-bounce" style={{ animationDuration: '3s' }}>{getWeatherIcon(weatherCondition)}</span>
                  <span>{weatherCondition}</span>
                </div>
              )}

              {temp !== null && (
                <div className="flex items-center gap-2 ml-2.5 pl-2.5 border-l-2 border-slate-200">
                  <span className="text-xs font-black text-slate-700">{formatTemperature(temp)}</span>
                  <button
                    onClick={() => setUnit(unit === "C" ? "F" : "C")}
                    className={`relative flex h-5 w-9 items-center rounded-full border transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                      unit === "F"
                        ? "border-amber-300 bg-gradient-to-r from-amber-300 to-orange-400 focus:ring-amber-300"
                        : "border-sky-300 bg-gradient-to-r from-sky-300 to-cyan-400 focus:ring-sky-300"
                    }`}
                    title="Toggle °C/°F"
                    aria-label={`Switch temperature unit to ${unit === "C" ? "Fahrenheit" : "Celsius"}`}
                  >
                    <div
                      className={`absolute h-3.5 w-3.5 rounded-full bg-white shadow-[0_2px_10px_rgba(15,23,42,0.22)] ring-1 ring-white/80 transform transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                        unit === "F" ? "translate-x-[18px]" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="chatbot-pop-trigger ml-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 md:hidden [--chatbot-pop-hover-transform:translateY(-2px)_scale(1.05)]"
            >
              {isMenuOpen ? <HiX size={22} /> : <LuMenu size={22} />}
            </button>
          </div>
        </nav>
      </header>

      {/* ====== Mobile Dropdown Menu ====== */}
      <div
        aria-hidden={!isMenuOpen}
        className={`fixed left-4 right-4 top-24 z-40 rounded-3xl border border-slate-100 bg-white/90 p-2 shadow-2xl backdrop-blur-xl transition-all md:hidden ${
          isMenuOpen ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95"
        }`}
        style={getPopupMotionStyle(isMenuOpen)}
      >
          {[
            { name: "Edit Mode", action: toggleEdit, icon: <FaEdit size={16} /> },
            { name: "Plant Settings", action: toggleVariableWindow, icon: <TbHomeEdit size={16} /> },
            { name: "Search", action: handleSearchClick, icon: <FaSearch size={16} /> },
            { name: "Calendar", action: handleCalendarClick, icon: <FaCalendarAlt size={16} /> },
            { name: "Save Garden", action: handleSave, icon: <RiSave3Line size={16} /> },
            { name: "Load Garden", action: handleOpenFolder, icon: <IoFolderOutline size={16} /> },
            { name: "Ask Clementine", action: toggleChatWindow, icon: <LuSprout size={16} className="text-orange-500" /> },
            { name: "Profile Settings", action: () => {}, icon: <FaRegUser size={16} /> },
          ].map((item) => (
            <button
              key={item.name}
              onClick={() => { item.action(); setIsMenuOpen(false); }}
              className="chatbot-pop-trigger flex w-full items-center gap-3 rounded-2xl p-3.5 text-sm font-bold text-slate-700 hover:bg-slate-100 [--chatbot-pop-hover-transform:translateY(-1px)_scale(1.01)]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/50 text-slate-500">
                {item.icon}
              </div>
              {item.name}
            </button>
          ))}
      </div>

      {/* ====== Saved Gardens Modal ====== */}
      <div
        aria-hidden={!showSavedList}
        className={`fixed right-4 top-24 z-50 w-72 rounded-3xl border border-slate-100 bg-white/95 p-2 shadow-2xl backdrop-blur-2xl transition-all md:right-8 ${
          showSavedList ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95"
        }`}
        style={getPopupMotionStyle(showSavedList)}
      >
          <div className="mb-2 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <span className="font-black text-slate-800 text-xs uppercase tracking-widest">Your Gardens</span>
            <button
              onClick={() => setShowSavedList(false)}
              className="chatbot-pop-trigger rounded-full p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 [--chatbot-pop-hover-transform:translateY(-1px)_scale(1.04)_rotate(6deg)]"
            >
              <HiX size={18} />
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1.5">
            {savedList.length === 0 && (
              <div className="p-5 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                No saved gardens yet.
              </div>
            )}
            {savedList.map((g) => (
              <div
                key={g.id}
                className="chatbot-pop-trigger group flex items-center justify-between rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm hover:border-emerald-200 hover:bg-emerald-50 [--chatbot-pop-hover-transform:translateY(-2px)_scale(1.01)]"
              >
                <button onClick={() => handleLoad(g.id)} className="flex-1 text-left flex flex-col min-w-0">
                  <span className="font-bold text-sm text-slate-700 truncate group-hover:text-emerald-700">{g.name}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{new Date(g.updatedAt).toLocaleDateString()}</span>
                </button>
                <Link
                  href={`/garden/${g.id}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View on mobile"
                  className="chatbot-pop-trigger rounded-lg p-2 text-slate-300 opacity-0 hover:bg-emerald-100 hover:text-emerald-600 group-hover:opacity-100 [--chatbot-pop-hover-transform:translateY(-1px)_scale(1.04)]"
                >
                  <FaMobileAlt size={15} />
                </Link>
                <button
                  onClick={() => handleDelete(g.id, g.name)}
                  className="chatbot-pop-trigger rounded-lg p-2 text-slate-300 opacity-0 hover:bg-rose-100 hover:text-rose-600 group-hover:opacity-100 [--chatbot-pop-hover-transform:translateY(-1px)_scale(1.04)_rotate(6deg)]"
                >
                  <RiDeleteBin6Line size={16} />
                </button>
              </div>
            ))}
          </div>
      </div>

            {/* ====== Windows & Chatbot ====== */}
            <VariableWindow isOpen={isVariableOpen} onClose={() => setIsVariableOpen(false)} />
            <Chatbot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </>
  );
};

export default Navbar;
