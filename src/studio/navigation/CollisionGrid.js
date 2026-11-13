import defaultCollisionMap from '../../data/studio/collision-map.json' with { type: 'json' };

export const CellType = Object.freeze({
  WALKABLE: 0,
  BLOCKED: 1,
  SLOW_SPECIAL: 2,
  RESERVED: 3,
});

export class CollisionGrid {
  /**
   * @param {object} [collisionData] - data object formatted like collision-map.json
   */
  constructor(collisionData = defaultCollisionMap) {
    this.columns = collisionData?.grid?.columns ?? 22;
    this.rows = collisionData?.grid?.rows ?? 14;
    // Deep clone the 2D grid matrix so mutations don't pollute the raw JSON
    this.matrix = (collisionData?.grid?.values ?? []).map((row) => [...row]);
    this.legend = collisionData?.grid?.legend ?? {
      0: 'walkable',
      1: 'blocked',
      2: 'slow-or-special',
      3: 'reserved-spawn-or-seated-anchor',
    };
    this.pathfindingRules = collisionData?.pathfinding ?? {
      algorithm: 'A*',
      diagonalMovement: false,
      allowStartOnReserved: true,
      allowTargetOnReserved: false,
      catIgnoresActorCollision: true,
    };
  }

  /**
   * Checks if coordinates are within the grid bounds.
   *
   * @param {number} col
   * @param {number} row
   * @returns {boolean}
   */
  inBounds(col, row) {
    return col >= 0 && col < this.columns && row >= 0 && row < this.rows;
  }

  /**
   * Gets raw cell value at (col, row).
   *
   * @param {number} col
   * @param {number} row
   * @returns {number}
   */
  getCell(col, row) {
    if (!this.inBounds(col, row)) return CellType.BLOCKED;
    return this.matrix[row][col];
  }

  /**
   * Sets cell value at (col, row).
   *
   * @param {number} col
   * @param {number} row
   * @param {number} val
   */
  setCell(col, row, val) {
    if (this.inBounds(col, row)) {
      this.matrix[row][col] = val;
    }
  }

  /**
   * Returns true if cell is strictly blocked by furniture or walls.
   *
   * @param {number} col
   * @param {number} row
   * @returns {boolean}
   */
  isBlocked(col, row) {
    return this.getCell(col, row) === CellType.BLOCKED;
  }

  /**
   * Returns true if cell is the reserved spawn / chair anchor.
   *
   * @param {number} col
   * @param {number} row
   * @returns {boolean}
   */
  isReserved(col, row) {
    return this.getCell(col, row) === CellType.RESERVED;
  }

  /**
   * Returns true if cell can be traversed.
   *
   * @param {number} col
   * @param {number} row
   * @param {object} [options]
   * @param {boolean} [options.allowReserved=false]
   * @returns {boolean}
   */
  isWalkable(col, row, options = {}) {
    if (!this.inBounds(col, row)) return false;
    const val = this.getCell(col, row);
    if (val === CellType.BLOCKED) return false;
    if (val === CellType.RESERVED) {
      return Boolean(options.allowReserved);
    }
    return val === CellType.WALKABLE || val === CellType.SLOW_SPECIAL;
  }

  /**
   * Releases a reserved cell (e.g. after avatar stands up from chair).
   *
   * @param {number} col
   * @param {number} row
   */
  releaseReservedCell(col, row) {
    if (this.isReserved(col, row)) {
      this.setCell(col, row, CellType.WALKABLE);
    }
  }

  /**
   * Restores a reserved cell (e.g. when chair becomes occupied).
   *
   * @param {number} col
   * @param {number} row
   */
  restoreReservedCell(col, row) {
    if (this.inBounds(col, row)) {
      this.setCell(col, row, CellType.RESERVED);
    }
  }
}
