import { validateSceneLayout, validateCollisionMap, validateHotspots, validateStateMachine } from './dataValidator.js';
import sceneLayoutData from '../../data/studio/scene-layout.json' with { type: 'json' };
import collisionMapData from '../../data/studio/collision-map.json' with { type: 'json' };
import hotspotsData from '../../data/studio/hotspots.json' with { type: 'json' };
import stateMachineData from '../../data/studio/character_state_machine.json' with { type: 'json' };

export const StudioStatus = Object.freeze({
  UNMOUNTED: 'UNMOUNTED',
  MOUNTED: 'MOUNTED',
  INITIALIZED: 'INITIALIZED',
  DISABLED: 'DISABLED',
  ERROR: 'ERROR',
  DESTROYED: 'DESTROYED',
});

export const StudioDisplayMode = Object.freeze({
  VIDEO: 'video',
  CANVAS: 'canvas',
});

export class StudioBootstrap {
  /**
   * @param {object} [options]
   * @param {boolean} [options.enabled] - Explicit enable flag (defaults to feature flag check)
   * @param {string} [options.mode] - 'video' or 'canvas'
   */
  constructor(options = {}) {
    this.status = StudioStatus.UNMOUNTED;
    this.container = null;
    this.game = null;
    this.videoStudio = null;
    this.currentMode = StudioDisplayMode.VIDEO;
    this.options = options;
    this.data = {
      layout: sceneLayoutData,
      collision: collisionMapData,
      hotspots: hotspotsData,
      stateMachine: stateMachineData,
    };
    this.validationResults = null;
    this.error = null;
  }

