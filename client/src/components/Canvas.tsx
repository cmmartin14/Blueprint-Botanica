"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { FaEdit, FaSearch } from "react-icons/fa";
import { TbHomeEdit, TbCircleXFilled } from "react-icons/tb";
import { MdOutlineDraw, MdOutlineRectangle } from "react-icons/md";
import { FaRegCircle, FaDrawPolygon } from "react-icons/fa";
import ShapeRenderer from "./ShapeRenderer";
import { Shape, Position } from "../types/shapes";
import { Bed } from "../types/beds"
import SearchWindow from "./Searchwindow";
import VariableWindow from "./VariableWindow";

const Canvas = () => {
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [beds, setBeds] = useState<Bed[]>([])//the list of all beds in the garden
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVariableOpen, setIsVariableOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [drawMode, setDrawMode] = useState<"none" | "freehand">("none");
  const [isDrawing, setIsDrawing] = useState(false);
  const [shouldCreateBed, setShouldCreateBed] = useState(false);
  const [currentPath, setCurrentPath] = useState<Position[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);

  

  // --- Toggles ---
  const toggleSearchWindow = () => setIsSearchOpen((prev) => !prev);
  const toggleVariableWindow = () => setIsVariableOpen((prev) => !prev);
  const toggleEditMode = () => setIsEditing((prev) => !prev);

  // --- Shape creation ---
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
        default:
          return;
      }

      setShapes((prev) => [...prev, newShape]);
    },
    [pan, scale]
  );
  // --- Bed creation ---
  const createBed = useCallback((shapeType: "rectangle" | "circle" | "line") => {
    //Step 1: Create a new Shape
    createShape(shapeType)
    //Step 2: set a variable to indicate to the useEffect that we want to add the shape to the bed's list of shapes
    setShouldCreateBed(true);
  }
   

  );
  /********************************
   * This useEffect updates the list of shapes within the bed object immediately after the bed is created 
   *********************************/ 
  useEffect(() => {
      if (shapes.length === 0 || shouldCreateBed === false) return; // skip first render
      // make a bed from the most recently added shape
      const newBed = new Bed(shapes[shapes.length - 1].id, Date.now().toString());
      setBeds((prev) => [...prev, newBed]);
      setShouldCreateBed(false)
      //console.log(`Created bed for shape ${shapes[shapes.length - 1].id}`);
      //console.log(beds.length)
    }, [shapes]);


  // --- Panning and zooming ---
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPan({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }

      if (drawMode === "freehand" && isDrawing && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - pan.x) / scale;
        const y = (e.clientY - rect.top - pan.y) / scale;
        setCurrentPath((prev) => [...prev, { x, y }]);
      }
    },
    [isDragging, dragStart, drawMode, isDrawing, pan, scale]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (drawMode === "freehand") {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - pan.x) / scale;
        const y = (e.clientY - rect.top - pan.y) / scale;
        setCurrentPath([{ x, y }]);
        setIsDrawing(true);
        return;
      }

      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan, scale, drawMode]
  );

  const handleMouseUp = useCallback(() => {
    if (drawMode === "freehand" && isDrawing && currentPath.length > 1) {
      const newShape: Shape = {
        id: Date.now().toString(),
        type: "freehand",
        points: currentPath,
        color: "#3b82f6",
        strokeWidth: 2,
        startPos: currentPath[0],
        endPos: currentPath[currentPath.length - 1],
      };
      setShapes((prev) => [...prev, newShape]);
      setIsDrawing(false);
      setCurrentPath([]);
    }
    setIsDragging(false);
  }, [drawMode, isDrawing, currentPath]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    setScale((prev) => Math.min(Math.max(prev * delta, 0.75), 2));
  }, []);

  // --- Grid style ---
  const gridSize = 20;
  const safeScale = scale || 1;
  const gridStyle = {
    backgroundColor: "#6D8934", // soft gray to ensure it's visible
    backgroundImage: `
      linear-gradient(to right, #9EAD73 1px, transparent 1px),
      linear-gradient(to bottom, #9EAD73 1px, transparent 1px)
    `,
    backgroundSize: `${gridSize * safeScale}px ${gridSize * safeScale}px`,
    backgroundPosition: `${pan.x % (gridSize * safeScale)}px ${pan.y % (gridSize * safeScale)}px`,
  };

  return (
    <div className="fixed inset-0 top-16 overflow-hidden bg-gray-50">
      {/* --- Always visible toolbar --- */}
      <div className="absolute top-4 left-4 flex gap-2 z-50">
        <button
          onClick={toggleSearchWindow}
          className="p-3 bg-white hover:bg-gray-200 rounded-xl shadow text-green-800"
          title="Search"
        >
          <FaSearch size={22} />
        </button>

        {!isEditing && (
          <button
            onClick={toggleEditMode}
            className="p-3 bg-white hover:bg-gray-200 rounded-xl shadow text-green-800"
            title="Edit Mode"
          >
            <FaEdit size={22} />
          </button>
        )}
      </div>

      <SearchWindow isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <VariableWindow isOpen={isVariableOpen} onClose={() => setIsVariableOpen(false)} />

      {/* --- Canvas Area --- */}
      <div
        ref={canvasRef}
        data-canvas
        className="w-full h-full relative"
        style={gridStyle}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          className="absolute w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          <ShapeRenderer
            shapes={shapes}
            scale={scale}
            onShapeUpdate={(shapeId, updates) => {
              setShapes((prev) =>
                prev.map((shape) => (shape.id === shapeId ? { ...shape, ...updates } : shape))
              );
            }}
          />
          {/* Temporary line while drawing */}
          {drawMode === "freehand" && isDrawing && currentPath.length > 1 && (
            <svg className="absolute inset-0 pointer-events-none">
              <polyline
                points={currentPath.map((p) => `${p.x},${p.y}`).join(" ")}
                stroke="#3b82f6"
                strokeWidth={2}
                fill="none"
              />
            </svg>
          )}
        </div>
      </div>

      {/* --- Shape Tools (only in edit mode) --- */}
      {isEditing && (
        <div className="absolute top-4 left-4 mt-16 bg-white rounded-lg shadow-lg p-3 border z-40">
          <div className="flex gap-2">
            <button
              onClick={() => createBed("rectangle")}
              className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
              title="Rectangle"
            >
              <MdOutlineRectangle size={30} />
            </button>
            <button
              onClick={() => createShape("circle")}
              className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
              title="Circle"
            >
              <FaRegCircle size={25} />
            </button>
            <button
              onClick={() => createShape("line")}
              className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
              title="Line"
            >
              <FaDrawPolygon size={25} />
            </button>
            <button
              onClick={() =>
                setDrawMode((prev) => (prev === "freehand" ? "none" : "freehand"))
              }
              className={`p-2 rounded ${
                drawMode === "freehand"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-green-800 hover:bg-gray-200"
              }`}
              title="Freehand"
            >
              <MdOutlineDraw size={25} />
            </button>
            <button
              onClick={toggleEditMode}
              className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
              title="Exit Edit Mode"
            >
              <TbCircleXFilled size={25} />
            </button>
          </div>
        </div>
      )}

      {/* --- Bottom Right Controls --- */}
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
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default Canvas;






