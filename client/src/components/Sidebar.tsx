// Sidebar.tsx
"use client";

import { useEffect, useState } from "react";

import SearchWindow from "./Searchwindow";
import CalendarWindow from "./Calendar";
import FlowerBedPanel from "./FlowerBedPanel";
import {
  ICON_WINDOW_POPUP_DURATION_MS,
  CHATBOT_POPUP_EASE,
  CHATBOT_POPUP_EXIT_EASE,
} from "../lib/motion";

type SidebarMode = "calendar" | "workspace";

type Props = {
  mode: SidebarMode;
  showCalendar: boolean;
  showSearch: boolean;
  showBedInfo: boolean;
  selectedShapeId: string | null;
  zone?: string | null;
  onCloseSearch: () => void;
  onCloseCalendar: () => void;
  onCloseBedInfo: () => void;
};

export default function Sidebar({
  mode,
  showCalendar,
  showSearch,
  showBedInfo,
  selectedShapeId,
  zone,
  onCloseSearch,
  onCloseCalendar,
  onCloseBedInfo,
}: Props) {
  const bedShapeId = showBedInfo ? selectedShapeId : null;
  const isOpen = showCalendar || showSearch || Boolean(bedShapeId);
  const showCalendarView = mode === "calendar" && showCalendar;
  const showWorkspace = !showCalendarView && (showSearch || Boolean(bedShapeId));
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      return;
    }

    if (!shouldRender) return;
    setIsClosing(true);

    const timeout = window.setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
    }, ICON_WINDOW_POPUP_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, [isOpen, shouldRender]);

  if (!shouldRender) return null;

  const isVisible = isOpen && !isClosing;

  return (
    <div
      className={`fixed left-2 top-[72px] bottom-2 z-40 w-[33vw] min-w-[320px] max-w-[520px] overflow-hidden rounded-[30px] border border-gray-200/50 bg-[#eef6ea]/92 shadow-2xl backdrop-blur-md transition-all origin-top-left ${
        isVisible ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95"
      }`}
      style={{
        transitionDuration: `${ICON_WINDOW_POPUP_DURATION_MS}ms`,
        transitionTimingFunction: isVisible
          ? CHATBOT_POPUP_EASE
          : CHATBOT_POPUP_EXIT_EASE,
      }}
    >
      <div className="flex h-full min-h-0 flex-col p-2">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-gray-200/50 bg-[#f7fbf5] shadow-2xl">
          {showCalendarView && (
            <div className="min-h-0 flex-1">
              <CalendarWindow
                isOpen={true}
                onClose={onCloseCalendar}
                sidebarMode={true}
              />
            </div>
          )}

          {showWorkspace && (
            <div className="flex h-full min-h-0 flex-col">
              {bedShapeId && showSearch ? (
                <>
                  <div className="min-h-0 flex-1 border-b border-[#dce9d8]">
                    <FlowerBedPanel
                      shapeId={bedShapeId}
                      zone={zone}
                      sidebarMode={true}
                      onClose={onCloseBedInfo}
                    />
                  </div>

                  <div className="min-h-0 flex-1">
                    <SearchWindow
                      isOpen={true}
                      onClose={onCloseSearch}
                      sidebarMode={true}
                      sidebarCornerMode="bottom"
                    />
                  </div>
                </>
              ) : bedShapeId ? (
                <div className="min-h-0 flex-1">
                  <FlowerBedPanel
                    shapeId={bedShapeId}
                    zone={zone}
                    sidebarMode={true}
                    onClose={onCloseBedInfo}
                  />
                </div>
              ) : showSearch ? (
                <div className="min-h-0 flex-1">
                  <SearchWindow
                    isOpen={true}
                    onClose={onCloseSearch}
                    sidebarMode={true}
                    sidebarCornerMode="full"
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
