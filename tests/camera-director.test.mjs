import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CameraDirector, CameraMode } from '../src/studio/camera/CameraDirector.js';

describe('CameraDirector Tests', () => {
  // Mock Phaser Camera
  function createMockCamera() {
    return {
      zoom: 1,
      scrollX: 0,
      scrollY: 0,
      bounds: null,
      followTarget: null,
      setBounds(x, y, w, h) { this.bounds = { x, y, width: w, height: h }; },
      setZoom(z) { this.zoom = z; },
      centerOn(x, y) { this.scrollX = x; this.scrollY = y; },
      stopFollow() { this.followTarget = null; },
      startFollow(target) { this.followTarget = target; },
      pan(x, y, duration, ease, force, cb) {
        this.scrollX = x;
        this.scrollY = y;
        if (cb) cb(this, 1);
      },
      zoomTo(z) { this.zoom = z; },
    };
  }

  it('should initialize with OVERVIEW mode and set room bounds (0, 0, 1600, 1000)', () => {
    const mockCamera = createMockCamera();
    const director = new CameraDirector(mockCamera);

    assert.equal(director.getMode(), CameraMode.OVERVIEW);
    assert.deepEqual(mockCamera.bounds, { x: 0, y: 0, width: 1600, height: 1000 });
    assert.equal(mockCamera.zoom, 0.86);
  });

  it('should switch between OVERVIEW, FOCUS, and FOLLOW modes', async () => {
    const mockCamera = createMockCamera();
    const director = new CameraDirector(mockCamera);

    // Switch to FOCUS
    await director.setFocus(936, 600, 1.2, true);
    assert.equal(director.getMode(), CameraMode.FOCUS);
    assert.equal(mockCamera.zoom, 1.2);
    assert.equal(mockCamera.scrollX, 936);
    assert.equal(mockCamera.scrollY, 600);

    // Switch to FOLLOW
    const targetEntity = { x: 850, y: 550 };
    director.setFollow(targetEntity, true);
    assert.equal(director.getMode(), CameraMode.FOLLOW);
    assert.equal(mockCamera.zoom, 1.05);
    assert.equal(mockCamera.followTarget, targetEntity);

    // Return to OVERVIEW
    await director.setOverview(true);
    assert.equal(director.getMode(), CameraMode.OVERVIEW);
    assert.equal(mockCamera.followTarget, null);
    assert.equal(mockCamera.zoom, 0.86);
  });
});
