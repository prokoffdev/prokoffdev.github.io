export const InteractionMode = Object.freeze({
  QUICK_VIEW: 'QUICK_VIEW',
  EXPLORE: 'EXPLORE',
});

export class InteractionRouter {
  /**
   * @param {object} context
   * @param {IsoGrid} context.isoGrid
   * @param {CameraDirector} context.cameraDirector
   * @param {ContentPanel} context.contentPanel
   * @param {HotspotManager} context.hotspotManager
   * @param {Function} [context.onMoveTo]
   */
  constructor(context) {
    this.isoGrid = context.isoGrid;
    this.cameraDirector = context.cameraDirector;
    this.contentPanel = context.contentPanel;
    this.hotspotManager = context.hotspotManager;
    this.onMoveTo = context.onMoveTo;

    this.mode = InteractionMode.QUICK_VIEW;
    this.pendingHotspot = null;
  }

  setMode(mode) {
    if (Object.values(InteractionMode).includes(mode)) {
      this.mode = mode;
      console.log(`[InteractionRouter] Switched to mode: ${mode}`);
    }
  }

  getMode() {
    return this.mode;
  }

  /**
   * Handles hotspot selection.
   *
   * @param {object} hotspot
   * @param {{ col: number, row: number }} [currentActorPosition]
   */
  handleHotspotSelected(hotspot, currentActorPosition = null) {
    if (!hotspot) return;

    if (this.mode === InteractionMode.QUICK_VIEW) {
      // In Quick View mode: Camera focuses directly on object, and HTML panel opens immediately
      const focusPoint = this.getHotspotCenterPoint(hotspot);
      this.cameraDirector.setFocus(focusPoint.x, focusPoint.y);
      this.contentPanel.open(hotspot.contentKey);
      return;
    }

    // In Explore Mode: Character walks to interactionTile first
    if (this.mode === InteractionMode.EXPLORE) {
      this.pendingHotspot = hotspot;
      const [targetCol, targetRow] = hotspot.interactionTile;

      if (currentActorPosition && currentActorPosition.col === targetCol && currentActorPosition.row === targetRow) {
        // Already at interaction position
        this.triggerInteraction(hotspot);
      } else if (this.onMoveTo) {
        this.onMoveTo(targetCol, targetRow, () => {
          this.triggerInteraction(hotspot);
        });
      }
    }
  }

  /**
   * Triggers the actual object interaction (camera focus + opening panel).
   */
  triggerInteraction(hotspot) {
    const focusPoint = this.getHotspotCenterPoint(hotspot);
    this.cameraDirector.setFocus(focusPoint.x, focusPoint.y);
    this.contentPanel.open(hotspot.contentKey);
    this.pendingHotspot = null;
  }

  /**
   * Finds the nearest hotspot to (col, row) within interaction distance.
   * Used for 'E' key press interaction.
   *
   * @param {number} col
   * @param {number} row
   * @param {number} [maxDistance=1]
   * @returns {object|null}
   */
  findNearestInteractiveHotspot(col, row, maxDistance = 1) {
    let nearest = null;
    let minDistance = Infinity;

    for (const h of this.hotspotManager.hotspots) {
      if (!h.interactionTile) continue;
      const [itCol, itRow] = h.interactionTile;
      const dist = Math.abs(col - itCol) + Math.abs(row - itRow);
      if (dist <= maxDistance && dist < minDistance) {
        minDistance = dist;
        nearest = h;
      }
    }
    return nearest;
  }

  getHotspotCenterPoint(hotspot) {
    if (hotspot.shape?.type === 'circle') {
      return { x: hotspot.shape.center[0], y: hotspot.shape.center[1] };
    }
    if (hotspot.shape?.type === 'polygon' && hotspot.shape.points.length > 0) {
      let sumX = 0, sumY = 0;
      hotspot.shape.points.forEach(([px, py]) => { sumX += px; sumY += py; });
      return {
        x: sumX / hotspot.shape.points.length,
        y: sumY / hotspot.shape.points.length,
      };
    }
    const [c, r] = hotspot.anchorTile || [10, 6];
    return this.isoGrid.getCellCenter(c, r);
  }
}
