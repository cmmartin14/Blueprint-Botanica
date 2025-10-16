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

  // --- Helper to convert mouse delta to local (rotated) delta
  const getLocalDelta = (dx: number, dy: number, rotation: number) => {
    const rad = (-rotation * Math.PI) / 180; // inverse rotation
    const localDx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const localDy = dx * Math.sin(rad) + dy * Math.cos(rad);
    return { localDx, localDy };
  };

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

  // --- Rotated resizing ---
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

      const rotation = shape.rotation || 0;
      const startX = e.clientX;
      const startY = e.clientY;

      const origStart = { ...shape.startPos };
      const origEnd = { ...shape.endPos };

      const width = Math.abs(origEnd.x - origStart.x);
      const height = Math.abs(origEnd.y - origStart.y);
      const left = Math.min(origStart.x, origEnd.x);
      const top = Math.min(origStart.y, origEnd.y);
      const cx = left + width / 2;
      const cy = top + height / 2;

      const handleMove = (moveEvent: MouseEvent) => {
        const dx = (moveEvent.clientX - startX) / scale;
        const dy = (moveEvent.clientY - startY) / scale;

        // Convert mouse movement to shape-local coordinates
        const { localDx, localDy } = getLocalDelta(dx, dy, rotation);

        let newStart = { ...origStart };
        let newEnd = { ...origEnd };

        // Compute local bounding box
        let localLeft = -width / 2;
        let localRight = width / 2;
        let localTop = -height / 2;
        let localBottom = height / 2;

        // Modify local bounds based on which handle is dragged
        switch (direction) {
          case "top-left":
            localLeft += localDx;
            localTop += localDy;
            break;
          case "top":
            localTop += localDy;
            break;
          case "top-right":
            localRight += localDx;
            localTop += localDy;
            break;
          case "right":
            localRight += localDx;
            break;
          case "bottom-right":
            localRight += localDx;
            localBottom += localDy;
            break;
          case "bottom":
            localBottom += localDy;
            break;
          case "bottom-left":
            localLeft += localDx;
            localBottom += localDy;
            break;
          case "left":
            localLeft += localDx;
            break;
        }

        // Compute new corners in world coordinates
        const corners = [
          { x: localLeft, y: localTop },
          { x: localRight, y: localBottom },
        ];
        const rad = (rotation * Math.PI) / 180;

        const worldStart = {
          x:
            cx +
            corners[0].x * Math.cos(rad) -
            corners[0].y * Math.sin(rad),
          y:
            cy +
            corners[0].x * Math.sin(rad) +
            corners[0].y * Math.cos(rad),
        };
        const worldEnd = {
          x:
            cx +
            corners[1].x * Math.cos(rad) -
            corners[1].y * Math.sin(rad),
          y:
            cy +
            corners[1].x * Math.sin(rad) +
            corners[1].y * Math.cos(rad),
        };

        onShapeUpdate?.(shapeId, { startPos: worldStart, endPos: worldEnd });
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

  // --- Rotated handle positions ---
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

  // --- Render handles ---
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

  // --- Render shapes ---
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

