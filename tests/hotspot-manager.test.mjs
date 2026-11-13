import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HotspotManager } from '../src/studio/interactions/HotspotManager.js';

describe('HotspotManager Hit-Testing & Polygon Tests', () => {
  // Mock minimal scene for unit testing
  const mockScene = { game: { canvas: { parentElement: null } } };
  const manager = new HotspotManager(mockScene);

  it('should load all 8 hotspots from data configuration', () => {
    assert.equal(manager.hotspots.length, 8);
  });

  it('should accurately hit-test circular hotspots', () => {
    // OBJ_PHONE center: [1100, 690], radius: 48
    const hitPhoneCenter = manager.hitTest(1100, 690);
    assert.ok(hitPhoneCenter, 'Should hit phone center');
    assert.equal(hitPhoneCenter.id, 'OBJ_PHONE');

    const hitPhoneEdge = manager.hitTest(1100 + 40, 690);
    assert.ok(hitPhoneEdge, 'Should hit inside phone radius');
    assert.equal(hitPhoneEdge.id, 'OBJ_PHONE');

    const missPhone = manager.hitTest(1100 + 100, 690);
    assert.notEqual(missPhone?.id, 'OBJ_PHONE');
  });

  it('should accurately hit-test polygonal hotspots', () => {
    // OBJ_MONITOR polygon points: [[1000, 350], [1190, 440], [1120, 510], [950, 420]]
    // Center is approximately (1065, 430)
    const hitMonitor = manager.hitTest(1065, 430);
    assert.ok(hitMonitor, 'Should hit inside monitor polygon');
    assert.equal(hitMonitor.id, 'OBJ_MONITOR');

    const missMonitor = manager.hitTest(200, 200);
    assert.equal(missMonitor, null);
  });

  it('should hit-test robo-cat companion hotspot', () => {
    // OBJ_ROBOCAT center: [1060, 785], radius: 48
    const hitCat = manager.hitTest(1060, 785);
    assert.ok(hitCat, 'Should hit robo-cat');
    assert.equal(hitCat.id, 'OBJ_ROBOCAT');
    assert.equal(hitCat.contentKey, 'assistant-help');
  });
});
