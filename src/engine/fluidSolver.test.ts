import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPONENT_CATALOG,
  computeCylinderAreasCm2,
  createDefaultCylinderConfig,
  createDefaultValveConfig,
  createInitialSimulationState,
  evaluateForceProfileN,
  getPipePolylinePoints,
  getValveActuationBehavior,
  hasConfiguredActuatorSide,
  insertComponentIntoPipe,
  isFeedDialogComponent,
  isInteractiveToggleType,
  isLatchingSwitchType,
  isMomentarySwitchType,
  isPropertyDialogComponent,
  moveOrthogonalPipeSegment,
  projectPointOntoPipePolyline,
  splitPipeWithJunction,
  stepFluidSimulation,
} from './fluidSolver';
import { EXTENDED_COMPONENT_SPECS } from '../data/extendedCatalog';
import type { CircuitNode, PipeConnection } from '../types/circuit';

function runSteps(
  nodes: CircuitNode[],
  pipes: PipeConnection[],
  fluid: 'hydraulic' | 'pneumatic',
  steps: number
) {
  let state = createInitialSimulationState(nodes, pipes, fluid, true);
  for (let i = 0; i < steps; i++) {
    state = stepFluidSimulation(state, nodes, pipes, 1 / 30);
  }
  return state;
}

test('4/2 valve extends double-acting cylinder when actuated and retracts at rest', () => {
  const nodes: CircuitNode[] = [
    { id: 'p1', type: 'pump', label: 'Bomba', x: 100, y: 300, rotation: 0, params: { targetPressure: 100, maxFlow: 24 } },
    { id: 't1', type: 'tank', label: 'Tanque', x: 250, y: 380, rotation: 0, params: {} },
    { id: 'v1', type: 'valve_4_2', label: 'V4/2', x: 250, y: 260, rotation: 0, params: { active: true } },
    { id: 'c1', type: 'cylinder_double', label: 'Cilindro', x: 250, y: 120, rotation: 0, params: { boreMm: 50, rodMm: 22, strokeMm: 250, loadN: 400 } },
  ];
  const pipes: PipeConnection[] = [
    { id: 'e1', fromNodeId: 'p1', fromPortId: 'out', toNodeId: 'v1', toPortId: 'P' },
    { id: 'e2', fromNodeId: 'v1', fromPortId: 'T', toNodeId: 't1', toPortId: 'in' },
    { id: 'e3', fromNodeId: 'v1', fromPortId: 'A', toNodeId: 'c1', toPortId: 'A' },
    { id: 'e4', fromNodeId: 'v1', fromPortId: 'B', toNodeId: 'c1', toPortId: 'B' },
  ];

  // Actuated: P->A pressurized, B->T exhaust => cylinder extends toward 1.0
  const extendedState = runSteps(nodes, pipes, 'hydraulic', 90);
  assert.ok(extendedState.nodes['c1'].pistonPos > 0.75, `Expected pistonPos > 0.75, got ${extendedState.nodes['c1'].pistonPos}`);
  assert.ok(extendedState.nodes['c1'].chamberAPressure > 20);

  // Switch spool to rest: P->B, A->T => cylinder retracts toward 0.0
  nodes[2] = { ...nodes[2], params: { active: false } };
  let retractedState = extendedState;
  for (let i = 0; i < 120; i++) {
    retractedState = stepFluidSimulation(retractedState, nodes, pipes, 1 / 30);
  }
  assert.ok(retractedState.nodes['c1'].pistonPos < 0.25, `Expected pistonPos < 0.25, got ${retractedState.nodes['c1'].pistonPos}`);
});

test('check valve allows forward flow and blocks reverse pressure', () => {
  const forwardNodes: CircuitNode[] = [
    { id: 'p1', type: 'compressor', label: 'Comp', x: 0, y: 0, rotation: 0, params: { targetPressure: 8, maxFlow: 120 } },
    { id: 'cv', type: 'check_valve', label: 'Ret', x: 100, y: 0, rotation: 0, params: { crackingPressure: 0.5 } },
    { id: 'th', type: 'throttle', label: 'Carga', x: 160, y: 0, rotation: 0, params: { opening: 40 } },
    { id: 't1', type: 'tank', label: 'Atm', x: 240, y: 0, rotation: 0, params: {} },
  ];
  const forwardPipes: PipeConnection[] = [
    { id: 'e1', fromNodeId: 'p1', fromPortId: 'out', toNodeId: 'cv', toPortId: 'in' },
    { id: 'e2', fromNodeId: 'cv', fromPortId: 'out', toNodeId: 'th', toPortId: 'in' },
    { id: 'e3', fromNodeId: 'th', fromPortId: 'out', toNodeId: 't1', toPortId: 'in' },
  ];

  const fwd = runSteps(forwardNodes, forwardPipes, 'pneumatic', 40);
  assert.ok(fwd.nodes['cv'].portPressures['out'] > 4.0, `Expected forward pressure > 4.0 bar, got ${fwd.nodes['cv'].portPressures['out']}`);
  assert.equal(fwd.nodes['cv'].isOpen, true);

  // Reverse wiring: compressor connected to check_valve 'out' port
  const reversePipes: PipeConnection[] = [
    { id: 'e1', fromNodeId: 'p1', fromPortId: 'out', toNodeId: 'cv', toPortId: 'out' },
    { id: 'e2', fromNodeId: 'cv', fromPortId: 'in', toNodeId: 'th', toPortId: 'in' },
    { id: 'e3', fromNodeId: 'th', fromPortId: 'out', toNodeId: 't1', toPortId: 'in' },
  ];
  const rev = runSteps(forwardNodes, reversePipes, 'pneumatic', 40);
  assert.ok(rev.nodes['cv'].portPressures['in'] < 0.5, `Expected blocked reverse pressure < 0.5 bar, got ${rev.nodes['cv'].portPressures['in']}`);
  assert.equal(rev.nodes['cv'].isOpen, false);
});

test('relief valve opens when system pressure exceeds cracking threshold', () => {
  const nodes: CircuitNode[] = [
    { id: 'p1', type: 'pump', label: 'Bomba', x: 0, y: 0, rotation: 0, params: { targetPressure: 140, maxFlow: 24 } },
    { id: 'rv', type: 'relief_valve', label: 'Alívio', x: 100, y: 0, rotation: 0, params: { crackingPressure: 80 } },
    { id: 't1', type: 'tank', label: 'Tanque', x: 100, y: 100, rotation: 0, params: {} },
  ];
  const pipes: PipeConnection[] = [
    { id: 'e1', fromNodeId: 'p1', fromPortId: 'out', toNodeId: 'rv', toPortId: 'in' },
    { id: 'e2', fromNodeId: 'rv', fromPortId: 'out', toNodeId: 't1', toPortId: 'in' },
  ];

  const state = runSteps(nodes, pipes, 'hydraulic', 30);
  assert.equal(state.nodes['rv'].isOpen, true);
});

test('throttle opening scales flow to motor RPM', () => {
  const makeMotorCircuit = (opening: number) => {
    const nodes: CircuitNode[] = [
      { id: 'p1', type: 'pump', label: 'Bomba', x: 0, y: 0, rotation: 0, params: { targetPressure: 80, maxFlow: 30 } },
      { id: 'th', type: 'throttle', label: 'Restritor', x: 80, y: 0, rotation: 0, params: { opening } },
      { id: 'm1', type: 'motor', label: 'Motor', x: 160, y: 0, rotation: 0, params: { displacementCc: 32, loadNm: 10 } },
      { id: 't1', type: 'tank', label: 'Tanque', x: 240, y: 0, rotation: 0, params: {} },
    ];
    const pipes: PipeConnection[] = [
      { id: 'e1', fromNodeId: 'p1', fromPortId: 'out', toNodeId: 'th', toPortId: 'in' },
      { id: 'e2', fromNodeId: 'th', fromPortId: 'out', toNodeId: 'm1', toPortId: 'A' },
      { id: 'e3', fromNodeId: 'm1', fromPortId: 'B', toNodeId: 't1', toPortId: 'in' },
    ];
    return runSteps(nodes, pipes, 'hydraulic', 30);
  };

  const lowFlow = makeMotorCircuit(15);
  const highFlow = makeMotorCircuit(100);
  assert.ok(highFlow.nodes['m1'].rpm > lowFlow.nodes['m1'].rpm * 2);
});

test('cylinder areas and variable force profile interpolate accurately', () => {
  const areas = computeCylinderAreasCm2(16, 10, 'single', false);
  assert.equal(areas.pistonAreaCm2, 2.01);
  assert.equal(areas.annularAreaCm2, 1.23);

  const cfg = createDefaultCylinderConfig('cylinder_double');
  cfg.forceMode = 'variable';
  cfg.forceProfile = [
    { posMm: 0, forceN: 0 },
    { posMm: 100, forceN: 500 },
    { posMm: 200, forceN: 200 },
  ];
  assert.equal(evaluateForceProfileN(cfg, 0, 50), 250);
  assert.equal(evaluateForceProfileN(cfg, 0, 150), 350);
});

test('orthogonal pipe routing produces axis-aligned segments and drags horizontally/vertically', () => {
  const nodes: CircuitNode[] = [
    { id: 'p1', type: 'pump', label: 'Bomba', x: 100, y: 200, rotation: 0, params: {} },
    { id: 'v1', type: 'valve_4_2', label: 'V4/2', x: 300, y: 320, rotation: 0, params: {} },
  ];
  const pipe: PipeConnection = {
    id: 'pipe1',
    fromNodeId: 'p1',
    fromPortId: 'out',
    toNodeId: 'v1',
    toPortId: 'P',
  };
  const pts = getPipePolylinePoints(pipe, nodes);
  assert.equal(pts.length, 4);
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = Math.abs(pts[i].x - pts[i + 1].x);
    const dy = Math.abs(pts[i].y - pts[i + 1].y);
    assert.ok(dx === 0 || dy === 0, `Segment ${i} is not orthogonal: dx=${dx}, dy=${dy}`);
  }

  // With vertical pump outlet (dx: 0, dy: -24) and valve bottom P port, segment 1 is horizontal.
  // Move segment 1 vertically to y=260.
  const nextWaypoints = moveOrthogonalPipeSegment(pts, 1, 260);
  const movedPipe: PipeConnection = { ...pipe, waypoints: nextWaypoints };
  const movedPts = getPipePolylinePoints(movedPipe, nodes);
  assert.equal(movedPts[1].y, 260);
  assert.equal(movedPts[2].y, 260);
});

