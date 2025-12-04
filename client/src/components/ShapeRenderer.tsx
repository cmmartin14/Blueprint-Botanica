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
  selectedShapeId?: string;
  onShapeSelect?: (shapeId: string) => void;
  onShapeUpdate?: (shapeId: string, updates: Partial<Shape>) => void;
}

const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  shapes,
  scale,
  pan,
  unit = 'feet',
  gridToUnit = 1,
  selectedShapeId,
  onShapeSelect,
  onShapeUpdate,
}) => {

  const snapToGrid = (x: number, y: number, gridSize: number = 20) => ({
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize,
  });

  const feetToMeters = (feet: number) => (feet * 0.3048).toFixed(2);

  // ------------------------------
  // SHAPE DRAGGING
  // ------------------------------
  const handleShapeMouseDown = (shapeId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onShapeSelect?.(shapeId);
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const origStart = { ...shape.startPos };
    const origEnd = { ...shape.endPos };
    const origPoints = shape.type === 'freehand' ? [...(shape.points || [])] : null;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;

      if (!onShapeUpdate) return;

      if (shape.type === 'freehand' && origPoints) {
        onShapeUpdate(shapeId, {
          points: origPoints.map(p => ({ x: p.x + dx, y: p.y + dy })),
        });
      } else {
        onShapeUpdate(shapeId, {
          startPos: { x: origStart.x + dx, y: origStart.y + dy },
          endPos: { x: origEnd.x + dx, y: origEnd.y + dy },
        });
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // ------------------------------
  // CIRCLE RESIZE HANDLE
  // ------------------------------
  const handleCircleResizeMouseDown = (shapeId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape || shape.type !== 'circle') return;

    const startX = e.clientX;
    const startY = e.clientY;
    const origStart = { ...shape.startPos };
    const origEnd = { ...shape.endPos };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;
      const radius = Math.sqrt(
        (origEnd.x - origStart.x + dx) ** 2 + (origEnd.y - origStart.y + dy) ** 2
      );
      onShapeUpdate?.(shapeId, {
        endPos: {
          x: origStart.x + radius,
          y: origStart.y + radius,
        },
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // ------------------------------
  // LINE ENDPOINTS
  // ------------------------------
  const handleEndpointMouseDown = (shapeId: string, endpoint: 'start' | 'end') => (e: React.MouseEvent) => {
    e.stopPropagation();
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape || shape.type !== 'line') return;

    const rect = (e.currentTarget.parentElement?.parentElement as HTMLElement)?.getBoundingClientRect();
    if (!rect) return;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const x = (moveEvent.clientX - rect.left - pan.x) / scale;
      const y = (moveEvent.clientY - rect.top - pan.y) / scale;
      const snapped = snapToGrid(x, y);
      onShapeUpdate?.(shapeId, endpoint === 'start' ? { startPos: snapped } : { endPos: snapped });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // ------------------------------
  // SHAPE RENDER
  // ------------------------------
  const renderShape = (shape: Shape) => {
    const { type, startPos, endPos, color, strokeWidth, id } = shape;
    const width = Math.abs(endPos.x - startPos.x);
    const height = Math.abs(endPos.y - startPos.y);

    const commonStyle: React.CSSProperties = {
      position: "absolute",
      left: startPos.x,
      top: startPos.y,
      cursor: "move",
      pointerEvents: "auto",
      outline: id === selectedShapeId ? '2px dashed red' : undefined,
    };

    if (type === 'circle') {
      const radius = Math.max(width, height) / 2;
      const labelX = startPos.x;
      const labelY = startPos.y - radius - 20;
      const feet = ((radius / 20) * gridToUnit).toFixed(1);
      const meters = feetToMeters(parseFloat(feet));

      return (
        <div key={id}>
          <div
            style={{
              ...commonStyle,
              width: radius * 2,
              height: radius * 2,
              borderRadius: "50%",
              border: `${strokeWidth ?? 2, 7}px solid ${color}`,
              backgroundColor: "transparent",
              left: startPos.x - radius,
              top: startPos.y - radius,
            }}
            onMouseDown={handleShapeMouseDown(id)}
          />
          <div
            style={{
              position: 'absolute',
              left: labelX,
              top: labelY,
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(255,255,255,0.95)',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              color: '#1f2937',
              border: '1px solid #d1d5db',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            Radius: {feet} ft
            <div style={{ fontSize: 10, color: '#6b7280' }}>{meters} m</div>
          </div>

          <div
            style={{
              position: 'absolute',
              left: startPos.x + radius - 6,
              top: startPos.y - 6,
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: 'black',
              border: '2px solid white',
              cursor: 'pointer',
              pointerEvents: 'auto',
              zIndex: 10,
            }}
            onMouseDown={handleCircleResizeMouseDown(id)}
          />
        </div>
      );
    }

    if (type === 'line') {
      const angle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x) * (180 / Math.PI);
      const length = Math.sqrt(width ** 2 + height ** 2);
      const midX = (startPos.x + endPos.x) / 2;
      const midY = (startPos.y + endPos.y) / 2;
      const feetLength = ((length / 20) * gridToUnit).toFixed(1);
      const metersLength = feetToMeters(parseFloat(feetLength));
      const perpRad = (angle + 90) * (Math.PI / 180);
      const labelX = midX + Math.cos(perpRad) * 20;
      const labelY = midY + Math.sin(perpRad) * 20;

      return (
        <div key={id}>
          <div
            style={{
              position: 'absolute',
              left: startPos.x,
              top: startPos.y,
              width: length,
              height: Math.max(strokeWidth ?? 2, 8),
              backgroundColor: color,
              transformOrigin: '0 50%',
              transform: `rotate(${angle}deg)`,
              cursor: 'move',
              pointerEvents: 'auto',
            }}
            onMouseDown={handleShapeMouseDown(id)}
          />
          <div
            style={{
              position: 'absolute',
              left: labelX,
              top: labelY,
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(255,255,255,0.95)',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              color: '#1f2937',
              border: '1px solid #d1d5db',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            {feetLength} ft
            <div style={{ fontSize: 10, color: '#6b7280' }}>{metersLength} m</div>
          </div>

          {/* Start endpoint */}
          <div
            style={{
              position: 'absolute',
              left: startPos.x - 6,
              top: startPos.y - 6,
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: 'black',
              border: '2px solid white',
              cursor: 'pointer',
              pointerEvents: 'auto',
              zIndex: 10,
            }}
            onMouseDown={handleEndpointMouseDown(id, 'start')}
          />
          {/* End endpoint */}
          <div
            style={{
              position: 'absolute',
              left: endPos.x - 6,
              top: endPos.y - 6,
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: 'black',
              border: '2px solid white',
              cursor: 'pointer',
              pointerEvents: 'auto',
              zIndex: 10,
            }}
            onMouseDown={handleEndpointMouseDown(id, 'end')}
          />
        </div>
      );
    }

    if (type === 'freehand' && shape.points && shape.points.length > 1) {
      return (
        <svg
          key={id}
          style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}
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
            onMouseDown={handleShapeMouseDown(id)}
          />
        </svg>
      );
    }

    return null;
  };

  return (
    <div style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}>
      {shapes.map(renderShape)}
    </div>
  );
};

export default ShapeRenderer;



