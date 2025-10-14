"use client"; // Only needed for App Router

import { useState } from "react";
import Link from "next/link";

export default function HomePage() {
  const [buttons, setButtons] = useState<number[]>([]);
  const maxButtons = 1;

  
  const handleCreateButton = () => {
    if (buttons.length >= maxButtons) return;
    const newLink = `/garden/location-hardiness-${buttons.length + 1}`; // example dynamic path
    setButtons((prev) => [...prev, prev.length+1]);
  };

  const handleDeleteButton = (index: number) => {
  setButtons((prev) => prev.filter((_, i) => i !== index));
  };


  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <button
        onClick={handleCreateButton}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Create New Garden
      </button>

      <div className="flex flex-col gap-4 mt-6 w-full max-w-xs">
        {buttons.map((num, index) => (
          <div
            key={num}
            className="flex flex-col items-center border rounded-lg p-3 shadow-sm bg-gray-50"
          >
            <Link href={`/garden/location-hardiness`} className="w-full text-center">
              <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
                Go to Garden {num}
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
    </div>
  );
}