  isFeatureEnabled() {
    if (typeof this.options.enabled === 'boolean') {
      return this.options.enabled;
    }
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('studio')) {
        return urlParams.get('studio') === 'true' || urlParams.get('studio') === '1';
      }
      const stored = localStorage.getItem('prokoff_studio_enabled');
      if (stored !== null) {
        return stored === 'true';
      }
    }
    return false;
  }

  getInitialMode() {
    if (this.options.mode) {
      return this.options.mode;
    }
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const modeParam = urlParams.get('mode');
      if (modeParam === 'canvas' || modeParam === 'video') {
        return modeParam;
      }
      const stored = localStorage.getItem('prokoff_studio_mode');
      if (stored === 'canvas' || stored === 'video') {
        return stored;
      }
    }
    return StudioDisplayMode.VIDEO;
  }

  mount(target) {
    if (this.status === StudioStatus.INITIALIZED) {
      console.warn('[StudioBootstrap] Already initialized. Destroy before remounting.');
      return this;
    }

    if (typeof target === 'string') {
      if (typeof document !== 'undefined') {
        this.container = document.querySelector(target);
      }
    } else if (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) {
      this.container = target;
    } else if (target && typeof target === 'object' && target.style) {
      this.container = target;
    }

    if (!this.container) {
      this.status = StudioStatus.ERROR;
      this.error = new Error(`[StudioBootstrap] Mount target not found: ${target}`);
      console.error(this.error.message);
      return this;
    }

    this.status = StudioStatus.MOUNTED;
    return this;
  }

  async initialize(runtimeOptions = {}) {
    if (!this.container) {
      this.status = StudioStatus.ERROR;
      this.error = new Error('[StudioBootstrap] Cannot initialize before mounting to a container.');
      return false;
    }

    if (!this.isFeatureEnabled()) {
      this.status = StudioStatus.DISABLED;
      this.container.style.display = 'none';
      return false;
    }

    // Perform data validation
    const layoutRes = validateSceneLayout(this.data.layout);
    const collisionRes = validateCollisionMap(this.data.collision);
    const hotspotsRes = validateHotspots(this.data.hotspots, this.data.collision);
    const stateMachineRes = validateStateMachine(this.data.stateMachine);

    this.validationResults = {
      layout: layoutRes,
      collision: collisionRes,
      hotspots: hotspotsRes,
      stateMachine: stateMachineRes,
    };

    const hasErrors = !layoutRes.valid || !collisionRes.valid || !hotspotsRes.valid || !stateMachineRes.valid;

    if (hasErrors) {
      this.status = StudioStatus.ERROR;
      this.error = new Error('[StudioBootstrap] Configuration validation failed');
      console.error(this.error.message, this.validationResults);
      this.container.style.display = 'none';
      return false;
    }

    // Validated successfully
    this.container.style.display = 'block';

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.currentMode = this.getInitialMode();
      if (this.currentMode === StudioDisplayMode.CANVAS) {
        return await this.launchCanvasStudio();
      } else {
        return await this.launchVideoStudio();
      }
    }

    this.status = StudioStatus.INITIALIZED;
    this.container.setAttribute('data-studio-status', 'ready');
    return true;
  }

  async launchVideoStudio() {
    this.cleanupCurrentRuntime();

    this.container.style.width = '100%';
    this.container.style.maxWidth = '1400px';
    this.container.style.margin = '40px auto';
    this.container.style.position = 'relative';

    try {
      const { LivingVideoStudio } = await import('../video/LivingVideoStudio.js');
      this.videoStudio = new LivingVideoStudio(this.container, {
        onSwitchMode: () => this.switchMode(StudioDisplayMode.CANVAS),
      });

      this.currentMode = StudioDisplayMode.VIDEO;
      this.status = StudioStatus.INITIALIZED;
      this.container.setAttribute('data-studio-status', 'ready');
      this.container.setAttribute('data-studio-mode', 'video');
      return true;
    } catch (err) {
      console.error('[StudioBootstrap] Failed to launch Living Video Studio:', err);
      // Fallback to Canvas mode
      return await this.launchCanvasStudio();
    }
  }

  async launchCanvasStudio() {
    this.cleanupCurrentRuntime();

    this.container.style.width = '100%';
    this.container.style.maxWidth = '1600px';
    this.container.style.margin = '80px auto 40px auto';
    this.container.style.position = 'relative';

    try {
      const phaserModule = await import('phaser');
      const Phaser = phaserModule.default || phaserModule;
      const { StudioScene } = await import('../scenes/StudioScene.js');

      const gameConfig = {
        type: Phaser.AUTO,
        parent: this.container,
        width: 1600,
        height: 1000,
        backgroundColor: '#111923',
        input: {
          touch: {
            capture: false,
          },
        },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: 1600,
          height: 1000,
        },
        scene: [StudioScene],
      };

      this.game = new Phaser.Game(gameConfig);

      // Add switch button to video mode in canvas HUD
      this.setupCanvasHudSwitcher();

      const urlParams = new URLSearchParams(window.location.search);
      const isDebug = urlParams.get('debug') === '1' || urlParams.get('debug') === 'true';
      if (isDebug) {
        this.createDebugToolbar();
      }

      this.currentMode = StudioDisplayMode.CANVAS;
      this.status = StudioStatus.INITIALIZED;
      this.container.setAttribute('data-studio-status', 'ready');
      this.container.setAttribute('data-studio-mode', 'canvas');
      return true;
    } catch (err) {
      console.error('[StudioBootstrap] Failed to launch Phaser game:', err);
      this.status = StudioStatus.ERROR;
      this.error = err;
      this.container.style.display = 'none';
      return false;
    }
  }

  setupCanvasHudSwitcher() {
    if (!this.container || typeof document === 'undefined') return;

    // Check periodically until HUD is mounted by StudioScene
    const interval = setInterval(() => {
      const hudNav = this.container.querySelector('.studio-hud-nav');
      if (hudNav && !hudNav.querySelector('.studio-hud-switch-video')) {
        const switchBtn = document.createElement('button');
        switchBtn.type = 'button';
        switchBtn.className = 'studio-hud-pill studio-hud-switch-video';
        switchBtn.innerHTML = '<span>🎬 Живая диорама</span>';
        switchBtn.title = 'Переключить в режим кинематографического видео';
        switchBtn.onclick = () => this.switchMode(StudioDisplayMode.VIDEO);
        hudNav.appendChild(switchBtn);
        clearInterval(interval);
      }
    }, 200);

    setTimeout(() => clearInterval(interval), 5000);
  }

  async switchMode(newMode) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('prokoff_studio_mode', newMode);
    }
    if (newMode === StudioDisplayMode.VIDEO) {
      await this.launchVideoStudio();
    } else {
      await this.launchCanvasStudio();
    }
  }

  cleanupCurrentRuntime() {
    if (this.videoStudio) {
      this.videoStudio.destroy();
      this.videoStudio = null;
    }
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  createDebugToolbar() {
    if (!this.container || typeof document === 'undefined') return;

    let toolbar = this.container.querySelector('.studio-debug-toolbar');
    if (toolbar) toolbar.remove();

    toolbar = document.createElement('div');
    toolbar.className = 'studio-debug-toolbar';
    toolbar.style.cssText = `
      position: absolute;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      background: rgba(17, 25, 35, 0.92);
      border: 1px solid rgba(100, 115, 134, 0.4);
      border-radius: 999px;
      padding: 6px 14px;
      z-index: 50;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      backdrop-filter: blur(8px);
    `;

    const buttons = [
      { id: 'btn-overview', label: 'Обзор [1]', action: () => this.getScene()?.cameraDirector?.setOverview() },
      { id: 'btn-focus', label: 'Фокус [2]', action: () => this.getScene()?.cameraDirector?.setFocus(936, 600) },
      { id: 'btn-follow', label: 'Следование [3]', action: () => this.getScene()?.cameraDirector?.setFollow(this.getScene().testActor) },
      { id: 'btn-grid', label: 'Сетка [G]', action: () => this.getScene()?.toggleDebug('grid') },
      { id: 'btn-collision', label: 'Коллизии [C]', action: () => this.getScene()?.toggleDebug('collision') },
      { id: 'btn-hotspots', label: 'Хотспоты [H]', action: () => this.getScene()?.toggleDebug('hotspots') },
    ];

    buttons.forEach((btn) => {
      const b = document.createElement('button');
      b.id = btn.id;
      b.type = 'button';
      b.textContent = btn.label;
      b.style.cssText = `
        background: rgba(36, 48, 62, 0.85);
        color: #e2e8f0;
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 999px;
        padding: 4px 12px;
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      b.onmouseenter = () => { b.style.background = 'rgba(255, 69, 77, 0.2)'; b.style.borderColor = '#ff454d'; };
      b.onmouseleave = () => { b.style.background = 'rgba(36, 48, 62, 0.85)'; b.style.borderColor = 'rgba(148, 163, 184, 0.25)'; };
      b.onclick = btn.action;
      toolbar.appendChild(b);
    });

    this.container.appendChild(toolbar);
  }

  getScene() {
    return this.game?.scene?.getScene('StudioScene') ?? null;
  }

  destroy() {
    this.cleanupCurrentRuntime();
    if (this.container) {
      this.container.removeAttribute('data-studio-status');
      this.container.removeAttribute('data-studio-mode');
      this.container.style.display = 'none';
    }
    this.status = StudioStatus.DESTROYED;
    this.container = null;
    this.error = null;
  }

  getStatus() {
    return this.status;
  }

  getMode() {
    return this.currentMode;
  }
}
