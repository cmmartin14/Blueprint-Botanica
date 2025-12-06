"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { FaEdit, FaLeaf, FaRegCircle, FaDrawPolygon, FaUndoAlt, FaRedoAlt, FaTrashAlt } from "react-icons/fa";
import { TbCircleXFilled, TbCalendar } from "react-icons/tb";
import { MdOutlineRectangle } from "react-icons/md";

import ShapeRenderer from "./ShapeRenderer";
import { Shape, Position } from "../types/shapes";
import SearchWindow from "./Searchwindow";
import VariableWindow from "./VariableWindow";
import Calendar from "./Calendar";
import { useGardenBed } from "./hooks/useGardenBed";
import GardenBedCreator from "./garden/GardenBedCreator";
import { useCanvasStore } from "../stores/canvasStore";

const Canvas = () => {
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVariableOpen, setIsVariableOpen] = useState(false);
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const { createGardenBed } = useGardenBed();
  const [showGardenBedCreator, setShowGardenBedCreator] = useState(false);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  // Undo/redo state
  const [history, setHistory] = useState<Shape[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Use store for edit mode
  const { editMode, setEditMode } = useCanvasStore();

  // Push new state to history
  const pushHistory = useCallback((newShapes: Shape[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, newShapes]);
    setHistoryIndex(newHistory.length);
    setShapes(newShapes);
  }, [history, historyIndex]);

  const createShape = useCallback(
    (shapeType: "circle" | "line") => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const centerX = (rect.width / 2 - pan.x) / scale;
      const centerY = (rect.height / 2 - pan.y) / scale;

      let newShape: Shape;

      switch (shapeType) {
        case "circle":
          newShape = {
            id: Date.now().toString(),
            type: "circle",
            startPos: { x: centerX - 40, y: centerY - 40 },
            endPos: { x: centerX + 40, y: centerY + 40 },
            color: "#ffffff",
            strokeWidth: 2,
          };
          break;

        case "line":
          newShape = {
            id: Date.now().toString(),
            type: "line",
            startPos: { x: centerX - 50, y: centerY },
            endPos: { x: centerX + 50, y: centerY },
            color: "#ffffff",
            strokeWidth: 2,
          };
          break;

        default:
          return;
      }

      pushHistory([...shapes, newShape]);
    },
    [pan, scale, shapes, pushHistory]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPan({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    setScale((prev) => Math.min(Math.max(prev * delta, 0.75), 2));
  }, []);

  const gridSize = 20;
  const safeScale = scale || 1;
  const gridStyle = {
    backgroundColor: "#6D8934",
    backgroundImage: `
      linear-gradient(to right, #9EAD73 1px, transparent 1px),
      linear-gradient(to bottom, #9EAD73 1px, transparent 1px)
    `,
    backgroundSize: `${gridSize * safeScale}px ${gridSize * safeScale}px`,
    backgroundPosition: `${pan.x % (gridSize * safeScale)}px ${
      pan.y % (gridSize * safeScale)
    }px`,
  };

  // Delete selected shape (backspace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace" && selectedShapeId) {
        pushHistory(shapes.filter(shape => shape.id !== selectedShapeId));
        setSelectedShapeId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedShapeId, shapes, pushHistory]);

  return (
    <div className="fixed inset-0 top-16 overflow-hidden bg-gray-50">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 flex gap-2 z-50">
        {showGardenBedCreator && (
          <GardenBedCreator
            onCreate={(name: string) => {
              createGardenBed(name);
              setShowGardenBedCreator(false);
            }}
            onCancel={() => setShowGardenBedCreator(false)}
          />
        )}


      </div>

      <SearchWindow isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <VariableWindow isOpen={isVariableOpen} onClose={() => setIsVariableOpen(false)} />
      <Calendar data-testid="calendar-window" isOpen={isCalendarOpen} onClose={() => setCalendarOpen(false)} />

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
          data-transformed
          className="absolute w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          <ShapeRenderer
            shapes={shapes}
            scale={scale}
            pan={pan}
            unit="feet"
            gridToUnit={1}
            onShapeUpdate={(shapeId, updates) => {
              const newShapes = shapes.map((shape) =>
                shape.id === shapeId ? ({ ...shape, ...updates } as Shape) : shape
              );
              pushHistory(newShapes);
            }}
            onShapeSelect={(shapeId) => setSelectedShapeId(shapeId)}
          />
        </div>
      </div>

      {/* Shape Tools */}
      {editMode && (
        <div
          data-testid="edit-window"
          className="absolute top-4 left-4 mt-10 bg-white rounded-lg shadow-lg p-3 border z-40"
        >
          <div className="flex gap-2">
            {/* Circle */}
            <button
              onClick={() => createShape("circle")}
              className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
              title="Circle"
            >
              <FaRegCircle size={25} />
            </button>

            {/* Line */}
            <button
              onClick={() => createShape("line")}
              className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
              title="Line"
            >
              <FaDrawPolygon size={25} />
            </button>

            {/* Undo */}
            <button
              onClick={() => {
                if (historyIndex > 0) {
                  const newIndex = historyIndex - 1;
                  setShapes(history[newIndex]);
                  setHistoryIndex(newIndex);
                }
              }}
              className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
              title="Undo"
            >
              <FaUndoAlt size={25} />
            </button>

            {/* Redo */}
            <button
              onClick={() => {
                if (historyIndex < history.length - 1) {
                  const newIndex = historyIndex + 1;
                  setShapes(history[newIndex]);
                  setHistoryIndex(newIndex);
                }
              }}
              className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
              title="Redo"
            >
              <FaRedoAlt size={25} />
            </button>

            {/* Clear Canvas */}
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to clear the entire canvas?")) {
                  pushHistory([]);
                }
              }}
              className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
              title="Clear Canvas"
            >
              <FaTrashAlt size={25} />
            </button>

            {/* Exit Edit Mode */}
            <button
              onClick={() => setEditMode(false)}
              className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
              title="Exit Edit Mode"
            >
              <TbCircleXFilled size={25} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Canvas;

