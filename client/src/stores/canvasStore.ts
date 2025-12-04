"use client";
import { create } from "zustand";

interface CanvasStore {
  editMode: boolean;
  setEditMode: (value: boolean) => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  editMode: false,
  setEditMode: (value) => set({ editMode: value }),
}));
