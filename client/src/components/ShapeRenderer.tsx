import React from "react";
import { Shape } from "../types/shapes";

interface ShapeRendererProps {
  shapes: Shape[];
  scale: number;
  snapToShapes?: boolean;
  onShapeUpdate?: (shapeId: string, updates: Partial<Shape>) => void;
}

const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  shapes,
  scale,
  snapToShapes = true,
  onShapeUpdate,
}) => {
  // Handle shape dragging
  const handleShapeMouseDown = (shapeId: string) => {
    return (e: React.MouseEvent) => {
      e.stopPropagation();

      const shape = shapes.find((s) => s.id === shapeId);
      if (!shape) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const originalStartPos = { ...shape.startPos };
      const originalEndPos = { ...shape.endPos };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = (moveEvent.clientX - startX) / scale;
        const deltaY = (moveEvent.clientY - startY) / scale;

        if (onShapeUpdate) {
          onShapeUpdate(shapeId, {
            startPos: {
              x: originalStartPos.x + deltaX,
              y: originalStartPos.y + deltaY,
            },
            endPos: {
              x: originalEndPos.x + deltaX,
              y: originalEndPos.y + deltaY,
            },
          });
        }
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };
  };

  // Handle endpoint dragging
  const handleEndpointMouseDown = (
    shapeId: string,
    endpoint: "start" | "end"
  ) => {
    return (e: React.MouseEvent) => {
      e.stopPropagation();

      const canvasElement = document.querySelector(
        "[data-canvas]"
      ) as HTMLElement;
      if (!canvasElement) return;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const rect = canvasElement.getBoundingClientRect();
        const x = (moveEvent.clientX - rect.left) / scale;
        const y = (moveEvent.clientY - rect.top) / scale;

        if (onShapeUpdate) {
          const updates =
            endpoint === "start"
              ? { startPos: { x, y } }
              : { endPos: { x, y } };
          onShapeUpdate(shapeId, updates);
        }
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };
  };

  // Render shapes
  const renderShape = (shape: Shape) => {
    const { startPos, endPos, color, strokeWidth } = shape;
    const width = Math.abs(endPos.x - startPos.x);
    const height = Math.abs(endPos.y - startPos.y);
    const left = Math.min(startPos.x, endPos.x);
    const top = Math.min(startPos.y, endPos.y);

    const commonStyles = {
      position: "absolute" as const,
      left: `${left}px`,
      top: `${top}px`,
      border: `${strokeWidth}px solid ${color}`,
      cursor: "move",
      pointerEvents: "auto" as const,
      boxSizing: "border-box" as const,
    };

    switch (shape.type) {
      case "rectangle":
        return (
          <div
            key={shape.id}
            style={{
              ...commonStyles,
              width: `${width}px`,
              height: `${height}px`,
              backgroundColor: `${color}33`,
            }}
            onMouseDown={handleShapeMouseDown(shape.id)}
          />
        );

      case "circle":
        const radius = Math.max(width, height) / 2;
        return (
          <div
            key={shape.id}
            style={{
              ...commonStyles,
              width: `${radius * 2}px`,
              height: `${radius * 2}px`,
              borderRadius: "50%",
              backgroundColor: `${color}33`,
            }}
            onMouseDown={handleShapeMouseDown(shape.id)}
          />
        );

      case "line":
        const angle =
          Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x) *
          (180 / Math.PI);
        const length = Math.sqrt(width ** 2 + height ** 2);
        return (
          <div key={shape.id}>
            {/* Main line - draggable */}
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
              }}
              onMouseDown={handleShapeMouseDown(shape.id)}
            />
            {/* Draggable start endpoint */}
            <div
              style={{
                position: "absolute",
                left: `${startPos.x - 6}px`,
                top: `${startPos.y - 6}px`,
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: color,
                border: "2px solid white",
                cursor: "pointer",
                pointerEvents: "auto",
                zIndex: 10,
              }}
              onMouseDown={handleEndpointMouseDown(shape.id, "start")}
            />
            {/* Draggable end endpoint */}
            <div
              style={{
                position: "absolute",
                left: `${endPos.x - 6}px`,
                top: `${endPos.y - 6}px`,
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: color,
                border: "2px solid white",
                cursor: "pointer",
                pointerEvents: "auto",
                zIndex: 10,
              }}
              onMouseDown={handleEndpointMouseDown(shape.id, "end")}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {shapes.map(renderShape)}
    </div>
  );
};

export default ShapeRenderer;
