import { Shape } from './shapes';
import { create } from 'zustand';

export interface Bed {
  id: string;
  name: string;
  shapeIds: string[];
  createdAt: number;
  attributes?: GardenBedAttributes;
}

export type GardenBedAttributes = {
  soilType?: string;
  sunExposure?: string;
  soilDepth?: string;
  drainage?: string;
  moisture?: string;
  soilPh?: string;
  notes?: string;
};

// Minimal plant entry — swap when perenual is integrated
export interface PlantEntry {
  id: number;
  common_name: string | null;
  scientific_name: string | string[];
  image_url?: string;
  hardiness?: {
    min?: string;
    max?: string;
  };
  // Harvest scheduling (optional, per-plant-in-bed)
  plantedAt?: string; // YYYY-MM-DD
  daysToMaturity?: number;
  startMethod?: "direct-sow" | "transplant" | "indoor-start";
}

export interface GardenState {
  id: string;
  name: string;
  editMode: boolean;
  zone?: string | null;
  shapes: Record<string, Shape>;
  beds: Record<string, Bed>;
  // keyed by circle shape ID
  bedPlants: Record<string, PlantEntry[]>;
}

type GardenActions = {
  // Canvas meta
  setName: (name: string) => void;
  setEditMode: (value: boolean) => void;
  setZone: (zone: string | null) => void;

  // Shapes
  addShape: (shape: Shape) => void;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  clearShapes: () => void;

  // Beds
  createBed: (name: string, shapeId?: string) => void;
  updateBed: (id: string, patch: Partial<Bed>) => void;
  deleteBed: (id: string) => void;
  addShapeToBed: (bedId: string, shapeId: string) => void;
  removeShapeFromBed: (bedId: string, shapeId: string) => void;

  // Bed plants
  addPlantToBed: (shapeId: string, plant: PlantEntry) => void;
  removePlantFromBed: (shapeId: string, plantId: number) => void;
  updatePlantInBed: (
    shapeId: string,
    plantId: number,
    patch: Partial<PlantEntry>
  ) => void;

  // Persistence
  loadGarden: (state: GardenState) => void;
  clearGarden: () => void;
};

const defaultState: GardenState = {
  id: '',
  name: 'My Garden',
  editMode: false,
  zone: null,
  shapes: {},
  beds: {},
  bedPlants: {},
};

export const useGardenStore = create<GardenState & GardenActions>((set) => ({
  ...defaultState,

  setName: (name) => set({ name }),
  setEditMode: (editMode) => set({ editMode }),
  setZone: (zone) => set({ zone }),

  addShape: (shape) =>
    set((state) => ({ shapes: { ...state.shapes, [shape.id]: shape } })),

   updateShape: (id, patch) =>
    set((state) => ({
      shapes: {
        ...state.shapes,
        [id]: { ...state.shapes[id], ...patch } as Shape,
      } as Record<string, Shape>,
    })),

  deleteShape: (id) =>
    set((state) => {
      const { [id]: _, ...shapes } = state.shapes;
      const beds = Object.fromEntries(
        Object.entries(state.beds).map(([bedId, bed]) => [
          bedId,
          { ...bed, shapeIds: bed.shapeIds.filter((sid) => sid !== id) },
        ])
      ) as Record<string, Bed>;
      return { shapes: shapes as Record<string, Shape>, beds };
    }),

  clearShapes: () => set({ shapes: {} }),

  createBed: (name, shapeId) =>
    set((state) => {
      const id = crypto.randomUUID();
      const bed: Bed = {
        id,
        name,
        shapeIds: shapeId ? [shapeId] : [],
        createdAt: Date.now(),
      };
      return { beds: { ...state.beds, [id]: bed } };
    }),

  updateBed: (id, patch) =>
    set((state) => ({
      beds: { ...state.beds, [id]: { ...state.beds[id], ...patch } },
    })),

  deleteBed: (id) =>
    set((state) => {
      const { [id]: _, ...beds } = state.beds;
      return { beds: beds as Record<string, Bed> };
    }),

  addShapeToBed: (bedId, shapeId) =>
    set((state) => {
      const bed = state.beds[bedId];
      if (!bed || bed.shapeIds.includes(shapeId)) return state;
      return {
        beds: {
          ...state.beds,
          [bedId]: { ...bed, shapeIds: [...bed.shapeIds, shapeId] },
        },
      };
    }),

  removeShapeFromBed: (bedId, shapeId) =>
    set((state) => {
      const bed = state.beds[bedId];
      if (!bed) return state;
      return {
        beds: {
          ...state.beds,
          [bedId]: { ...bed, shapeIds: bed.shapeIds.filter((id) => id !== shapeId) },
        },
      };
    }),

  addPlantToBed: (shapeId, plant) =>
    set((state) => {
      const existing = state.bedPlants[shapeId] ?? [];
      if (existing.some((p) => p.id === plant.id)) return state;
      return { bedPlants: { ...state.bedPlants, [shapeId]: [...existing, plant] } };
    }),

  removePlantFromBed: (shapeId, plantId) =>
    set((state) => {
      const existing = state.bedPlants[shapeId] ?? [];
      return { bedPlants: { ...state.bedPlants, [shapeId]: existing.filter((p) => p.id !== plantId) } };
    }),

  updatePlantInBed: (shapeId, plantId, patch) =>
    set((state) => {
      const existing = state.bedPlants[shapeId] ?? [];
      return {
        bedPlants: {
          ...state.bedPlants,
          [shapeId]: existing.map((p) =>
            p.id === plantId ? { ...p, ...patch } : p
          ),
        },
      };
    }),

  loadGarden: (state) => set(state),

  clearGarden: () => set({ ...defaultState, id: crypto.randomUUID() }),
}));