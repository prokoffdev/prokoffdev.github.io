/**
 * Generic Finite State Machine (FSM) for studio entities.
 * Supports events, state entry/exit lifecycle, guards, and transition validation.
 */
export class StateMachine {
  /**
   * @param {string} initialState
   * @param {Array<object>} transitions - List of transition rules { from, event, to, guard, then, then_state }
   * @param {object} [statesConfig={}] - Detailed config per state { interruptible, exit }
   */
  constructor(initialState, transitions = [], statesConfig = {}) {
    this.currentState = initialState;
    this.previousState = null;
    this.transitions = transitions;
    this.statesConfig = statesConfig;
    this.listeners = new Map();
    this.history = [initialState];
  }

  /**
   * Checks if the entity is currently in the specified state.
   * @param {string} state
   * @returns {boolean}
   */
  is(state) {
    return this.currentState === state;
  }

  /**
   * Checks whether the current state allows interruptions.
   * @returns {boolean}
   */
  isInterruptible() {
    const cfg = this.statesConfig[this.currentState];
    return cfg ? cfg.interruptible !== false : true;
  }

  /**
   * Finds matching transition for the current state and event.
   * @param {string} event
   * @returns {object|null}
   */
  findTransition(event) {
    return this.transitions.find(t => {
      const matchFrom = Array.isArray(t.from)
        ? t.from.includes(this.currentState)
        : t.from === '*' || t.from === this.currentState;
      return matchFrom && t.event === event;
    }) || null;
  }

  /**
   * Triggers an event and executes valid state transition.
   *
   * @param {string} event
   * @param {*} [payload=null]
   * @returns {boolean} Whether transition succeeded
   */
  dispatch(event, payload = null) {
    const rule = this.findTransition(event);
    if (!rule) {
      return false;
    }

    if (rule.guard && !rule.guard(payload, this)) {
      return false;
    }

    const fromState = this.currentState;
    const toState = rule.to;

    if (!this.isInterruptible() && event !== 'ANIMATION_COMPLETE' && event !== 'FORCE_STOP') {
      return false;
    }

    this.emit(`exit:${fromState}`, { from: fromState, to: toState, event, payload });
    this.previousState = fromState;
    this.currentState = toState;
    this.history.push(toState);
    if (this.history.length > 20) {
      this.history.shift();
    }

    this.emit(`enter:${toState}`, { from: fromState, to: toState, event, payload, rule });
    this.emit('transition', { from: fromState, to: toState, event, payload, rule });

    // Handle chained transitions (e.g. "then": "walk")
    if (rule.then) {
      this.emit('chain', { then: rule.then, then_state: rule.then_state, payload });
    }

    return true;
  }

  /**
   * Directly sets the state, bypassing standard event transition checks.
   * @param {string} state
   * @param {*} [payload=null]
   */
  forceState(state, payload = null) {
    const fromState = this.currentState;
    this.emit(`exit:${fromState}`, { from: fromState, to: state, event: 'FORCE', payload });
    this.previousState = fromState;
    this.currentState = state;
    this.emit(`enter:${state}`, { from: fromState, to: state, event: 'FORCE', payload });
    this.emit('transition', { from: fromState, to: state, event: 'FORCE', payload });
  }

  /**
   * Subscribes to an event or state change.
   * @param {string} eventName
   * @param {Function} callback
   */
  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(callback);
    return () => this.off(eventName, callback);
  }

  /**
   * Unsubscribes from an event.
   * @param {string} eventName
   * @param {Function} callback
   */
  off(eventName, callback) {
    const set = this.listeners.get(eventName);
    if (set) {
      set.delete(callback);
    }
  }

  /**
   * Emits an event to registered listeners.
   * @param {string} eventName
   * @param {*} data
   */
  emit(eventName, data) {
    const set = this.listeners.get(eventName);
    if (set) {
      set.forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[StateMachine] Error in listener for ${eventName}:`, err);
        }
      });
    }
  }
}
