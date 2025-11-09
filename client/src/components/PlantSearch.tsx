"use client";
import { useState, useEffect, useRef } from "react";
import Image from 'next/image';

interface Plant {
  id: number;
  common_name: string | null;
  scientific_name: string;
  image_url?: string;
}

interface ApiResponse {
  data: Plant[];
}

export default function PlantSearch() {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<Plant[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
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

  return ( //inner list
    <div className="flex flex-col p-2 h-full overflow-hidden"> 
      <div className="flex-none border-b">
        <input
          type="text"
          placeholder="Search for a plant..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border border-black text-black rounded-md px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-black"
        />
      </div>

      <div className="flex-1 overflow-y-auto mt-2">
        {loading && <div className="text-black mb-2">Loading...</div>}

        <ul>
          {results.map((plant) => (
            <li
              key={plant.id}
              className="flex items-center gap-3 border-b border-gray-100 pb-2 text-black"
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
                <small className="text-gray-600">{plant.scientific_name}</small>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
