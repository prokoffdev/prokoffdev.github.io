import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RoboCat } from '../src/studio/entities/RoboCat.js';
import { Avatar } from '../src/studio/entities/Avatar.js';
import { CompanionController } from '../src/studio/entities/CompanionController.js';
import { IsoGrid } from '../src/studio/core/IsoGrid.js';
import { CollisionGrid } from '../src/studio/navigation/CollisionGrid.js';
import { PathFinder } from '../src/studio/navigation/PathFinder.js';
import { HotspotManager } from '../src/studio/interactions/HotspotManager.js';
import collisionMapData from '../src/data/studio/collision-map.json' with { type: 'json' };
import hotspotsData from '../src/data/studio/hotspots.json' with { type: 'json' };

describe('RoboCat (PET-001) Companion & Controller Tests', () => {
  function createTestEnvironment() {
    const isoGrid = new IsoGrid();
    const collisionGrid = new CollisionGrid(collisionMapData);
    const pathFinder = new PathFinder(collisionGrid);
    const hotspotManager = new HotspotManager(hotspotsData, isoGrid);

    const avatar = new Avatar(null, isoGrid, pathFinder, 14, 6);
    const roboCat = new RoboCat(null, isoGrid, pathFinder, 18, 9);
    const companionController = new CompanionController(roboCat, avatar, hotspotManager);

    return { roboCat, avatar, companionController, pathFinder, isoGrid };
  }

  it('should initialize at bed cushion [18, 9] in sleep state', () => {
    const { roboCat } = createTestEnvironment();
    assert.equal(roboCat.currentCol, 18);
    assert.equal(roboCat.currentRow, 9);
    assert.equal(roboCat.fsm.currentState, 'sleep');
    assert.equal(roboCat.isFollowing, false);
  });

  it('should wake up and react on user prompt', () => {
    const { roboCat } = createTestEnvironment();
    roboCat.wakeUp();
    assert.equal(roboCat.fsm.currentState, 'idle');

    roboCat.react();
    assert.equal(roboCat.fsm.currentState, 'idle');
  });

  it('should activate holographic assist mode and return to idle', () => {
    const { roboCat } = createTestEnvironment();
    let assistDone = false;
    roboCat.assist(() => {
      assistDone = true;
    });

    assert.equal(assistDone, true);
    assert.equal(roboCat.fsm.currentState, 'idle');
  });

  it('should toggle follow state and wake up when follow is enabled', () => {
    const { companionController, roboCat } = createTestEnvironment();
    assert.equal(roboCat.isFollowing, false);

    const isFollowing = companionController.toggleFollow();
    assert.equal(isFollowing, true);
    assert.equal(roboCat.isFollowing, true);
    assert.equal(roboCat.fsm.currentState, 'idle');

    const toggledOff = companionController.toggleFollow();
    assert.equal(toggledOff, false);
    assert.equal(roboCat.isFollowing, false);
  });

  it('should pause pathfinding when HTML modal opens', () => {
    const { companionController, roboCat } = createTestEnvironment();
    companionController.toggleFollow();
    roboCat.moveTo(15, 8);
    assert.equal(roboCat.isMoving, true);

    companionController.onModalOpened();
    assert.equal(roboCat.isPausedForModal, true);
    assert.equal(roboCat.isMoving, false);

    companionController.onModalClosed();
    assert.equal(roboCat.isPausedForModal, false);
  });
});
