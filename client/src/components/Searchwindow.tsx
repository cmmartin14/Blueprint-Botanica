"use client";
import { useEffect } from "react";
import PlantSearch from "../components/PlantSearch";

type SearchWindowProps = {
  isOpen: boolean;
  onClose?: () => void;
};

const SearchWindow = ({ isOpen, onClose }: SearchWindowProps) => {
  useEffect(() => {}, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="search-window"
      className="
        fixed z-50 rounded-2xl bg-white shadow-2xl 
        border border-green-200 
        top-45 left-4 w-[400px] h-[520px]
        transition-all duration-300 ease-in-out
      "
    >
      <div className="flex items-center justify-between border-b border-green-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-green-900">Search</h2>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-green-700 transition-colors hover:bg-green-100 hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-green-300"
            aria-label="Close search"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="h-[467px] flex-1 overflow-auto">
        <PlantSearch />
      </div>
    </div>
  );
};

export default SearchWindow;
