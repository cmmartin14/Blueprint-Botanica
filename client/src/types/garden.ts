import { Shape } from './shapes';

export interface GardenBed {
  id: string;
  name: string;
  shapes: Shape[];
  location?: {
    zipcode: string;
    climate?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GardenProject {
  id: string;
  name: string;
  beds: GardenBed[];
  scale: number; // pixels per foot/meter
  unit: 'feet' | 'meters';
}