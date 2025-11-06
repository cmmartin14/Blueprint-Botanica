"use client";

import { useState } from "react";
import { FiMapPin, FiChevronLeft, FiX } from "react-icons/fi";
import ZoneSelector from "./ZoneSelector";

type VariableWindowProps = {
  isOpen: boolean;
  onClose?: () => void;
};

const VariableWindow = ({ isOpen, onClose }: VariableWindowProps) => {
  const [showZoneSelector, setShowZoneSelector] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed top-34 right-3 w-[360px] h-[460px]
                 rounded-xl bg-white shadow-2xl border border-green-200
                 transition-all duration-300 ease-in-out z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-green-200 px-4 py-2">
        <h2 className="text-lg font-semibold text-green-900">
          {showZoneSelector ? "Select Zone" : "Local Variables"}
        </h2>
      </div>

      {/* Body */}
      <div className="p-4">

        {/* MAIN SCREEN */}
        {!showZoneSelector ? (
          <div className="flex flex-col items-center mt-6 gap-4">

            <button
              onClick={() => setShowZoneSelector(true)}
              className="w-32 h-32 flex flex-col items-center justify-center
                         rounded-xl bg-green-50 border border-green-500
                         text-green-900 transition hover:bg-green-100
                         shadow-sm hover:shadow-md"
            >
              <FiMapPin size={36} className="mb-1" />
              <span className="text-sm font-medium">Set Zone</span>
            </button>
          </div>
        ) : (
          /* ZONE SELECTOR screen */
          <div className="relative">
            {/* Back arrow */}
            <button
              onClick={() => setShowZoneSelector(false)}
              className="absolute -top-8 left-0 text-green-700 hover:text-green-900
                         focus:outline-none flex items-center"
              aria-label="Go back"
            >
              <FiChevronLeft size={20} />
            </button>

            <div className="mt-6 overflow-y-auto max-h-[360px]">
              <ZoneSelector onZoneSelected={(zone) => console.log(zone)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VariableWindow;
