"use client";

import React from 'react';
import { Shape } from '../types/shapes';
import { Bed } from '../types/beds'

// --- Tracking Variables ---
let selectedShapeID: number = -1


interface ShapeRendererProps {
  shapes: Shape[];
  beds: Bed[]; //Store a list of beds
  scale: number;
  snapToShapes?: boolean;
  onShapeUpdate?: (shapeId: string, updates: Partial<Shape>) => void;
}

const ShapeRenderer: React.FC<ShapeRendererProps> = ({ 
  shapes, 
  scale,
  onShapeUpdate,
}) => {

  // ==== Shape dragging ====
  const handleShapeMouseDown = (shapeId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;
    //If the shape that is clicked on isn't currently selected, select it
    // if (shape.id != selectedShapeID) {
    //   shape.isSeletected = true
    // }
    console.log(shape.id)
    const startX = e.clientX;
    const startY = e.clientY;

    const originalStart = { ...shape.startPos };
    const originalEnd = { ...shape.endPos };
    const originalPoints = shape.points ? [...shape.points] : undefined;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;

      if (onShapeUpdate) {
        if (shape.type === 'freehand' && originalPoints) {
          onShapeUpdate(shapeId, {
            points: originalPoints.map(p => ({ x: p.x + dx, y: p.y + dy })),
          });
        } else {
          onShapeUpdate(shapeId, {
            startPos: { x: originalStart.x + dx, y: originalStart.y + dy },
            endPos: { x: originalEnd.x + dx, y: originalEnd.y + dy },
          });
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

  // ==== Endpoint drag for lines ====
  const handleEndpointMouseDown = (shapeId: string, endpoint: 'start' | 'end') => (e: React.MouseEvent) => {
    e.stopPropagation();
    const canvasElement = document.querySelector('[data-canvas]') as HTMLElement;
    if (!canvasElement) return;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const rect = canvasElement.getBoundingClientRect();
      const x = (moveEvent.clientX - rect.left) / scale;
      const y = (moveEvent.clientY - rect.top) / scale;

      onShapeUpdate?.(shapeId, endpoint === 'start' ? { startPos: { x, y } } : { endPos: { x, y } });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // ==== Render function ====
  const renderShape = (shape: Shape) => {
    const { type, startPos, endPos, color, strokeWidth, points } = shape;
    const width = Math.abs(endPos.x - startPos.x);
    const height = Math.abs(endPos.y - startPos.y);
    const left = Math.min(startPos.x, endPos.x);
    const top = Math.min(startPos.y, endPos.y);

    const commonStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      cursor: 'move',
      pointerEvents: 'auto',
    };

    switch (type) {
      case 'rectangle':
        return (
          <div
            key={shape.id}
            style={{
              ...commonStyle,
              width,
              height,
              border: `${strokeWidth}px solid ${color}`,
              backgroundColor: 'transparent',
            }}
            onMouseDown={handleShapeMouseDown(shape.id)}
          />
        );

      case 'circle':
        const radius = Math.max(width, height) / 2;
        return (
          <div
            key={shape.id}
            style={{
              ...commonStyle,
              width: radius * 2,
              height: radius * 2,
              borderRadius: '50%',
              border: `${strokeWidth}px solid ${color}`,
              backgroundColor: 'transparent',
            }}
            onMouseDown={handleShapeMouseDown(shape.id)}
          />
        );

      case 'line':
        const angle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x) * (180 / Math.PI);
        const length = Math.sqrt(width ** 2 + height ** 2);
        return (
          <div key={shape.id}>
            <div
              style={{
                position: 'absolute',
                left: startPos.x,
                top: startPos.y,
                width: `${length}px`,
                height: `${Math.max(strokeWidth, 8)}px`,
                backgroundColor: color,
                transformOrigin: '0 50%',
                transform: `rotate(${angle}deg)`,
                cursor: 'move',
                pointerEvents: 'auto',
              }}
              onMouseDown={handleShapeMouseDown(shape.id)}
            />
            <div
              style={{
                position: 'absolute',
                left: startPos.x - 6,
                top: startPos.y - 6,
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: color,
                border: '2px solid white',
                pointerEvents: 'auto',
              }}
              onMouseDown={handleEndpointMouseDown(shape.id, 'start')}
            />
            <div
              style={{
                position: 'absolute',
                left: endPos.x - 6,
                top: endPos.y - 6,
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: color,
                border: '2px solid white',
                pointerEvents: 'auto',
              }}
              onMouseDown={handleEndpointMouseDown(shape.id, 'end')}
            />
          </div>
        );

      case 'freehand':
        if (!points || points.length < 2) return null;
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
              points={points.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="auto"
              style={{ cursor: 'move' }}
              onMouseDown={handleShapeMouseDown(shape.id)}
            />
          </svg>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      }}
    >
      {shapes.map(renderShape)}
    </div>
  );
};

export default ShapeRenderer;


