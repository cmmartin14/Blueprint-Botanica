"use client";

import React from 'react';
import { Shape } from '../types/shapes';

interface ShapeRendererProps {
  shapes: Shape[];
  scale: number;
  pan: { x: number; y: number };
  unit?: 'feet' | 'meters';
  gridToUnit?: number;
  snapToShapes?: boolean;
  onShapeUpdate?: (shapeId: string, updates: Partial<Shape>) => void;
  onShapeSelect?: (shapeId: string) => void;
}

const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  shapes,
  scale,
  pan,
  unit = 'feet',
  gridToUnit = 1,
  onShapeUpdate,
  onShapeSelect,
}) => {

  const snapToGrid = (x: number, y: number, gridSize: number = 20) => {
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    };
  };

  const feetToMeters = (feet: number) => (feet * 0.3048).toFixed(2);

  const handleShapeMouseDown = (shapeId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onShapeSelect?.(shapeId);
    // Existing drag logic remains unchanged
  };

  const renderShape = (shape: Shape) => {
    const { type, startPos, endPos, color, strokeWidth } = shape;

    const width = Math.abs(endPos.x - startPos.x);
    const height = Math.abs(endPos.y - startPos.y);
    const left = Math.min(startPos.x, endPos.x);
    const top = Math.min(startPos.y, endPos.y);

    const commonStyle: React.CSSProperties = {
      position: "absolute",
      left,
      top,
      cursor: "move",
      pointerEvents: "auto",
    };

    if (type === "circle") {
      const radius = Math.max(width, height) / 2;
      const centerX = startPos.x;
      const centerY = startPos.y;
      const labelX = centerX;
      const labelY = centerY - radius - 20;
      const handleX = centerX + radius;
      const handleY = centerY;

      const gridSize = 20;
      const gridUnits = radius / gridSize;
      const feet = (gridUnits * gridToUnit).toFixed(1);
      const meters = feetToMeters(parseFloat(feet));

      return (
        <div key={shape.id}>
          <div
            style={{
              ...commonStyle,
              width: radius * 2,
              height: radius * 2,
              borderRadius: "50%",
              border: `${strokeWidth ?? 2, 7}px solid ${color}`,
              backgroundColor: "transparent",
              left: centerX - radius,
              top: centerY - radius,
            }}
            onMouseDown={handleShapeMouseDown(shape.id)}
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
        </div>
      );
    }

    if (type === "line") {
      const angle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x) * (180 / Math.PI);
      const length = Math.sqrt(width ** 2 + height ** 2);

      const gridSize = 20;
      const gridUnits = length / gridSize;
      const feetLength = (gridUnits * gridToUnit).toFixed(1);
      const metersLength = feetToMeters(parseFloat(feetLength));

      const midX = (startPos.x + endPos.x) / 2;
      const midY = (startPos.y + endPos.y) / 2;

      const perpRad = (angle + 90) * (Math.PI / 180);
      const labelX = midX + Math.cos(perpRad) * 20;
      const labelY = midY + Math.sin(perpRad) * 20;

      return (
        <div key={shape.id}>
          <div
            style={{
              position: "absolute",
              left: `${startPos.x}px`,
              top: `${startPos.y}px`,
              width: `${length}px`,
              height: `${Math.max(strokeWidth ?? 2, 8)}px`,
              backgroundColor: color,
              transformOrigin: "0 50%",
              transform: `rotate(${angle}deg)`,
              cursor: "move",
              pointerEvents: "auto",
            }}
            onMouseDown={handleShapeMouseDown(shape.id)}
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
        </div>
      );
    }

    return null;
  };

  return (
    <div
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        top: 0,
        left: 0,
        pointerEvents: "none",
      }}
    >
      {shapes.map(renderShape)}
    </div>
  );
};

export default ShapeRenderer;

