"use client";
import { useEffect, useState } from "react";
import PlantSearch from "../components/PlantSearch";
import { LuBook, LuX } from "react-icons/lu";
import {
  ICON_WINDOW_POPUP_DURATION_MS,
  CHATBOT_POPUP_EASE,
  CHATBOT_POPUP_EXIT_EASE,
} from "../lib/motion";

type SearchWindowProps = {
  isOpen: boolean;
  onClose?: () => void;
};

const SearchWindow = ({ isOpen, onClose }: SearchWindowProps) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  // Handle bouncy open/close animation mounting
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      return;
    }

    if (!shouldRender) return;
    setIsClosing(true);
    // Wait for the exit animation to finish before unmounting
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
      id="search-window"
      data-testid="search-window"
      className={`
        fixed z-50 top-20 left-6 md:left-24 w-[440px] max-w-[92vw] h-[640px] max-h-[85vh]
        rounded-[32px] bg-[#F7FBF5] shadow-[0_24px_64px_rgba(25,64,41,0.18)] 
        border border-[#dce9d8] flex flex-col overflow-hidden font-sans
        transition-all duration-500 origin-top-left
        ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}
      `}
      style={{
        transitionDuration: `${ICON_WINDOW_POPUP_DURATION_MS}ms`,
        transitionTimingFunction: isVisible
          ? CHATBOT_POPUP_EASE
          : CHATBOT_POPUP_EXIT_EASE,
      }}
    >
      {/* Header */}
      <div className="bg-[#ecf5e8]/90 backdrop-blur-md px-5 py-4 flex items-center justify-between border-b border-[#dce9d8]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#8cc69f] rounded-full flex items-center justify-center text-white shadow-sm ring-2 ring-white/50">
            <LuBook size={22} />
          </div>
          <h2 className="text-lg font-bold text-green-900 tracking-tight">Plant Library</h2>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="chatbot-pop-trigger rounded-full p-2 text-green-700 hover:bg-white hover:shadow-sm hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-[#8cc69f] [--chatbot-pop-hover-transform:translateY(-1px)_scale(1.04)_rotate(6deg)]"
            aria-label="Close search"
          >
            <LuX size={20} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-hidden bg-gradient-to-br from-[#f5fbf3] to-[#eef6ea]">
        <PlantSearch />
      </div>
    </div>
  );
};

export default SearchWindow;
