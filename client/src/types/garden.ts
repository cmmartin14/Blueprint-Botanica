import { Shape } from './shapes';
import { create } from 'zustand';

export interface Bed {
  id: string;
  name: string;
  shapeIds: string[];
  createdAt: number;
}

export interface GardenState {
  id: string;
  name: string;
  editMode: boolean;
  shapes: Record<string, Shape>;
  beds: Record<string, Bed>;
}

type GardenActions = {
  // Canvas meta
  setName: (name: string) => void;
  setEditMode: (value: boolean) => void;

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

  // Persistence
  loadGarden: (state: GardenState) => void;
  clearGarden: () => void;
};

const defaultState: GardenState = {
  id: '',
  name: 'My Garden',
  editMode: false,
  shapes: {},
  beds: {},
};

export const useGardenStore = create<GardenState & GardenActions>((set) => ({
  ...defaultState,

  setName: (name) => set({ name }),
  setEditMode: (editMode) => set({ editMode }),

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

  loadGarden: (state) => set(state),

  clearGarden: () => set({ ...defaultState, id: crypto.randomUUID() }),
}));