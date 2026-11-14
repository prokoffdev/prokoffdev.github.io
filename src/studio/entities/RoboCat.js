import { StateMachine } from './StateMachine.js';
import characterStateMachineConfig from '../../data/studio/character_state_machine.json' with { type: 'json' };

/**
 * RoboCat (PET-001) - The robotic cat companion.
 * Exactly one companion instance in the room.
 * Implements FSM (sleep, idle, walk, assist, react, surprise),
 * smart following AI, holographic assist projection, and LED eye blinking.
 */
export class RoboCat {
  /**
   * @param {Phaser.Scene} scene
   * @param {import('../core/IsoGrid.js').IsoGrid} isoGrid
   * @param {import('../navigation/PathFinder.js').PathFinder} pathFinder
   * @param {number} [startCol=18]
   * @param {number} [startRow=9]
   */
  constructor(scene, isoGrid, pathFinder, startCol = 18, startRow = 9) {
    this.scene = scene;
    this.isoGrid = isoGrid;
    this.pathFinder = pathFinder;

    this.currentCol = startCol;
    this.currentRow = startRow;
    this.homeCol = startCol;
    this.homeRow = startRow;
    this.currentDirection = 'iso_sw';

    this.config = characterStateMachineConfig.robot_cat;
    this.behavior = this.config.behavior;

    this.isFollowing = false;
    this.path = [];
    this.speedTilesPerSec = 2.2;
    this.isMoving = false;
    this.repathTimer = 0;
    this.isPausedForModal = false;

    // Follow target reference (Avatar)
    this.targetActor = null;

    this.fsm = new StateMachine(
      'sleep',
      [
        { from: 'sleep', event: 'WAKE_UP', to: 'idle' },
        { from: 'idle', event: 'START_MOVE', to: 'walk' },
        { from: 'walk', event: 'PATH_COMPLETE', to: 'idle' },
        { from: 'idle', event: 'GO_TO_SLEEP', to: 'sleep' },
        { from: ['idle', 'walk', 'sleep'], event: 'ASSIST', to: 'assist' },
        { from: 'assist', event: 'ANIMATION_COMPLETE', to: 'idle' },
        { from: ['idle', 'sleep'], event: 'REACT', to: 'react' },
        { from: 'react', event: 'ANIMATION_COMPLETE', to: 'idle' },
        { from: ['idle', 'react'], event: 'SURPRISE', to: 'surprise' },
        { from: 'surprise', event: 'ANIMATION_COMPLETE', to: 'idle' },
      ],
      this.config.states
    );

    this.setupFSMListeners();

    if (scene && scene.add) {
      this.createGameObject();
    }
  }

  setupFSMListeners() {
    this.fsm.on('enter:walk', () => {
      this.isMoving = true;
    });

    this.fsm.on('enter:idle', () => {
      this.isMoving = false;
    });

    this.fsm.on('enter:sleep', () => {
      this.isMoving = false;
      this.path = [];
    });
  }

  createGameObject() {
    this.container = this.scene.add.container(0, 0);

    // Drop shadow beneath paws
    this.shadow = this.scene.add.graphics();
    this.shadow.fillStyle(0x05080c, 0.4);
    this.shadow.fillEllipse(0, 0, 42, 18);
    this.container.add(this.shadow);

    // Check if raster 2.5D sprite textures are loaded
    this.hasRasterTextures = Boolean(
      this.scene && this.scene.textures && this.scene.textures.exists('cat_idle')
    );

    if (this.hasRasterTextures) {
      // High-res 2.5D sprite with bottom-center anchor
      this.sprite = this.scene.add.sprite(0, 0, 'cat_sleep');
      this.sprite.setOrigin(0.5, 0.90);
      this.sprite.setScale(0.42);
      this.container.add(this.sprite);
    } else {
      // Procedural fallback graphics
      this.visual = this.scene.add.graphics();
      this.container.add(this.visual);
    }

    // Hologram projection container
    this.hologram = this.scene.add.graphics();
    this.hologram.setVisible(false);
    this.container.add(this.hologram);

    this.updatePosition();
    this.renderVisual(0);
  }

  updatePosition() {
    if (!this.container) return;
    const screenPos = this.isoGrid.getCellCenter(this.currentCol, this.currentRow);
    this.container.setPosition(screenPos.x, screenPos.y);

    // Depth sorting based on paws anchor
    const baseSort = (this.currentCol + this.currentRow) * 100;
    this.container.setDepth(baseSort + 35);
  }

  /**
   * Sets whether the robo-cat companion follows the human avatar.
   * @param {boolean} follow
   */
  setFollowing(follow) {
    this.isFollowing = follow;
    if (follow && this.fsm.is('sleep')) {
      this.wakeUp();
    }
  }