test('4/3 center-closed blocks flow in neutral position and shuttle valve selects higher pressure', () => {
  const nodes: CircuitNode[] = [
    { id: 'p1', type: 'pump', label: 'Bomba', x: 0, y: 0, rotation: 0, params: { targetPressure: 90, maxFlow: 24 } },
    { id: 't1', type: 'tank', label: 'Tanque', x: 100, y: 100, rotation: 0, params: {} },
    { id: 'v43', type: 'valve_4_3', label: 'V4/3', x: 100, y: 0, rotation: 0, params: { spoolPosition: 1 } },
    { id: 'sv', type: 'shuttle_valve', label: 'OU', x: 200, y: 0, rotation: 0, params: {} },
    { id: 'g1', type: 'pressure_gauge', label: 'Man', x: 200, y: -80, rotation: 0, params: {} },
  ];
  const pipes: PipeConnection[] = [
    { id: 'e1', fromNodeId: 'p1', fromPortId: 'out', toNodeId: 'v43', toPortId: 'P' },
    { id: 'e2', fromNodeId: 'v43', fromPortId: 'T', toNodeId: 't1', toPortId: 'in' },
    { id: 'e3', fromNodeId: 'v43', fromPortId: 'A', toNodeId: 'sv', toPortId: 'X' },
    { id: 'e4', fromNodeId: 'v43', fromPortId: 'B', toNodeId: 'sv', toPortId: 'Y' },
    { id: 'e5', fromNodeId: 'sv', fromPortId: 'A', toNodeId: 'g1', toPortId: 'in' },
  ];
  const closedState = runSteps(nodes, pipes, 'hydraulic', 25);
  assert.ok(closedState.nodes['g1'].portPressures['in'] < 1);

  // Switch 4/3 to position 2 (parallel: P -> A) -> shuttle OR transmits pressure to gauge
  nodes[2] = { ...nodes[2], params: { spoolPosition: 2 } };
  const openState = runSteps(nodes, pipes, 'hydraulic', 30);
  assert.ok(openState.nodes['g1'].portPressures['in'] > 40);
});

test('custom ValveChamberPattern presets route hydraulic pressure per ISO diagram', () => {
  const buildValveGauge = (pattern: 't_closed_pab' | 'p_to_b_at_closed' | 'a_to_b_pt_closed') => {
    const nodes: CircuitNode[] = [
      { id: 'p1', type: 'pump', label: 'Bomba', x: 0, y: 0, rotation: 0, params: { targetPressure: 80, maxFlow: 20 } },
      { id: 't1', type: 'tank', label: 'Tanque', x: 100, y: 120, rotation: 0, params: {} },
      {
        id: 'v43',
        type: 'valve_4_3',
        label: 'V4/3',
        x: 100,
        y: 0,
        rotation: 0,
        params: {
          spoolPosition: 1,
          valveConfig: {
            chambers: ['crossed', pattern, 'parallel', ''],
            initialPosition: 1,
            reversible: false,
            dominantSide: 'left',
            dominantSignal: false,
            hydraulicResistance: 0.0164,
            resistanceUnit: 'mpa_lmin2',
            mirrorHorizontal: false,
            mirrorVertical: false,
            leftActuation: { springReturn: true, piloted: false, externalFeed: false, manual: '', mechanical: '', electrical: 'solenoid' },
            rightActuation: { springReturn: true, piloted: false, externalFeed: false, manual: '', mechanical: '', electrical: 'solenoid' },
          },
        },
      },
      { id: 'gA', type: 'pressure_gauge', label: 'ManA', x: 180, y: -60, rotation: 0, params: {} },
      { id: 'gB', type: 'pressure_gauge', label: 'ManB', x: 240, y: -60, rotation: 0, params: {} },
    ];
    const pipes: PipeConnection[] = [
      { id: 'e1', fromNodeId: 'p1', fromPortId: 'out', toNodeId: 'v43', toPortId: 'P' },
      { id: 'e2', fromNodeId: 'v43', fromPortId: 'T', toNodeId: 't1', toPortId: 'in' },
      { id: 'e3', fromNodeId: 'v43', fromPortId: 'A', toNodeId: 'gA', toPortId: 'in' },
      { id: 'e4', fromNodeId: 'v43', fromPortId: 'B', toNodeId: 'gB', toPortId: 'in' },
    ];
    return runSteps(nodes, pipes, 'hydraulic', 25);
  };

  // T blocked, P+A+B joined => both A and B receive pump pressure
  const tClosed = buildValveGauge('t_closed_pab');
  assert.ok(tClosed.nodes['gA'].portPressures['in'] > 40);
  assert.ok(tClosed.nodes['gB'].portPressures['in'] > 40);

  // P -> B open; A and T blocked => B receives pressure while A stays near 0
  const pToB = buildValveGauge('p_to_b_at_closed');
  assert.ok(pToB.nodes['gB'].portPressures['in'] > 40);
  assert.ok(pToB.nodes['gA'].portPressures['in'] < 1);

  // A <-> B joined, P and T blocked => neither gauge receives pump pressure
  const abJoined = buildValveGauge('a_to_b_pt_closed');
  assert.ok(abJoined.nodes['gA'].portPressures['in'] < 1);
  assert.ok(abJoined.nodes['gB'].portPressures['in'] < 1);
});

test('two-pressure valve (AND) requires both X and Y inputs pressurized before pressurizing A', () => {
  const nodesSingle: CircuitNode[] = [
    { id: 'c1', type: 'compressor', label: 'Comp', x: 0, y: 0, rotation: 0, params: { targetPressure: 7 } },
    { id: 'and1', type: 'two_pressure_valve', label: 'E', x: 100, y: 0, rotation: 0, params: {} },
    { id: 'g1', type: 'pressure_gauge', label: 'Man', x: 100, y: -80, rotation: 0, params: {} },
  ];
  const pipesOneInput: PipeConnection[] = [
    { id: 'e1', fromNodeId: 'c1', fromPortId: 'out', toNodeId: 'and1', toPortId: 'X' },
    { id: 'e2', fromNodeId: 'and1', fromPortId: 'A', toNodeId: 'g1', toPortId: 'in' },
  ];
  const singleState = runSteps(nodesSingle, pipesOneInput, 'pneumatic', 25);
  assert.ok(singleState.nodes['g1'].portPressures['in'] < 0.5);

  const nodesBoth: CircuitNode[] = [
    ...nodesSingle,
    { id: 'c2', type: 'compressor', label: 'Comp2', x: 200, y: 0, rotation: 0, params: { targetPressure: 5 } },
  ];
  const pipesBothInputs: PipeConnection[] = [
    ...pipesOneInput,
    { id: 'e3', fromNodeId: 'c2', fromPortId: 'out', toNodeId: 'and1', toPortId: 'Y' },
  ];
  const bothState = runSteps(nodesBoth, pipesBothInputs, 'pneumatic', 30);
  assert.ok(bothState.nodes['g1'].portPressures['in'] > 4.0);
});

test('pilot-to-close check valve blocks flow when pilot X is pressurized and opens when pilot is 0', () => {
  const makeCircuit = (pilotBar: number) => {
    const nodes: CircuitNode[] = [
      { id: 'pu', type: 'power_unit', label: 'Grupo', x: 0, y: 0, rotation: 0, params: { targetPressure: 90 } },
      { id: 'pcc', type: 'pilot_check_close', label: 'RetFecha', x: 100, y: 0, rotation: 0, params: { crackingPressure: 2 } },
      { id: 'th', type: 'throttle', label: 'Carga', x: 150, y: 0, rotation: 0, params: { opening: 45 } },
      { id: 't1', type: 'tank', label: 'Tanque', x: 100, y: 80, rotation: 0, params: {} },
      { id: 'dp', type: 'diff_pressure_gauge', label: 'DiffMan', x: 200, y: 0, rotation: 0, params: {} },
      { id: 'px', type: 'power_unit_simple', label: 'Piloto', x: 200, y: -80, rotation: 0, params: { targetPressure: pilotBar } },
    ];
    const pipes: PipeConnection[] = [
      { id: 'e1', fromNodeId: 'pu', fromPortId: 'out', toNodeId: 'pcc', toPortId: 'in' },
      { id: 'e2', fromNodeId: 'pcc', fromPortId: 'out', toNodeId: 'th', toPortId: 'in' },
      { id: 'e2b', fromNodeId: 'th', fromPortId: 'out', toNodeId: 't1', toPortId: 'in' },
      { id: 'e2c', fromNodeId: 'pcc', fromPortId: 'out', toNodeId: 'dp', toPortId: 'p1' },
      { id: 'e3', fromNodeId: 'pu', fromPortId: 'tank', toNodeId: 'dp', toPortId: 'p2' },
      { id: 'e4', fromNodeId: 'px', fromPortId: 'out', toNodeId: 'pcc', toPortId: 'X' },
      { id: 'e5', fromNodeId: 'pu', fromPortId: 'tank', toNodeId: 't1', toPortId: 'in' },
    ];
    return runSteps(nodes, pipes, 'hydraulic', 25);
  };

  const openState = makeCircuit(0);
  assert.equal(openState.nodes['pcc'].isOpen, true);
  assert.ok(openState.nodes['dp'].portPressures['p1'] > 40);

  const closedState = makeCircuit(15);
  assert.equal(closedState.nodes['pcc'].isOpen, false);
  assert.ok(closedState.nodes['dp'].portPressures['p1'] < 5);
});

test('power unit drives rotary actuator angular stroke via 3-way flow control', () => {
  const nodes: CircuitNode[] = [
    { id: 'pu', type: 'power_unit', label: 'Unidade', x: 0, y: 0, rotation: 0, params: { targetPressure: 100 } },
    { id: 'fc', type: 'flow_control_3way', label: 'Reg3V', x: 100, y: 0, rotation: 0, params: { opening: 80 } },
    { id: 'ra', type: 'rotary_actuator', label: 'SemiRot', x: 200, y: 0, rotation: 0, params: { strokeMm: 270 } },
    { id: 'tk', type: 'tank', label: 'Tanque', x: 100, y: 100, rotation: 0, params: {} },
  ];
  const pipes: PipeConnection[] = [
    { id: 'e1', fromNodeId: 'pu', fromPortId: 'out', toNodeId: 'fc', toPortId: 'in' },
    { id: 'e2', fromNodeId: 'fc', fromPortId: 'T', toNodeId: 'tk', toPortId: 'in' },
    { id: 'e3', fromNodeId: 'fc', fromPortId: 'out', toNodeId: 'ra', toPortId: 'A' },
    { id: 'e4', fromNodeId: 'ra', fromPortId: 'B', toNodeId: 'tk', toPortId: 'in' },
  ];
  const state = runSteps(nodes, pipes, 'hydraulic', 40);
  assert.ok(state.nodes['ra'].pistonPos > 0.4, `Expected rotary_actuator pistonPos > 0.4, got ${state.nodes['ra'].pistonPos}`);
});

test('all 111 extended FluidSIM components exist in COMPONENT_CATALOG with valid specs', () => {
  const keys = Object.keys(EXTENDED_COMPONENT_SPECS);
  assert.equal(keys.length, 111);
  for (const key of keys) {
    const item = COMPONENT_CATALOG[key as keyof typeof COMPONENT_CATALOG];
    assert.ok(item, `Missing catalog entry for ${key}`);
    assert.ok(item.width > 0 && item.height > 0, `Invalid dimensions for ${key}`);
    assert.ok(Array.isArray(item.ports), `Missing ports array for ${key}`);
  }
});

