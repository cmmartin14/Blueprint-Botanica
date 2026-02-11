"use client";

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { FaRegCircle, FaDrawPolygon, FaUndoAlt, FaRedoAlt, FaTrashAlt, FaSlash } from "react-icons/fa";
import { TbCircleXFilled } from "react-icons/tb";
import { FaKey } from "react-icons/fa6";

import ShapeRenderer from "./ShapeRenderer";
import { Shape, Position } from "../types/shapes";
import SearchWindow from "./Searchwindow";
import VariableWindow from "./VariableWindow";
import Calendar from "./Calendar";
import { useGardenBed } from "./hooks/useGardenBed";
import GardenBedCreator from "./garden/GardenBedCreator";
import { useCanvasStore } from "../stores/canvasStore";

export type BedPath = {
  id: string;
  vertices: Position[];
  isClosed: boolean;
};

type CanvasSnapshot = {
  shapes: Shape[];
  beds: BedPath[];
};

type ToolMode = "none" | "drawBed" | "drawLine";

const GRID_SIZE = 20;
const CLOSE_DISTANCE = 18;

const LINE_ENDPOINT_SNAP = 18; // world units
const DRAG_SUPPRESS_PX = 4; // client px
const SHIFT_REQUIRED_TO_START_LINE = true;

