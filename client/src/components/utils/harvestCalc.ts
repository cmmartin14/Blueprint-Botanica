// Pure utilities for calculating harvest dates and planting windows.
// Consumed by the useHarvestDates hook and the chatbot calculate_harvest_date tool.

import type { StartMethod } from "../../mocks/plantMaturity";

export type DateYmd = string; // YYYY-MM-DD
export type MonthDay = string; // MM-DD

export interface HarvestWindow {
  start: DateYmd;
  end: DateYmd;
}

export interface PlantingWindow {
  earliest: DateYmd;
  latest: DateYmd;
}

export interface ZoneFrostDates {
  lastFrost: MonthDay; // average last spring frost (MM-DD)
  firstFrost: MonthDay; // average first fall frost (MM-DD)
}

// --- Date helpers (local-time safe — no timezone drift) ---

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const MMDD_RE = /^\d{2}-\d{2}$/;

const pad2 = (n: number) => n.toString().padStart(2, "0");

const parseYmd = (ymd: DateYmd): Date | null => {
  if (!YMD_RE.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
};

const formatYmd = (date: Date): DateYmd =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** Adds `days` to a YYYY-MM-DD date and returns the new YYYY-MM-DD. */
export const addDays = (ymd: DateYmd, days: number): DateYmd | null => {
  const d = parseYmd(ymd);
  if (!d) return null;
  d.setDate(d.getDate() + days);
  return formatYmd(d);
};

/** Returns the number of days between two YYYY-MM-DD dates (b - a). */
export const daysBetween = (a: DateYmd, b: DateYmd): number | null => {
  const da = parseYmd(a);
  const db = parseYmd(b);
  if (!da || !db) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((db.getTime() - da.getTime()) / msPerDay);
};

/** Combines a MM-DD frost date with a year into a full YYYY-MM-DD. */
export const frostDateForYear = (
  monthDay: MonthDay,
  year: number
): DateYmd | null => {
  if (!MMDD_RE.test(monthDay)) return null;
  const [m, d] = monthDay.split("-").map(Number);
  const ymd = `${year}-${pad2(m)}-${pad2(d)}`;
  return parseYmd(ymd) ? ymd : null;
};

// --- Growth adjustments ---

/**
 * Returns a multiplier applied to daysToMaturity based on sun exposure.
 * Part Shade and Full Shade slow growth; Full/Part Sun is baseline.
 */
export const sunExposureDelayFactor = (sunExposure?: string): number => {
  if (!sunExposure) return 1;
  const normalized = sunExposure.trim().toLowerCase();
  if (normalized === "full sun") return 1;
  if (normalized === "part sun") return 1.05;
  if (normalized === "part shade") return 1.15;
  if (normalized === "full shade") return 1.3;
  return 1;
};

// --- Core calculations ---

/**
 * Estimates the harvest date for a single plant.
 * Returns null if inputs are invalid.
 */
export const calculateHarvestDate = (
  plantedAt: DateYmd,
  daysToMaturity: number,
  sunExposure?: string
): DateYmd | null => {
  if (!Number.isFinite(daysToMaturity) || daysToMaturity <= 0) return null;
  const adjusted = Math.round(
    daysToMaturity * sunExposureDelayFactor(sunExposure)
  );
  return addDays(plantedAt, adjusted);
};

/**
 * Estimates the harvest window (first harvest → end of production).
 */
export const estimateHarvestWindow = (
  plantedAt: DateYmd,
  daysToMaturity: number,
  harvestWindowDays: number,
  sunExposure?: string
): HarvestWindow | null => {
  const start = calculateHarvestDate(plantedAt, daysToMaturity, sunExposure);
  if (!start) return null;
  if (!Number.isFinite(harvestWindowDays) || harvestWindowDays < 0) {
    return { start, end: start };
  }
  const end = addDays(start, harvestWindowDays);
  if (!end) return null;
  return { start, end };
};

/**
 * Estimates the safe planting window for a plant in a given zone.
 *
 *  - direct-sow / transplant: earliest = last frost, latest = first frost - days to maturity
 *  - indoor-start:            earliest = last frost - 42d (6wk early start), latest = last frost
 *
 * Returns null if the season is too short for the crop in this zone.
 */
export const estimatePlantingWindow = (
  zoneFrost: ZoneFrostDates,
  startMethod: StartMethod,
  daysToMaturity: number,
  year: number = new Date().getFullYear()
): PlantingWindow | null => {
  const lastFrost = frostDateForYear(zoneFrost.lastFrost, year);
  const firstFrost = frostDateForYear(zoneFrost.firstFrost, year);
  if (!lastFrost || !firstFrost) return null;
  if (!Number.isFinite(daysToMaturity) || daysToMaturity <= 0) return null;

  if (startMethod === "indoor-start") {
    const earliest = addDays(lastFrost, -42);
    if (!earliest) return null;
    return { earliest, latest: lastFrost };
  }

  // direct-sow and transplant both go in after last frost
  const latest = addDays(firstFrost, -daysToMaturity);
  if (!latest) return null;

  // If season is too short for this crop in this zone, return null
  const span = daysBetween(lastFrost, latest);
  if (span == null || span < 0) return null;

  return { earliest: lastFrost, latest };
};

/**
 * Warns when harvest would fall after the first frost — plant may not mature.
 * Returns null when harvest is safely before frost.
 */
export const validateHarvestBeforeFrost = (
  harvestDate: DateYmd,
  firstFrost: MonthDay,
  year: number = new Date().getFullYear()
): string | null => {
  const frost = frostDateForYear(firstFrost, year);
  if (!frost) return null;
  const diff = daysBetween(harvestDate, frost);
  if (diff == null) return null;
  if (diff < 0) {
    return `Harvest (${harvestDate}) falls after first frost (${frost}); crop may not mature.`;
  }
  if (diff < 14) {
    return `Tight timing: only ${diff} day(s) between harvest and first frost (${frost}).`;
  }
  return null;
};

// --- Zone frost date lookup (interim, pre-DB) ---

// Averaged USDA hardiness zone frost dates for the continental US.
// These are rough zone-wide averages — swap for a DB lookup in Phase 1 step 1.
const ZONE_FROST_DEFAULTS: Record<string, ZoneFrostDates> = {
  "3": { lastFrost: "05-30", firstFrost: "09-10" },
  "3a": { lastFrost: "06-01", firstFrost: "09-05" },
  "3b": { lastFrost: "05-25", firstFrost: "09-15" },
  "4": { lastFrost: "05-20", firstFrost: "09-20" },
  "4a": { lastFrost: "05-25", firstFrost: "09-15" },
  "4b": { lastFrost: "05-15", firstFrost: "09-25" },
  "5": { lastFrost: "05-10", firstFrost: "10-05" },
  "5a": { lastFrost: "05-15", firstFrost: "10-01" },
  "5b": { lastFrost: "05-05", firstFrost: "10-10" },
  "6": { lastFrost: "04-25", firstFrost: "10-15" },
  "6a": { lastFrost: "05-01", firstFrost: "10-10" },
  "6b": { lastFrost: "04-20", firstFrost: "10-20" },
  "7": { lastFrost: "04-10", firstFrost: "11-01" },
  "7a": { lastFrost: "04-15", firstFrost: "10-25" },
  "7b": { lastFrost: "04-05", firstFrost: "11-05" },
  "8": { lastFrost: "03-25", firstFrost: "11-15" },
  "8a": { lastFrost: "04-01", firstFrost: "11-10" },
  "8b": { lastFrost: "03-20", firstFrost: "11-20" },
  "9": { lastFrost: "03-01", firstFrost: "12-01" },
  "9a": { lastFrost: "03-10", firstFrost: "11-25" },
  "9b": { lastFrost: "02-20", firstFrost: "12-05" },
  "10": { lastFrost: "01-30", firstFrost: "12-20" },
  "10a": { lastFrost: "02-10", firstFrost: "12-15" },
  "10b": { lastFrost: "01-20", firstFrost: "12-25" },
  // Zones 11+ are effectively frost-free in the continental US.
};

/** Looks up average frost dates for a USDA hardiness zone. */
export const getZoneFrostDates = (zone?: string | null): ZoneFrostDates | null => {
  if (!zone) return null;
  const normalized = zone.trim().toLowerCase();
  if (ZONE_FROST_DEFAULTS[normalized]) return ZONE_FROST_DEFAULTS[normalized];
  // Fall back to the numeric base zone (e.g., "5a" -> "5")
  const base = normalized.replace(/[ab]$/, "");
  return ZONE_FROST_DEFAULTS[base] ?? null;
};
