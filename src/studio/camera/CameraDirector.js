export const CameraMode = Object.freeze({
  OVERVIEW: 'OVERVIEW',
  FOCUS: 'FOCUS',
  FOLLOW: 'FOLLOW',
});

export class CameraDirector {
  /**
   * @param {Phaser.Cameras.Scene2D.Camera} camera - Phaser main camera
   * @param {object} [config]
   */
  constructor(camera, config = {}) {
    this.camera = camera;
    this.mode = CameraMode.OVERVIEW;
    this.config = {
      overviewZoom: config.overviewZoom ?? 0.86,
      focusZoom: config.focusZoom ?? 1.15,
      followZoom: config.followZoom ?? 1.05,
      roomCenter: config.roomCenter ?? { x: 800, y: 550 },
      bounds: config.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 },
      damping: config.damping ?? 0.1,
      ...config,
    };

    this.followTarget = null;
    this.isTransitioning = false;
    this.reducedMotion = false;

    if (typeof window !== 'undefined') {
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    if (this.camera) {
      this.camera.setBounds(
        this.config.bounds.x,
        this.config.bounds.y,
        this.config.bounds.width,
        this.config.bounds.height
      );
      this.setOverview(true);
    }
  }

  /**
   * Switches to OVERVIEW mode: whole room in view.
   *
   * @param {boolean} [immediate=false]
   * @returns {Promise<void>}
   */
  setOverview(immediate = false) {
    this.mode = CameraMode.OVERVIEW;
    this.followTarget = null;

    const { x, y } = this.config.roomCenter;
    const zoom = this.config.overviewZoom;

    if (immediate || this.reducedMotion) {
      if (this.camera) {
        this.camera.stopFollow();
        this.camera.centerOn(x, y);
        this.camera.setZoom(zoom);
      }
      return Promise.resolve();
    }

    return this.panAndZoom(x, y, zoom, 450, 'Cubic.easeInOut');
  }

  /**
   * Switches to FOCUS mode: zoom and pan onto a specific object/position.
   *
   * @param {number} x
   * @param {number} y
   * @param {number} [customZoom]
   * @param {boolean} [immediate=false]
   * @returns {Promise<void>}
   */
  setFocus(x, y, customZoom = null, immediate = false) {
    this.mode = CameraMode.FOCUS;
    this.followTarget = null;
    const zoom = customZoom ?? this.config.focusZoom;

    if (immediate || this.reducedMotion) {
      if (this.camera) {
        this.camera.stopFollow();
        this.camera.centerOn(x, y);
        this.camera.setZoom(zoom);
      }
      return Promise.resolve();
    }

    return this.panAndZoom(x, y, zoom, 550, 'Cubic.easeOut');
  }

  /**
   * Switches to FOLLOW mode: camera follows a target object { x, y } with damping.
   *
   * @param {{ x: number, y: number }} target
   * @param {boolean} [immediate=false]
   */
  setFollow(target, immediate = false) {
    this.mode = CameraMode.FOLLOW;
    this.followTarget = target;
    const zoom = this.config.followZoom;

    if (!this.camera) return;

    if (immediate || this.reducedMotion) {
      this.camera.setZoom(zoom);
      this.camera.centerOn(target.x, target.y);
      this.camera.startFollow(target, false, 1, 1);
    } else {
      this.camera.setZoom(zoom);
      this.camera.startFollow(target, true, this.config.damping, this.config.damping);
    }
  }

  /**
   * Helper to pan and zoom smoothly using Phaser camera methods.
   */
  panAndZoom(x, y, zoom, durationMs, ease = 'Cubic.easeInOut') {
    if (!this.camera) return Promise.resolve();

    this.isTransitioning = true;
    this.camera.stopFollow();

    return new Promise((resolve) => {
      this.camera.pan(x, y, durationMs, ease, false, (camera, progress) => {
        if (progress === 1) {
          this.isTransitioning = false;
          resolve();
        }
      });
      this.camera.zoomTo(zoom, durationMs, ease);
    });
  }

  /**
   * Update hook called every frame from scene update().
   */
  update(time, delta) {
    // If follow target is active, Phaser camera handles follow internally.
  }

  getMode() {
    return this.mode;
  }
}
