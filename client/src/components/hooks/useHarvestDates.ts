import { useMemo } from "react";
import { useGardenStore } from "../../types/garden";
import { lookupPlantMaturity } from "../../mocks/plantMaturity";
import {
  calculateHarvestDate,
  estimateHarvestWindow,
  estimatePlantingWindow,
  getZoneFrostDates,
  validateHarvestBeforeFrost,
  type DateYmd,
  type HarvestWindow,
  type PlantingWindow,
} from "../utils/harvestCalc";

export interface PlantHarvestInfo {
  plantId: number;
  daysToMaturity?: number;
  startMethod?: string;
  estimatedHarvest?: DateYmd;
  harvestWindow?: HarvestWindow;
  plantingWindow?: PlantingWindow;
  warning?: string;
  /** True when we have no maturity data for this plant. */
  unknown: boolean;
}

/**
 * Computes harvest/planting info for every plant in a bed.
 * Results are keyed by plant ID.
 *
 * Inputs are read from the garden store (bed plants, bed attributes)
 * and the caller-supplied zone. When the zone is missing, planting
 * windows and frost warnings are omitted but harvest date is still
 * returned for any plant that has a `plantedAt`.
 */
export const useHarvestDates = (
  shapeId: string,
  zone?: string | null
): Record<number, PlantHarvestInfo> => {
  const bedPlants = useGardenStore((s) => s.bedPlants[shapeId]) ?? [];
  const beds = useGardenStore((s) => s.beds);
  const shapes = useGardenStore((s) => s.shapes);

  const sunExposure = useMemo(() => {
    const bedById = beds[shapeId];
    const linkedBed = Object.values(beds).find(
      (b) => Array.isArray(b.shapeIds) && b.shapeIds.includes(shapeId)
    );
    const shape = shapes[shapeId];
    return (
      bedById?.attributes?.sunExposure ??
      linkedBed?.attributes?.sunExposure ??
      shape?.attributes?.sunExposure ??
      undefined
    );
  }, [beds, shapes, shapeId]);

  const frost = useMemo(() => getZoneFrostDates(zone), [zone]);

  return useMemo(() => {
    const result: Record<number, PlantHarvestInfo> = {};

    for (const plant of bedPlants) {
      const maturity = lookupPlantMaturity(plant.id, plant.common_name);
      const daysToMaturity = plant.daysToMaturity ?? maturity?.daysToMaturity;
      const startMethod = plant.startMethod ?? maturity?.startMethod;

      const info: PlantHarvestInfo = {
        plantId: plant.id,
        daysToMaturity,
        startMethod,
        unknown: daysToMaturity == null,
      };

      if (frost && startMethod && daysToMaturity) {
        const pw = estimatePlantingWindow(frost, startMethod, daysToMaturity);
        if (pw) info.plantingWindow = pw;
      }

      if (plant.plantedAt && daysToMaturity) {
        const harvest = calculateHarvestDate(
          plant.plantedAt,
          daysToMaturity,
          sunExposure
        );
        if (harvest) {
          info.estimatedHarvest = harvest;
          info.harvestWindow = estimateHarvestWindow(
            plant.plantedAt,
            daysToMaturity,
            maturity?.harvestWindow ?? 14,
            sunExposure
          ) ?? undefined;

          if (frost) {
            const warning = validateHarvestBeforeFrost(
              harvest,
              frost.firstFrost
            );
            if (warning) info.warning = warning;
          }
        }
      }

      result[plant.id] = info;
    }

    return result;
  }, [bedPlants, sunExposure, frost]);
};
