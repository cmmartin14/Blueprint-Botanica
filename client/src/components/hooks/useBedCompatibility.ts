import { useMemo } from "react";
import { useGardenStore } from "../../types/garden";
import { checkBedCompatibility, BedCompatibilityResult } from "../utils/plantCompatibility";


export function useBedCompatibility(shapeId: string): BedCompatibilityResult {
  const bedPlants = useGardenStore((s) => s.bedPlants[shapeId]) ?? [];

  return useMemo(() => {
    return checkBedCompatibility(bedPlants);
  }, [bedPlants]);
}

export function useAllBedsCompatibility(): Record<string, BedCompatibilityResult> {
  const bedPlants = useGardenStore((s) => s.bedPlants);

  return useMemo(() => {
    const results: Record<string, BedCompatibilityResult> = {};

    for (const [shapeId, plants] of Object.entries(bedPlants)) {
      results[shapeId] = checkBedCompatibility(plants);
    }

    return results;
  }, [bedPlants]);
}