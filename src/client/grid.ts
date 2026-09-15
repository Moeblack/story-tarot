/**
 * Slot coordinates (`slot.x` / `slot.y`) are abstract positions, not pixels.
 * Both the DOM table and the PNG exporter derive their grid from the very same
 * rank mapping so what you see on screen is what lands in the exported image.
 */
export interface SlotCoords {
  x: number;
  y: number;
}

export interface SlotGrid {
  cols: number;
  rows: number;
  /** 1-based column index for a raw slot x coordinate. */
  col(x: number): number;
  /** 1-based row index for a raw slot y coordinate. */
  row(y: number): number;
}

export function computeGrid(slots: ReadonlyArray<SlotCoords>): SlotGrid {
  const xs = Array.from(new Set(slots.map((slot) => slot.x))).sort((a, b) => a - b);
  const ys = Array.from(new Set(slots.map((slot) => slot.y))).sort((a, b) => a - b);
  return {
    cols: Math.max(1, xs.length),
    rows: Math.max(1, ys.length),
    col: (x: number) => {
      const index = xs.indexOf(x);
      return index < 0 ? 1 : index + 1;
    },
    row: (y: number) => {
      const index = ys.indexOf(y);
      return index < 0 ? 1 : index + 1;
    },
  };
}
