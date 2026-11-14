import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VideoPhase, LivingVideoStudio } from '../src/studio/video/LivingVideoStudio.js';
import { StudioDisplayMode } from '../src/studio/core/StudioBootstrap.js';

describe('Living Video Diorama & Phase Control Tests', () => {
  it('should define all 4 interactive video phases correctly', () => {
    assert.equal(VideoPhase.CODING, 'CODING');
    assert.equal(VideoPhase.COFFEE, 'COFFEE');
    assert.equal(VideoPhase.BUILD, 'BUILD');
    assert.equal(VideoPhase.RELAX, 'RELAX');
    assert.equal(Object.keys(VideoPhase).length, 4);
  });

  it('should define StudioDisplayMode enum with VIDEO and CANVAS', () => {
    assert.equal(StudioDisplayMode.VIDEO, 'video');
    assert.equal(StudioDisplayMode.CANVAS, 'canvas');
  });

  it('should instantiate safely in non-browser (Node) environment without crashing', () => {
    const studio = new LivingVideoStudio(null);
    assert.equal(studio.phase, VideoPhase.CODING);
    assert.equal(studio.isMuted, true);
    assert.equal(studio.videoEl, null);
  });

  it('should manage phase transitions and video scrubbing logic', () => {
    // Mock video element and container
    const mockVideo = {
      currentTime: 0,
      muted: true,
      paused: false,
      play: async () => {},
      pause: () => { mockVideo.paused = true; },
      addEventListener: () => {},
      removeEventListener: () => {},
    };

    const mockModal = {
      openedSection: null,
      open: (s) => { mockModal.openedSection = s; },
      close: () => { mockModal.openedSection = null; },
    };

    const studio = new LivingVideoStudio(null);
    studio.videoEl = mockVideo;
    studio.contentPanel = mockModal;

    // 1. Initial State
    assert.equal(studio.phase, VideoPhase.CODING);

    // 2. Trigger Coffee (only on button / hotspot click)
    studio.triggerCoffee();
    assert.equal(studio.phase, VideoPhase.COFFEE);
    assert.equal(mockVideo.currentTime, 2.65);

    // Coffee completes at 3.6s and returns to coding loop
    mockVideo.currentTime = 3.65;
    studio.handleTimeUpdate();
    assert.equal(studio.phase, VideoPhase.CODING);
    assert.equal(mockVideo.currentTime, 0.05);

    // 3. Trigger Build & Projects
    studio.triggerBuild();
    assert.equal(studio.phase, VideoPhase.BUILD);
    assert.equal(mockVideo.currentTime, 3.85);

    mockVideo.currentTime = 5.85;
    studio.handleTimeUpdate();
    assert.equal(mockModal.openedSection, 'projects');
    assert.equal(mockVideo.paused, true);

    // 4. Trigger Relax & Profile
    studio.triggerRelax();
    assert.equal(studio.phase, VideoPhase.RELAX);
    assert.equal(mockVideo.currentTime, 5.85);

    mockVideo.currentTime = 7.4;
    studio.handleTimeUpdate();
    assert.equal(mockModal.openedSection, 'about');

    // 5. Audio Toggle
    assert.equal(studio.isMuted, true);
    studio.toggleSound();
    assert.equal(studio.isMuted, false);
    assert.equal(mockVideo.muted, false);
    studio.toggleSound();
    assert.equal(studio.isMuted, true);
    assert.equal(mockVideo.muted, true);
  });

  it('should loop coding phase seamlessly at 2.4s boundary without drinking coffee', () => {
    const mockVideo = {
      currentTime: 2.42,
      play: async () => {},
    };
    const studio = new LivingVideoStudio(null);
    studio.videoEl = mockVideo;
    studio.phase = VideoPhase.CODING;

    studio.handleTimeUpdate();
    assert.equal(mockVideo.currentTime, 0.05);
  });
});
