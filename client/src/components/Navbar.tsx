"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SearchWindow from "./Searchwindow";
import VariableWindow from "./VariableWindow";
import Calendar from "./Calendar";
import { GiOakLeaf } from "react-icons/gi";
import { TbHomeEdit } from "react-icons/tb";
import { HiX } from "react-icons/hi";
import { FaEdit, FaSearch } from "react-icons/fa";
import { FaCalendarAlt } from "react-icons/fa";
import { IoNotifications } from "react-icons/io5";
import { RiSave3Line } from "react-icons/ri";
import { IoFolderOutline } from "react-icons/io5";
import { FaRegUser } from "react-icons/fa";
import { saveGarden, listGardens, loadGarden } from "../actions/gardenActions";
import { useGardenStore } from "../types/garden";
import { useUser } from "@stackframe/stack";
import Chatbot from "./Chatbot";
import { LuMenu, LuSprout } from "react-icons/lu";

const Navbar = () => {
  // ====== STATE ======
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [date, setDate] = useState("");
  const [temp, setTemp] = useState<number | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVariableOpen, setIsVariableOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [city, setCity] = useState<string | null>(null);
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [weatherCondition, setWeatherCondition] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [savedList, setSavedList] = useState<{ id: string; name: string; updatedAt: Date }[]>([]);
  const [showSavedList, setShowSavedList] = useState(false);

  // ====== Canvas store (edit mode) ======
  const gardenState = useGardenStore();
  const { id, name, shapes, beds, loadGarden: loadIntoStore } = useGardenStore();
  const { editMode, setEditMode } = useGardenStore();
  const toggleEdit = () => setEditMode(!editMode);

  // ====== HANDLERS ======
  const toggleSearchWindow = () => setIsSearchOpen((prev) => !prev);
  const toggleVariableWindow = () => setIsVariableOpen((prev) => !prev);
  const toggleCalendarWindow = () => setIsCalendarOpen((prev) => !prev);
  const toggleChatWindow = () => setIsChatOpen((prev) => !prev);

  const user = useUser({ or: 'return-null' });

  const formatTemperature = (tempC: number) => {
    if (unit === "C") return `${tempC.toFixed(0)}°C`;
    return `${((tempC * 9) / 5 + 32).toFixed(0)}°F`;
  };



  const getStateAbbreviation = (stateName: string): string | null => {
    const states: Record<string, string> = {
      Alabama: "AL",
      Alaska: "AK",
      Arizona: "AZ",
      Arkansas: "AR",
      California: "CA",
      Colorado: "CO",
      Connecticut: "CT",
      Delaware: "DE",
      Florida: "FL",
      Georgia: "GA",
      Hawaii: "HI",
      Idaho: "ID",
      Illinois: "IL",
      Indiana: "IN",
      Iowa: "IA",
      Kansas: "KS",
      Kentucky: "KY",
      Louisiana: "LA",
      Maine: "ME",
      Maryland: "MD",
      Massachusetts: "MA",
      Michigan: "MI",
      Minnesota: "MN",
      Mississippi: "MS",
      Missouri: "MO",
      Montana: "MT",
      Nebraska: "NE",
      Nevada: "NV",
      "New Hampshire": "NH",
      "New Jersey": "NJ",
      "New Mexico": "NM",
      "New York": "NY",
      "North Carolina": "NC",
      "North Dakota": "ND",
      Ohio: "OH",
      Oklahoma: "OK",
      Oregon: "OR",
      Pennsylvania: "PA",
      "Rhode Island": "RI",
      "South Carolina": "SC",
      "South Dakota": "SD",
      Tennessee: "TN",
      Texas: "TX",
      Utah: "UT",
      Vermont: "VT",
      Virginia: "VA",
      Washington: "WA",
      "West Virginia": "WV",
      Wisconsin: "WI",
      Wyoming: "WY",
    };
    return states[stateName] || null;
  };

  const weatherDescriptions: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Freezing drizzle",
    57: "Freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Moderate showers",
    82: "Violent showers",
    95: "Thunderstorm",
    99: "Hailstorm",
  };

  const getWeatherIcon = (condition: string) => {
    const lower = condition.toLowerCase();
    if (lower.includes("clear")) return "☀️";
    if (lower.includes("cloud")) return "☁️";
    if (lower.includes("rain")) return "🌧️";
    if (lower.includes("drizzle")) return "🌦️";
    if (lower.includes("snow")) return "❄️";
    if (lower.includes("thunder")) return "⛈️";
    if (lower.includes("fog") || lower.includes("mist")) return "🌫️";
    return "🌤️";
  };
  
  const handleSave = async () => {
    if (!user) return;
      const gardenName = prompt("Enter garden name:", "My Garden");
      if (!gardenName) return;

      const { id: savedId } = await saveGarden(user.id, { id, name: gardenName, shapes, beds, editMode: false });
      // Stamp the returned id onto the store so future saves update instead of insert
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
  const navIconButtonClass =
    "group p-3 rounded-xl text-[#B7C398] transition-all duration-200 ease-out hover:bg-[#004b34] hover:text-[#d9e8bc] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7C398]/60";
  const navIconClass =
    "transition-transform duration-200 ease-out group-hover:scale-110 group-hover:-translate-y-0.5";

  // ====== EFFECTS ======
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const now = new Date();
    setDate(
      now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    );
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    const fetchWeather = (latitude: number, longitude: number) => {
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.current) {
            if (data.current.temperature_2m !== undefined)
              setTemp(data.current.temperature_2m);
            if (data.current.weather_code !== undefined) {
              const code = data.current.weather_code;
              setWeatherCondition(weatherDescriptions[code] || "Unknown");
            }
          }
        })
        .catch((err) => console.error("Weather fetch error:", err));

      fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
      )
        .then((res) => res.json())
        .then((geoData) => {
          if (geoData.address) {
            const cityName =
              geoData.address.city ||
              geoData.address.town ||
              geoData.address.village ||
              geoData.address.county ||
              "Unknown location";
            const stateName = geoData.address.state || "";
            const stateAbbr = getStateAbbreviation(stateName);
            setCity(stateAbbr ? `${cityName}, ${stateAbbr}` : cityName);
          }
        })
        .catch((err) => console.error("Reverse geocoding error:", err));
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeather(latitude, longitude);
          const interval = setInterval(
            () => fetchWeather(latitude, longitude),
            600000
          );
          return () => clearInterval(interval);
        },
        () => fetchWeather(30.27, -97.74)
      );
    } else console.error("Geolocation not supported by this browser.");
  }, [mounted]);

  if (!mounted) {
    return (
      <nav className="bg-[#00563B] shadow-xl sticky top-0 z-50 h-16 flex items-center justify-center">
        <span className="text-[#B7C398] text-sm">Loading...</span>
      </nav>
    );
  }

  if (!mounted) {
    return (
      <nav className="bg-[#00563B] shadow-xl sticky top-0 z-50 h-16 flex items-center justify-center">
        <span className="text-[#B7C398] text-sm">Loading...</span>
      </nav>
    );
  }

  // ====== RENDER ======
  return (
    <nav className="bg-[#00563B] shadow-xl sticky top-0 z-50 relative">
      <div className="flex justify-between items-center h-16 max-w-full px-4 sm:px-6 lg:px-8 mx-auto">
        {/* ====== Left: Logo, Variable, Weather ===== */}
        <div className="flex items-center gap-3 relative">
          <GiOakLeaf size={45} style={{ color: "#B7C398" }} />
          <div className="flex flex-col relative">
            <Link
              href="/"
              className="text-xl font-bold hover:text-green-600 transition-colors flex flex-row"
              style={{ color: "#B7C398" }}
            >
              Blueprint Botanica
            </Link>
            <div
              className="text-sm font-medium ml-0.5"
              style={{ color: "#B7C398" }}
            >
              {date}
            </div>
          </div>

          {/* Variable toggle */}
          <button
            onClick={toggleVariableWindow}
            className={navIconButtonClass}
            title="Variable / Zipcode"
          >
            <TbHomeEdit size={27} className={navIconClass} />
          </button>

          {/* Weather info */}
          <div
            className="hidden sm:flex items-center gap-2 font-medium"
            style={{ color: "#B7C398" }}
          >
            {city ? `${city} | ` : ""}
            {weatherCondition && (
              <span className="flex items-center gap-1">
                <span>{getWeatherIcon(weatherCondition)}</span>
                <span>{weatherCondition}</span>
              </span>
            )}

            <div className="mt-2">
              {temp !== null ? formatTemperature(temp) : "Fetching..."}
              <div className="relative w-8 h-2 rounded-full bg-[#DDE4C1] shadow-inner overflow-hidden border border-[#B7C398]/60">
                <div
                  onClick={() => setUnit(unit === "C" ? "F" : "C")}
                  className={`absolute top-0 left-0 h-full w-1/2 bg-[#003326] rounded-full shadow-md transform transition-transform duration-300 ease-in-out cursor-pointer ${
                    unit === "F"
                      ? "translate-x-full"
                      : "translate-x-0"
                  }`}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* ====== Right: Icons + Menu ===== */}
        <div className="relative flex items-center">
          {/* Desktop icons */}
          <div className="hidden md:flex items-center">           
            <button
              data-testid="edit-button"
              onClick={toggleEdit}
              className={navIconButtonClass}
              title="Edit Mode"
            >
              <FaEdit size={25} className={navIconClass} />
            </button>                

            <button
              data-testid="search-button"
              onClick={toggleSearchWindow}
              className={navIconButtonClass}
              title="Search"
            >
              <FaSearch size={25} className={navIconClass} />
            </button>

            <button
              data-testid="calendar-button"
              onClick={toggleCalendarWindow}
              className={navIconButtonClass}
              title="Calendar"
            >
              <FaCalendarAlt size={25} className={navIconClass} />
            </button>

            <button className={navIconButtonClass} title="Notifications">
              <IoNotifications size={25} className={navIconClass} />
            </button>

            <button className={navIconButtonClass} title="Save">
              <RiSave3Line size={25} className={navIconClass} />
            </button>

            <button onClick={handleSave} className="p-3 rounded-xl text-[#B7C398]" title="Save">
              <RiSave3Line size={25} />
            </button>

            <button onClick={handleOpenFolder} className="p-3 rounded-xl text-[#B7C398]" title="Saved Gardens">
              <IoFolderOutline size={25} />
            </button>

            <button
              data-testid="chatbot-button"
              onClick={toggleChatWindow}
              className={`${navIconButtonClass} ${isChatOpen ? "bg-[#004b34]" : ""}`}
              title="Gardening Assistant"
            >
              <LuSprout size={25} className={`${navIconClass} text-[#f4a45a] group-hover:text-[#ffc078]`} />
            </button>


            <button className={navIconButtonClass} title="Notifications">
              <IoNotifications size={25} className={navIconClass} />
            </button>

            <Link href={user ? "/settings" : "/handler/sign-up"}>
              <button className="p-3 rounded-xl text-[#B7C398]" title={user ? "Settings" : "Profile"}>
                <FaRegUser size={25} />
              </button>
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-[#003326] transition-colors ml-2"
            title="Menu"
          >
            {isMenuOpen ? (
              <HiX size={30} style={{ color: "#B7C398" }} />
            ) : (
              <LuMenu size={30} style={{ color: "#B7C398" }} />
            )}
          </button>

          {/* Mobile dropdown */}
          {isMenuOpen && (
            <div className="absolute right-0 top-14 w-52 bg-[#003326] rounded-xl shadow-lg border border-[#B7C398]/40 overflow-hidden z-50 md:hidden">
              {[
                { name: "Edit Mode", action: toggleEdit, icon: <FaEdit size={20} /> },
                { name: "Search", action: toggleSearchWindow, icon: <FaSearch size={20} /> },
                { name: "Calendar", action: toggleCalendarWindow, icon: <FaCalendarAlt size={20} /> },
                { name: "Notifications", action: () => {}, icon: <IoNotifications size={20} /> },
                { name: "Save", action: () => {}, icon: <RiSave3Line size={20} /> },
                { name: "Saved Gardens", action: () => {}, icon: <IoFolderOutline size={20} /> },
                { name: "Assistant", action: toggleChatWindow, icon: <LuSprout size={20} className="text-[#f4a45a]" /> },
                { name: "Profile", action: () => {}, icon: <FaRegUser size={20} /> },
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    item.action();
                    setIsMenuOpen(false);
                  }}
                  className="group w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-[#004b34] transition-colors text-left"
                  style={{ color: "#B7C398" }}
                >
                  <span className={navIconClass}>{item.icon}</span>
                  {item.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {showSavedList && (
          <div className="absolute right-0 top-14 w-64 bg-[#003326] rounded-xl shadow-lg border border-[#B7C398]/40 z-50">
            <div className="p-2 text-[#B7C398] font-semibold border-b border-[#B7C398]/20 px-4">
              Saved Gardens
            </div>
            {savedList.length === 0 && (
              <div className="px-4 py-3 text-sm text-[#B7C398]/60">No saved gardens yet.</div>
            )}
            {savedList.map((g) => (
              <button
                key={g.id}
                onClick={() => handleLoad(g.id)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-[#004b34] text-[#B7C398] flex justify-between"
              >
                <span>{g.name}</span>
                <span className="text-xs opacity-50">{new Date(g.updatedAt).toLocaleDateString()}</span>
              </button>
            ))}
          </div>
        )}

        {/* ====== Popups ===== */}
        <SearchWindow data-testid="search-window" isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        <VariableWindow data-testid="variable-window" isOpen={isVariableOpen} onClose={() => setIsVariableOpen(false)} />
        <Calendar data-testid="calendar-window" isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} />
        <Chatbot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} /> {/* <--- RENDER CHATBOT */}
      </div>
    </nav>
  );
};

export default Navbar;
