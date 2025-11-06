import { useState } from 'react';
import { Shape } from '../../types/shapes';

interface GardenBed {
  id: string;
  name: string;
  shapes: Shape[];
}

export const useGardenBed = () => {
  const [gardenBed, setGardenBed] = useState<GardenBed | null>(null);

  const createGardenBed = (name: string) => {
    setGardenBed({
      id: Date.now().toString(),
      name,
      
      shapes: [],
    });
  };

  const addShape = (shape: Shape) => {
    if (gardenBed) {
      setGardenBed({
        ...gardenBed,
        shapes: [...gardenBed.shapes, shape],
      });
    }
  };

  const updateShape = (shapeId: string, updates: Partial<Shape>) => {
    if (gardenBed) {
      setGardenBed({
        ...gardenBed,
        shapes: gardenBed.shapes.map((shape) =>
          shape.id === shapeId ? { ...shape, ...updates } as Shape : shape
        ),
      });
    }
  };

  return {
    gardenBed,
    createGardenBed,
    addShape,
    updateShape,
  };
};