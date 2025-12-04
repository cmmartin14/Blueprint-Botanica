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
}

const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  shapes,
  scale,
  pan,
  unit = 'feet',
  gridToUnit = 1,
  onShapeUpdate,
}) => {

  const snapToGrid = (x: number, y: number, gridSize: number = 20) => {
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    };
  };

  const feetToMeters = (feet: number) => (feet * 0.3048).toFixed(2);

  // ------------------------------
  //  SHAPE MOVING (DRAG ENTIRE SHAPE)
  // ------------------------------
  const handleShapeMouseDown = (shapeId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;

    const startX = e.clientX;
    const startY = e.clientY;

    const originalStart = { ...shape.startPos };
    const originalEnd = { ...shape.endPos };
    const originalPoints = shape.type === 'freehand' ? [...(shape.points || [])] : null;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;

      if (!onShapeUpdate) return;

      if (shape.type === 'freehand' && originalPoints) {
        onShapeUpdate(shapeId, {
          points: originalPoints.map(p => ({ x: p.x + dx, y: p.y + dy })),
        });
      } else {
        const newStart = { x: originalStart.x + dx, y: originalStart.y + dy };
        const newEnd = { x: originalEnd.x + dx, y: originalEnd.y + dy };

        if (shape.type === 'line') {
          const snappedStart = snapToGrid(newStart.x, newStart.y);
          const offsetX = snappedStart.x - newStart.x;
          const offsetY = snappedStart.y - newStart.y;

          onShapeUpdate(shapeId, {
            startPos: snappedStart,
            endPos: { x: newEnd.x + offsetX, y: newEnd.y + offsetY },
          });
        } else {
          onShapeUpdate(shapeId, { startPos: newStart, endPos: newEnd });
        }
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // -----------------------------------------
  //  LINE ENDPOINT DRAG — GRID ALIGNED
  // -----------------------------------------
  const handleEndpointMouseDown = (shapeId: string, endpoint: 'start' | 'end') => (e: React.MouseEvent) => {
    e.stopPropagation();

    const canvasElement = document.querySelector('[data-canvas]') as HTMLElement;
    if (!canvasElement) return;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const rect = canvasElement.getBoundingClientRect();
      const transformed = canvasElement.querySelector('[data-transformed]') as HTMLElement;
      if (!transformed) return;

      const transform = transformed.style.transform;
      const translateMatch = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
      const scaleMatch = transform.match(/scale\(([^)]+)\)/);

      const panX = translateMatch ? parseFloat(translateMatch[1]) : 0;
      const panY = translateMatch ? parseFloat(translateMatch[2]) : 0;
      const currentScale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;

      const rawX = (moveEvent.clientX - rect.left - panX) / currentScale;
      const rawY = (moveEvent.clientY - rect.top - panY) / currentScale;

      const snapped = snapToGrid(rawX, rawY);

      onShapeUpdate?.(shapeId, endpoint === 'start'
        ? { startPos: snapped }
        : { endPos: snapped }
      );
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // -----------------------------------------
  //   CIRCLE RADIUS DRAGGER HANDLE
  // -----------------------------------------
  const handleCircleResizeMouseDown = (shapeId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();

    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;

    const canvasElement = document.querySelector('[data-canvas]') as HTMLElement;
    const transformed = canvasElement?.querySelector('[data-transformed]') as HTMLElement;
    if (!canvasElement || !transformed) return;

    const rect = canvasElement.getBoundingClientRect();
    const transform = transformed.style.transform;

    const translateMatch = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
    const scaleMatch = transform.match(/scale\(([^)]+)\)/);

    const panX = translateMatch ? parseFloat(translateMatch[1]) : 0;
    const panY = translateMatch ? parseFloat(translateMatch[2]) : 0;
    const currentScale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;

    const centerX = shape.startPos.x;
    const centerY = shape.startPos.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const rawX = (moveEvent.clientX - rect.left - panX) / currentScale;
      const rawY = (moveEvent.clientY - rect.top - panY) / currentScale;

      const dx = rawX - centerX;
      const dy = rawY - centerY;
      const newRadius = Math.sqrt(dx * dx + dy * dy);

      const snapped = snapToGrid(centerX + newRadius, centerY);
      const radiusSnapped = Math.abs(snapped.x - centerX);

      onShapeUpdate?.(shapeId, {
        endPos: {
          x: centerX + radiusSnapped,
          y: centerY + radiusSnapped,
        }
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // -----------------------------------------
  //      SHAPE RENDERING
  // -----------------------------------------
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

    // -----------------------
    //      CIRCLE
    // -----------------------
    if (type === "circle") {
      const radius = Math.max(width, height) / 2;
      const centerX = startPos.x;
      const centerY = startPos.y;

      const gridSize = 20;
      const gridUnits = radius / gridSize;
      const feet = (gridUnits * gridToUnit).toFixed(1);
      const meters = feetToMeters(parseFloat(feet));

      // 🆕 Move label ABOVE the circle
      const labelX = centerX;
      const labelY = centerY - radius - 20;

      // Resize handle stays on the right
      const handleX = centerX + radius;
      const handleY = centerY;

      return (
        <div key={shape.id}>
          {/* Circle */}
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

          {/* Dimension label — moved ABOVE */}
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

          {/* Circle resize handle */}
          <div
            style={{
              position: "absolute",
              left: `${handleX - 6}px`,
              top: `${handleY - 6}px`,
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: "#111",
              border: "2px solid white",
              cursor: "pointer",
              pointerEvents: "auto",
              zIndex: 10,
            }}
            onMouseDown={handleCircleResizeMouseDown(shape.id)}
          />
        </div>
      );
    }

    // -----------------------
    //      RECTANGLE
    // -----------------------
    if (type === "rectangle") {
      return (
        <div
          key={shape.id}
          style={{
            ...commonStyle,
            width,
            height,
            border: `${strokeWidth ?? 2}px solid ${color}`,
            backgroundColor: "transparent",
          }}
          onMouseDown={handleShapeMouseDown(shape.id)}
        />
      );
    }

    // -----------------------
    //      LINE
    // -----------------------
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

          {/* Label */}
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

          {/* Start endpoint */}
          <div
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

          {/* End endpoint */}
          <div
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

    // -----------------------
    //      FREEHAND
    // -----------------------
    if (type === 'freehand' && shape.points && shape.points.length > 1) {
      return (
        <svg
          key={shape.id}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            overflow: 'visible',
            pointerEvents: 'none',
          }}
        >
          <polyline
            points={shape.points.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth ?? 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="auto"
            style={{ cursor: 'move' }}
            onMouseDown={handleShapeMouseDown(shape.id)}
          />
        </svg>
      );
    }

    return null;
  };

  // -----------------------------------------
  //         MAIN RENDER
  // -----------------------------------------
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
