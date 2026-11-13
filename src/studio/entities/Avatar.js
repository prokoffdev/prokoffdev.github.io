import { StateMachine } from './StateMachine.js';
import characterStateMachineConfig from '../../data/studio/character_state_machine.json' with { type: 'json' };

/**
 * Avatar (CHR-001) - The human developer character.
 * Controls movement along A* waypoints, directional facing, animations,
 * and the formal Finite State Machine (typing, thinking, walk, idle, etc.).
 */
export class Avatar {
  /**
   * @param {Phaser.Scene} scene
   * @param {import('../core/IsoGrid.js').IsoGrid} isoGrid
   * @param {import('../navigation/PathFinder.js').PathFinder} pathFinder
   * @param {number} [startCol=14]
   * @param {number} [startRow=6]
   */
  constructor(scene, isoGrid, pathFinder, startCol = 14, startRow = 6) {
    this.scene = scene;
    this.isoGrid = isoGrid;
    this.pathFinder = pathFinder;

    this.currentCol = startCol;
    this.currentRow = startRow;
    this.currentDirection = 'desk_facing';

    this.config = characterStateMachineConfig.human;
    this.speedTilesPerSec = this.config.movement.speed_tiles_per_second || 2.7;

    this.path = [];
    this.targetTile = null;
    this.isMoving = false;
    this.onArrivalCallback = null;

    this.idleTimer = 0;
    this.idleTimeoutMs = 12000; // Switch typing -> thinking after 12s

    this.fsm = new StateMachine(
      this.config.default_state || 'typing',
      this.config.transitions,
      this.config.states
    );

    this.setupFSMListeners();

    if (scene && scene.add) {
      this.createGameObject();
    }
  }

  /**
   * Wires FSM event listeners for chained transitions and lifecycle events.
   */
  setupFSMListeners() {
    this.fsm.on('enter:walk', () => {
      this.isMoving = true;
    });

    this.fsm.on('enter:idle', () => {
      this.isMoving = false;
      this.idleTimer = 0;
    });

    this.fsm.on('enter:typing', () => {
      this.currentDirection = 'desk_facing';
      this.isMoving = false;
      this.idleTimer = 0;
    });
  }

  /**
   * Creates the visual container in Phaser.
   */
  createGameObject() {
    this.container = this.scene.add.container(0, 0);

    // Drop shadow at feet
    this.shadow = this.scene.add.graphics();
    this.shadow.fillStyle(0x05080c, 0.45);
    this.shadow.fillEllipse(0, 0, 40, 18);
    this.container.add(this.shadow);

    // Procedural stylized avatar graphics (matching concept art)
    this.visual = this.scene.add.graphics();
    this.container.add(this.visual);

    // Speech bubble container (for greetings)
    this.speechBubble = this.scene.add.container(0, -110);
    this.speechBubble.setVisible(false);
    this.container.add(this.speechBubble);

    this.updatePosition();
    this.renderVisual(0);
  }

  /**
   * Calculates screen coordinates from current tile coordinates.
   */
  updatePosition() {
    if (!this.container) return;
    const screenPos = this.isoGrid.getCellCenter(this.currentCol, this.currentRow);
    this.container.setPosition(screenPos.x, screenPos.y);

    // Depth sorting based on world Y (feet anchor)
    const baseSort = (this.currentCol + this.currentRow) * 100;
    // Bias avatar slightly in front of floor/rug, behind front obstacles
    this.container.setDepth(baseSort + 40);
  }