test('piloted relief valve, 2-way pressure reducer, and cartridge logic valve simulate accurately', () => {
  const nodes: CircuitNode[] = [
    { id: 'p1', type: 'pump', label: 'Bomba', x: 0, y: 0, rotation: 0, params: { targetPressure: 120, maxFlow: 24 } },
    { id: 'rvp', type: 'relief_valve_piloted', label: 'LimPilot', x: 80, y: 0, rotation: 0, params: { crackingPressure: 90 } },
    { id: 'red', type: 'pressure_reducer_2', label: 'Red2V', x: 160, y: 0, rotation: 0, params: { targetPressure: 45 } },
    { id: 'g1', type: 'pressure_gauge', label: 'ManRed', x: 240, y: 0, rotation: 0, params: {} },
    { id: 'tk', type: 'tank', label: 'Tanque', x: 80, y: 100, rotation: 0, params: {} },
  ];
  const pipes: PipeConnection[] = [
    { id: 'e1', fromNodeId: 'p1', fromPortId: 'out', toNodeId: 'rvp', toPortId: 'in' },
    { id: 'e2', fromNodeId: 'rvp', fromPortId: 'out', toNodeId: 'tk', toPortId: 'in' },
    { id: 'e3', fromNodeId: 'p1', fromPortId: 'out', toNodeId: 'red', toPortId: 'in' },
    { id: 'e4', fromNodeId: 'red', fromPortId: 'out', toNodeId: 'g1', toPortId: 'in' },
  ];

  const state = runSteps(nodes, pipes, 'hydraulic', 30);
  assert.equal(state.nodes['rvp'].isOpen, true);
  assert.ok(
    Math.abs(state.nodes['g1'].portPressures['in'] - 45) < 5,
    `Expected reduced pressure near 45 bar, got ${state.nodes['g1'].portPressures['in']}`
  );

  // Cartridge valve: open when A > X + crackingPressure, closed when pilot X >= A
  const makeCartridge = (pilotBar: number) => {
    const cNodes: CircuitNode[] = [
      { id: 'src', type: 'power_unit_simple', label: 'Fonte', x: 0, y: 0, rotation: 0, params: { targetPressure: 80 } },
      { id: 'plt', type: 'power_unit_simple', label: 'Piloto', x: 0, y: -80, rotation: 0, params: { targetPressure: pilotBar } },
      { id: 'cv', type: 'cartridge_valve_a', label: 'Cartucho', x: 80, y: 0, rotation: 0, params: { crackingPressure: 10 } },
      { id: 'mg', type: 'pressure_gauge', label: 'Man', x: 160, y: 0, rotation: 0, params: {} },
    ];
    const cPipes: PipeConnection[] = [
      { id: 'c1', fromNodeId: 'src', fromPortId: 'out', toNodeId: 'cv', toPortId: 'in' },
      { id: 'c2', fromNodeId: 'plt', fromPortId: 'out', toNodeId: 'cv', toPortId: 'X' },
      { id: 'c3', fromNodeId: 'cv', fromPortId: 'out', toNodeId: 'mg', toPortId: 'in' },
    ];
    return runSteps(cNodes, cPipes, 'hydraulic', 25);
  };

  const openCart = makeCartridge(0);
  assert.equal(openCart.nodes['cv'].isOpen, true);
  assert.ok(openCart.nodes['mg'].portPressures['in'] > 40);

  const closedCart = makeCartridge(95);
  assert.equal(closedCart.nodes['cv'].isOpen, false);
  assert.ok(closedCart.nodes['mg'].portPressures['in'] < 1);
});

test('isFeedDialogComponent matches feed elements while excluding tank, and blindPlug seals port flow', () => {
  assert.equal(isFeedDialogComponent('power_unit_simple'), true);
  assert.equal(isFeedDialogComponent('filter'), true);
  assert.equal(isFeedDialogComponent('accumulator'), true);
  assert.equal(isFeedDialogComponent('pump_variable'), true);
  assert.equal(isFeedDialogComponent('pump'), true);
  assert.equal(isFeedDialogComponent('accumulator_unit'), true);
  assert.equal(isFeedDialogComponent('flexible_hose'), true);
  assert.equal(isFeedDialogComponent('tank'), false);

  const makePumpCircuit = (blindPlug: boolean) => {
    const nodes: CircuitNode[] = [
      {
        id: 'pu',
        type: 'power_unit_simple',
        label: 'Motriz',
        x: 0,
        y: 0,
        rotation: 0,
        params: {
          targetPressure: 60,
          maxFlow: 8,
          internalLeakage: 0,
          portConfigs: blindPlug ? { out: { blindPlug: true } } : undefined,
        },
      },
      { id: 'flt', type: 'filter', label: 'Filtro', x: 80, y: 0, rotation: 0, params: { hydraulicResistance: 0.0001 } },
      { id: 'g', type: 'pressure_gauge', label: 'Man', x: 160, y: 0, rotation: 0, params: {} },
    ];
    const pipes: PipeConnection[] = [
      { id: 'p1', fromNodeId: 'pu', fromPortId: 'out', toNodeId: 'flt', toPortId: 'in' },
      { id: 'p2', fromNodeId: 'flt', fromPortId: 'out', toNodeId: 'g', toPortId: 'in' },
    ];
    return runSteps(nodes, pipes, 'hydraulic', 25);
  };

  const openRes = makePumpCircuit(false);
  assert.ok(openRes.nodes['g'].portPressures['in'] > 50);

  const pluggedRes = makePumpCircuit(true);
  assert.ok(pluggedRes.nodes['g'].portPressures['in'] < 0.5);
  assert.equal(pluggedRes.nodes['pu'].flowLpm, 0);
});

test('isPropertyDialogComponent matches all 33 hydraulic/actuation/pressure/cartridge property components', () => {
  const expected: Array<CircuitNode['type']> = [
    'motor',
    'rotary_actuator',
    'nozzle',
    'throttle',
    'orifice',
    'orifice_adjustable',
    'shutoff_valve',
    'check_throttle',
    'check_valve',
    'check_valve_spring',
    'pilot_check_valve',
    'pilot_check_spring',
    'pilot_check_close',
    'pilot_check_close_spring',
    'flow_control_2way',
    'flow_control_3way',
    'shuttle_valve',
    'two_pressure_valve',
    'flow_divider',
    'relief_valve',
    'relief_valve_piloted',
    'relief_valve_ext',
    'sequence_valve',
    'counterbalance_valve',
    'pressure_reducer_2',
    'pressure_reducer_3',
    'pressure_compensator',
    'pressure_compensator_b',
    'pressure_compensator_c',
    'pressure_compensator_d',
    'cartridge_valve_a',
    'cartridge_valve_b',
    'cartridge_valve_c',
    'prop_valve_4_3',
    'prop_throttle_2_2',
    'servo_valve_4_3',
    'amp_prop_2ch',
    'amp_prop_1ch',
    'prop_relief',
    'prop_relief_piloted',
    'prop_pressure_reducer',
    'prop_solenoid',
  ];
  for (const type of expected) {
    assert.equal(isPropertyDialogComponent(type), true, `Expected ${type} to match isPropertyDialogComponent`);
  }
  assert.equal(isPropertyDialogComponent('tank'), false);
  assert.equal(isPropertyDialogComponent('power_unit_simple'), false);
  assert.equal(isPropertyDialogComponent('cylinder_double'), false);
});

test('hydraulicResistance, areaRatio, nominalFlowLpm, motor params, and rotaryInitialPos govern simulation', () => {
  // 1. hydraulicResistance lowers downstream pressure on nozzle
  const makeNozzle = (hydraulicResistance: number) => {
    const nodes: CircuitNode[] = [
      { id: 'pu', type: 'power_unit_simple', label: 'Motriz', x: 0, y: 0, rotation: 0, params: { targetPressure: 80, maxFlow: 20 } },
      { id: 'nz', type: 'nozzle', label: 'Tobera', x: 80, y: 0, rotation: 0, params: { hydraulicResistance } },
      { id: 'th', type: 'throttle', label: 'Carga', x: 160, y: 0, rotation: 0, params: { opening: 50 } },
      { id: 'tk', type: 'tank', label: 'Tanque', x: 240, y: 0, rotation: 0, params: {} },
    ];
    const pipes: PipeConnection[] = [
      { id: 'p1', fromNodeId: 'pu', fromPortId: 'out', toNodeId: 'nz', toPortId: 'in' },
      { id: 'p2', fromNodeId: 'nz', fromPortId: 'out', toNodeId: 'th', toPortId: 'in' },
      { id: 'p3', fromNodeId: 'th', fromPortId: 'out', toNodeId: 'tk', toPortId: 'in' },
    ];
    return runSteps(nodes, pipes, 'hydraulic', 25);
  };
  const lowRes = makeNozzle(0.001);
  const highRes = makeNozzle(2.0);
  assert.ok(lowRes.nodes['nz'].portPressures['out'] > highRes.nodes['nz'].portPressures['out']);

  // 2. pilot_check_spring areaRatio changes pilot unlock threshold
  const makePilotCheck = (areaRatio: number) => {
    const nodes: CircuitNode[] = [
      { id: 'pu', type: 'power_unit_simple', label: 'Motriz', x: 0, y: 0, rotation: 0, params: { targetPressure: 80 } },
      { id: 'plt', type: 'power_unit_simple', label: 'Piloto', x: 0, y: 80, rotation: 0, params: { targetPressure: 1.5 } },
      {
        id: 'pc',
        type: 'pilot_check_spring',
        label: 'RetPilMola',
        x: 80,
        y: 0,
        rotation: 0,
        params: { crackingPressure: 2.0, areaRatio, hydraulicResistance: 0.01 },
      },
      { id: 'g', type: 'pressure_gauge', label: 'Man', x: 160, y: 0, rotation: 0, params: {} },
    ];
    const pipes: PipeConnection[] = [
      { id: 'p1', fromNodeId: 'pu', fromPortId: 'out', toNodeId: 'pc', toPortId: 'out' },
      { id: 'p2', fromNodeId: 'plt', fromPortId: 'out', toNodeId: 'pc', toPortId: 'X' },
      { id: 'p3', fromNodeId: 'pc', fromPortId: 'in', toNodeId: 'g', toPortId: 'in' },
    ];
    return runSteps(nodes, pipes, 'hydraulic', 20);
  };
  assert.equal(makePilotCheck(1).nodes['pc'].isOpen, false);
  assert.equal(makePilotCheck(10).nodes['pc'].isOpen, true);

  // 3. flow_control_2way nominalFlowLpm caps regulated flow
  const fcNodes: CircuitNode[] = [
    { id: 'pu', type: 'power_unit_simple', label: 'Motriz', x: 0, y: 0, rotation: 0, params: { targetPressure: 100 } },
    { id: 'fc', type: 'flow_control_2way', label: 'Reg2V', x: 80, y: 0, rotation: 0, params: { nominalFlowLpm: 1.5, hydraulicResistance: 0.019 } },
    { id: 'tk', type: 'tank', label: 'Tanque', x: 160, y: 0, rotation: 0, params: {} },
  ];
  const fcPipes: PipeConnection[] = [
    { id: 'p1', fromNodeId: 'pu', fromPortId: 'out', toNodeId: 'fc', toPortId: 'in' },
    { id: 'p2', fromNodeId: 'fc', fromPortId: 'out', toNodeId: 'tk', toPortId: 'in' },
  ];
  const fcState = runSteps(fcNodes, fcPipes, 'hydraulic', 20);
  assert.ok(fcState.nodes['fc'].flowLpm <= 1.51, `Expected flowLpm <= 1.5, got ${fcState.nodes['fc'].flowLpm}`);

  // 4. motor displacementL, frictionCoeff, loadNm alter RPM & drive torque
  const makeMotor = (displacementL: number, frictionCoeff: number, loadNm: number) => {
    const nodes: CircuitNode[] = [
      { id: 'pu', type: 'power_unit_simple', label: 'Motriz', x: 0, y: 0, rotation: 0, params: { targetPressure: 90 } },
      {
        id: 'm1',
        type: 'motor',
        label: 'Hidromotor',
        x: 80,
        y: 0,
        rotation: 0,
        params: { displacementL, frictionCoeff, inertiaKgM2: 0.0001, loadNm },
      },
      { id: 'tk', type: 'tank', label: 'Tanque', x: 160, y: 0, rotation: 0, params: {} },
    ];
    const pipes: PipeConnection[] = [
      { id: 'p1', fromNodeId: 'pu', fromPortId: 'out', toNodeId: 'm1', toPortId: 'A' },
      { id: 'p2', fromNodeId: 'm1', fromPortId: 'B', toNodeId: 'tk', toPortId: 'in' },
    ];
    return runSteps(nodes, pipes, 'hydraulic', 30);
  };
  const fastMotor = makeMotor(0.0082, 0.0128, 0);
  const loadedMotor = makeMotor(0.02, 2.0, 80);
  assert.ok(fastMotor.nodes['m1'].rpm > loadedMotor.nodes['m1'].rpm);

  // 5. rotary_actuator rotaryInitialPos sets initial pistonPos
  const raLeft = createInitialSimulationState(
    [{ id: 'r1', type: 'rotary_actuator', label: 'Semi', x: 0, y: 0, rotation: 0, params: { rotaryInitialPos: 'left' } }],
    [],
    'hydraulic',
    false
  );
  const raRight = createInitialSimulationState(
    [{ id: 'r2', type: 'rotary_actuator', label: 'Semi', x: 0, y: 0, rotation: 0, params: { rotaryInitialPos: 'right' } }],
    [],
    'hydraulic',
    false
  );
  assert.equal(raLeft.nodes['r1'].pistonPos, 0);
  assert.equal(raRight.nodes['r2'].pistonPos, 1);
});

