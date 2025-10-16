"use client";

import { useState } from "react";
import Link from "next/link";

export default function HomePage() {
  const [buttons, setButtons] = useState<{ id: number; name: string }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [gardenName, setGardenName] = useState("");
  const [variable, setVariable] = useState("");
  const maxButtons = 3;

  const createButton = () => {
    if (buttons.length >= maxButtons) return;
    setShowModal(true);
  };

  const handleConfirmCreation = () => {
    if (!gardenName.trim()) return; // require a name
    const newGarden = {
      id: buttons.length + 1,
      name: gardenName,
    };
    setButtons((prev) => [...prev, newGarden]);
    setShowModal(false);
    setGardenName("");
    setVariable("");
  };

  const handleDeleteButton = (index: number) => {
    setButtons((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      // rename gardens after deletion to keep order neat
      return updated.map((g, i) => ({ ...g, id: i + 1 }));
    });
  };

  return (
    <div className="flex flex-col items-center gap-4 p-8 text-black">
      {/* Create Button */}
      <button
        onClick={createButton}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Create New Garden
      </button>

      {/* Gardens List */}
      <div className="flex flex-col gap-4 mt-6 w-full max-w-xs">
        {buttons.map((garden, index) => (
          <div
            key={garden.id}
            className="flex flex-col items-center border rounded-lg p-3 shadow-sm bg-gray-50"
          >
            <Link href={`/garden/grid-${garden.id}`} className="w-full text-center">
              <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition w-full">
                Go to {garden.name}
              </button>
            </Link>

            <button
              onClick={() => handleDeleteButton(index)}
              className="text-red-600 text-sm mt-2 hover:underline"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-lg p-6 w-80 animate-in fade-in zoom-in">
            

            {/* Garden Name */}
            <label className="block text-sm mb-1">Garden Name</label>
            <input
              type="text"
              value={gardenName}
              onChange={(e) => setGardenName(e.target.value)}
              placeholder="'My super cool garden'"
              className="w-full border rounded p-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Example Variable */}
            <label className="block text-sm mb-1">Variable (e.g. zone)</label>
            <input
              type="text"
              value={variable}
              onChange={(e) => setVariable(e.target.value)}
              placeholder="e.g. 7b"
              className="w-full border rounded p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCreation}
                className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



