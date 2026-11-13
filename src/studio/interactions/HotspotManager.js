import hotspotsData from '../../data/studio/hotspots.json' with { type: 'json' };

export class HotspotManager {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} [callbacks]
   * @param {Function} [callbacks.onSelect]
   * @param {Function} [callbacks.onHover]
   */
  constructor(scene, callbacks = {}) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.hotspots = hotspotsData.hotspots || [];
    this.activeHotspot = null;
    this.hoveredHotspot = null;
    this.tooltipEl = null;

    this.initHoverTooltip();
  }

  initHoverTooltip() {
    if (typeof document === 'undefined') return;
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'studio-hotspot-tooltip';
    this.tooltipEl.style.cssText = `
      position: absolute;
      pointer-events: none;
      background: rgba(17, 25, 35, 0.9);
      color: #fff;
      font-family: inherit;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid rgba(255, 69, 77, 0.5);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      transform: translate(-50%, -130%);
      z-index: 80;
      display: none;
      white-space: nowrap;
    `;
    const mount = this.scene.game?.canvas?.parentElement;
    if (mount) {
      mount.appendChild(this.tooltipEl);
    }
  }

  /**
   * Tests if a world coordinate (x, y) hits any hotspot.
   *
   * @param {number} x
   * @param {number} y
   * @returns {object|null} Matched hotspot
   */
  hitTest(x, y) {
    for (const h of this.hotspots) {
      if (!h.shape) continue;

      if (h.shape.type === 'circle') {
        const [cx, cy] = h.shape.center;
        const dist = Math.hypot(x - cx, y - cy);
        if (dist <= h.shape.radius) {
          return h;
        }
      } else if (h.shape.type === 'polygon') {
        if (this.pointInPolygon([x, y], h.shape.points)) {
          return h;
        }
      }
    }
    return null;
  }

  /**
   * Ray casting algorithm for polygon inclusion.
   */
  pointInPolygon(point, vs) {
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0], yi = vs[i][1];
      const xj = vs[j][0], yj = vs[j][1];
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Handles pointer move event to update hover state and tooltip.
   */
  handlePointerMove(worldX, worldY, clientX, clientY) {
    const hit = this.hitTest(worldX, worldY);

    if (hit !== this.hoveredHotspot) {
      this.hoveredHotspot = hit;
      if (this.scene.game?.canvas) {
        this.scene.game.canvas.style.cursor = hit ? 'pointer' : 'default';
      }

      if (this.tooltipEl) {
        if (hit) {
          this.tooltipEl.textContent = hit.label;
          this.tooltipEl.style.display = 'block';
        } else {
          this.tooltipEl.style.display = 'none';
        }
      }

      if (this.callbacks.onHover) {
        this.callbacks.onHover(hit);
      }
    }

    if (this.hoveredHotspot && this.tooltipEl) {
      const rect = this.scene.game.canvas.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      this.tooltipEl.style.left = `${relX}px`;
      this.tooltipEl.style.top = `${relY}px`;
    }
  }

  /**
   * Handles pointer click event.
   */
  handlePointerDown(worldX, worldY) {
    const hit = this.hitTest(worldX, worldY);
    if (hit) {
      this.activeHotspot = hit;
      if (this.callbacks.onSelect) {
        this.callbacks.onSelect(hit);
      }
      return true;
    }
    return false;
  }

  getHotspotById(id) {
    return this.hotspots.find((h) => h.id === id) || null;
  }

  getHotspotByContentKey(contentKey) {
    return this.hotspots.find((h) => h.contentKey === contentKey) || null;
  }
}