test('pressure and cartridge valve nominal pressure, hydraulicResistance, and active areas govern flow', () => {
  // 1. sequence_valve crackingPressure & hydraulicResistance
  const makeSeq = (crackingPressure: number, hydraulicResistance: number) => {
    const nodes: CircuitNode[] = [
      { id: 'pu', type: 'power_unit_simple', label: 'Motriz', x: 0, y: 0, rotation: 0, params: { targetPressure: 80 } },
      { id: 'sv', type: 'sequence_valve', label: 'Seq', x: 80, y: 0, rotation: 0, params: { crackingPressure, hydraulicResistance } },
      { id: 'th', type: 'throttle', label: 'Carga', x: 160, y: 0, rotation: 0, params: { opening: 40 } },
      { id: 'tk', type: 'tank', label: 'Tanque', x: 240, y: 0, rotation: 0, params: {} },
    ];
    const pipes: PipeConnection[] = [
      { id: 'e1', fromNodeId: 'pu', fromPortId: 'out', toNodeId: 'sv', toPortId: 'in' },
      { id: 'e2', fromNodeId: 'sv', fromPortId: 'out', toNodeId: 'th', toPortId: 'in' },
      { id: 'e3', fromNodeId: 'th', fromPortId: 'out', toNodeId: 'tk', toPortId: 'in' },
    ];
    return runSteps(nodes, pipes, 'hydraulic', 25);
  };
  assert.equal(makeSeq(120, 0.01).nodes['sv'].isOpen, false);
  const seqLowR = makeSeq(40, 0.001);
  const seqHighR = makeSeq(40, 1.5);
  assert.equal(seqLowR.nodes['sv'].isOpen, true);
  assert.ok(seqLowR.nodes['sv'].portPressures['out'] > seqHighR.nodes['sv'].portPressures['out']);

  // 2. pressure_compensator_c crackingPressure & hydraulicResistance
  const makeCompC = (crackingPressure: number, hydraulicResistance: number) => {
    const nodes: CircuitNode[] = [
      { id: 'pu', type: 'power_unit_simple', label: 'Motriz', x: 0, y: 0, rotation: 0, params: { targetPressure: 60 } },
      { id: 'pc', type: 'pressure_compensator_c', label: 'CompC', x: 80, y: 0, rotation: 0, params: { crackingPressure, hydraulicResistance } },
      { id: 'th', type: 'throttle', label: 'Carga', x: 160, y: 0, rotation: 0, params: { opening: 50 } },
      { id: 'tk', type: 'tank', label: 'Tanque', x: 240, y: 0, rotation: 0, params: {} },
    ];
    const pipes: PipeConnection[] = [
      { id: 'e1', fromNodeId: 'pu', fromPortId: 'out', toNodeId: 'pc', toPortId: 'in' },
      { id: 'e2', fromNodeId: 'pc', fromPortId: 'out', toNodeId: 'th', toPortId: 'in' },
      { id: 'e3', fromNodeId: 'th', fromPortId: 'out', toNodeId: 'tk', toPortId: 'in' },
    ];
    return runSteps(nodes, pipes, 'hydraulic', 25);
  };
  assert.equal(makeCompC(100, 0.01).nodes['pc'].isOpen, false);
  const compLowR = makeCompC(10, 0.001);
  const compHighR = makeCompC(10, 1.5);
  assert.equal(compLowR.nodes['pc'].isOpen, true);
  assert.ok(compLowR.nodes['pc'].flowLpm > compHighR.nodes['pc'].flowLpm);

  // 3. cartridge_valve_a one_area vs two_areas with pilot pressure
  const makeCartA = (cartridgeAreaMode: 'one_area' | 'two_areas') => {
    const nodes: CircuitNode[] = [
      { id: 'src', type: 'power_unit_simple', label: 'A', x: 0, y: 0, rotation: 0, params: { targetPressure: 80 } },
      { id: 'plt', type: 'power_unit_simple', label: 'X', x: 0, y: -80, rotation: 0, params: { targetPressure: 65 } },
      {
        id: 'ca',
        type: 'cartridge_valve_a',
        label: 'CartA',
        x: 80,
        y: 0,
        rotation: 0,
        params: {
          cartridgeAreaMode,
          cartridgeAreaACm2: 6,
          cartridgeAreaBCm2: 3,
          crackingPressure: 1,
          hydraulicResistance: 0.001,
        },
      },
      { id: 'g', type: 'pressure_gauge', label: 'Man', x: 160, y: 0, rotation: 0, params: {} },
    ];
    const pipes: PipeConnection[] = [
      { id: 'e1', fromNodeId: 'src', fromPortId: 'out', toNodeId: 'ca', toPortId: 'in' },
      { id: 'e2', fromNodeId: 'plt', fromPortId: 'out', toNodeId: 'ca', toPortId: 'X' },
      { id: 'e3', fromNodeId: 'ca', fromPortId: 'out', toNodeId: 'g', toPortId: 'in' },
    ];
    return runSteps(nodes, pipes, 'hydraulic', 20);
  };
  // one_area uses pA (80 > 65 + 1 => open); two_areas averages A & B (~53.3 < 66 => closed)
  assert.equal(makeCartA('one_area').nodes['ca'].isOpen, true);
  assert.equal(makeCartA('two_areas').nodes['ca'].isOpen, false);

  // 4. cartridge_valve_c cartridgeAreaACm2 & hydraulicResistance govern flow
  const makeCartC = (cartridgeAreaACm2: number, hydraulicResistance: number) => {
    const nodes: CircuitNode[] = [
      { id: 'src', type: 'power_unit_simple', label: 'A', x: 0, y: 0, rotation: 0, params: { targetPressure: 50 } },
      {
        id: 'cc',
        type: 'cartridge_valve_c',
        label: 'CartC',
        x: 80,
        y: 0,
        rotation: 0,
        params: { cartridgeAreaACm2, crackingPressure: 1, hydraulicResistance },
      },
      { id: 'tk', type: 'tank', label: 'T', x: 160, y: 0, rotation: 0, params: {} },
    ];
    const pipes: PipeConnection[] = [
      { id: 'e1', fromNodeId: 'src', fromPortId: 'out', toNodeId: 'cc', toPortId: 'in' },
      { id: 'e2', fromNodeId: 'cc', fromPortId: 'out', toNodeId: 'tk', toPortId: 'in' },
    ];
    return runSteps(nodes, pipes, 'hydraulic', 20);
  };
  const cartCLarge = makeCartC(18, 0.0005);
  const cartCSmall = makeCartC(2, 0.5);
  assert.equal(cartCLarge.nodes['cc'].isOpen, true);
  assert.ok(cartCLarge.nodes['cc'].flowLpm > cartCSmall.nodes['cc'].flowLpm);
});

