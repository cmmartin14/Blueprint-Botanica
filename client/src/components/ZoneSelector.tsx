"use client";
import { useState, useEffect } from "react";

interface ZoneInfo {
  zone: string;
  temp_min: number;
  temp_max: number;
  tips: string;
}

type ZoneSelectorProps = {
  onZoneSelected?: (zone: string | null) => void;
};

const ZoneSelector = ({ onZoneSelected }: ZoneSelectorProps) => {
  const [zip, setZip] = useState("");
  const [zone, setZone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualZone, setManualZone] = useState<string | "">("");
  const [zones, setZones] = useState<ZoneInfo[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await fetch("/api/zones");
        if (!res.ok) throw new Error("Failed to fetch zones");
        const data = await res.json();
        setZones(data);
      } catch (err) {
        setError("Failed to load zones from server.");
      } finally {
        setZonesLoading(false);
      }
    };

    fetchZones();
  }, []);

  const handleZoneUpdate = (newZone: string | null) => {
    setZone(newZone);
    onZoneSelected?.(newZone);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!/^\d{5}$/.test(zip)) {
      setError("Please enter a valid 5-digit ZIP code.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/zipcode/${zip}`);
      const data = await response.json();

      if (data.zone) {
        handleZoneUpdate(data.zone);
      } else {
        setError("Zone not found for this ZIP code.");
      }
    } catch {
      setError("Failed to fetch zone. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const zoneInfo = zone ? zones.find((z) => z.zone === zone) : null;

  return (
    <>
      {/* ZIP Input */}
      <div className="flex gap-2 mb-4 justify-center">
        <input
          type="text"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder="Enter 5-digit ZIP code"
          className="bg-white text-black border border-gray-500 rounded px-3 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-white text-black px-4 py-2 rounded transition hover:bg-gray-500 hover:text-white disabled:opacity-50"
        >
          {loading ? "Loading" : "Submit"}
        </button>
      </div>

      {error && <p className="flex justify-center text-red-500 mb-2">{error}</p>}

      {/* Manual Zone Selector */}
      <div className="flex justify-center">
        {zonesLoading ? (
          <p className="text-gray-500">Loading zones...</p>
        ) : (
          <select
            value={manualZone}
            onChange={(e) => {
              setManualZone(e.target.value);
              handleZoneUpdate(e.target.value);
            }}
            className="bg-white text-black border border-gray-500 rounded px-3 py-2 mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Zone Manually</option>
            {zones.map((z) => (
              <option key={z.zone} value={z.zone}>
                {z.zone}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Zone Info Display */}
      {zone && zoneInfo && (
        <div className="flex flex-col items-center justify-center text-lg text-green-900 mt-4">
          <p>Zone: {zoneInfo.zone}</p>
          <p>Temperature: {zoneInfo.temp_min}°F to {zoneInfo.temp_max}°F</p>
          <p className="text-sm text-gray-600 mt-1 text-center px-3">
            {zoneInfo.tips}
          </p>
        </div>
      )}
    </>
  );
};

export default ZoneSelector;
