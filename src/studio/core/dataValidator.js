import { COORDINATE_CONTRACT, tileToScreen } from '../config/coordinateContract.js';

/**
 * Validates scene-layout.json against the coordinate contract and schema.
 *
 * @param {object} layout
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSceneLayout(layout) {
  const errors = [];

  if (!layout) {
    return { valid: false, errors: ['Layout object is missing or null'] };
  }

  // 1. Logical Size
  if (layout.logicalSize?.width !== 1600 || layout.logicalSize?.height !== 1000) {
    errors.push(`Invalid logicalSize: expected 1600x1000, got ${layout.logicalSize?.width}x${layout.logicalSize?.height}`);
  }

  // 2. Projection
  const proj = layout.projection;
  if (!proj) {
    errors.push('Missing projection object');
  } else {
    if (proj.tileWidth !== 64 || proj.tileHeight !== 32) {
      errors.push(`Invalid tile dimensions: expected 64x32, got ${proj.tileWidth}x${proj.tileHeight}`);
    }
    if (proj.columns !== 22 || proj.rows !== 14) {
      errors.push(`Invalid grid size: expected 22x14, got ${proj.columns}x${proj.rows}`);
    }
    if (proj.origin?.x !== 680 || proj.origin?.y !== 370) {
      errors.push(`Invalid origin: expected (680, 370), got (${proj.origin?.x}, ${proj.origin?.y})`);
    }
  }

  // 3. Floor corners check against tileToScreen formula
  if (Array.isArray(layout.floorCorners)) {
    layout.floorCorners.forEach((corner) => {
      const [col, row] = corner.tile;
      const expected = tileToScreen(col, row);
      const [actualX, actualY] = corner.screen;
      if (Math.abs(expected.x - actualX) > 1 || Math.abs(expected.y - actualY) > 1) {
        errors.push(`Corner "${corner.name}" at tile [${col},${row}] expected screen (${expected.x}, ${expected.y}) but declared (${actualX}, ${actualY})`);
      }
    });
  } else {
    errors.push('Missing floorCorners array');
  }

  // 4. Placements validation
  if (!Array.isArray(layout.placements)) {
    errors.push('Missing placements array');
  } else {
    const ids = new Set();
    layout.placements.forEach((p) => {
      if (!p.id) errors.push(`Placement missing ID: ${JSON.stringify(p)}`);
      if (ids.has(p.id)) errors.push(`Duplicate placement ID: ${p.id}`);
      ids.add(p.id);

      if (p.tile) {
        const [col, row] = p.tile;
        if (col < 0 || col > 22 || row < 0 || row > 14) {
          errors.push(`Placement ${p.id} tile [${col}, ${row}] out of grid bounds`);
        }
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates collision-map.json dimensions, value ranges, and reserved cells.
 *
 * @param {object} collisionMap
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCollisionMap(collisionMap) {
  const errors = [];

  if (!collisionMap) {
    return { valid: false, errors: ['Collision map object is missing or null'] };
  }

  const grid = collisionMap.grid;
  if (!grid) {
    return { valid: false, errors: ['Missing grid object in collision map'] };
  }

  if (grid.columns !== 22) errors.push(`Expected 22 columns, got ${grid.columns}`);
  if (grid.rows !== 14) errors.push(`Expected 14 rows, got ${grid.rows}`);

  if (!Array.isArray(grid.values)) {
    errors.push('grid.values must be an array');
    return { valid: false, errors };
  }

  if (grid.values.length !== 14) {
    errors.push(`grid.values must contain exactly 14 rows, got ${grid.values.length}`);
  }

  grid.values.forEach((row, rowIndex) => {
    if (!Array.isArray(row)) {
      errors.push(`Row ${rowIndex} is not an array`);
      return;
    }
    if (row.length !== 22) {
      errors.push(`Row ${rowIndex} has length ${row.length}, expected 22`);
    }
    row.forEach((val, colIndex) => {
      if (![0, 1, 2, 3].includes(val)) {
        errors.push(`Invalid cell value at [${colIndex}, ${rowIndex}]: ${val}`);
      }
    });
  });

  // Verify reserved chair tile [14, 6] (col 14, row 6)
  if (grid.values.length === 14 && grid.values[6]?.length === 22) {
    const chairVal = grid.values[6][14];
    if (chairVal !== 3) {
      errors.push(`Expected reserved spawn/chair cell at col 14, row 6 to be value 3, got ${chairVal}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates hotspots.json for unique IDs, shape geometry, and collision integration.
 *
 * @param {object} hotspotsData
 * @param {object} [collisionMap]
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateHotspots(hotspotsData, collisionMap = null) {
  const errors = [];

  if (!hotspotsData || !Array.isArray(hotspotsData.hotspots)) {
    return { valid: false, errors: ['Invalid hotspots data or missing hotspots array'] };
  }

  const REQUIRED_HOTSPOTS = [
    'OBJ_MONITOR',
    'OBJ_PHONE',
    'OBJ_GAMEPAD',
    'OBJ_BOOKSHELF',
    'OBJ_PINBOARD',
    'OBJ_CONTACT',
    'OBJ_AVATAR',
    'OBJ_ROBOCAT',
  ];

  const foundIds = new Set();

  hotspotsData.hotspots.forEach((h) => {
    if (!h.id) errors.push(`Hotspot without ID: ${JSON.stringify(h)}`);
    if (foundIds.has(h.id)) errors.push(`Duplicate hotspot ID: ${h.id}`);
    foundIds.add(h.id);

    // Validate interactionTile
    if (!Array.isArray(h.interactionTile) || h.interactionTile.length !== 2) {
      errors.push(`Hotspot ${h.id} missing valid interactionTile [col, row]`);
    } else {
      const [col, row] = h.interactionTile;
      if (col < 0 || col > 22 || row < 0 || row > 14) {
        errors.push(`Hotspot ${h.id} interactionTile [${col}, ${row}] out of bounds`);
      }
      if (collisionMap?.grid?.values) {
        const cellValue = collisionMap.grid.values[row]?.[col];
        if (cellValue === 1) {
          errors.push(`Hotspot ${h.id} interactionTile [${col}, ${row}] is marked as blocked (1) in collision map`);
        }
      }
    }

    // Validate shape
    if (!h.shape || !h.shape.type) {
      errors.push(`Hotspot ${h.id} missing shape definition`);
    } else if (h.shape.type === 'circle') {
      if (!Array.isArray(h.shape.center) || h.shape.center.length !== 2 || typeof h.shape.radius !== 'number') {
        errors.push(`Hotspot ${h.id} invalid circle shape`);
      }
    } else if (h.shape.type === 'polygon') {
      if (!Array.isArray(h.shape.points) || h.shape.points.length < 3) {
        errors.push(`Hotspot ${h.id} polygon must have at least 3 points`);
      }
    }
  });

  REQUIRED_HOTSPOTS.forEach((reqId) => {
    if (!foundIds.has(reqId)) {
      errors.push(`Missing required hotspot ID: ${reqId}`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Validates character_state_machine.json structure, states, and transition safety.
 *
 * @param {object} smData
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateStateMachine(smData) {
  const errors = [];

  if (!smData) {
    return { valid: false, errors: ['State machine data missing'] };
  }

  ['human', 'robot_cat'].forEach((actorKey) => {
    const actor = smData[actorKey];
    if (!actor) {
      errors.push(`Missing actor config for: ${actorKey}`);
      return;
    }

    if (!actor.states || typeof actor.states !== 'object') {
      errors.push(`Actor ${actorKey} missing states dictionary`);
      return;
    }

    const stateKeys = Object.keys(actor.states);
    if (!actor.default_state || !stateKeys.includes(actor.default_state)) {
      errors.push(`Actor ${actorKey} default_state "${actor.default_state}" not defined in states`);
    }

    if (Array.isArray(actor.transitions)) {
      actor.transitions.forEach((t, idx) => {
        if (!stateKeys.includes(t.from)) {
          errors.push(`Actor ${actorKey} transition ${idx}: "from" state "${t.from}" not recognized`);
        }
        if (!stateKeys.includes(t.to)) {
          errors.push(`Actor ${actorKey} transition ${idx}: "to" state "${t.to}" not recognized`);
        }
      });
    }
  });

  return { valid: errors.length === 0, errors };
}
