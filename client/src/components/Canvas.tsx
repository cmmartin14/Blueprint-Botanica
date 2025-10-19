"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { FaRegCircle, FaSearch } from "react-icons/fa";
import { MdOutlineRectangle, MdOutlineDraw } from "react-icons/md";
import { FaDrawPolygon } from "react-icons/fa";
import { TbCircleXFilled, TbHomeEdit } from "react-icons/tb";
import { FaEdit } from "react-icons/fa";
import { Shape, Position } from "../types/shapes";
import ShapeRenderer from "./ShapeRenderer";
import SearchWindow from "./Searchwindow";
import VariableWindow from "./VariableWindow";

const Canvas = () => {
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVariableOpen, setIsVariableOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<"none" | "freehand">("none");
  const canvasRef = useRef<HTMLDivElement>(null);

  const toggleSearchWindow = () => setIsSearchOpen((prev) => !prev);
  const toggleVariableWindow = () => setIsVariableOpen((prev) => !prev);
  const toggleEditMode = () => setIsEditing((prev) => !prev);

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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (drawMode === "freehand") {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = (e.clientX - rect.left - pan.x) / scale;
        const y = (e.clientY - rect.top - pan.y) / scale;

        const newShape: Shape = {
          id: Date.now().toString(),
          type: "freehand",
          points: [{ x, y }],
          color: "#3b82f6",
          strokeWidth: 2,
          startPos: { x, y },
          endPos: { x, y },
        };

        setShapes((prev) => [...prev, newShape]);
        setIsDrawing(true);
        return;
      }

      // Otherwise, start panning
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [drawMode, pan, scale]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDrawing && drawMode === "freehand") {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = (e.clientX - rect.left - pan.x) / scale;
        const y = (e.clientY - rect.top - pan.y) / scale;

        setShapes((prev) => {
          const updated = [...prev];
          const lastShape = updated[updated.length - 1];
          if (lastShape?.type === "freehand") {
            lastShape.points = [...(lastShape.points || []), { x, y }];
            lastShape.endPos = { x, y };
          }
          return updated;
        });
      } else if (isDragging && drawMode === "none") {
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      }
    },
    [isDrawing, drawMode, isDragging, dragStart, scale, pan]
  );

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    setScale((prev) => Math.min(Math.max(prev * delta, 0.75), 2));
  }, []);

  useEffect(() => {
    const handleMouseUpGlobal = () => {
      setIsDrawing(false);
      setIsDragging(false);
    };
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
      {/* Edit Mode Toggle */}
      {!isEditing && (
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={toggleEditMode}
            className="px-4 py-3 rounded-xl text-green-800 font-medium shadow-xl bg-white hover:bg-gray-300"
          >
            <FaEdit size={25} />
          </button>
        </div>
      )}

      <SearchWindow isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <VariableWindow isOpen={isVariableOpen} onClose={() => setIsVariableOpen(false)} />

      {/* Canvas */}
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
        </div>
      </div>

      {/* Shape Creation Toolbar */}
      {isEditing && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 border">
          <div className="flex gap-2">
            <button
              onClick={() => createShape("rectangle")}
              className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
            >
              <MdOutlineRectangle size={30} />
            </button>
            <button
              onClick={() => createShape("circle")}
              className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
            >
              <FaRegCircle size={25} />
            </button>
            <button
              onClick={() => createShape("line")}
              className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
            >
              <FaDrawPolygon size={25} />
            </button>
            <button
              onClick={() =>
                setDrawMode(drawMode === "freehand" ? "none" : "freehand")
              }
              className={`p-2 rounded ${
                drawMode === "freehand"
                  ? "bg-green-700 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-green-800"
              }`}
            >
              <MdOutlineDraw size={25} />
            </button>
            <button
              onClick={toggleEditMode}
              className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
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
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default Canvas;