  /**
   * Binds the target actor (human avatar) for AI following.
   * @param {import('./Avatar.js').Avatar} actor
   */
  setTargetActor(actor) {
    this.targetActor = actor;
  }

  /**
   * Wakes robo-cat up from sleeping state.
   */
  wakeUp() {
    if (this.fsm.is('sleep')) {
      this.fsm.dispatch('WAKE_UP');
    }
  }

  /**
   * Sends robo-cat back to bed cushion.
   */
  returnToBed() {
    this.isFollowing = false;
    this.moveTo(this.homeCol, this.homeRow, () => {
      this.fsm.dispatch('GO_TO_SLEEP');
    });
  }

  /**
   * Triggers assist holographic presentation.
   *
   * @param {Function} [onComplete=null]
   */
  assist(onComplete = null) {
    this.wakeUp();
    this.stop();
    this.fsm.dispatch('ASSIST');
    if (this.hologram) this.hologram.setVisible(true);

    if (this.scene && this.scene.time) {
      this.scene.time.delayedCall(1600, () => {
        if (this.hologram) this.hologram.setVisible(false);
        this.fsm.dispatch('ANIMATION_COMPLETE');
        if (onComplete) onComplete();
      });
    } else {
      if (this.hologram) this.hologram.setVisible(false);
      this.fsm.dispatch('ANIMATION_COMPLETE');
      if (onComplete) onComplete();
    }
  }

  /**
   * Triggers cheerful reaction bounce.
   */
  react() {
    this.wakeUp();
    this.fsm.dispatch('REACT');
    if (this.scene && this.scene.time) {
      this.scene.time.delayedCall(800, () => {
        this.fsm.dispatch('ANIMATION_COMPLETE');
      });
    } else {
      this.fsm.dispatch('ANIMATION_COMPLETE');
    }
  }

  /**
   * Moves cat to a specific grid cell.
   *
   * @param {number} targetCol
   * @param {number} targetRow
   * @param {Function} [onArrival=null]
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
    this.fsm.dispatch('START_MOVE');
    this.isMoving = true;
    return true;
  }

  stop() {
    this.path = [];
    this.isMoving = false;
    if (this.fsm.is('walk')) {
      this.fsm.dispatch('PATH_COMPLETE');
    }
  }

  /**
   * Updates cat movement, follow AI, and animation.
   * @param {number} time
   * @param {number} delta
   */
  update(time, delta) {
    const dtSeconds = delta / 1000;

    // Follow AI logic
    if (this.isFollowing && this.targetActor && !this.isPausedForModal) {
      this.repathTimer += delta;
      if (this.repathTimer >= (this.behavior.repath_interval_ms || 300)) {
        this.repathTimer = 0;
        this.evaluateFollowBehavior();
      }
    }

    // Waypoint movement
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
    }

