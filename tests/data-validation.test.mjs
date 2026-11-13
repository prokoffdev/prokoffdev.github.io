import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  validateSceneLayout,
  validateCollisionMap,
  validateHotspots,
  validateStateMachine,
} from '../src/studio/core/dataValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const studioDataDir = path.resolve(__dirname, '../src/data/studio');

const sceneLayout = JSON.parse(fs.readFileSync(path.join(studioDataDir, 'scene-layout.json'), 'utf-8'));
const collisionMap = JSON.parse(fs.readFileSync(path.join(studioDataDir, 'collision-map.json'), 'utf-8'));
const hotspots = JSON.parse(fs.readFileSync(path.join(studioDataDir, 'hotspots.json'), 'utf-8'));
const stateMachine = JSON.parse(fs.readFileSync(path.join(studioDataDir, 'character_state_machine.json'), 'utf-8'));

describe('Studio Data Validation Tests', () => {
  it('should validate scene-layout.json successfully', () => {
    const res = validateSceneLayout(sceneLayout);
    assert.equal(res.valid, true, `Scene layout errors: ${res.errors.join(', ')}`);
    assert.equal(res.errors.length, 0);
  });

  it('should validate collision-map.json grid matrix (14 rows x 22 cols)', () => {
    const res = validateCollisionMap(collisionMap);
    assert.equal(res.valid, true, `Collision map errors: ${res.errors.join(', ')}`);
    assert.equal(res.errors.length, 0);

    // Verify row-major layout
    assert.equal(collisionMap.grid.rows, 14);
    assert.equal(collisionMap.grid.columns, 22);
    assert.equal(collisionMap.grid.values.length, 14);
    collisionMap.grid.values.forEach((r, idx) => {
      assert.equal(r.length, 22, `Row ${idx} must have 22 columns`);
    });

    // Check reserved chair cell [14, 6]
    assert.equal(collisionMap.grid.values[6][14], 3);
  });

  it('should validate hotspots.json with all 8 unique required IDs', () => {
    const res = validateHotspots(hotspots, collisionMap);
    assert.equal(res.valid, true, `Hotspots errors: ${res.errors.join(', ')}`);
    assert.equal(res.errors.length, 0);

    const ids = hotspots.hotspots.map((h) => h.id);
    const uniqueIds = new Set(ids);
    assert.equal(ids.length, 8);
    assert.equal(uniqueIds.size, 8);

    assert.ok(uniqueIds.has('OBJ_MONITOR'));
    assert.ok(uniqueIds.has('OBJ_PHONE'));
    assert.ok(uniqueIds.has('OBJ_GAMEPAD'));
    assert.ok(uniqueIds.has('OBJ_BOOKSHELF'));
    assert.ok(uniqueIds.has('OBJ_PINBOARD'));
    assert.ok(uniqueIds.has('OBJ_CONTACT'));
    assert.ok(uniqueIds.has('OBJ_AVATAR'));
    assert.ok(uniqueIds.has('OBJ_ROBOCAT'));

    // Check robot-cat hotspot specifically
    const roboCat = hotspots.hotspots.find((h) => h.id === 'OBJ_ROBOCAT');
    assert.equal(roboCat.assetId, 'PET-001');
    assert.equal(roboCat.contentKey, 'assistant-help');
    assert.deepEqual(roboCat.anchorTile, [18, 9]);
    assert.deepEqual(roboCat.interactionTile, [18, 9]);
  });

  it('should validate character_state_machine.json actor states and transitions', () => {
    const res = validateStateMachine(stateMachine);
    assert.equal(res.valid, true, `State machine errors: ${res.errors.join(', ')}`);
    assert.equal(res.errors.length, 0);

    // Human checks
    assert.equal(stateMachine.human.default_state, 'typing');
    assert.ok(stateMachine.human.states.typing);
    assert.ok(stateMachine.human.states.stand_up);
    assert.ok(stateMachine.human.states.walk);

    // Robot cat checks
    assert.equal(stateMachine.robot_cat.default_state, 'idle');
    assert.ok(stateMachine.robot_cat.states.sleep);
    assert.ok(stateMachine.robot_cat.states.assist);
    assert.ok(stateMachine.robot_cat.states.react);
  });
});
