import { useState, useCallback } from 'react';

interface GardenBed {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export const useGardenBed = () => {
  const [gardenBed, setGardenBed] = useState<GardenBed | null>(null);

  const createGardenBed = useCallback((name: string) => {
    const newBed: GardenBed = {
      id: Date.now().toString(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setGardenBed(newBed);
    return newBed;
  }, []);

  return {
    gardenBed,
    createGardenBed,
  };
};
