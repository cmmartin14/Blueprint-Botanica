"use client";

import React from 'react';
import { Shape } from '../types/shapes';

interface ShapeRendererProps {
  shapes: Shape[];
  scale: number;
  pan: { x: number; y: number }; // Added pan prop
  unit?: 'feet' | 'meters'; 
  gridToUnit?: number; // (e.g., 20px = 1 foot)
  snapToShapes?: boolean;
  onShapeUpdate?: (shapeId: string, updates: Partial<Shape>) => void;
}

const ShapeRenderer: React.FC<ShapeRendererProps> = ({ 
  shapes, 
  scale,
  pan,
  unit = 'feet',
  gridToUnit = 1, // 1 grid square = 1 foot
  onShapeUpdate,
}) => {

  // Grid snapping function
  const snapToGrid = (x: number, y: number, gridSize: number = 20) => {
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    };
  };

  // Convert feet to meters
  const feetToMeters = (feet: number) => (feet * 0.3048).toFixed(2);

  // ==== Shape dragging ====
  const handleShapeMouseDown = (shapeId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;

    const startX = e.clientX;
    const startY = e.clientY;

    const originalStart = { ...shape.startPos };
    const originalEnd = { ...shape.endPos };
    const originalPoints = shape.type === 'freehand' && shape.points ? [...shape.points] : undefined;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;

      if (onShapeUpdate) {
        if (shape.type === 'freehand' && originalPoints) {
          onShapeUpdate(shapeId, {
            points: originalPoints.map(p => ({ x: p.x + dx, y: p.y + dy })),
          });
        } else {
          // Snap entire shape movement to grid for lines
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
            onShapeUpdate(shapeId, {
              startPos: newStart,
              endPos: newEnd,
            });
          }
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

  // ==== Endpoint drag for lines with grid snapping ====
  const handleEndpointMouseDown = (shapeId: string, endpoint: 'start' | 'end') => (e: React.MouseEvent) => {
    e.stopPropagation();
    const canvasElement = document.querySelector('[data-canvas]') as HTMLElement;
    if (!canvasElement) return;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const rect = canvasElement.getBoundingClientRect();
      
      // Get the transformed canvas container
      const transformedContainer = canvasElement.querySelector('[data-transformed]') as HTMLElement;
      if (!transformedContainer) return;
      
      // Parse the transform to get pan values
      const transform = transformedContainer.style.transform;
      const translateMatch = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
      const scaleMatch = transform.match(/scale\(([^)]+)\)/);
      
      const panX = translateMatch ? parseFloat(translateMatch[1]) : 0;
      const panY = translateMatch ? parseFloat(translateMatch[2]) : 0;
      const currentScale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
      
      // Calculate the correct position accounting for pan and scale
      const rawX = (moveEvent.clientX - rect.left - panX) / currentScale;
      const rawY = (moveEvent.clientY - rect.top - panY) / currentScale;
      
      // Snap to grid
      const snapped = snapToGrid(rawX, rawY);

      onShapeUpdate?.(shapeId, endpoint === 'start' ? { startPos: snapped } : { endPos: snapped });
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
    const { type, startPos, endPos, color, strokeWidth } = shape;
    const points = 'points' in shape ? shape.points : undefined;
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

        // Calculate real-world dimensions
        const gridSize = 20;
        const gridUnits = length / gridSize;
        const feetLength = (gridUnits * gridToUnit).toFixed(1);
        const metersLength = feetToMeters(parseFloat(feetLength));
        
        const midX = (startPos.x + endPos.x) / 2;
        const midY = (startPos.y + endPos.y) / 2;

        // Calculate label offset perpendicular to the line
        const offsetDistance = 20;
        const perpAngle = (angle + 90) * (Math.PI / 180);
        const labelX = midX + Math.cos(perpAngle) * offsetDistance;
        const labelY = midY + Math.sin(perpAngle) * offsetDistance;

        return (
          <div key={shape.id}>
            {/* Main line */}
            <div
              style={{
                position: 'absolute',
                left: `${startPos.x}px`,
                top: `${startPos.y}px`,
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
            
            {/* Dimension label - using absolute positioning in canvas space */}
            <div
              style={{
                position: 'absolute',
                left: `${labelX}px`,
                top: `${labelY}px`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#1f2937',
                border: '1px solid #d1d5db',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                zIndex: 5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div>{feetLength} ft</div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>{metersLength} m</div>
            </div>

            {/* Start endpoint */}
            <div
              style={{
                position: 'absolute',
                left: `${startPos.x - 6}px`,
                top: `${startPos.y - 6}px`,
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: 'black',
                border: '2px solid white',
                pointerEvents: 'auto',
                cursor: 'pointer',
                zIndex: 10,
              }}
              onMouseDown={handleEndpointMouseDown(shape.id, 'start')}
            />
            
            {/* End endpoint */}
            <div
              style={{
                position: 'absolute',
                left: `${endPos.x - 6}px`,
                top: `${endPos.y - 6}px`,
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: 'black',
                border: '2px solid white',
                pointerEvents: 'auto',
                cursor: 'pointer',
                zIndex: 10,
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