test('continuous valves default actuation configs and proportional parameters govern simulation', () => {
  const prop43Cfg = createDefaultValveConfig('prop_valve_4_3');
  assert.equal(prop43Cfg.leftActuation.springReturn, true);
  assert.equal(prop43Cfg.leftActuation.electrical, 'solenoid');
  assert.equal(prop43Cfg.rightActuation.springReturn, true);
  assert.equal(prop43Cfg.rightActuation.electrical, 'solenoid');
  assert.equal(prop43Cfg.hydraulicResistance, 0.32);

  const servo43Cfg = createDefaultValveConfig('servo_valve_4_3');
  assert.equal(servo43Cfg.leftActuation.springReturn, true);
  assert.equal(servo43Cfg.leftActuation.electrical, 'solenoid');
  assert.equal(servo43Cfg.rightActuation.springReturn, true);
  assert.equal(servo43Cfg.rightActuation.electrical, '');
  assert.equal(servo43Cfg.hydraulicResistance, 0.32);

  // 1. prop_valve_4_3 rectangular vs triangular & hydraulicResistance
  const makeProp43 = (params: CircuitNode['params']) => {
    const nodes: CircuitNode[] = [
      { id: 'pu', type: 'power_unit_simple', label: 'Motriz', x: 0, y: 0, rotation: 0, params: { targetPressure: 80 } },
      { id: 'pv', type: 'prop_valve_4_3', label: 'Prop43', x: 100, y: 0, rotation: 0, params: { spoolPosition: 2, ...params } },
      { id: 'th', type: 'throttle', label: 'Carga', x: 200, y: 0, rotation: 0, params: { opening: 40 } },
      { id: 'tk', type: 'tank', label: 'Tanque', x: 300, y: 0, rotation: 0, params: {} },
    ];
    const pipes: PipeConnection[] = [
      { id: 'e1', fromNodeId: 'pu', fromPortId: 'out', toNodeId: 'pv', toPortId: 'P' },
      { id: 'e2', fromNodeId: 'pv', fromPortId: 'A', toNodeId: 'th', toPortId: 'in' },
      { id: 'e3', fromNodeId: 'th', fromPortId: 'out', toNodeId: 'tk', toPortId: 'in' },
      { id: 'e4', fromNodeId: 'pv', fromPortId: 'T', toNodeId: 'tk', toPortId: 'in' },
    ];
    return runSteps(nodes, pipes, 'hydraulic', 25);
  };
  const rectLowR = makeProp43({ hydraulicResistance: 0.05, spoolEdgeShape: 'rectangular', spoolOverlapPct: 0, internalLeakage: 0.01 });
  const triHighR = makeProp43({ hydraulicResistance: 2.0, spoolEdgeShape: 'triangular', spoolOverlapPct: 25, internalLeakage: 0.01 });
  assert.ok(rectLowR.nodes['pv'].portPressures['A'] > triHighR.nodes['pv'].portPressures['A']);

  // 2. Centered prop_valve_4_3 with negative overlap allows bypass pressure
  const underlapCenter = makeProp43({ spoolPosition: 1, spoolOverlapPct: -20, hydraulicResistance: 0.32 });
  const positiveCenter = makeProp43({ spoolPosition: 1, spoolOverlapPct: 25, hydraulicResistance: 0.32 });
  assert.ok(underlapCenter.nodes['pv'].portPressures['A'] > positiveCenter.nodes['pv'].portPressures['A']);

  // 3. prop_throttle_2_2 closed with internalLeakage vs tight closed
  const makeProp22 = (internalLeakage: number) => {
    const nodes: CircuitNode[] = [
      { id: 'pu', type: 'power_unit_simple', label: 'Motriz', x: 0, y: 0, rotation: 0, params: { targetPressure: 80 } },
      { id: 'pt', type: 'prop_throttle_2_2', label: 'Prop22', x: 100, y: 0, rotation: 0, params: { active: false, internalLeakage } },
      { id: 'tk', type: 'tank', label: 'Tanque', x: 200, y: 0, rotation: 0, params: {} },
    ];
    const pipes: PipeConnection[] = [
      { id: 'e1', fromNodeId: 'pu', fromPortId: 'out', toNodeId: 'pt', toPortId: 'P' },
      { id: 'e2', fromNodeId: 'pt', fromPortId: 'A', toNodeId: 'tk', toPortId: 'in' },
    ];
    return runSteps(nodes, pipes, 'hydraulic', 20);
  };
  assert.ok(makeProp22(20).nodes['pt'].flowLpm > makeProp22(0).nodes['pt'].flowLpm);

  // 4. prop_relief enforces minPressureBar floor & crackingPressure
  const prNodes: CircuitNode[] = [
    { id: 'pu', type: 'power_unit_simple', label: 'Motriz', x: 0, y: 0, rotation: 0, params: { targetPressure: 8 } },
    { id: 'pr', type: 'prop_relief', label: 'PropLim', x: 100, y: 0, rotation: 0, params: { minPressureBar: 10, crackingPressure: 5, hydraulicResistance: 0.01 } },
    { id: 'tk', type: 'tank', label: 'Tanque', x: 200, y: 0, rotation: 0, params: {} },
  ];
  const prPipes: PipeConnection[] = [
    { id: 'e1', fromNodeId: 'pu', fromPortId: 'out', toNodeId: 'pr', toPortId: 'in' },
    { id: 'e2', fromNodeId: 'pr', fromPortId: 'out', toNodeId: 'tk', toPortId: 'in' },
  ];
  assert.equal(runSteps(prNodes, prPipes, 'hydraulic', 15).nodes['pr'].isOpen, false);
});

test('isPropertyDialogComponent matches all 15 new hydraulic instrument and electrical components', () => {
  const newExpected: Array<CircuitNode['type']> = [
    'pressure_indicator',
    'flow_meter',
    'flow_meter_analog',
    'pressure_switch',
    'pressure_sensor_elec',
    'elec_pressure_switch',
    'elec_pressure_transducer',
    'tachometer_sensor',
    'flow_sensor_elec',
    'elec_flow_transducer',
    'elec_dc_motor',
    'elec_stepper_motor',
    'elec_solenoid_act',
    'elec_func_gen',
    'elec_setpoint_card',
  ];
  for (const type of newExpected) {
    assert.equal(
      isPropertyDialogComponent(type),
      true,
      `Expected ${type} to match isPropertyDialogComponent`
    );
  }
});

test('pressure_indicator, flow_meter accumulated volume, caudal sensors, DC motor, function generator, and setpoint card simulate accurately', () => {
  // 1. pressure_indicator & pressure_switch switching pressure threshold
  const indNodes: CircuitNode[] = [
    { id: 'pu', type: 'power_unit_simple', label: 'Motriz', x: 0, y: 0, rotation: 0, params: { targetPressure: 45 } },
    { id: 'ind_hi', type: 'pressure_indicator', label: 'IndHi', x: 80, y: 0, rotation: 0, params: { crackingPressure: 30, signalColor: '#800000' } },
    { id: 'ind_lo', type: 'pressure_indicator', label: 'IndLo', x: 80, y: 60, rotation: 0, params: { crackingPressure: 60 } },
    { id: 'ps', type: 'elec_pressure_switch', label: 'Pres', x: 160, y: 0, rotation: 0, params: { crackingPressure: 30 } },
  ];
  const indPipes: PipeConnection[] = [
    { id: 'e1', fromNodeId: 'pu', fromPortId: 'out', toNodeId: 'ind_hi', toPortId: 'in' },
    { id: 'e2', fromNodeId: 'pu', fromPortId: 'out', toNodeId: 'ind_lo', toPortId: 'in' },
    { id: 'e3', fromNodeId: 'pu', fromPortId: 'out', toNodeId: 'ps', toPortId: 'in' },
  ];
  const indState = runSteps(indNodes, indPipes, 'hydraulic', 15);
  assert.equal(indState.nodes['ind_hi'].isOpen, true);
  assert.equal(indState.nodes['ind_lo'].isOpen, false);
  assert.equal(indState.nodes['ps'].isOpen, true);

  // 2. flow_meter accumulates volume & responds to hydraulicResistance
  const makeFlowMeter = (hydraulicResistance: number) => {
    const nodes: CircuitNode[] = [
      { id: 'pu', type: 'power_unit_simple', label: 'Motriz', x: 0, y: 0, rotation: 0, params: { targetPressure: 80, maxFlow: 25 } },
      { id: 'fm', type: 'flow_meter', label: 'Vazao', x: 80, y: 0, rotation: 0, params: { hydraulicResistance, flowDisplayMode: 'accumulated' } },
      { id: 'tk', type: 'tank', label: 'Tanque', x: 160, y: 0, rotation: 0, params: {} },
    ];
    const pipes: PipeConnection[] = [
      { id: 'e1', fromNodeId: 'pu', fromPortId: 'out', toNodeId: 'fm', toPortId: 'in' },
      { id: 'e2', fromNodeId: 'fm', fromPortId: 'out', toNodeId: 'tk', toPortId: 'in' },
    ];
    return runSteps(nodes, pipes, 'hydraulic', 30);
  };
  const fmLowR = makeFlowMeter(0.0001);
  const fmHighR = makeFlowMeter(2.0);
  assert.ok((fmLowR.nodes['fm'].accumulatedVolumeL ?? 0) > 0);
  assert.ok(fmLowR.nodes['fm'].flowLpm > fmHighR.nodes['fm'].flowLpm);

  // 3. elec_flow_transducer & flow_sensor_elec RPM scales with displacementL & frictionCoeff
  const caudalNodes: CircuitNode[] = [
    { id: 'pu', type: 'power_unit_simple', label: 'Motriz', x: 0, y: 0, rotation: 0, params: { targetPressure: 80 } },
    { id: 'fs_fast', type: 'flow_sensor_elec', label: 'CaudalFast', x: 80, y: 0, rotation: 0, params: { displacementL: 0.004, frictionCoeff: 0.01, inertiaKgM2: 0.0001 } },
    { id: 'fs_slow', type: 'flow_sensor_elec', label: 'CaudalSlow', x: 80, y: 80, rotation: 0, params: { displacementL: 0.04, frictionCoeff: 0.5, inertiaKgM2: 0.0001 } },
    { id: 'tk', type: 'tank', label: 'Tanque', x: 160, y: 0, rotation: 0, params: {} },
  ];
  const caudalPipes: PipeConnection[] = [
    { id: 'e1', fromNodeId: 'pu', fromPortId: 'out', toNodeId: 'fs_fast', toPortId: 'in' },
    { id: 'e2', fromNodeId: 'fs_fast', fromPortId: 'out', toNodeId: 'tk', toPortId: 'in' },
    { id: 'e3', fromNodeId: 'pu', fromPortId: 'out', toNodeId: 'fs_slow', toPortId: 'in' },
    { id: 'e4', fromNodeId: 'fs_slow', fromPortId: 'out', toNodeId: 'tk', toPortId: 'in' },
  ];
  const caudalState = runSteps(caudalNodes, caudalPipes, 'hydraulic', 30);
  assert.ok(caudalState.nodes['fs_fast'].rpm > caudalState.nodes['fs_slow'].rpm);

  // 4. elec_dc_motor noLoadRpm and loadNm torque derating
  const dcNodes: CircuitNode[] = [
    { id: 'm_free', type: 'elec_dc_motor', label: 'DC1', x: 0, y: 0, rotation: 0, params: { noLoadRpm: 1500, loadNm: 0 } },
    { id: 'm_load', type: 'elec_dc_motor', label: 'DC2', x: 0, y: 80, rotation: 0, params: { noLoadRpm: 1500, loadNm: 15 } },
  ];
  const dcState = runSteps(dcNodes, [], 'hydraulic', 5);
  assert.equal(dcState.nodes['m_free'].rpm, 1500);
  assert.ok(dcState.nodes['m_load'].rpm < dcState.nodes['m_free'].rpm);
  assert.equal(dcState.nodes['m_load'].forceN, 15);

  // 5. elec_func_gen waveforms and elec_setpoint_card active setpoint voltage
  const elecNodes: CircuitNode[] = [
    { id: 'fg_const', type: 'elec_func_gen', label: 'FG1', x: 0, y: 0, rotation: 0, params: { funcGenWaveform: 'constant', funcGenAmpV: 6, funcGenOffsetV: 2 } },
    { id: 'fg_sine', type: 'elec_func_gen', label: 'FG2', x: 80, y: 0, rotation: 0, params: { funcGenWaveform: 'sine', funcGenFreqHz: 1, funcGenAmpV: 10, funcGenOffsetV: 0 } },
    { id: 'sp', type: 'elec_setpoint_card', label: 'SP1', x: 160, y: 0, rotation: 0, params: { setpointValues: [4.5, 8, 0, 0, 0, 0, 0, 0], setpointEnabled: [true, true, false, false, false, false, false, false] } },
  ];
  const elecState = runSteps(elecNodes, [], 'hydraulic', 5);
  assert.equal(elecState.nodes['fg_const'].chamberAPressure, 8);
  assert.ok(elecState.nodes['fg_sine'].chamberAPressure > 0);
  assert.equal(elecState.nodes['sp'].chamberAPressure, 4.5);
});

