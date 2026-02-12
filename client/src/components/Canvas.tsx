"use client";

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { FaEdit, FaLeaf, FaRegCircle, FaDrawPolygon, FaUndoAlt, FaRedoAlt, FaTrashAlt } from "react-icons/fa";
import { TbCircleXFilled } from "react-icons/tb";
import { MdOutlineRectangle } from "react-icons/md";

import ShapeRenderer from "./ShapeRenderer";
import { Shape, Position } from "../types/shapes";
import SearchWindow from "./Searchwindow";
import VariableWindow from "./VariableWindow";
import Calendar from "./Calendar";
import GardenBedCreator from "./garden/GardenBedCreator";
import { useGardenStore } from "../types/garden";

export type BedPath = {
  id: string;
  vertices: Position[];
  isClosed: boolean;
};

type CanvasSnapshot = {
  shapes: Shape[];
  beds: BedPath[];
};

type ToolMode = "none" | "draw";

type DraftChain = {
  id: string;
  vertices: Position[];
  segmentIds: string[];
};

type Box = { minX: number; minY: number; maxX: number; maxY: number };

const GRID_SIZE = 20;
const CLOSE_DISTANCE = 18;
const LINE_ENDPOINT_SNAP = 18;

const DRAG_SUPPRESS_PX = 4;
const SHIFT_REQUIRED_TO_START = true;

