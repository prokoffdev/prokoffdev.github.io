import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IsoGrid } from '../src/studio/core/IsoGrid.js';
import { HotspotManager } from '../src/studio/interactions/HotspotManager.js';
import { InteractionRouter, InteractionMode } from '../src/studio/interactions/InteractionRouter.js';

describe('InteractionRouter & Mode Switching Tests', () => {
  const isoGrid = new IsoGrid();
  const mockScene = { game: { canvas: { parentElement: null } } };
  const hotspotManager = new HotspotManager(mockScene);

  function createTestRouter(callbacks = {}) {
    let focusedPoint = null;
    let openedPanel = null;
    let movedTarget = null;

    const mockCamera = {
      setFocus: (x, y) => { focusedPoint = { x, y }; },
    };

    const mockPanel = {
      open: (key) => { openedPanel = key; },
    };

    const router = new InteractionRouter({
      isoGrid,
      cameraDirector: mockCamera,
      contentPanel: mockPanel,
      hotspotManager,
      onMoveTo: (col, row, onArrival) => {
        movedTarget = { col, row };
        if (onArrival) onArrival();
      },
    });

    return {
      router,
      getFocusedPoint: () => focusedPoint,
      getOpenedPanel: () => openedPanel,
      getMovedTarget: () => movedTarget,
    };
  }

  it('should default to QUICK_VIEW mode', () => {
    const { router } = createTestRouter();
    assert.equal(router.getMode(), InteractionMode.QUICK_VIEW);
  });

  it('should immediately open panel and focus camera in QUICK_VIEW without moving actor', () => {
    const { router, getFocusedPoint, getOpenedPanel, getMovedTarget } = createTestRouter();
    const monitorHotspot = hotspotManager.getHotspotById('OBJ_MONITOR');

    router.handleHotspotSelected(monitorHotspot);

    assert.equal(getOpenedPanel(), 'projects');
    assert.ok(getFocusedPoint(), 'Camera should focus on object');
    assert.equal(getMovedTarget(), null, 'Actor should NOT move in Quick View mode');
  });

  it('should dispatch movement to interactionTile before opening panel in EXPLORE mode', () => {
    const { router, getFocusedPoint, getOpenedPanel, getMovedTarget } = createTestRouter();
    router.setMode(InteractionMode.EXPLORE);

    const phoneHotspot = hotspotManager.getHotspotById('OBJ_PHONE'); // interactionTile: [18, 6]

    router.handleHotspotSelected(phoneHotspot, { col: 10, row: 6 });

    assert.deepEqual(getMovedTarget(), { col: 18, row: 6 });
    assert.equal(getOpenedPanel(), 'mobile');
    assert.ok(getFocusedPoint(), 'Camera should focus upon arrival');
  });

  it('should find nearest hotspot within 1 Manhattan tile distance for E key interaction', () => {
    const { router } = createTestRouter();
    // OBJ_CONTACT interactionTile is [19, 6]
    // If actor is at [19, 6] or adjacent [19, 5] / [18, 6], it must find OBJ_CONTACT
    const nearest = router.findNearestInteractiveHotspot(19, 6);
    assert.ok(nearest);
    assert.equal(nearest.id, 'OBJ_CONTACT');

    // Far away cell: [0, 0]
    const nothingNear = router.findNearestInteractiveHotspot(0, 0);
    assert.equal(nothingNear, null);
  });
});
