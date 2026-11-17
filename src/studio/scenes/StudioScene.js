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

    // Sleek progress bar for network asset streaming
    const camW = this.cameras.main?.width || 1600;
    const camH = this.cameras.main?.height || 1000;
    const progressBox = this.add.graphics();
    const progressBar = this.add.graphics();
    progressBox.fillStyle(0x1a2332, 0.85);
    progressBox.fillRoundedRect(camW / 2 - 140, camH / 2 - 12, 280, 24, 6);

    this.load.on('progress', (val) => {
      progressBar.clear();
      progressBar.fillStyle(0xff454d, 1);
      progressBar.fillRoundedRect(camW / 2 - 136, camH / 2 - 8, 272 * val, 16, 4);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
    });

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
          this.spawnFloatingHearts(172, 448);
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
          this.spawnFloatingHearts(172, 448);
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
        const prev = this.currentHoveredHotspot;
        this.currentHoveredHotspot = hotspot;
        if (!hotspot && this.hoverHighlight) {
          this.hoverHighlight.clear();
        }

        // Cat hover reactions
        if (hotspot?.id === 'OBJ_ROBOCAT') {
          this.isCatSleeping = false;
          if (this.catWakeTimer) {
            this.catWakeTimer.remove();
            this.catWakeTimer = null;
          }
        } else if (prev?.id === 'OBJ_ROBOCAT' && !hotspot) {
          this.catWakeTimer = this.time.delayedCall(3000, () => {
            this.isCatSleeping = true;
          });
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
        // Living Diorama keeps duplicate sprites hidden
        if (this.roomBg) {
          this.avatar?.container?.setVisible(false);
          this.roboCat?.container?.setVisible(false);
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
    this.createLivingDioramaVfx();
    this.createDebugLayers();
    this.setupInteractionAndControls();
    this.setupVisibilityListeners();

    // Set initial overview camera
    this.cameraDirector.setOverview(true);

    // Deep link query parameters (?modal=...)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const targetModal = params.get('modal');
      if (targetModal) {
        this.time.delayedCall(450, () => {
          this.contentPanel?.open(targetModal);
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

      // Click outside hotspots resets overview camera if zoomed
      if (this.cameraDirector) {
        this.cameraDirector.setOverview();
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
      { x: 860, y: 440 },
      { x: 1160, y: 490 },
      { x: 1110, y: 550 },
      { x: 820, y: 510 },
    ], true);

    // Warm monitor screen highlight
    g.fillStyle(0x38bdf8, monitorPulse * 0.6);
    g.fillPoints([
      { x: 890, y: 450 },
      { x: 1140, y: 490 },
      { x: 1090, y: 535 },
      { x: 850, y: 505 },
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
    g.fillEllipse(172, 452, 68, 32);
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
    else if (h.id === 'OBJ_GAMEPAD') color = 0x00e5ff;
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

  createLivingDioramaVfx() {
    this.isCatSleeping = true;
    this.catWakeTimer = null;

    // 1. Live Code Monitor (Left Screen: x ~ 888, y ~ 330, tilt ~ 13.6 deg)
    this.codeScreenContainer = this.add.container(888, 332);
    this.codeScreenContainer.setDepth(1830);
    this.codeScreenContainer.setRotation(0.237); // ~13.6 deg isometric tilt

    // Clip mask for monitor screen parallelogram
    try {
      const maskShape = this.make.graphics();
      maskShape.fillStyle(0xffffff);
      maskShape.beginPath();
      maskShape.moveTo(883, 319);
      maskShape.lineTo(1015, 349);
      maskShape.lineTo(1015, 452);
      maskShape.lineTo(883, 422);
      maskShape.closePath();
      maskShape.fillPath();
      const monitorMask = maskShape.createGeometryMask();
      this.codeScreenContainer.setMask(monitorMask);
    } catch {
      // Fallback if geometry mask unavailable
    }

    // Code Lines Repository
    this.codeSnippets = [
      { text: "import { Engine } from 'studio';", color: '#38bdf8' },
      { text: "const oleg = new Developer({", color: '#00e5ff' },
      { text: "  name: 'Oleg Prokofev',", color: '#4ade80' },
      { text: "  stack: ['React', 'TS', 'UE5'],", color: '#facc15' },
      { text: "  focus: 'High-Scale Systems',", color: '#4ade80' },
      { text: "  status: 'Living Diorama 60FPS',", color: '#38bdf8' },
      { text: "});", color: '#00e5ff' },
      { text: "async function compile() {", color: '#facc15' },
      { text: "  await oleg.buildProjects();", color: '#38bdf8' },
      { text: "  return oleg.isReadyForHire;", color: '#4ade80' },
      { text: "}", color: '#facc15' },
      { text: "console.log('Studio Online!');", color: '#38bdf8' },
      { text: "export default oleg.start();", color: '#00e5ff' },
    ];
    this.codeSnippetIndex = 0;
    this.codeLineObjects = [];

    // Initialize 6 visible code lines
    for (let i = 0; i < 7; i++) {
      const item = this.codeSnippets[i % this.codeSnippets.length];
      const lineText = this.add.text(0, i * 11.5, item.text, {
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: '8.5px',
        color: item.color,
      });
      this.codeLineObjects.push(lineText);
      this.codeScreenContainer.add(lineText);
    }
    this.codeSnippetIndex = 7;

    // Blinking Cursor
    this.codeCursor = this.add.text(0, 72, '▎', {
      fontFamily: 'monospace',
      fontSize: '8.5px',
      color: '#00f0ff',
    });
    this.codeScreenContainer.add(this.codeCursor);

    // Typing & Scrolling Timer
    this.codeScrollTimer = this.time.addEvent({
      delay: 1800,
      callback: () => this.scrollCodeScreen(),
      loop: true,
    });

    // 2. Right Monitor Equalizer & Sci-Fi Dashboard
    this.synthwaveGraphics = this.add.graphics();
    this.synthwaveGraphics.setDepth(1830);

    // 3. PC Tower Red LED Fan Pulse
    this.pcFansGraphics = this.add.graphics();
    this.pcFansGraphics.setDepth(1830);

    // 4. Coffee Steam Emitter
    this.coffeeSteamTimer = this.time.addEvent({
      delay: 700,
      callback: () => this.spawnCoffeeSteam(),
      loop: true,
    });

    // 5. Robo-Cat Sleeping Zzz Emitter
    this.catSleepTimer = this.time.addEvent({
      delay: 1200,
      callback: () => this.spawnCatSleepZzz(),
      loop: true,
    });
  }

  scrollCodeScreen() {
    if (!this.codeLineObjects || this.codeLineObjects.length === 0) return;

    const nextSnippet = this.codeSnippets[this.codeSnippetIndex % this.codeSnippets.length];
    this.codeSnippetIndex++;

    // Shift line texts up
    for (let i = 0; i < this.codeLineObjects.length - 1; i++) {
      this.codeLineObjects[i].setText(this.codeLineObjects[i + 1].text);
      this.codeLineObjects[i].setColor(this.codeLineObjects[i + 1].style.color);
    }

    // Set newest line at bottom
    const lastLine = this.codeLineObjects[this.codeLineObjects.length - 1];
    lastLine.setText(nextSnippet.text);
    lastLine.setColor(nextSnippet.color);

    // Update cursor position to end of bottom line
    const textWidth = lastLine.width;
    this.codeCursor.setPosition(textWidth + 2, (this.codeLineObjects.length - 1) * 11.5);
  }

  spawnCatSleepZzz() {
    if (!this.isCatSleeping || !this.add) return;
    const glyphs = ['z', 'Z', 'zzz'];
    const glyph = glyphs[Phaser.Math.Between(0, glyphs.length - 1)];

    const startX = 172 + Phaser.Math.Between(-8, 8);
    const startY = 418;

    const zText = this.add.text(startX, startY, glyph, {
      fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
      fontSize: '13px',
      fontWeight: '700',
      color: '#38bdf8',
    });
    zText.setOrigin(0.5);
    zText.setDepth(1850);
    zText.setAlpha(0.85);

    this.tweens.add({
      targets: zText,
      y: startY - 70 - Phaser.Math.Between(0, 20),
      x: startX + Phaser.Math.Between(-16, 16),
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 2200,
      ease: 'Sine.easeOut',
      onComplete: () => {
        zText.destroy();
      },
    });
  }

  spawnCoffeeSteam() {
    if (!this.add) return;
    const startX = 914 + Phaser.Math.Between(-2, 2);
    const startY = 500;

    const steam = this.add.graphics();
    steam.setDepth(1840);
    steam.fillStyle(0xffffff, 0.22);
    steam.fillCircle(0, 0, Phaser.Math.Between(2, 4));
    steam.setPosition(startX, startY);

    this.tweens.add({
      targets: steam,
      y: startY - 32 - Phaser.Math.Between(0, 15),
      x: startX + Phaser.Math.Between(-8, 8),
      alpha: 0,
      scaleX: 2.2,
      scaleY: 2.2,
      duration: 1600,
      ease: 'Sine.easeOut',
      onComplete: () => {
        steam.destroy();
      },
    });
  }

  updateLivingDioramaVfx(time, delta) {
    const effTime = time;

    // 1. Cursor blink on code monitor
    if (this.codeCursor) {
      this.codeCursor.setAlpha(Math.sin(effTime * 0.008) > 0 ? 1 : 0);
    }

    // 2. Right Monitor Sci-Fi Equalizer Waveform
    if (this.synthwaveGraphics) {
      const g = this.synthwaveGraphics;
      g.clear();

      // Equalizer bars along horizon (x: 1040..1150, y ~ 410..425)
      const barCount = 12;
      for (let i = 0; i < barCount; i++) {
        const bx = 1045 + i * 9;
        const by = 412 + (bx - 1045) * 0.21;
        const h = Math.abs(Math.sin(effTime * 0.005 + i * 0.6)) * 14 + 3;
        const color = i % 2 === 0 ? 0x00f0ff : 0xec4899;
        g.fillStyle(color, 0.75);
        g.fillRect(bx, by - h, 4, h);
      }
    }

    // 3. PC Tower Red LED Fans Glow
    if (this.pcFansGraphics) {
      const g = this.pcFansGraphics;
      g.clear();
      const pulse = Math.sin(effTime * 0.005) * 0.25 + 0.75;
      g.lineStyle(2, 0xff2d37, 0.8 * pulse);
      // Fan 1
      g.strokeCircle(750, 355, 12);
      g.fillStyle(0xff454d, 0.2 * pulse);
      g.fillCircle(750, 355, 12);
      // Fan 2
      g.strokeCircle(750, 402, 12);
      g.fillStyle(0xff454d, 0.2 * pulse);
      g.fillCircle(750, 402, 12);
    }
  }

  update(time, delta) {
    this.avatar?.update(time, delta);
    this.roboCat?.update(time, delta);
    this.cameraDirector?.update(time, delta);
    this.renderAmbientVfx(time);
    this.updateLivingDioramaVfx(time, delta);
    this.renderHoverHighlight(time);
  }
}
