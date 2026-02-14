"use client";
import { useState, useEffect, useRef } from "react";

interface GrowthDetails {
  sunlight?: string | string[];
  soil?: string;
  water?: string;
  watering?: string;
  temperature?: string;
  humidity?: string;
  hardiness?: {
    min?: number;
    max?: number;
  };
}


interface Plant {
  id: number;
  common_name: string | null;
  scientific_name: string | string[];
  image_url?: string;
  default_image?: {
    thumbnail?: string;
    medium_url?: string;
    original_url?: string;
  };
  description?: string;
  cycle?: string;
  watering?: string;
  sunlight?: string[];
  hardiness?: {
    min?: number;
    max?: number;
  };
  flowers?: string;
  fruits?: string;
  leaf?: boolean;
  growth_rate?: string;
  maintenance?: string;
  poisonous_to_humans?: boolean;
  poisonous_to_pets?: boolean;
  salt_tolerant?: boolean;
  thorny?: boolean;
  invasive?: boolean;
  care_level?: string;
  growth?: GrowthDetails;
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

  const getPlantImage = (plant: Plant) => {
  return (
    plant.image_url ||
    plant.default_image?.medium_url ||
    plant.default_image?.thumbnail ||
    plant.default_image?.original_url ||
    "/plant-placeholder.png" // optional
  );
  };
  
  const formatValue = (value: any) => {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object" && value !== null) {
    if ("min" in value || "max" in value) {
      return `${value.min ?? "?"} - ${value.max ?? "?"}`;
    }
    return Object.values(value).join(", ");
  }
  return value ?? "—";
};

  const detailFields = [
  { label: "Cycle", key: "cycle" },
  { label: "Watering", key: "watering" },
  { label: "Hardiness Zone", key: "hardiness" },
  { label: "Flowers", key: "flowers" },
  { label: "Sun", key: "sunlight" },
  { label: "Fruits", key: "fruits" },
  { label: "Leaf", key: "leaf" },
  { label: "Growth Rate", key: "growth_rate" },
  { label: "Maintenance", key: "maintenance" },
  { label: "Poisonous To Humans", key: "poisonous_to_humans" },
  { label: "Poisonous To Pets", key: "poisonous_to_pets" },
  { label: "Salt Tolerant", key: "salt_tolerant" },
  { label: "Thorny", key: "thorny" },
  { label: "Invasive", key: "invasive" },
  { label: "Care Level", key: "care_level" },
];


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
      const resp = await fetch(`/api/perenual?q=${encodeURIComponent(q)}`);
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
    if (plant.id === currentPlantId) return;
    setLoadingPlant(true); // start loading
    setCurrentPlantId(plant.id);
    try {
      const resp = await fetch(`/api/perenual?id=${plant.id}`);
      if (!resp.ok) throw new Error(`API returned ${resp.status}`);
      const json = await resp.json();
      console.log("DETAIL RESPONSE:", json);
      setSelectedPlant(json.data ?? json);
    } catch (err) {
      console.error("Error fetching plant details:", err);
      setSelectedPlant(plant); // fallback
    } finally {
      setLoadingPlant(false); // stop loading
    }
  };

  const growth: GrowthDetails | undefined = selectedPlant
  ? {
      sunlight:
        selectedPlant.sunlight ??
        selectedPlant.growth?.sunlight ??
        selectedPlant.main_species?.growth?.sunlight,

      water:
        selectedPlant.watering ??
        selectedPlant.growth?.water ??
        selectedPlant.main_species?.growth?.water,

      hardiness:
        selectedPlant.hardiness ??
        selectedPlant.growth?.hardiness ??
        selectedPlant.main_species?.growth?.hardiness,

      temperature:
        selectedPlant.growth?.temperature ??
        selectedPlant.main_species?.growth?.temperature,

      humidity:
        selectedPlant.growth?.humidity ??
        selectedPlant.main_species?.growth?.humidity,
    }
  : undefined;


  // Helper to render growth values safely
  const renderValue = (val: any) => {
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "object" && val !== null) {
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }
  return val ?? "—";
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

    {/* RESULTS WINDOW */}
    <div className="flex-1 overflow-y-auto mt-2 border rounded p-2 bg-white">

      {/* ================= LIST VIEW ================= */}
      {!selectedPlant && (
        <>
          {loading && <div className="text-black mb-2">Loading...</div>}

          <ul>
            {results.map((plant) => {
              const image = getPlantImage(plant);

              return (
                <li
                  key={plant.id}
                  onClick={() => handleSelectPlant(plant)}
                  className="flex gap-3 items-center cursor-pointer hover:bg-gray-100 p-2 rounded"
                >
                  {image && (
                    <img
                      src={image}
                      alt={plant.common_name ?? "Plant"}
                      className="w-16 h-16 object-cover rounded"
                      loading="lazy"
                    />
                  )}

                  <div>
                    <p className="font-medium text-black">
                      {plant.common_name ||
                        (Array.isArray(plant.scientific_name)
                          ? plant.scientific_name[0]
                          : plant.scientific_name)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {Array.isArray(plant.scientific_name)
                        ? plant.scientific_name.join(", ")
                        : plant.scientific_name}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* ================= DETAIL VIEW ================= */}
      {(selectedPlant || loadingPlant) && (
        <div className="text-black animate-fadeIn">
          <button
            onClick={() => setSelectedPlant(null)}
            className="mb-3 border rounded px-2 py-1 hover:bg-gray-200"
          >
            Back
          </button>

          {loadingPlant && (
            <p className="mb-2">Loading plant details...</p>
          )}

          {!loadingPlant && selectedPlant && (
            <>
              {getPlantImage(selectedPlant) && (
                <img
                  src={getPlantImage(selectedPlant)!}
                  alt={
                    selectedPlant.common_name ||
                    (Array.isArray(selectedPlant.scientific_name)
                      ? selectedPlant.scientific_name[0]
                      : selectedPlant.scientific_name)
                  }
                  className="w-47 h-48 object-cover rounded mb-4"
                />
              )}

              <h2 className="text-xl font-bold mb-1">
                {selectedPlant.common_name ||
                  (Array.isArray(selectedPlant.scientific_name)
                    ? selectedPlant.scientific_name[0]
                    : selectedPlant.scientific_name)}
              </h2>

              <p className="text-gray-600 mb-2">
                Scientific:{" "}
                {Array.isArray(selectedPlant.scientific_name)
                  ? selectedPlant.scientific_name.join(", ")
                  : selectedPlant.scientific_name}
              </p>

              {/* DESCRIPTION */}
              {selectedPlant.description && (
                <p className="text-sm text-gray-700 mb-4">
                  {selectedPlant.description}
                </p>
              )}

              {/* DETAILS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-800">
                {detailFields.map(({ label, key }) => {
                  const value = (selectedPlant as any)[key];
                  if (value == null) return null;

                  return (
                    <div key={key}>
                      <strong>{label}:</strong>{" "}
                      {formatValue(value)}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  </div>
)}