test('isPropertyDialogComponent and simulation support all 9 electrical relay, solenoid, and starting current limiter components', () => {
  const relayTypes: Array<CircuitNode['type']> = [
    'elec_relay',
    'elec_relay_ton',
    'elec_relay_toff',
    'elec_counter_relay',
    'elec_valve_solenoid',
    'elec_amp_1ch',
    'elec_amp_2ch',
    'elec_prop_solenoid',
    'elec_limiter',
  ];
  for (const type of relayTypes) {
    assert.equal(
      isPropertyDialogComponent(type),
      true,
      `Expected ${type} to match isPropertyDialogComponent`
    );
  }

  // elec_limiter exposes 4 FluidSIM ports (24V, OUT, IN, 0V)
  const limiterPorts = COMPONENT_CATALOG.elec_limiter.ports.map((p) => p.label);
  assert.deepEqual(limiterPorts, ['24V', 'OUT', 'IN', '0V']);

  const nodes: CircuitNode[] = [
    {
      id: 'lim1',
      type: 'elec_limiter',
      label: 'Limitador',
      x: 0,
      y: 0,
      rotation: 0,
      params: { inrushDurationMs: 120, currentLimitA: 3.5 },
    },
    {
      id: 'ton_fast',
      type: 'elec_relay_ton',
      label: 'K1',
      x: 100,
      y: 0,
      rotation: 0,
      params: { active: true, relayDelaySec: 0.1 },
    },
    {
      id: 'ton_slow',
      type: 'elec_relay_ton',
      label: 'K2',
      x: 200,
      y: 0,
      rotation: 0,
      params: { active: true, relayDelaySec: 5 },
    },
    {
      id: 'cnt1',
      type: 'elec_counter_relay',
      label: 'C1',
      x: 300,
      y: 0,
      rotation: 0,
      params: { counterPreset: 12 },
    },
  ];
  const state = runSteps(nodes, [], 'hydraulic', 10);
  assert.equal(state.nodes['lim1'].chamberAPressure, 3.5);
  assert.equal(state.nodes['ton_fast'].isOpen, true);
  assert.equal(state.nodes['ton_slow'].isOpen, false);
  assert.equal(state.nodes['cnt1'].forceN, 12);
});

test('splitPipeWithJunction snaps onto pipe and creates pressurized 3-way compact tee branch', () => {
  const nodes: CircuitNode[] = [
    {
      id: 'pump1',
      type: 'pump',
      label: 'Bomba',
      x: 100,
      y: 300,
      rotation: 0,
      params: { targetPressure: 100 },
    },
    {
      id: 'cyl1',
      type: 'cylinder_single',
      label: 'Cilindro',
      x: 400,
      y: 200,
      rotation: 0,
      params: {},
    },
    {
      id: 'gauge1',
      type: 'pressure_gauge',
      label: 'Manômetro',
      x: 240,
      y: 120,
      rotation: 0,
      params: {},
    },
  ];
  const pipes: PipeConnection[] = [
    {
      id: 'main_pipe',
      fromNodeId: 'pump1',
      fromPortId: 'out',
      toNodeId: 'cyl1',
      toPortId: 'A',
    },
  ];

  const pts = getPipePolylinePoints(pipes[0], nodes);
  assert.ok(pts.length >= 2);
  const midX = (pts[0].x + pts[pts.length - 1].x) / 2;
  const midY = (pts[0].y + pts[pts.length - 1].y) / 2;

  const hit = projectPointOntoPipePolyline(pipes[0], nodes, midX, midY);
  assert.ok(hit);

  const split = splitPipeWithJunction(nodes, pipes, 'gauge1', 'in', 'main_pipe', midX, midY, {
    junctionNodeId: 'junc_1',
    pipeBId: 'pipe_b',
    pipeCId: 'pipe_c',
  });
  assert.equal(split.junctionNodeId, 'junc_1');
  const jNode = split.nodes.find((n) => n.id === 'junc_1');
  assert.ok(jNode);
  assert.equal(jNode.type, 'tee');
  assert.equal(jNode.params.compactJunction, true);
  assert.equal(split.pipes.length, 3);

  const state = runSteps(split.nodes, split.pipes, 'hydraulic', 15);
  assert.ok(state.nodes['gauge1'].portPressures['in'] > 20, 'Branched gauge should see pump pressure');
  assert.ok(state.nodes['cyl1'].pistonPos > 0.1, 'Downstream cylinder should still extend');
});

test('clicking electrical pushbutton energizes solenoid Y1, shifts 4/2 valve and extends cylinder', () => {
  const vCfg = createDefaultValveConfig('valve_4_2');
  vCfg.leftActuation = {
    springReturn: false,
    piloted: false,
    externalFeed: false,
    manual: '',
    mechanical: '',
    electrical: 'solenoid',
    mark: 'Y1',
  };
  vCfg.rightActuation = {
    springReturn: true,
    piloted: false,
    externalFeed: false,
    manual: '',
    mechanical: '',
    electrical: '',
  };

  const baseNodes: CircuitNode[] = [
    { id: 'v24', type: 'elec_24v', label: '+24V', x: 60, y: 80, rotation: 0, params: {} },
    {
      id: 'btn_s1',
      type: 'elec_push_no',
      label: 'S1',
      x: 60,
      y: 160,
      rotation: 0,
      params: { active: false, sensingMark: 'S1' },
    },
    {
      id: 'sol_y1',
      type: 'elec_valve_solenoid',
      label: 'Y1',
      x: 60,
      y: 240,
      rotation: 0,
      params: { sensingMark: 'Y1' },
    },
    { id: 'v0', type: 'elec_0v', label: '0V', x: 60, y: 320, rotation: 0, params: {} },
    { id: 'pump1', type: 'pump', label: 'Bomba', x: 300, y: 320, rotation: 0, params: { targetPressure: 100 } },
    { id: 'tank1', type: 'tank', label: 'Tanque', x: 380, y: 320, rotation: 0, params: {} },
    {
      id: 'v42',
      type: 'valve_4_2',
      label: 'V4/2',
      x: 340,
      y: 220,
      rotation: 0,
      params: { active: false, sensingMark: 'Y1', valveConfig: vCfg },
    },
    { id: 'cyl2', type: 'cylinder_double', label: 'Cilindro', x: 340, y: 100, rotation: 0, params: {} },
  ];

  const pipes: PipeConnection[] = [
    { id: 'e1', fromNodeId: 'v24', fromPortId: 'out', toNodeId: 'btn_s1', toPortId: 'in' },
    { id: 'e2', fromNodeId: 'btn_s1', fromPortId: 'out', toNodeId: 'sol_y1', toPortId: 'in' },
    { id: 'e3', fromNodeId: 'sol_y1', fromPortId: 'out', toNodeId: 'v0', toPortId: 'out' },
    { id: 'h1', fromNodeId: 'pump1', fromPortId: 'out', toNodeId: 'v42', toPortId: 'P' },
    { id: 'h2', fromNodeId: 'v42', fromPortId: 'T', toNodeId: 'tank1', toPortId: 'in' },
    { id: 'h3', fromNodeId: 'v42', fromPortId: 'A', toNodeId: 'cyl2', toPortId: 'A' },
    { id: 'h4', fromNodeId: 'v42', fromPortId: 'B', toNodeId: 'cyl2', toPortId: 'B' },
  ];

  const offState = runSteps(baseNodes, pipes, 'hydraulic', 15);
  assert.equal(offState.nodes['sol_y1'].coilEnergized, false);
  assert.equal(offState.nodes['v42'].activeSpoolPos, 1);
  assert.ok(offState.nodes['cyl2'].pistonPos < 0.05);

  const pressedNodes = baseNodes.map((n) =>
    n.id === 'btn_s1' ? { ...n, params: { ...n.params, active: true } } : n
  );
  const onState = runSteps(pressedNodes, pipes, 'hydraulic', 25);
  assert.equal(onState.nodes['sol_y1'].coilEnergized, true);
  assert.equal(onState.nodes['v42'].activeSpoolPos, 0);
  assert.ok(onState.nodes['cyl2'].pistonPos > 0.25, 'Cylinder should extend when botoeira energizes Y1');
});

test('4/3 and 4/2 valves expose only P (left) and T (right) bottom ports aligned with A/B and route flow in positions 0 and 2', () => {
  for (const type of ['valve_4_2', 'valve_4_3', 'prop_valve_4_3', 'servo_valve_4_3'] as const) {
    const ports = COMPONENT_CATALOG[type].ports;
    const bottomPorts = ports.filter((p) => p.dy > 0);
    const topPorts = ports.filter((p) => p.dy < 0);
    assert.deepEqual(
      bottomPorts.map((p) => p.id),
      ['P', 'T'],
      `${type} must have only P and T bottom ports`
    );
    assert.deepEqual(
      topPorts.map((p) => p.id),
      ['A', 'B'],
      `${type} must have A and B top ports`
    );
    assert.equal(bottomPorts[0].dx, topPorts[0].dx);
    assert.equal(bottomPorts[1].dx, topPorts[1].dx);
    assert.ok(bottomPorts[0].dx < 0 && bottomPorts[1].dx > 0);
  }

  for (const type of ['valve_5_2', 'valve_5_3'] as const) {
    const bottomPorts = COMPONENT_CATALOG[type].ports.filter((p) => p.dy > 0);
    assert.deepEqual(bottomPorts.map((p) => p.id), ['EA', 'P', 'EB']);
  }

  // Verify 4/3 flow routing: position 1 (center closed) holds, position 2 (right actuator pushed left -> parallel) extends, position 0 (left actuator pushed right -> crossed) retracts
  const nodes: CircuitNode[] = [
    { id: 'pump', type: 'pump', label: 'Bomba', x: 0, y: 200, rotation: 0, params: { targetPressure: 100 } },
    { id: 'tank', type: 'tank', label: 'Tanque', x: 80, y: 200, rotation: 0, params: {} },
    { id: 'v43', type: 'valve_4_3', label: 'V4/3', x: 40, y: 120, rotation: 0, params: { spoolPosition: 1 } },
    { id: 'cyl', type: 'cylinder_double', label: 'Cil', x: 40, y: 0, rotation: 0, params: {} },
  ];
  const pipes: PipeConnection[] = [
    { id: 'h1', fromNodeId: 'pump', fromPortId: 'out', toNodeId: 'v43', toPortId: 'P' },
    { id: 'h2', fromNodeId: 'v43', fromPortId: 'T', toNodeId: 'tank', toPortId: 'in' },
    { id: 'h3', fromNodeId: 'v43', fromPortId: 'A', toNodeId: 'cyl', toPortId: 'A' },
    { id: 'h4', fromNodeId: 'v43', fromPortId: 'B', toNodeId: 'cyl', toPortId: 'B' },
  ];

  const centerState = runSteps(nodes, pipes, 'hydraulic', 20);
  assert.equal(centerState.nodes['v43'].activeSpoolPos, 1);
  assert.ok(centerState.nodes['cyl'].pistonPos < 0.05);

  // Right actuator clicked -> spool shifts left -> chamber 2 (parallel: P->A, B->T) extends cylinder
  nodes[2] = { ...nodes[2], params: { spoolPosition: 2 } };
  const extState = runSteps(nodes, pipes, 'hydraulic', 60);
  assert.equal(extState.nodes['v43'].activeSpoolPos, 2);
  assert.ok(extState.nodes['cyl'].pistonPos > 0.5, `Expected extend > 0.5, got ${extState.nodes['cyl'].pistonPos}`);

  // Left actuator clicked -> spool shifts right -> chamber 0 (crossed: P->B, A->T) retracts cylinder
  nodes[2] = { ...nodes[2], params: { spoolPosition: 0 } };
  let retState = extState;
  for (let i = 0; i < 90; i++) {
    retState = stepFluidSimulation(retState, nodes, pipes, 1 / 30);
  }
  assert.equal(retState.nodes['v43'].activeSpoolPos, 0);
  assert.ok(retState.nodes['cyl'].pistonPos < 0.25, `Expected retract < 0.25, got ${retState.nodes['cyl'].pistonPos}`);
});

