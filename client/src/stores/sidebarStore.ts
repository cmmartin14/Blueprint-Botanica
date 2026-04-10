// sidebarStore.ts

import { create } from "zustand";

type SidebarMode = "calendar" | "workspace";

type SidebarStore = {
  mode: SidebarMode;
  isSearchOpen: boolean;
  isCalendarOpen: boolean;
  bedPanelShapeId: string | null;

  openSearch: () => void;
  closeSearch: () => void;

  openCalendar: () => void;
  closeCalendar: () => void;

  openBedPanel: (shapeId: string) => void;
  closeBedPanel: () => void;
};

export const useSidebarStore = create<SidebarStore>((set) => ({
  mode: "workspace",
  isSearchOpen: false,
  isCalendarOpen: false,
  bedPanelShapeId: null,

  openSearch: () =>
    set({
      mode: "workspace",
      isSearchOpen: true,
      isCalendarOpen: false,
    }),

  closeSearch: () =>
    set((state) => ({
      ...state,
      isSearchOpen: false,
    })),

  openCalendar: () =>
    set({
      mode: "calendar",
      isSearchOpen: false,
      isCalendarOpen: true,
    }),

  closeCalendar: () =>
    set((state) => ({
      ...state,
      isCalendarOpen: false,
    })),

  openBedPanel: (shapeId: string) =>
    set({
      mode: "workspace",
      isSearchOpen: true,
      isCalendarOpen: false,
      bedPanelShapeId: shapeId,
    }),

  closeBedPanel: () =>
    set((state) => ({
      ...state,
      mode: "workspace",
      isSearchOpen: true,
      bedPanelShapeId: null,
    })),
}));