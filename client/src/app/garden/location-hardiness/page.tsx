"use client";

import { useState } from "react";
import Link from "next/link";

interface ZoneInfo {
    temperature: string;
    tips: string;
}

export default function HomePage() {
  const [zip, setZip] = useState("");
  const [zone, setZone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
 
  const zoneTable: Record<string, ZoneInfo> = {
    "1a": { temperature: "-60 to -55 F", tips: "plant native perennials & hardy, cold-adapted plants"},
    "1b": { temperature: "-55 to -50 F", tips: "plant native perennials & hardy, cold-adapted plants"},
    "2a": { temperature: "-50 to -45 F", tips: "plant native perennials & hardy, cold-adapted plants"},
    "2b": { temperature: "-45 to -40 F", tips: "plant native perennials & hardy, cold-adapted plants"},
    "3a": { temperature: "-40 to -35 F", tips: "plant hardy perennials, shrubs, and veggies in May to harvest by September"},
    "3b": { temperature: "-35 to -30 F", tips: "plant hardy perennials, shrubs, and veggies in May to harvest by September"},
    "4a": { temperature: "-30 to -25 F", tips: "plant hardy perennials, shrubs, and veggies in May to harvest by September"},
    "4b": { temperature: "-25 to -20 F", tips: "plant hardy perennials, shrubs, and veggies in May to harvest by September"},
    "5a": { temperature: "-20 to -15 F", tips: "best time to plant is April, harvest in October"},
    "5b": { temperature: "-15 to -10 F", tips: "best time to plant is April, harvest in October"},
    "6a": { temperature: "-10 to -5 F", tips: "best time to plant is March/April, harvest in October"},
    "6b": { temperature: "-5 to 0 F", tips: "best time to plant is March/April, harvest in October"},
    "7a": { temperature: "0 to 5 F", tips: "Good conditions 😊, frosts October - April"},
    "7b": { temperature: "5 to 10 F", tips: "Good conditions 😊, frosts October - April"},
    "8a": { temperature: "10 to 15 F", tips: "Good conditions 😊"},
    "8b": { temperature: "15 to 20 F", tips: "Good conditions 😊"},
    "9a": { temperature: "20 to 25 F", tips: "Good conditions, risk of drought"},
    "9b": { temperature: "25 to 30 F", tips: "Good conditions, risk of drought"},
    "10a": { temperature: "30 to 35 F", tips: "Warm climate, grow plants that thrive in heat"},
    "10b": { temperature: "35 to 40 F", tips: "Warm climate, grow plants that thrive in heat"},
    "11a": { temperature: "40 to 45 F", tips: "Tropical climate with dry periods, pay attention to water needs"},
    "11b": { temperature: "45 to 50 F", tips: "Tropical climate with dry periods, pay attention to water needs"},
    "12a": { temperature: "50 to 55 F", tips: "i give up on writing tips its very late"},
    "12b": { temperature: "55 to 60 F", tips: "i give up on writing tips its very late"},
    "13a": { temperature: "60 to 65 F", tips: "i give up on writing tips its very late"},
    "13b": { temperature: "65 to 70 F", tips: "i give up on writing tips its very late"}
};

  const handleSubmit = async () => {
    setError(null);
    setZone(null);

    // Validate ZIP code: exactly 5 digits
    if (!/^\d{5}$/.test(zip)) {
      setError("Please enter a valid 5-digit ZIP code.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/zipcode/${zip}`);
      const data = await response.json();

      if (data.zone) {
        setZone(data.zone);
      } else {
        setError("Zone not found for this ZIP code.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch zone. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const zoneInfo = zone ? zoneTable[zone] : null;

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-black text-white">
      <h1 className="text-2xl font-bold mb-6">Plant Hardiness ZIP Code Search (Garden 1)</h1>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder="Enter 5-digit ZIP code"
          className="bg-black text-white border border-gray-500 rounded px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-white text-black px-4 py-2 rounded transition hover:bg-gray-500 hover:text-white disabled:opacity-50"
        >
          {loading ? "Loading..." : "Submit"}
        </button>
      </div>

      {error && <p className="text-red-500 mb-2">{error}</p>}

      {zone && zoneInfo && (
        <div className="text-lg text-gray-300">
            <p>Zone: {zone}</p>
            <p>Temperature: {zoneInfo.temperature}</p>
            <p>Tips: {zoneInfo.tips}</p>
        </div>
      )}
      <div>
        <Link href={`/garden/grid-1`} className="w-full text-center">
          <button className="bg-white text-black px-4 py-2 rounded transition hover:bg-gray-500 hover:text-white disabled:opacity-50"> 
            Go to Garden 1 
          </button>
        </Link>
      </div>
    </main>
  );
}
