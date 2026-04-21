"use client";
import React, { useEffect, useState } from "react";
import { useGardenStore } from "../../types/garden";
import {
  ICON_WINDOW_POPUP_DURATION_MS,
  CHATBOT_POPUP_EASE,
  CHATBOT_POPUP_EXIT_EASE,
} from "../../lib/motion";

interface GardenBedCreatorProps {
  isOpen: boolean;
  initialShapeId?: string;
  onComplete: () => void;
  onCancel: () => void;
}

const GardenBedCreator: React.FC<GardenBedCreatorProps> = ({
  isOpen,
  initialShapeId,
  onComplete,
  onCancel,
}) => {
  const createBed = useGardenStore((s) => s.createBed);
  const [name, setName] = useState("");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createBed(name.trim(), initialShapeId);
      onComplete();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity ${
        isVisible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      style={{
        transitionDuration: `${ICON_WINDOW_POPUP_DURATION_MS}ms`,
        transitionTimingFunction: isVisible
          ? CHATBOT_POPUP_EASE
          : CHATBOT_POPUP_EXIT_EASE,
      }}
    >
      <div
        className={`w-96 rounded-lg border border-gray-200/50 bg-white p-6 shadow-2xl transition-all ${
          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
        style={{
          transitionDuration: `${ICON_WINDOW_POPUP_DURATION_MS}ms`,
          transitionTimingFunction: isVisible
            ? CHATBOT_POPUP_EASE
            : CHATBOT_POPUP_EXIT_EASE,
        }}
      >
        <h2 className="text-xl font-bold mb-4 text-gray-800">Create New Garden Bed</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Bed Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter bed name"
              autoFocus
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md">
              Cancel
            </button>
            <button type="submit" disabled={!name.trim()} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GardenBedCreator;
