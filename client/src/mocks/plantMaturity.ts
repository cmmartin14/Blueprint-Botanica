// Plant maturity lookup — used by harvest date calculations.
// Perenual doesn't reliably expose days_to_maturity, so we maintain this
// table keyed by Perenual plant ID with common-name fallbacks.
//
// daysToMaturity: typical days from planting (by startMethod) to first harvest.
// harvestWindow:  typical days the plant keeps producing after first harvest.
// startMethod:    how the plant is typically started in a home garden.

export type StartMethod = "direct-sow" | "transplant" | "indoor-start";

export interface PlantMaturityInfo {
  id?: number; // Perenual ID when known
  name: string; // canonical common name (lowercase match)
  daysToMaturity: number;
  harvestWindow: number;
  startMethod: StartMethod;
}

// IDs here align with the Perenual IDs used in mocks/plants.ts so the
// two mock sources stay consistent during development.
export const plantMaturityData: PlantMaturityInfo[] = [
  { id: 1, name: "tomato", daysToMaturity: 75, harvestWindow: 60, startMethod: "transplant" },
  { id: 2, name: "basil", daysToMaturity: 60, harvestWindow: 90, startMethod: "transplant" },
  { id: 3, name: "lavender", daysToMaturity: 90, harvestWindow: 120, startMethod: "transplant" },
  { id: 4, name: "strawberry", daysToMaturity: 90, harvestWindow: 45, startMethod: "transplant" },
  { id: 5, name: "carrot", daysToMaturity: 70, harvestWindow: 21, startMethod: "direct-sow" },
  { id: 6, name: "rose", daysToMaturity: 120, harvestWindow: 90, startMethod: "transplant" },
  { id: 7, name: "mint", daysToMaturity: 60, harvestWindow: 120, startMethod: "transplant" },
  { id: 8, name: "sunflower", daysToMaturity: 80, harvestWindow: 14, startMethod: "direct-sow" },
  { id: 9, name: "blueberry", daysToMaturity: 730, harvestWindow: 30, startMethod: "transplant" },
  { id: 10, name: "parsley", daysToMaturity: 75, harvestWindow: 90, startMethod: "direct-sow" },

  // Common vegetables beyond the Perenual mock set (name-match fallbacks)
  { name: "lettuce", daysToMaturity: 45, harvestWindow: 30, startMethod: "direct-sow" },
  { name: "spinach", daysToMaturity: 40, harvestWindow: 21, startMethod: "direct-sow" },
  { name: "kale", daysToMaturity: 55, harvestWindow: 60, startMethod: "direct-sow" },
  { name: "arugula", daysToMaturity: 30, harvestWindow: 21, startMethod: "direct-sow" },
  { name: "radish", daysToMaturity: 25, harvestWindow: 7, startMethod: "direct-sow" },
  { name: "beet", daysToMaturity: 55, harvestWindow: 14, startMethod: "direct-sow" },
  { name: "onion", daysToMaturity: 100, harvestWindow: 14, startMethod: "transplant" },
  { name: "garlic", daysToMaturity: 240, harvestWindow: 14, startMethod: "direct-sow" },
  { name: "potato", daysToMaturity: 90, harvestWindow: 21, startMethod: "direct-sow" },
  { name: "sweet potato", daysToMaturity: 110, harvestWindow: 21, startMethod: "transplant" },
  { name: "broccoli", daysToMaturity: 70, harvestWindow: 21, startMethod: "transplant" },
  { name: "cauliflower", daysToMaturity: 75, harvestWindow: 14, startMethod: "transplant" },
  { name: "cabbage", daysToMaturity: 80, harvestWindow: 21, startMethod: "transplant" },
  { name: "brussels sprouts", daysToMaturity: 100, harvestWindow: 30, startMethod: "transplant" },
  { name: "pepper", daysToMaturity: 75, harvestWindow: 60, startMethod: "transplant" },
  { name: "bell pepper", daysToMaturity: 75, harvestWindow: 60, startMethod: "transplant" },
  { name: "jalapeno", daysToMaturity: 70, harvestWindow: 60, startMethod: "transplant" },
  { name: "cucumber", daysToMaturity: 60, harvestWindow: 45, startMethod: "direct-sow" },
  { name: "zucchini", daysToMaturity: 55, harvestWindow: 60, startMethod: "direct-sow" },
  { name: "squash", daysToMaturity: 60, harvestWindow: 60, startMethod: "direct-sow" },
  { name: "pumpkin", daysToMaturity: 110, harvestWindow: 14, startMethod: "direct-sow" },
  { name: "watermelon", daysToMaturity: 85, harvestWindow: 21, startMethod: "direct-sow" },
  { name: "cantaloupe", daysToMaturity: 85, harvestWindow: 21, startMethod: "direct-sow" },
  { name: "corn", daysToMaturity: 80, harvestWindow: 14, startMethod: "direct-sow" },
  { name: "green bean", daysToMaturity: 55, harvestWindow: 30, startMethod: "direct-sow" },
  { name: "pea", daysToMaturity: 65, harvestWindow: 21, startMethod: "direct-sow" },
  { name: "okra", daysToMaturity: 60, harvestWindow: 60, startMethod: "direct-sow" },
  { name: "eggplant", daysToMaturity: 80, harvestWindow: 60, startMethod: "transplant" },
  { name: "celery", daysToMaturity: 120, harvestWindow: 30, startMethod: "transplant" },
  { name: "asparagus", daysToMaturity: 730, harvestWindow: 60, startMethod: "transplant" },
  { name: "rhubarb", daysToMaturity: 365, harvestWindow: 90, startMethod: "transplant" },
  { name: "artichoke", daysToMaturity: 150, harvestWindow: 45, startMethod: "transplant" },

  // Common herbs
  { name: "cilantro", daysToMaturity: 45, harvestWindow: 21, startMethod: "direct-sow" },
  { name: "dill", daysToMaturity: 55, harvestWindow: 30, startMethod: "direct-sow" },
  { name: "chive", daysToMaturity: 60, harvestWindow: 120, startMethod: "direct-sow" },
  { name: "oregano", daysToMaturity: 90, harvestWindow: 120, startMethod: "transplant" },
  { name: "thyme", daysToMaturity: 75, harvestWindow: 120, startMethod: "transplant" },
  { name: "rosemary", daysToMaturity: 90, harvestWindow: 180, startMethod: "transplant" },
  { name: "sage", daysToMaturity: 75, harvestWindow: 120, startMethod: "transplant" },

  // Common flowers/fruits
  { name: "marigold", daysToMaturity: 50, harvestWindow: 90, startMethod: "direct-sow" },
  { name: "zinnia", daysToMaturity: 60, harvestWindow: 90, startMethod: "direct-sow" },
  { name: "dahlia", daysToMaturity: 100, harvestWindow: 90, startMethod: "transplant" },
  { name: "raspberry", daysToMaturity: 365, harvestWindow: 45, startMethod: "transplant" },
  { name: "blackberry", daysToMaturity: 365, harvestWindow: 45, startMethod: "transplant" },
];

const normalize = (s: string) => s.trim().toLowerCase();

/**
 * Look up maturity info for a plant. Tries Perenual ID first, then
 * matches by common name (case-insensitive, substring-tolerant).
 * Returns undefined if no match is found.
 */
export const lookupPlantMaturity = (
  plantId?: number,
  commonName?: string | null
): PlantMaturityInfo | undefined => {
  if (plantId != null) {
    const byId = plantMaturityData.find((p) => p.id === plantId);
    if (byId) return byId;
  }

  if (!commonName) return undefined;
  const needle = normalize(commonName);

  // Exact match first
  const exact = plantMaturityData.find((p) => p.name === needle);
  if (exact) return exact;

  // Substring match (handles "cherry tomato" -> "tomato", etc.)
  return plantMaturityData.find(
    (p) => needle.includes(p.name) || p.name.includes(needle)
  );
};