test('mechanical actuator Marca (Conexão mecânica) links to cylinder Régua de distância actuation labels', () => {
  const vCfg = createDefaultValveConfig('valve_4_2');
  vCfg.leftActuation = {
    springReturn: false,
    piloted: false,
    externalFeed: false,
    manual: '',
    mechanical: 'roller',
    electrical: '',
    mark: '1S1',
  };
  vCfg.rightActuation = {
    springReturn: false,
    piloted: false,
    externalFeed: false,
    manual: '',
    mechanical: 'roller',
    electrical: '',
    mark: '1S2',
  };

  const cylCfg = {
    ...createDefaultCylinderConfig('cylinder_double'),
    initialPosMm: 0,
    movingMassKg: 0,
    staticFriction: 0,
    dynamicFriction: 0,
    internalLeakage: 0,
    forceProfile: [],
    actuationLabels: [
      { mark: '1S1', startMm: '0', endMm: '25' },
      { mark: '1S2', startMm: '185', endMm: '200' },
    ],
  };

  const nodes: CircuitNode[] = [
    { id: 'pump', type: 'pump', label: 'Bomba', x: 0, y: 200, rotation: 0, params: { targetPressure: 100 } },
    { id: 'tank', type: 'tank', label: 'Tanque', x: 80, y: 200, rotation: 0, params: {} },
    {
      id: 'v42',
      type: 'valve_4_2',
      label: 'V4/2',
      x: 40,
      y: 120,
      rotation: 0,
      params: { active: false, sensingMark: '1S1', secondaryMark: '1S2', valveConfig: vCfg },
    },
    {
      id: 'cyl',
      type: 'cylinder_double',
      label: '1A',
      x: 40,
      y: 0,
      rotation: 0,
      params: { strokeMm: 200, cylinderConfig: cylCfg },
    },
  ];
  const pipes: PipeConnection[] = [
    { id: 'h1', fromNodeId: 'pump', fromPortId: 'out', toNodeId: 'v42', toPortId: 'P' },
    { id: 'h2', fromNodeId: 'v42', fromPortId: 'T', toNodeId: 'tank', toPortId: 'in' },
    { id: 'h3', fromNodeId: 'v42', fromPortId: 'A', toNodeId: 'cyl', toPortId: 'A' },
    { id: 'h4', fromNodeId: 'v42', fromPortId: 'B', toNodeId: 'cyl', toPortId: 'B' },
  ];

  // At 0mm (within 0..25mm), mark 1S1 triggers left roller and switches valve to pos 0 (extends cylinder)
  const st1 = runSteps(nodes, pipes, 'pneumatic', 2);
  assert.equal(st1.nodes['v42'].activeSpoolPos, 0);
  assert.ok(st1.nodes['cyl'].chamberAPressure > 10);

  // Starting near full extension (195mm, within 185..200mm), mark 1S2 triggers right roller and shifts valve to pos 1
  const nodesExtended = nodes.map((n) =>
    n.id === 'v42' ? { ...n, params: { ...n.params, active: true } } : n
  );
  let stEnd = createInitialSimulationState(nodesExtended, pipes, 'pneumatic', true);
  stEnd = {
    ...stEnd,
    nodes: {
      ...stEnd.nodes,
      cyl: { ...stEnd.nodes['cyl'], pistonPos: 0.98 },
    },
  };
  stEnd = stepFluidSimulation(stEnd, nodesExtended, pipes, 1 / 30);
  assert.equal(stEnd.nodes['v42'].activeSpoolPos, 1);
});

test('valve_3_2 has 2 bottom ports (P, T) and valve_6_2 routes B<->E + A<->D at rest and B<->E + F<->C when actuated', () => {
  const v32Bottom = COMPONENT_CATALOG.valve_3_2.ports.filter((p) => p.dy > 0).map((p) => p.id);
  const v32Top = COMPONENT_CATALOG.valve_3_2.ports.filter((p) => p.dy < 0).map((p) => p.id);
  assert.deepEqual(v32Bottom, ['P', 'T']);
  assert.deepEqual(v32Top, ['A']);

  const v62Bottom = COMPONENT_CATALOG.valve_6_2.ports.filter((p) => p.dy > 0).map((p) => p.id);
  const v62Top = COMPONENT_CATALOG.valve_6_2.ports.filter((p) => p.dy < 0).map((p) => p.id);
  assert.deepEqual(v62Bottom, ['E', 'A', 'F']);
  assert.deepEqual(v62Top, ['B', 'C', 'D']);

  const nodes: CircuitNode[] = [
    { id: 'srcB', type: 'power_unit_simple', label: 'SrcB', x: 0, y: 0, rotation: 0, params: { targetPressure: 60 } },
    { id: 'srcA', type: 'power_unit_simple', label: 'SrcA', x: 0, y: 120, rotation: 0, params: { targetPressure: 80 } },
    { id: 'srcF', type: 'power_unit_simple', label: 'SrcF', x: 80, y: 120, rotation: 0, params: { targetPressure: 50 } },
    { id: 'v62', type: 'valve_6_2', label: 'V6/2', x: 40, y: 60, rotation: 0, params: { active: false } },
    { id: 'gE', type: 'pressure_gauge', label: 'ManE', x: -40, y: 120, rotation: 0, params: {} },
    { id: 'gC', type: 'pressure_gauge', label: 'ManC', x: 40, y: -40, rotation: 0, params: {} },
    { id: 'gD', type: 'pressure_gauge', label: 'ManD', x: 100, y: -40, rotation: 0, params: {} },
  ];
  const pipes: PipeConnection[] = [
    { id: 'pB', fromNodeId: 'srcB', fromPortId: 'out', toNodeId: 'v62', toPortId: 'B' },
    { id: 'pE', fromNodeId: 'v62', fromPortId: 'E', toNodeId: 'gE', toPortId: 'in' },
    { id: 'pA', fromNodeId: 'srcA', fromPortId: 'out', toNodeId: 'v62', toPortId: 'A' },
    { id: 'pD', fromNodeId: 'v62', fromPortId: 'D', toNodeId: 'gD', toPortId: 'in' },
    { id: 'pF', fromNodeId: 'srcF', fromPortId: 'out', toNodeId: 'v62', toPortId: 'F' },
    { id: 'pC', fromNodeId: 'v62', fromPortId: 'C', toNodeId: 'gC', toPortId: 'in' },
  ];

  // Rest (posIdx=1, right chamber): B<->E (60), A<->D (80), C & F blocked (~0)
  const restState = runSteps(nodes, pipes, 'hydraulic', 15);
  assert.equal(restState.nodes['v62'].activeSpoolPos, 1);
  assert.ok(restState.nodes['gE'].portPressures['in'] > 50);
  assert.ok(restState.nodes['gD'].portPressures['in'] > 70);
  assert.ok(restState.nodes['gC'].portPressures['in'] < 1);

  // Actuated (posIdx=0, left chamber): B<->E (60), F<->C (50), A & D blocked (~0)
  const actNodes = nodes.map((n) => (n.id === 'v62' ? { ...n, params: { active: true } } : n));
  const actState = runSteps(actNodes, pipes, 'hydraulic', 15);
  assert.equal(actState.nodes['v62'].activeSpoolPos, 0);
  assert.ok(actState.nodes['gE'].portPressures['in'] > 50);
  assert.ok(actState.nodes['gC'].portPressures['in'] > 40);
  assert.ok(actState.nodes['gD'].portPressures['in'] < 1);
});

test('getValveActuationBehavior distinguishes spring-return, detent latching button, initialPosition=0, and bistable valves', () => {
  // 1. Default 4/2 valve with momentary button + right spring return
  const vSpringCfg = createDefaultValveConfig('valve_4_2');
  vSpringCfg.leftActuation.manual = 'button';
  vSpringCfg.rightActuation.springReturn = true;
  const vSpring: CircuitNode = {
    id: 'vs1',
    type: 'valve_4_2',
    label: 'V1',
    x: 0,
    y: 0,
    rotation: 0,
    params: { active: false, valveConfig: vSpringCfg },
  };
  const bSpring = getValveActuationBehavior(vSpring, 'left');
  assert.equal(bSpring.isSpringReturn, true);
  assert.equal(bSpring.isDetent, false);
  assert.equal(bSpring.pressPos, 0);
  assert.equal(bSpring.restPos, 1);

  // 2. 4/2 valve with latching pushbutton (button_detent) + right spring return => stays latched
  const vDetentCfg = createDefaultValveConfig('valve_4_2');
  vDetentCfg.leftActuation.manual = 'button_detent';
  vDetentCfg.rightActuation.springReturn = true;
  const vDetent: CircuitNode = {
    id: 'vd1',
    type: 'valve_4_2',
    label: 'V2',
    x: 0,
    y: 0,
    rotation: 0,
    params: { active: false, valveConfig: vDetentCfg },
  };
  const bDetent = getValveActuationBehavior(vDetent, 'left');
  assert.equal(bDetent.isDetent, true);
  assert.equal(bDetent.isSpringReturn, false);
  assert.equal(bDetent.pressPos, 0);
  assert.equal(bDetent.restPos, 1);

  // 3. 4/2 valve with initialPosition=0, left spring return, right momentary button
  const vInit0Cfg = createDefaultValveConfig('valve_4_2');
  vInit0Cfg.initialPosition = 0;
  vInit0Cfg.leftActuation.manual = '';
  vInit0Cfg.leftActuation.springReturn = true;
  vInit0Cfg.rightActuation.springReturn = false;
  vInit0Cfg.rightActuation.manual = 'button';
  const vInit0: CircuitNode = {
    id: 'vi0',
    type: 'valve_4_2',
    label: 'V3',
    x: 0,
    y: 0,
    rotation: 0,
    params: { spoolPosition: 0, active: true, valveConfig: vInit0Cfg },
  };
  const bInit0 = getValveActuationBehavior(vInit0);
  assert.equal(bInit0.isSpringReturn, true);
  assert.equal(bInit0.restPos, 0);
  assert.equal(bInit0.pressPos, 1);

  // 4. Bistable 4/2 valve (no spring return on either side)
  const vBiCfg = createDefaultValveConfig('valve_4_2');
  vBiCfg.leftActuation.manual = 'button';
  vBiCfg.leftActuation.springReturn = false;
  vBiCfg.rightActuation.manual = 'button';
  vBiCfg.rightActuation.springReturn = false;
  const vBi: CircuitNode = {
    id: 'vb1',
    type: 'valve_4_2',
    label: 'V4',
    x: 0,
    y: 0,
    rotation: 0,
    params: { active: false, valveConfig: vBiCfg },
  };
  assert.equal(getValveActuationBehavior(vBi, 'left').isSpringReturn, false);
  assert.equal(getValveActuationBehavior(vBi, 'right').isSpringReturn, false);

  // 5. 4/3 spring-centered valve with detent on left and momentary button on right
  const v43Cfg = createDefaultValveConfig('valve_4_3');
  v43Cfg.leftActuation.manual = 'button_detent';
  v43Cfg.rightActuation.manual = 'button';
  v43Cfg.leftActuation.springReturn = true;
  v43Cfg.rightActuation.springReturn = true;
  const v43: CircuitNode = {
    id: 'v43_mix',
    type: 'valve_4_3',
    label: 'V43',
    x: 0,
    y: 0,
    rotation: 0,
    params: { spoolPosition: 1, valveConfig: v43Cfg },
  };
  const b43Left = getValveActuationBehavior(v43, 'left');
  const b43Right = getValveActuationBehavior(v43, 'right');
  assert.equal(b43Left.isDetent, true);
  assert.equal(b43Left.isSpringReturn, false);
  assert.equal(b43Left.pressPos, 0);
  assert.equal(b43Right.isDetent, false);
  assert.equal(b43Right.isSpringReturn, true);
  assert.equal(b43Right.pressPos, 2);
});

