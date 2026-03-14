// ShapeRenderer.tsx
"use client";

import React from "react";
import { FaInfoCircle } from "react-icons/fa";
import { Shape, Position } from "../types/shapes";

type BedPath = {
  id: string;
  vertices: Position[];
  isClosed: boolean;
};

type Box = { minX: number; minY: number; maxX: number; maxY: number };

type HtmlContextInfoButtonProps = {
  x: number;
  y: number;
  title?: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

const HtmlContextInfoButton: React.FC<HtmlContextInfoButtonProps> = ({
  x,
  y,
  title = "Open details",
  onClick,
}) => {
  return (
    <button
      type="button"
      data-interactive="true"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onClick}
      title={title}
      style={{
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
        width: "32px",
        height: "32px",
        borderRadius: "9999px",
        border: "1px solid #d1d5db",
        backgroundColor: "rgba(255,255,255,0.96)",
        color: "#2f4f2f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        pointerEvents: "auto",
        zIndex: 12,
      }}
    >
      <FaInfoCircle size={16} />
    </button>
  );
};

type SvgContextInfoButtonProps = {
  x: number;
  y: number;
  title?: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

const SvgContextInfoButton: React.FC<SvgContextInfoButtonProps> = ({
  x,
  y,
  title = "Open details",
  onClick,
}) => {
  return (
    <foreignObject
      x={x}
      y={y}
      width="32"
      height="32"
      style={{ overflow: "visible" }}
      pointerEvents="auto"
    >
      <button
        type="button"
        data-interactive="true"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={onClick}
        title={title}
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "9999px",
          border: "1px solid #d1d5db",
          backgroundColor: "rgba(255,255,255,0.96)",
          color: "#2f4f2f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
          pointerEvents: "auto",
        }}
      >
        <FaInfoCircle size={16} />
      </button>
    </foreignObject>
  );
};

interface ShapeRendererProps {
  shapes: Shape[];
  beds?: any[];
  scale: number;
  pan: { x: number; y: number };
  gridToUnit?: number;

  canEdit: boolean;

  bedPlants?: Record<
    string,
    {
      id: number;
      common_name?: string | null;
      scientific_name?: string | string[];
    }[]
  >;
  onOpenBedPanel?: (shapeId: string) => void;

  selectedShapeId: string | null;
  showDimensions: boolean;

  activeBedId: string | null;
  activeVertex: { bedId: string; index: number } | null;

  drawModeActive: boolean;
  draftVertices: Position[] | null;
  draftPreviewEnd: Position | null;

  onSelectBed: (bedId: string) => void;
  onSelectVertex: (bedId: string, index: number) => void;

  onMoveBedBy: (bedId: string, dx: number, dy: number) => void;

  onMoveVertexTo: (bedId: string, index: number, p: Position) => void;
  onResizeBedToBox: (bedId: string, nextBox: Box) => void;

  onBeginBedDrag: (bedId: string, clientX: number, clientY: number) => void;
  onUpdateBedDrag: (bedId: string, clientX: number, clientY: number) => void;
  onEndBedDrag: (bedId: string) => void;

  onBeginVertexDrag: (bedId: string, index: number) => void;
  onUpdateVertexDrag: (bedId: string, index: number, p: Position) => void;
  onEndVertexDrag: (bedId: string, index: number) => void;

  onBeginShapeDrag: (shapeId: string, clientX: number, clientY: number) => void;
  onUpdateShapeDrag: (shapeId: string, clientX: number, clientY: number) => void;
  onEndShapeDrag: (shapeId: string) => void;

  onBeginShapeResize: (shapeId: string) => void;
  onUpdateShapeResize: (shapeId: string, updates: Partial<Shape>) => void;
  onEndShapeResize: (shapeId: string) => void;

  onShapeUpdate?: (shapeId: string, updates: Partial<Shape>) => void;
  onShapeSelect?: (shapeId: string) => void;
}

const GRID_SIZE = 20;

const withAlpha = (color: string, alpha: number) => {
  const a = Math.max(0, Math.min(1, alpha));

  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex.length === 6
          ? hex
          : null;

    if (!full) return color;

    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  const rgbMatch = color.match(/^rgb\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)$/i);
  if (rgbMatch) {
    const r = Number(rgbMatch[1]);
    const g = Number(rgbMatch[2]);
    const b = Number(rgbMatch[3]);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  const rgbaMatch = color.match(
    /^rgba\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9.]+)\s*\)$/i
  );
  if (rgbaMatch) {
    const r = Number(rgbaMatch[1]);
    const g = Number(rgbaMatch[2]);
    const b = Number(rgbaMatch[3]);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  return color;
};

