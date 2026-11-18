import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_APP_OPTIONS,
  formatTerminalTag,
  getGridStepPx,
  getSimulationSpeedMultiplier,
  isAnySoundEnabled,
  mergeAppOptions,
} from './appOptions';

test('mergeAppOptions falls back cleanly to FluidSIM defaults and migrates legacy fields', () => {
  const fresh = mergeAppOptions(null);
  assert.equal(fresh.simulation.lineColors.noPressure, '#808000');
  assert.equal(fresh.simulation.lineColors.pressureTransmitter, '#800000');
  assert.equal(fresh.opcDde.mode, 'easyport');
  assert.equal(fresh.opcDde.ddeServer, 'FLSIMH');
  assert.equal(fresh.grid.width, 'medium');
  assert.equal(fresh.grid.style, 'line');
  assert.equal(fresh.terminalDiagram.naming, 'x_dash');
  assert.equal(fresh.showComponentLegends, true);

  const migrated = mergeAppOptions({
    simSpeedFactor: 0.25,
    soundEnabled: false,
    snapToGrid: false,
    showComponentLegends: false,
  });
  assert.equal(migrated.simulation.speedMode, 'slow_motion');
  assert.equal(migrated.simulation.slowMotionFactor, 4);
  assert.equal(migrated.sound.switchSound, false);
  assert.equal(migrated.grid.showGrid, false);
  assert.equal(migrated.showComponentLegends, false);
});

test('Simulation speed multiplier, grid spacing, sound check, and terminal formatting work properly', () => {
  assert.equal(getGridStepPx('coarse'), 30);
  assert.equal(getGridStepPx('medium'), 20);
  assert.equal(getGridStepPx('fine'), 10);

  assert.equal(getSimulationSpeedMultiplier(DEFAULT_APP_OPTIONS.simulation), 1);
  assert.equal(
    getSimulationSpeedMultiplier({
      ...DEFAULT_APP_OPTIONS.simulation,
      speedMode: 'continuous',
    }),
    1.5
  );
  assert.equal(
    getSimulationSpeedMultiplier({
      ...DEFAULT_APP_OPTIONS.simulation,
      speedMode: 'slow_motion',
      slowMotionFactor: 4,
    }),
    0.25
  );

  assert.equal(formatTerminalTag(1, 2, 'x_dash'), 'X1-2');
  assert.equal(formatTerminalTag(2, 1, 'prefix_x'), '2X1');

  assert.equal(isAnySoundEnabled(DEFAULT_APP_OPTIONS.sound), true);
  assert.equal(
    isAnySoundEnabled({
      switchSound: false,
      relaySound: false,
      valveSound: false,
      cylinderSound: false,
      buzzerSound: false,
    }),
    false
  );
});
