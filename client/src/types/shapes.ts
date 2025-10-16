export interface Position {
  x: number;
  y: number;
}

export interface BaseShape {
  id: string;
  type: string;
  startPos: Position;
  endPos: Position;
  color: string;
  strokeWidth: number;
  rotation?: number;
}

export interface Rectangle extends BaseShape {
  type: 'rectangle';
}

export interface Circle extends BaseShape {
  type: 'circle';
}

export interface Line extends BaseShape {
  type: 'line';
}

export type Shape = Rectangle | Circle | Line;

export type DrawingMode = 'pan' | 'rectangle' | 'circle' | 'line';
