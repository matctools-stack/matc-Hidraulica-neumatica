import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMultiPasteBundle,
  cloneNodeForPlacement,
  pushHistory,
  selectElementsInRect,
  stepRedo,
  stepUndo,
  type HistorySnapshot,
} from './circuitHistory.ts';
import type { CircuitNode, PipeConnection, ValveActuationSide } from '../types/circuit.ts';

const emptyActuation = (overrides?: Partial<ValveActuationSide>): ValveActuationSide => ({
  springReturn: false,
  piloted: false,
  externalFeed: false,
  manual: '',
  mechanical: '',
  electrical: '',
  ...overrides,
});

const sampleNode = (id: string, label: string, x = 100, y = 100): CircuitNode => ({
  id,
  type: 'throttle',
  label,
  x,
  y,
  rotation: 0,
  params: {
    opening: 50,
    valveConfig: {
      leftActuation: emptyActuation({ manual: 'lever' }),
      rightActuation: emptyActuation({ springReturn: true }),
      reversible: false,
      chambers: ['parallel', 'crossed', '', ''],
      initialPosition: 0,
      dominantSide: 'left',
      dominantSignal: false,
      hydraulicResistance: 0.04,
      resistanceUnit: 'mpa_lmin2',
      mirrorHorizontal: false,
      mirrorVertical: false,
    },
  },
});

test('undo and redo restore deep snapshots cleanly without mutating previous states', () => {
  const s0: HistorySnapshot = {
    nodes: [sampleNode('n1', 'Estrangulador 1', 100, 100)],
    pipes: [],
    fluid: 'hydraulic',
  };
  const s1: HistorySnapshot = {
    nodes: [
      sampleNode('n1', 'Estrangulador 1', 100, 100),
      sampleNode('n2', 'Estrangulador 2', 200, 100),
    ],
    pipes: [
      { id: 'p1', fromNodeId: 'n1', fromPortId: 'B', toNodeId: 'n2', toPortId: 'A' },
    ],
    fluid: 'hydraulic',
  };

  let undoStack = pushHistory([], s0);
  let redoStack: HistorySnapshot[] = [];

  const undone = stepUndo(undoStack, redoStack, s1);
  assert.ok(undone);
  assert.equal(undone.nextCurrent.nodes.length, 1);
  assert.equal(undone.nextCurrent.pipes.length, 0);
  assert.equal(undone.undoStack.length, 0);
  assert.equal(undone.redoStack.length, 1);

  undoStack = undone.undoStack;
  redoStack = undone.redoStack;

  const redone = stepRedo(undoStack, redoStack, undone.nextCurrent);
  assert.ok(redone);
  assert.equal(redone.nextCurrent.nodes.length, 2);
  assert.equal(redone.nextCurrent.pipes.length, 1);
  assert.equal(redone.undoStack.length, 1);
  assert.equal(redone.redoStack.length, 0);

  assert.equal(stepRedo(redone.undoStack, redone.redoStack, redone.nextCurrent), null);
});

test('cloneNodeForPlacement deep-clones params and increments copy labels', () => {
  const original = sampleNode('n1', 'Estrangulador 1', 120, 140);
  const existing = [original];

  const copy1 = cloneNodeForPlacement(original, existing, 150, 170, 'n_copy_1');
  assert.equal(copy1.id, 'n_copy_1');
  assert.equal(copy1.label, 'Estrangulador 1 (Cópia)');
  assert.equal(copy1.x, 150);
  assert.equal(copy1.y, 170);

  copy1.params.opening = 15;
  if (copy1.params.valveConfig) {
    copy1.params.valveConfig.mirrorHorizontal = true;
  }
  assert.equal(original.params.opening, 50);
  assert.equal(original.params.valveConfig?.mirrorHorizontal, false);

  const copy2 = cloneNodeForPlacement(copy1, [...existing, copy1], 180, 200, 'n_copy_2');
  assert.equal(copy2.label, 'Estrangulador 1 (Cópia 2)');
});

test('selectElementsInRect selects subset, rotated bboxes, and whole project across reverse drag', () => {
  const n1 = sampleNode('n1', 'N1', 100, 100);
  const n2 = { ...sampleNode('n2', 'N2', 260, 120), rotation: 90 as const };
  const n3 = sampleNode('n3', 'N3', 600, 400);
  const pipes: PipeConnection[] = [
    { id: 'p12', fromNodeId: 'n1', fromPortId: 'B', toNodeId: 'n2', toPortId: 'A' },
    { id: 'p23', fromNodeId: 'n2', fromPortId: 'B', toNodeId: 'n3', toPortId: 'A' },
  ];
  const catalog = { throttle: { width: 80, height: 40 } };

  // Reverse drag (bottom-right to top-left) covering n1 and n2
  const subset = selectElementsInRect(
    [n1, n2, n3],
    pipes,
    { x1: 300, y1: 180, x2: 50, y2: 50 },
    catalog
  );
  assert.deepEqual(subset.nodeIds, ['n1', 'n2']);
  assert.ok(subset.pipeIds.includes('p12'));

  // Full project selection
  const full = selectElementsInRect(
    [n1, n2, n3],
    pipes,
    { x1: 0, y1: 0, x2: 700, y2: 500 },
    catalog
  );
  assert.deepEqual(full.nodeIds, ['n1', 'n2', 'n3']);
  assert.deepEqual(full.pipeIds, ['p12', 'p23']);
});

test('buildMultiPasteBundle remaps internal pipes and offsets waypoints without mutating source', () => {
  const n1 = sampleNode('n1', 'N1', 100, 100);
  const n2 = sampleNode('n2', 'N2', 220, 100);
  const pipes: PipeConnection[] = [
    {
      id: 'p1',
      fromNodeId: 'n1',
      fromPortId: 'B',
      toNodeId: 'n2',
      toPortId: 'A',
      waypoints: [{ x: 160, y: 80 }],
    },
  ];

  const bundle = buildMultiPasteBundle([n1, n2], pipes, [n1, n2], 40, 50);
  assert.equal(bundle.nodes.length, 2);
  assert.equal(bundle.pipes.length, 1);
  assert.notEqual(bundle.nodes[0].id, n1.id);
  assert.notEqual(bundle.nodes[1].id, n2.id);
  assert.equal(bundle.nodes[0].x, 140);
  assert.equal(bundle.nodes[0].y, 150);
  assert.equal(bundle.pipes[0].fromNodeId, bundle.nodes[0].id);
  assert.equal(bundle.pipes[0].toNodeId, bundle.nodes[1].id);
  assert.deepEqual(bundle.pipes[0].waypoints, [{ x: 200, y: 130 }]);
});

