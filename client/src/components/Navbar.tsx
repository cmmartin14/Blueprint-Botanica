"use client";


import { useEffect, useState } from "react";
import Link from "next/link";
import SearchWindow from "./Searchwindow";
import VariableWindow from "./VariableWindow";
import Calendar from "./Calendar";
import { GiOakLeaf } from "react-icons/gi";
import { TbHomeEdit } from "react-icons/tb";
import { HiMenuAlt3, HiX } from "react-icons/hi";
import { IoIosMenu } from "react-icons/io";
import { LuMenu } from "react-icons/lu";
import { FaEdit, FaSearch } from "react-icons/fa";
import { FaCalendarAlt } from "react-icons/fa";
import { IoNotifications } from "react-icons/io5";
import { RiSave3Line } from "react-icons/ri";
import { IoFolderOutline } from "react-icons/io5";
import { FaRegUser } from "react-icons/fa";


const Navbar = () => {
 // ====== STATE ======
 const [isMenuOpen, setIsMenuOpen] = useState(false);
 const [date, setDate] = useState("");
 const [temp, setTemp] = useState<number | null>(null);
 const [isSearchOpen, setIsSearchOpen] = useState(false);
 const [isVariableOpen, setIsVariableOpen] = useState(false);
 const [isCalendarOpen, setIsCalendarOpen] = useState(false);
 const [city, setCity] = useState<string | null>(null);
 const [unit, setUnit] = useState<"C" | "F">("C");
 const [weatherCondition, setWeatherCondition] = useState<string | null>(null);
 const [mounted, setMounted] = useState(false);
 const [isEditing, setIsEditing] = useState(false);


 // ====== HANDLERS ======
 const toggleSearchWindow = () => setIsSearchOpen((prev) => !prev);
 const toggleVariableWindow = () => setIsVariableOpen((prev) => !prev);
 const toggleCalendarWindow = () => setIsCalendarOpen ((prev) => !prev);
 const toggleEditMode = () => setIsEditing((prev) => !prev);


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
           if (data.current.temperature_2m !== undefined) setTemp(data.current.temperature_2m);
           if (data.current.weather_code !== undefined) {
             const code = data.current.weather_code;
             setWeatherCondition(weatherDescriptions[code] || "Unknown");
           }
         }
       })
       .catch((err) => console.error("Weather fetch error:", err));


     fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
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
         const interval = setInterval(() => fetchWeather(latitude, longitude), 600000);
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


 // ====== RENDER ======
 return (
   <nav className="bg-[#00563B] shadow-xl sticky top-0 z-50">
     <div className="flex justify-between items-center h-16 max-w-full px-4 sm:px-6 lg:px-8 mx-auto">
       {/* ====== Left: Logo, Variable, Weather ===== */}
       <div className="flex items-center gap-3">
         <GiOakLeaf size={45} style={{ color: "#B7C398" }} />
         <div>
           <Link
             href="/"
             className="text-xl font-bold hover:text-green-600 transition-colors flex flex-row"
             style={{ color: "#B7C398" }}
           >
             Blueprint Botanica
           </Link>
           <div className="text-sm font-medium ml-0.5" style={{ color: "#B7C398" }}>
             {date}
           </div>
         </div>


         {/* Variable toggle */}
         <button
           onClick={toggleVariableWindow}
           className="p-3 rounded-xl"
           title="Variable / Zipcode"
           style={{ color: "#B7C398" }}
         >
           <TbHomeEdit size={27} />
         </button>


         {/* Weather info */}
         <div className="flex items-center gap-2 font-medium" style={{ color: "#B7C398" }}>
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
                   unit === "F" ? "translate-x-full" : "translate-x-0"
                 }`}
               ></div>
             </div>
           </div>
    


          
         </div>
       </div>


       {/* ====== Right: Menu Icon & Dropdown ===== */}
       <div className="relative">


           <button
             onClick={toggleEditMode}
             className="ml-10 p-3 rounded-xl text-[#B7C398]"
             title="Edit Mode"
           >
             <FaEdit size={25} />
           </button>


           <button
             onClick={toggleSearchWindow}
             className="p-3 rounded-xl text-[#B7C398]"
             title="Search"
           >
             <FaSearch size={25} />
           </button>


           <button
             onClick={toggleCalendarWindow}
             className="p-3 rounded-xl text-[#B7C398]"
             title="Calendar"
           >
             <FaCalendarAlt size={25} />
           </button>


           <button
             //onClick={toggleSearchWindow}
             className="p-3 rounded-xl text-[#B7C398]"
             title="Notifications"
           >
             <IoNotifications size={25} />
           </button>


           <button
             //onClick={toggleSearchWindow}
             className="p-3 rounded-xl text-[#B7C398]"
             title="Save"
           >
             <RiSave3Line size={25} />
           </button>


           <button
             //onClick={toggleSearchWindow}
             className="p-3 rounded-xl text-[#B7C398]"
             title="Saved Gardens"
           >
             <IoFolderOutline size={25} />
           </button>

          <Link href="/handler/sign-up">
           <button
             //onClick={toggleSearchWindow}
             className="p-3 rounded-xl text-[#B7C398]"
             title="Profile"
           >
             <FaRegUser size={25} />
           </button>
          </Link>

         <button
           onClick={() => setIsMenuOpen(!isMenuOpen)}
           className="p-2 rounded-md hover:bg-[#003326] transition-colors"
           title="Menu"
         >
           {isMenuOpen ? <HiX size={30} style={{ color: "#B7C398" }} /> : <LuMenu size={30} style={{ color: "#B7C398" }} />}


         </button>


         {isMenuOpen && (
           <div className="absolute right-0 mt-2 w-40 bg-[#003326] rounded-xl shadow-lg border border-[#B7C398]/40 overflow-hidden z-50">
             {["Home", "About", "Services", "Contact"].map((page) => (
               <Link
                 key={page}
                 href={`/${page.toLowerCase()}`}
                 onClick={() => setIsMenuOpen(false)}
                 className="block px-4 py-2 text-sm hover:bg-[#004b34] transition-colors"
                 style={{ color: "#B7C398" }}
               >
                 {page}
               </Link>
             ))}
           </div>
         )}
       </div>


       {/* ====== Popups ===== */}
       <SearchWindow isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
       <VariableWindow isOpen={isVariableOpen} onClose={() => setIsVariableOpen(false)} />
       <Calendar isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} />
     </div>
   </nav>
 );
};


export default Navbar;
