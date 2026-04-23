"use client";

import Link from "next/link";
import { GiOakLeaf } from "react-icons/gi";
import { BsPrinter } from "react-icons/bs";

export function GardenViewActions({ gardenName, bedCount, plantCount }: {
  gardenName: string;
  bedCount: number;
  plantCount: number;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-black text-slate-800">{gardenName}</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {bedCount} bed{bedCount !== 1 ? "s" : ""} · {plantCount} plant{plantCount !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 active:scale-95 transition-transform"
        >
          <BsPrinter size={14} />
          Save as PDF
        </button>
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 transition-transform"
        >
          <GiOakLeaf size={14} />
          Edit
        </Link>
      </div>
    </div>
  );
}
