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
  hardiness?: { min?: number; max?: number };
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
  default_image?: { thumbnail?: string; medium_url?: string; original_url?: string };
  description?: string;
  descriptionSource?: string;
  "care-guides"?: string;
  careGuideData?: CareGuide[];
  cycle?: string;
  watering?: string;
  sunlight?: string[];
  hardiness?: { min?: string; max?: string };
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
  main_species?: { growth?: GrowthDetails };
}

interface ApiResponse {
  data: Plant[];
}

const emptyFilters = {
  watering: "",
  hardinessZone: "",
  careLevel: "",
  cycle: "",
  fruits: "",
  flowers: "",
};

export default function PlantSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Plant[]>([]);
  const [filteredResults, setFilteredResults] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [loadingPlant, setLoadingPlant] = useState(false);
  const [currentPlantId, setCurrentPlantId] = useState<number | null>(null);
  const [useMock, setUseMock] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const wikiImageCacheRef = useRef<Map<string, string | null>>(new Map());

  const hasActiveFilters = Object.values(filters).some((f) => f !== "");

  const apiUrl = (params: Record<string, string>) => {
    const qs = new URLSearchParams(params);
    if (useMock) qs.set("mock", "true");
    return `/api/perenual?${qs}`;
  };

  // ── Switch modes ───────────────────────────────────────────────────────────
  useEffect(() => {
    setSelectedPlant(null);
    setCurrentPlantId(null);
    setQuery("");
    setFilters(emptyFilters);

    if (useMock) {
      loadAllMockPlants();
    } else {
      setResults([]);
      setFilteredResults([]);
    }
  }, [useMock]);

  // ── Load all mock plants up-front ──────────────────────────────────────────
  const loadAllMockPlants = async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/perenual?mock=true");
      if (!resp.ok) throw new Error();
      const json: ApiResponse = await resp.json();
      const plants = json.data || [];
      setResults(plants);
      setFilteredResults(plants); // show everything immediately

      // Enrich mock data with Wikipedia thumbnails in the background.
      const enrichedPlants = await Promise.all(
        plants.map(async (plant) => {
          const image = await fetchWikipediaImageUrl(plant.common_name || "", plant.scientific_name);
          return image ? { ...plant, image_url: image } : plant;
        })
      );
      setResults(enrichedPlants);
      if (!query && !hasActiveFilters) {
        setFilteredResults(enrichedPlants);
      } else {
        applyFilters(enrichedPlants);
      }
    } catch (err) {
      console.error("Error loading mock plants:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Live-mode debounced search ─────────────────────────────────────────────
  useEffect(() => {
    if (useMock) return;
    if (!query) {
      if (!hasActiveFilters) { setResults([]); setFilteredResults([]); }
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // ── Mock: re-filter whenever query or filters change ──────────────────────
  useEffect(() => {
    if (useMock && results.length > 0) applyFilters(results);
  }, [query, filters]);

  // ── Live: re-filter when filters change ───────────────────────────────────
  useEffect(() => {
    if (useMock) return;
    if (hasActiveFilters && results.length > 0) {
      const hasDetails = results.some((r) => r.hardiness !== undefined || r.watering !== undefined);
      if (!hasDetails) fetchDetailsForFiltering();
      else applyFilters();
    } else {
      setFilteredResults([]);
    }
  }, [filters]);

  const fetchResults = async (q: string) => {
    setLoading(true);
    try {
      const resp = await fetch(apiUrl({ q }));
      if (!resp.ok) throw new Error(`API returned ${resp.status}`);
      const json: ApiResponse = await resp.json();
      const filtered = (json.data || []).filter((p) => p.id >= 1 && p.id <= 3000);

      if (hasActiveFilters) {
        const withDetails = await Promise.all(
          filtered.slice(0, 20).map(async (plant) => {
            try {
              const d = await fetch(apiUrl({ id: String(plant.id) }));
              if (!d.ok) return plant;
              const details = await d.json();
              return { ...plant, hardiness: details.hardiness, watering: details.watering, care_level: details.care_level, cycle: details.cycle, fruits: details.fruits, flowers: details.flowers };
            } catch { return plant; }
          })
        );
        setResults(withDetails);
        applyFilters(withDetails);
      } else {
        setResults(filtered);
        setFilteredResults([]);
      }
    } catch (err) {
      console.error("Error fetching plants:", err);
      setResults([]); setFilteredResults([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (base: Plant[] = results) => {
    let out = base;

    // Text filter (mock only — live uses API search)
    if (useMock && query) {
      const q = query.toLowerCase();
      out = out.filter(
        (p) =>
          p.common_name?.toLowerCase().includes(q) ||
          (Array.isArray(p.scientific_name)
            ? p.scientific_name.some((n) => n.toLowerCase().includes(q))
            : p.scientific_name?.toLowerCase().includes(q))
      );
    }

    if (filters.watering) out = out.filter((p) => p.watering === filters.watering);

    if (filters.hardinessZone) {
      const zone = parseInt(filters.hardinessZone);
      out = out.filter((p) => {
        if (!p.hardiness) return false;
        const min = p.hardiness.min ? parseInt(p.hardiness.min) : null;
        const max = p.hardiness.max ? parseInt(p.hardiness.max) : null;
        return min !== null && max !== null && zone >= min && zone <= max;
      });
    }

    if (filters.careLevel) out = out.filter((p) => p.care_level === filters.careLevel);
    if (filters.cycle) out = out.filter((p) => p.cycle === filters.cycle);
    if (filters.fruits === "true") out = out.filter((p) => p.fruits === true);
    else if (filters.fruits === "false") out = out.filter((p) => p.fruits === false);
    if (filters.flowers === "true") out = out.filter((p) => p.flowers === true);
    else if (filters.flowers === "false") out = out.filter((p) => p.flowers === false);

    setFilteredResults(out);
  };

  const fetchDetailsForFiltering = async () => {
    setLoading(true);
    try {
      const withDetails = await Promise.all(
        results.slice(0, 20).map(async (plant) => {
          try {
            const d = await fetch(apiUrl({ id: String(plant.id) }));
            if (!d.ok) return plant;
            const details = await d.json();
            return { ...plant, hardiness: details.hardiness, watering: details.watering, care_level: details.care_level, cycle: details.cycle, fruits: details.fruits, flowers: details.flowers };
          } catch { return plant; }
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

  const fetchWikipediaDescription = async (commonName: string, scientificName: string | string[]): Promise<string | null> => {
    try {
      const sci = Array.isArray(scientificName) ? scientificName[0] : scientificName;
      for (const term of [sci, commonName].filter(Boolean)) {
        const s = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&format=json&origin=*`);
        const sd = await s.json();
        if (!sd.query?.search?.length) continue;
        const title = sd.query.search[0].title;
        const d = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts|categories|templates&exintro=true&explaintext=true&format=json&origin=*`);
        const dd = await d.json();
        const pages = dd.query?.pages;
        if (!pages) continue;
        const page = pages[Object.keys(pages)[0]];
        const extract = page?.extract;
        if (!extract) continue;
        if (validatePlantPage(page, extract, sci)) return extract;
      }
      return null;
    } catch { return null; }
  };

  const fetchWikipediaImageUrl = async (
    commonName: string,
    scientificName: string | string[]
  ): Promise<string | null> => {
    const sci = Array.isArray(scientificName) ? scientificName[0] : scientificName;
    const terms = [sci, commonName].filter(Boolean).map((term) => term.trim());

    for (const term of terms) {
      const cacheKey = term.toLowerCase();
      if (wikiImageCacheRef.current.has(cacheKey)) {
        const cached = wikiImageCacheRef.current.get(cacheKey);
        if (cached) return cached;
        continue;
      }

      try {
        const resp = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
            term
          )}&prop=pageimages&piprop=thumbnail&pithumbsize=300&format=json&origin=*`
        );
        const data = await resp.json();
        const pages = data?.query?.pages;
        if (!pages) {
          wikiImageCacheRef.current.set(cacheKey, null);
          continue;
        }

        const page = pages[Object.keys(pages)[0]];
        const imageUrl: string | null = page?.thumbnail?.source ?? null;
        wikiImageCacheRef.current.set(cacheKey, imageUrl);
        if (imageUrl) return imageUrl;
      } catch {
        wikiImageCacheRef.current.set(cacheKey, null);
      }
    }

    return null;
  };

  const validatePlantPage = (page: any, extract: string, sci: string): boolean => {
    if ((page.templates || []).some((t: any) => ["speciesbox","taxobox","automatic taxobox","plantbox"].some((k) => t.title.toLowerCase().includes(k)))) return true;
    if ((page.categories || []).some((c: any) => ["plants","flora","species","botanical"].some((k) => c.title.toLowerCase().includes(k)))) return true;
    const lower = extract.toLowerCase();
    if (["species","plant","flower","genus","family","botanical","cultivar","perennial","annual","flowering","native","grows","cultivation"].filter((k) => lower.includes(k)).length >= 2) return true;
    if (sci && lower.includes(sci.toLowerCase())) return true;
    return false;
  };

  const fetchCareGuides = async (url: string): Promise<CareGuide[] | null> => {
    try {
      const u = new URL(url);
      const speciesId = u.searchParams.get("species_id");
      if (!speciesId) return null;
      const resp = await fetch(`/api/perenual?species_id=${speciesId}&care_guides=true`);
      if (!resp.ok) return null;
      return (await resp.json()).data || null;
    } catch { return null; }
  };

  const handleSelectPlant = async (plant: Plant) => {
    if (plant.id === currentPlantId) return;
    setLoadingPlant(true);
    setCurrentPlantId(plant.id);
    try {
      let plantData: Plant = useMock
        ? { ...plant }
        : await (async () => {
            const resp = await fetch(apiUrl({ id: String(plant.id) }));
            if (!resp.ok) throw new Error();
            const json = await resp.json();
            return json.data ?? json;
          })();

      if (!plantData.description) {
        const wiki = await fetchWikipediaDescription(plantData.common_name || "", plantData.scientific_name);
        if (wiki) { plantData.description = wiki; plantData.descriptionSource = "Wikipedia"; }
      }
      if (!plantData.image_url && !plantData.default_image?.medium_url && !plantData.default_image?.thumbnail && !plantData.default_image?.original_url) {
        const wikiImage = await fetchWikipediaImageUrl(plantData.common_name || "", plantData.scientific_name);
        if (wikiImage) {
          plantData.image_url = wikiImage;
        }
      }

      if (!useMock && plantData["care-guides"]) {
        const guides = await fetchCareGuides(plantData["care-guides"]);
        if (guides) plantData.careGuideData = guides;
      }

      setSelectedPlant(plantData);
    } catch {
      setSelectedPlant(plant);
    } finally {
      setLoadingPlant(false);
    }
  };

  const getPlantImage = (plant: Plant) =>
    plant.image_url || plant.default_image?.medium_url || plant.default_image?.thumbnail || plant.default_image?.original_url || "/plant-placeholder.png";

  const formatValue = (value: any) => {
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object" && value !== null) {
      if ("min" in value || "max" in value) return `${value.min ?? "?"} - ${value.max ?? "?"}`;
      return Object.values(value).join(", ");
    }
    return value ?? "—";
  };

  const detailFields = [
    { label: "Cycle", key: "cycle" }, { label: "Watering", key: "watering" },
    { label: "Hardiness Zone", key: "hardiness" }, { label: "Flowers", key: "flowers" },
    { label: "Sun", key: "sunlight" }, { label: "Fruits", key: "fruits" },
    { label: "Leaf", key: "leaf" }, { label: "Growth Rate", key: "growth_rate" },
    { label: "Maintenance", key: "maintenance" }, { label: "Poisonous To Humans", key: "poisonous_to_humans" },
    { label: "Poisonous To Pets", key: "poisonous_to_pets" }, { label: "Salt Tolerant", key: "salt_tolerant" },
    { label: "Thorny", key: "thorny" }, { label: "Invasive", key: "invasive" },
    { label: "Care Level", key: "care_level" },
  ];

  const displayResults = useMock
    ? filteredResults
    : hasActiveFilters ? filteredResults : results;

  const activeFilterCount = Object.values(filters).filter((f) => f !== "").length;

  return (
    <div className="flex min-h-full flex-col p-2">

      {/* Search + toggle */}
      <div className="flex-none border-b border-[#dce9d8] pb-2 space-y-2">
        <input
          type="text"
          placeholder={useMock ? "Filter by name..." : "Search for a plant..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-[18px] border border-[#dce9d8] bg-white px-4 py-2.5 text-black focus:outline-none focus:ring-2 focus:ring-[#8cc69f]"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUseMock(false)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!useMock ? "bg-green-700 text-white" : "bg-white border border-[#dce9d8] text-gray-500 hover:border-green-400"}`}
          >
            Live API
          </button>
          <button
            onClick={() => setUseMock(true)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${useMock ? "bg-amber-500 text-white" : "bg-white border border-[#dce9d8] text-gray-500 hover:border-amber-400"}`}
          >
            Mock data
          </button>
          {useMock && (
            <span className="text-[10px] text-amber-600 italic">
              {loading ? "Loading..." : `${displayResults.length} plants`}
            </span>
          )}
        </div>
      </div>

      {!selectedPlant && (
        <div className="flex-none mt-2 rounded-[20px] border border-[#dce9d8] bg-white/75 p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setFiltersOpen((prev) => !prev)}
              className="text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700"
            >
              Filters {filtersOpen ? "-" : "+"}
            </button>
            <div className="flex items-center gap-3">
              {activeFilterCount > 0 && (
                <button
                  onClick={() => setFilters(emptyFilters)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Clear {activeFilterCount}
                </button>
              )}
            </div>
          </div>
          {filtersOpen && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Watering", key: "watering", options: ["Frequent", "Average", "Minimum", "None"] },
                { label: "Care Level", key: "careLevel", options: ["Low", "Medium", "High"] },
                { label: "Cycle", key: "cycle", options: ["Perennial", "Annual", "Biennial", "Biannual"] },
                { label: "Fruits", key: "fruits", options: null },
                { label: "Flowers", key: "flowers", options: null },
              ].map(({ label, key, options }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-700 block mb-1">{label}</label>
                  <select
                    value={filters[key as keyof typeof filters]}
                    onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
                    className="w-full rounded-xl border border-[#dce9d8] bg-white px-2 py-1 text-xs text-black"
                  >
                    <option value="">All</option>
                    {options
                      ? options.map((o) => <option key={o} value={o}>{o}</option>)
                      : [<option key="true" value="true">Yes</option>, <option key="false" value="false">No</option>]}
                  </select>
                </div>
              ))}
              {/* Zone gets its own wider slot */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Zone</label>
                <select
                  value={filters.hardinessZone}
                  onChange={(e) => setFilters({ ...filters, hardinessZone: e.target.value })}
                  className="w-full rounded-xl border border-[#dce9d8] bg-white px-2 py-1 text-xs text-black"
                >
                  <option value="">All</option>
                  {[1,2,3,4,5,6,7,8,9,10,11,12,13].map((z) => (
                    <option key={z} value={z}>Zone {z}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <div className="mt-2 min-h-[180px] rounded-[24px] border border-[#dce9d8] bg-white/92 p-3 shadow-sm">
        {!selectedPlant && (
          <>
            {loading && <div className="text-sm text-gray-500 mb-2">Loading...</div>}

            {!loading && !useMock && results.length === 0 && (
              <div className="text-gray-400 text-sm">Search for a plant above to get started.</div>
            )}

            {!loading && displayResults.length === 0 && (results.length > 0 || useMock) && (
              <div className="text-gray-400 text-sm">No plants match your filters.</div>
            )}

            <ul>
              {displayResults.map((plant) => (
                <li
                  key={plant.id}
                  onClick={() => handleSelectPlant(plant)}
                  className="flex cursor-pointer items-center gap-3 rounded-[18px] p-2 transition-colors hover:bg-[#f3f8f0]"
                >
                  <img
                    src={getPlantImage(plant)}
                    alt={plant.common_name ?? "Plant"}
                    className="h-16 w-16 rounded-[16px] object-cover flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-black truncate">
                      {plant.common_name || (Array.isArray(plant.scientific_name) ? plant.scientific_name[0] : plant.scientific_name)}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {Array.isArray(plant.scientific_name) ? plant.scientific_name.join(", ") : plant.scientific_name}
                    </p>
                    {plant.hardiness?.min && plant.hardiness?.max && (
                      <p className="text-xs text-green-600 font-semibold">
                        Zone {plant.hardiness.min}{plant.hardiness.max !== plant.hardiness.min ? `-${plant.hardiness.max}` : ""}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {(selectedPlant || loadingPlant) && (
          <div className="text-black animate-fadeIn">
            <button
              onClick={() => { setSelectedPlant(null); setCurrentPlantId(null); }}
              className="mb-3 rounded-full border border-[#dce9d8] px-3 py-1.5 transition-colors hover:bg-[#f3f8f0]"
            >
              Back
            </button>

            {loadingPlant && <p className="mb-2">Loading plant details...</p>}

            {!loadingPlant && selectedPlant && (
              <>
                <img
                  src={getPlantImage(selectedPlant)}
                  alt={selectedPlant.common_name ?? "Plant"}
                  className="mb-4 h-48 w-full rounded-[20px] object-cover"
                />
                <h2 className="text-xl font-bold mb-1">
                  {selectedPlant.common_name || (Array.isArray(selectedPlant.scientific_name) ? selectedPlant.scientific_name[0] : selectedPlant.scientific_name)}
                </h2>
                <p className="text-gray-600 mb-2">
                  Scientific: {Array.isArray(selectedPlant.scientific_name) ? selectedPlant.scientific_name.join(", ") : selectedPlant.scientific_name}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-800 mb-4">
                  {detailFields.map(({ label, key }) => {
                    const value = (selectedPlant as any)[key];
                    if (value == null) return null;
                    return <div key={key}><strong>{label}:</strong> {formatValue(value)}</div>;
                  })}
                </div>
                {selectedPlant.description && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-700">{selectedPlant.description}</p>
                    {selectedPlant.descriptionSource === "Wikipedia" && (
                      <p className="text-xs text-gray-500 mt-1 italic">Source: Wikipedia</p>
                    )}
                  </div>
                )}
                {selectedPlant.careGuideData && selectedPlant.careGuideData.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">Care Guide</h3>
                    {selectedPlant.careGuideData.map((guide) => (
                      <div key={guide.id} className="mb-3">
                        {guide.section?.map((section) => (
                          <div key={section.id} className="mb-2">
                            <h4 className="font-medium text-sm capitalize mb-1">{section.type.replace(/_/g, " ")}</h4>
                            <p className="text-sm text-gray-700">{section.description}</p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}