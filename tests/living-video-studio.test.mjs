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

    // 2. Trigger Cat reaction (wakes up, stretches, wags tail, returns to sleep)
    studio.triggerCat();
    assert.equal(studio.phase, VideoPhase.CAT_REACT);
    assert.equal(mockVideo.currentTime, 4.02);

    mockVideo.currentTime = 8.48;
    studio.handleTimeUpdate();
    assert.equal(studio.phase, VideoPhase.CODING);
    assert.equal(mockVideo.currentTime, 0.05);
    assert.equal(mockModal.openedSection, 'assistant-help');

    // 3. Trigger Coffee (only on user trigger)
    studio.triggerCoffee();
    assert.equal(studio.phase, VideoPhase.COFFEE);
    assert.equal(mockVideo.currentTime, 8.52);

    // Coffee completes at 12.5s and returns to coding loop
    mockVideo.currentTime = 12.48;
    studio.handleTimeUpdate();
    assert.equal(studio.phase, VideoPhase.CODING);
    assert.equal(mockVideo.currentTime, 0.05);

    // 4. Trigger Build & Projects (video scrubs to 12.52s and plays hologram animation)
    studio.triggerBuild();
    assert.equal(studio.phase, VideoPhase.BUILD);
    assert.equal(mockVideo.currentTime, 12.52);

    mockVideo.currentTime = 16.48;
    studio.handleTimeUpdate();
    assert.equal(studio.phase, VideoPhase.CODING);
    assert.equal(mockVideo.currentTime, 0.05);
    assert.equal(mockModal.openedSection, 'projects');

    // 5. Trigger Relax & Profile
    studio.triggerRelax();
    assert.equal(studio.phase, VideoPhase.RELAX);
    assert.equal(mockModal.openedSection, 'about');

    // 6. Audio Toggle
    assert.equal(studio.isMuted, true);
    studio.toggleSound();
    assert.equal(studio.isMuted, false);
    assert.equal(mockVideo.muted, false);
    studio.toggleSound();
    assert.equal(studio.isMuted, true);
    assert.equal(mockVideo.muted, true);
  });

  it('should loop coding phase seamlessly at 3.95s boundary without drinking coffee', () => {
    const mockVideo = {
      currentTime: 3.98,
      play: async () => {},
    };
    const studio = new LivingVideoStudio(null);
    studio.videoEl = mockVideo;
    studio.phase = VideoPhase.CODING;

    studio.handleTimeUpdate();
    assert.equal(mockVideo.currentTime, 0.05);
  });
});
