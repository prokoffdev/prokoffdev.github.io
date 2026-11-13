import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IsoGrid } from '../src/studio/core/IsoGrid.js';
import { CollisionGrid, CellType } from '../src/studio/navigation/CollisionGrid.js';
import { PathFinder } from '../src/studio/navigation/PathFinder.js';

describe('CollisionGrid & PathFinder A* Tests', () => {
  const isoGrid = new IsoGrid();
  const collisionGrid = new CollisionGrid();
  const pathFinder = new PathFinder(collisionGrid, isoGrid);

  it('should identify blocked cells and walkable cells correctly', () => {
    // Bed region [2..8, 8..11] contains blocked cells (e.g. [3, 9])
    assert.equal(collisionGrid.isBlocked(3, 9), true);
    assert.equal(collisionGrid.isWalkable(3, 9), false);

    // Open rug/walking area [11, 9] is walkable
    assert.equal(collisionGrid.isWalkable(11, 9), true);
    assert.equal(collisionGrid.isBlocked(11, 9), false);
  });

  it('should preserve chair reservation at cell [14, 6]', () => {
    assert.equal(collisionGrid.isReserved(14, 6), true);
    assert.equal(collisionGrid.getCell(14, 6), CellType.RESERVED);

    // Reserved cell is NOT walkable by default
    assert.equal(collisionGrid.isWalkable(14, 6, { allowReserved: false }), false);
    // Reserved cell IS walkable when allowReserved is true
    assert.equal(collisionGrid.isWalkable(14, 6, { allowReserved: true }), true);
  });

  it('should find optimal path between two walkable points in the room', () => {
    // Path from [10, 6] to [12, 8]
    const path = pathFinder.findPath(10, 6, 12, 8);
    assert.ok(path.length > 0, 'Path should exist');

    // All steps in path must be walkable
    path.forEach((step) => {
      assert.equal(collisionGrid.isWalkable(step.col, step.row), true, `Step [${step.col}, ${step.row}] must be walkable`);
      assert.ok(['iso_nw', 'iso_ne', 'iso_se', 'iso_sw'].includes(step.dir), `Step dir must be valid isometric direction: ${step.dir}`);
    });

    // Last step must reach target
    const finalStep = path[path.length - 1];
    assert.equal(finalStep.col, 12);
    assert.equal(finalStep.row, 8);
  });

  it('should allow pathfinding starting from reserved chair [14, 6] to open room floor', () => {
    // Chair [14, 6] to walkable floor [12, 6]
    const path = pathFinder.findPath(14, 6, 12, 6, {
      allowStartOnReserved: true,
      allowTargetOnReserved: false,
    });
    assert.ok(path.length > 0, 'Should find path leaving chair');
    assert.equal(path[path.length - 1].col, 12);
    assert.equal(path[path.length - 1].row, 6);
  });

  it('should refuse to navigate through blocked obstacles or walls', () => {
    // Try navigating directly into the middle of the blocked desk [12, 2]
    const path = pathFinder.findPath(10, 6, 12, 2);
    assert.equal(path.length, 0, 'Must return empty path for blocked target');
  });

  it('should gracefully return empty path for out-of-bounds coordinates', () => {
    const path = pathFinder.findPath(10, 6, 99, 99);
    assert.equal(path.length, 0);

    const pathNegative = pathFinder.findPath(-5, 0, 10, 6);
    assert.equal(pathNegative.length, 0);
  });

  it('should return empty path when start and target are identical', () => {
    const path = pathFinder.findPath(10, 6, 10, 6);
    assert.equal(path.length, 0);
  });
});
