import Phaser from 'phaser';
import { IsoGrid } from '../core/IsoGrid.js';
import { TileRenderer, STUDIO_PALETTE } from '../core/TileRenderer.js';
import { CollisionGrid, CellType } from '../navigation/CollisionGrid.js';
import { PathFinder } from '../navigation/PathFinder.js';
import { CameraDirector, CameraMode } from '../camera/CameraDirector.js';
import sceneLayoutData from '../../data/studio/scene-layout.json' with { type: 'json' };
import collisionMapData from '../../data/studio/collision-map.json' with { type: 'json' };
import hotspotsData from '../../data/studio/hotspots.json' with { type: 'json' };

export class StudioScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StudioScene' });

    this.isoGrid = null;
    this.collisionGrid = null;
    this.pathFinder = null;
    this.cameraDirector = null;

    // Graphics Layers
    this.floorGraphics = null;
    this.wallGraphics = null;
    this.propsGraphics = null;
    this.debugGridGraphics = null;
    this.debugCollisionGraphics = null;
    this.debugHotspotsGraphics = null;

    // Debug layer visibility flags
    this.debugFlags = {
      grid: false,
      collision: false,
      hotspots: false,
    };

    // Test marker for Stage 2 pathfinding / follow camera verification
    this.testActor = {
      col: 14,
      row: 6,
      x: 936,
      y: 690,
      path: [],
      speedPxPerSec: 160,
    };
    this.testMarkerGraphics = null;
  }

  create() {
    // 1. Core Systems
    this.isoGrid = new IsoGrid();
    this.collisionGrid = new CollisionGrid(collisionMapData);
    this.pathFinder = new PathFinder(this.collisionGrid, this.isoGrid);
    this.cameraDirector = new CameraDirector(this.cameras.main);

    // 2. Rendering Layers
    this.createFloorAndWalls();
    this.createFurnitureGreybox();
    this.createDebugLayers();
    this.createTestActor();
    this.setupInteractionAndControls();

    // Set initial overview camera
    this.cameraDirector.setOverview(true);
  }

  createFloorAndWalls() {
    // Backdrop fill
    const bg = this.add.graphics();
    bg.fillStyle(STUDIO_PALETTE.BACKDROP, 1);
    bg.fillRect(0, 0, 1600, 1000);

    // Walls
    this.wallGraphics = this.add.graphics();
    const walls = this.isoGrid.getWallPolygons(280);

    // Wall A (Right / Workstation)
    this.wallGraphics.fillStyle(STUDIO_PALETTE.WALL_A, 1);
    this.wallGraphics.beginPath();
    walls.wallA.forEach((pt, idx) => {
      if (idx === 0) this.wallGraphics.moveTo(pt.x, pt.y);
      else this.wallGraphics.lineTo(pt.x, pt.y);
    });
    this.wallGraphics.closePath();
    this.wallGraphics.fill();
    this.wallGraphics.lineStyle(2, STUDIO_PALETTE.WALL_OUTLINE, 0.6);
    this.wallGraphics.strokePath();

    // Wall B (Left / Skills)
    this.wallGraphics.fillStyle(STUDIO_PALETTE.WALL_B, 1);
    this.wallGraphics.beginPath();
    walls.wallB.forEach((pt, idx) => {
      if (idx === 0) this.wallGraphics.moveTo(pt.x, pt.y);
      else this.wallGraphics.lineTo(pt.x, pt.y);
    });
    this.wallGraphics.closePath();
    this.wallGraphics.fill();
    this.wallGraphics.lineStyle(2, STUDIO_PALETTE.WALL_OUTLINE, 0.6);
    this.wallGraphics.strokePath();

    // Neon wall top rim
    this.wallGraphics.lineStyle(3, STUDIO_PALETTE.NEON_RED, 0.7);
    this.wallGraphics.beginPath();
    this.wallGraphics.moveTo(walls.wallB[2].x, walls.wallB[2].y);
    this.wallGraphics.lineTo(walls.wallB[3].x, walls.wallB[3].y);
    this.wallGraphics.lineTo(walls.wallA[1].x, walls.wallA[1].y - 280);
    this.wallGraphics.strokePath();

    // Floor Base Platform & Neon Rim
    this.floorGraphics = this.add.graphics();
    const corners = this.isoGrid.getFloorCorners();

    // Base platform thickness (lower edge)
    const platformHeight = 24;
    this.floorGraphics.fillStyle(0x131922, 1);
    this.floorGraphics.beginPath();
    this.floorGraphics.moveTo(corners.left.x, corners.left.y);
    this.floorGraphics.lineTo(corners.front.x, corners.front.y);
    this.floorGraphics.lineTo(corners.front.x, corners.front.y + platformHeight);
    this.floorGraphics.lineTo(corners.left.x, corners.left.y + platformHeight);
    this.floorGraphics.closePath();
    this.floorGraphics.fill();

    this.floorGraphics.fillStyle(0x0e141c, 1);
    this.floorGraphics.beginPath();
    this.floorGraphics.moveTo(corners.front.x, corners.front.y);
    this.floorGraphics.lineTo(corners.right.x, corners.right.y);
    this.floorGraphics.lineTo(corners.right.x, corners.right.y + platformHeight);
    this.floorGraphics.lineTo(corners.front.x, corners.front.y + platformHeight);
    this.floorGraphics.closePath();
    this.floorGraphics.fill();

    // Floor surface
    this.floorGraphics.fillStyle(STUDIO_PALETTE.FLOOR_BASE, 1);
    this.floorGraphics.beginPath();
    this.floorGraphics.moveTo(corners.far.x, corners.far.y);
    this.floorGraphics.lineTo(corners.right.x, corners.right.y);
    this.floorGraphics.lineTo(corners.front.x, corners.front.y);
    this.floorGraphics.lineTo(corners.left.x, corners.left.y);
    this.floorGraphics.closePath();
    this.floorGraphics.fill();

    // Glowing neon rim along outer floor edge
    this.floorGraphics.lineStyle(4, STUDIO_PALETTE.NEON_RED, 0.9);
    this.floorGraphics.beginPath();
    this.floorGraphics.moveTo(corners.left.x, corners.left.y);
    this.floorGraphics.lineTo(corners.front.x, corners.front.y);
    this.floorGraphics.lineTo(corners.right.x, corners.right.y);
    this.floorGraphics.strokePath();

    // Floor Rug (FUR-009 at [11, 9], 6x3)
    this.floorGraphics.fillStyle(0x283442, 0.85);
    const rugTop = this.isoGrid.vertexToScreen(11, 9);
    const rugRight = this.isoGrid.vertexToScreen(17, 9);
    const rugBottom = this.isoGrid.vertexToScreen(17, 12);
    const rugLeft = this.isoGrid.vertexToScreen(11, 12);
    this.floorGraphics.beginPath();
    this.floorGraphics.moveTo(rugTop.x, rugTop.y);
    this.floorGraphics.lineTo(rugRight.x, rugRight.y);
    this.floorGraphics.lineTo(rugBottom.x, rugBottom.y);
    this.floorGraphics.lineTo(rugLeft.x, rugLeft.y);
    this.floorGraphics.closePath();
    this.floorGraphics.fill();
    this.floorGraphics.lineStyle(1.5, STUDIO_PALETTE.NEON_RED_DARK, 0.6);
    this.floorGraphics.strokePath();
  }

  createFurnitureGreybox() {
    this.propsGraphics = this.add.graphics();
    const g = this.propsGraphics;

    // 1. Workstation Desk (FUR-001: col 14, row 3, 9x5, height 68px)
    TileRenderer.drawIsoBlock(g, this.isoGrid, {
      col: 14,
      row: 3,
      widthCols: 8,
      depthRows: 3,
      heightPx: 64,
      topColor: STUDIO_PALETTE.DESK_TOP,
      leftColor: STUDIO_PALETTE.DESK_BODY,
      rightColor: 0x141a22,
    });

    // Dual Monitors on desk (PROP-001 at col 14, row 1, elevation 64)
    TileRenderer.drawIsoBlock(g, this.isoGrid, {
      col: 14,
      row: 1,
      widthCols: 4,
      depthRows: 1,
      heightPx: 48,
      topColor: STUDIO_PALETTE.MONITOR_SCREEN,
      leftColor: 0x1f2937,
      rightColor: 0x111827,
      elevation: 64,
    });
    TileRenderer.drawIsoBlock(g, this.isoGrid, {
      col: 18,
      row: 1,
      widthCols: 3,
      depthRows: 1,
      heightPx: 44,
      topColor: STUDIO_PALETTE.MONITOR_SCREEN,
      leftColor: 0x1f2937,
      rightColor: 0x111827,
      elevation: 64,
    });

    // PC Tower (PROP-002: col 9, row 3, 2x2, height 85px)
    TileRenderer.drawIsoBlock(g, this.isoGrid, {
      col: 9,
      row: 3,
      widthCols: 2,
      depthRows: 2,
      heightPx: 80,
      topColor: 0x222a36,
      leftColor: STUDIO_PALETTE.PC_TOWER,
      rightColor: 0x0b0e13,
    });

    // Ergonomic Chair (FUR-002: col 14, row 6, 2x2, height 80px)
    TileRenderer.drawIsoBlock(g, this.isoGrid, {
      col: 14,
      row: 6,
      widthCols: 2,
      depthRows: 2,
      heightPx: 38,
      topColor: STUDIO_PALETTE.CHAIR_BODY,
      leftColor: 0x1e2631,
      rightColor: 0x151b24,
    });
    TileRenderer.drawIsoBlock(g, this.isoGrid, {
      col: 14,
      row: 5,
      widthCols: 2,
      depthRows: 1,
      heightPx: 75,
      topColor: STUDIO_PALETTE.CHAIR_ACCENT,
      leftColor: 0x8a242a,
      rightColor: 0x5e161b,
      elevation: 38,
    });

    // Bed (FUR-003: col 5, row 9, 7x5, height 44px)
    TileRenderer.drawIsoBlock(g, this.isoGrid, {
      col: 2,
      row: 8,
      widthCols: 7,
      depthRows: 4,
      heightPx: 38,
      topColor: STUDIO_PALETTE.BED_SHEET,
      leftColor: STUDIO_PALETTE.BED_FRAME,
      rightColor: 0x12171f,
    });
    // Bed blanket (red accent)
    TileRenderer.drawIsoBlock(g, this.isoGrid, {
      col: 5,
      row: 8,
      widthCols: 4,
      depthRows: 4,
      heightPx: 4,
      topColor: STUDIO_PALETTE.BED_BLANKET,
      leftColor: 0x93262d,
      rightColor: 0x6e181e,
      elevation: 38,
    });

    // Bedside Nightstand (FUR-004: col 1, row 8, 2x2, height 42px)
    TileRenderer.drawIsoBlock(g, this.isoGrid, {
      col: 1,
      row: 8,
      widthCols: 1,
      depthRows: 2,
      heightPx: 42,
      topColor: 0x2d3644,
      leftColor: 0x1e242e,
      rightColor: 0x14181f,
    });

    // Wall Bookshelf (FUR-005 on Wall B at col 0, row 3, elevation 120px)
    TileRenderer.drawIsoBlock(g, this.isoGrid, {
      col: 0,
      row: 3,
      widthCols: 1,
      depthRows: 3,
      heightPx: 12,
      topColor: STUDIO_PALETTE.SHELF_WOOD,
      leftColor: 0x3d2720,
      rightColor: 0x2a1a15,
      elevation: 120,
    });

    // Project Pinboard (PROP-009 on Wall A at col 18, row 0, elevation 100px)
    TileRenderer.drawIsoBlock(g, this.isoGrid, {
      col: 18,
      row: 0,
      widthCols: 3,
      depthRows: 1,
      heightPx: 45,
      topColor: 0x8a7058,
      leftColor: 0x5e4936,
      rightColor: 0x3d2f21,
      elevation: 100,
    });

    // Cat Charging Station Cushion (FUR-008: col 17, row 10, 2x1)
    TileRenderer.drawIsoBlock(g, this.isoGrid, {
      col: 17,
      row: 10,
      widthCols: 2,
      depthRows: 1,
      heightPx: 14,
      topColor: 0x3b4859,
      leftColor: 0x222a35,
      rightColor: 0x181e26,
    });

    // Small Props: Phone (PROP-006) & Gamepad (PROP-007)
    TileRenderer.drawIsoBlock(g, this.isoGrid, {
      col: 17,
      row: 4,
      widthCols: 1,
      depthRows: 1,
      heightPx: 18,
      topColor: 0x4f5b66,
      elevation: 64,
    });
    TileRenderer.drawIsoBlock(g, this.isoGrid, {
      col: 8,
      row: 7,
      widthCols: 1,
      depthRows: 1,
      heightPx: 10,
      topColor: 0x353f4d,
    });
  }

  createDebugLayers() {
    this.debugGridGraphics = this.add.graphics();
    this.debugCollisionGraphics = this.add.graphics();
    this.debugHotspotsGraphics = this.add.graphics();

    this.renderDebugGrid();
    this.renderDebugCollisions();
    this.renderDebugHotspots();

    this.debugGridGraphics.setVisible(this.debugFlags.grid);
    this.debugCollisionGraphics.setVisible(this.debugFlags.collision);
    this.debugHotspotsGraphics.setVisible(this.debugFlags.hotspots);
  }

  renderDebugGrid() {
    const g = this.debugGridGraphics;
    g.clear();
    g.lineStyle(1, 0x94a3b8, 0.35);

    for (let c = 0; c < this.isoGrid.columns; c++) {
      for (let r = 0; r < this.isoGrid.rows; r++) {
        const v = this.isoGrid.getCellVertices(c, r);
        g.strokePoints([v.top, v.right, v.bottom, v.left, v.top]);
      }
    }
  }

  renderDebugCollisions() {
    const g = this.debugCollisionGraphics;
    g.clear();

    for (let c = 0; c < this.collisionGrid.columns; c++) {
      for (let r = 0; r < this.collisionGrid.rows; r++) {
        const val = this.collisionGrid.getCell(c, r);
        if (val === CellType.BLOCKED) {
          TileRenderer.drawFloorTile(g, c, r, STUDIO_PALETTE.BLOCKED_DEBUG, 0.45, 0xff0000, 1.5);
        } else if (val === CellType.RESERVED) {
          TileRenderer.drawFloorTile(g, c, r, STUDIO_PALETTE.RESERVED_DEBUG, 0.55, 0xbf5af2, 2);
        } else if (val === CellType.SLOW_SPECIAL) {
          TileRenderer.drawFloorTile(g, c, r, 0xff9500, 0.4);
        }
      }
    }
  }

  renderDebugHotspots() {
    const g = this.debugHotspotsGraphics;
    g.clear();

    hotspotsData.hotspots.forEach((h) => {
      if (h.shape.type === 'circle') {
        const [cx, cy] = h.shape.center;
        g.fillStyle(0x00ffff, 0.25);
        g.fillCircle(cx, cy, h.shape.radius);
        g.lineStyle(2, 0x00ffff, 0.85);
        g.strokeCircle(cx, cy, h.shape.radius);
      } else if (h.shape.type === 'polygon') {
        g.fillStyle(0xffd60a, 0.22);
        g.lineStyle(2, 0xffd60a, 0.85);
        g.beginPath();
        h.shape.points.forEach(([px, py], i) => {
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        });
        g.closePath();
        g.fill();
        g.strokePath();
      }
    });
  }

  createTestActor() {
    this.testMarkerGraphics = this.add.graphics();
    this.updateTestMarkerVisual();
  }

  updateTestMarkerVisual() {
    const g = this.testMarkerGraphics;
    g.clear();

    // Draw base shadow
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(this.testActor.x, this.testActor.y, 28, 14);

    // Draw cyan waypoint beacon
    g.fillStyle(STUDIO_PALETTE.CYAN_ACCENT, 0.9);
    g.fillCircle(this.testActor.x, this.testActor.y - 18, 9);
    g.lineStyle(2, 0xffffff, 1);
    g.strokeCircle(this.testActor.x, this.testActor.y - 18, 9);

    // Light beam
    g.lineStyle(1.5, STUDIO_PALETTE.CYAN_ACCENT, 0.7);
    g.lineBetween(this.testActor.x, this.testActor.y - 18, this.testActor.x, this.testActor.y);
  }

  setupInteractionAndControls() {
    // Pointer click to move test marker (Pathfinding A* test)
    this.input.on('pointerdown', (pointer) => {
      // Convert screen click into world tile
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const clickedCell = this.isoGrid.screenToCell(worldPoint.x, worldPoint.y);

      if (this.isoGrid.isValidCell(clickedCell.col, clickedCell.row)) {
        this.moveActorTo(clickedCell.col, clickedCell.row);
      }
    });

    // Keyboard controls for debug & camera modes
    this.input.keyboard.on('keydown-G', () => this.toggleDebug('grid'));
    this.input.keyboard.on('keydown-C', () => this.toggleDebug('collision'));
    this.input.keyboard.on('keydown-H', () => this.toggleDebug('hotspots'));
    this.input.keyboard.on('keydown-ONE', () => this.cameraDirector.setOverview());
    this.input.keyboard.on('keydown-TWO', () => this.cameraDirector.setFocus(936, 600)); // Focus workstation
    this.input.keyboard.on('keydown-THREE', () => this.cameraDirector.setFollow(this.testActor));
  }

  toggleDebug(layer) {
    if (layer in this.debugFlags) {
      this.debugFlags[layer] = !this.debugFlags[layer];
      if (layer === 'grid') this.debugGridGraphics.setVisible(this.debugFlags.grid);
      if (layer === 'collision') this.debugCollisionGraphics.setVisible(this.debugFlags.collision);
      if (layer === 'hotspots') this.debugHotspotsGraphics.setVisible(this.debugFlags.hotspots);
    }
  }

  moveActorTo(targetCol, targetRow) {
    const path = this.pathFinder.findPath(
      this.testActor.col,
      this.testActor.row,
      targetCol,
      targetRow,
      { allowStartOnReserved: true, allowTargetOnReserved: false }
    );

    if (path && path.length > 0) {
      this.testActor.path = path.map((step) => {
        const center = this.isoGrid.getCellCenter(step.col, step.row);
        return { col: step.col, row: step.row, x: center.x, y: center.y, dir: step.dir };
      });
    }
  }

  update(time, delta) {
    const dt = delta / 1000;

    // Advance test actor along path if active
    if (this.testActor.path && this.testActor.path.length > 0) {
      const targetWaypoint = this.testActor.path[0];
      const dx = targetWaypoint.x - this.testActor.x;
      const dy = targetWaypoint.y - this.testActor.y;
      const dist = Math.hypot(dx, dy);

      const step = this.testActor.speedPxPerSec * dt;

      if (dist <= step) {
        this.testActor.x = targetWaypoint.x;
        this.testActor.y = targetWaypoint.y;
        this.testActor.col = targetWaypoint.col;
        this.testActor.row = targetWaypoint.row;
        this.testActor.path.shift();
      } else {
        this.testActor.x += (dx / dist) * step;
        this.testActor.y += (dy / dist) * step;
      }

      this.updateTestMarkerVisual();
    }

    this.cameraDirector.update(time, delta);
  }
}