const bboxOfPoints = (pts: Position[]): Box => {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
};

const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  shapes,
  beds = [],
  scale,
  pan,
  gridToUnit = 1,
  canEdit,
  selectedShapeId,
  showDimensions,

  activeBedId,
  activeVertex,

  drawModeActive,
  draftVertices,
  draftPreviewEnd,

  onSelectBed,
  onSelectVertex,
  onMoveBedBy,
  onMoveVertexTo,
  onResizeBedToBox,

  onBeginBedDrag,
  onUpdateBedDrag,
  onEndBedDrag,

  onBeginVertexDrag,
  onUpdateVertexDrag,
  onEndVertexDrag,

  onBeginShapeDrag,
  onUpdateShapeDrag,
  onEndShapeDrag,

  onBeginShapeResize,
  onUpdateShapeResize,
  onEndShapeResize,

  onShapeUpdate,
  onShapeSelect,
  bedPlants = {},
  onOpenBedPanel,
}) => {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  const [hoveredBedId, setHoveredBedId] = React.useState<string | null>(null);
  const [hoveredBedAnchor, setHoveredBedAnchor] = React.useState<Position | null>(null);

  const getPlantDisplayName = (plant: {
    common_name?: string | null;
    scientific_name?: string | string[];
  }) => {
    if (plant.common_name && plant.common_name.trim()) {
      return plant.common_name;
    }

    if (Array.isArray(plant.scientific_name)) {
      return plant.scientific_name[0] ?? "Unnamed plant";
    }

    return plant.scientific_name ?? "Unnamed plant";
  };

  const showBedHover = (bedId: string, anchor: Position) => {
    setHoveredBedId(bedId);
    setHoveredBedAnchor(anchor);
  };

  const hideBedHover = () => {
    setHoveredBedId(null);
    setHoveredBedAnchor(null);
  };

  const hoveredPlants = hoveredBedId ? bedPlants[hoveredBedId] ?? [] : [];

  const snapToGrid = (x: number, y: number) => ({
    x: Math.round(x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(y / GRID_SIZE) * GRID_SIZE,
  });

  const feetToMeters = (feet: number) => (feet * 0.3048).toFixed(2);

  const getWorldFromClient = (clientX: number, clientY: number): Position | null => {
    const canvasElement = document.querySelector("[data-canvas]") as HTMLElement;
    const transformed = canvasElement?.querySelector("[data-transformed]") as HTMLElement;
    if (!canvasElement || !transformed) return null;

    const rect = canvasElement.getBoundingClientRect();
    const transform = transformed.style.transform;

    const translateMatch = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
    const scaleMatch = transform.match(/scale\(([^)]+)\)/);

    const panX = translateMatch ? parseFloat(translateMatch[1]) : 0;
    const panY = translateMatch ? parseFloat(translateMatch[2]) : 0;
    const currentScale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;

    const rawX = (clientX - rect.left - panX) / currentScale;
    const rawY = (clientY - rect.top - panY) / currentScale;
    return { x: rawX, y: rawY };
  };

  const normalizeBed = (bed: any): BedPath | null => {
    if (!bed) return null;
    const id = String(bed.id ?? bed.bedId ?? bed._id ?? "");
    if (!id) return null;

    let vertices = bed.vertices;
    if (!Array.isArray(vertices)) vertices = bed.points;
    if (!Array.isArray(vertices)) vertices = bed.path;
    if (!Array.isArray(vertices)) return null;

    const clean: Position[] = vertices
      .map((p: any) => (p && typeof p.x === "number" && typeof p.y === "number" ? { x: p.x, y: p.y } : null))
      .filter(Boolean) as Position[];

    return { id, vertices: clean, isClosed: Boolean(bed.isClosed) };
  };

  const normBeds: BedPath[] = beds.map(normalizeBed).filter(Boolean) as BedPath[];

  const bedPathD = (verts: Position[]) => {
    if (verts.length === 0) return "";
    const [first, ...rest] = verts;
    let d = `M ${first.x} ${first.y}`;
    for (const p of rest) d += ` L ${p.x} ${p.y}`;
    d += ` Z`;
    return d;
  };

  const openPathD = (verts: Position[]) => {
    if (verts.length === 0) return "";
    const [first, ...rest] = verts;
    let d = `M ${first.x} ${first.y}`;
    for (const p of rest) d += ` L ${p.x} ${p.y}`;
    return d;
  };

  const bboxOf = (verts: Position[]): Box => {
    const xs = verts.map((v) => v.x);
    const ys = verts.map((v) => v.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  };

  const handleBedMouseDown = (bedId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectBed(bedId);

    if (!canEdit) return;

    onBeginBedDrag(bedId, e.clientX, e.clientY);

    const handleMove = (moveEvent: MouseEvent) => {
      onUpdateBedDrag(bedId, moveEvent.clientX, moveEvent.clientY);
    };

    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      onEndBedDrag(bedId);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const handleVertexMouseDown = (bedId: string, index: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectVertex(bedId, index);

    if (!canEdit) return;

    onBeginVertexDrag(bedId, index);

    const handleMove = (moveEvent: MouseEvent) => {
      const world = getWorldFromClient(moveEvent.clientX, moveEvent.clientY);
      if (!world) return;
      const snapped = snapToGrid(world.x, world.y);
      onUpdateVertexDrag(bedId, index, snapped);
    };

    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      onEndVertexDrag(bedId, index);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const handleResizeHandleDown = (bed: BedPath, handle: "nw" | "ne" | "sw" | "se") => (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectBed(bed.id);

    if (!canEdit) return;

    const startBox = bboxOf(bed.vertices);

    const handleMove = (moveEvent: MouseEvent) => {
      const world = getWorldFromClient(moveEvent.clientX, moveEvent.clientY);
      if (!world) return;
      const p = snapToGrid(world.x, world.y);

      let nextBox: Box = { ...startBox };

      if (handle === "nw") {
        nextBox = {
          ...nextBox,
          minX: Math.min(p.x, startBox.maxX - GRID_SIZE),
          minY: Math.min(p.y, startBox.maxY - GRID_SIZE),
        };
      } else if (handle === "ne") {
        nextBox = {
          ...nextBox,
          maxX: Math.max(p.x, startBox.minX + GRID_SIZE),
          minY: Math.min(p.y, startBox.maxY - GRID_SIZE),
        };
      } else if (handle === "sw") {
        nextBox = {
          ...nextBox,
          minX: Math.min(p.x, startBox.maxX - GRID_SIZE),
          maxY: Math.max(p.y, startBox.minY + GRID_SIZE),
        };
      } else if (handle === "se") {
        nextBox = {
          ...nextBox,
          maxX: Math.max(p.x, startBox.minX + GRID_SIZE),
          maxY: Math.max(p.y, startBox.minY + GRID_SIZE),
        };
      }

      onResizeBedToBox(bed.id, nextBox);
    };

    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const handleShapeMouseDown = (shapeId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onShapeSelect?.(shapeId);

    if (!canEdit) return;

    onBeginShapeDrag(shapeId, e.clientX, e.clientY);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      onUpdateShapeDrag(shapeId, moveEvent.clientX, moveEvent.clientY);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      onEndShapeDrag(shapeId);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleEndpointMouseDown = (shapeId: string, endpoint: "start" | "end") => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;

    onBeginShapeResize(shapeId);

    const handleMove = (moveEvent: MouseEvent) => {
      const world = getWorldFromClient(moveEvent.clientX, moveEvent.clientY);
      if (!world) return;
      const snapped = snapToGrid(world.x, world.y);
      onUpdateShapeResize(shapeId, (endpoint === "start" ? { startPos: snapped } : { endPos: snapped }) as any);
    };

    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      onEndShapeResize(shapeId);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const handleCircleResizeMouseDown = (shapeId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;

    const shape = shapes.find((s) => s.id === shapeId);
    if (!shape) return;

    onBeginShapeResize(shapeId);

    const centerX = shape.startPos.x;

    const handleMove = (moveEvent: MouseEvent) => {
      const world = getWorldFromClient(moveEvent.clientX, moveEvent.clientY);
      if (!world) return;

      const dx = world.x - centerX;
      const newRadius = Math.max(0, dx);
      const snappedRadius = Math.round(newRadius / GRID_SIZE) * GRID_SIZE;

      onUpdateShapeResize(shapeId, {
        endPos: { x: centerX + snappedRadius, y: shape.startPos.y + snappedRadius },
      } as any);
    };

    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      onEndShapeResize(shapeId);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const handleFreehandResizeDown =
    (shapeId: string, handle: "nw" | "ne" | "sw" | "se", startPoints: Position[]) => (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!canEdit) return;
      if (startPoints.length < 2) return;

      const startBox = bboxOfPoints(startPoints);
      const startW = Math.max(1, startBox.maxX - startBox.minX);
      const startH = Math.max(1, startBox.maxY - startBox.minY);

      onBeginShapeResize(shapeId);

      const handleMove = (moveEvent: MouseEvent) => {
        const world = getWorldFromClient(moveEvent.clientX, moveEvent.clientY);
        if (!world) return;

        const p = snapToGrid(world.x, world.y);

        let nextBox: Box = { ...startBox };

        if (handle === "nw") {
          nextBox = {
            ...nextBox,
            minX: Math.min(p.x, startBox.maxX - GRID_SIZE),
            minY: Math.min(p.y, startBox.maxY - GRID_SIZE),
          };
        } else if (handle === "ne") {
          nextBox = {
            ...nextBox,
            maxX: Math.max(p.x, startBox.minX + GRID_SIZE),
            minY: Math.min(p.y, startBox.maxY - GRID_SIZE),
          };
        } else if (handle === "sw") {
          nextBox = {
            ...nextBox,
            minX: Math.min(p.x, startBox.maxX - GRID_SIZE),
            maxY: Math.max(p.y, startBox.minY + GRID_SIZE),
          };
        } else if (handle === "se") {
          nextBox = {
            ...nextBox,
            maxX: Math.max(p.x, startBox.minX + GRID_SIZE),
            maxY: Math.max(p.y, startBox.minY + GRID_SIZE),
          };
        }

        const nextW = Math.max(1, nextBox.maxX - nextBox.minX);
        const nextH = Math.max(1, nextBox.maxY - nextBox.minY);

        const nextPoints = startPoints.map((pt) => {
          const nx = (pt.x - startBox.minX) / startW;
          const ny = (pt.y - startBox.minY) / startH;
          return { x: nextBox.minX + nx * nextW, y: nextBox.minY + ny * nextH };
        });

        onUpdateShapeResize(shapeId, { points: nextPoints } as any);
      };

      const handleUp = () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
        onEndShapeResize(shapeId);
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    };

  const renderShape = (shape: Shape) => {
    const { type, startPos, endPos, color, strokeWidth } = shape;
    const isSelected = selectedShapeId === shape.id;
    const showShapeHandles = canEdit && isSelected;
    const glow = isSelected ? "drop-shadow(0 0 6px rgba(183,195,152,0.9))" : "none";

    const width = Math.abs(endPos.x - startPos.x);
    const height = Math.abs(endPos.y - startPos.y);

    if (type === "circle") {
      const radiusX = Math.abs(endPos.x - startPos.x);
      const radiusY = Math.abs(endPos.y - startPos.y);
      const radius = Math.max(radiusX, radiusY);

      const centerX = startPos.x;
      const centerY = startPos.y;

      const stroke = (shape as any).color ?? color ?? "#ffffff";
      const sw = (shape as any).strokeWidth ?? strokeWidth ?? 2;
      const fill = withAlpha(stroke, 0.18);

      const gridUnits = radius / GRID_SIZE;
      const feet = (gridUnits * gridToUnit).toFixed(1);
      const meters = feetToMeters(parseFloat(feet));

      const labelX = centerX;
      const labelY = centerY - radius - 20;

      const handleX = centerX + radius;
      const handleY = centerY;

      const plantCount = bedPlants[shape.id]?.length ?? 0;
      const showCircleInfoButton = isSelected;

      return (
        <div
          key={shape.id}
          data-interactive="true"
          onClick={(e) => {
            e.stopPropagation();
            onShapeSelect?.(shape.id);
          }}
        >
          <div
            data-interactive="true"
            style={{
              position: "absolute",
              width: radius * 2,
              height: radius * 2,
              borderRadius: "50%",
              border: `${sw}px solid ${stroke}`,
              backgroundColor: fill,
              left: centerX - radius,
              top: centerY - radius,
              cursor: canEdit ? "move" : "pointer",
              pointerEvents: "auto",
              filter: glow,
            }}
            onMouseDown={handleShapeMouseDown(shape.id)}
            onMouseEnter={() =>
              showBedHover(shape.id, {
                x: centerX,
                y: centerY - radius,
              })
            }
            onMouseLeave={hideBedHover}
          />

          {showDimensions && (
            <div
              style={{
                position: "absolute",
                left: `${labelX}px`,
                top: `${labelY}px`,
                transform: "translate(-50%, -50%)",
                backgroundColor: "rgba(255,255,255,0.95)",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#1f2937",
                border: "1px solid #d1d5db",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                zIndex: 5,
              }}
            >
              Radius: {feet} ft
              <div style={{ fontSize: "10px", color: "#6b7280" }}>{meters} m</div>
            </div>
          )}

          {/* Plant count badge */}
          {plantCount > 0 && (
            <div
              style={{
                position: "absolute",
                left: `${centerX}px`,
                top: `${centerY + radius + 8}px`,
                transform: "translate(-50%, 0)",
                backgroundColor: "#4a7c59",
                color: "#fff",
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "99px",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                zIndex: 6,
                border: "1px solid rgba(255,255,255,0.4)",
              }}
            >
              {plantCount} plant{plantCount !== 1 ? "s" : ""}
            </div>
          )}

          {showCircleInfoButton && (
            <HtmlContextInfoButton
              x={centerX + radius - 10}
              y={centerY - radius - 10}
              title="Open bed details"
              onClick={(e) => {
                e.stopPropagation();
                onOpenBedPanel?.(shape.id);
              }}
            />
          )}

          {/* Circle resize handle: only when selected AND edit mode is active */}
          {showShapeHandles && (
            <div
              data-interactive="true"
              style={{
                position: "absolute",
                left: `${handleX - 6}px`,
                top: `${handleY - 6}px`,
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#111",
                border: "2px solid white",
                cursor: "ew-resize",
                pointerEvents: "auto",
                zIndex: 10,
              }}
              onMouseDown={handleCircleResizeMouseDown(shape.id)}
              onClick={stop}
            />
          )}
        </div>
      );
    }

    if (type === "line") {
      const angle = (Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x) * 180) / Math.PI;
      const length = Math.sqrt(width ** 2 + height ** 2);

      const gridUnits = length / GRID_SIZE;
      const feetLength = (gridUnits * gridToUnit).toFixed(1);
      const metersLength = feetToMeters(parseFloat(feetLength));

      const midX = (startPos.x + endPos.x) / 2;
      const midY = (startPos.y + endPos.y) / 2;
      const perpRad = ((angle + 90) * Math.PI) / 180;

      const labelX = midX + Math.cos(perpRad) * 20;
      const labelY = midY + Math.sin(perpRad) * 20;

      return (
        <div
          key={shape.id}
          data-interactive="true"
          onClick={(e) => {
            e.stopPropagation();
            onShapeSelect?.(shape.id);
          }}
        >
          <div
            data-interactive="true"
            style={{
              position: "absolute",
              left: `${startPos.x}px`,
              top: `${startPos.y}px`,
              width: `${length}px`,
              height: `${Math.max(strokeWidth ?? 2, 8)}px`,
              backgroundColor: color,
              transformOrigin: "0 50%",
              transform: `rotate(${angle}deg)`,
              cursor: canEdit ? "move" : "pointer",
              pointerEvents: "auto",
            }}
            onMouseDown={handleShapeMouseDown(shape.id)}
            onClick={stop}
          />

          <div
            style={{
              position: "absolute",
              left: `${labelX}px`,
              top: `${labelY}px`,
              transform: "translate(-50%, -50%)",
              backgroundColor: "rgba(255,255,255,0.95)",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#1f2937",
              border: "1px solid #d1d5db",
              pointerEvents: "none",
              whiteSpace: "nowrap",
              zIndex: 5,
            }}
          >
            {feetLength} ft
            <div style={{ fontSize: "10px", color: "#6b7280" }}>{metersLength} m</div>
          </div>

          {/* Line endpoints are resize handles: only show when selected AND edit mode is active */}
          {showShapeHandles && (
            <>
              <div
                data-interactive="true"
                data-line-endpoint="true"
                data-shape-id={shape.id}
                data-endpoint="start"
                style={{
                  position: "absolute",
                  left: `${startPos.x - 6}px`,
                  top: `${startPos.y - 6}px`,
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "black",
                  border: "2px solid white",
                  cursor: "pointer",
                  pointerEvents: "auto",
                  zIndex: 10,
                }}
                onMouseDown={handleEndpointMouseDown(shape.id, "start")}
              />

              <div
                data-interactive="true"
                data-line-endpoint="true"
                data-shape-id={shape.id}
                data-endpoint="end"
                style={{
                  position: "absolute",
                  left: `${endPos.x - 6}px`,
                  top: `${endPos.y - 6}px`,
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "black",
                  border: "2px solid white",
                  cursor: "pointer",
                  pointerEvents: "auto",
                  zIndex: 10,
                }}
                onMouseDown={handleEndpointMouseDown(shape.id, "end")}
              />
            </>
          )}
        </div>
      );
    }

    if (type === "rectangle") {
      const left = Math.min(startPos.x, endPos.x);
      const top = Math.min(startPos.y, endPos.y);
      const showRectangleInfoButton = isSelected;

      return (
        <div
          key={shape.id}
          data-interactive="true"
          onClick={(e) => {
            e.stopPropagation();
            onShapeSelect?.(shape.id);
          }}
        >
          <div
            data-interactive="true"
            style={{
              position: "absolute",
              left,
              top,
              width,
              height,
              border: `${strokeWidth ?? 2}px solid ${color}`,
              backgroundColor: "transparent",
              cursor: canEdit ? "move" : "pointer",
              pointerEvents: "auto",
              filter: glow,
            }}
            onMouseDown={handleShapeMouseDown(shape.id)}
            onClick={stop}
            onMouseEnter={() =>
              showBedHover(shape.id, {
                x: left + width / 2,
                y: top,
              })
            }
            onMouseLeave={hideBedHover}
          />

          {showRectangleInfoButton && (
            <HtmlContextInfoButton
              x={left + width - 10}
              y={top - 10}
              title="Open bed details"
              onClick={(e) => {
                e.stopPropagation();
                onOpenBedPanel?.(shape.id);
              }}
            />
          )}
        </div>
      );
    }

    if (type === "freehand" && (shape as any).points && (shape as any).points.length > 1) {
      const pts = (shape as any).points as Position[];
      const box = bboxOfPoints(pts);
      const showFreehandInfoButton = isSelected;

      return (
        <svg
          key={shape.id}
          data-interactive="true"
          onClick={stop}
          style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}
        >
          <polyline
            data-interactive="true"
            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={(shape as any).color}
            strokeWidth={(shape as any).strokeWidth ?? 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="auto"
            style={{ cursor: canEdit ? "move" : "pointer", filter: glow }}
            onMouseDown={handleShapeMouseDown(shape.id)}
            onMouseEnter={() =>
              showBedHover(shape.id, {
                x: (box.minX + box.maxX) / 2,
                y: box.minY,
              })
            }
            onMouseLeave={hideBedHover}
            onClick={(e) => {
              e.stopPropagation();
              onShapeSelect?.(shape.id);
            }}
          />

          {showFreehandInfoButton && (
            <SvgContextInfoButton
              x={box.maxX + 10}
              y={box.minY - 10}
              title="Open bed details"
              onClick={(e) => {
                e.stopPropagation();
                onOpenBedPanel?.(shape.id);
              }}
            />
          )}

          {/* Freehand resize handles: only when selected AND edit mode is active */}
          {showShapeHandles &&
            (
              [
                ["nw", { x: box.minX, y: box.minY }],
                ["ne", { x: box.maxX, y: box.minY }],
                ["sw", { x: box.minX, y: box.maxY }],
                ["se", { x: box.maxX, y: box.maxY }],
              ] as const
            ).map(([h, p]) => (
              <rect
                key={`${shape.id}-fh-${h}`}
                data-interactive="true"
                x={p.x - 6}
                y={p.y - 6}
                width={12}
                height={12}
                fill="#111"
                stroke="white"
                strokeWidth={2}
                style={{ cursor: "nwse-resize", pointerEvents: "auto" }}
                onMouseDown={handleFreehandResizeDown(shape.id, h, pts.map((q) => ({ ...q })))}
              />
            ))}
        </svg>
      );
    }

    return null;
  };

  const renderDraft = () => {
    if (!drawModeActive || !draftVertices || draftVertices.length === 0) return null;

    const verts = draftVertices;
    const d = openPathD(verts);

    const last = verts[verts.length - 1];
    const preview =
      draftPreviewEnd && (draftPreviewEnd.x !== last.x || draftPreviewEnd.y !== last.y) ? draftPreviewEnd : null;

    return (
      <svg className="absolute inset-0" style={{ overflow: "visible", pointerEvents: "none" }}>
        {verts.length >= 2 && (
          <path d={d} fill="none" stroke="#ffffff" strokeWidth={2} strokeDasharray="10 8" opacity={0.9} />
        )}

        {preview && (
          <line
            x1={last.x}
            y1={last.y}
            x2={preview.x}
            y2={preview.y}
            stroke="#ffffff"
            strokeWidth={2}
            strokeDasharray="8 6"
            opacity={0.9}
          />
        )}

        <circle cx={verts[0].x} cy={verts[0].y} r={7} fill="#111" stroke="#B7C398" strokeWidth={3} opacity={0.95} />
        <circle cx={last.x} cy={last.y} r={6} fill="#111" stroke="white" strokeWidth={2} opacity={0.95} />
      </svg>
    );
  };

  const renderBedHoverTooltip = () => {
    if (!hoveredBedId || !hoveredBedAnchor) return null;

    const plantNames = hoveredPlants.map(getPlantDisplayName).slice(0, 8);
    const extraCount = Math.max(0, hoveredPlants.length - plantNames.length);

    return (
      <div
        style={{
          position: "absolute",
          left: hoveredBedAnchor.x,
          top: hoveredBedAnchor.y,
          transform: `translate(-50%, calc(-100% - 12px)) scale(${1 / Math.max(scale, 0.0001)})`,
          transformOrigin: "bottom center",
          backgroundColor: "rgba(255,255,255,0.97)",
          border: "1px solid #d1d5db",
          borderRadius: "10px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.16)",
          padding: "10px 12px",
          minWidth: "140px",
          maxWidth: "220px",
          color: "#1f2937",
          pointerEvents: "none",
          zIndex: 30,
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "#166534",
            marginBottom: "6px",
          }}
        >
          {hoveredPlants.length > 0
            ? `${hoveredPlants.length} plant${hoveredPlants.length !== 1 ? "s" : ""}`
            : "Empty Bed"}
        </div>

        {hoveredPlants.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            {plantNames.map((name, index) => (
              <div
                key={`${hoveredBedId}-plant-${index}`}
                style={{
                  fontSize: "12px",
                  lineHeight: 1.25,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {name}
              </div>
            ))}

            {extraCount > 0 && (
              <div
                style={{
                  fontSize: "11px",
                  color: "#6b7280",
                  marginTop: "2px",
                }}
              >
                +{extraCount} more
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              fontSize: "12px",
              color: "#6b7280",
            }}
          >
            No plants added yet
          </div>
        )}
      </div>
    );
  };

  const renderBeds = () => {
    return (
      <svg className="absolute inset-0" style={{ overflow: "visible", pointerEvents: "none" }}>
        {normBeds.map((bed) => {
          if (!bed.isClosed || bed.vertices.length < 3) return null;

          const isActive = bed.id === activeBedId;
          const showBedHandles = canEdit && isActive;
          const showBedInfoButton = isActive;

          const glow = isActive ? "drop-shadow(0 0 6px rgba(183,195,152,0.9))" : "none";

          const fill = "rgba(255,255,255,0.22)";
          const strokeWidth = isActive ? 4 : 3;

          const box = bboxOf(bed.vertices);
          const plantCount = bedPlants[bed.id]?.length ?? 0;

          const edgeLabels = bed.vertices.map((start, index) => {
            const end = bed.vertices[(index + 1) % bed.vertices.length];

            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const lengthPx = Math.sqrt(dx * dx + dy * dy);

            const lengthUnits = lengthPx / GRID_SIZE;
            const lengthFeet = (lengthUnits * gridToUnit).toFixed(1);
            const lengthMeters = feetToMeters(parseFloat(lengthFeet));

            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;

            const angle = Math.atan2(dy, dx);
            const perpX = -Math.sin(angle);
            const perpY = Math.cos(angle);

            const offset = 20;

            return {
              key: `${bed.id}-edge-${index}`,
              x: midX + perpX * offset,
              y: midY + perpY * offset,
              feet: lengthFeet,
              meters: lengthMeters,
            };
          });

          return (
            <g key={bed.id} style={{ pointerEvents: "auto" }} data-interactive="true" onClick={stop}>
              <path
                data-interactive="true"
                d={bedPathD(bed.vertices)}
                fill={fill}
                stroke="#ffffff"
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{ cursor: canEdit ? "move" : "pointer", filter: glow }}
                onMouseDown={handleBedMouseDown(bed.id)}
                onMouseEnter={() =>
                  showBedHover(bed.id, {
                    x: (box.minX + box.maxX) / 2,
                    y: box.minY,
                  })
                }
                onMouseLeave={hideBedHover}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectBed(bed.id);
                }}
              />

              {showDimensions &&
                edgeLabels.map((label) => (
                  <foreignObject
                    key={label.key}
                    x={label.x - 40}
                    y={label.y - 20}
                    width="80"
                    height="42"
                    pointerEvents="none"
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        width: "100%",
                        height: "100%",
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: "rgba(255,255,255,0.95)",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#1f2937",
                          border: "1px solid #d1d5db",
                          whiteSpace: "nowrap",
                          textAlign: "center",
                          lineHeight: 1.1,
                        }}
                      >
                        {label.feet} ft
                        <div style={{ fontSize: "10px", color: "#6b7280" }}>
                          {label.meters} m
                        </div>
                      </div>
                    </div>
                  </foreignObject>
                ))}

              {plantCount > 0 && (
                <foreignObject
                  x={(box.minX + box.maxX) / 2 - 50}
                  y={box.maxY + 8}
                  width="100"
                  height="30"
                  pointerEvents="none"
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "#4a7c59",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "99px",
                        whiteSpace: "nowrap",
                        border: "1px solid rgba(255,255,255,0.4)",
                      }}
                    >
                      {plantCount} plant{plantCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                </foreignObject>
              )}

              {showBedInfoButton && (
                <SvgContextInfoButton
                  x={box.maxX + 10}
                  y={box.minY - 10}
                  title="Open bed details"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenBedPanel?.(bed.id);
                  }}
                />
              )}

              {/* Bed resize handles + vertices: only when edit mode is active */}
              {showBedHandles && (
                <>
                  {(
                    [
                      ["nw", { x: box.minX, y: box.minY }],
                      ["ne", { x: box.maxX, y: box.minY }],
                      ["sw", { x: box.minX, y: box.maxY }],
                      ["se", { x: box.maxX, y: box.maxY }],
                    ] as const
                  ).map(([h, p]) => (
                    <rect
                      key={`${bed.id}-${h}`}
                      data-interactive="true"
                      x={p.x - 6}
                      y={p.y - 6}
                      width={12}
                      height={12}
                      fill="#111"
                      stroke="white"
                      strokeWidth={2}
                      style={{ cursor: "nwse-resize" }}
                      onMouseDown={handleResizeHandleDown(bed, h)}
                    />
                  ))}

                  {bed.vertices.map((v, idx) => {
                    const selected = activeVertex?.bedId === bed.id && activeVertex.index === idx;
                    return (
                      <g key={`${bed.id}-v-${idx}`} data-interactive="true">
                        {selected && (
                          <circle
                            cx={v.x}
                            cy={v.y}
                            r={14}
                            fill="rgba(183,195,152,0.18)"
                            stroke="rgba(183,195,152,0.6)"
                            strokeWidth={2}
                            pointerEvents="none"
                          />
                        )}
                        <circle
                          data-interactive="true"
                          cx={v.x}
                          cy={v.y}
                          r={selected ? 8 : 6}
                          fill={selected ? "#B7C398" : "#111"}
                          stroke="white"
                          strokeWidth={selected ? 3 : 2}
                          style={{ cursor: "pointer" }}
                          onMouseDown={handleVertexMouseDown(bed.id, idx)}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectVertex(bed.id, idx);
                          }}
                        />
                      </g>
                    );
                  })}
                </>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div style={{ position: "absolute", width: "100%", height: "100%", top: 0, left: 0, pointerEvents: "none" }}>
      {renderBeds()}
      {renderDraft()}
      {shapes.map(renderShape)}
      {renderBedHoverTooltip()}
    </div>
  );
};

export default ShapeRenderer;