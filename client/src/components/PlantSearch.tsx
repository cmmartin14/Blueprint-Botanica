"use client";
import { useState, useEffect, useRef } from "react";

interface GrowthDetails {
  sunlight?: string;
  soil?: string;
  water?: string;
  temperature?: string;
  humidity?: string;
  hardiness?: string;
}

interface Plant {
  id: number;
  common_name: string | null;
  scientific_name: string;
  image_url?: string;
  growth?: GrowthDetails; // Trefle API growth info
  main_species?: {
    growth?: GrowthDetails;
  };
}

interface ApiResponse {
  data: Plant[];
}

export default function PlantSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [loadingPlant, setLoadingPlant] = useState(false);
  const [currentPlantId, setCurrentPlantId] = useState<number | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchResults(query);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const fetchResults = async (q: string) => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/trefle?q=${encodeURIComponent(q)}`);
      if (!resp.ok) throw new Error(`API returned ${resp.status}`);
      const json: ApiResponse = await resp.json();
      setResults(json.data || []);
    } catch (err) {
      console.error("Error fetching plants:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch details when a plant is selected
  const handleSelectPlant = async (plant: Plant) => {
    setLoadingPlant(true); // start loading
    setCurrentPlantId(plant.id);
    try {
      const resp = await fetch(`/api/trefle?id=${plant.id}`);
      if (!resp.ok) throw new Error(`API returned ${resp.status}`);
      const json = await resp.json();
      setSelectedPlant(json.data); // includes growth info
    } catch (err) {
      console.error("Error fetching plant details:", err);
      setSelectedPlant(plant); // fallback
    } finally {
      setLoadingPlant(false); // stop loading
    }
  };

  // Determine growth info, handling possible nesting
  const growth = selectedPlant?.growth || selectedPlant?.main_species?.growth;

  // Helper to render growth values safely
  const renderValue = (val: any) => {
    if (typeof val === "object" && val !== null) {
      return Object.entries(val)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
    }
    return val;
  };

  return (
    <div className="flex flex-col p-2 h-full overflow-hidden">
      {/* Search Bar */}
      <div className="flex-none border-b">
        <input
          type="text"
          placeholder="Search for a plant..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border border-black text-black rounded-md px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-black"
        />
      </div>

      {/* RESULTS WINDOW (list OR details) */}
      <div className="flex-1 overflow-y-auto mt-2 border rounded p-2 relative bg-white">

        {/* LIST VIEW */}
        {!selectedPlant && (
          <>
            {loading && <div className="text-black mb-2">Loading...</div>}

            <ul id="list">
              {results.map((plant) => (
                <li
                  key={plant.id}
                  onClick={() => handleSelectPlant(plant)}
                  className="flex items-center gap-3 border-b border-gray-100 pb-2 text-black cursor-pointer hover:bg-gray-100 p-2 rounded"
                >
                  {plant.image_url && (
                    <img
                      src={plant.image_url}
                      alt={plant.common_name || plant.scientific_name}
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                  <div className="text-left">
                    <strong>{plant.common_name || plant.scientific_name}</strong>
                    <br />
                    <small className="text-gray-600">
                      {plant.scientific_name}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* DETAIL VIEW */}
        {selectedPlant || loadingPlant? (
          <div className="text-black animate-fadeIn">
            <button
              onClick={() => setSelectedPlant(null)}
              className="mb-3 text-black border rounded px-2 py-1 hover:bg-gray-200"
            >
              Back
            </button>

            {/* Loading text while fetching details */}
            {loadingPlant && <p className="text-black mb-2">Loading plant details...</p>}

            {!loadingPlant && selectedPlant && (
              <>
            {selectedPlant.image_url && (
              <img
                src={selectedPlant.image_url}
                alt={selectedPlant.common_name || selectedPlant.scientific_name}
                className="w-47 h-48 object-cover rounded mb-4"
              />
            )}

            <h2 className="text-xl font-bold mb-1">
              {selectedPlant.common_name || selectedPlant.scientific_name}
            </h2>

            <p className="text-gray-600 mb-2">
              Scientific: {selectedPlant.scientific_name}
            </p>

            {/* GROWING DETAILS */}
            <div className="text-sm text-gray-700 space-y-1">
              {growth ? (
                Object.entries(growth).map(([key, value]) =>
                  value ? (
                    <p key={key}>
                      <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong>{" "}
                      {renderValue(value)}
                    </p>
                  ) : null
                )
              ) : (
                <p>No growing details available.</p>
              )}
            </div>
            </>
            )}
          </div>
        ) : null}

      </div>
    </div>
  );
}
