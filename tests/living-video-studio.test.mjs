import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VideoPhase, LivingVideoStudio } from '../src/studio/video/LivingVideoStudio.js';
import { StudioDisplayMode } from '../src/studio/core/StudioBootstrap.js';

describe('Living Video Diorama & Phase Control Tests', () => {
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
    assert.equal(studio.isMuted, true);
    assert.equal(studio.devVideoEl, null);
    assert.equal(studio.catVideoEl, null);
  });

  it('should manage phase transitions, dual video scrubbing and independent loops', () => {
    const mockDevVideo = {
      currentTime: 0,
      muted: true,
      paused: false,
      play: async () => {},
      pause: () => { mockDevVideo.paused = true; },
      addEventListener: () => {},
      removeEventListener: () => {},
    };

    const mockCatVideo = {
      currentTime: 0,
      muted: true,
      paused: false,
      play: async () => {},
      pause: () => { mockCatVideo.paused = true; },
      addEventListener: () => {},
      removeEventListener: () => {},
    };

    const mockModal = {
      openedSection: null,
      open: (s) => { mockModal.openedSection = s; },
      close: () => { mockModal.openedSection = null; },
    };

    const studio = new LivingVideoStudio(null);
    studio.devVideoEl = mockDevVideo;
    studio.catVideoEl = mockCatVideo;
    studio.videoEl = mockDevVideo;
    studio.contentPanel = mockModal;

    // 1. Initial State
    assert.equal(studio.phase, VideoPhase.CODING);
    assert.equal(studio.catPhase, 'SLEEP');

    // 2. Trigger Cat reaction (cat wakes up on its own video without disturbing dev!)
    studio.triggerCat();
    assert.equal(studio.catPhase, 'WAKE');
    assert.equal(mockCatVideo.currentTime, 1.90);
    // Dev video is completely untouched
    assert.equal(mockDevVideo.currentTime, 0);

    // Cat reaches wake threshold (8.0s) and transitions to ALERT loop
    mockCatVideo.currentTime = 8.05;
    studio.handleCatTimeUpdate();
    assert.equal(studio.catPhase, 'ALERT');

    // Cat alert loop boundary test
    mockCatVideo.currentTime = 9.95;
    studio.handleCatTimeUpdate();
    assert.equal(mockCatVideo.currentTime, 7.50);

    // 3. Trigger Coffee (only dev video plays sip without touching cat!)
    studio.triggerCoffee();
    assert.equal(studio.phase, VideoPhase.COFFEE);
    assert.equal(mockDevVideo.currentTime, 2.90);

    // Coffee completes at 6.9s and returns to coding loop
    mockDevVideo.currentTime = 6.90;
    studio.handleDevTimeUpdate();
    assert.equal(studio.phase, VideoPhase.CODING);
    assert.equal(mockDevVideo.currentTime, 0.05);

    // 4. Trigger Build & Projects
    studio.triggerBuild('projects');
    assert.equal(studio.phase, VideoPhase.BUILD);
    assert.equal(mockModal.openedSection, 'projects');

    // 4b. Trigger Tech Stack Hologram
    studio.triggerHologram('skills');
    assert.equal(studio.phase, VideoPhase.BUILD);
    assert.equal(mockModal.openedSection, 'skills');

    // 5. Trigger Relax & Profile
    studio.triggerRelax();
    assert.equal(studio.phase, VideoPhase.RELAX);
    assert.equal(mockModal.openedSection, 'about');

    // 6. Audio Toggle
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

  it('should loop coding phase seamlessly at 2.85s boundary without jumping into coffee', () => {
    const mockDevVideo = {
      currentTime: 2.88,
      play: async () => {},
    };
    const studio = new LivingVideoStudio(null);
    studio.devVideoEl = mockDevVideo;
    studio.phase = VideoPhase.CODING;

    studio.handleDevTimeUpdate();
    assert.equal(mockDevVideo.currentTime, 0.05);
  });

  it('should loop cat sleep phase seamlessly at 1.85s boundary without jumping into wake', () => {
    const mockCatVideo = {
      currentTime: 1.88,
      play: async () => {},
    };
    const studio = new LivingVideoStudio(null);
    studio.catVideoEl = mockCatVideo;
    studio.catPhase = 'SLEEP';

    studio.handleCatTimeUpdate();
    assert.equal(mockCatVideo.currentTime, 0.05);
  });
});
