"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { FaEdit, FaLeaf, FaRegCircle, FaDrawPolygon, FaUndoAlt, FaRedoAlt, FaTrashAlt } from "react-icons/fa";
import { TbCircleXFilled } from "react-icons/tb";

import ShapeRenderer from "./ShapeRenderer";
import { Shape, Position } from "../types/shapes";
import SearchWindow from "./Searchwindow";
import VariableWindow from "./VariableWindow";
import Calendar from "./Calendar";
import GardenBedCreator from "./garden/GardenBedCreator";
import { useGardenStore } from "../types/garden";

const Canvas = () => {
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVariableOpen, setIsVariableOpen] = useState(false);
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const [showGardenBedCreator, setShowGardenBedCreator] = useState(false);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [activeEndpoint, setActiveEndpoint] = useState<"start" | "end" | null>(null);
  const [pendingBedShapeId, setPendingBedShapeId] = useState<string | null>(null);

  // Undo/redo
  const [history, setHistory] = useState<Record<string, Shape>[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const canvasRef = useRef<HTMLDivElement>(null);

  const { editMode, setEditMode, shapes, addShape, updateShape, deleteShape, createBed } = useGardenStore();
  const shapesArray = Object.values(shapes);

  // Push new state to history
  const pushHistory = useCallback((newShapes: Record<string, Shape>) => {
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, newShapes]);
    setHistoryIndex(newHistory.length);
  }, [history, historyIndex]);

  const createShape = useCallback(
    (shapeType: "circle" | "line"): string | null => {
      if (!canvasRef.current) return null;
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
            isSelected: false,
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
            isSelected: false,
          };
          setActiveLineId(newShape.id);
          setActiveEndpoint("end");
          break;

        default:
          return null;
      }

      addShape(newShape);
      pushHistory({ ...shapes, [newShape.id]: newShape });
      return newShape.id;
    },
    [pan, scale, shapes, addShape, pushHistory]
  );

  const createBedWithShape = useCallback((shapeType: "circle" | "line") => {
    const shapeId = createShape(shapeType);
    if (shapeId) {
      setPendingBedShapeId(shapeId);
      setShowGardenBedCreator(true);
    }
  }, [createShape]);

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

  // Delete selected shape (backspace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace" && selectedShapeId) {
        pushHistory(
          Object.fromEntries(
            Object.entries(shapes).filter(([id]) => id !== selectedShapeId)
          ) as Record<string, Shape>
        );
        deleteShape(selectedShapeId);
        setSelectedShapeId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedShapeId, shapes, pushHistory, deleteShape]);

  const finishLineCreation = useCallback(() => {
    setActiveLineId(null);
    setActiveEndpoint(null);
  }, []);

  const extendLineFromEndpoint = useCallback(() => {
    if (!activeLineId || !activeEndpoint) return;

    const current = shapes[activeLineId];
    if (!current || current.type !== "line") return;

    const from = activeEndpoint === "start" ? current.startPos : current.endPos;

    const newLine: Shape = {
      id: Date.now().toString(),
      type: "line",
      startPos: { ...from },
      endPos: { x: from.x + 50, y: from.y },
      color: current.color,
      strokeWidth: current.strokeWidth,
      isSelected: false,
    };

    addShape(newLine);
    pushHistory({ ...shapes, [newLine.id]: newLine });
    setActiveLineId(newLine.id);
    setActiveEndpoint("end");
  }, [activeLineId, activeEndpoint, shapes, addShape, pushHistory]);

  const gridSize = 20;
  const safeScale = scale || 1;
  const gridStyle = {
    backgroundColor: "#6D8934",
    backgroundImage: `
      linear-gradient(to right, #9EAD73 1px, transparent 1px),
      linear-gradient(to bottom, #9EAD73 1px, transparent 1px)
    `,
    backgroundSize: `${gridSize * safeScale}px ${gridSize * safeScale}px`,
    backgroundPosition: `${pan.x % (gridSize * safeScale)}px ${pan.y % (gridSize * safeScale)}px`,
  };

  return (
    <div className="fixed inset-0 top-16 overflow-hidden bg-gray-50">
      <div className="absolute top-4 left-4 flex gap-2 z-50">
        {showGardenBedCreator && (
          <GardenBedCreator
            initialShapeId={pendingBedShapeId ?? undefined}
            onComplete={() => {
              setShowGardenBedCreator(false);
              setPendingBedShapeId(null);
            }}
            onCancel={() => {
              setShowGardenBedCreator(false);
              setPendingBedShapeId(null);
            }}
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
            shapes={shapesArray}
            scale={scale}
            pan={pan}
            unit="feet"
            gridToUnit={1}
            onShapeUpdate={(shapeId, updates) => {
              updateShape(shapeId, updates);
              pushHistory({ ...shapes, [shapeId]: { ...shapes[shapeId], ...updates } as Shape });
            }}
            onShapeSelect={(shapeId) => setSelectedShapeId(shapeId)}
          />

          {activeLineId && (() => {
            const line = shapes[activeLineId];
            if (!line || line.type !== "line") return null;
            const endpoint = activeEndpoint === "start" ? line.startPos : line.endPos;

            return (
              <div
                style={{
                  position: "absolute",
                  left: endpoint.x * scale + pan.x,
                  top: endpoint.y * scale + pan.y - 40,
                  transform: "translate(-50%, -50%)",
                  zIndex: 100,
                }}
              >
                <div className="flex gap-2">
                  <button onClick={finishLineCreation} className="px-2 py-1 bg-green-600 text-white rounded">
                    Finish
                  </button>
                  <button onClick={extendLineFromEndpoint} className="px-2 py-1 bg-blue-600 text-white rounded">
                    Add Segment
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {editMode && (
        <div
          data-testid="edit-window"
          className="absolute top-4 left-4 mt-10 bg-white rounded-lg shadow-lg p-3 border z-40"
        >
          <div className="flex gap-2">
            <button onClick={() => createBedWithShape("circle")} className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800" title="Circle">
              <FaRegCircle size={25} />
            </button>
            <button onClick={() => createBedWithShape("line")} className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800" title="Line">
              <FaDrawPolygon size={25} />
            </button>
            <button
              onClick={() => {
                if (historyIndex > 0) {
                  const newIndex = historyIndex - 1;
                  const prevShapes = history[newIndex];
                  Object.keys(shapes).forEach(id => {
                    if (!prevShapes[id]) deleteShape(id);
                  });
                  Object.values(prevShapes).forEach(shape => addShape(shape));
                  setHistoryIndex(newIndex);
                }
              }}
              className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
              title="Undo"
            >
              <FaUndoAlt size={25} />
            </button>
            <button
              onClick={() => {
                if (historyIndex < history.length - 1) {
                  const newIndex = historyIndex + 1;
                  const nextShapes = history[newIndex];
                  Object.keys(shapes).forEach(id => {
                    if (!nextShapes[id]) deleteShape(id);
                  });
                  Object.values(nextShapes).forEach(shape => addShape(shape));
                  setHistoryIndex(newIndex);
                }
              }}
              className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
              title="Redo"
            >
              <FaRedoAlt size={25} />
            </button>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to clear the entire canvas?")) {
                  Object.keys(shapes).forEach(id => deleteShape(id));
                  pushHistory({});
                }
              }}
              className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
              title="Clear Canvas"
            >
              <FaTrashAlt size={25} />
            </button>
            <button onClick={() => setEditMode(false)} className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800" title="Exit Edit Mode">
              <TbCircleXFilled size={25} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Canvas;