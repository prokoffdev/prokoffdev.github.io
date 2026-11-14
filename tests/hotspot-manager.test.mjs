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
    // OBJ_PHONE center: [960, 480], radius: 42
    const hitPhoneCenter = manager.hitTest(960, 480);
    assert.ok(hitPhoneCenter, 'Should hit phone center');
    assert.equal(hitPhoneCenter.id, 'OBJ_PHONE');

    const hitPhoneEdge = manager.hitTest(960 + 35, 480);
    assert.ok(hitPhoneEdge, 'Should hit inside phone radius');
    assert.equal(hitPhoneEdge.id, 'OBJ_PHONE');

    const missPhone = manager.hitTest(960 + 100, 480);
    assert.notEqual(missPhone?.id, 'OBJ_PHONE');
  });

  it('should accurately hit-test polygonal hotspots', () => {
    // OBJ_MONITOR polygon points: [[883, 319], [1164, 381], [1164, 484], [883, 438]]
    // Center is approximately (1024, 406)
    const hitMonitor = manager.hitTest(1024, 406);
    assert.ok(hitMonitor, 'Should hit inside monitor polygon');
    assert.equal(hitMonitor.id, 'OBJ_MONITOR');

    const missMonitor = manager.hitTest(50, 50);
    assert.equal(missMonitor, null);
  });

  it('should hit-test robo-cat companion hotspot', () => {
    // OBJ_ROBOCAT center: [172, 448], radius: 65
    const hitCat = manager.hitTest(172, 448);
    assert.ok(hitCat, 'Should hit robo-cat');
    assert.equal(hitCat.id, 'OBJ_ROBOCAT');
    assert.equal(hitCat.contentKey, 'assistant-help');
  });
});
