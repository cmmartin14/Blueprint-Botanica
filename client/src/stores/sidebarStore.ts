// sidebarStore.ts

import { create } from "zustand";

type SidebarMode = "calendar" | "workspace";

type SidebarStore = {
  mode: SidebarMode;
  isSearchOpen: boolean;
  isCalendarOpen: boolean;
  bedPanelShapeId: string | null;
  setBedPanelShapeId: (shapeId: string | null) => void;

  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;

  openCalendar: () => void;
  closeCalendar: () => void;
  toggleCalendar: () => void;

  openBedPanel: (shapeId: string) => void;
  closeBedPanel: () => void;
};

export const useSidebarStore = create<SidebarStore>((set) => ({
  mode: "workspace",
  isSearchOpen: false,
  isCalendarOpen: false,
  bedPanelShapeId: null,
  setBedPanelShapeId: (shapeId) =>
    set((state) => ({
      ...state,
      bedPanelShapeId: shapeId,
    })),

  openSearch: () =>
    set((state) => ({
      ...state,
      mode: "workspace",
      isSearchOpen: true,
      isCalendarOpen: false,
    })),

  closeSearch: () =>
    set((state) => ({
      ...state,
      isSearchOpen: false,
    })),

  toggleSearch: () =>
    set((state) =>
      state.mode === "workspace" && state.isSearchOpen
        ? {
            ...state,
            isSearchOpen: false,
          }
        : {
            ...state,
            mode: "workspace",
            isSearchOpen: true,
            isCalendarOpen: false,
          }
    ),

  openCalendar: () =>
    set((state) => ({
      ...state,
      mode: "calendar",
      isSearchOpen: false,
      isCalendarOpen: true,
      bedPanelShapeId: null,
    })),

  closeCalendar: () =>
    set((state) => ({
      ...state,
      mode: "workspace",
      isCalendarOpen: false,
      isSearchOpen: false,
      bedPanelShapeId: null,
    })),

  toggleCalendar: () =>
    set((state) =>
      state.mode === "calendar" && state.isCalendarOpen
        ? {
            ...state,
            mode: "workspace",
            isCalendarOpen: false,
            isSearchOpen: false,
            bedPanelShapeId: null,
          }
        : {
            ...state,
            mode: "calendar",
            isSearchOpen: false,
            isCalendarOpen: true,
            bedPanelShapeId: null,
          }
    ),

  openBedPanel: (shapeId: string) =>
    set((state) => ({
      ...state,
      mode: "workspace",
      isSearchOpen: true,
      isCalendarOpen: false,
      bedPanelShapeId: shapeId,
    })),

  closeBedPanel: () =>
    set((state) => ({
      ...state,
      mode: "workspace",
      isSearchOpen: true,
      bedPanelShapeId: null,
    })),
}));
