// PlantSearch.tsx
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

interface CareGuideSection {
  id: number;
  type: string;
  description: string;
}

interface CareGuide {
  id: number;
  species_id: number;
  common_name: string;
  scientific_name: string[];
  section: CareGuideSection[];
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
  descriptionSource?: string;
  "care-guides"?: string;
  careGuideData?: CareGuide[];
  cycle?: string;
  watering?: string;
  sunlight?: string[];
  hardiness?: {
    min?: string;
    max?: string;
  };
  flowers?: boolean;
  fruits?: boolean;
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
  const [filteredResults, setFilteredResults] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [loadingPlant, setLoadingPlant] = useState(false);
  const [currentPlantId, setCurrentPlantId] = useState<number | null>(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    watering: "",
    hardinessZone: "",
    careLevel: "",
    cycle: "",
    fruits: "",
    flowers: "",
  });

  const getPlantImage = (plant: Plant) => {
    return (
      plant.image_url ||
      plant.default_image?.medium_url ||
      plant.default_image?.thumbnail ||
      plant.default_image?.original_url ||
      "/plant-placeholder.png"
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
      setFilteredResults([]);
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
    const filtered = (json.data || []).filter((plant) => plant.id >= 1 && plant.id <= 3000);

    // Only fetch details if filters are active
    const hasActiveFilters = Object.values(filters).some((f) => f !== "");

    if (hasActiveFilters) {
      // Fetch details for filtering
      const withDetails = await Promise.all(
        filtered.slice(0, 20).map(async (plant) => {
          try {
            const detailResp = await fetch(`/api/perenual?id=${plant.id}`);
            if (!detailResp.ok) return plant;
            const details = await detailResp.json();
            return {
              ...plant,
              hardiness: details.hardiness,
              watering: details.watering,
              care_level: details.care_level,
              cycle: details.cycle,
              fruits: details.fruits,
              flowers: details.flowers,
            };
          } catch {
            return plant;
          }
        })
      );

      setResults(withDetails);
      applyFilters(withDetails);
    } else {
      // No filters active, just show search results
      setResults(filtered);
      setFilteredResults([]);
    }
  } catch (err) {
    console.error("Error fetching plants:", err);
    setResults([]);
    setFilteredResults([]);
  } finally {
    setLoading(false);
  }
};

  const applyFilters = (plantsToFilter: Plant[] = results) => {
    let filtered = plantsToFilter;

    // Watering filter
    if (filters.watering) {
      filtered = filtered.filter((plant) => plant.watering === filters.watering);
    }

    // Hardiness zone filter
    if (filters.hardinessZone) {
      filtered = filtered.filter((plant) => {
        if (!plant.hardiness) return false;
        const zone = parseInt(filters.hardinessZone);
        const minZone = plant.hardiness.min ? parseInt(plant.hardiness.min) : null;
        const maxZone = plant.hardiness.max ? parseInt(plant.hardiness.max) : null;

        if (minZone !== null && maxZone !== null) {
          return zone >= minZone && zone <= maxZone;
        }
        return false;
      });
    }

    // Care level filter
    if (filters.careLevel) {
      filtered = filtered.filter((plant) => plant.care_level === filters.careLevel);
    }

    // Cycle filter
    if (filters.cycle) {
      filtered = filtered.filter((plant) => plant.cycle === filters.cycle);
    }

    // Fruits filter
    if (filters.fruits === "true") {
      filtered = filtered.filter((plant) => plant.fruits === true);
    } else if (filters.fruits === "false") {
      filtered = filtered.filter((plant) => plant.fruits === false);
    }

    // Flowers filter
    if (filters.flowers === "true") {
      filtered = filtered.filter((plant) => plant.flowers === true);
    } else if (filters.flowers === "false") {
      filtered = filtered.filter((plant) => plant.flowers === false);
    }

    setFilteredResults(filtered);
  };

  // Re-apply filters when filter values change
  useEffect(() => {
  const hasActiveFilters = Object.values(filters).some((f) => f !== "");
  
  if (hasActiveFilters && results.length > 0) {
    // Check if results already have details
    const hasDetails = results.some(r => r.hardiness !== undefined || r.watering !== undefined);
    
    if (!hasDetails) {
      // Need to fetch details for filtering
      fetchDetailsForFiltering();
    } else {
      // Already have details, just apply filters
      applyFilters();
    }
  } else {
    // No filters, show all results
    setFilteredResults([]);
  }
}, [filters]);

