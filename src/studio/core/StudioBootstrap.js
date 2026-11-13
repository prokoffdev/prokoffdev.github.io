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

export class StudioBootstrap {
  /**
   * @param {object} [options]
   * @param {boolean} [options.enabled] - Explicit enable flag (defaults to feature flag check)
   */
  constructor(options = {}) {
    this.status = StudioStatus.UNMOUNTED;
    this.container = null;
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

  /**
   * Evaluates feature flag status: URL query parameter (?studio=true),
   * localStorage or explicit options.
   *
   * @returns {boolean}
   */
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
    // Default safe baseline: studio disabled during Stage 1 foundation
    return false;
  }

  /**
   * Mounts the studio into a DOM container element.
   *
   * @param {HTMLElement|string} target - Container element or CSS selector
   * @returns {this}
   */
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
      // Support duck-typed mock elements in test runners
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

  /**
   * Initializes studio data models, validates configurations, and prepares stage.
   *
   * @param {object} [runtimeOptions]
   * @returns {boolean} Success status
   */
  initialize(runtimeOptions = {}) {
    if (!this.container) {
      this.status = StudioStatus.ERROR;
      this.error = new Error('[StudioBootstrap] Cannot initialize before mounting to a container.');
      return false;
    }

    // Check feature flag
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
      // Fallback: keep container hidden
      this.container.style.display = 'none';
      return false;
    }

    this.status = StudioStatus.INITIALIZED;
    this.container.style.display = 'block';
    this.container.setAttribute('data-studio-status', 'ready');
    return true;
  }

  /**
   * Destroys the bootstrap instance, clears listeners, and restores container.
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
      this.container.removeAttribute('data-studio-status');
      this.container.style.display = 'none';
    }
    this.status = StudioStatus.DESTROYED;
    this.container = null;
    this.error = null;
  }

  /**
   * Returns current studio lifecycle status.
   *
   * @returns {string}
   */
  getStatus() {
    return this.status;
  }
}
