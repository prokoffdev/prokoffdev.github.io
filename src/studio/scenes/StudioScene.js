import Phaser from 'phaser';
import { IsoGrid } from '../core/IsoGrid.js';
import { TileRenderer, STUDIO_PALETTE } from '../core/TileRenderer.js';
import { CollisionGrid, CellType } from '../navigation/CollisionGrid.js';
import { PathFinder } from '../navigation/PathFinder.js';
import { CameraDirector } from '../camera/CameraDirector.js';
import { HotspotManager } from '../interactions/HotspotManager.js';
import { InteractionRouter, InteractionMode } from '../interactions/InteractionRouter.js';
import { ContentPanel } from '../ui/ContentPanel.js';
import { StudioHud } from '../ui/StudioHud.js';
import { Avatar } from '../entities/Avatar.js';
import { RoboCat } from '../entities/RoboCat.js';
import { CompanionController } from '../entities/CompanionController.js';
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
    this.hotspotManager = null;
    this.interactionRouter = null;
    this.contentPanel = null;
    this.studioHud = null;

    // Entities
    this.avatar = null;
    this.roboCat = null;
    this.companionController = null;

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
  }

  get testActor() {
    return {
      col: this.avatar?.currentCol ?? 14,
      row: this.avatar?.currentRow ?? 6,
      x: this.avatar?.container?.x ?? 936,
      y: this.avatar?.container?.y ?? 690,
    };
  }

  preload() {
    const base = import.meta.env.BASE_URL || '/';
    const spr = (file) => `${base.replace(/\/$/, '')}/assets/sprites/${file}`;

    // Master High-Fidelity 2.5D Room Environment
    this.load.image('room_environment', spr('room_clean_base.png'));

    // Dynamic Walk & Interaction Sprites (CHR-001)
    this.load.image('human_idle', spr('human_idle.png'));
    this.load.image('human_walk', spr('human_walk.png'));
    this.load.image('human_greeting', spr('human_greeting.png'));
    this.load.image('human_typing', spr('human_typing.png'));
    this.load.image('human_thinking', spr('human_thinking.png'));

    // Companion Sprites (PET-001)
    this.load.image('cat_idle', spr('cat_idle.png'));
    this.load.image('cat_sleep', spr('cat_sleep.png'));
    this.load.image('cat_walk', spr('cat_walk.png'));
    this.load.image('cat_react', spr('cat_react.png'));
  }

  create() {
    const mountContainer = this.game.canvas.parentElement;

    // 1. Core Systems
    this.isoGrid = new IsoGrid();
    this.collisionGrid = new CollisionGrid(collisionMapData);
    this.pathFinder = new PathFinder(this.collisionGrid, this.isoGrid);
    this.cameraDirector = new CameraDirector(this.cameras.main, {
      overviewZoom: 0.93,
      roomCenter: { x: 800, y: 520 },
    });

    // 2. Entities
    this.avatar = new Avatar(this, this.isoGrid, this.pathFinder, 14, 6);
    this.roboCat = new RoboCat(this, this.isoGrid, this.pathFinder, 18, 9);

    if (this.textures && this.textures.exists('room_environment')) {
      this.avatar.container?.setVisible(false);
      this.roboCat.container?.setVisible(false);
    }

    // 3. UI & Interaction Modules
    this.contentPanel = new ContentPanel(mountContainer, {
      onOpen: (contentKey) => {
        this.companionController?.onModalOpened();
        if (contentKey === 'assistant-help') {
          this.roboCat?.assist();
        }
      },
      onClose: () => {
        this.companionController?.onModalClosed();
        this.cameraDirector.setOverview();
      },
      onNavigate: (targetKey) => {
        const hotspot = this.hotspotManager?.getHotspotByContentKey(targetKey);
        if (hotspot) {
          const pt = this.interactionRouter.getHotspotCenterPoint(hotspot);
          this.cameraDirector.setFocus(pt.x, pt.y);
          this.companionController?.guideToHotspot(hotspot.id);
        }
      },
      onAction: (action) => {
        if (action === 'toggle-follow') {
          return this.companionController?.toggleFollow();
        }
        if (action === 'purr') {
          this.roboCat?.react();
          this.spawnFloatingHearts(1060, 770);
        }
      },
    });

    this.hoverHighlight = this.add.graphics();
    this.hoverHighlight.setDepth(1800);
    this.currentHoveredHotspot = null;

    this.hotspotManager = new HotspotManager(this, {
      onSelect: (hotspot) => {
        this.triggerClickRipple(hotspot);
        if (hotspot.id === 'OBJ_ROBOCAT') {
          this.roboCat?.react();
          this.spawnFloatingHearts(1060, 770);
        }
        if (hotspot.id === 'OBJ_AVATAR') {
          this.avatar?.greet();
          this.studioHud?.openGreetingCard();
        }
        this.interactionRouter.handleHotspotSelected(hotspot, {
          col: Math.round(this.avatar.currentCol),
          row: Math.round(this.avatar.currentRow),
        });
      },
      onHover: (hotspot) => {
        this.currentHoveredHotspot = hotspot;
        if (!hotspot && this.hoverHighlight) {
          this.hoverHighlight.clear();
        }
      },
    });

    this.companionController = new CompanionController(this.roboCat, this.avatar, this.hotspotManager);

    this.interactionRouter = new InteractionRouter({
      isoGrid: this.isoGrid,
      cameraDirector: this.cameraDirector,
      contentPanel: this.contentPanel,
      hotspotManager: this.hotspotManager,
      onMoveTo: (targetCol, targetRow, onArrival) => {
        this.avatar.moveTo(targetCol, targetRow, onArrival);
      },
    });

    this.studioHud = new StudioHud(mountContainer, {
      onModeChange: (newMode) => {
        this.interactionRouter.setMode(newMode);
        if (newMode === InteractionMode.EXPLORE) {
          if (this.roomBg) {
            this.avatar.container?.setVisible(true);
            this.roboCat.container?.setVisible(true);
            if (this.avatar.currentCol === 14 && this.avatar.currentRow === 6) {
              this.avatar.currentCol = 12;
              this.avatar.currentRow = 7;
              this.avatar.updatePosition();
            }
            if (this.roboCat.currentCol === 18 && this.roboCat.currentRow === 9) {
              this.roboCat.currentCol = 12;
              this.roboCat.currentRow = 8;
              this.roboCat.updatePosition();
            }
          }
          if (this.avatar.fsm.is('typing') || this.avatar.fsm.is('thinking')) {
            this.avatar.fsm.dispatch('USER_START_MOVE');
            this.avatar.fsm.forceState('idle');
          }
        } else {
          if (this.roomBg) {
            this.avatar.container?.setVisible(false);
            this.roboCat.container?.setVisible(false);
          }
        }
      },
      onOpenPanel: (contentKey) => {
        this.contentPanel?.open(contentKey);
      },
    });

    // 4. Rendering Layers
    this.createFloorAndWalls();
    this.createFurniture();
    this.createAmbientVfx();
    this.createDebugLayers();
    this.setupInteractionAndControls();
    this.setupVisibilityListeners();

    // Set initial overview camera
    this.cameraDirector.setOverview(true);

    // Deep link query parameters (?modal=... & ?mode=...)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const targetModal = params.get('modal');
      if (targetModal) {
        this.time.delayedCall(450, () => {
          this.contentPanel?.open(targetModal);
        });
      }
      const initialMode = params.get('mode');
      if (initialMode === 'explore') {
        this.time.delayedCall(300, () => {
          this.studioHud?.setMode(InteractionMode.EXPLORE);
          this.interactionRouter?.setMode(InteractionMode.EXPLORE);
          if (this.roomBg) {
            this.avatar.container?.setVisible(true);
            this.roboCat.container?.setVisible(true);
            this.avatar.currentCol = 12;
            this.avatar.currentRow = 7;
            this.avatar.updatePosition();
          }
          this.avatar.moveTo(8, 7);
        });
      }
    }
  }

  createFloorAndWalls() {
    const bg = this.add.graphics();
    bg.fillStyle(STUDIO_PALETTE.BACKDROP, 1);
    bg.fillRect(0, 0, 1600, 1000);

    if (this.textures && this.textures.exists('room_environment')) {
      this.roomBg = this.add.image(800, 500, 'room_environment');
      this.roomBg.setDisplaySize(1600, 900);
      this.roomBg.setDepth(10);
      return;
    }

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

  createFurniture() {
    if (this.roomBg) {
      return;
    }

    this.propsGraphics = this.add.graphics();
    const g = this.propsGraphics;

    // Workstation Desk (FUR-001) base
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

    // Chair (FUR-002)
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

    // Cat Charging Station Cushion (FUR-008)
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

    // Check if raster textures are loaded
    const hasRaster = Boolean(this.textures && this.textures.exists('prop_bed'));

    if (hasRaster) {
      this.createRasterProps();
    } else {
      this.createFurnitureGreyboxFallback(g);
    }
  }

  createRasterProps() {
    // Wall B Window Skyline
    if (this.textures.exists('prop_window')) {
      const win = this.add.image(350, 310, 'prop_window');
      win.setOrigin(0.5, 0.5);
      win.setScale(1.15);
      win.setDepth(85);
    }

    // Wall Corner Red Neon Symbol
    if (this.textures.exists('prop_neon_code')) {
      const neon = this.add.image(680, 220, 'prop_neon_code');
      neon.setOrigin(0.5, 0.5);
      neon.setScale(1.25);
      neon.setDepth(90);
    }

    // Wall B Shelf with Books & Hanging Ivy
    if (this.textures.exists('prop_shelf')) {
      const shelf = this.add.image(350, 370, 'prop_shelf');
      shelf.setOrigin(0.5, 0.5);
      shelf.setScale(1.15);
      shelf.setDepth(110);
    }

    // Wall A Pinboard with Sticky Notes & Roadmap
    if (this.textures.exists('prop_pinboard')) {
      const pin = this.add.image(1240, 470, 'prop_pinboard');
      pin.setOrigin(0.5, 0.5);
      pin.setScale(1.15);
      pin.setDepth(110);
    }

    // Dual Monitors on Workstation Desk
    if (this.textures.exists('prop_monitors')) {
      const mon = this.add.image(1075, 470, 'prop_monitors');
      mon.setOrigin(0.5, 0.6);
      mon.setScale(1.15);
      mon.setDepth(1720);
    }

    // Gaming PC Tower with Red RGB Fans & Plant
    if (this.textures.exists('prop_pc_tower')) {
      const pc = this.add.image(880, 500, 'prop_pc_tower');
      pc.setOrigin(0.5, 0.7);
      pc.setScale(1.05);
      pc.setDepth(1220);
    }

    // Bed with Pillow & Red Blanket
    if (this.textures.exists('prop_bed')) {
      const bed = this.add.image(540, 640, 'prop_bed');
      bed.setOrigin(0.5, 0.55);
      bed.setScale(1.12);
      bed.setDepth(1420);
    }

    // Bedside Nightstand with Glowing Lamp
    if (this.textures.exists('prop_nightstand')) {
      const ns = this.add.image(420, 570, 'prop_nightstand');
      ns.setOrigin(0.5, 0.6);
      ns.setScale(1.05);
      ns.setDepth(1320);
    }

    // Coffee Table with Game Controller
    if (this.textures.exists('prop_table')) {
      const table = this.add.image(740, 680, 'prop_table');
      table.setOrigin(0.5, 0.55);
      table.setScale(1.05);
      table.setDepth(1820);
    }

    // Potted Floor Plant
    if (this.textures.exists('prop_plant')) {
      const plant = this.add.image(1310, 690, 'prop_plant');
      plant.setOrigin(0.5, 0.8);
      plant.setScale(1.05);
      plant.setDepth(2420);
    }
  }

  createFurnitureGreyboxFallback(g) {
    // Monitors (PROP-001)
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

    // PC Tower (PROP-002)
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

    // Bed (FUR-003)
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

    // Nightstand (FUR-004)
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

    // Wall Bookshelf (FUR-005)
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

    // Project Pinboard (PROP-009)
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

  setupInteractionAndControls() {
    // Keyboard WASD and Arrow keys for Explore Mode
    const cursors = this.input.keyboard.createCursorKeys();
    const keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    const keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    const keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    const keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    const handleDirectionalStep = (dc, dr) => {
      if (this.contentPanel?.isOpen) return;
      if (this.interactionRouter?.getMode() !== InteractionMode.EXPLORE) return;
      if (!this.avatar || this.avatar.isMoving) return;

      const targetCol = Math.round(this.avatar.currentCol) + dc;
      const targetRow = Math.round(this.avatar.currentRow) + dr;

      if (this.collisionGrid.isWalkable(targetCol, targetRow, { allowReserved: false })) {
        this.avatar.moveTo(targetCol, targetRow);
      }
    };

    keyW.on('down', () => handleDirectionalStep(-1, 0)); // iso_nw
    keyS.on('down', () => handleDirectionalStep(1, 0));  // iso_se
    keyA.on('down', () => handleDirectionalStep(0, 1));  // iso_sw
    keyD.on('down', () => handleDirectionalStep(0, -1)); // iso_ne
    cursors.up.on('down', () => handleDirectionalStep(-1, 0));
    cursors.down.on('down', () => handleDirectionalStep(1, 0));
    cursors.left.on('down', () => handleDirectionalStep(0, 1));
    cursors.right.on('down', () => handleDirectionalStep(0, -1));

    // Pointer move: hover feedback and tooltip
    this.input.on('pointermove', (pointer) => {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.hotspotManager?.handlePointerMove(worldPoint.x, worldPoint.y, pointer.x, pointer.y);
    });

    // Pointer click: hotspot interaction or pathfind
    this.input.on('pointerdown', (pointer) => {
      // Do not process canvas click if modal panel is open
      if (this.contentPanel?.isOpen) return;

      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

      // Check if clicking a hotspot
      const hit = this.hotspotManager?.handlePointerDown(worldPoint.x, worldPoint.y);
      if (hit) return;

      // In Explore Mode: click on floor walks avatar
      if (this.interactionRouter?.getMode() === InteractionMode.EXPLORE && this.avatar) {
        const clickedCell = this.isoGrid.screenToCell(worldPoint.x, worldPoint.y);
        if (this.isoGrid.isValidCell(clickedCell.col, clickedCell.row)) {
          this.avatar.moveTo(clickedCell.col, clickedCell.row);
        }
      }
    });

    // Keydown 'E': interact with nearest hotspot in explore mode
    this.input.keyboard.on('keydown-E', () => {
      if (this.contentPanel?.isOpen || !this.avatar) return;
      const nearest = this.interactionRouter?.findNearestInteractiveHotspot(
        Math.round(this.avatar.currentCol),
        Math.round(this.avatar.currentRow)
      );
      if (nearest) {
        this.avatar.interact(() => {
          this.interactionRouter.triggerInteraction(nearest);
        });
      }
    });

    // Keydown 'ESC': close modal panel
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.contentPanel?.isOpen) {
        this.contentPanel.close();
      }
    });

    // Keyboard debug & camera toggles
    this.input.keyboard.on('keydown-G', () => this.toggleDebug('grid'));
    this.input.keyboard.on('keydown-C', () => this.toggleDebug('collision'));
    this.input.keyboard.on('keydown-H', () => this.toggleDebug('hotspots'));
    this.input.keyboard.on('keydown-ONE', () => this.cameraDirector.setOverview());
    this.input.keyboard.on('keydown-TWO', () => this.cameraDirector.setFocus(936, 600));
    this.input.keyboard.on('keydown-THREE', () => {
      if (this.avatar?.container) {
        this.cameraDirector.setFollow(this.avatar.container);
      }
    });
  }

  toggleDebug(layer) {
    if (layer in this.debugFlags) {
      this.debugFlags[layer] = !this.debugFlags[layer];
      if (layer === 'grid') this.debugGridGraphics.setVisible(this.debugFlags.grid);
      if (layer === 'collision') this.debugCollisionGraphics.setVisible(this.debugFlags.collision);
      if (layer === 'hotspots') this.debugHotspotsGraphics.setVisible(this.debugFlags.hotspots);
    }
  }

  createAmbientVfx() {
    this.ambientVfxGraphics = this.add.graphics();
    this.ambientVfxGraphics.setDepth(2000);
  }

  setupVisibilityListeners() {
    if (this.game && this.game.events) {
      this.game.events.on(Phaser.Core.Events.BLUR, () => {
        this.scene.pause();
      });
      this.game.events.on(Phaser.Core.Events.FOCUS, () => {
        this.scene.resume();
      });
    }
  }

  renderAmbientVfx(time) {
    if (!this.ambientVfxGraphics) return;
    const g = this.ambientVfxGraphics;
    g.clear();

    const prefersReducedMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const effTime = prefersReducedMotion ? 0 : time;

    // 1. Dual Monitor Glow onto Workstation Keyboard & Desk
    const monitorPulse = Math.sin(effTime * 0.003) * 0.04 + 0.14;
    g.fillStyle(0x00f0ff, monitorPulse);
    g.fillPoints([
      { x: 1000, y: 390 },
      { x: 1190, y: 470 },
      { x: 1130, y: 550 },
      { x: 920, y: 450 },
    ], true);

    // Warm monitor screen highlight
    g.fillStyle(0x38bdf8, monitorPulse * 0.6);
    g.fillPoints([
      { x: 1040, y: 410 },
      { x: 1160, y: 465 },
      { x: 1100, y: 520 },
      { x: 970, y: 460 },
    ], true);

    // 2. Bedside Lamp Glow (warm amber/orange)
    const lampPulse = Math.sin(effTime * 0.002) * 0.02 + 0.15;
    g.fillStyle(0xffa500, lampPulse);
    g.fillEllipse(540, 520, 80, 40);
    g.fillStyle(0xffd700, lampPulse * 0.5);
    g.fillEllipse(540, 520, 44, 22);

    // 3. Cat Cushion Charging Station Aura (soft cyan)
    const catPulse = Math.sin(effTime * 0.004) * 0.03 + 0.12;
    g.fillStyle(0x00ffff, catPulse);
    g.fillEllipse(900, 810, 64, 30);
  }

  renderHoverHighlight(time) {
    if (!this.hoverHighlight) return;
    if (!this.currentHoveredHotspot) {
      this.hoverHighlight.clear();
      return;
    }

    const h = this.currentHoveredHotspot;
    const pulse = 0.6 + Math.sin(time * 0.007) * 0.35;

    let color = 0x00f0ff;
    if (h.id === 'OBJ_AVATAR') color = 0xff454d;
    else if (h.id === 'OBJ_ROBOCAT') color = 0x00f0ff;
    else if (h.id === 'OBJ_PINBOARD') color = 0xfbbf24;
    else if (h.id === 'OBJ_GAMEPAD') color = 0xa855f7;
    else if (h.id === 'OBJ_PHONE') color = 0x10b981;
    else if (h.id === 'OBJ_BOOKSHELF') color = 0x38bdf8;

    this.hoverHighlight.clear();
    this.hoverHighlight.lineStyle(3, color, pulse);
    this.hoverHighlight.fillStyle(color, 0.12 * pulse);

    if (h.shape.type === 'polygon' && h.shape.points) {
      this.hoverHighlight.beginPath();
      h.shape.points.forEach((pt, idx) => {
        if (idx === 0) this.hoverHighlight.moveTo(pt[0], pt[1]);
        else this.hoverHighlight.lineTo(pt[0], pt[1]);
      });
      this.hoverHighlight.closePath();
      this.hoverHighlight.fillPath();
      this.hoverHighlight.strokePath();
    } else if (h.shape.type === 'circle' && h.shape.center) {
      this.hoverHighlight.fillCircle(h.shape.center[0], h.shape.center[1], h.shape.radius);
      this.hoverHighlight.strokeCircle(h.shape.center[0], h.shape.center[1], h.shape.radius);
    }
  }

  triggerClickRipple(hotspot) {
    if (!this.add || !hotspot || !hotspot.shape) return;
    let cx = 800, cy = 500;
    if (hotspot.shape.type === 'circle' && hotspot.shape.center) {
      cx = hotspot.shape.center[0];
      cy = hotspot.shape.center[1];
    } else if (hotspot.shape.type === 'polygon' && hotspot.shape.points?.length > 0) {
      cx = hotspot.shape.points.reduce((acc, p) => acc + p[0], 0) / hotspot.shape.points.length;
      cy = hotspot.shape.points.reduce((acc, p) => acc + p[1], 0) / hotspot.shape.points.length;
    }

    const ripple = this.add.graphics();
    ripple.setDepth(1850);
    ripple.lineStyle(3, 0xff454d, 0.9);
    ripple.strokeCircle(0, 0, 16);
    ripple.setPosition(cx, cy);

    this.tweens.add({
      targets: ripple,
      scaleX: 2.8,
      scaleY: 2.8,
      alpha: 0,
      duration: 450,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        ripple.destroy();
      },
    });
  }

  spawnFloatingHearts(x, y) {
    if (!this.add) return;
    for (let i = 0; i < 4; i++) {
      const heartText = this.add.text(
        x + (Math.random() * 40 - 20),
        y + (Math.random() * 20 - 10),
        '❤️',
        { font: '22px sans-serif' }
      );
      heartText.setOrigin(0.5);
      heartText.setDepth(2100);
      heartText.setAlpha(1);

      this.tweens.add({
        targets: heartText,
        y: y - 65 - Math.random() * 35,
        x: heartText.x + (Math.random() * 30 - 15),
        alpha: 0,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 1000 + i * 200,
        ease: 'Cubic.easeOut',
        delay: i * 120,
        onComplete: () => heartText.destroy(),
      });
    }
  }

  moveActorTo(targetCol, targetRow, onArrival = null) {
    if (this.avatar) {
      this.avatar.moveTo(targetCol, targetRow, onArrival);
    }
  }

  update(time, delta) {
    this.avatar?.update(time, delta);
    this.roboCat?.update(time, delta);
    this.cameraDirector?.update(time, delta);
    this.renderAmbientVfx(time);
    this.renderHoverHighlight(time);
  }
}
