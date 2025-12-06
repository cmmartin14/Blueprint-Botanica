export const snapToGrid = (x: number, y: number, gridSize: number = 20) => {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize,
  };
};

export const pixelsToUnit = (pixels: number, scale: number, unit: 'feet' | 'meters') => {
  const baseUnit = pixels / scale;
  return unit === 'meters' ? baseUnit * 0.3048 : baseUnit;
};

export const unitToPixels = (value: number, scale: number, unit: 'feet' | 'meters') => {
  const inFeet = unit === 'meters' ? value / 0.3048 : value;
  return inFeet * scale;
};