"use client";


import { useEffect, useState } from "react";
import Link from "next/link";
import SearchWindow from "./Searchwindow";
import VariableWindow from "./VariableWindow";
import { GiOakLeaf } from "react-icons/gi";
import { TbHomeEdit } from "react-icons/tb";


const Navbar = () => {
 // ====== STATE ======
 const [isMenuOpen, setIsMenuOpen] = useState(false);
 const [date, setDate] = useState("");
 const [temp, setTemp] = useState<number | null>(null);
 const [isSearchOpen, setIsSearchOpen] = useState(false);
 const [isVariableOpen, setIsVariableOpen] = useState(false);
 const [city, setCity] = useState<string | null>(null);
 const [unit, setUnit] = useState<"C" | "F">("C");
 const [weatherCondition, setWeatherCondition] = useState<string | null>(null);
 const [mounted, setMounted] = useState(false);


 // ====== HANDLERS ======
 const toggleSearchWindow = () => setIsSearchOpen((prev) => !prev);
 const toggleVariableWindow = () => setIsVariableOpen((prev) => !prev);


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


 // ====== WEATHER DESCRIPTION + ICONS ======
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


 // ====== EFFECT 1: MOUNT FLAG ======
 useEffect(() => {
   setMounted(true);
 }, []);


 // ====== EFFECT 2: DATE ======
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


 // ====== EFFECT 3: WEATHER FETCH ======
 useEffect(() => {
   if (!mounted) return;


   const fetchWeather = (latitude: number, longitude: number) => {
     // Fetch from Open-Meteo
     fetch(
       `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
     )
       .then((res) => res.json())
       .then((data) => {
         if (data.current) {
           if (data.current.temperature_2m !== undefined) {
             setTemp(data.current.temperature_2m);
           }
           if (data.current.weather_code !== undefined) {
             const code = data.current.weather_code;
             setWeatherCondition(weatherDescriptions[code] || "Unknown");
           }
         }
       })
       .catch((err) => console.error("Weather fetch error:", err));


     // Reverse geocoding for city/state
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
       (error) => {
         console.error("Geolocation error:", error);
         fetchWeather(30.27, -97.74); // fallback Austin, TX
       }
     );
   } else {
     console.error("Geolocation not supported by this browser.");
   }
 }, [mounted]);


 // ====== RENDER ======
 if (!mounted) {
   // Render a lightweight placeholder (avoids SSR hydration mismatch)
   return (
     <nav className="bg-[#00563B] shadow-xl sticky top-0 z-50 h-16 flex items-center justify-center">
       <span className="text-[#B7C398] text-sm">Loading...</span>
     </nav>
   );
 }


 return (
   <nav className="bg-[#00563B] shadow-xl sticky top-0 z-50">
     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ml-0">
       <div className="flex justify-between items-center h-16">
         {/* ====== Logo & Title ====== */}
         <div className="flex-shrink-0 flex flex-row">
           <GiOakLeaf size={45} className="mr-2" style={{ color: "#B7C398" }} />
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


           {/* ====== Variable Window Toggle ====== */}
           <div className="flex flex-column ml-1.5 text-xs font-xs">
             <button
               onClick={toggleVariableWindow}
               className="p-3 rounded-xl"
               title="Variable / Zipcode"
               style={{ color: "#B7C398" }}
             >
               <TbHomeEdit size={27} />
             </button>
           </div>


           {/* ====== Weather Info ====== */}
           <div
             className="flex items-center gap-2 font-medium"
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

                {/* ====== Temperature Toggle Switch (below temp) ====== */}
                <div className="relative w-8 h-2 rounded-full bg-[#DDE4C1] shadow-inner overflow-hidden border border-[#B7C398]/60">
                  <div
                    onClick={() => setUnit(unit === "C" ? "F" : "C")}
                    className={`absolute top-0 left-0 h-full w-1/2 bg-[#003326] rounded-full shadow-md transform transition-transform duration-300 ease-in-out cursor-pointer ${
                      unit === "F" ? "translate-x-full" : "translate-x-0"
                    }`}
                    style={{ zIndex: 1 }}
                  ></div>
                </div>
              </div>           
           </div>
         </div>


         {/* ====== Popups ====== */}
         <SearchWindow
           isOpen={isSearchOpen}
           onClose={() => setIsSearchOpen(false)}
         />
         <VariableWindow
           isOpen={isVariableOpen}
           onClose={() => setIsVariableOpen(false)}
         />


         {/* ====== Desktop Links ====== */}
         <div className="hidden md:block">
           <div className="ml-10 flex items-baseline space-x-4">
             {["Home", "About", "Services", "Contact"].map((page) => (
               <Link
                 key={page}
                 href={`/${page.toLowerCase()}`}
                 className="text-green-900 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                 style={{ color: "#B7C398" }}
               >
                 {page}
               </Link>
             ))}
           </div>
         </div>


         {/* ====== Mobile Menu Button ====== */}
         <div className="md:hidden">
           <button
             onClick={() => setIsMenuOpen(!isMenuOpen)}
             className="text-green-900 hover:text-green-600 inline-flex items-center justify-center p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-900"
           >
             <span className="sr-only">Open main menu</span>
             <svg
               className={`${isMenuOpen ? "hidden" : "block"} h-6 w-6`}
               xmlns="http://www.w3.org/2000/svg"
               fill="none"
               viewBox="0 0 24 24"
               stroke="currentColor"
             >
               <path
                 strokeLinecap="round"
                 strokeLinejoin="round"
                 strokeWidth={2}
                 d="M4 6h16M4 12h16M4 18h16"
               />
             </svg>
             <svg
               className={`${isMenuOpen ? "block" : "hidden"} h-6 w-6`}
               xmlns="http://www.w3.org/2000/svg"
               fill="none"
               viewBox="0 0 24 24"
               stroke="currentColor"
             >
               <path
                 strokeLinecap="round"
                 strokeLinejoin="round"
                 strokeWidth={2}
                 d="M6 18L18 6M6 6l12 12"
               />
             </svg>
           </button>
         </div>
       </div>
     </div>


     {/* ====== Mobile Links ====== */}
     <div className={`${isMenuOpen ? "block" : "hidden"} md:hidden`}>
       <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-[#F4F0E0]">
         {["Home", "About", "Services", "Contact"].map((page) => (
           <Link
             key={page}
             href={`/${page.toLowerCase()}`}
             className="text-green-900 hover:text-green-600 block px-3 py-2 rounded-md text-base font-medium transition-colors"
             onClick={() => setIsMenuOpen(false)}
           >
             {page}
           </Link>
         ))}
       </div>
     </div>
   </nav>
 );
};


export default Navbar;