  /**
   * Directs the avatar to walk toward a target grid tile using A* pathfinding.
   *
   * @param {number} targetCol
   * @param {number} targetRow
   * @param {Function} [onArrival=null]
   * @returns {boolean} Whether a valid path was found and initiated
   */
  moveTo(targetCol, targetRow, onArrival = null) {
    const startTile = [Math.round(this.currentCol), Math.round(this.currentRow)];
    const generatedPath = this.pathFinder.findPath(startTile, [targetCol, targetRow]);

    if (!generatedPath || generatedPath.length === 0) {
      if (onArrival) onArrival();
      return false;
    }

    this.path = [...generatedPath];
    this.onArrivalCallback = onArrival;

    if (this.fsm.is('typing') || this.fsm.is('thinking')) {
      // Must stand up first
      this.fsm.dispatch('USER_START_MOVE');
      // Transition stand_up takes ~400ms then starts walk
      if (this.scene && this.scene.time) {
        this.scene.time.delayedCall(400, () => {
          if (this.fsm.is('stand_up')) {
            this.fsm.forceState('walk');
            this.isMoving = true;
          }
        });
      }
    } else {
      this.fsm.dispatch('USER_START_MOVE');
      this.fsm.forceState('walk');
      this.isMoving = true;
    }

    return true;
  }

  /**
   * Stops avatar movement immediately.
   */
  stop() {
    this.path = [];
    this.isMoving = false;
    this.fsm.dispatch('PATH_COMPLETE');
  }

  /**
   * Triggers object interaction gesture.
   * @param {Function} [onComplete=null]
   */
  interact(onComplete = null) {
    this.stop();
    this.fsm.dispatch('INTERACT_WITH_OBJECT');
    if (this.scene && this.scene.time) {
      this.scene.time.delayedCall(600, () => {
        this.fsm.dispatch('ANIMATION_COMPLETE');
        if (onComplete) onComplete();
      });
    } else {
      this.fsm.dispatch('ANIMATION_COMPLETE');
      if (onComplete) onComplete();
    }
  }

  /**
   * Triggers friendly wave greeting.
   */
  greet() {
    this.stop();
    this.fsm.forceState('greeting');
    if (this.scene && this.scene.time) {
      this.scene.time.delayedCall(1200, () => {
        this.fsm.forceState('idle');
      });
    }
  }

  /**
   * Returns avatar to workstation chair and sits down.
   */
  returnToDesk(onSeated = null) {
    this.moveTo(14, 6, () => {
      this.fsm.forceState('sit_down');
      if (this.scene && this.scene.time) {
        this.scene.time.delayedCall(500, () => {
          this.fsm.forceState('typing');
          if (onSeated) onSeated();
        });
      } else {
        this.fsm.forceState('typing');
        if (onSeated) onSeated();
      }
    });
  }

  /**
   * Updates avatar state, movement, and procedural animation.
   * @param {number} time
   * @param {number} delta - Delta time in ms
   */
  update(time, delta) {
    const dtSeconds = delta / 1000;

    // Handle waypoint navigation
    if (this.isMoving && this.path.length > 0) {
      const nextTile = this.path[0];
      const targetCol = nextTile.col !== undefined ? nextTile.col : nextTile[0];
      const targetRow = nextTile.row !== undefined ? nextTile.row : nextTile[1];

      const diffCol = targetCol - this.currentCol;
      const diffRow = targetRow - this.currentRow;
      const dist = Math.hypot(diffCol, diffRow);

      const step = this.speedTilesPerSec * dtSeconds;

      this.updateDirection(diffCol, diffRow);

      if (dist <= step) {
        this.currentCol = targetCol;
        this.currentRow = targetRow;
        this.path.shift();

        if (this.path.length === 0) {
          this.isMoving = false;
          this.fsm.dispatch('PATH_COMPLETE');
          if (this.onArrivalCallback) {
            const cb = this.onArrivalCallback;
            this.onArrivalCallback = null;
            cb();
          }
        }
      } else {
        this.currentCol += (diffCol / dist) * step;
        this.currentRow += (diffRow / dist) * step;
      }
      this.updatePosition();
    } else if (this.fsm.is('typing')) {
      this.idleTimer += delta;
      if (this.idleTimer > this.idleTimeoutMs) {
        this.fsm.dispatch('IDLE_TIMEOUT');
      }
    } else if (this.fsm.is('thinking')) {
      this.idleTimer += delta;
      if (this.idleTimer > 18000) {
        this.fsm.dispatch('WORK_RESUME');
      }
    }

    this.renderVisual(time);
  }

