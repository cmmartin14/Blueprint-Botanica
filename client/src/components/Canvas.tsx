"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { FaRegCircle, FaSearch } from "react-icons/fa";
import { MdOutlineRectangle, MdOutlineDraw } from "react-icons/md";
import { FaDrawPolygon } from "react-icons/fa";
import { TbCircleXFilled } from "react-icons/tb";
import { FaEdit } from "react-icons/fa";

import { Shape, Position } from "../types/shapes";
import ShapeRenderer from "./ShapeRenderer";
import SearchWindow from "./Searchwindow";

const Canvas = () => {
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const toggleSearchWindow = () => setIsSearchOpen((prev) => !prev);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Edit mode toggle
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const toggleEditMode = () => setIsEditing((prev) => !prev);

  // Freehand drawing mode
  const [isFreehandMode, setIsFreehandMode] = useState(false);
  const [freehandPaths, setFreehandPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Create shape at canvas center
  const createShape = useCallback(
    (shapeType: "rectangle" | "circle" | "line") => {
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const centerX = (rect.width / 2 - pan.x) / scale;
      const centerY = (rect.height / 2 - pan.y) / scale;

      let newShape: Shape;

      switch (shapeType) {
        case "rectangle":
          newShape = {
            id: Date.now().toString(),
            type: "rectangle",
            startPos: { x: centerX - 50, y: centerY - 30 },
            endPos: { x: centerX + 50, y: centerY + 30 },
            color: "#3b82f6",
            strokeWidth: 2,
          };
          break;
        case "circle":
          newShape = {
            id: Date.now().toString(),
            type: "circle",
            startPos: { x: centerX - 40, y: centerY - 40 },
            endPos: { x: centerX + 40, y: centerY + 40 },
            color: "#3b82f6",
            strokeWidth: 2,
          };
          break;
        case "line":
          newShape = {
            id: Date.now().toString(),
            type: "line",
            startPos: { x: centerX - 50, y: centerY },
            endPos: { x: centerX + 50, y: centerY },
            color: "#3b82f6",
            strokeWidth: 2,
          };
          break;
      }

      setShapes((prev) => [...prev, newShape]);
    },
    [pan, scale]
  );

  // Pan/zoom logic
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && !isFreehandMode) {
        const newPan = {
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        };
        setPan(newPan);
      } else if (isFreehandMode && currentPath !== null && svgRef.current) {
        const svg = svgRef.current;
        const rect = svg.getBoundingClientRect();
        const x = (e.clientX - rect.left - pan.x) / scale;
        const y = (e.clientY - rect.top - pan.y) / scale;
        setCurrentPath((prev) => (prev ? `${prev} L ${x} ${y}` : `M ${x} ${y}`));
      }
    },
    [isDragging, dragStart, isFreehandMode, currentPath, pan, scale]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isFreehandMode) {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const x = (e.clientX - rect.left - pan.x) / scale;
        const y = (e.clientY - rect.top - pan.y) / scale;
        setCurrentPath(`M ${x} ${y}`);
      } else {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    },
    [isFreehandMode, pan, scale]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) setIsDragging(false);
    if (isFreehandMode && currentPath) {
      setFreehandPaths((prev) => [...prev, currentPath]);
      setCurrentPath(null);
    }
  }, [isDragging, isFreehandMode, currentPath]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    setScale((prev) => Math.min(Math.max(prev * delta, 0.75), 2));
  }, []);

  useEffect(() => {
    const handleMouseUpGlobal = () => setIsDragging(false);
    document.addEventListener("mouseup", handleMouseUpGlobal);
    return () => document.removeEventListener("mouseup", handleMouseUpGlobal);
  }, []);

  const gridSize = 20;
  const gridStyle = {
    backgroundImage: `
      linear-gradient(to right, #e5e7eb 1px, transparent 1px),
      linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
    `,
    backgroundSize: `${gridSize * scale}px ${gridSize * scale}px`,
    backgroundPosition: `${pan.x % (gridSize * scale)}px ${
      pan.y % (gridSize * scale)
    }px`,
  };

  return (
    <div className="fixed inset-0 top-16 overflow-hidden bg-white">
      {/* Edit Mode Toggle Button */}
      {!isEditing && (
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={toggleEditMode}
            className="px-4 py-3 rounded-xl text-black font-medium shadow-xl transition bg-gray-200 hover:bg-gray-300"
          >
            <FaEdit size={25} />
          </button>
        </div>
      )}

      <SearchWindow
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Search Button */}
      <div className="absolute top-26 left-4 z-50 flex items-center gap-3">
        <button
          onClick={toggleSearchWindow}
          className={`px-4 py-3 rounded-xl font-medium shadow-xl transition-colors bg-gray-200 hover:bg-gray-300 ${
            isSearchOpen
              ? "bg-green-700 text-white"
              : "bg-white/90 text-green-800 hover:bg-gray-300"
          }`}
          aria-pressed={isSearchOpen}
          aria-label={isSearchOpen ? "Hide search window" : "Show search window"}
          type="button"
        >
          <FaSearch size={25} />
        </button>
      </div>

      {/* Main Canvas */}
      <div
        ref={canvasRef}
        data-canvas
        className="w-full h-full"
        style={gridStyle}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          className="relative w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          {/* Shapes layer */}
          <ShapeRenderer
            shapes={shapes}
            scale={scale}
            onShapeUpdate={(shapeId, updates) => {
              setShapes((prev) =>
                prev.map((shape) =>
                  shape.id === shapeId ? { ...shape, ...updates } : shape
                )
              );
            }}
          />

          {/* Freehand SVG layer */}
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {freehandPaths.map((d, i) => (
              <path
                key={i}
                d={d}
                stroke="black"
                strokeWidth={2 / scale}
                fill="none"
              />
            ))}
            {currentPath && (
              <path
                d={currentPath}
                stroke="black"
                strokeWidth={2 / scale}
                fill="none"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Shape Creation Controls */}
      {isEditing && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 border">
          <div className="flex gap-2">
            <button
              onClick={() => createShape("rectangle")}
              className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              <MdOutlineRectangle size={35} />
            </button>
            <button
              onClick={() => createShape("circle")}
              className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              <FaRegCircle size={25} />
            </button>
            <button
              onClick={() => createShape("line")}
              className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              <FaDrawPolygon size={25} />
            </button>
            <button
              onClick={() => setIsFreehandMode((prev) => !prev)} // THIS BUTTON
              className={`px-3 py-2 text-sm rounded ${
                isFreehandMode
                  ? "bg-green-200"
                  : "bg-gray-100 hover:bg-gray-200"
              } text-gray-700`}
            >
              <MdOutlineDraw size={25} />
            </button>
            <button
              onClick={toggleEditMode}
              className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              <TbCircleXFilled size={25} />
            </button>
          </div>
        </div>
      )}

      {/* Canvas Controls */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 border">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Zoom: {Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(1)}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
          >
            Reset
          </button>
          <button
            onClick={() => setShapes([])}
            className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs"
          >
            Clear Shapes
          </button>
          <button
            onClick={() => setFreehandPaths([])}
            className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs"
          >
            Clear Drawing
          </button>
        </div>
      </div>
    </div>
  );
};

export default Canvas;

