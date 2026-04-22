// FlowerBedPanel.tsx
"use client";
import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { FaLock, FaLockOpen } from "react-icons/fa";
import { LuX } from "react-icons/lu";
import { PlantEntry, useGardenStore } from "../types/garden";
import { useHarvestDates } from "./hooks/useHarvestDates";
import { useCalendarStore } from "../stores/calendarStore";

interface SearchResult {
  id: number;
  common_name: string | null;
  scientific_name: string | string[];
  image_url?: string;
  default_image?: { thumbnail?: string; medium_url?: string };
  hardiness?: {
    min?: string;
    max?: string;
  };
}

interface FlowerBedPanelProps {
  shapeId: string;
  bedLabel?: string;
  isLocked: boolean;
  topOffset?: number;
  zone?: string | null;
  sidebarMode?: boolean;
  onToggleLock: () => void;
  onClose: () => void;
}

type GardenBedAttributes = {
  soilType: string;
  sunExposure: string;
  soilDepth: string;
  drainage: string;
  moisture: string;
  soilPh: string;
  notes: string;
};

const emptyAttributes: GardenBedAttributes = {
  soilType: "",
  sunExposure: "",
  soilDepth: "",
  drainage: "",
  moisture: "",
  soilPh: "",
  notes: "",
};

