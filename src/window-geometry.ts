export interface WorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowGeometry extends WorkArea {
  minWidth: number;
  minHeight: number;
}

const TARGET_WIDTH = 1676;
const TARGET_HEIGHT = 1124;

// Electron's display workArea and BrowserWindow bounds are both in DIP.
export function fitWindowToWorkArea(workArea: WorkArea): WindowGeometry {
  const { x, y, width: availableWidth, height: availableHeight } = workArea;
  if (![x, y, availableWidth, availableHeight].every(Number.isSafeInteger) ||
      availableWidth < 1 || availableHeight < 1) {
    throw new RangeError('Display work area must be a finite, positive DIP rectangle');
  }

  const width = Math.min(TARGET_WIDTH, availableWidth);
  const height = Math.min(TARGET_HEIGHT, availableHeight);
  return {
    x: x + Math.floor((availableWidth - width) / 2),
    y: y + Math.floor((availableHeight - height) / 2),
    width,
    height,
    minWidth: Math.min(800, width),
    minHeight: Math.min(620, height),
  };
}