    this.renderVisual(time);
  }

  /**
   * Evaluates distance to human avatar and pathfinds to adjacent non-blocking cell.
   */
  evaluateFollowBehavior() {
    if (!this.targetActor) return;

    const [minDist, maxDist] = this.behavior.follow_distance_tiles || [1.5, 2.5];
    const dCol = this.targetActor.currentCol - this.currentCol;
    const dRow = this.targetActor.currentRow - this.currentRow;
    const currentDist = Math.hypot(dCol, dRow);

    if (currentDist > maxDist) {
      // Find a safe walkable cell adjacent to the player that does not block their path
      const playerCol = Math.round(this.targetActor.currentCol);
      const playerRow = Math.round(this.targetActor.currentRow);

      const candidates = [
        [playerCol + 1, playerRow],
        [playerCol - 1, playerRow],
        [playerCol, playerRow + 1],
        [playerCol, playerRow - 1],
        [playerCol + 1, playerRow + 1],
        [playerCol - 1, playerRow - 1],
      ];

      for (const [c, r] of candidates) {
        if (this.pathFinder.collisionGrid.isWalkable(c, r)) {
          // Avoid player's next waypoint
          if (this.targetActor.path && this.targetActor.path.length > 0) {
            const nextP = this.targetActor.path[0];
            const npCol = nextP.col !== undefined ? nextP.col : nextP[0];
            const npRow = nextP.row !== undefined ? nextP.row : nextP[1];
            if (npCol === c && npRow === r) continue;
          }
          this.moveTo(c, r);
          break;
        }
      }
    }
  }

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
   * Renders the stylized robotic cat visuals matching concept art.
   * Shell: White #f1f5f9, Joints: Slate #334155, Eyes/LED: Cyan #00f0ff, Visor: Dark #0f172a.
   *
   * @param {number} time
   */
  renderVisual(time) {
    const state = this.fsm.currentState;
    const isFacingLeft = this.currentDirection === 'iso_sw' || this.currentDirection === 'iso_nw';

    // If raster 2.5D sprite is active, update texture, flip, and bobbing
    if (this.sprite) {
      const breath = Math.sin(time * 0.004) * 1.0;
      const walkBob = this.isMoving ? Math.abs(Math.sin(time * 0.016)) * 2.5 : 0;
      this.sprite.y = -walkBob + breath;

      if (state === 'sleep') {
        if (this.sprite.texture.key !== 'cat_sleep') {
          this.sprite.setTexture('cat_sleep');
          this.sprite.setScale(0.42);
        }
        this.sprite.setFlipX(false);
        if (this.hologram) this.hologram.setVisible(false);
      } else if (state === 'walk' || state === 'follow' || state === 'return_base') {
        if (this.sprite.texture.key !== 'cat_walk') {
          this.sprite.setTexture('cat_walk');
          this.sprite.setScale(0.38);
        }
        this.sprite.setFlipX(isFacingLeft);
        if (this.hologram) this.hologram.setVisible(false);
      } else if (state === 'react' || state === 'purr' || state === 'surprise') {
        if (this.sprite.texture.key !== 'cat_react') {
          this.sprite.setTexture('cat_react');
          this.sprite.setScale(0.38);
        }
        this.sprite.setFlipX(isFacingLeft);
        if (this.hologram) this.hologram.setVisible(false);
      } else if (state === 'assist') {
        if (this.sprite.texture.key !== 'cat_idle') {
          this.sprite.setTexture('cat_idle');
          this.sprite.setScale(0.38);
        }
        this.sprite.setFlipX(false);
        if (this.hologram) {
          this.hologram.setVisible(true);
          this.hologram.clear();
          const pulse = Math.sin(time * 0.006) * 0.15 + 0.85;
          this.hologram.lineStyle(1.5, 0x00ffff, 0.8 * pulse);
          this.hologram.strokeRect(-24, -115 + breath, 48, 38);
          this.hologram.fillStyle(0x00f0ff, 0.15 * pulse);
          this.hologram.fillRect(-24, -115 + breath, 48, 38);
          this.hologram.lineBetween(0, -60, -20, -77);
          this.hologram.lineBetween(0, -60, 20, -77);
          for (let ly = -110; ly < -80; ly += 6) {
            this.hologram.lineStyle(1, 0x00ffff, 0.45 * pulse);
            this.hologram.lineBetween(-20, ly + breath, 20, ly + breath);
          }
        }
      } else {
        // idle
        if (this.sprite.texture.key !== 'cat_idle') {
          this.sprite.setTexture('cat_idle');
          this.sprite.setScale(0.38);
        }
        this.sprite.setFlipX(isFacingLeft);
        if (this.hologram) this.hologram.setVisible(false);
      }
      return;
    }

    if (!this.visual) return;
    const g = this.visual;
    g.clear();

    const isSleeping = state === 'sleep';
    const dirSign = isFacingLeft ? -1 : 1;

    // Oscillations
    const breath = Math.sin(time * 0.003) * 1;
    const walkBob = this.isMoving ? Math.abs(Math.sin(time * 0.016)) * 2.5 : 0;
    const tailWag = Math.sin(time * 0.008) * 8;
    const eyeBlink = Math.sin(time * 0.002) > 0.95; // Brief periodic blink

    // Color tokens
    const cShell = 0xf1f5f9;
    const cJoint = 0x334155;
    const cVisor = 0x0f172a;
    const cCyanLED = 0x00f0ff;
    const cSoftCyan = 0x38bdf8;

    const rootY = -walkBob;

    if (isSleeping) {
      // Curled sleeping pose on cushion
      g.fillStyle(cShell);
      g.fillRoundedRect(-14, rootY - 14 + breath, 28, 16, 8);

      // Graphite side joint
      g.fillStyle(cJoint);
      g.fillCircle(dirSign * 6, rootY - 6 + breath, 5);

      // Curled tail
      g.lineStyle(3.5, cJoint, 1);
      g.lineBetween(-10, rootY - 8 + breath, -14, rootY - 14);
      g.lineStyle(3, cCyanLED, 0.9);
      g.lineBetween(-14, rootY - 14, -10, rootY - 18);

      // Head resting down
      g.fillStyle(cShell);
      g.fillCircle(dirSign * 10, rootY - 12 + breath, 9);

      // Sleeping closed eye arc (cyan)
      g.lineStyle(2, cSoftCyan, 0.9);
      g.lineBetween(dirSign * 8, rootY - 10 + breath, dirSign * 12, rootY - 10 + breath);

      // Small holographic Zzz indicator
      const zPhase = (time * 0.002) % 3;
      g.fillStyle(cCyanLED, 0.75 - zPhase * 0.2);
      g.fillCircle(dirSign * 14 + zPhase * 4, rootY - 24 - zPhase * 6, 2);

      return;
    }

    // Active pose: Paws
    g.fillStyle(cJoint);
    if (this.isMoving) {
      const legStride = Math.sin(time * 0.016) * 4;
      g.fillRoundedRect(-10, rootY - 10 - legStride, 5, 10, 2);
      g.fillRoundedRect(5, rootY - 10 + legStride, 5, 10, 2);
      g.fillRoundedRect(-5, rootY - 8 + legStride, 5, 8, 2);
      g.fillRoundedRect(0, rootY - 8 - legStride, 5, 8, 2);
    } else {
      g.fillRoundedRect(-10, rootY - 10, 5, 10, 2);
      g.fillRoundedRect(5, rootY - 10, 5, 10, 2);
      g.fillRoundedRect(-4, rootY - 8, 4, 8, 2);
      g.fillRoundedRect(0, rootY - 8, 4, 8, 2);
    }

    // Body chassis
    g.fillStyle(cShell);
    g.fillRoundedRect(-14, rootY - 22 + breath, 28, 16, 6);

    // Graphite shoulder / hip joints
    g.fillStyle(cJoint);
    g.fillCircle(-8, rootY - 14 + breath, 4);
    g.fillCircle(8, rootY - 14 + breath, 4);

    // Segmented tail with cyan tip
    g.lineStyle(3, cJoint, 1);
    g.lineBetween(-dirSign * 12, rootY - 18 + breath, -dirSign * 18, rootY - 28 + tailWag);
    g.lineStyle(3.5, cCyanLED, 1);
    g.lineBetween(-dirSign * 18, rootY - 28 + tailWag, -dirSign * 22, rootY - 36 + tailWag * 1.2);

    // Head container
    const headX = dirSign * 8;
    const headY = rootY - 26 + breath;

    // Ears with cyan inner glow
    g.fillStyle(cShell);
    g.fillTriangle(headX - 8, headY - 6, headX - 3, headY - 18, headX + 2, headY - 6);
    g.fillTriangle(headX - 1, headY - 6, headX + 4, headY - 18, headX + 9, headY - 6);
    g.fillStyle(cCyanLED);
    g.fillTriangle(headX - 6, headY - 7, headX - 3, headY - 15, headX, headY - 7);
    g.fillTriangle(headX + 1, headY - 7, headX + 4, headY - 15, headX + 7, headY - 7);

    // Head base
    g.fillStyle(cShell);
    g.fillCircle(headX, headY, 11);

    // Visor panel
    g.fillStyle(cVisor);
    g.fillRoundedRect(headX - 8, headY - 6, 16, 10, 4);

    // LED Eyes (Cyan)
    if (!eyeBlink) {
      g.fillStyle(cCyanLED);
      if (state === 'react') {
        // Happy arch eyes ^^
        g.lineStyle(2, cCyanLED, 1);
        g.lineBetween(headX - 6, headY - 1, headX - 2, headY - 3);
        g.lineBetween(headX - 2, headY - 3, headX, headY - 1);
        g.lineBetween(headX + 2, headY - 1, headX + 4, headY - 3);
        g.lineBetween(headX + 4, headY - 3, headX + 6, headY - 1);
      } else {
        // Expressive oval eyes
        g.fillEllipse(headX - 4, headY - 1, 4, 6);
        g.fillEllipse(headX + 4, headY - 1, 4, 6);
      }
    }

    // Hologram projection VFX (during assist mode)
    if (this.hologram && state === 'assist') {
      const hg = this.hologram;
      hg.clear();
      const pulse = (Math.sin(time * 0.01) + 1) * 0.5;

      // Cone
      hg.fillStyle(cCyanLED, 0.15 + pulse * 0.1);
      hg.fillTriangle(headX, headY - 10, headX - 24, headY - 60, headX + 24, headY - 60);

      // Concentric hologram rings
      hg.lineStyle(2, cCyanLED, 0.7);
      hg.strokeCircle(headX, headY - 60, 16 + pulse * 4);
      hg.lineStyle(1.5, cSoftCyan, 0.5);
      hg.strokeCircle(headX, headY - 45, 10 + pulse * 2);

      // Holographic question mark or pointer icon
      hg.fillStyle(cCyanLED, 0.9);
      hg.fillCircle(headX, headY - 55, 3);
    }
  }

  destroy() {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }
}
