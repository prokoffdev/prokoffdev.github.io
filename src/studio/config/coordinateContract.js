/**
 * PROKOFF DEV — Isometric Coordinate Contract
 * Unified standard for Grid <-> Screen transformations.
 *
 * Isometric Projection 2:1
 * Grid: 22 columns x 14 rows
 * Tile: 64 x 32 logical units (half: 32 x 16)
 * Origin: (680, 370) logical units (far corner at tile [0, 0])
 */

export const COORDINATE_CONTRACT = Object.freeze({
  LOGICAL_SIZE: Object.freeze({
    width: 1600,
    height: 1000,
  }),
  GRID: Object.freeze({
    columns: 22,
    rows: 14,
  }),
  TILE: Object.freeze({
    width: 64,
    height: 32,
    halfWidth: 32,
    halfHeight: 16,
  }),
  ORIGIN: Object.freeze({
    x: 680,
    y: 370,
  }),
  CORNERS: Object.freeze({
    far: Object.freeze({ tile: [0, 0], screen: [680, 370] }),
    right: Object.freeze({ tile: [22, 0], screen: [1384, 722] }),
    front: Object.freeze({ tile: [22, 14], screen: [936, 946] }),
    left: Object.freeze({ tile: [0, 14], screen: [232, 594] }),
  }),
  RESERVED_ANCHORS: Object.freeze({
    avatarChair: Object.freeze([14, 6]),
    catStation: Object.freeze([17, 10]),
  }),
  SORTING: Object.freeze({
    formula: 'entity.worldFootY * 100 + depthBias',
    anchorType: 'feet-or-bottom-center',
  }),
});

/**
 * Converts isometric tile coordinates (col, row) to logical screen coordinates (x, y).
 * Formula:
 * screenX = originX + (col - row) * 32
 * screenY = originY + (col + row) * 16
 *
 * @param {number} col - Column index (i), 0 to 22
 * @param {number} row - Row index (j), 0 to 14
 * @returns {{ x: number, y: number }}
 */
export function tileToScreen(col, row) {
  const { ORIGIN, TILE } = COORDINATE_CONTRACT;
  return {
    x: ORIGIN.x + (col - row) * TILE.halfWidth,
    y: ORIGIN.y + (col + row) * TILE.halfHeight,
  };
}

/**
 * Converts screen coordinates (x, y) to continuous isometric tile coordinates (col, row).
 *
 * @param {number} x
 * @param {number} y
 * @returns {{ col: number, row: number }}
 */
export function screenToTile(x, y) {
  const { ORIGIN, TILE } = COORDINATE_CONTRACT;
  const dx = (x - ORIGIN.x) / TILE.halfWidth;
  const dy = (y - ORIGIN.y) / TILE.halfHeight;
  return {
    col: (dx + dy) / 2,
    row: (dy - dx) / 2,
  };
}

/**
 * Snaps screen coordinates to the nearest discrete tile indices.
 *
 * @param {number} x
 * @param {number} y
 * @returns {{ col: number, row: number }}
 */
export function snapToTile(x, y) {
  const { col, row } = screenToTile(x, y);
  return {
    col: Math.round(col),
    row: Math.round(row),
  };
}

/**
 * Checks if tile coordinates are inside the room grid bounds.
 *
 * @param {number} col
 * @param {number} row
 * @returns {boolean}
 */
export function isInsideGrid(col, row) {
  const { columns, rows } = COORDINATE_CONTRACT.GRID;
  return col >= 0 && col <= columns && row >= 0 && row <= rows;
}
