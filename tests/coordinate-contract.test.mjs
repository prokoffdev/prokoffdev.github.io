import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  COORDINATE_CONTRACT,
  tileToScreen,
  screenToTile,
  snapToTile,
  isInsideGrid,
} from '../src/studio/config/coordinateContract.js';

describe('Coordinate Contract & Transformation Tests', () => {
  it('should have exact logical dimensions and origin', () => {
    assert.equal(COORDINATE_CONTRACT.LOGICAL_SIZE.width, 1600);
    assert.equal(COORDINATE_CONTRACT.LOGICAL_SIZE.height, 1000);
    assert.equal(COORDINATE_CONTRACT.GRID.columns, 22);
    assert.equal(COORDINATE_CONTRACT.GRID.rows, 14);
    assert.equal(COORDINATE_CONTRACT.ORIGIN.x, 680);
    assert.equal(COORDINATE_CONTRACT.ORIGIN.y, 370);
  });

  it('should correctly calculate the four corner coordinates', () => {
    const { far, right, front, left } = COORDINATE_CONTRACT.CORNERS;

    // Far corner: [0, 0] -> (680, 370)
    const farScreen = tileToScreen(far.tile[0], far.tile[1]);
    assert.equal(farScreen.x, far.screen[0]);
    assert.equal(farScreen.y, far.screen[1]);

    // Right corner: [22, 0] -> (1384, 722)
    const rightScreen = tileToScreen(right.tile[0], right.tile[1]);
    assert.equal(rightScreen.x, right.screen[0]);
    assert.equal(rightScreen.y, right.screen[1]);

    // Front corner: [22, 14] -> (936, 946)
    const frontScreen = tileToScreen(front.tile[0], front.tile[1]);
    assert.equal(frontScreen.x, front.screen[0]);
    assert.equal(frontScreen.y, front.screen[1]);

    // Left corner: [0, 14] -> (232, 594)
    const leftScreen = tileToScreen(left.tile[0], left.tile[1]);
    assert.equal(leftScreen.x, left.screen[0]);
    assert.equal(leftScreen.y, left.screen[1]);
  });

  it('should accurately calculate reserved avatar spawn tile [14, 6]', () => {
    // col 14, row 6:
    // x = 680 + (14 - 6) * 32 = 680 + 256 = 936
    // y = 370 + (14 + 6) * 16 = 370 + 320 = 690
    const screen = tileToScreen(14, 6);
    assert.equal(screen.x, 936);
    assert.equal(screen.y, 690);
  });

  it('should invert screen coordinates back to tile coordinates (bidirectional)', () => {
    const testTiles = [
      [0, 0],
      [14, 6],
      [22, 0],
      [22, 14],
      [0, 14],
      [10, 8],
      [18, 9],
    ];

    testTiles.forEach(([col, row]) => {
      const screen = tileToScreen(col, row);
      const inverted = screenToTile(screen.x, screen.y);
      assert.ok(Math.abs(inverted.col - col) < 1e-9, `Inverted col ${inverted.col} != ${col}`);
      assert.ok(Math.abs(inverted.row - row) < 1e-9, `Inverted row ${inverted.row} != ${row}`);

      const snapped = snapToTile(screen.x, screen.y);
      assert.equal(snapped.col, col);
      assert.equal(snapped.row, row);
    });
  });

  it('should correctly validate grid boundaries', () => {
    assert.equal(isInsideGrid(0, 0), true);
    assert.equal(isInsideGrid(22, 14), true);
    assert.equal(isInsideGrid(14, 6), true);
    assert.equal(isInsideGrid(-1, 5), false);
    assert.equal(isInsideGrid(23, 5), false);
    assert.equal(isInsideGrid(5, 15), false);
  });
});