  /**
   * Determines cardinal isometric direction from grid movement deltas.
   *
   * @param {number} dCol
   * @param {number} dRow
   */
  updateDirection(dCol, dRow) {
    if (dCol === 0 && dRow === 0) return;

    if (dCol > 0 && dRow === 0) { this.currentDirection = 'iso_se'; return; }
    if (dCol < 0 && dRow === 0) { this.currentDirection = 'iso_nw'; return; }
    if (dCol === 0 && dRow > 0) { this.currentDirection = 'iso_sw'; return; }
    if (dCol === 0 && dRow < 0) { this.currentDirection = 'iso_ne'; return; }

    const screenX = (dCol - dRow) * 32;
    const screenY = (dCol + dRow) * 16;
    const angle = Math.atan2(screenY, screenX);

    if (angle > 0 && angle <= Math.PI / 2) {
      this.currentDirection = 'iso_se';
    } else if (angle > Math.PI / 2 && angle <= Math.PI) {
      this.currentDirection = 'iso_sw';
    } else if (angle >= -Math.PI && angle <= -Math.PI / 2) {
      this.currentDirection = 'iso_nw';
    } else {
      this.currentDirection = 'iso_ne';
    }
  }

  /**
   * Renders the stylized character visuals corresponding to concept art specifications.
   * Colors: Graphite hoodie #282d37, Red accents #ff454d, Skin #fed7aa, Hair #49302e.
   *
   * @param {number} time
   */
  renderVisual(time) {
    if (!this.visual) return;
    const g = this.visual;
    g.clear();

    const state = this.fsm.currentState;
    const isDeskFacing = state === 'typing' || state === 'thinking' || state === 'sit_down';

    // Animation oscillations
    const breath = Math.sin(time * 0.003) * 1.5;
    const walkBob = this.isMoving ? Math.abs(Math.sin(time * 0.012)) * 4 : 0;
    const walkSwing = this.isMoving ? Math.sin(time * 0.012) * 5 : 0;
    const typingBob = state === 'typing' ? Math.sin(time * 0.02) * 1 : 0;

    const rootY = -walkBob;

    // Palette tokens (from ART-02 specification)
    const cSkin = 0xf5d0b5;
    const cHoodie = 0x242830;
    const cHoodieHighlight = 0x343a46;
    const cAccentRed = 0xff454d;
    const cPants = 0x1a1e24;
    const cShoes = 0x111317;
    const cHair = 0x49302e;
    const cGlasses = 0x111111;

    // If seated at desk
    if (isDeskFacing) {
      // Seated legs
      g.fillStyle(cPants);
      g.fillRoundedRect(-12, rootY - 30, 24, 20, 4);

      // Torso / Hoodie
      g.fillStyle(cHoodie);
      g.fillRoundedRect(-16, rootY - 62 + typingBob, 32, 34, 6);

      // Red zipper / accent
      g.lineStyle(2, cAccentRed, 0.9);
      g.lineBetween(0, rootY - 60 + typingBob, 0, rootY - 40 + typingBob);

      // Arms forward toward keyboard
      g.lineStyle(6, cHoodieHighlight, 1);
      if (state === 'thinking') {
        // One hand on keyboard, one to chin
        g.lineBetween(-10, rootY - 54, -4, rootY - 38);
        g.lineBetween(10, rootY - 54, 4, rootY - 66);
      } else {
        // Both hands typing
        g.lineBetween(-12, rootY - 54, -6, rootY - 36 + typingBob * 2);
        g.lineBetween(12, rootY - 54, 6, rootY - 36 - typingBob * 2);
      }

      // Head
      const headY = rootY - 76 + breath;
      g.fillStyle(cSkin);
      g.fillCircle(0, headY, 11);

      // Hair
      g.fillStyle(cHair);
      g.fillCircle(0, headY - 4, 12);
      g.fillRoundedRect(-11, headY - 14, 22, 10, 4);

      // Glasses
      g.lineStyle(1.5, cGlasses, 0.9);
      g.strokeRect(-8, headY - 2, 6, 5);
      g.strokeRect(2, headY - 2, 6, 5);
      g.lineBetween(-2, headY, 2, headY);

      return;
    }

    // Standing / Walking / Greeting / Idle
    // Directional orientation: mirror or offset details
    const isFacingLeft = this.currentDirection === 'iso_sw' || this.currentDirection === 'iso_nw';
    const dirSign = isFacingLeft ? -1 : 1;

    // Legs
    g.fillStyle(cPants);
    if (this.isMoving) {
      g.fillRoundedRect(-10, rootY - 36 - walkSwing, 8, 28, 3);
      g.fillRoundedRect(2, rootY - 36 + walkSwing, 8, 28, 3);

      // Shoes
      g.fillStyle(cShoes);
      g.fillRoundedRect(-12, rootY - 10 - walkSwing, 12, 10, 2);
      g.fillRoundedRect(0, rootY - 10 + walkSwing, 12, 10, 2);
      g.fillStyle(cAccentRed);
      g.fillRect(-6, rootY - 4 - walkSwing, 4, 2);
      g.fillRect(6, rootY - 4 + walkSwing, 4, 2);
    } else {
      g.fillRoundedRect(-10, rootY - 36, 8, 28, 3);
      g.fillRoundedRect(2, rootY - 36, 8, 28, 3);

      // Shoes
      g.fillStyle(cShoes);
      g.fillRoundedRect(-12, rootY - 10, 12, 10, 2);
      g.fillRoundedRect(0, rootY - 10, 12, 10, 2);
      g.fillStyle(cAccentRed);
      g.fillRect(-6, rootY - 4, 4, 2);
      g.fillRect(6, rootY - 4, 4, 2);
    }

    // Torso / Hoodie
    g.fillStyle(cHoodie);
    g.fillRoundedRect(-15, rootY - 70 + breath, 30, 36, 6);

    // Red hoodie accent string
    g.lineStyle(2, cAccentRed, 0.85);
    g.lineBetween(dirSign * 2, rootY - 68 + breath, dirSign * 2, rootY - 48 + breath);

    // Arms
    g.lineStyle(6, cHoodieHighlight, 1);
    if (state === 'greeting') {
      // One arm waving
      const wave = Math.sin(time * 0.015) * 8;
      g.lineBetween(-10, rootY - 64 + breath, -14, rootY - 42);
      g.lineBetween(10, rootY - 64 + breath, 18 + wave, rootY - 86);
      // Waving hand
      g.fillStyle(cSkin);
      g.fillCircle(18 + wave, rootY - 88, 4);
    } else if (state === 'interact') {
      // Arms reaching forward
      g.lineBetween(-10, rootY - 64 + breath, dirSign * 16, rootY - 56);
      g.lineBetween(10, rootY - 64 + breath, dirSign * 18, rootY - 52);
    } else if (this.isMoving) {
      // Arm swing during walk
      g.lineBetween(-12, rootY - 64 + breath, -14 - walkSwing * 1.2, rootY - 44);
      g.lineBetween(12, rootY - 64 + breath, 14 + walkSwing * 1.2, rootY - 44);
    } else {
      // Natural idle arms
      g.lineBetween(-12, rootY - 64 + breath, -14, rootY - 44 + breath * 0.5);
      g.lineBetween(12, rootY - 64 + breath, 14, rootY - 44 + breath * 0.5);
    }

    // Head
    const headY = rootY - 84 + breath;
    g.fillStyle(cSkin);
    g.fillCircle(0, headY, 11);

    // Hair
    g.fillStyle(cHair);
    g.fillCircle(0, headY - 4, 12);
    g.fillRoundedRect(-12, headY - 14, 24, 10, 4);

    // Glasses
    g.lineStyle(1.5, cGlasses, 0.9);
    g.strokeRect(-8 + dirSign * 2, headY - 2, 6, 5);
    g.strokeRect(2 + dirSign * 2, headY - 2, 6, 5);
    g.lineBetween(-2 + dirSign * 2, headY, 2 + dirSign * 2, headY);
  }

  /**
   * Destroys avatar game objects and cleans up listeners.
   */
  destroy() {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }
}
