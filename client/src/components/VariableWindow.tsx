"use client";

import { useEffect, useState } from "react";
import { FiMapPin, FiChevronLeft } from "react-icons/fi";
import { LuX } from "react-icons/lu";
import { useGardenStore } from "../types/garden";
import ZoneSelector from "./ZoneSelector";
import {
  ICON_WINDOW_POPUP_DURATION_MS,
  CHATBOT_POPUP_EASE,
  CHATBOT_POPUP_EXIT_EASE,
} from "../lib/motion";

type VariableWindowProps = {
  isOpen: boolean;
  onClose?: () => void;
};

const VariableWindow = ({ isOpen, onClose }: VariableWindowProps) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [showZoneSelector, setShowZoneSelector] = useState(false);
  const zone = useGardenStore((s) => s.zone);
  const setZone = useGardenStore((s) => s.setZone);
  const setHardinessZone = useGardenStore((s) => s.setHardinessZone);

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
      data-testid="variable-window"
      className={`fixed right-3 top-24 z-50 h-[460px] w-[360px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[28px] border border-[#dce9d8] bg-[#F7FBF5] shadow-[0_24px_64px_rgba(25,64,41,0.18)] transition-all origin-top-right ${
        isVisible ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95"
      }`}
      style={{
        transitionDuration: `${ICON_WINDOW_POPUP_DURATION_MS}ms`,
        transitionTimingFunction: isVisible
          ? CHATBOT_POPUP_EASE
          : CHATBOT_POPUP_EXIT_EASE,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#dce9d8] bg-[#ecf5e8]/90 px-4 py-3 backdrop-blur-md">
        <h2 className="text-lg font-semibold text-green-900">
          {showZoneSelector ? "Select Zone" : "Local Variables"}
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="chatbot-pop-trigger rounded-full p-2 text-green-700 hover:bg-white hover:shadow-sm hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-[#8cc69f] [--chatbot-pop-hover-transform:translateY(-1px)_scale(1.04)_rotate(6deg)]"
            aria-label="Close local variables"
          >
            <LuX size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="h-[calc(100%-61px)] bg-gradient-to-br from-[#f5fbf3] to-[#eef6ea] p-4">

        {/* MAIN SCREEN */}
        {!showZoneSelector ? (
          <div className="flex flex-col items-center mt-6 gap-4">

            <button
              onClick={() => setShowZoneSelector(true)}
              className="chatbot-pop-trigger flex h-32 w-32 flex-col items-center justify-center rounded-xl border border-green-500 bg-green-50 text-green-900 shadow-sm hover:bg-green-100 hover:shadow-md"
            >
              <FiMapPin size={36} className="mb-1" />
              <span className="text-sm font-medium">
                {zone ? `Zone ${zone}` : "Set Zone"}
              </span>
            </button>
          </div>
        ) : (
          /* ZONE SELECTOR screen */
          <div className="relative">
            {/* Back arrow */}
            <button
              onClick={() => setShowZoneSelector(false)}
              className="chatbot-pop-trigger absolute -top-8 left-0 flex items-center text-green-700 hover:text-green-900 focus:outline-none [--chatbot-pop-hover-transform:translateY(-1px)_scale(1.04)_translateX(-2px)]"
              aria-label="Go back"
            >
              <FiChevronLeft size={20} />
            </button>

            <div className="mt-6 overflow-y-auto max-h-[360px]">
              <ZoneSelector onZoneSelected={(zone) => setHardinessZone(zone)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VariableWindow;
