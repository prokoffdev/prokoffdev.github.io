import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Avatar } from '../src/studio/entities/Avatar.js';
import { IsoGrid } from '../src/studio/core/IsoGrid.js';
import { CollisionGrid } from '../src/studio/navigation/CollisionGrid.js';
import { PathFinder } from '../src/studio/navigation/PathFinder.js';
import collisionMapData from '../src/data/studio/collision-map.json' with { type: 'json' };

describe('Avatar (CHR-001) Entity & FSM Tests', () => {
  function createTestAvatar() {
    const isoGrid = new IsoGrid();
    const collisionGrid = new CollisionGrid(collisionMapData);
    const pathFinder = new PathFinder(collisionGrid, isoGrid);
    const avatar = new Avatar(null, isoGrid, pathFinder, 14, 6);
    return { avatar, isoGrid, pathFinder, collisionGrid };
  }

  it('should initialize at reserved workstation chair [14, 6] in typing state', () => {
    const { avatar } = createTestAvatar();
    assert.equal(avatar.currentCol, 14);
    assert.equal(avatar.currentRow, 6);
    assert.equal(avatar.fsm.currentState, 'typing');
    assert.equal(avatar.currentDirection, 'desk_facing');
    assert.equal(avatar.isMoving, false);
  });

  it('should calculate correct cardinal isometric direction from grid movement', () => {
    const { avatar } = createTestAvatar();

    // Moving +col, +row (+screen Y) -> iso_se
    avatar.updateDirection(1, 1);
    assert.equal(avatar.currentDirection, 'iso_se');

    // Moving -col, -row (-screen Y) -> iso_nw
    avatar.updateDirection(-1, -1);
    assert.equal(avatar.currentDirection, 'iso_nw');

    // Moving +col, -row (+screen X) -> iso_ne
    avatar.updateDirection(1, -1);
    assert.equal(avatar.currentDirection, 'iso_ne');

    // Moving -col, +row (-screen X) -> iso_sw
    avatar.updateDirection(-1, 1);
    assert.equal(avatar.currentDirection, 'iso_sw');
  });

  it('should transition to stand_up and initiate movement on moveTo', () => {
    const { avatar } = createTestAvatar();
    const walkableTarget = [12, 6];

    let arrivalCalled = false;
    const ok = avatar.moveTo(walkableTarget[0], walkableTarget[1], () => {
      arrivalCalled = true;
    });

    assert.equal(ok, true);
    assert.equal(avatar.fsm.currentState, 'stand_up');
    assert.ok(avatar.path.length > 0);

    // Simulate delayed stand_up finishing -> walk
    avatar.fsm.forceState('walk');
    avatar.isMoving = true;

    // Simulate 2 seconds of movement (speed is 2.7 tiles/s, distance is 2 tiles)
    for (let i = 0; i < 20; i++) {
      avatar.update(i * 100, 100);
    }

    assert.equal(avatar.currentCol, 12);
    assert.equal(avatar.currentRow, 6);
    assert.equal(avatar.isMoving, false);
    assert.equal(avatar.fsm.currentState, 'idle');
    assert.equal(arrivalCalled, true);
  });

  it('should trigger interaction gesture and return to idle', () => {
    const { avatar } = createTestAvatar();
    avatar.fsm.forceState('idle');

    let completed = false;
    avatar.interact(() => {
      completed = true;
    });

    assert.equal(avatar.fsm.currentState, 'idle');
    assert.equal(completed, true);
  });
});
