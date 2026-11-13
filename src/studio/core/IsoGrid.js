import {
  GRID_CONFIG,
  vertexToScreen,
  getCellVertices,
  getCellCenter,
  getCellBottomAnchor,
  screenToVertex,
  screenToCell,
  isValidCell,
  isValidVertex,
} from './WorldCoordinates.js';

export class IsoGrid {
  constructor(config = {}) {
    this.columns = config.columns ?? GRID_CONFIG.COLUMNS;
    this.rows = config.rows ?? GRID_CONFIG.ROWS;
    this.tileWidth = config.tileWidth ?? GRID_CONFIG.TILE_WIDTH;
    this.tileHeight = config.tileHeight ?? GRID_CONFIG.TILE_HEIGHT;
    this.originX = config.originX ?? GRID_CONFIG.ORIGIN_X;
    this.originY = config.originY ?? GRID_CONFIG.ORIGIN_Y;
  }

  vertexToScreen(u, v) {
    return vertexToScreen(u, v);
  }

  screenToVertex(x, y) {
    return screenToVertex(x, y);
  }

  screenToCell(x, y) {
    return screenToCell(x, y);
  }

  getCellCenter(col, row) {
    return getCellCenter(col, row);
  }

  getCellVertices(col, row) {
    return getCellVertices(col, row);
  }

  getCellBottomAnchor(col, row) {
    return getCellBottomAnchor(col, row);
  }

  isValidCell(col, row) {
    return col >= 0 && col < this.columns && row >= 0 && row < this.rows;
  }

  isValidVertex(u, v) {
    return u >= 0 && u <= this.columns && v >= 0 && v <= this.rows;
  }

  /**
   * Returns valid 4-directional cardinal isometric neighbors for cell (col, row).
   * NW: col - 1, row
   * NE: col, row - 1
   * SE: col + 1, row
   * SW: col, row + 1
   *
   * @param {number} col
   * @param {number} row
   * @returns {Array<{ col: number, row: number, dir: string }>}
   */
  getNeighbors(col, row) {
    const directions = [
      { col: col - 1, row: row, dir: 'iso_nw' },
      { col: col, row: row - 1, dir: 'iso_ne' },
      { col: col + 1, row: row, dir: 'iso_se' },
      { col: col, row: row + 1, dir: 'iso_sw' },
    ];
    return directions.filter((d) => this.isValidCell(d.col, d.row));
  }

  /**
   * Returns the four corner vertices of the entire room floor in screen space.
   *
   * @returns {{ far: {x:number, y:number}, right: {x:number, y:number}, front: {x:number, y:number}, left: {x:number, y:number} }}
   */
  getFloorCorners() {
    return {
      far: this.vertexToScreen(0, 0),
      right: this.vertexToScreen(this.columns, 0),
      front: this.vertexToScreen(this.columns, this.rows),
      left: this.vertexToScreen(0, this.rows),
    };
  }

  /**
   * Returns polygons for Wall A (back right) and Wall B (back left).
   * Wall height is standard 280 logical units.
   *
   * @param {number} [height=280]
   * @returns {{ wallA: Array<{x:number, y:number}>, wallB: Array<{x:number, y:number}> }}
   */
  getWallPolygons(height = 280) {
    const far = this.vertexToScreen(0, 0);
    const right = this.vertexToScreen(this.columns, 0);
    const left = this.vertexToScreen(0, this.rows);

    return {
      wallA: [
        { x: far.x, y: far.y },
        { x: right.x, y: right.y },
        { x: right.x, y: right.y - height },
        { x: far.x, y: far.y - height },
      ],
      wallB: [
        { x: far.x, y: far.y },
        { x: left.x, y: left.y },
        { x: left.x, y: left.y - height },
        { x: far.x, y: far.y - height },
      ],
    };
  }
}