const fetchDetailsForFiltering = async () => {
  setLoading(true);
  try {
    const withDetails = await Promise.all(
      results.slice(0, 20).map(async (plant) => {
        try {
          const detailResp = await fetch(`/api/perenual?id=${plant.id}`);
          if (!detailResp.ok) return plant;
          const details = await detailResp.json();
          return {
            ...plant,
            hardiness: details.hardiness,
            watering: details.watering,
            care_level: details.care_level,
            cycle: details.cycle,
            fruits: details.fruits,
            flowers: details.flowers,
          };
        } catch {
          return plant;
        }
      })
    );
    
    setResults(withDetails);
    applyFilters(withDetails);
  } catch (err) {
    console.error("Error fetching details:", err);
  } finally {
    setLoading(false);
  }
};

  const fetchWikipediaDescription = async (
    commonName: string,
    scientificName: string | string[]
  ): Promise<string | null> => {
    try {
      const scientificNameStr = Array.isArray(scientificName) ? scientificName[0] : scientificName;
      const searchTerms = [scientificNameStr, commonName].filter(Boolean);

      for (const searchTerm of searchTerms) {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*`;
        const searchResp = await fetch(searchUrl);
        const searchData = await searchResp.json();

        if (!searchData.query?.search?.length) continue;

        const pageTitle = searchData.query.search[0].title;

        const detailsUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=extracts|categories|templates&exintro=true&explaintext=true&format=json&origin=*`;
        const detailsResp = await fetch(detailsUrl);
        const detailsData = await detailsResp.json();

        const pages = detailsData.query?.pages;
        if (!pages) continue;

        const pageId = Object.keys(pages)[0];
        const page = pages[pageId];
        const extract = page?.extract;

        if (!extract) continue;

        const isValid = validatePlantPage(page, extract, scientificNameStr);

        if (isValid) {
          return extract;
        }
      }

      return null;
    } catch (err) {
      console.error("Error fetching Wikipedia description:", err);
      return null;
    }
  };

  const validatePlantPage = (page: any, extract: string, scientificName: string): boolean => {
    const templates = page.templates || [];
    const hasPlantInfobox = templates.some((t: any) => {
      const title = t.title.toLowerCase();
      return (
        title.includes("speciesbox") ||
        title.includes("taxobox") ||
        title.includes("automatic taxobox") ||
        title.includes("plantbox")
      );
    });

    if (hasPlantInfobox) return true;

    const categories = page.categories || [];
    const hasPlantCategory = categories.some((c: any) => {
      const title = c.title.toLowerCase();
      return title.includes("plants") || title.includes("flora") || title.includes("species") || title.includes("botanical");
    });

    if (hasPlantCategory) return true;

    const extractLower = extract.toLowerCase();
    const plantKeywords = [
      "species",
      "plant",
      "flower",
      "genus",
      "family",
      "botanical",
      "cultivar",
      "perennial",
      "annual",
      "flowering",
      "native",
      "grows",
      "cultivation",
    ];

    const keywordCount = plantKeywords.filter((keyword) => extractLower.includes(keyword)).length;

    if (keywordCount >= 2) return true;

    if (scientificName && extractLower.includes(scientificName.toLowerCase())) {
      return true;
    }

    return false;
  };

  const fetchCareGuides = async (careGuidesUrl: string): Promise<CareGuide[] | null> => {
    try {
      const url = new URL(careGuidesUrl);
      const speciesId = url.searchParams.get("species_id");
      const key = url.searchParams.get("key");

      if (!speciesId || !key) return null;

      const resp = await fetch(`/api/perenual?species_id=${speciesId}&care_guides=true`);
      if (!resp.ok) return null;

      const json = await resp.json();
      return json.data || null;
    } catch (err) {
      console.error("Error fetching care guides:", err);
      return null;
    }
  };

  const handleSelectPlant = async (plant: Plant) => {
    if (plant.id === currentPlantId) return;
    setLoadingPlant(true);
    setCurrentPlantId(plant.id);
    try {
      const resp = await fetch(`/api/perenual?id=${plant.id}`);
      if (!resp.ok) throw new Error(`API returned ${resp.status}`);
      const json = await resp.json();

      const plantData = json.data ?? json;

      if (!plantData.description) {
        const commonName = plantData.common_name || "";
        const scientificName = plantData.scientific_name;

        const wikiDescription = await fetchWikipediaDescription(commonName, scientificName);

        if (wikiDescription) {
          plantData.description = wikiDescription;
          plantData.descriptionSource = "Wikipedia";
        }
      }

      if (plantData["care-guides"]) {
        const careGuides = await fetchCareGuides(plantData["care-guides"]);
        if (careGuides) {
          plantData.careGuideData = careGuides;
        }
      }

      setSelectedPlant(plantData);
    } catch (err) {
      console.error("Error fetching plant details:", err);
      setSelectedPlant(plant);
    } finally {
      setLoadingPlant(false);
    }
  };

  const growth: GrowthDetails | undefined = selectedPlant
    ? {
        sunlight: selectedPlant.sunlight ?? selectedPlant.growth?.sunlight ?? selectedPlant.main_species?.growth?.sunlight,

        water: selectedPlant.watering ?? selectedPlant.growth?.water ?? selectedPlant.main_species?.growth?.water,

        hardiness: selectedPlant.hardiness ?? selectedPlant.growth?.hardiness ?? selectedPlant.main_species?.growth?.hardiness,

        temperature: selectedPlant.growth?.temperature ?? selectedPlant.main_species?.growth?.temperature,

        humidity: selectedPlant.growth?.humidity ?? selectedPlant.main_species?.growth?.humidity,
      }
    : undefined;

  const renderValue = (val: any) => {
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "object" && val !== null) {
      return Object.entries(val)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
    }
    return val ?? "—";
  };

  const displayResults = filteredResults.length > 0 || Object.values(filters).some((f) => f !== "") ? filteredResults : results;

  return (
    <div className="flex h-full flex-col p-2 overflow-hidden">
      {/* Search Bar */}
      <div className="flex-none border-b border-[#dce9d8] pb-2">
        <input
          type="text"
          placeholder="Search for a plant..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-[18px] border border-[#dce9d8] bg-white px-4 py-2.5 text-black focus:outline-none focus:ring-2 focus:ring-[#8cc69f]"
        />
      </div>

      {/* Filter Toggle Button */}
      {!selectedPlant && results.length > 0 && (
        <div className="flex-none mt-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-green-700 hover:text-green-900 font-medium"
          >
            {showFilters ? "Hide Filters" : "Show Filters"} ({Object.values(filters).filter((f) => f !== "").length} active)
          </button>
        </div>
      )}

      {/* Filters */}
      {showFilters && !selectedPlant && (
        <div className="mt-2 flex-none space-y-2 rounded-[20px] border border-[#dce9d8] bg-white/75 p-3 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            {/* Watering Filter */}
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Watering</label>
              <select
                value={filters.watering}
                onChange={(e) => setFilters({ ...filters, watering: e.target.value })}
                className="w-full rounded-xl border border-[#dce9d8] bg-white px-2 py-1 text-xs text-black"
              >
                <option value="">All</option>
                <option value="Frequent">Frequent</option>
                <option value="Average">Average</option>
                <option value="Minimum">Minimum</option>
                <option value="None">None</option>
              </select>
            </div>

            {/* Hardiness Zone Filter */}
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Zone</label>
              <select
                value={filters.hardinessZone}
                onChange={(e) => setFilters({ ...filters, hardinessZone: e.target.value })}
                className="w-full rounded-xl border border-[#dce9d8] bg-white px-2 py-1 text-xs text-black"
              >
                <option value="">All</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((zone) => (
                  <option key={zone} value={zone}>
                    Zone {zone}
                  </option>
                ))}
              </select>
            </div>

            {/* Care Level Filter */}
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Care Level</label>
              <select
                value={filters.careLevel}
                onChange={(e) => setFilters({ ...filters, careLevel: e.target.value })}
                className="w-full rounded-xl border border-[#dce9d8] bg-white px-2 py-1 text-xs text-black"
              >
                <option value="">All</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            {/* Cycle Filter */}
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Cycle</label>
              <select
                value={filters.cycle}
                onChange={(e) => setFilters({ ...filters, cycle: e.target.value })}
                className="w-full rounded-xl border border-[#dce9d8] bg-white px-2 py-1 text-xs text-black"
              >
                <option value="">All</option>
                <option value="Perennial">Perennial</option>
                <option value="Annual">Annual</option>
                <option value="Biennial">Biennial</option>
                <option value="Biannual">Biannual</option>
              </select>
            </div>

            {/* Fruits Filter */}
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Fruits</label>
              <select
                value={filters.fruits}
                onChange={(e) => setFilters({ ...filters, fruits: e.target.value })}
                className="w-full rounded-xl border border-[#dce9d8] bg-white px-2 py-1 text-xs text-black"
              >
                <option value="">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Flowers Filter */}
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Flowers</label>
              <select
                value={filters.flowers}
                onChange={(e) => setFilters({ ...filters, flowers: e.target.value })}
                className="w-full rounded-xl border border-[#dce9d8] bg-white px-2 py-1 text-xs text-black"
              >
                <option value="">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {Object.values(filters).some((f) => f !== "") && (
            <button
              onClick={() =>
                setFilters({
                  watering: "",
                  hardinessZone: "",
                  careLevel: "",
                  cycle: "",
                  fruits: "",
                  flowers: "",
                })
              }
              className="text-xs text-red-600 hover:text-red-800 font-medium mt-2"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* RESULTS WINDOW */}
      <div className="mt-2 flex-1 overflow-y-auto rounded-[24px] border border-[#dce9d8] bg-white/92 p-3 shadow-sm">
        {/* ================= LIST VIEW ================= */}
        {!selectedPlant && (
          <>
            {loading && <div className="text-black mb-2">Loading...</div>}

            {!loading && displayResults.length === 0 && results.length > 0 && (
              <div className="text-gray-500 text-sm">No plants match your filters. Try adjusting them.</div>
            )}

            <ul>
              {displayResults.map((plant) => {
                const image = getPlantImage(plant);

                return (
                  <li
                    key={plant.id}
                    onClick={() => handleSelectPlant(plant)}
                    className="flex cursor-pointer items-center gap-3 rounded-[18px] p-2 transition-colors hover:bg-[#f3f8f0]"
                  >
                    {image && <img src={image} alt={plant.common_name ?? "Plant"} className="h-16 w-16 rounded-[16px] object-cover" loading="lazy" />}

                    <div className="flex-1">
                      <p className="font-medium text-black">
                        {plant.common_name || (Array.isArray(plant.scientific_name) ? plant.scientific_name[0] : plant.scientific_name)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {Array.isArray(plant.scientific_name) ? plant.scientific_name.join(", ") : plant.scientific_name}
                      </p>
                      {plant.hardiness?.min && plant.hardiness?.max && (
                        <p className="text-xs text-green-600 font-semibold">
                          Zone {plant.hardiness.min}
                          {plant.hardiness.max !== plant.hardiness.min ? `-${plant.hardiness.max}` : ""}
                        </p>
                      )}
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
            <button onClick={() => setSelectedPlant(null)} className="mb-3 rounded-full border border-[#dce9d8] px-3 py-1.5 transition-colors hover:bg-[#f3f8f0]">
              Back
            </button>

            {loadingPlant && <p className="mb-2">Loading plant details...</p>}

            {!loadingPlant && selectedPlant && (
              <>
                {getPlantImage(selectedPlant) && (
                  <img
                    src={getPlantImage(selectedPlant)!}
                    alt={
                      selectedPlant.common_name || (Array.isArray(selectedPlant.scientific_name) ? selectedPlant.scientific_name[0] : selectedPlant.scientific_name)
                    }
                    className="mb-4 h-48 w-47 rounded-[20px] object-cover"
                  />
                )}

                <h2 className="text-xl font-bold mb-1">
                  {selectedPlant.common_name || (Array.isArray(selectedPlant.scientific_name) ? selectedPlant.scientific_name[0] : selectedPlant.scientific_name)}
                </h2>

                <p className="text-gray-600 mb-2">
                  Scientific: {Array.isArray(selectedPlant.scientific_name) ? selectedPlant.scientific_name.join(", ") : selectedPlant.scientific_name}
                </p>

                {/* DESCRIPTION */}
                {selectedPlant.description && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-700">{selectedPlant.description}</p>
                    {selectedPlant.descriptionSource === "Wikipedia" && <p className="text-xs text-gray-500 mt-1 italic">Source: Wikipedia</p>}
                  </div>
                )}

                {/* CARE GUIDES */}
                {selectedPlant.careGuideData && selectedPlant.careGuideData.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">Care Guide</h3>
                    {selectedPlant.careGuideData.map((guide) => (
                      <div key={guide.id} className="mb-3">
                        {guide.section &&
                          guide.section.map((section) => (
                            <div key={section.id} className="mb-2">
                              <h4 className="font-medium text-sm capitalize mb-1">{section.type.replace(/_/g, " ")}</h4>
                              <p className="text-sm text-gray-700">{section.description}</p>
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* DETAILS GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-800">
                  {detailFields.map(({ label, key }) => {
                    const value = (selectedPlant as any)[key];
                    if (value == null) return null;

                    return (
                      <div key={key}>
                        <strong>{label}:</strong> {formatValue(value)}
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
  );
}
