/**
 * PROKOFF DEV — WorldCoordinates.js
 * Explicit mathematical separation of Grid Vertices, Cell Indices, Cell Centers,
 * and Screen Display Coordinates.
 *
 * Isometric Projection 2:1
 * Grid: 22 columns x 14 rows (cells) -> 23 x 15 vertices
 * Tile: 64 x 32 logical units (half: 32 x 16)
 * Origin: (680, 370)
 */

export const GRID_CONFIG = Object.freeze({
  COLUMNS: 22,
  ROWS: 14,
  TILE_WIDTH: 64,
  TILE_HEIGHT: 32,
  HALF_WIDTH: 32,
  HALF_HEIGHT: 16,
  ORIGIN_X: 680,
  ORIGIN_Y: 370,
  LOGICAL_WIDTH: 1600,
  LOGICAL_HEIGHT: 1000,
});

/**
 * Converts a grid vertex (u, v) [0..22, 0..14] to screen coordinates.
 *
 * @param {number} u - Vertex column index (0 to 22)
 * @param {number} v - Vertex row index (0 to 14)
 * @returns {{ x: number, y: number }}
 */
export function vertexToScreen(u, v) {
  const { ORIGIN_X, ORIGIN_Y, HALF_WIDTH, HALF_HEIGHT } = GRID_CONFIG;
  return {
    x: ORIGIN_X + (u - v) * HALF_WIDTH,
    y: ORIGIN_Y + (u + v) * HALF_HEIGHT,
  };
}

/**
 * Returns the four screen vertices forming the diamond boundary of cell (col, row).
 *
 * @param {number} col - Cell column (0 to 21)
 * @param {number} row - Cell row (0 to 13)
 * @returns {{ top: {x: number, y: number}, right: {x: number, y: number}, bottom: {x: number, y: number}, left: {x: number, y: number} }}
 */
export function getCellVertices(col, row) {
  return {
    top: vertexToScreen(col, row),
    right: vertexToScreen(col + 1, row),
    bottom: vertexToScreen(col + 1, row + 1),
    left: vertexToScreen(col, row + 1),
  };
}

/**
 * Returns the exact geometric center of cell (col, row) on the screen.
 * Vertex: (col + 0.5, row + 0.5).
 *
 * @param {number} col - Cell column (0 to 21)
 * @param {number} row - Cell row (0 to 13)
 * @returns {{ x: number, y: number }}
 */
export function getCellCenter(col, row) {
  return vertexToScreen(col + 0.5, row + 0.5);
}

/**
 * Returns the bottom vertex (ground anchor) of cell (col, row).
 *
 * @param {number} col
 * @param {number} row
 * @returns {{ x: number, y: number }}
 */
export function getCellBottomAnchor(col, row) {
  return vertexToScreen(col + 1, row + 1);
}

/**
 * Converts screen coordinates to continuous vertex coordinates (u, v).
 *
 * @param {number} x
 * @param {number} y
 * @returns {{ u: number, v: number }}
 */
export function screenToVertex(x, y) {
  const { ORIGIN_X, ORIGIN_Y, HALF_WIDTH, HALF_HEIGHT } = GRID_CONFIG;
  const dx = (x - ORIGIN_X) / HALF_WIDTH;
  const dy = (y - ORIGIN_Y) / HALF_HEIGHT;
  return {
    u: (dx + dy) / 2,
    v: (dy - dx) / 2,
  };
}

/**
 * Converts screen coordinates to discrete cell indices [0..21, 0..13].
 *
 * @param {number} x
 * @param {number} y
 * @returns {{ col: number, row: number }}
 */
export function screenToCell(x, y) {
  const { u, v } = screenToVertex(x, y);
  return {
    col: Math.floor(u),
    row: Math.floor(v),
  };
}

/**
 * Validates if cell indices are within valid grid boundaries.
 *
 * @param {number} col
 * @param {number} row
 * @returns {boolean}
 */
export function isValidCell(col, row) {
  return col >= 0 && col < GRID_CONFIG.COLUMNS && row >= 0 && row < GRID_CONFIG.ROWS;
}

/**
 * Validates if vertex indices are within valid grid boundaries.
 *
 * @param {number} u
 * @param {number} v
 * @returns {boolean}
 */
export function isValidVertex(u, v) {
  return u >= 0 && u <= GRID_CONFIG.COLUMNS && v >= 0 && v <= GRID_CONFIG.ROWS;
}
