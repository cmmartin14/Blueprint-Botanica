import { PlantEntry } from "../../types/garden";

export interface CompatibilityIssue {
  type: "hardiness_mismatch";
  message: string;
  affectedPlants: number[];
}

export interface BedCompatibilityResult {
  isCompatible: boolean;
  issues: CompatibilityIssue[];
}

export function hasHardinessOverlap(plant1: PlantEntry, plant2: PlantEntry): boolean {
  const h1 = plant1.hardiness;
  const h2 = plant2.hardiness;

  if (!h1?.min || !h1?.max || !h2?.min || !h2?.max) {
    return true; 
  }

  const min1 = parseInt(h1.min);
  const max1 = parseInt(h1.max);
  const min2 = parseInt(h2.min);
  const max2 = parseInt(h2.max);

  return min1 <= max2 && min2 <= max1;
}

export function getCommonHardinessRange(plants: PlantEntry[]): { min: number; max: number } | null {
  const plantsWithHardiness = plants.filter(
    (p) => p.hardiness?.min && p.hardiness?.max
  );

  if (plantsWithHardiness.length === 0) return null;

  let commonMin = parseInt(plantsWithHardiness[0].hardiness!.min!);
  let commonMax = parseInt(plantsWithHardiness[0].hardiness!.max!);

  for (let i = 1; i < plantsWithHardiness.length; i++) {
    const min = parseInt(plantsWithHardiness[i].hardiness!.min!);
    const max = parseInt(plantsWithHardiness[i].hardiness!.max!);

    commonMin = Math.max(commonMin, min);
    commonMax = Math.min(commonMax, max);

    if (commonMin > commonMax) {
      return null;
    }
  }

  return { min: commonMin, max: commonMax };
}

export function checkBedCompatibility(plants: PlantEntry[]): BedCompatibilityResult {
  const issues: CompatibilityIssue[] = [];

  if (plants.length < 2) {
    return { isCompatible: true, issues: [] };
  }

  const plantsWithHardiness = plants.filter(
    (p) => p.hardiness?.min && p.hardiness?.max
  );

  if (plantsWithHardiness.length < 2) {
    return { isCompatible: true, issues: [] };
  }

  const commonRange = getCommonHardinessRange(plantsWithHardiness);

  if (commonRange === null) {
    const incompatiblePlants = plantsWithHardiness.map((p) => p.id);

    issues.push({
      type: "hardiness_mismatch",
      message: `No common hardiness zone found. Plants have incompatible growing zones.`,
      affectedPlants: incompatiblePlants,
    });

    return { isCompatible: false, issues };
  }

  return { isCompatible: true, issues: [] };
}

export function getCompatibilityDescription(plants: PlantEntry[]): string {
  const result = checkBedCompatibility(plants);

  if (result.isCompatible) {
    const commonRange = getCommonHardinessRange(plants);
    if (commonRange) {
      return `All plants are compatible in zones ${commonRange.min}-${commonRange.max}`;
    }
    return "Plants appear compatible";
  }

  return result.issues.map((issue) => issue.message).join("; ");
}

export function isPlantCompatibleWithBed(
  newPlant: PlantEntry,
  existingPlants: PlantEntry[]
): boolean {
  if (existingPlants.length === 0) return true;

  const allPlants = [...existingPlants, newPlant];
  const result = checkBedCompatibility(allPlants);

  return result.isCompatible;
}