test('spring-return solenoid valve snaps back to initial position when de-energized while bistable double-solenoid valve holds position', () => {
  const buildSolenoidCircuit = (springReturn: boolean, switchActive: boolean) => {
    const vCfg = createDefaultValveConfig('valve_4_2');
    vCfg.leftActuation.manual = '';
    vCfg.leftActuation.electrical = 'solenoid';
    vCfg.leftActuation.mark = 'Y1';
    vCfg.leftActuation.springReturn = false;
    vCfg.rightActuation.springReturn = springReturn;
    vCfg.rightActuation.electrical = springReturn ? '' : 'solenoid';
    vCfg.rightActuation.mark = springReturn ? '' : 'Y2';

    const nodes: CircuitNode[] = [
      { id: 'v24', type: 'elec_24v', label: '+24V', x: 0, y: 0, rotation: 0, params: {} },
      { id: 'sw', type: 'elec_push_no', label: 'S1', x: 60, y: 0, rotation: 0, params: { active: switchActive } },
      { id: 'sol', type: 'elec_valve_solenoid', label: 'Y1', x: 120, y: 0, rotation: 0, params: { sensingMark: 'Y1' } },
      { id: 'v0', type: 'elec_0v', label: '0V', x: 180, y: 0, rotation: 0, params: {} },
      { id: 'v42', type: 'valve_4_2', label: 'V4/2', x: 100, y: 120, rotation: 0, params: { active: false, sensingMark: 'Y1', valveConfig: vCfg } },
    ];
    const pipes: PipeConnection[] = [
      { id: 'e1', fromNodeId: 'v24', fromPortId: 'out', toNodeId: 'sw', toPortId: 'in' },
      { id: 'e2', fromNodeId: 'sw', fromPortId: 'out', toNodeId: 'sol', toPortId: 'in' },
      { id: 'e3', fromNodeId: 'sol', fromPortId: 'out', toNodeId: 'v0', toPortId: 'out' },
    ];
    return { nodes, pipes };
  };

  // Spring-return valve: energize Y1 -> shifts to 0; de-energize Y1 -> spring returns to 1
  const springOn = buildSolenoidCircuit(true, true);
  let stSpring = createInitialSimulationState(springOn.nodes, springOn.pipes, 'hydraulic', true);
  stSpring = stepFluidSimulation(stSpring, springOn.nodes, springOn.pipes, 1 / 30);
  stSpring = stepFluidSimulation(stSpring, springOn.nodes, springOn.pipes, 1 / 30);
  assert.equal(stSpring.nodes['v42'].activeSpoolPos, 0);

  const springOff = buildSolenoidCircuit(true, false);
  stSpring = stepFluidSimulation(stSpring, springOff.nodes, springOff.pipes, 1 / 30);
  assert.equal(stSpring.nodes['v42'].activeSpoolPos, 1);

  // Bistable double-solenoid valve (no spring): energize Y1 -> shifts to 0; de-energize Y1 -> remembers pos 0
  const biOn = buildSolenoidCircuit(false, true);
  let stBi = createInitialSimulationState(biOn.nodes, biOn.pipes, 'hydraulic', true);
  stBi = stepFluidSimulation(stBi, biOn.nodes, biOn.pipes, 1 / 30);
  stBi = stepFluidSimulation(stBi, biOn.nodes, biOn.pipes, 1 / 30);
  assert.equal(stBi.nodes['v42'].activeSpoolPos, 0);

  const biOff = buildSolenoidCircuit(false, false);
  stBi = stepFluidSimulation(stBi, biOff.nodes, biOff.pipes, 1 / 30);
  assert.equal(stBi.nodes['v42'].activeSpoolPos, 0);
});

test('momentary pushbuttons, latching switches, and interactive toggle switch helpers classify switch types accurately', () => {
  assert.equal(isInteractiveToggleType('elec_push_no'), true);
  assert.equal(isInteractiveToggleType('elec_switch_no'), true);
  assert.equal(isInteractiveToggleType('ladder_push_nc'), true);
  assert.equal(isInteractiveToggleType('valve_4_2'), false);

  assert.equal(isMomentarySwitchType('elec_push_no'), true);
  assert.equal(isMomentarySwitchType('elec_push_nc'), true);
  assert.equal(isMomentarySwitchType('ladder_push_co'), true);
  assert.equal(isMomentarySwitchType('elec_switch_no'), false);

  assert.equal(isLatchingSwitchType('elec_switch_no'), true);
  assert.equal(isLatchingSwitchType('elec_switch_nc'), true);
  assert.equal(isLatchingSwitchType('elec_switch_co'), true);
  assert.equal(isLatchingSwitchType('elec_push_no'), false);
});

test('insertComponentIntoPipe creates compact T-junction dot for 1-port pressure gauge and propagates pressure', () => {
  const nodes: CircuitNode[] = [
    { id: 'p1', type: 'pump', label: 'Bomba', x: 100, y: 200, rotation: 0, params: { targetPressure: 100 } },
    { id: 'v1', type: 'valve_4_2', label: 'V4/2', x: 400, y: 200, rotation: 0, params: { active: false } },
    // Drop a Manômetro directly onto the middle of the horizontal pipe at (250, 200)
    { id: 'g1', type: 'pressure_gauge', label: 'Manômetro P', x: 250, y: 200, rotation: 0, params: {} },
  ];
  const pipes: PipeConnection[] = [
    { id: 'main_line', fromNodeId: 'p1', fromPortId: 'out', toNodeId: 'v1', toPortId: 'P' },
  ];

  const res = insertComponentIntoPipe(nodes, pipes, 'g1', {
    ids: { junctionNodeId: 'j_auto', pipeBId: 'p_auto_b', pipeCId: 'p_auto_c' },
  });
  assert.equal(res.connected, true);
  assert.equal(res.mode, 'tap');
  assert.equal(res.junctionNodeId, 'j_auto');

  const jNode = res.nodes.find((n) => n.id === 'j_auto');
  assert.ok(jNode);
  assert.equal(jNode.type, 'tee');
  assert.equal(jNode.params.compactJunction, true);

  // Gauge body should be offset cleanly above the horizontal pipe so it does not cover the line
  const gNode = res.nodes.find((n) => n.id === 'g1');
  assert.ok(gNode);
  assert.ok(gNode.y < jNode.y, `Expected gauge y (${gNode.y}) above junction y (${jNode.y})`);

  // Simulation should propagate pump pressure straight through compact junction into the gauge
  const sim = runSteps(res.nodes, res.pipes, 'hydraulic', 20);
  assert.ok(sim.nodes['g1'].portPressures['in'] > 80);
});

test('insertComponentIntoPipe splices 2-port inline component into middle of pipe and respects signal domains', () => {
  const fluidNodes: CircuitNode[] = [
    { id: 'p1', type: 'pump', label: 'Bomba', x: 100, y: 200, rotation: 0, params: { targetPressure: 80 } },
    { id: 'tk', type: 'tank', label: 'Tanque', x: 400, y: 200, rotation: 0, params: {} },
    { id: 'th', type: 'throttle', label: 'Estrang', x: 250, y: 200, rotation: 0, params: { opening: 50 } },
  ];
  const fluidPipes: PipeConnection[] = [
    { id: 'line1', fromNodeId: 'p1', fromPortId: 'out', toNodeId: 'tk', toPortId: 'in' },
  ];

  const inlineRes = insertComponentIntoPipe(fluidNodes, fluidPipes, 'th', {
    ids: { pipeBId: 'line1_b' },
  });
  assert.equal(inlineRes.connected, true);
  assert.equal(inlineRes.mode, 'inline');
  assert.equal(inlineRes.pipes.length, 2);
  assert.ok(inlineRes.pipes.some((p) => p.fromNodeId === 'p1' && p.toNodeId === 'th'));
  assert.ok(inlineRes.pipes.some((p) => p.fromNodeId === 'th' && p.toNodeId === 'tk'));

  // Domain safety: electrical pushbutton dropped on hydraulic pipe must NOT connect to fluid pipe
  const mixedNodes: CircuitNode[] = [
    ...fluidNodes.slice(0, 2),
    { id: 'sw1', type: 'elec_push_no', label: 'S1', x: 250, y: 200, rotation: 0, params: {} },
  ];
  const wrongDomain = insertComponentIntoPipe(mixedNodes, fluidPipes, 'sw1');
  assert.equal(wrongDomain.connected, false);
});

test('hasConfiguredActuatorSide identifies configured operators while excluding bare return springs', () => {
  assert.equal(
    hasConfiguredActuatorSide({
      springReturn: true,
      piloted: false,
      externalFeed: false,
      manual: '',
      mechanical: '',
      electrical: '',
    }),
    false
  );
  assert.equal(
    hasConfiguredActuatorSide({
      springReturn: false,
      piloted: false,
      externalFeed: false,
      manual: 'button',
      mechanical: '',
      electrical: '',
    }),
    true
  );
  assert.equal(
    hasConfiguredActuatorSide({
      springReturn: false,
      piloted: false,
      externalFeed: false,
      manual: '',
      mechanical: 'roller',
      electrical: '',
    }),
    true
  );
  assert.equal(
    hasConfiguredActuatorSide({
      springReturn: false,
      piloted: false,
      externalFeed: false,
      manual: '',
      mechanical: '',
      electrical: 'solenoid',
    }),
    true
  );
});
