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
  segmentIds: string[]; // line IDs
  vertices: Position[]; // ordered polygon when closed
  isClosed: boolean;
};

type CanvasSnapshot = {
  shapes: Shape[];
  beds: BedPath[];
};

type ToolMode = "none" | "drawBed" | "drawLine";

const GRID_SIZE = 20;
const LINE_ENDPOINT_SNAP = 18;
const DRAG_SUPPRESS_PX = 4;
const SHIFT_REQUIRED_TO_START_LINE = true;

const roundKey = (p: Position) => `${Math.round(p.x)}:${Math.round(p.y)}`;

function dist(a: Position, b: Position) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function computeClosedLoopVertices(segmentIds: string[], shapes: Shape[]): Position[] | null {
  const lines = segmentIds
    .map((id) => shapes.find((s) => s.id === id))
    .filter((s): s is Shape => !!s && s.type === "line");

  if (lines.length < 3) return null;

  const adj = new Map<string, Set<string>>();
  const keyToPos = new Map<string, Position>();

  const addNode = (p: Position) => {
    const k = roundKey(p);
    if (!adj.has(k)) adj.set(k, new Set());
    if (!keyToPos.has(k)) keyToPos.set(k, p);
    return k;
  };

  for (const ln of lines) {
    const ka = addNode(ln.startPos);
    const kb = addNode(ln.endPos);
    if (ka === kb) return null;
    adj.get(ka)!.add(kb);
    adj.get(kb)!.add(ka);
  }

  for (const [, set] of adj.entries()) {
    if (set.size !== 2) return null;
  }

  const keys = [...adj.keys()];
  const seen = new Set<string>();
  const stack = [keys[0]];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const n of adj.get(cur)!) stack.push(n);
  }
  if (seen.size !== keys.length) return null;

  const start = keys[0];
  const startNeighbors = [...adj.get(start)!];
  let prev = start;
  let cur = startNeighbors[0];

  const orderedKeys: string[] = [start];

  while (true) {
    orderedKeys.push(cur);
    const neighbors = [...adj.get(cur)!];
    const next = neighbors[0] === prev ? neighbors[1] : neighbors[0];
    prev = cur;
    cur = next;

    if (cur === start) break;
    if (orderedKeys.length > keys.length + 2) return null;
  }

  orderedKeys.pop();
  const verts = orderedKeys.map((k) => keyToPos.get(k)!);
  if (verts.length < 3) return null;
  return verts;
}

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

  const [toolMode, setToolMode] = useState<ToolMode>("none");

  const [lineStart, setLineStart] = useState<Position | null>(null);
  const [linePreviewEnd, setLinePreviewEnd] = useState<Position | null>(null);

  const [isShiftDown, setIsShiftDown] = useState(false);

  const [history, setHistory] = useState<CanvasSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const canvasRef = useRef<HTMLDivElement>(null);
  const { editMode, setEditMode } = useCanvasStore();
  const [isMapKeyOpen, setIsMapKeyOpen] = useState(false);

  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftDown(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftDown(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const snapToGrid = useCallback((p: Position): Position => {
    return {
      x: Math.round(p.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(p.y / GRID_SIZE) * GRID_SIZE,
    };
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
      const endpointHit = getEndpointTarget(e.target);
      if (endpointHit) {
        const s = shapes.find((x) => x.id === endpointHit.shapeId);
        if (s && s.type === "line") return endpointHit.endpoint === "start" ? s.startPos : s.endPos;
      }

      let best: Position | null = null;
      let bestDist = Infinity;

      for (const s of shapes) {
        if (s.type !== "line") continue;
        const d1 = dist(rawWorld, s.startPos);
        if (d1 < bestDist) {
          bestDist = d1;
          best = s.startPos;
        }
        const d2 = dist(rawWorld, s.endPos);
        if (d2 < bestDist) {
          bestDist = d2;
          best = s.endPos;
        }
      }

      if (best && bestDist <= LINE_ENDPOINT_SNAP) return best;
      return snapToGrid(rawWorld);
    },
    [getEndpointTarget, shapes, snapToGrid]
  );

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

  const startBedSelectMode = useCallback(() => {
    setToolMode("drawBed");
    setSelectedShapeId(null);
    setLineStart(null);
    setLinePreviewEnd(null);
  }, []);

  const startLineDrawing = useCallback(() => {
    setToolMode("drawLine");
    setLineStart(null);
    setLinePreviewEnd(null);
    setSelectedShapeId(null);
    setActiveBedId(null);
  }, []);

  const ensureActiveOpenBed = useCallback((): string => {
    const current = activeBedId ? beds.find((b) => b.id === activeBedId) : null;
    if (current && !current.isClosed) return current.id;

    const id = Date.now().toString();
    const newBed: BedPath = { id, segmentIds: [], vertices: [], isClosed: false };
    commit(shapes, [...beds, newBed]);
    setActiveBedId(id);
    return id;
  }, [activeBedId, beds, commit, shapes]);

  const toggleLineInActiveBed = useCallback(
    (lineId: string) => {
      const bedId = ensureActiveOpenBed();
      const bed = beds.find((b) => b.id === bedId);
      if (!bed) return;

      const has = bed.segmentIds.includes(lineId);
      const nextIds = has ? bed.segmentIds.filter((id) => id !== lineId) : [...bed.segmentIds, lineId];

      const loop = computeClosedLoopVertices(nextIds, shapes);
      const nextBed: BedPath = { ...bed, segmentIds: nextIds, isClosed: !!loop, vertices: loop ?? [] };

      commit(shapes, beds.map((b) => (b.id === bedId ? nextBed : b)));
      setActiveBedId(bedId);
    },
    [beds, commit, ensureActiveOpenBed, shapes]
  );

  const moveBedBy = useCallback(
    (bedId: string, dx: number, dy: number) => {
      const bed = beds.find((b) => b.id === bedId);
      if (!bed || !bed.isClosed) return;

      const nextShapes = shapes.map((s) => {
        if (s.type !== "line") return s;
        if (!bed.segmentIds.includes(s.id)) return s;
        return {
          ...s,
          startPos: { x: s.startPos.x + dx, y: s.startPos.y + dy },
          endPos: { x: s.endPos.x + dx, y: s.endPos.y + dy },
        } as Shape;
      });

      const loop = computeClosedLoopVertices(bed.segmentIds, nextShapes);
      const nextBeds = beds.map((b) => (b.id === bedId ? { ...b, vertices: loop ?? [], isClosed: !!loop } : b));

      commit(nextShapes, nextBeds);
    },
    [beds, commit, shapes]
  );

  const resizeBedHandleTo = useCallback(
    (bedId: string, handle: "nw" | "ne" | "sw" | "se", p: Position) => {
      const bed = beds.find((b) => b.id === bedId);
      if (!bed || !bed.isClosed || bed.vertices.length < 3) return;

      const verts = bed.vertices;
      const xs = verts.map((v) => v.x);
      const ys = verts.map((v) => v.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const anchor: Position =
        handle === "nw"
          ? { x: maxX, y: maxY }
          : handle === "ne"
          ? { x: minX, y: maxY }
          : handle === "sw"
          ? { x: maxX, y: minY }
          : { x: minX, y: minY };

      const oldHandle: Position =
        handle === "nw"
          ? { x: minX, y: minY }
          : handle === "ne"
          ? { x: maxX, y: minY }
          : handle === "sw"
          ? { x: minX, y: maxY }
          : { x: maxX, y: maxY };

      const newHandle = snapToGrid(p);

      const oldW = oldHandle.x - anchor.x;
      const oldH = oldHandle.y - anchor.y;
      if (oldW === 0 || oldH === 0) return;

      const sx = (newHandle.x - anchor.x) / oldW;
      const sy = (newHandle.y - anchor.y) / oldH;

      const transform = (pt: Position): Position => ({
        x: anchor.x + (pt.x - anchor.x) * sx,
        y: anchor.y + (pt.y - anchor.y) * sy,
      });

      const nextShapes = shapes.map((s) => {
        if (s.type !== "line") return s;
        if (!bed.segmentIds.includes(s.id)) return s;
        return { ...s, startPos: snapToGrid(transform(s.startPos)), endPos: snapToGrid(transform(s.endPos)) } as Shape;
      });

      const loop = computeClosedLoopVertices(bed.segmentIds, nextShapes);
      commit(nextShapes, beds.map((b) => (b.id === bedId ? { ...b, vertices: loop ?? [], isClosed: !!loop } : b)));
    },
    [beds, commit, shapes, snapToGrid]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (!editMode) return;
      if (toolMode === "none") return;

      if (didDragRef.current) {
        didDragRef.current = false;
        return;
      }

      const world = getWorldPointFromMouse(e);
      if (!world) return;

      if (toolMode === "drawLine") {
        const endpointHit = getEndpointTarget(e.target);
        const interactive = isInteractiveTarget(e.target);
        if (interactive && !endpointHit) return;

        if (!lineStart && SHIFT_REQUIRED_TO_START_LINE && !e.shiftKey) return;

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

      if (toolMode === "drawBed") {
        if (!isInteractiveTarget(e.target)) {
          setSelectedShapeId(null);
          setActiveBedId(null);
        }
      }
    },
    [beds, commit, editMode, getEndpointTarget, getWorldPointFromMouse, isInteractiveTarget, lineStart, resolveLinePoint, shapes, toolMode]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (pointerDownRef.current) {
        const dx = e.clientX - pointerDownRef.current.x;
        const dy = e.clientY - pointerDownRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_SUPPRESS_PX) didDragRef.current = true;
      }

      if (isDragging) {
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        return;
      }

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

      // ✅ IMPORTANT FIX: if clicking an interactive target (bed/line/etc), DO NOT start panning
      if (editMode && isInteractiveTarget(e.target)) {
        return;
      }

      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });

      if (editMode && !isInteractiveTarget(e.target)) {
        setSelectedShapeId(null);
        if (toolMode !== "drawBed") setActiveBedId(null);
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
      backgroundPosition: `${pan.x % (GRID_SIZE * safeScale)}px ${pan.y % (GRID_SIZE * safeScale)}px`,
    };
  }, [pan.x, pan.y, scale]);

  const canvasCursor = useMemo(() => {
    if (!editMode) return "default";
    if (toolMode === "drawBed") return "crosshair";
    if (toolMode === "drawLine") return isShiftDown ? "crosshair" : "default";
    return "default";
  }, [editMode, isShiftDown, toolMode]);

  const activeBed = useMemo(() => (activeBedId ? beds.find((b) => b.id === activeBedId) : null), [activeBedId, beds]);
  const activeBedSegmentIds = activeBed?.segmentIds ?? [];
  const activeBedIsClosed = !!activeBed?.isClosed;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!editMode) return;

      if (e.key === "Escape" && toolMode === "drawLine") {
        setLineStart(null);
        setLinePreviewEnd(null);
        return;
      }

      if (e.key !== "Backspace" && e.key !== "Delete") return;

      if (activeBedId) {
        commit(shapes, beds.filter((b) => b.id !== activeBedId));
        setActiveBedId(null);
        return;
      }

      if (selectedShapeId) {
        commit(shapes.filter((s) => s.id !== selectedShapeId), beds);
        setSelectedShapeId(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeBedId, beds, commit, editMode, selectedShapeId, shapes, toolMode]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const snap = history[newIndex];
    setShapes(snap.shapes);
    setBeds(snap.beds);
    setHistoryIndex(newIndex);

    setSelectedShapeId(null);
    setActiveBedId(null);
    setToolMode("none");
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
    setToolMode("none");
    setLineStart(null);
    setLinePreviewEnd(null);
  }, [history, historyIndex]);

  return (
    <div className="fixed inset-0 top-16 overflow-hidden bg-gray-50">
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
        style={{ ...gridStyle, cursor: canvasCursor }}
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
            activeBedSegmentIds={activeBedSegmentIds}
            activeBedIsClosed={activeBedIsClosed}
            bedSelectModeActive={toolMode === "drawBed"}
            onToggleLineForActiveBed={toggleLineInActiveBed}
            onSelectBed={(id) => {
              setActiveBedId(id);
              setSelectedShapeId(null);
            }}
            onMoveBedBy={moveBedBy}
            onResizeBedHandleTo={resizeBedHandleTo}
            lineStart={lineStart}
            linePreviewEnd={linePreviewEnd}
            linePreviewActive={toolMode === "drawLine" && !!lineStart}
            onShapeUpdate={(shapeId, updates) => {
              const nextShapes = shapes.map((s) => (s.id === shapeId ? ({ ...s, ...updates } as Shape) : s));
              commit(nextShapes, beds);
            }}
            onShapeSelect={(shapeId) => {
              setSelectedShapeId(shapeId);
              setActiveBedId(null);
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
              <button
                onClick={() => {
                  setToolMode("none");
                  setActiveBedId(null);
                  setLineStart(null);
                  setLinePreviewEnd(null);
                  createCircleShape();
                }}
                className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
                title="Circle"
              >
                <FaRegCircle size={25} />
              </button>

              <button
                onClick={startLineDrawing}
                className={`p-2 rounded text-green-800 ${
                  toolMode === "drawLine" ? "bg-gray-200" : "bg-gray-100 hover:bg-gray-200"
                }`}
                title="Line mode (hold Shift to start a new line)"
              >
                <FaSlash size={25} />
              </button>

              <button
                onClick={startBedSelectMode}
                className={`p-2 rounded text-green-800 ${
                  toolMode === "drawBed" ? "bg-gray-200" : "bg-gray-100 hover:bg-gray-200"
                }`}
                title="Bed Tool (select lines to form a closed boundary)"
              >
                <FaDrawPolygon size={25} />
              </button>

              <button onClick={undo} className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800" title="Undo">
                <FaUndoAlt size={25} />
              </button>

              <button onClick={redo} className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800" title="Redo">
                <FaRedoAlt size={25} />
              </button>

              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to clear the entire canvas?")) {
                    commit([], []);
                    setSelectedShapeId(null);
                    setActiveBedId(null);
                    setToolMode("none");
                    setLineStart(null);
                    setLinePreviewEnd(null);
                  }
                }}
                className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
                title="Clear Canvas"
              >
                <FaTrashAlt size={25} />
              </button>

              <button
                onClick={() => {
                  setEditMode(false);
                  setToolMode("none");
                  setActiveBedId(null);
                  setLineStart(null);
                  setLinePreviewEnd(null);
                }}
                className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
                title="Exit Edit Mode"
              >
                <TbCircleXFilled size={25} />
              </button>
            </div>

            {toolMode === "drawLine" && (
              <div className="text-xs text-green-800 font-semibold select-none">
                Line mode — hold <span className="font-bold">Shift</span> to start a new line
                {lineStart ? " (click to place end)" : ""}
              </div>
            )}

            {toolMode === "drawBed" && (
              <div className="text-xs text-green-800 font-semibold select-none">
                Bed mode — click <span className="font-bold">existing lines</span> to add/remove them.
                <span className="ml-1">{activeBedIsClosed ? "Bed complete (filled). Drag/resize it." : "Form a closed loop to complete."}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Canvas;