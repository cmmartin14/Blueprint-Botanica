import React, { useState } from "react";
import { Shape } from "../types/shapes";

interface ShapeRendererProps {
  shapes: Shape[];
  scale: number;
  snapToShapes?: boolean;
  onShapeUpdate?: (shapeId: string, updates: Partial<Shape>) => void;
}

const HANDLE_SIZE = 10;

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
      const originalStartPos = { ...shape.startPos };
      const originalEndPos = { ...shape.endPos };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = (moveEvent.clientX - startX) / scale;
        const deltaY = (moveEvent.clientY - startY) / scale;

        onShapeUpdate?.(shapeId, {
          startPos: {
            x: originalStartPos.x + deltaX,
            y: originalStartPos.y + deltaY,
          },
          endPos: {
            x: originalEndPos.x + deltaX,
            y: originalEndPos.y + deltaY,
          },
        });
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };
  };

  // --- Endpoint dragging (lines) ---
  const handleEndpointMouseDown = (
    shapeId: string,
    endpoint: "start" | "end"
  ) => {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedShapeId(shapeId);

      const canvasElement = document.querySelector(
        "[data-canvas]"
      ) as HTMLElement;
      if (!canvasElement) return;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const rect = canvasElement.getBoundingClientRect();
        const x = (moveEvent.clientX - rect.left) / scale;
        const y = (moveEvent.clientY - rect.top) / scale;

        const updates =
          endpoint === "start"
            ? { startPos: { x, y } }
            : { endPos: { x, y } };
        onShapeUpdate?.(shapeId, updates);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };
  };

  // --- Resize dragging ---
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

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = (moveEvent.clientX - startX) / scale;
        const deltaY = (moveEvent.clientY - startY) / scale;

        let newStart = { ...origStart };
        let newEnd = { ...origEnd };

        switch (direction) {
          case "top-left":
            newStart = { x: origStart.x + deltaX, y: origStart.y + deltaY };
            break;
          case "top":
            newStart = { x: origStart.x, y: origStart.y + deltaY };
            break;
          case "top-right":
            newStart = { x: origStart.x, y: origStart.y + deltaY };
            newEnd = { x: origEnd.x + deltaX, y: origEnd.y };
            break;
          case "right":
            newEnd = { x: origEnd.x + deltaX, y: origEnd.y };
            break;
          case "bottom-right":
            newEnd = { x: origEnd.x + deltaX, y: origEnd.y + deltaY };
            break;
          case "bottom":
            newEnd = { x: origEnd.x, y: origEnd.y + deltaY };
            break;
          case "bottom-left":
            newStart = { x: origStart.x + deltaX, y: origStart.y };
            newEnd = { x: origEnd.x, y: origEnd.y + deltaY };
            break;
          case "left":
            newStart = { x: origStart.x + deltaX, y: origStart.y };
            break;
        }

        onShapeUpdate?.(shapeId, {
          startPos: newStart,
          endPos: newEnd,
        });
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };
  };

  // --- Render a single resize handle ---
  const renderResizeHandle = (
    shapeId: string,
    x: number,
    y: number,
    direction:
      | "top-left"
      | "top"
      | "top-right"
      | "right"
      | "bottom-right"
      | "bottom"
      | "bottom-left"
      | "left"
  ) => (
    <div
      key={`${shapeId}-${direction}`}
      style={{
        position: "absolute",
        left: `${x - HANDLE_SIZE / 2}px`,
        top: `${y - HANDLE_SIZE / 2}px`,
        width: `${HANDLE_SIZE}px`,
        height: `${HANDLE_SIZE}px`,
        backgroundColor: "white",
        border: "1px solid black",
        cursor: `${direction}-resize`,
        zIndex: 20,
      }}
      onMouseDown={handleResizeMouseDown(shapeId, direction)}
    />
  );

  // --- Render each shape ---
  const renderShape = (shape: Shape) => {
    const { startPos, endPos, color, strokeWidth, type } = shape;
    const width = Math.abs(endPos.x - startPos.x);
    const height = Math.abs(endPos.y - startPos.y);
    const left = Math.min(startPos.x, endPos.x);
    const top = Math.min(startPos.y, endPos.y);
    const isSelected = shape.id === selectedShapeId;

    const commonStyles = {
      position: "absolute" as const,
      left: `${left}px`,
      top: `${top}px`,
      border: `${strokeWidth}px solid ${color}`,
      cursor: "move",
      pointerEvents: "auto" as const,
      boxSizing: "border-box" as const,
    };

    if (type === "rectangle" || type === "circle") {
      const baseShape = (
        <div
          style={{
            ...commonStyles,
            width: `${width}px`,
            height: `${height}px`,
            borderRadius: type === "circle" ? "50%" : "0%",
            backgroundColor: `${color}33`,
            boxShadow: isSelected ? "0 0 0 2px #0070f3" : "none",
          }}
          onMouseDown={handleShapeMouseDown(shape.id)}
        />
      );

      if (!isSelected) return baseShape;

      return (
        <div key={shape.id}>
          {baseShape}
          {/* Corner handles */}
          {renderResizeHandle(shape.id, left, top, "top-left")}
          {renderResizeHandle(shape.id, left + width, top, "top-right")}
          {renderResizeHandle(shape.id, left, top + height, "bottom-left")}
          {renderResizeHandle(shape.id, left + width, top + height, "bottom-right")}
          {/* Edge handles */}
          {renderResizeHandle(shape.id, left + width / 2, top, "top")}
          {renderResizeHandle(shape.id, left + width / 2, top + height, "bottom")}
          {renderResizeHandle(shape.id, left, top + height / 2, "left")}
          {renderResizeHandle(shape.id, left + width, top + height / 2, "right")}
        </div>
      );
    }

    if (type === "line") {
      const angle =
        Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x) *
        (180 / Math.PI);
      const length = Math.sqrt(width ** 2 + height ** 2);

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
          {/* Draggable endpoints */}
          {isSelected && (
            <>
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
            </>
          )}
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
