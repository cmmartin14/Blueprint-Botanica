"use client";
import { useState, useEffect, useRef } from "react";
import { TbCircleXFilled } from "react-icons/tb";
import { PlantEntry, useGardenStore } from "../types/garden";

interface SearchResult {
  id: number;
  common_name: string | null;
  scientific_name: string | string[];
  image_url?: string;
  default_image?: { thumbnail?: string; medium_url?: string };
}

interface FlowerBedPanelProps {
  shapeId: string;
  onClose: () => void;
}

export default function FlowerBedPanel({ shapeId, onClose }: FlowerBedPanelProps) {
  const bedPlants = useGardenStore((s) => s.bedPlants[shapeId]) ?? [];
  const addPlantToBed = useGardenStore((s) => s.addPlantToBed);
  const removePlantFromBed = useGardenStore((s) => s.removePlantFromBed);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!query) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const fetchResults = async (q: string) => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/perenual?q=${encodeURIComponent(q)}`);
      if (!resp.ok) throw new Error();
      const json = await resp.json();
      const filtered = (json.data || []).filter((p: SearchResult) => p.id >= 1 && p.id <= 3000);
      setResults(filtered.slice(0, 8));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const getImage = (p: SearchResult) =>
    p.image_url || p.default_image?.medium_url || p.default_image?.thumbnail;

  const handleAdd = (p: SearchResult) => {
    const entry: PlantEntry = {
      id: p.id,
      common_name: p.common_name,
      scientific_name: p.scientific_name,
      image_url: getImage(p),
    };
    addPlantToBed(shapeId, entry);
    setQuery("");
    setResults([]);
  };

  return (
    <div
      className="absolute right-5 top-16 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col"
      style={{ width: 340, maxHeight: "70vh" }}
      data-interactive="true"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="font-semibold text-green-800 text-sm">Flower Bed Plants</h2>
        <button onClick={onClose} className="text-green-800 hover:opacity-70">
          <TbCircleXFilled size={22} />
        </button>
      </div>

      {/* Plant table */}
      <div className="overflow-y-auto flex-1 px-4 py-2">
        {bedPlants.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">No plants added yet. Search below to add one.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                <th className="pb-1 font-medium">Plant</th>
                <th className="pb-1 font-medium">Scientific</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {bedPlants.map((plant) => (
                <tr key={plant.id} className="border-b last:border-0">
                  <td className="py-1.5 flex items-center gap-2">
                    {plant.image_url && (
                      <img src={plant.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                    )}
                    <span className="font-medium text-gray-800 leading-tight">
                      {plant.common_name ?? "—"}
                    </span>
                  </td>
                  <td className="py-1.5 text-gray-500 text-xs pr-2">
                    {Array.isArray(plant.scientific_name)
                      ? plant.scientific_name[0]
                      : plant.scientific_name}
                  </td>
                  <td className="py-1.5">
                    <button
                      onClick={() => removePlantFromBed(shapeId, plant.id)}
                      className="text-red-400 hover:text-red-600 text-xs font-bold"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Search to add */}
      <div className="border-t px-4 py-3">
        <input
          type="text"
          placeholder="Search plants to add..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-600 text-black"
        />
        {loading && <p className="text-xs text-gray-400 mt-1">Searching...</p>}
        {results.length > 0 && (
          <ul className="mt-1 border rounded-md bg-white shadow-md max-h-48 overflow-y-auto">
            {results.map((p) => {
              const alreadyAdded = bedPlants.some((b) => b.id === p.id);
              return (
                <li
                  key={p.id}
                  onClick={() => !alreadyAdded && handleAdd(p)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm ${
                    alreadyAdded
                      ? "opacity-40 cursor-default"
                      : "cursor-pointer hover:bg-gray-100"
                  }`}
                >
                  {getImage(p) && (
                    <img src={getImage(p)} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-gray-800 leading-tight">
                      {p.common_name ?? (Array.isArray(p.scientific_name) ? p.scientific_name[0] : p.scientific_name)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {Array.isArray(p.scientific_name) ? p.scientific_name[0] : p.scientific_name}
                    </p>
                  </div>
                  {alreadyAdded && <span className="ml-auto text-xs text-green-600">Added</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
