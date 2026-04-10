// Sidebar.tsx

"use client";

import SearchWindow from "./SearchWindow";
import CalendarWindow from "./Calendar";
import FlowerBedPanel from "./FlowerBedPanel";

type SidebarMode = "calendar" | "search";

type Props = {
  mode: SidebarMode;
  showSearch: boolean;
  showBedInfo: boolean;
  selectedShapeId: string | null;
  onCloseBedInfo: () => void;
};

export default function Sidebar({
  mode,
  showSearch,
  showBedInfo,
  selectedShapeId,
  onCloseBedInfo,
}: Props) {
  return (
    <div
      className="
        fixed left-0
        top-[64px]   /* adjust if your navbar height differs */
        bottom-0
        w-[33vw] min-w-[320px] max-w-[520px]
        bg-[#F7FBF5]
        border-r border-[#dce9d8]
        z-40
        flex flex-col
      "
    >
      {/* ===================== CALENDAR MODE ===================== */}
      {mode === "calendar" && (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Fixed calendar */}
          <div className="shrink-0">
            <CalendarWindow isOpen={true} />
          </div>

          {/* Scrollable lower content */}
          <div className="flex-1 overflow-y-auto">
            {/* Calendar already contains weather/notes/alerts */}
          </div>
        </div>
      )}

      {/* ===================== SEARCH / BED MODE ===================== */}
      {mode === "search" && (
        <div className="flex flex-col h-full">
          {/* BOTH OPEN → 50/50 */}
          {showSearch && showBedInfo ? (
            <>
              {/* Bed Info (TOP) */}
              <div className="h-1/2 overflow-y-auto border-b border-[#dce9d8]">
                <FlowerBedPanel
                  shapeId={selectedShapeId}
                  onClose={onCloseBedInfo}
                />
              </div>

              {/* Search (BOTTOM) */}
              <div className="h-1/2 overflow-y-auto">
                <SearchWindow isOpen={true} />
              </div>
            </>
          ) : (
            <>
              {/* ONLY SEARCH */}
              {showSearch && (
                <div className="flex-1 overflow-y-auto">
                  <SearchWindow isOpen={true} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}