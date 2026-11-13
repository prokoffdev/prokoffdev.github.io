import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StateMachine } from '../src/studio/entities/StateMachine.js';

describe('StateMachine Core Unit Tests', () => {
  const transitions = [
    { from: 'typing', event: 'USER_START_MOVE', to: 'stand_up', then: 'walk' },
    { from: 'stand_up', event: 'ANIMATION_COMPLETE', to: 'idle' },
    { from: 'idle', event: 'WALK', to: 'walk' },
    { from: 'walk', event: 'PATH_COMPLETE', to: 'idle' },
    { from: 'idle', event: 'INTERACT', to: 'interact' },
    { from: 'interact', event: 'ANIMATION_COMPLETE', to: 'idle' },
  ];

  const statesConfig = {
    typing: { interruptible: true },
    stand_up: { interruptible: false },
    walk: { interruptible: true },
    idle: { interruptible: true },
    interact: { interruptible: false },
  };

  it('should initialize with starting state', () => {
    const fsm = new StateMachine('typing', transitions, statesConfig);
    assert.equal(fsm.currentState, 'typing');
    assert.equal(fsm.is('typing'), true);
  });

  it('should correctly transition when valid event is dispatched', () => {
    const fsm = new StateMachine('idle', transitions, statesConfig);
    const ok = fsm.dispatch('WALK');
    assert.equal(ok, true);
    assert.equal(fsm.currentState, 'walk');
    assert.equal(fsm.previousState, 'idle');
  });

  it('should refuse transition when event does not match current state', () => {
    const fsm = new StateMachine('idle', transitions, statesConfig);
    const ok = fsm.dispatch('PATH_COMPLETE'); // only valid from 'walk'
    assert.equal(ok, false);
    assert.equal(fsm.currentState, 'idle');
  });

  it('should respect non-interruptible states unless forced or ANIMATION_COMPLETE', () => {
    const fsm = new StateMachine('interact', transitions, statesConfig);
    assert.equal(fsm.isInterruptible(), false);

    // Try normal interrupt event
    const ok1 = fsm.dispatch('WALK');
    assert.equal(ok1, false);
    assert.equal(fsm.currentState, 'interact');

    // ANIMATION_COMPLETE is allowed
    const ok2 = fsm.dispatch('ANIMATION_COMPLETE');
    assert.equal(ok2, true);
    assert.equal(fsm.currentState, 'idle');
  });

  it('should emit chain event when transition rule defines a chained action', () => {
    const fsm = new StateMachine('typing', transitions, statesConfig);
    let chainedAction = null;

    fsm.on('chain', ({ then }) => {
      chainedAction = then;
    });

    fsm.dispatch('USER_START_MOVE');
    assert.equal(fsm.currentState, 'stand_up');
    assert.equal(chainedAction, 'walk');
  });

  it('should allow forceState override', () => {
    const fsm = new StateMachine('typing', transitions, statesConfig);
    fsm.forceState('idle');
    assert.equal(fsm.currentState, 'idle');
  });
});
