import { getCellVertices } from './WorldCoordinates.js';

export const STUDIO_PALETTE = Object.freeze({
  BACKDROP: 0x111923,
  FLOOR_BASE: 0x222d39,
  FLOOR_GRADIENT_TOP: 0x303946,
  FLOOR_GRID: 0x475569,
  WALL_A: 0x1e2733,
  WALL_B: 0x25303e,
  WALL_OUTLINE: 0x475569,
  NEON_RED: 0xff454d,
  NEON_RED_DARK: 0x9f2735,
  CYAN_ACCENT: 0x55c9f2,
  DESK_TOP: 0x6b493d,
  DESK_BODY: 0x1c232c,
  CHAIR_BODY: 0x27313d,
  CHAIR_ACCENT: 0xde3f48,
  BED_FRAME: 0x1e2530,
  BED_SHEET: 0xc8d1dc,
  BED_BLANKET: 0xd8454d,
  SHELF_WOOD: 0x5a3e35,
  MONITOR_SCREEN: 0x3d6494,
  PC_TOWER: 0x141a22,
  BLOCKED_DEBUG: 0xff3b30,
  WALKABLE_DEBUG: 0x34c759,
  RESERVED_DEBUG: 0xaf52de,
});

export class TileRenderer {
  /**
   * Draws an isometric prism / 3D block onto a Phaser.GameObjects.Graphics context.
   *
   * @param {Phaser.GameObjects.Graphics} graphics
   * @param {IsoGrid} isoGrid
   * @param {object} options
   * @param {number} options.col - start col
   * @param {number} options.row - start row
   * @param {number} options.widthCols - width along col axis
   * @param {number} options.depthRows - depth along row axis
   * @param {number} options.heightPx - vertical height in px
   * @param {number} options.topColor - color of top face
   * @param {number} [options.leftColor] - color of left (SW) face
   * @param {number} [options.rightColor] - color of right (SE) face
   * @param {number} [options.alpha=1]
   * @param {number} [options.elevation=0] - base elevation from floor
   */
  static drawIsoBlock(graphics, isoGrid, options) {
    const {
      col,
      row,
      widthCols,
      depthRows,
      heightPx,
      topColor,
      leftColor,
      rightColor,
      alpha = 1,
      elevation = 0,
    } = options;

    // 4 base vertices in screen space
    const baseTop = isoGrid.vertexToScreen(col, row);
    const baseRight = isoGrid.vertexToScreen(col + widthCols, row);
    const baseBottom = isoGrid.vertexToScreen(col + widthCols, row + depthRows);
    const baseLeft = isoGrid.vertexToScreen(col, row + depthRows);

    // Elevated base vertices
    const bTop = { x: baseTop.x, y: baseTop.y - elevation };
    const bRight = { x: baseRight.x, y: baseRight.y - elevation };
    const bBottom = { x: baseBottom.x, y: baseBottom.y - elevation };
    const bLeft = { x: baseLeft.x, y: baseLeft.y - elevation };

    // Roof vertices (height above base)
    const rTop = { x: bTop.x, y: bTop.y - heightPx };
    const rRight = { x: bRight.x, y: bRight.y - heightPx };
    const rBottom = { x: bBottom.x, y: bBottom.y - heightPx };
    const rLeft = { x: bLeft.x, y: bLeft.y - heightPx };

    // Default shaded faces if not explicitly provided
    const lColor = leftColor ?? TileRenderer.darken(topColor, 0.7);
    const rColor = rightColor ?? TileRenderer.darken(topColor, 0.5);

    // Left face (facing SW)
    graphics.fillStyle(lColor, alpha);
    graphics.beginPath();
    graphics.moveTo(bLeft.x, bLeft.y);
    graphics.lineTo(bBottom.x, bBottom.y);
    graphics.lineTo(rBottom.x, rBottom.y);
    graphics.lineTo(rLeft.x, rLeft.y);
    graphics.closePath();
    graphics.fill();

    // Right face (facing SE)
    graphics.fillStyle(rColor, alpha);
    graphics.beginPath();
    graphics.moveTo(bBottom.x, bBottom.y);
    graphics.lineTo(bRight.x, bRight.y);
    graphics.lineTo(rRight.x, rRight.y);
    graphics.lineTo(rBottom.x, rBottom.y);
    graphics.closePath();
    graphics.fill();

    // Top face
    graphics.fillStyle(topColor, alpha);
    graphics.beginPath();
    graphics.moveTo(rTop.x, rTop.y);
    graphics.lineTo(rRight.x, rRight.y);
    graphics.lineTo(rBottom.x, rBottom.y);
    graphics.lineTo(rLeft.x, rLeft.y);
    graphics.closePath();
    graphics.fill();
  }

  /**
   * Draws a single isometric floor tile diamond.
   *
   * @param {Phaser.GameObjects.Graphics} graphics
   * @param {number} col
   * @param {number} row
   * @param {number} fillColor
   * @param {number} [fillAlpha=1]
   * @param {number} [strokeColor=null]
   * @param {number} [strokeWidth=1]
   */
  static drawFloorTile(graphics, col, row, fillColor, fillAlpha = 1, strokeColor = null, strokeWidth = 1) {
    const v = getCellVertices(col, row);

    graphics.fillStyle(fillColor, fillAlpha);
    graphics.beginPath();
    graphics.moveTo(v.top.x, v.top.y);
    graphics.lineTo(v.right.x, v.right.y);
    graphics.lineTo(v.bottom.x, v.bottom.y);
    graphics.lineTo(v.left.x, v.left.y);
    graphics.closePath();
    graphics.fill();

    if (strokeColor !== null) {
      graphics.lineStyle(strokeWidth, strokeColor, 1);
      graphics.strokePath();
    }
  }

  /**
   * Helper: darken hex color by factor.
   */
  static darken(hex, factor) {
    const r = Math.floor(((hex >> 16) & 0xff) * factor);
    const g = Math.floor(((hex >> 8) & 0xff) * factor);
    const b = Math.floor((hex & 0xff) * factor);
    return (r << 16) | (g << 8) | b;
  }
}
