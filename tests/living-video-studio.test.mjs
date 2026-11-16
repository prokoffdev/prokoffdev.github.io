import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VideoPhase, LivingVideoStudio } from '../src/studio/video/LivingVideoStudio.js';
import { StudioDisplayMode } from '../src/studio/core/StudioBootstrap.js';

describe('Living Video Diorama & Single-Action Control Tests', () => {
  it('should define all 5 interactive video phases correctly', () => {
    assert.equal(VideoPhase.CODING, 'CODING');
    assert.equal(VideoPhase.CAT_REACT, 'CAT_REACT');
    assert.equal(VideoPhase.COFFEE, 'COFFEE');
    assert.equal(VideoPhase.BUILD, 'BUILD');
    assert.equal(VideoPhase.RELAX, 'RELAX');
    assert.equal(Object.keys(VideoPhase).length, 5);
  });

  it('should define StudioDisplayMode enum with VIDEO and CANVAS', () => {
    assert.equal(StudioDisplayMode.VIDEO, 'video');
    assert.equal(StudioDisplayMode.CANVAS, 'canvas');
  });

  it('should instantiate safely in non-browser (Node) environment without crashing', () => {
    const studio = new LivingVideoStudio(null);
    assert.equal(studio.phase, VideoPhase.CODING);
    assert.equal(studio.catPhase, 'SLEEP');
    assert.equal(studio.isDevBusy, false);
    assert.equal(studio.isCatBusy, false);
    assert.equal(studio.isMuted, true);
    assert.equal(studio.devVideoEl, null);
    assert.equal(studio.catVideoEl, null);
  });

  it('should enforce single click execution and prevent multiple simultaneous triggers', () => {
    const mockDevVideo = {
      innerHTML: '',
      loop: true,
      muted: true,
      load: () => {},
      play: async () => {},
      pause: () => {},
      appendChild: () => {},
    };

    const mockCatVideo = {
      innerHTML: '',
      loop: true,
      muted: true,
      load: () => {},
      play: async () => {},
      pause: () => {},
      appendChild: () => {},
    };

    const mockCoffeeBtn = { disabled: false, textContent: '☕ Выпить кофе', classList: { add: () => {}, remove: () => {} } };
    const mockPetBtn = { disabled: false, textContent: '🐱 Погладить кота', classList: { add: () => {}, remove: () => {} } };

    const studio = new LivingVideoStudio(null);
    studio.devVideoEl = mockDevVideo;
    studio.catVideoEl = mockCatVideo;
    studio.coffeeBtn = mockCoffeeBtn;
    studio.petCatBtn = mockPetBtn;

    // 1. Initial State: not busy
    assert.equal(studio.isDevBusy, false);
    assert.equal(studio.isCatBusy, false);

    // 2. Trigger Coffee: becomes busy, disables button
    studio.triggerCoffee();
    assert.equal(studio.isDevBusy, true);
    assert.equal(studio.phase, VideoPhase.COFFEE);
    assert.equal(mockCoffeeBtn.disabled, true);

    // Subsequent clicks while busy are completely ignored
    studio.triggerCoffee();
    assert.equal(studio.isDevBusy, true);

    // 3. Trigger Cat: becomes busy independently, dev remains busy
    studio.triggerCat();
    assert.equal(studio.isCatBusy, true);
    assert.equal(studio.catPhase, 'WAKE');
    assert.equal(mockPetBtn.disabled, true);

    // Subsequent cat clicks while busy are completely ignored
    studio.triggerCat();
    assert.equal(studio.isCatBusy, true);

    // 4. Test onEnded callback execution unlocks Dev
    if (mockDevVideo.onended) {
      mockDevVideo.onended();
      assert.equal(studio.isDevBusy, false);
      assert.equal(mockCoffeeBtn.disabled, false);
      assert.equal(studio.phase, VideoPhase.CODING);
    }

    // 5. Audio Toggle
    assert.equal(studio.isMuted, true);
    studio.toggleSound();
    assert.equal(studio.isMuted, false);
    assert.equal(mockDevVideo.muted, false);
    assert.equal(mockCatVideo.muted, false);

    studio.toggleSound();
    assert.equal(studio.isMuted, true);
    assert.equal(mockDevVideo.muted, true);
    assert.equal(mockCatVideo.muted, true);
  });

  it('should trigger modals for projects, tech stack, and profile cleanly', () => {
    const mockModal = {
      openedSection: null,
      open: (s) => { mockModal.openedSection = s; },
      close: () => { mockModal.openedSection = null; },
    };

    const studio = new LivingVideoStudio(null);
    studio.contentPanel = mockModal;

    studio.triggerBuild('projects');
    assert.equal(studio.phase, VideoPhase.BUILD);
    assert.equal(mockModal.openedSection, 'projects');

    studio.triggerHologram('skills');
    assert.equal(studio.phase, VideoPhase.BUILD);
    assert.equal(mockModal.openedSection, 'skills');

    studio.triggerRelax();
    assert.equal(studio.phase, VideoPhase.RELAX);
    assert.equal(mockModal.openedSection, 'about');
  });
});