const Canvas = () => {
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  const [shapes, setShapes] = useState<Shape[]>([]);
  const [beds, setBeds] = useState<BedPath[]>([]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVariableOpen, setIsVariableOpen] = useState(false);
  const [isCalendarOpen, setCalendarOpen] = useState(false);

  const { createGardenBed } = useGardenBed();
  const [showGardenBedCreator, setShowGardenBedCreator] = useState(false);

  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  const [activeBedId, setActiveBedId] = useState<string | null>(null);
  const [activeVertex, setActiveVertex] = useState<{ bedId: string; index: number } | null>(null);

  const [toolMode, setToolMode] = useState<ToolMode>("none");
  const [drawingBedId, setDrawingBedId] = useState<string | null>(null);

  // Line draft + preview
  const [lineStart, setLineStart] = useState<Position | null>(null);
  const [linePreviewEnd, setLinePreviewEnd] = useState<Position | null>(null);

  // Undo/redo
  const [history, setHistory] = useState<CanvasSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const canvasRef = useRef<HTMLDivElement>(null);

  const { editMode, setEditMode } = useCanvasStore();

  const [isMapKeyOpen, setIsMapKeyOpen] = useState(false);

  // Drag-suppress (prevents accidental draw after dragging)
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);

  const snapToGrid = useCallback((p: Position): Position => {
    return {
      x: Math.round(p.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(p.y / GRID_SIZE) * GRID_SIZE,
    };
  }, []);

  const distance = useCallback((a: Position, b: Position) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getWorldPointFromMouse = useCallback(
    (e: React.MouseEvent): Position | null => {
      if (!canvasRef.current) return null;
      const rect = canvasRef.current.getBoundingClientRect();
      const worldX = (e.clientX - rect.left - pan.x) / scale;
      const worldY = (e.clientY - rect.top - pan.y) / scale;
      return { x: worldX, y: worldY };
    },
    [pan.x, pan.y, scale]
  );

  const pushHistory = useCallback(
    (next: CanvasSnapshot) => {
      const newHistory = history.slice(0, historyIndex + 1);
      setHistory([...newHistory, next]);
      setHistoryIndex(newHistory.length);
      setShapes(next.shapes);
      setBeds(next.beds);
    },
    [history, historyIndex]
  );

  const commit = useCallback(
    (nextShapes: Shape[], nextBeds: BedPath[]) => {
      pushHistory({ shapes: nextShapes, beds: nextBeds });
    },
    [pushHistory]
  );

  // Circle tool (existing)
  const createCircleShape = useCallback(() => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = (rect.width / 2 - pan.x) / scale;
    const centerY = (rect.height / 2 - pan.y) / scale;

    const newShape: Shape = {
      id: Date.now().toString(),
      type: "circle",
      startPos: { x: centerX - 40, y: centerY - 40 },
      endPos: { x: centerX + 40, y: centerY + 40 },
      color: "#ffffff",
      strokeWidth: 2,
      isSeletected: false,
    } as Shape;

    commit([...shapes, newShape], beds);
  }, [beds, commit, pan.x, pan.y, scale, shapes]);

  const startBedDrawing = useCallback(() => {
    setToolMode("drawBed");
    setDrawingBedId(null);
    setActiveBedId(null);
    setActiveVertex(null);
    setSelectedShapeId(null);

    setLineStart(null);
    setLinePreviewEnd(null);
  }, []);

  const startLineDrawing = useCallback(() => {
    setToolMode("drawLine");
    setLineStart(null);
    setLinePreviewEnd(null);

    setDrawingBedId(null);
    setActiveBedId(null);
    setActiveVertex(null);
    setSelectedShapeId(null);
  }, []);

  const isInteractiveTarget = useCallback((target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (!el) return false;
    return Boolean(el.closest?.("[data-interactive='true']"));
  }, []);

  const getEndpointTarget = useCallback((target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (!el) return null as null | { shapeId: string; endpoint: "start" | "end" };

    const node = el.closest?.("[data-line-endpoint='true']") as HTMLElement | null;
    if (!node) return null;

    const shapeId = node.getAttribute("data-shape-id") || "";
    const endpoint = (node.getAttribute("data-endpoint") || "") as "start" | "end";
    if (!shapeId || (endpoint !== "start" && endpoint !== "end")) return null;

    return { shapeId, endpoint };
  }, []);

  const resolveLinePoint = useCallback(
    (e: React.MouseEvent, rawWorld: Position): Position => {
      // 1) Exact endpoint handle click
      const endpointHit = getEndpointTarget(e.target);
      if (endpointHit) {
        const s = shapes.find((x) => x.id === endpointHit.shapeId);
        if (s && s.type === "line") {
          return endpointHit.endpoint === "start" ? s.startPos : s.endPos;
        }
      }

      // 2) Snap near endpoints (blank canvas clicks near a handle still connect)
      let best: Position | null = null;
      let bestDist = Infinity;

      for (const s of shapes) {
        if (s.type !== "line") continue;
        const d1 = distance(rawWorld, s.startPos);
        if (d1 < bestDist) {
          bestDist = d1;
          best = s.startPos;
        }
        const d2 = distance(rawWorld, s.endPos);
        if (d2 < bestDist) {
          bestDist = d2;
          best = s.endPos;
        }
      }

      if (best && bestDist <= LINE_ENDPOINT_SNAP) return best;

      // 3) Grid snap
      return snapToGrid(rawWorld);
    },
    [distance, getEndpointTarget, shapes, snapToGrid]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (!editMode) return;
      if (toolMode === "none") return;

      // Suppress click if we dragged
      if (didDragRef.current) {
        didDragRef.current = false;
        return;
      }

      const world = getWorldPointFromMouse(e);
      if (!world) return;

      // ---- LINE TOOL (SAFER + SHIFT TO START) ----
      if (toolMode === "drawLine") {
        const endpointHit = getEndpointTarget(e.target);
        const interactive = isInteractiveTarget(e.target);

        // Safe rule: allow clicks ONLY on blank canvas, except endpoints
        if (interactive && !endpointHit) return;

        // If starting a new line, require Shift (even if starting from an endpoint)
        if (!lineStart && SHIFT_REQUIRED_TO_START_LINE && !e.shiftKey) {
          return;
        }

        const p = resolveLinePoint(e, world);

        if (!lineStart) {
          setLineStart(p);
          setLinePreviewEnd(p);
          return;
        }

        const newLine: Shape = {
          id: Date.now().toString(),
          type: "line",
          startPos: lineStart,
          endPos: p,
          color: "#ffffff",
          strokeWidth: 2,
          isSeletected: false,
        } as Shape;

        commit([...shapes, newLine], beds);
        setLineStart(null);
        setLinePreviewEnd(null);
        return;
      }

      // ---- BED TOOL ----
      if (toolMode !== "drawBed") return;

      const p = snapToGrid(world);

      if (!drawingBedId) {
        const id = Date.now().toString();
        const newBed: BedPath = { id, vertices: [p], isClosed: false };
        commit(shapes, [...beds, newBed]);
        setDrawingBedId(id);
        setActiveBedId(id);
        return;
      }

      const current = beds.find((b) => b.id === drawingBedId);
      if (!current) return;

      if (current.vertices.length >= 3 && distance(p, current.vertices[0]) <= CLOSE_DISTANCE) {
        const closed: BedPath = { ...current, isClosed: true };
        const nextBeds = beds.map((b) => (b.id === current.id ? closed : b));
        commit(shapes, nextBeds);

        setToolMode("none");
        setDrawingBedId(null);
        setActiveBedId(closed.id);
        setActiveVertex(null);
        return;
      }

      const nextBed: BedPath = { ...current, vertices: [...current.vertices, p] };
      const nextBeds = beds.map((b) => (b.id === current.id ? nextBed : b));
      commit(shapes, nextBeds);
      setActiveBedId(current.id);
    },
    [
      beds,
      commit,
      distance,
      drawingBedId,
      editMode,
      getEndpointTarget,
      getWorldPointFromMouse,
      isInteractiveTarget,
      lineStart,
      resolveLinePoint,
      shapes,
      snapToGrid,
      toolMode,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // drag suppression tracking
      if (pointerDownRef.current) {
        const dx = e.clientX - pointerDownRef.current.x;
        const dy = e.clientY - pointerDownRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_SUPPRESS_PX) didDragRef.current = true;
      }

      if (isDragging) {
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        return;
      }

      // Live preview for line drawing
      if (editMode && toolMode === "drawLine" && lineStart) {
        const world = getWorldPointFromMouse(e);
        if (!world) return;
        const p = resolveLinePoint(e, world);
        setLinePreviewEnd(p);
      }
    },
    [dragStart.x, dragStart.y, editMode, getWorldPointFromMouse, isDragging, lineStart, resolveLinePoint, toolMode]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      pointerDownRef.current = { x: e.clientX, y: e.clientY };
      didDragRef.current = false;

      if (!editMode) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        return;
      }

      if (toolMode === "drawBed") return;

      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });

      // Don't clear selection when clicking interactive things
      if (!isInteractiveTarget(e.target)) {
        setSelectedShapeId(null);
        setActiveBedId(null);
        setActiveVertex(null);
      }
    },
    [editMode, isInteractiveTarget, pan.x, pan.y, toolMode]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    pointerDownRef.current = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    setScale((prev) => Math.min(Math.max(prev * delta, 0.75), 2));
  }, []);

  const gridStyle = useMemo(() => {
    const safeScale = scale || 1;
    return {
      backgroundColor: "#6D8934",
      backgroundImage: `
        linear-gradient(to right, #9EAD73 1px, transparent 1px),
        linear-gradient(to bottom, #9EAD73 1px, transparent 1px)
      `,
      backgroundSize: `${GRID_SIZE * safeScale}px ${GRID_SIZE * safeScale}px`,
      backgroundPosition: `${pan.x % (GRID_SIZE * safeScale)}px ${pan.y % (GRID_SIZE * safeScale)}px ${pan.y % (GRID_SIZE * safeScale)}px`,
    };
  }, [pan.x, pan.y, scale]);

  // Keyboard: ESC cancels line draft or bed drawing
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!editMode) return;

      if (e.key === "Escape" && toolMode === "drawLine") {
        setLineStart(null);
        setLinePreviewEnd(null);
        // keep tool active; user can keep editing, but draft cancels
        return;
      }

      if (e.key === "Escape" && toolMode === "drawBed") {
        if (drawingBedId) {
          const current = beds.find((b) => b.id === drawingBedId);
          if (current && !current.isClosed) {
            commit(shapes, beds.filter((b) => b.id !== drawingBedId));
          }
        }
        setToolMode("none");
        setDrawingBedId(null);
        setActiveBedId(null);
        setActiveVertex(null);
        return;
      }

      if (e.key !== "Backspace" && e.key !== "Delete") return;

      if (activeVertex) {
        const { bedId, index } = activeVertex;
        const bed = beds.find((b) => b.id === bedId);
        if (!bed) return;

        const nextVerts = bed.vertices.filter((_, i) => i !== index);

        if (nextVerts.length < 3) {
          commit(shapes, beds.filter((b) => b.id !== bedId));
          setActiveVertex(null);
          setActiveBedId(null);
          return;
        }

        const nextBed: BedPath = { ...bed, vertices: nextVerts, isClosed: false };
        commit(shapes, beds.map((b) => (b.id === bedId ? nextBed : b)));
        setActiveVertex(null);
        setActiveBedId(bedId);
        return;
      }

      if (activeBedId) {
        commit(shapes, beds.filter((b) => b.id !== activeBedId));
        setActiveBedId(null);
        setActiveVertex(null);
        return;
      }

      if (selectedShapeId) {
        commit(shapes.filter((s) => s.id !== selectedShapeId), beds);
        setSelectedShapeId(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeBedId, activeVertex, beds, commit, drawingBedId, editMode, selectedShapeId, shapes, toolMode]);

  // Bed mutations
  const moveBedBy = useCallback(
    (bedId: string, dx: number, dy: number) => {
      const nextBeds = beds.map((b) => {
        if (b.id !== bedId) return b;
        return { ...b, vertices: b.vertices.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
      });
      commit(shapes, nextBeds);
    },
    [beds, commit, shapes]
  );

  const moveVertexTo = useCallback(
    (bedId: string, index: number, p: Position) => {
      const snapped = snapToGrid(p);
      const nextBeds = beds.map((b) => {
        if (b.id !== bedId) return b;
        const nextVerts = b.vertices.map((v, i) => (i === index ? snapped : v));
        return { ...b, vertices: nextVerts, isClosed: false };
      });
      commit(shapes, nextBeds);
    },
    [beds, commit, shapes, snapToGrid]
  );

  const requestCloseBed = useCallback(
    (bedId: string) => {
      const bed = beds.find((b) => b.id === bedId);
      if (!bed) return;
      if (bed.vertices.length < 3) return;

      const first = bed.vertices[0];
      const last = bed.vertices[bed.vertices.length - 1];
      if (distance(first, last) > CLOSE_DISTANCE) return;

      commit(shapes, beds.map((b) => (b.id === bedId ? { ...b, isClosed: true } : b)));
    },
    [beds, commit, distance, shapes]
  );

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const snap = history[newIndex];
    setShapes(snap.shapes);
    setBeds(snap.beds);
    setHistoryIndex(newIndex);

    setSelectedShapeId(null);
    setActiveBedId(null);
    setActiveVertex(null);
    setToolMode("none");
    setDrawingBedId(null);
    setLineStart(null);
    setLinePreviewEnd(null);
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const snap = history[newIndex];
    setShapes(snap.shapes);
    setBeds(snap.beds);
    setHistoryIndex(newIndex);

    setSelectedShapeId(null);
    setActiveBedId(null);
    setActiveVertex(null);
    setToolMode("none");
    setDrawingBedId(null);
    setLineStart(null);
    setLinePreviewEnd(null);
  }, [history, historyIndex]);

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
        onClick={handleCanvasClick}
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
            beds={beds}
            scale={scale}
            pan={pan}
            gridToUnit={1}
            activeBedId={activeBedId}
            activeVertex={activeVertex}
            drawingBedId={drawingBedId}
            drawingMode={toolMode === "drawBed"}
            lineStart={lineStart}
            linePreviewEnd={linePreviewEnd}
            linePreviewActive={toolMode === "drawLine" && !!lineStart}
            onSelectBed={(id) => {
              setActiveBedId(id);
              setActiveVertex(null);
              setSelectedShapeId(null);
            }}
            onSelectVertex={(bedId, index) => {
              setActiveBedId(bedId);
              setActiveVertex({ bedId, index });
              setSelectedShapeId(null);
            }}
            onMoveBedBy={moveBedBy}
            onMoveVertexTo={moveVertexTo}
            onRequestCloseBed={requestCloseBed}
            onShapeUpdate={(shapeId, updates) => {
              const nextShapes = shapes.map((s) => (s.id === shapeId ? ({ ...s, ...updates } as Shape) : s));
              commit(nextShapes, beds);
            }}
            onShapeSelect={(shapeId) => {
              setSelectedShapeId(shapeId);
              setActiveBedId(null);
              setActiveVertex(null);
            }}
          />
        </div>
      </div>

      {/* Map Key */}
      {!isMapKeyOpen ? (
        <button
          onClick={() => setIsMapKeyOpen(true)}
          className="absolute right-5 top-5 bg-white rounded-lg shadow-lg p-2 z-40 text-green-800 hover:bg-gray-100 font-bold"
        >
          <FaKey size={25} />
        </button>
      ) : (
        <div className="absolute right-5 top-5 bg-white rounded-lg shadow-lg p-4 border z-50 w-64">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-green-800">Key</h3>
            <button onClick={() => setIsMapKeyOpen(false)}>
              <TbCircleXFilled size={28} className="text-green-800" />
            </button>
          </div>

          <ul className="text-sm space-y-1 text-green-800 font-semibold">
            <li>Coming soon...</li>
          </ul>
        </div>
      )}

      {/* Drawing/Edit Tools */}
      {editMode && (
        <div className="absolute top-0 left-4 mt-5 bg-white rounded-lg shadow-lg p-3 border z-40" data-testid="edit-window">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              {/* Circle */}
              <button
                onClick={() => {
                  setToolMode("none");
                  setDrawingBedId(null);
                  setLineStart(null);
                  setLinePreviewEnd(null);
                  createCircleShape();
                }}
                className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
                title="Circle"
              >
                <FaRegCircle size={25} />
              </button>

              {/* Line */}
              <button
                onClick={startLineDrawing}
                className={`p-2 rounded text-green-800 ${
                  toolMode === "drawLine" ? "bg-gray-200" : "bg-gray-100 hover:bg-gray-200"
                }`}
                title="Line mode (hold Shift to start a new line)"
              >
                <FaSlash size={25} />
              </button>

              {/* Bed */}
              <button
                onClick={startBedDrawing}
                className={`p-2 rounded text-green-800 ${
                  toolMode === "drawBed" ? "bg-gray-200" : "bg-gray-100 hover:bg-gray-200"
                }`}
                title="Bed Tool (click points, click first point to close)"
              >
                <FaDrawPolygon size={25} />
              </button>

              {/* Undo */}
              <button onClick={undo} className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800" title="Undo">
                <FaUndoAlt size={25} />
              </button>

              {/* Redo */}
              <button onClick={redo} className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800" title="Redo">
                <FaRedoAlt size={25} />
              </button>

              {/* Clear */}
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to clear the entire canvas?")) {
                    commit([], []);
                    setSelectedShapeId(null);
                    setActiveBedId(null);
                    setActiveVertex(null);
                    setToolMode("none");
                    setDrawingBedId(null);
                    setLineStart(null);
                    setLinePreviewEnd(null);
                  }
                }}
                className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
                title="Clear Canvas"
              >
                <FaTrashAlt size={25} />
              </button>

              {/* Exit */}
              <button
                onClick={() => {
                  setEditMode(false);
                  setToolMode("none");
                  setDrawingBedId(null);
                  setActiveBedId(null);
                  setActiveVertex(null);
                  setLineStart(null);
                  setLinePreviewEnd(null);
                }}
                className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
                title="Exit Edit Mode"
              >
                <TbCircleXFilled size={25} />
              </button>
            </div>

            {/* Mode hint (small, non-intrusive) */}
            {toolMode === "drawLine" && (
              <div className="text-xs text-green-800 font-semibold select-none">
                Line mode — hold <span className="font-bold">Shift</span> to start a new line
                {lineStart ? " (click to place end)" : ""}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Canvas;