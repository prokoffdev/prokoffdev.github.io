import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IsoGrid } from '../src/studio/core/IsoGrid.js';
import {
  vertexToScreen,
  getCellVertices,
  getCellCenter,
  getCellBottomAnchor,
  screenToCell,
  isValidCell,
  isValidVertex,
} from '../src/studio/core/WorldCoordinates.js';

describe('IsoGrid & WorldCoordinates Tests', () => {
  const grid = new IsoGrid();

  it('should distinguish grid vertices (0..22, 0..14) from cell indices (0..21, 0..13)', () => {
    assert.equal(isValidCell(21, 13), true);
    assert.equal(isValidCell(22, 13), false); // 22 is vertex, not cell
    assert.equal(isValidCell(21, 14), false); // 14 is vertex, not cell

    assert.equal(isValidVertex(22, 14), true); // Valid corner vertex
    assert.equal(isValidVertex(23, 14), false);
  });

  it('should calculate accurate diamond cell vertices for cell [0, 0]', () => {
    const v = getCellVertices(0, 0);
    // top: (0, 0) -> (680, 370)
    // right: (1, 0) -> (712, 386)
    // bottom: (1, 1) -> (680, 402)
    // left: (0, 1) -> (648, 386)
    assert.deepEqual(v.top, { x: 680, y: 370 });
    assert.deepEqual(v.right, { x: 712, y: 386 });
    assert.deepEqual(v.bottom, { x: 680, y: 402 });
    assert.deepEqual(v.left, { x: 648, y: 386 });
  });

  it('should compute exact cell center at vertex (col + 0.5, row + 0.5)', () => {
    const center00 = getCellCenter(0, 0);
    // (0.5 - 0.5) * 32 = 0 -> x = 680
    // (0.5 + 0.5) * 16 = 16 -> y = 370 + 16 = 386
    assert.equal(center00.x, 680);
    assert.equal(center00.y, 386);

    const centerChair = getCellCenter(14, 6);
    // x = 680 + (14 - 6) * 32 = 936
    // y = 370 + (14 + 6 + 1) * 16 = 370 + 336 = 706
    assert.equal(centerChair.x, 936);
    assert.equal(centerChair.y, 706);
  });

  it('should convert screen coordinates back to correct cell indices', () => {
    const cellA = screenToCell(680, 386);
    assert.equal(cellA.col, 0);
    assert.equal(cellA.row, 0);

    const cellB = screenToCell(936, 706);
    assert.equal(cellB.col, 14);
    assert.equal(cellB.row, 6);
  });

  it('should return 4 cardinal isometric neighbors within grid bounds', () => {
    const cornerNeighbors = grid.getNeighbors(0, 0);
    assert.equal(cornerNeighbors.length, 2); // SE and SW only
    assert.ok(cornerNeighbors.some((n) => n.col === 1 && n.row === 0 && n.dir === 'iso_se'));
    assert.ok(cornerNeighbors.some((n) => n.col === 0 && n.row === 1 && n.dir === 'iso_sw'));

    const middleNeighbors = grid.getNeighbors(10, 5);
    assert.equal(middleNeighbors.length, 4);
    assert.ok(middleNeighbors.some((n) => n.dir === 'iso_nw'));
    assert.ok(middleNeighbors.some((n) => n.dir === 'iso_ne'));
    assert.ok(middleNeighbors.some((n) => n.dir === 'iso_se'));
    assert.ok(middleNeighbors.some((n) => n.dir === 'iso_sw'));
  });

  it('should construct valid wall polygons with 280px height', () => {
    const walls = grid.getWallPolygons(280);
    assert.equal(walls.wallA.length, 4);
    assert.equal(walls.wallB.length, 4);

    // Wall A starts at far corner (680, 370) and ends at right corner (1384, 722)
    assert.deepEqual(walls.wallA[0], { x: 680, y: 370 });
    assert.deepEqual(walls.wallA[1], { x: 1384, y: 722 });
    assert.equal(walls.wallA[2].y, 722 - 280);
    assert.equal(walls.wallA[3].y, 370 - 280);
  });
});
