import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StudioBootstrap, StudioStatus } from '../src/studio/core/StudioBootstrap.js';

describe('StudioBootstrap Lifecycle & Feature Flag Tests', () => {
  it('should start in UNMOUNTED status', () => {
    const bootstrap = new StudioBootstrap();
    assert.equal(bootstrap.getStatus(), StudioStatus.UNMOUNTED);
  });

  it('should handle missing mount targets gracefully', () => {
    const bootstrap = new StudioBootstrap();
    bootstrap.mount('#non-existent-container');
    assert.equal(bootstrap.getStatus(), StudioStatus.ERROR);
    assert.ok(bootstrap.error);
  });

  it('should mount to a mock DOM element and stay disabled by default', () => {
    // Mock minimal DOM element for node environment
    const mockContainer = {
      style: { display: '' },
      setAttribute: (k, v) => { mockContainer[k] = v; },
      removeAttribute: (k) => { delete mockContainer[k]; },
      innerHTML: '',
    };

    const bootstrap = new StudioBootstrap();
    bootstrap.mount(mockContainer);
    assert.equal(bootstrap.getStatus(), StudioStatus.MOUNTED);

    // Default: studio is disabled
    const initRes = bootstrap.initialize();
    assert.equal(initRes, false);
    assert.equal(bootstrap.getStatus(), StudioStatus.DISABLED);
    assert.equal(mockContainer.style.display, 'none');
  });

  it('should initialize and validate data when feature flag is enabled', () => {
    const mockContainer = {
      style: { display: '' },
      setAttribute: (k, v) => { mockContainer[k] = v; },
      removeAttribute: (k) => { delete mockContainer[k]; },
      innerHTML: '',
    };

    const bootstrap = new StudioBootstrap({ enabled: true });
    bootstrap.mount(mockContainer);
    assert.equal(bootstrap.getStatus(), StudioStatus.MOUNTED);

    const initRes = bootstrap.initialize();
    assert.equal(initRes, true);
    assert.equal(bootstrap.getStatus(), StudioStatus.INITIALIZED);
    assert.equal(mockContainer.style.display, 'block');
    assert.equal(mockContainer['data-studio-status'], 'ready');

    // Test destroy
    bootstrap.destroy();
    assert.equal(bootstrap.getStatus(), StudioStatus.DESTROYED);
    assert.equal(mockContainer.style.display, 'none');
  });
});
