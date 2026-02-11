"use client";

import React from "react";
import { Shape, Position } from "../types/shapes";

type BedPath = {
  id: string;
  segmentIds?: string[];
  vertices: Position[];
  isClosed: boolean;
};

interface ShapeRendererProps {
  shapes: Shape[];
  beds?: any[];
  scale: number;
  pan: { x: number; y: number };
  gridToUnit?: number;

  activeBedId: string | null;
  activeBedSegmentIds: string[];
  activeBedIsClosed: boolean;
  bedSelectModeActive: boolean;
  onToggleLineForActiveBed: (lineId: string) => void;

  onSelectBed: (bedId: string) => void;
  onMoveBedBy: (bedId: string, dx: number, dy: number) => void;
  onResizeBedHandleTo: (bedId: string, handle: "nw" | "ne" | "sw" | "se", p: Position) => void;

  lineStart?: Position | null;
  linePreviewEnd?: Position | null;
  linePreviewActive?: boolean;

  onShapeUpdate?: (shapeId: string, updates: Partial<Shape>) => void;
  onShapeSelect?: (shapeId: string) => void;
}

const GRID_SIZE = 20;

const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  shapes,
  beds = [],
  scale,
  pan,
  gridToUnit = 1,

  activeBedId,
  activeBedSegmentIds,
  activeBedIsClosed,
  bedSelectModeActive,
  onToggleLineForActiveBed,

  onSelectBed,
  onMoveBedBy,
  onResizeBedHandleTo,

  lineStart = null,
  linePreviewEnd = null,
  linePreviewActive = false,

  onShapeUpdate,
  onShapeSelect,
}) => {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

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
    if (!Array.isArray(vertices)) vertices = [];

    const clean: Position[] = vertices
      .map((p: any) => (p && typeof p.x === "number" && typeof p.y === "number" ? { x: p.x, y: p.y } : null))
      .filter(Boolean) as Position[];

    return {
      id,
      vertices: clean,
      isClosed: Boolean(bed.isClosed),
      segmentIds: Array.isArray(bed.segmentIds) ? bed.segmentIds.map(String) : undefined,
    };
  };

  const normBeds: BedPath[] = beds.map(normalizeBed).filter(Boolean) as BedPath[];

  const bedPathD = (bed: BedPath) => {
    if (!bed.vertices || bed.vertices.length === 0) return "";
    const [first, ...rest] = bed.vertices;
    let d = `M ${first.x} ${first.y}`;
    for (const p of rest) d += ` L ${p.x} ${p.y}`;
    if (bed.isClosed && bed.vertices.length >= 3) d += ` Z`;
    return d;
  };

  const bedBBox = (verts: Position[]) => {
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

    let lastX = e.clientX;
    let lastY = e.clientY;

    const handleMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - lastX) / scale;
      const dy = (moveEvent.clientY - lastY) / scale;
      onMoveBedBy(bedId, dx, dy);
      lastX = moveEvent.clientX;
      lastY = moveEvent.clientY;
    };

    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const handleResizeHandleMouseDown =
    (bedId: string, handle: "nw" | "ne" | "sw" | "se") => (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectBed(bedId);

      const handleMove = (moveEvent: MouseEvent) => {
        const world = getWorldFromClient(moveEvent.clientX, moveEvent.clientY);
        if (!world) return;
        const snapped = snapToGrid(world.x, world.y);
        onResizeBedHandleTo(bedId, handle, snapped);
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

    const shape = shapes.find((s) => s.id === shapeId);
    if (!shape) return;

    const startX = e.clientX;
    const startY = e.clientY;

    const originalStart = { ...shape.startPos };
    const originalEnd = { ...shape.endPos };
    const originalPoints = shape.type === "freehand" ? [...((shape as any).points || [])] : null;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;

      if (!onShapeUpdate) return;

      if (shape.type === "freehand" && originalPoints) {
        onShapeUpdate(shapeId, {
          points: originalPoints.map((p: any) => ({ x: p.x + dx, y: p.y + dy })),
        } as any);
      } else {
        const newStart = { x: originalStart.x + dx, y: originalStart.y + dy };
        const newEnd = { x: originalEnd.x + dx, y: originalEnd.y + dy };

        if (shape.type === "line") {
          const snappedStart = snapToGrid(newStart.x, newStart.y);
          const offsetX = snappedStart.x - newStart.x;
          const offsetY = snappedStart.y - newStart.y;

          onShapeUpdate(shapeId, {
            startPos: snappedStart,
            endPos: { x: newEnd.x + offsetX, y: newEnd.y + offsetY },
          } as any);
        } else {
          onShapeUpdate(shapeId, { startPos: newStart, endPos: newEnd } as any);
        }
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleEndpointMouseDown = (shapeId: string, endpoint: "start" | "end") => (e: React.MouseEvent) => {
    e.stopPropagation();
    const handleMove = (moveEvent: MouseEvent) => {
      const world = getWorldFromClient(moveEvent.clientX, moveEvent.clientY);
      if (!world) return;
      const snapped = snapToGrid(world.x, world.y);
      onShapeUpdate?.(shapeId, (endpoint === "start" ? { startPos: snapped } : { endPos: snapped }) as any);
    };
    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const handleCircleResizeMouseDown = (shapeId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const shape = shapes.find((s) => s.id === shapeId);
    if (!shape) return;

    const centerX = shape.startPos.x;

    const handleMove = (moveEvent: MouseEvent) => {
      const world = getWorldFromClient(moveEvent.clientX, moveEvent.clientY);
      if (!world) return;

      const dx = world.x - centerX;
      const newRadius = Math.max(0, dx);
      const snappedRadius = Math.round(newRadius / GRID_SIZE) * GRID_SIZE;

      onShapeUpdate?.(shapeId, {
        endPos: { x: centerX + snappedRadius, y: shape.startPos.y + snappedRadius },
      } as any);
    };

    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const renderLinePreview = () => {
    if (!linePreviewActive || !lineStart || !linePreviewEnd) return null;

    return (
      <svg className="absolute inset-0" style={{ overflow: "visible", pointerEvents: "none" }}>
        <line
          x1={lineStart.x}
          y1={lineStart.y}
          x2={linePreviewEnd.x}
          y2={linePreviewEnd.y}
          stroke="#ffffff"
          strokeWidth={2}
          strokeDasharray="8 6"
          opacity={0.9}
        />
        <circle cx={lineStart.x} cy={lineStart.y} r={6} fill="#111" stroke="white" strokeWidth={2} opacity={0.95} />
      </svg>
    );
  };

  const renderShape = (shape: Shape) => {
    const { type, startPos, endPos, color, strokeWidth } = shape;

    const width = Math.abs(endPos.x - startPos.x);
    const height = Math.abs(endPos.y - startPos.y);

    const commonStyle: React.CSSProperties = {
      position: "absolute",
      cursor: "move",
      pointerEvents: "auto",
    };

    if (type === "circle") {
      const radiusX = Math.abs(endPos.x - startPos.x);
      const radiusY = Math.abs(endPos.y - startPos.y);
      const radius = Math.max(radiusX, radiusY);

      const centerX = startPos.x;
      const centerY = startPos.y;

      const gridUnits = radius / GRID_SIZE;
      const feet = (gridUnits * gridToUnit).toFixed(1);
      const meters = feetToMeters(parseFloat(feet));

      const labelX = centerX;
      const labelY = centerY - radius - 20;

      const handleX = centerX + radius;
      const handleY = centerY;

      return (
        <div key={shape.id} data-interactive="true" onClick={stop}>
          <div
            data-interactive="true"
            style={{
              ...commonStyle,
              width: radius * 2,
              height: radius * 2,
              borderRadius: "50%",
              border: `${strokeWidth ?? 2}px solid ${color}`,
              backgroundColor: "transparent",
              left: centerX - radius,
              top: centerY - radius,
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
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 5,
            }}
          >
            Radius: {feet} ft
            <div style={{ fontSize: "10px", color: "#6b7280" }}>{meters} m</div>
          </div>

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

      const inActiveBed = activeBedSegmentIds.includes(shape.id);

      // ✅ more visible selection color
      const selectedColor = "#B7C398"; // consistent with your existing highlight tone
      const bodyColor = inActiveBed ? selectedColor : color;

      // ✅ if bed is closed, de-emphasize member line bodies so they don’t “split” the fill
      const bodyOpacity = inActiveBed && activeBedIsClosed && !bedSelectModeActive ? 0.15 : 1;

      const lineThickness = Math.max(strokeWidth ?? 2, 8);
      const activeGlow = inActiveBed ? "drop-shadow(0 0 6px rgba(183,195,152,0.95))" : "none";

      return (
        <div key={shape.id} data-interactive="true">
          <div
            data-interactive="true"
            style={{
              position: "absolute",
              left: `${startPos.x}px`,
              top: `${startPos.y}px`,
              width: `${length}px`,
              height: `${lineThickness}px`,
              backgroundColor: bodyColor,
              transformOrigin: "0 50%",
              transform: `rotate(${angle}deg)`,
              cursor: bedSelectModeActive ? "pointer" : "move",
              pointerEvents: "auto",
              filter: activeGlow,
              opacity: bodyOpacity,
            }}
            onMouseDown={bedSelectModeActive ? undefined : handleShapeMouseDown(shape.id)}
            onClick={(e) => {
              if (bedSelectModeActive) {
                e.stopPropagation();
                onToggleLineForActiveBed(shape.id);
                return;
              }
              stop(e);
            }}
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
        </div>
      );
    }

    if (type === "rectangle") {
      const left = Math.min(startPos.x, endPos.x);
      const top = Math.min(startPos.y, endPos.y);
      return (
        <div
          key={shape.id}
          data-interactive="true"
          style={{
            ...commonStyle,
            left,
            top,
            width,
            height,
            border: `${strokeWidth ?? 2}px solid ${color}`,
            backgroundColor: "transparent",
          }}
          onMouseDown={handleShapeMouseDown(shape.id)}
          onClick={stop}
        />
      );
    }

    if (type === "freehand" && (shape as any).points && (shape as any).points.length > 1) {
      const pts = (shape as any).points as Position[];
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
            style={{ cursor: "move" }}
            onMouseDown={handleShapeMouseDown(shape.id)}
            onClick={stop}
          />
        </svg>
      );
    }

    return null;
  };

  const renderBeds = () => {
    return (
      <svg className="absolute inset-0" style={{ overflow: "visible", pointerEvents: "none" }}>
        {normBeds.map((bed) => {
          if (!bed.vertices || bed.vertices.length < 3) return null;

          const isActive = bed.id === activeBedId;

          const stroke = "#ffffff";
          const strokeWidth = isActive ? 4 : 3;
          const glow = isActive ? "drop-shadow(0 0 6px rgba(183,195,152,0.9))" : "none";

          // ✅ Stronger fill to clearly shade whole interior
          const fill = bed.isClosed ? "rgba(255,255,255,0.22)" : "transparent";
          const dash = bed.isClosed ? undefined : "10 8";

          const { minX, maxX, minY, maxY } = bedBBox(bed.vertices);

          return (
            <g key={bed.id} style={{ pointerEvents: "auto" }} data-interactive="true">
              <path
                data-interactive="true"
                d={bedPathD(bed)}
                fill={fill}
                fillRule="evenodd"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={dash}
                style={{ cursor: bed.isClosed ? "move" : "default", filter: glow }}
                onMouseDown={bed.isClosed ? handleBedMouseDown(bed.id) : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectBed(bed.id);
                }}
              />

              {bed.isClosed && isActive && (
                <>
                  {(
                    [
                      ["nw", { x: minX, y: minY }],
                      ["ne", { x: maxX, y: minY }],
                      ["sw", { x: minX, y: maxY }],
                      ["se", { x: maxX, y: maxY }],
                    ] as const
                  ).map(([handle, pos]) => (
                    <rect
                      key={`${bed.id}-${handle}`}
                      data-interactive="true"
                      x={pos.x - 6}
                      y={pos.y - 6}
                      width={12}
                      height={12}
                      fill="#111"
                      stroke="white"
                      strokeWidth={2}
                      style={{ cursor: "nwse-resize" }}
                      onMouseDown={handleResizeHandleMouseDown(bed.id, handle)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ))}
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
      {renderLinePreview()}
      {renderBeds()}
      {shapes.map(renderShape)}
    </div>
  );
};

export default ShapeRenderer;