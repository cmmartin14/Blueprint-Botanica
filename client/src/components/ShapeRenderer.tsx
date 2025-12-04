"use client";

import React, { useRef, useState } from "react";
import { Shape } from "../types/shapes";

interface ShapeRendererProps {
  shapes: Shape[];
  scale: number;
  pan: { x: number; y: number };
  gridToUnit?: number;
  onShapeUpdate?: (shapeId: string, updates: Partial<Shape>) => void;
  onShapeSelect?: (shapeId: string) => void;
}

const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  shapes,
  scale,
  pan,
  gridToUnit = 1,
  onShapeUpdate,
  onShapeSelect,
}) => {
  const [draggingShapeId, setDraggingShapeId] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = (shape: Shape, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingShapeId(shape.id);
    dragOffset.current = {
      x: e.clientX - shape.startPos.x,
      y: e.clientY - shape.startPos.y,
    };
    onShapeSelect?.(shape.id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingShapeId) return;
    const shape = shapes.find((s) => s.id === draggingShapeId);
    if (!shape) return;

    const deltaX = e.clientX - dragOffset.current.x;
    const deltaY = e.clientY - dragOffset.current.y;

    const width = shape.endPos.x - shape.startPos.x;
    const height = shape.endPos.y - shape.startPos.y;

    onShapeUpdate?.(shape.id, {
      startPos: { x: deltaX, y: deltaY },
      endPos: { x: deltaX + width, y: deltaY + height },
    });
  };

  const handleMouseUp = () => {
    setDraggingShapeId(null);
  };

  const feetToMeters = (feet: number) => (feet * 0.3048).toFixed(2);

  return (
    <div
      style={{ position: "absolute", width: "100%", height: "100%" }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {shapes.map((shape) => {
        const { id, type, startPos, endPos, color, strokeWidth } = shape;

        const width = Math.abs(endPos.x - startPos.x);
        const height = Math.abs(endPos.y - startPos.y);

        const styleBase: React.CSSProperties = {
          position: "absolute",
          left: Math.min(startPos.x, endPos.x),
          top: Math.min(startPos.y, endPos.y),
          cursor: "move",
          pointerEvents: "auto",
        };

        if (type === "circle") {
          const radius = Math.max(width, height) / 2;
          return (
            <div
              key={id}
              style={{
                ...styleBase,
                width: radius * 2,
                height: radius * 2,
                borderRadius: "50%",
                border: `${strokeWidth ?? 2}px solid ${color}`,
                backgroundColor: "transparent",
              }}
              onMouseDown={(e) => handleMouseDown(shape, e)}
            />
          );
        }

        if (type === "line") {
          const angle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x) * (180 / Math.PI);
          const length = Math.sqrt(width ** 2 + height ** 2);

          return (
            <div
              key={id}
              style={{
                ...styleBase,
                width: length,
                height: Math.max(strokeWidth ?? 2, 8),
                backgroundColor: color,
                transformOrigin: "0 50%",
                transform: `rotate(${angle}deg)`,
              }}
              onMouseDown={(e) => handleMouseDown(shape, e)}
            />
          );
        }

        return null;
      })}
    </div>
  );
};

export default ShapeRenderer;


