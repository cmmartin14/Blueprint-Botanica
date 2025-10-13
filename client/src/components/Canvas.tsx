"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { Shape, Position } from '../types/shapes';
import ShapeRenderer from './ShapeRenderer';

const Canvas = () => {
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);


  // Create shape at canvas center
  const createShape = useCallback((shapeType: 'rectangle' | 'circle' | 'line') => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = (rect.width / 2 - pan.x) / scale;
    const centerY = (rect.height / 2 - pan.y) / scale;
    
    let newShape: Shape;
    
    switch (shapeType) {
      case 'rectangle':
        newShape = {
          id: Date.now().toString(),
          type: 'rectangle',
          startPos: { x: centerX - 50, y: centerY - 30 },
          endPos: { x: centerX + 50, y: centerY + 30 },
          color: '#3b82f6',
          strokeWidth: 2,
        };
        break;
      case 'circle':
        newShape = {
          id: Date.now().toString(),
          type: 'circle',
          startPos: { x: centerX - 40, y: centerY - 40 },
          endPos: { x: centerX + 40, y: centerY + 40 },
          color: '#3b82f6',
          strokeWidth: 2,
        };
        break;
      case 'line':
        newShape = {
          id: Date.now().toString(),
          type: 'line',
          startPos: { x: centerX - 50, y: centerY },
          endPos: { x: centerX + 50, y: centerY },
          color: '#3b82f6',
          strokeWidth: 2,
        };
        break;
    }
    
    setShapes(prev => [...prev, newShape]);
  }, [pan, scale]);

  // Add this after your screenToCanvas function
  const snapPoint = useCallback((point: { x: number; y: number }, excludeShapeId?: string) => {
    const SNAP_THRESHOLD = 10;
    const GRID_SIZE = 20;
    
    // Shape snapping - check against existing shapes
    for (const shape of shapes) {
      if (shape.id === excludeShapeId) continue;
      
      // Check endpoints
      const endpoints = [shape.startPos, shape.endPos];
      for (const endpoint of endpoints) {
        const distance = Math.sqrt(
          Math.pow(point.x - endpoint.x, 2) + Math.pow(point.y - endpoint.y, 2)
        );
        if (distance < SNAP_THRESHOLD) {
          return endpoint;
        }
      }
    }
    
    // Grid snapping
    const snappedToGrid = {
      x: Math.round(point.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(point.y / GRID_SIZE) * GRID_SIZE,
    };
    
    const gridDistance = Math.sqrt(
      Math.pow(point.x - snappedToGrid.x, 2) + 
      Math.pow(point.y - snappedToGrid.y, 2)
    );
    
    if (gridDistance <= SNAP_THRESHOLD) {
      return snappedToGrid;
    }
    
    return point;
  }, [shapes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const newPan = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      };
      setPan(newPan);
    }
  }, [isDragging, dragStart]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    setScale(prev => Math.min(Math.max(prev * delta, .75), 2)); 
  }, []);

  useEffect(() => {
    const handleMouseUpGlobal = () => setIsDragging(false);
    document.addEventListener('mouseup', handleMouseUpGlobal);
    return () => document.removeEventListener('mouseup', handleMouseUpGlobal);
  }, []);

  const gridSize = 20;
  const gridStyle = {
    backgroundImage: `
      linear-gradient(to right, #e5e7eb 1px, transparent 1px),
      linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
    `,
    backgroundSize: `${gridSize * scale}px ${gridSize * scale}px`,
    backgroundPosition: `${pan.x % (gridSize * scale)}px ${pan.y % (gridSize * scale)}px`,
  };

  return (
    <div className="fixed inset-0 top-16 overflow-hidden bg-white">
      <div
        ref={canvasRef}
        data-canvas
        className= 'w-full h-full'
        style={gridStyle}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Canvas content container */}
        <div
          className="relative w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Render all shapes */}
          <ShapeRenderer 
            shapes={shapes} 
            scale={scale}
            onShapeUpdate={(shapeId, updates) => {
              setShapes(prev => prev.map(shape => 
                shape.id === shapeId ? { ...shape, ...updates } : shape
              ));
            }}
          />
          
          {/* Example draggable element */}
          <div className="absolute top-10 left-10 w-32 h-20 bg-blue-100 border-2 border-blue-300 rounded-lg flex items-center justify-center text-blue-800 font-medium shadow-sm">
            Drag me!
          </div>
        </div>
      </div>
      
      {/* Shape Creation Controls */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 border">
        <div className="flex gap-2">
          <button
            onClick={() => createShape('rectangle')}
            className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Add Rectangle
          </button>
          <button
            onClick={() => createShape('circle')}
            className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Add Circle
          </button>
          <button
            onClick={() => createShape('line')}
            className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Add Line
          </button>
        </div>
      </div>
      
      {/* Canvas Controls */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 border">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Zoom: {Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(1)}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
          >
            Reset
          </button>
          <button
            onClick={() => setShapes([])}
            className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default Canvas;
