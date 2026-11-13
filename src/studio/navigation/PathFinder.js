import { CellType } from './CollisionGrid.js';
import { IsoGrid } from '../core/IsoGrid.js';

export class PathFinder {
  /**
   * @param {CollisionGrid} collisionGrid
   * @param {IsoGrid} [isoGrid]
   */
  constructor(collisionGrid, isoGrid = null) {
    this.collisionGrid = collisionGrid;
    this.isoGrid = isoGrid || new IsoGrid();
  }

  /**
   * Manhattan distance heuristic for 4-directional grid.
   */
  heuristic(colA, rowA, colB, rowB) {
    return Math.abs(colA - colB) + Math.abs(rowA - rowB);
  }

  /**
   * Computes cardinal direction key from (fromCol, fromRow) to (toCol, toRow).
   */
  getDirection(fromCol, fromRow, toCol, toRow) {
    const dc = toCol - fromCol;
    const dr = toRow - fromRow;
    if (dc === -1 && dr === 0) return 'iso_nw';
    if (dc === 0 && dr === -1) return 'iso_ne';
    if (dc === 1 && dr === 0) return 'iso_se';
    if (dc === 0 && dr === 1) return 'iso_sw';
    return 'idle';
  }

  /**
   * Finds the shortest walkable path between (startCol, startRow) and (endCol, endRow) using A*.
   * Supports both (startCol, startRow, endCol, endRow, options) and ([startCol, startRow], [endCol, endRow], options).
   *
   * @param {number|number[]} startCol
   * @param {number|number[]} startRow
   * @param {number|object} [endCol]
   * @param {number} [endRow]
   * @param {object} [options]
   * @param {boolean} [options.allowStartOnReserved=true]
   * @param {boolean} [options.allowTargetOnReserved=false]
   * @returns {Array<{ col: number, row: number, dir: string }>} Path array (excluding start node, including target)
   */
  findPath(startCol, startRow, endCol, endRow, options = {}) {
    if (Array.isArray(startCol) && Array.isArray(startRow)) {
      options = endCol || {};
      const targetArr = startRow;
      const startArr = startCol;
      endCol = targetArr[0];
      endRow = targetArr[1];
      startCol = startArr[0];
      startRow = startArr[1];
    }

    const allowStartReserved = options.allowStartOnReserved ?? true;
    const allowTargetReserved = options.allowTargetOnReserved ?? false;

    // Boundary check
    if (!this.collisionGrid.inBounds(startCol, startRow) || !this.collisionGrid.inBounds(endCol, endRow)) {
      return [];
    }

    // Already at target
    if (startCol === endCol && startRow === endRow) {
      return [];
    }

    // Target must be walkable
    if (!this.collisionGrid.isWalkable(endCol, endRow, { allowReserved: allowTargetReserved })) {
      return [];
    }

    // Start must be walkable (or allowed reserved)
    if (!this.collisionGrid.isWalkable(startCol, startRow, { allowReserved: allowStartReserved })) {
      return [];
    }

    const startKey = `${startCol},${startRow}`;
    const targetKey = `${endCol},${endRow}`;

    const openSet = new Map();
    const closedSet = new Set();

    const startNode = {
      col: startCol,
      row: startRow,
      g: 0,
      h: this.heuristic(startCol, startRow, endCol, endRow),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;

    openSet.set(startKey, startNode);

    while (openSet.size > 0) {
      // Find node with lowest f cost
      let currentKey = null;
      let currentNode = null;

      for (const [key, node] of openSet.entries()) {
        if (!currentNode || node.f < currentNode.f || (node.f === currentNode.f && node.h < currentNode.h)) {
          currentNode = node;
          currentKey = key;
        }
      }

      // Target reached!
      if (currentNode.col === endCol && currentNode.row === endRow) {
        return this.reconstructPath(currentNode);
      }

      openSet.delete(currentKey);
      closedSet.add(currentKey);

      // Explore 4-directional neighbors
      const neighbors = this.isoGrid.getNeighbors(currentNode.col, currentNode.row);

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.col},${neighbor.row}`;
        if (closedSet.has(neighborKey)) continue;

        const isTarget = neighbor.col === endCol && neighbor.row === endRow;
        const walkable = this.collisionGrid.isWalkable(neighbor.col, neighbor.row, {
          allowReserved: isTarget ? allowTargetReserved : false,
        });

        if (!walkable) continue;

        // Base step cost: 1 (or 2 if SLOW_SPECIAL)
        const cellType = this.collisionGrid.getCell(neighbor.col, neighbor.row);
        const stepCost = cellType === CellType.SLOW_SPECIAL ? 2 : 1;
        const tentativeG = currentNode.g + stepCost;

        let neighborNode = openSet.get(neighborKey);

        if (!neighborNode) {
          neighborNode = {
            col: neighbor.col,
            row: neighbor.row,
            g: tentativeG,
            h: this.heuristic(neighbor.col, neighbor.row, endCol, endRow),
            f: 0,
            parent: currentNode,
          };
          neighborNode.f = neighborNode.g + neighborNode.h;
          openSet.set(neighborKey, neighborNode);
        } else if (tentativeG < neighborNode.g) {
          neighborNode.g = tentativeG;
          neighborNode.f = neighborNode.g + neighborNode.h;
          neighborNode.parent = currentNode;
        }
      }
    }

    // No path found (unreachable)
    return [];
  }

  /**
   * Reconstructs node list from target back to start, returning forward path.
   */
  reconstructPath(targetNode) {
    const path = [];
    let curr = targetNode;

    while (curr.parent) {
      const dir = this.getDirection(curr.parent.col, curr.parent.row, curr.col, curr.row);
      path.unshift({
        col: curr.col,
        row: curr.row,
        dir,
      });
      curr = curr.parent;
    }

    return path;
  }
}