const dist = (a: Position, b: Position) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const Canvas = () => {
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVariableOpen, setIsVariableOpen] = useState(false);
  const [isCalendarOpen, setCalendarOpen] = useState(false);

  const [showGardenBedCreator, setShowGardenBedCreator] = useState(false);

  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  // Bed selection
  const [activeBedId, setActiveBedId] = useState<string | null>(null);
  const [activeVertex, setActiveVertex] = useState<{ bedId: string; index: number } | null>(null);

  // Combined tool
  const [toolMode, setToolMode] = useState<ToolMode>("none");
  const [draft, setDraft] = useState<DraftChain | null>(null);
  const [previewEnd, setPreviewEnd] = useState<Position | null>(null);

  // Shift tracking
  const [isShiftDown, setIsShiftDown] = useState(false);

  // Undo/redo
  const [history, setHistory] = useState<CanvasSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const canvasRef = useRef<HTMLDivElement>(null);
  const { editMode, setEditMode } = useCanvasStore();
  const [isMapKeyOpen, setIsMapKeyOpen] = useState(false);

  // Drag-suppress (prevents accidental click actions after drag)
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);

  // Refs to avoid stale closures in document-level handlers
  const shapesRef = useRef<Shape[]>([]);
  const bedsRef = useRef<BedPath[]>([]);
  const historyIndexRef = useRef<number>(-1);

  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);

  useEffect(() => {
    bedsRef.current = beds;
  }, [beds]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  // Smooth bed drag session
  const bedDragRef = useRef<null | {
    bedId: string;
    startClientX: number;
    startClientY: number;
    startVerts: Position[];
  }>(null);

  // Smooth vertex drag session
  const vertexDragRef = useRef<null | {
    bedId: string;
    index: number;
  }>(null);

  // Smooth shape drag session
  const shapeDragRef = useRef<null | {
    shapeId: string;
    startClientX: number;
    startClientY: number;
    startPos: Position;
    endPos: Position;
    startPoints: Position[] | null;
    type: Shape["type"];
  }>(null);

  // Smooth shape resize session
  const shapeResizeRef = useRef<null | { shapeId: string }>(null);

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

  const pushHistory = useCallback((next: CanvasSnapshot) => {
    const idx = historyIndexRef.current;

    setHistory((prev) => {
      const base = prev.slice(0, idx + 1);
      return [...base, next];
    });

    const newIndex = idx + 1;
    historyIndexRef.current = newIndex;
    setHistoryIndex(newIndex);

    setShapes(next.shapes);
    setBeds(next.beds);
  }, []);

  const commit = useCallback(
    (nextShapes: Shape[], nextBeds: BedPath[]) => {
      pushHistory({ shapes: nextShapes, beds: nextBeds });
    },
    [pushHistory]
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

    commit([...shapesRef.current, newShape], bedsRef.current);
  }, [commit, pan.x, pan.y, scale]);

  const startDrawMode = useCallback(() => {
    setToolMode("draw");
    setSelectedShapeId(null);
    setActiveBedId(null);
    setActiveVertex(null);
    setDraft(null);
    setPreviewEnd(null);
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

  const resolvePoint = useCallback(
    (e: React.MouseEvent, rawWorld: Position): Position => {
      // exact endpoint click
      const endpointHit = getEndpointTarget(e.target);
      if (endpointHit) {
        const s = shapesRef.current.find((x) => x.id === endpointHit.shapeId);
        if (s && s.type === "line") {
          return endpointHit.endpoint === "start" ? s.startPos : s.endPos;
        }
      }

      // snap near any existing line endpoints
      let best: Position | null = null;
      let bestDist = Infinity;

      for (const s of shapesRef.current) {
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

      // grid snap
      return snapToGrid(rawWorld);
    },
    [getEndpointTarget, snapToGrid]
  );

  const cancelDraft = useCallback(() => {
    if (!draft) return;
    const nextShapes = shapesRef.current.filter((s) => !draft.segmentIds.includes(s.id));
    commit(nextShapes, bedsRef.current);
    setDraft(null);
    setPreviewEnd(null);
  }, [commit, draft]);

  const closeDraftIntoBed = useCallback(
    (closingPoint: Position) => {
      if (!draft) return;
      if (draft.vertices.length < 3) return;

      const bedId = Date.now().toString();
      const newBed: BedPath = { id: bedId, vertices: [...draft.vertices], isClosed: true };

      const nextShapes = shapesRef.current.filter((s) => !draft.segmentIds.includes(s.id));
      const nextBeds = [...bedsRef.current, newBed];

      commit(nextShapes, nextBeds);

      setDraft(null);
      setPreviewEnd(null);
      setActiveBedId(bedId);
      setActiveVertex(null);
      setSelectedShapeId(null);

      void closingPoint;
    },
    [commit, draft]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (!editMode) return;
      if (toolMode !== "draw") return;

      // suppress after dragging
      if (didDragRef.current) {
        didDragRef.current = false;
        return;
      }

      const world = getWorldPointFromMouse(e);
      if (!world) return;

      const endpointHit = getEndpointTarget(e.target);
      const interactive = isInteractiveTarget(e.target);

      // ignore clicks on interactive elements except endpoints
      if (interactive && !endpointHit) return;

      // starting new chain requires Shift (unless a chain is already active)
      if (!draft && SHIFT_REQUIRED_TO_START && !e.shiftKey) return;

      const p = resolvePoint(e, world);

      // start chain
      if (!draft) {
        const id = Date.now().toString();
        setDraft({ id, vertices: [p], segmentIds: [] });
        setPreviewEnd(p);
        setSelectedShapeId(null);
        setActiveBedId(null);
        setActiveVertex(null);
        return;
      }

      // click near start to close
      const start = draft.vertices[0];
      if (draft.vertices.length >= 3 && dist(p, start) <= CLOSE_DISTANCE) {
        closeDraftIntoBed(p);
        return;
      }

      // add segment (line)
      const last = draft.vertices[draft.vertices.length - 1];
      const segId = `${Date.now().toString()}-${Math.random().toString(16).slice(2)}`;

      const newLine: Shape = {
        id: segId,
        type: "line",
        startPos: last,
        endPos: p,
        color: "#ffffff",
        strokeWidth: 2,
        isSeletected: false,
      } as Shape;

      commit([...shapesRef.current, newLine], bedsRef.current);

      setDraft((prev) => {
        if (!prev) return prev;
        return { ...prev, vertices: [...prev.vertices, p], segmentIds: [...prev.segmentIds, segId] };
      });
      setPreviewEnd(p);
    },
    [
      closeDraftIntoBed,
      commit,
      draft,
      editMode,
      getEndpointTarget,
      getWorldPointFromMouse,
      isInteractiveTarget,
      resolvePoint,
      toolMode,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (pointerDownRef.current) {
        const dx = e.clientX - pointerDownRef.current.x;
        const dy = e.clientY - pointerDownRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_SUPPRESS_PX) didDragRef.current = true;
      }

      if (isPanning) {
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        return;
      }

      if (editMode && toolMode === "draw" && draft) {
        const world = getWorldPointFromMouse(e);
        if (!world) return;
        const p = resolvePoint(e, world);
        setPreviewEnd(p);
      }
    },
    [draft, dragStart.x, dragStart.y, editMode, getWorldPointFromMouse, isPanning, resolvePoint, toolMode]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      pointerDownRef.current = { x: e.clientX, y: e.clientY };
      didDragRef.current = false;

      // do not pan if interacting with something interactive
      if (editMode && isInteractiveTarget(e.target)) return;

      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });

      // clicking blank canvas clears selections (but not the draft)
      if (!editMode) return;
      if (!isInteractiveTarget(e.target)) {
        setSelectedShapeId(null);
        setActiveBedId(null);
        setActiveVertex(null);
      }
    },
    [editMode, isInteractiveTarget, pan.x, pan.y]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
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
    if (toolMode !== "draw") return "default";
    return isShiftDown || draft ? "crosshair" : "default";
  }, [draft, editMode, isShiftDown, toolMode]);

  // Keyboard: Esc cancels draft; Delete removes selected bed/vertex/shape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!editMode) return;

      if (e.key === "Escape") {
        if (draft) cancelDraft();
        return;
      }

      if (e.key !== "Backspace" && e.key !== "Delete") return;

      // delete selected vertex
      if (activeVertex) {
        const { bedId, index } = activeVertex;
        const bed = bedsRef.current.find((b) => b.id === bedId);
        if (!bed) return;

        const nextVerts = bed.vertices.filter((_, i) => i !== index);
        if (nextVerts.length < 3) {
          commit(shapesRef.current, bedsRef.current.filter((b) => b.id !== bedId));
          setActiveVertex(null);
          setActiveBedId(null);
          return;
        }

        commit(
          shapesRef.current,
          bedsRef.current.map((b) => (b.id === bedId ? { ...b, vertices: nextVerts, isClosed: true } : b))
        );
        setActiveVertex(null);
        setActiveBedId(bedId);
        return;
      }

      // delete selected bed
      if (activeBedId) {
        commit(shapesRef.current, bedsRef.current.filter((b) => b.id !== activeBedId));
        setActiveBedId(null);
        setActiveVertex(null);
        return;
      }

      // delete selected shape
      if (selectedShapeId) {
        commit(shapesRef.current.filter((s) => s.id !== selectedShapeId), bedsRef.current);
        setSelectedShapeId(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeBedId, activeVertex, cancelDraft, commit, draft, editMode, selectedShapeId]);

  // Bed mutations
  const moveBedBy = useCallback(
    (bedId: string, dx: number, dy: number) => {
      const nextBeds = bedsRef.current.map((b) => {
        if (b.id !== bedId) return b;
        return { ...b, vertices: b.vertices.map((p) => snapToGrid({ x: p.x + dx, y: p.y + dy })) };
      });
      commit(shapesRef.current, nextBeds);
    },
    [commit, snapToGrid]
  );

  // Smooth vertex drag (live update + commit once)
  const beginVertexDrag = useCallback((bedId: string, index: number) => {
    vertexDragRef.current = { bedId, index };
  }, []);

  const updateVertexDrag = useCallback((bedId: string, index: number, p: Position) => {
    const d = vertexDragRef.current;
    if (!d || d.bedId !== bedId || d.index !== index) return;

    setBeds((prev) =>
      prev.map((b) => {
        if (b.id !== bedId) return b;
        const nextVerts = b.vertices.map((v, i) => (i === index ? p : v));
        return { ...b, vertices: nextVerts, isClosed: true };
      })
    );
  }, []);

  const endVertexDrag = useCallback(
    (bedId: string, index: number) => {
      const d = vertexDragRef.current;
      vertexDragRef.current = null;
      if (!d || d.bedId !== bedId || d.index !== index) return;

      commit(shapesRef.current, bedsRef.current);
    },
    [commit]
  );

  const moveVertexTo = useCallback(
    (bedId: string, index: number, p: Position) => {
      const snapped = snapToGrid(p);
      const nextBeds = bedsRef.current.map((b) => {
        if (b.id !== bedId) return b;
        const nextVerts = b.vertices.map((v, i) => (i === index ? snapped : v));
        return { ...b, vertices: nextVerts, isClosed: true };
      });
      commit(shapesRef.current, nextBeds);
    },
    [commit, snapToGrid]
  );

  const resizeBedToBox = useCallback(
    (bedId: string, nextBox: Box) => {
      const bed = bedsRef.current.find((b) => b.id === bedId);
      if (!bed) return;

      const xs = bed.vertices.map((v) => v.x);
      const ys = bed.vertices.map((v) => v.y);
      const prevBox: Box = {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      };

      const prevW = Math.max(1, prevBox.maxX - prevBox.minX);
      const prevH = Math.max(1, prevBox.maxY - prevBox.minY);

      const nextW = Math.max(1, nextBox.maxX - nextBox.minX);
      const nextH = Math.max(1, nextBox.maxY - nextBox.minY);

      const nextVerts = bed.vertices.map((v) => {
        const nx = (v.x - prevBox.minX) / prevW;
        const ny = (v.y - prevBox.minY) / prevH;
        return snapToGrid({ x: nextBox.minX + nx * nextW, y: nextBox.minY + ny * nextH });
      });

      commit(
        shapesRef.current,
        bedsRef.current.map((b) => (b.id === bedId ? { ...b, vertices: nextVerts, isClosed: true } : b))
      );
    },
    [commit, snapToGrid]
  );

  // Smooth bed drag (live update; commit once)
  const beginBedDrag = useCallback((bedId: string, clientX: number, clientY: number) => {
    const bed = bedsRef.current.find((b) => b.id === bedId);
    if (!bed) return;

    bedDragRef.current = {
      bedId,
      startClientX: clientX,
      startClientY: clientY,
      startVerts: bed.vertices.map((p) => ({ ...p })),
    };
  }, []);

  const updateBedDrag = useCallback(
    (bedId: string, clientX: number, clientY: number) => {
      const d = bedDragRef.current;
      if (!d || d.bedId !== bedId) return;

      const dx = (clientX - d.startClientX) / scale;
      const dy = (clientY - d.startClientY) / scale;

      setBeds((prev) =>
        prev.map((b) => {
          if (b.id !== bedId) return b;
          return { ...b, vertices: d.startVerts.map((p) => ({ x: p.x + dx, y: p.y + dy })), isClosed: true };
        })
      );
    },
    [scale]
  );

  const endBedDrag = useCallback(
    (bedId: string) => {
      const d = bedDragRef.current;
      bedDragRef.current = null;
      if (!d || d.bedId !== bedId) return;

      const nextBeds = bedsRef.current.map((b) => {
        if (b.id !== bedId) return b;
        return { ...b, vertices: b.vertices.map((p) => snapToGrid(p)), isClosed: true };
      });

      commit(shapesRef.current, nextBeds);
    },
    [commit, snapToGrid]
  );

  // Smooth shape drag (live update; commit once)
  const beginShapeDrag = useCallback((shapeId: string, clientX: number, clientY: number) => {
    const s = shapesRef.current.find((x) => x.id === shapeId);
    if (!s) return;

    shapeDragRef.current = {
      shapeId,
      startClientX: clientX,
      startClientY: clientY,
      startPos: { ...s.startPos },
      endPos: { ...s.endPos },
      startPoints: s.type === "freehand" ? ([...(((s as any).points as Position[]) || [])] as Position[]) : null,
      type: s.type,
    };
  }, []);

  const updateShapeDrag = useCallback(
    (shapeId: string, clientX: number, clientY: number) => {
      const d = shapeDragRef.current;
      if (!d || d.shapeId !== shapeId) return;

      const dx = (clientX - d.startClientX) / scale;
      const dy = (clientY - d.startClientY) / scale;

      setShapes((prev) =>
        prev.map((s) => {
          if (s.id !== shapeId) return s;

          if (d.type === "freehand" && d.startPoints) {
            return {
              ...(s as any),
              points: d.startPoints.map((p) => ({ x: p.x + dx, y: p.y + dy })),
            } as any;
          }

          return {
            ...s,
            startPos: { x: d.startPos.x + dx, y: d.startPos.y + dy },
            endPos: { x: d.endPos.x + dx, y: d.endPos.y + dy },
          } as Shape;
        })
      );
    },
    [scale]
  );

  const endShapeDrag = useCallback(
    (shapeId: string) => {
      const d = shapeDragRef.current;
      shapeDragRef.current = null;
      if (!d || d.shapeId !== shapeId) return;

      // Snap behavior for lines only.
      const nextShapes = shapesRef.current.map((s) => {
        if (s.id !== shapeId) return s;
        if (s.type !== "line") return s;

        const snappedStart = snapToGrid(s.startPos);
        const offsetX = snappedStart.x - s.startPos.x;
        const offsetY = snappedStart.y - s.startPos.y;

        return {
          ...s,
          startPos: snappedStart,
          endPos: { x: s.endPos.x + offsetX, y: s.endPos.y + offsetY },
        } as Shape;
      });

      commit(nextShapes, bedsRef.current);
    },
    [commit, snapToGrid]
  );

  // Smooth shape resize (live update; commit once)
  const beginShapeResize = useCallback((shapeId: string) => {
    shapeResizeRef.current = { shapeId };
  }, []);

  const updateShapeResize = useCallback((shapeId: string, updates: Partial<Shape>) => {
    const d = shapeResizeRef.current;
    if (!d || d.shapeId !== shapeId) return;

    setShapes((prev) => prev.map((s) => (s.id === shapeId ? ({ ...s, ...updates } as Shape) : s)));
  }, []);

  const endShapeResize = useCallback(
    (shapeId: string) => {
      const d = shapeResizeRef.current;
      shapeResizeRef.current = null;
      if (!d || d.shapeId !== shapeId) return;

      commit(shapesRef.current, bedsRef.current);
    },
    [commit]
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
    setDraft(null);
    setPreviewEnd(null);
    setToolMode("none");
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
    setDraft(null);
    setPreviewEnd(null);
    setToolMode("none");
  }, [history, historyIndex]);

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
            selectedShapeId={selectedShapeId}
            activeBedId={activeBedId}
            activeVertex={activeVertex}
            draftVertices={draft?.vertices ?? null}
            draftPreviewEnd={previewEnd}
            drawModeActive={toolMode === "draw"}
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
            onResizeBedToBox={resizeBedToBox}
            onBeginBedDrag={beginBedDrag}
            onUpdateBedDrag={updateBedDrag}
            onEndBedDrag={endBedDrag}
            onBeginVertexDrag={beginVertexDrag}
            onUpdateVertexDrag={updateVertexDrag}
            onEndVertexDrag={endVertexDrag}
            onBeginShapeDrag={beginShapeDrag}
            onUpdateShapeDrag={updateShapeDrag}
            onEndShapeDrag={endShapeDrag}
            onBeginShapeResize={beginShapeResize}
            onUpdateShapeResize={updateShapeResize}
            onEndShapeResize={endShapeResize}
            onShapeUpdate={(shapeId, updates) => {
              // One-off updates are fine here; drag/resize paths should use the smooth handlers.
              const nextShapes = shapesRef.current.map((s) => (s.id === shapeId ? ({ ...s, ...updates } as Shape) : s));
              commit(nextShapes, bedsRef.current);
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
              <button
                onClick={() => {
                  setToolMode("none");
                  setDraft(null);
                  setPreviewEnd(null);
                  createCircleShape();
                }}
                className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
                title="Circle"
              >
                <FaRegCircle size={25} />
              </button>

              <button
                onClick={startDrawMode}
                className={`p-2 rounded text-green-800 ${toolMode === "draw" ? "bg-gray-200" : "bg-gray-100 hover:bg-gray-200"}`}
                title="Draw (lines + beds). Hold Shift to start. Click points. Click start to close into a bed."
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
                    setActiveVertex(null);
                    setToolMode("none");
                    setDraft(null);
                    setPreviewEnd(null);
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
                  setActiveVertex(null);
                  setDraft(null);
                  setPreviewEnd(null);
                }}
                className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-green-800"
                title="Exit Edit Mode"
              >
                <TbCircleXFilled size={25} />
              </button>
            </div>

            {toolMode === "draw" && (
              <div className="text-xs text-green-800 font-semibold select-none">
                Draw — hold <span className="font-bold">Shift</span> to start. Click to add points. Click the{" "}
                <span className="font-bold">first point</span> to close into a bed.
                {draft ? (
                  <span className="ml-1">
                    (<span className="font-bold">Esc</span> cancels)
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Canvas;