export default function FlowerBedPanel({
  shapeId,
  bedLabel,
  isLocked,
  topOffset = 96,
  zone,
  sidebarMode = false,
  onToggleLock,
  onClose,
}: FlowerBedPanelProps) {
  const bedPlants = useGardenStore((s) => s.bedPlants[shapeId]) ?? [];
  const addPlantToBed = useGardenStore((s) => s.addPlantToBed);
  const removePlantFromBed = useGardenStore((s) => s.removePlantFromBed);
  const updatePlantInBed = useGardenStore((s) => s.updatePlantInBed);
  const harvestInfo = useHarvestDates(shapeId, zone);
  const addCalendarNote = useCalendarStore((s) => s.addNote);
  const removeNotesByRefPrefix = useCalendarStore((s) => s.removeNotesByRefPrefix);
  const [scheduleStatus, setScheduleStatus] = useState<string | null>(null);

  const scheduledCount = bedPlants.filter(
    (p) => p.plantedAt && harvestInfo[p.id]?.estimatedHarvest
  ).length;

  const handleScheduleHarvests = () => {
    removeNotesByRefPrefix(`harvest:${shapeId}:`);

    let added = 0;
    for (const plant of bedPlants) {
      const info = harvestInfo[plant.id];
      if (!plant.plantedAt || !info?.estimatedHarvest) continue;

      const plantName = plant.common_name ?? "plant";
      const bedDisplayName = bedName || "garden bed";

      const created = addCalendarNote({
        source: "assistant",
        content: `Harvest ${plantName} (${bedDisplayName}) — planted ${plant.plantedAt}.${
          info.warning ? ` ${info.warning}` : ""
        }`,
        date: info.estimatedHarvest,
        sourceRef: `harvest:${shapeId}:${plant.id}`,
      });
      if (created) added++;
    }

    setScheduleStatus(
      added > 0 ? `Scheduled ${added} harvest${added === 1 ? "" : "s"}` : "Nothing to schedule"
    );
    setTimeout(() => setScheduleStatus(null), 2500);
  };

  const beds = useGardenStore((s) => s.beds);
  const shapes = useGardenStore((s) => s.shapes);
  const updateBed = useGardenStore((s) => s.updateBed);
  const updateShape = useGardenStore((s) => s.updateShape);

  const bedById = beds[shapeId];
  const linkedBed = Object.values(beds).find(
    (entry) => Array.isArray(entry.shapeIds) && entry.shapeIds.includes(shapeId)
  );
  const bed = bedById ?? linkedBed;
  const shape = shapes[shapeId];

  const [bedName, setBedName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isAttributesOpen, setIsAttributesOpen] = useState(true);
  const [attributes, setAttributes] = useState<GardenBedAttributes>(emptyAttributes);

  const hardinessZone = useGardenStore((s) => s.hardinessZone);

  useEffect(() => {
    if (bed?.name) {
      setBedName(bed.name);
    } else if (shape?.name) {
      setBedName(shape.name);
    } else if (bedLabel) {
      setBedName(bedLabel);
    } else {
      setBedName("Garden Bed");
    }

    const sourceAttributes = bed?.attributes || shape?.attributes;
    setAttributes({
      soilType: sourceAttributes?.soilType ?? "",
      sunExposure: sourceAttributes?.sunExposure ?? "",
      soilDepth: sourceAttributes?.soilDepth ?? "",
      drainage: sourceAttributes?.drainage ?? "",
      moisture: sourceAttributes?.moisture ?? "",
      soilPh: sourceAttributes?.soilPh ?? "",
      notes: sourceAttributes?.notes ?? "",
    });
  }, [bed, shape, bedLabel]);

  // ── Plant search state ────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [useMock, setUseMock] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Clear results when switching data source
  useEffect(() => {
    setResults([]);
    setQuery("");
  }, [useMock]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const apiUrl = (params: Record<string, string>) => {
    const qs = new URLSearchParams(params);
    if (useMock) qs.set("mock", "true");
    return `/api/perenual?${qs}`;
  };

  const fetchResults = async (q: string) => {
    setLoading(true);
    try {
      const resp = await fetch(apiUrl({ q }));
      if (!resp.ok) throw new Error();
      const json = await resp.json();

      // Mock results already include hardiness — skip the extra detail fetch
      if (useMock) {
        setResults((json.data || []).slice(0, 8));
        return;
      }

      const filtered = (json.data || []).filter(
        (p: SearchResult) => p.id >= 1 && p.id <= 3000
      );

      const withHardiness = await Promise.all(
        filtered.slice(0, 8).map(async (plant: SearchResult) => {
          try {
            const detailResp = await fetch(apiUrl({ id: String(plant.id) }));
            if (!detailResp.ok) return plant;
            const details = await detailResp.json();
            return { ...plant, hardiness: details.hardiness };
          } catch {
            return plant;
          }
        })
      );

      setResults(withHardiness);
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
      hardiness: p.hardiness,
    };
    addPlantToBed(shapeId, entry);
    setQuery("");
    setResults([]);
  };

  const handleSaveName = () => {
    if (bed) {
      updateBed(bed.id, { name: bedName });
    } else if (shape) {
      updateShape(shapeId, { name: bedName });
    }
    setIsEditingName(false);
  };

  const handleAttributeChange = (field: keyof GardenBedAttributes, value: string) => {
    const nextAttributes = { ...attributes, [field]: value };
    setAttributes(nextAttributes);
    if (bed) {
      updateBed(bed.id, { attributes: nextAttributes });
    } else if (shape) {
      updateShape(shapeId, { attributes: nextAttributes });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setIsEditingName(false);
      if (bed?.name) setBedName(bed.name);
      else if (shape?.name) setBedName(shape.name);
      else if (bedLabel) setBedName(bedLabel);
      else setBedName("Garden Bed");
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.stopPropagation();
    }
  };

  const getZoneNumber = (zoneValue: string | number | undefined) => {
    if (!zoneValue) return 0;
    return parseInt(zoneValue.toString().replace(/[^\d]/g, ""), 10);
  };

  const isPlantCompatible = (plant: PlantEntry) => {
    if (!hardinessZone || !plant.hardiness) return true;
    const zoneNumber = getZoneNumber(hardinessZone);
    const min = getZoneNumber(plant.hardiness.min);
    const max = getZoneNumber(plant.hardiness.max);
    return zoneNumber >= min && zoneNumber <= max;
  };

  return (
    <div
      data-testid="bed-plant-window"
      className={
        sidebarMode
          ? "relative flex h-full w-full min-h-0 flex-col overflow-hidden rounded-none border-0 bg-[#F7FBF5] shadow-none"
          : "absolute right-5 z-50 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
      }
      style={
        sidebarMode ? undefined : { width: 380, height: "60vh", top: `${topOffset}px` }
      }
      data-interactive="true"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        className={`flex shrink-0 items-center justify-between border-b px-4 py-3 ${
          sidebarMode
            ? "border-[#dce9d8] bg-[#ecf5e8]/90 backdrop-blur-md"
            : "border-gray-200 bg-white"
        }`}
      >
        {isEditingName ? (
          <input
            type="text"
            value={bedName}
            onChange={(e) => {
              e.stopPropagation();
              setBedName(e.target.value);
            }}
            onBlur={handleSaveName}
            onKeyDown={handleKeyDown}
            className="font-semibold text-green-800 text-sm border-b-2 border-green-600 focus:outline-none bg-transparent"
            autoFocus
            onFocus={(e) => e.target.select()}
          />
        ) : (
          <h2
            className="font-semibold text-green-800 text-sm cursor-pointer hover:text-green-600"
            onClick={() => setIsEditingName(true)}
            title={bed ? "Click to edit name" : undefined}
          >
            {bedName}
          </h2>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleLock}
            className="chatbot-pop-trigger rounded-full p-2 text-green-700 hover:bg-white hover:shadow-sm hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-[#8cc69f]"
            title={isLocked ? "Unlock window" : "Lock window"}
            aria-label={isLocked ? "Unlock bed panel" : "Lock bed panel"}
          >
            {isLocked ? <FaLock size={18} /> : <FaLockOpen size={18} />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="chatbot-pop-trigger rounded-full p-2 text-green-700 hover:bg-white hover:shadow-sm hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-[#8cc69f]"
            aria-label="Close bed panel"
          >
            <LuX size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Search to add */}
      <div
        className={`shrink-0 border-b px-4 py-3 ${
          sidebarMode ? "border-[#dce9d8] bg-[#f5fbf3]/80" : "border-gray-200 bg-white"
        }`}
      >
        {/* Mock / Live toggle */}
        <div className="flex items-center gap-1.5 mb-2">
          <button
            onClick={() => setUseMock(false)}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
              !useMock
                ? "bg-green-700 text-white"
                : "bg-white border border-gray-300 text-gray-400 hover:border-green-400"
            }`}
          >
            Live
          </button>
          <button
            onClick={() => setUseMock(true)}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
              useMock
                ? "bg-amber-500 text-white"
                : "bg-white border border-gray-300 text-gray-400 hover:border-amber-400"
            }`}
          >
            Mock
          </button>
          {useMock && (
            <span className="text-[10px] text-amber-500 italic">offline data</span>
          )}
        </div>

        <input
          type="text"
          placeholder={useMock ? "Search mock plants..." : "Search plants to add..."}
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
                    <img
                      src={getImage(p)}
                      alt=""
                      className="w-8 h-8 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-800 leading-tight">
                      {p.common_name ??
                        (Array.isArray(p.scientific_name)
                          ? p.scientific_name[0]
                          : p.scientific_name)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {Array.isArray(p.scientific_name)
                        ? p.scientific_name[0]
                        : p.scientific_name}
                    </p>
                    {p.hardiness?.min && p.hardiness?.max && (
                      <p className="text-[10px] text-green-600">
                        Zone {p.hardiness.min}–{p.hardiness.max}
                      </p>
                    )}
                  </div>
                  {alreadyAdded && (
                    <span className="ml-auto text-xs text-green-600">Added</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto bg-gradient-to-br from-[#f5fbf3] to-[#eef6ea]">
        {/* Bed Attributes */}
        <div className="border-b border-[#dce9d8]">
          <button
            type="button"
            onClick={() => setIsAttributesOpen((prev) => !prev)}
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/60"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Bed Attributes
            </h3>
            <span className="text-xs font-semibold text-green-800">
              {isAttributesOpen ? "Hide" : "Show"}
            </span>
          </button>

          {isAttributesOpen && (
            <div className="px-4 pb-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Soil type</label>
                  <select
                    value={attributes.soilType}
                    onChange={(e) => handleAttributeChange("soilType", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-black focus:outline-none focus:ring-1 focus:ring-green-600"
                  >
                    <option value="">Select</option>
                    <option value="Clay">Clay</option>
                    <option value="Loam">Loam</option>
                    <option value="Sandy">Sandy</option>
                    <option value="Silty">Silty</option>
                    <option value="Chalky">Chalky</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Sun exposure</label>
                  <select
                    value={attributes.sunExposure}
                    onChange={(e) => handleAttributeChange("sunExposure", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-black focus:outline-none focus:ring-1 focus:ring-green-600"
                  >
                    <option value="">Select</option>
                    <option value="Full Sun">Full Sun</option>
                    <option value="Part Sun">Part Sun</option>
                    <option value="Part Shade">Part Shade</option>
                    <option value="Full Shade">Full Shade</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Soil depth</label>
                  <input
                    type="text"
                    value={attributes.soilDepth}
                    onChange={(e) => handleAttributeChange("soilDepth", e.target.value)}
                    placeholder='ex. 12"'
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-black focus:outline-none focus:ring-1 focus:ring-green-600"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Drainage</label>
                  <select
                    value={attributes.drainage}
                    onChange={(e) => handleAttributeChange("drainage", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-black focus:outline-none focus:ring-1 focus:ring-green-600"
                  >
                    <option value="">Select</option>
                    <option value="Poor">Poor</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Well-drained">Well-drained</option>
                    <option value="Very fast-draining">Very fast-draining</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Moisture</label>
                  <select
                    value={attributes.moisture}
                    onChange={(e) => handleAttributeChange("moisture", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-black focus:outline-none focus:ring-1 focus:ring-green-600"
                  >
                    <option value="">Select</option>
                    <option value="Dry">Dry</option>
                    <option value="Average">Average</option>
                    <option value="Moist">Moist</option>
                    <option value="Wet">Wet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Soil pH</label>
                  <input
                    type="text"
                    value={attributes.soilPh}
                    onChange={(e) => handleAttributeChange("soilPh", e.target.value)}
                    placeholder="ex. 6.0-7.0"
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-black focus:outline-none focus:ring-1 focus:ring-green-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <textarea
                  value={attributes.notes}
                  onChange={(e) => handleAttributeChange("notes", e.target.value)}
                  rows={3}
                  placeholder="Add bed notes..."
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-black focus:outline-none focus:ring-1 focus:ring-green-600 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Plant table */}
        <div className="px-4 py-2">
          {bedPlants.length > 0 && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-400">
                {scheduledCount > 0
                  ? `${scheduledCount} plant${scheduledCount === 1 ? "" : "s"} ready to schedule`
                  : "Set planting dates to enable scheduling"}
              </span>
              <button
                type="button"
                onClick={handleScheduleHarvests}
                disabled={scheduledCount === 0}
                className="text-[11px] font-medium text-green-700 hover:text-green-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                title="Post harvest dates to the calendar"
              >
                {scheduleStatus ?? "Schedule harvests →"}
              </button>
            </div>
          )}

          {bedPlants.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">
              No plants added yet. Search above to add one.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead
                className={`sticky top-0 z-10 ${
                  sidebarMode ? "bg-[#f7fbf5]" : "bg-white"
                }`}
              >
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-1 font-medium">Plant</th>
                  <th className="pb-1 font-medium">Planted</th>
                  <th className="pb-1 font-medium">Harvest</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {bedPlants.map((plant) => {
                  const info = harvestInfo[plant.id];
                  const compatible = isPlantCompatible(plant);
                  return (
                    <tr
                      key={plant.id}
                      className={`border-b last:border-0 align-top ${!compatible ? "bg-red-50" : ""}`}
                    >
                      <td className="py-1.5 pr-2">
                        <div className="flex items-center gap-2">
                          {plant.image_url && (
                            <img
                              src={plant.image_url}
                              alt=""
                              className="w-8 h-8 rounded object-cover flex-shrink-0"
                            />
                          )}
                          <div className="leading-tight">
                            <p className="font-medium text-gray-800">
                              {plant.common_name ?? "—"}
                            </p>
                            <p className="text-[10px] text-gray-400 italic">
                              {Array.isArray(plant.scientific_name)
                                ? plant.scientific_name[0]
                                : plant.scientific_name}
                            </p>
                            {!compatible && (
                              <p className="text-[10px] text-red-500 mt-0.5">
                                Not compatible with zone {hardinessZone}
                              </p>
                            )}
                          </div>
                        </div>
                        {info?.plantingWindow && (
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            Plant: {info.plantingWindow.earliest} → {info.plantingWindow.latest}
                          </p>
                        )}
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          type="date"
                          value={plant.plantedAt ?? ""}
                          onChange={(e) =>
                            updatePlantInBed(shapeId, plant.id, {
                              plantedAt: e.target.value || undefined,
                            })
                          }
                          className="border border-gray-300 rounded px-1.5 py-1 text-xs text-black focus:outline-none focus:ring-1 focus:ring-green-600 w-[110px]"
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        {info?.estimatedHarvest ? (
                          <div className="leading-tight">
                            <p className="text-xs text-gray-800">{info.estimatedHarvest}</p>
                            {info.warning && (
                              <p className="text-[10px] text-amber-600 mt-0.5" title={info.warning}>
                                ⚠ frost risk
                              </p>
                            )}
                          </div>
                        ) : info?.unknown ? (
                          <span className="text-[10px] text-gray-400">No data</span>
                        ) : (
                          <span className="text-[10px] text-gray-400">—</span>
                        )}
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
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}