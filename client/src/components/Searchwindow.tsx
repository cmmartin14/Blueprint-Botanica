"use client";
import { useEffect, useState } from "react";


type SearchWindowProps = {
  isOpen: boolean;
  onClose?: () => void;
  defaultFullscreen?: boolean;
};

const SearchWindow = ({ isOpen, onClose, defaultFullscreen = false }: SearchWindowProps) => {
  const [isFullscreen, setIsFullscreen] = useState(defaultFullscreen);

  useEffect(() => {
      if (!isOpen) setIsFullscreen(false);
    }, [isOpen]);

  if (!isOpen) return null;

  const toggleFullscreen = () => setIsFullscreen((prev) => !prev);
  
  return (
    <div
      className={`fixed z-50 rounded-2xl bg-white shadow-2xl border border-green-200 transition-all duration-300 ease-in-out ${
        isFullscreen ? "inset-24": "top-56 left-4 w-[400px] h-[520px]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-green-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-green-900">Search</h2>
  
        <div className="flex gap-2">
        <button
          type="button"
          onClick={toggleFullscreen}
          className="rounded-md p-1 text-green-700 transition-colors hover:bg-green-100 hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-green-300"
          aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
        >
          {isFullscreen ? (
            <>
              {/* Exit fullscreen icon */}
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 3H5a2 2 0 0 0-2 2v4" />
                <path d="M15 21h4a2 2 0 0 0 2-2v-4" />
                <path d="M21 9V5a2 2 0 0 0-2-2h-4" />
                <path d="M3 15v4a2 2 0 0 0 2 2h4" />
              </svg>
            </>
          ) : (
            <>
              {/* Enter fullscreen icon */}
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6" />
                <path d="M9 21H3v-6" />
                <path d="M21 9l-7-7" />
                <path d="M3 15l7 7" />
              </svg>
              </>
          )}
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-green-700 transition-colors hover:bg-green-100 hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-green-300"
            aria-label="Close search"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        )}
        </div>
      </div>


      <div className="flex h-full flex-col justify-center px-6 py-8 text-center">
        <h3 className="mt-3 text-2xl font-semibold text-green-900">Search is on the way</h3>
      </div>
    </div>
  );
};

export default SearchWindow;
