import React, { useState } from "react";
import { Shape } from "../types/shapes";

interface ShapeRendererProps {
  shapes: Shape[];
  scale: number;
  snapToShapes?: boolean;
  onShapeUpdate?: (shapeId: string, updates: Partial<Shape>) => void;
}

const HANDLE_SIZE = 10;
const ROTATE_HANDLE_OFFSET = 40;
const SNAP_ANGLE = 15; // degrees

const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  shapes,
  scale,
  snapToShapes = true,
  onShapeUpdate,
}) => {
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  // --- Shape dragging ---
  const handleShapeMouseDown = (shapeId: string) => {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedShapeId(shapeId);

      const shape = shapes.find((s) => s.id === shapeId);
      if (!shape) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const originalStart = { ...shape.startPos };
      const originalEnd = { ...shape.endPos };

      const handleMove = (moveEvent: MouseEvent) => {
        const dx = (moveEvent.clientX - startX) / scale;
        const dy = (moveEvent.clientY - startY) / scale;

        onShapeUpdate?.(shapeId, {
          startPos: {
            x: originalStart.x + dx,
            y: originalStart.y + dy,
          },
          endPos: {
            x: originalEnd.x + dx,
            y: originalEnd.y + dy,
          },
        });
      };

      const handleUp = () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    };
  };

  // --- Resize handles ---
  const handleResizeMouseDown = (
    shapeId: string,
    direction:
      | "top-left"
      | "top"
      | "top-right"
      | "right"
      | "bottom-right"
      | "bottom"
      | "bottom-left"
      | "left"
  ) => {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedShapeId(shapeId);

      const shape = shapes.find((s) => s.id === shapeId);
      if (!shape) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const origStart = { ...shape.startPos };
      const origEnd = { ...shape.endPos };

      const handleMove = (moveEvent: MouseEvent) => {
        const dx = (moveEvent.clientX - startX) / scale;
        const dy = (moveEvent.clientY - startY) / scale;

        let newStart = { ...origStart };
        let newEnd = { ...origEnd };

        switch (direction) {
          case "top-left":
            newStart = { x: origStart.x + dx, y: origStart.y + dy };
            break;
          case "top":
            newStart = { x: origStart.x, y: origStart.y + dy };
            break;
          case "top-right":
            newStart = { x: origStart.x, y: origStart.y + dy };
            newEnd = { x: origEnd.x + dx, y: origEnd.y };
            break;
          case "right":
            newEnd = { x: origEnd.x + dx, y: origEnd.y };
            break;
          case "bottom-right":
            newEnd = { x: origEnd.x + dx, y: origEnd.y + dy };
            break;
          case "bottom":
            newEnd = { x: origEnd.x, y: origEnd.y + dy };
            break;
          case "bottom-left":
            newStart = { x: origStart.x + dx, y: origStart.y };
            newEnd = { x: origEnd.x, y: origEnd.y + dy };
            break;
          case "left":
            newStart = { x: origStart.x + dx, y: origStart.y };
            break;
        }

        onShapeUpdate?.(shapeId, { startPos: newStart, endPos: newEnd });
      };

      const handleUp = () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    };
  };

  // --- Rotation handle ---
  const handleRotateMouseDown = (shapeId: string) => {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedShapeId(shapeId);

      const shape = shapes.find((s) => s.id === shapeId);
      if (!shape) return;

      const rectCenter = {
        x: (shape.startPos.x + shape.endPos.x) / 2,
        y: (shape.startPos.y + shape.endPos.y) / 2,
      };
      const originalRotation = shape.rotation || 0;

      const startAngle =
        Math.atan2(
          e.clientY - rectCenter.y * scale,
          e.clientX - rectCenter.x * scale
        ) *
        (180 / Math.PI);

      const handleMove = (moveEvent: MouseEvent) => {
        const currentAngle =
          Math.atan2(
            moveEvent.clientY - rectCenter.y * scale,
            moveEvent.clientX - rectCenter.x * scale
          ) *
          (180 / Math.PI);
        let delta = currentAngle - startAngle;
        let newRotation = originalRotation + delta;

        // Snapping (Shift key)
        if (moveEvent.shiftKey) {
          newRotation = Math.round(newRotation / SNAP_ANGLE) * SNAP_ANGLE;
        }

        onShapeUpdate?.(shapeId, { rotation: newRotation });
      };

      const handleUp = () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    };
  };

  // --- Rotated handle coordinates ---
  const getRotatedHandlePosition = (
    cx: number,
    cy: number,
    offsetX: number,
    offsetY: number,
    rotation: number
  ) => {
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x: cx + offsetX * cos - offsetY * sin,
      y: cy + offsetX * sin + offsetY * cos,
    };
  };

  // --- Render handles with rotation ---
  const renderHandles = (
    shapeId: string,
    left: number,
    top: number,
    width: number,
    height: number,
    rotation: number
  ) => {
    const cx = left + width / 2;
    const cy = top + height / 2;

    const corners = [
      ["top-left", -width / 2, -height / 2],
      ["top", 0, -height / 2],
      ["top-right", width / 2, -height / 2],
      ["right", width / 2, 0],
      ["bottom-right", width / 2, height / 2],
      ["bottom", 0, height / 2],
      ["bottom-left", -width / 2, height / 2],
      ["left", -width / 2, 0],
    ] as const;

    return corners.map(([dir, ox, oy]) => {
      const { x, y } = getRotatedHandlePosition(cx, cy, ox, oy, rotation);
      return (
        <div
          key={`${shapeId}-${dir}`}
          style={{
            position: "absolute",
            left: `${x - HANDLE_SIZE / 2}px`,
            top: `${y - HANDLE_SIZE / 2}px`,
            width: `${HANDLE_SIZE}px`,
            height: `${HANDLE_SIZE}px`,
            backgroundColor: "white",
            border: "1px solid black",
            cursor: `${dir}-resize`,
            zIndex: 20,
          }}
          onMouseDown={handleResizeMouseDown(shapeId, dir)}
        />
      );
    });
  };

  // --- Render each shape ---
  const renderShape = (shape: Shape) => {
    const { startPos, endPos, color, strokeWidth, type } = shape;
    const rotation = shape.rotation || 0;
    const width = Math.abs(endPos.x - startPos.x);
    const height = Math.abs(endPos.y - startPos.y);
    const left = Math.min(startPos.x, endPos.x);
    const top = Math.min(startPos.y, endPos.y);
    const isSelected = shape.id === selectedShapeId;

    if (type === "rectangle" || type === "circle") {
      const cx = left + width / 2;
      const cy = top + height / 2;

      const shapeStyle: React.CSSProperties = {
        position: "absolute",
        left: `${cx}px`,
        top: `${cy}px`,
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        border: `${strokeWidth}px solid ${color}`,
        borderRadius: type === "circle" ? "50%" : "0%",
        backgroundColor: `${color}33`,
        cursor: "move",
        boxShadow: isSelected ? "0 0 0 2px #0070f3" : "none",
        boxSizing: "border-box",
      };

      const handles = isSelected && (
        <>
          {renderHandles(shape.id, left, top, width, height, rotation)}
          {/* Rotation handle above top center */}
          {(() => {
            const rotatePos = getRotatedHandlePosition(
              cx,
              cy,
              0,
              -height / 2 - ROTATE_HANDLE_OFFSET,
              rotation
            );
            return (
              <div
                key={`${shape.id}-rotate`}
                style={{
                  position: "absolute",
                  left: `${rotatePos.x - HANDLE_SIZE / 2}px`,
                  top: `${rotatePos.y - HANDLE_SIZE / 2}px`,
                  width: `${HANDLE_SIZE}px`,
                  height: `${HANDLE_SIZE}px`,
                  backgroundColor: "#0070f3",
                  borderRadius: "50%",
                  cursor: "grab",
                  zIndex: 25,
                }}
                onMouseDown={handleRotateMouseDown(shape.id)}
              />
            );
          })()}
        </>
      );

      return (
        <div key={shape.id}>
          <div style={shapeStyle} onMouseDown={handleShapeMouseDown(shape.id)} />
          {handles}
        </div>
      );
    }

    // --- Lines remain same ---
    if (type === "line") {
      const angle =
        Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x) *
        (180 / Math.PI);
      const length = Math.sqrt(width ** 2 + height ** 2);
      const isSelected = shape.id === selectedShapeId;

      return (
        <div key={shape.id}>
          <div
            style={{
              position: "absolute",
              left: `${startPos.x}px`,
              top: `${startPos.y}px`,
              width: `${length}px`,
              height: `${Math.max(strokeWidth, 8)}px`,
              backgroundColor: color,
              transformOrigin: "0 50%",
              transform: `rotate(${angle}deg)`,
              cursor: "move",
              pointerEvents: "auto",
              boxShadow: isSelected ? "0 0 0 2px #0070f3" : "none",
            }}
            onMouseDown={handleShapeMouseDown(shape.id)}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div
      style={{ position: "relative", width: "100%", height: "100%" }}
      onMouseDown={() => setSelectedShapeId(null)}
    >
      {shapes.map(renderShape)}
    </div>
  );
};

export default ShapeRenderer;
