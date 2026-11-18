import type {
  CircuitNode,
  ComponentCatalogItem,
  ComponentParams,
  ComponentType,
  CylinderConfig,
  FluidMedium,
  FrictionMaterialId,
  NodeRuntimeState,
  PipeConnection,
  PipeRuntimeState,
  PipeWaypoint,
  PortSpec,
  SimulationState,
  ValveActuationSide,
  ValveConfig,
  ValveManualActuation,
} from '../types/circuit';
import { EXTENDED_COMPONENT_SPECS } from '../data/extendedCatalog';

export type { ComponentCatalogItem };

export const FRICTION_MATERIALS: Record<
  FrictionMaterialId,
  { label: string; staticCoeff: number; dynamicCoeff: number }
> = {
  steel_steel: { label: 'Aço sobre aço', staticCoeff: 0.15, dynamicCoeff: 0.1 },
  cast_iron: { label: 'Ferro fundido sobre ferro fundido', staticCoeff: 0.16, dynamicCoeff: 0.15 },
  wood_wood: { label: 'Madeira sobre madeira', staticCoeff: 0.5, dynamicCoeff: 0.35 },
  steel_wood: { label: 'Aço sobre madeira', staticCoeff: 0.5, dynamicCoeff: 0.4 },
  steel_ice: { label: 'Aço sobre gelo', staticCoeff: 0.03, dynamicCoeff: 0.015 },
  tire_asphalt: { label: 'Pneu sobre asfalto', staticCoeff: 0.85, dynamicCoeff: 0.65 },
};

export function createDefaultCylinderConfig(
  nodeType: 'cylinder_single' | 'cylinder_double' = 'cylinder_double'
): CylinderConfig {
  return {
    cylinderType: nodeType === 'cylinder_single' ? 'single_extend' : 'double',
    springReturn: nodeType === 'cylinder_single',
    rodType: 'single',
    throughRod: false,
    magneticCoupling: false,
    slideGuide: false,
    cushioning: nodeType === 'cylinder_double',
    cushioningAdjustable: nodeType === 'cylinder_double',
    sensing: false,
    sensingMark: '',
    mirrorHorizontal: false,
    mirrorVertical: false,
    initialPosMm: 0,
    mountingAngleDeg: 0,
    internalLeakage: 0,
    areaUnit: 'qcm',
    showVelocity: false,
    showForce: false,
    movingMassKg: 0,
    frictionMode: 'manual',
    frictionMaterial: 'steel_steel',
    staticFriction: 0,
    dynamicFriction: 0,
    forceMode: 'constant',
    forceProfile: [
      { posMm: 0, forceN: 0 },
      { posMm: 200, forceN: 0 },
    ],
    forceChartRangeN: 100,
    actuationLabels: Array.from({ length: 6 }, () => ({
      mark: '',
      startMm: '',
      endMm: '',
    })),
  };
}

export function getEffectiveCylinderConfig(node: CircuitNode): CylinderConfig {
  const base = createDefaultCylinderConfig(
    node.type === 'cylinder_single' ? 'cylinder_single' : 'cylinder_double'
  );
  const custom = node.params.cylinderConfig;
  if (!custom) return base;
  return {
    ...base,
    ...custom,
    actuationLabels:
      custom.actuationLabels && custom.actuationLabels.length > 0
        ? [
            ...custom.actuationLabels,
            ...base.actuationLabels.slice(custom.actuationLabels.length),
          ]
        : base.actuationLabels,
  };
}

export function computeCylinderAreasCm2(
  boreMm: number,
  rodMm: number,
  rodType: CylinderConfig['rodType'],
  throughRod: boolean
): { pistonAreaCm2: number; annularAreaCm2: number } {
  const rBore = Math.max(1, boreMm) / 2;
  const rRod = Math.max(0, Math.min(rodMm, boreMm - 0.5)) / 2;
  const fullAreaMm2 = Math.PI * rBore * rBore;
  const rodAreaMm2 = rodType === 'rodless' ? 0 : Math.PI * rRod * rRod;
  const capMm2 = throughRod ? Math.max(0, fullAreaMm2 - rodAreaMm2) : fullAreaMm2;
  const annularMm2 = Math.max(0, fullAreaMm2 - rodAreaMm2);
  return {
    pistonAreaCm2: Number((capMm2 / 100).toFixed(2)),
    annularAreaCm2: Number((annularMm2 / 100).toFixed(2)),
  };
}

export function evaluateForceProfileN(
  cfg: CylinderConfig,
  constantForceN: number,
  posMm: number
): number {
  if (cfg.forceMode === 'constant' || cfg.forceProfile.length === 0) {
    return constantForceN;
  }
  const sorted = [...cfg.forceProfile].sort((a, b) => a.posMm - b.posMm);
  if (posMm <= sorted[0].posMm) return sorted[0].forceN;
  if (posMm >= sorted[sorted.length - 1].posMm) return sorted[sorted.length - 1].forceN;
  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    if (posMm >= p1.posMm && posMm <= p2.posMm) {
      const span = p2.posMm - p1.posMm;
      if (span <= 0.0001) return p1.forceN;
      const t = (posMm - p1.posMm) / span;
      return p1.forceN + t * (p2.forceN - p1.forceN);
    }
  }
  return constantForceN;
}

export const DIRECTIONAL_VALVE_TYPES: ReadonlySet<ComponentType> = new Set([
  'valve_2_2',
  'valve_3_2',
  'valve_4_2',
  'valve_5_2',
  'valve_6_2',
  'valve_4_3',
  'valve_5_3',
  'prop_valve_4_3',
  'servo_valve_4_3',
]);

export function isDirectionalValveType(type: ComponentType): boolean {
  return DIRECTIONAL_VALVE_TYPES.has(type);
}

export const INTERACTIVE_TOGGLE_TYPES: ReadonlySet<ComponentType> = new Set([
  'elec_push_no',
  'elec_switch_no',
  'elec_push_nc',
  'elec_switch_nc',
  'elec_push_co',
  'elec_switch_co',
  'elec_contact_no',
  'elec_contact_nc',
  'elec_contact_co',
  'ladder_push_no',
  'ladder_push_nc',
  'ladder_push_co',
  'ladder_contact_no',
  'ladder_contact_nc',
  'dig_in',
  'dig_hi',
  'dig_lo',
]);

export function isInteractiveToggleType(type: ComponentType): boolean {
  return INTERACTIVE_TOGGLE_TYPES.has(type);
}

export function isThreePositionValveType(type: ComponentType): boolean {
  return (
    type === 'valve_4_3' ||
    type === 'valve_5_3' ||
    type === 'prop_valve_4_3' ||
    type === 'servo_valve_4_3'
  );
}

export function isDetentManualActuation(manual: ValveManualActuation | undefined): boolean {
  return (
    manual === 'manual_detent' ||
    manual === 'button_detent' ||
    manual === 'detent_lever' ||
    manual === 'pedal_detent'
  );
}

export function isMomentarySwitchType(type: ComponentType): boolean {
  return (
    type === 'elec_push_no' ||
    type === 'elec_push_nc' ||
    type === 'elec_push_co' ||
    type === 'ladder_push_no' ||
    type === 'ladder_push_nc' ||
    type === 'ladder_push_co'
  );
}

export function isLatchingSwitchType(type: ComponentType): boolean {
  return (
    type === 'elec_switch_no' ||
    type === 'elec_switch_nc' ||
    type === 'elec_switch_co'
  );
}

export interface ValveActuationBehavior {
  effectiveSide: 'left' | 'right' | 'cycle';
  pressPos: number;
  restPos: number;
  isDetent: boolean;
  isSpringReturn: boolean;
  isThreePos: boolean;
}

export function getValveActuationBehavior(
  node: CircuitNode,
  sideHint?: 'left' | 'right' | 'cycle'
): ValveActuationBehavior {
  const vCfg = getEffectiveValveConfig(node);
  const isThreePos = isThreePositionValveType(node.type);
  const restPos = isThreePos
    ? Math.max(0, Math.min(2, vCfg.initialPosition ?? 1))
    : vCfg.initialPosition === 0
      ? 0
      : 1;
  const hasAnySpring = Boolean(vCfg.leftActuation.springReturn || vCfg.rightActuation.springReturn);

  if (isThreePos) {
    const currPos = Math.max(0, Math.min(2, node.params.spoolPosition ?? restPos));
    const effectiveSide: 'left' | 'right' | 'cycle' =
      sideHint === 'left' || sideHint === 'right'
        ? sideHint
        : currPos === 1
          ? 'left'
          : currPos === 0
            ? 'right'
            : 'cycle';

    if (effectiveSide === 'left' || effectiveSide === 'right') {
      const sideCfg = effectiveSide === 'left' ? vCfg.leftActuation : vCfg.rightActuation;
      const pressPos = effectiveSide === 'left' ? 0 : 2;
      const isDetent = isDetentManualActuation(sideCfg.manual);
      const isSpringReturn = !isDetent && hasAnySpring && pressPos !== restPos;
      return {
        effectiveSide,
        pressPos,
        restPos,
        isDetent,
        isSpringReturn,
        isThreePos: true,
      };
    }

    return {
      effectiveSide: 'cycle',
      pressPos: restPos,
      restPos,
      isDetent: false,
      isSpringReturn: false,
      isThreePos: true,
    };
  }

  const primarySide: 'left' | 'right' = restPos === 0 ? 'right' : 'left';
  const effectiveSide: 'left' | 'right' =
    sideHint === 'left' || sideHint === 'right' ? sideHint : primarySide;
  const sideCfg = effectiveSide === 'left' ? vCfg.leftActuation : vCfg.rightActuation;
  const pressPos = effectiveSide === 'left' ? 0 : 1;
  const isDetent = isDetentManualActuation(sideCfg.manual);
  const isSpringReturn = !isDetent && hasAnySpring && pressPos !== restPos;

  return {
    effectiveSide,
    pressPos,
    restPos,
    isDetent,
    isSpringReturn,
    isThreePos: false,
  };
}

export function createDefaultValveConfig(type: ComponentType): ValveConfig {
  const isThreePos =
    type === 'valve_4_3' ||
    type === 'valve_5_3' ||
    type === 'prop_valve_4_3' ||
    type === 'servo_valve_4_3';
  const chambers: ValveConfig['chambers'] =
    type === 'valve_2_2'
      ? ['parallel', 'closed', '', '']
      : type === 'valve_3_2'
        ? ['p_to_a_b_exhaust', 'p_closed_ab_t', '', '']
        : type === 'valve_6_2'
          ? ['crossed', 'parallel', '', '']
          : isThreePos
            ? ['crossed', 'closed', 'parallel', '']
            : ['parallel', 'crossed', '', ''];

  const isPropValve = type === 'prop_valve_4_3' || type === 'servo_valve_4_3';
  return {
    leftActuation: {
      springReturn: isPropValve,
      piloted: false,
      externalFeed: false,
      manual: '',
      mechanical: '',
      electrical: 'solenoid',
    },
    rightActuation: {
      springReturn: true,
      piloted: false,
      externalFeed: false,
      manual: '',
      mechanical: '',
      electrical:
        type === 'servo_valve_4_3' ? '' : isThreePos ? 'solenoid' : '',
    },
    reversible: false,
    chambers,
    initialPosition: isThreePos ? 1 : 1,
    dominantSide: 'left',
    dominantSignal: false,
    hydraulicResistance: isPropValve ? 0.32 : 0.0164,
    resistanceUnit: 'mpa_lmin2',
    mirrorHorizontal: false,
    mirrorVertical: false,
  };
}

export function getEffectiveValveConfig(node: CircuitNode): ValveConfig {
  const base = createDefaultValveConfig(node.type);
  const custom = node.params.valveConfig;
  if (!custom) return base;
  return {
    ...base,
    ...custom,
    leftActuation: { ...base.leftActuation, ...custom.leftActuation },
    rightActuation: { ...base.rightActuation, ...custom.rightActuation },
    chambers: custom.chambers ?? base.chambers,
  };
}

export const COMPONENT_CATALOG: Record<ComponentType, ComponentCatalogItem> = {
  power_unit_simple: {
    type: 'power_unit_simple',
    category: 'sources',
    name: 'Grupo Motriz (Simplificado)',
    shortName: 'Grupo motri...',
    description: 'Fonte hidráulica simplificada com pressão de alimentação nominal.',
    width: 64,
    height: 60,
    ports: [{ id: 'out', label: 'P', dx: 0, dy: -30, direction: 'out' }],
    defaultParams: { targetPressure: 120, maxFlow: 24 },
  },
  pump: {
    type: 'pump',
    category: 'sources',
    name: 'Bomba de Deslocamento Constante',
    shortName: 'Bomba de d...',
    description: 'Bomba de deslocamento positivo constante com controle de pressão máxima.',
    width: 40,
    height: 48,
    ports: [
      { id: 'out', label: 'P', dx: 0, dy: -24, direction: 'out' },
      { id: 'suction', label: 'S', dx: 0, dy: 24, direction: 'in' },
    ],
    defaultParams: { targetPressure: 120, maxFlow: 24 },
  },
  pump_variable: {
    type: 'pump_variable',
    category: 'sources',
    name: 'Bomba de Deslocamento Variável',
    shortName: 'Bomba de d...',
    description: 'Bomba hidráulica de deslocamento variável com ajuste de vazão.',
    width: 40,
    height: 48,
    ports: [
      { id: 'out', label: 'P', dx: 0, dy: -24, direction: 'out' },
      { id: 'suction', label: 'S', dx: 0, dy: 24, direction: 'in' },
    ],
    defaultParams: { targetPressure: 140, maxFlow: 32, opening: 80 },
  },
  compressor: {
    type: 'compressor',
    category: 'sources',
    name: 'Compressor Pneumático',
    shortName: 'Compressor',
    description: 'Unidade geradora de ar comprimido regulada.',
    width: 80,
    height: 64,
    ports: [{ id: 'out', label: 'P', dx: 40, dy: 0, direction: 'out' }],
    defaultParams: { targetPressure: 6, maxFlow: 180 },
  },
  tank: {
    type: 'tank',
    category: 'sources',
    name: 'Tanque / Reservatório',
    shortName: 'Tanque',
    description: 'Tanque hidráulico à pressão atmosférica (0 bar manométrico).',
    width: 38,
    height: 30,
    ports: [{ id: 'in', label: 'T', dx: 0, dy: -15, direction: 'bidirectional' }],
    defaultParams: {},
  },
  power_unit: {
    type: 'power_unit',
    category: 'sources',
    name: 'Grupo Motriz Hidráulico Completo',
    shortName: 'Grupo motriz',
    description: 'Unidade hidráulica com bomba, motor, limitadora de pressão, manômetro e tanque.',
    width: 96,
    height: 76,
    ports: [
      { id: 'out', label: 'P', dx: 48, dy: -12, direction: 'out' },
      { id: 'tank', label: 'T', dx: 48, dy: 16, direction: 'in' },
    ],
    defaultParams: { targetPressure: 120, maxFlow: 24, crackingPressure: 120 },
  },
  pump_amplifier: {
    type: 'pump_amplifier',
    category: 'sources',
    name: 'Amplificador / Controlador de Bomba',
    shortName: 'Amplificado...',
    description: 'Estágio eletrônico amplificador de comando para bomba variável.',
    width: 84,
    height: 56,
    ports: [
      { id: 'in', label: '1', dx: -42, dy: 0, direction: 'bidirectional' },
      { id: 'out', label: '2', dx: 42, dy: 0, direction: 'bidirectional' },
    ],
    defaultParams: { opening: 75 },
  },
  pump_prop: {
    type: 'pump_prop',
    category: 'sources',
    name: 'Bomba Proporcional Controlada',
    shortName: 'Bomba prop...',
    description: 'Bomba de deslocamento variável com controle eletro-proporcional.',
    width: 88,
    height: 68,
    ports: [
      { id: 'suction', label: 'S', dx: -44, dy: 0, direction: 'in' },
      { id: 'out', label: 'P', dx: 44, dy: 0, direction: 'out' },
    ],
    defaultParams: { targetPressure: 150, maxFlow: 36, opening: 80 },
  },
  accumulator_simple: {
    type: 'accumulator_simple',
    category: 'sources',
    name: 'Acumulador Hidráulico',
    shortName: 'Acumulador',
    description: 'Reservatório pressurizado simples para amortecimento de pulsos.',
    width: 56,
    height: 74,
    ports: [{ id: 'in', label: 'P', dx: 0, dy: 37, direction: 'bidirectional' }],
    defaultParams: { crackingPressure: 40 },
  },
  accumulator: {
    type: 'accumulator',
    category: 'sources',
    name: 'Acumulador com Diafragma / Pré-carga',
    shortName: 'Acumulador',
    description: 'Acumulador hidropneumático com separador elástico e pré-carga de gás.',
    width: 56,
    height: 74,
    ports: [{ id: 'in', label: 'P', dx: 0, dy: 37, direction: 'bidirectional' }],
    defaultParams: { crackingPressure: 50 },
  },
  accumulator_unit: {
    type: 'accumulator_unit',
    category: 'sources',
    name: 'Acumulador com Bloco de Segurança',
    shortName: 'Acumulador...',
    description: 'Unidade acumuladora com válvula de alívio, manômetro e descarga manual.',
    width: 94,
    height: 68,
    ports: [
      { id: 'in', label: 'P', dx: -47, dy: 0, direction: 'bidirectional' },
      { id: 'out', label: 'T', dx: 47, dy: 0, direction: 'out' },
    ],
    defaultParams: { crackingPressure: 100 },
  },
  flexible_hose: {
    type: 'flexible_hose',
    category: 'sources',
    name: 'Tubo Flexível (Mangueira)',
    shortName: 'Tubo flexíbl...',
    description: 'Elemento de ligação flexível para absorção de vibração hidráulica.',
    width: 72,
    height: 44,
    ports: [
      { id: 'in', label: '1', dx: -36, dy: 0, direction: 'bidirectional' },
      { id: 'out', label: '2', dx: 36, dy: 0, direction: 'bidirectional' },
    ],
    defaultParams: { opening: 100 },
  },
  filter: {
    type: 'filter',
    category: 'sources',
    name: 'Filtro Hidráulico',
    shortName: 'Filtro',
    description: 'Elemento filtrante para retenção de impurezas sólidas no fluido.',
    width: 72,
    height: 54,
    ports: [
      { id: 'in', label: '1', dx: -36, dy: 0, direction: 'bidirectional' },
      { id: 'out', label: '2', dx: 36, dy: 0, direction: 'bidirectional' },
    ],
    defaultParams: { opening: 90 },
  },
  cooler: {
    type: 'cooler',
    category: 'sources',
    name: 'Resfriador (Trocador de Calor)',
    shortName: 'Resfriador',
    description: 'Trocador de calor para remoção térmica do fluido hidráulico.',
    width: 72,
    height: 54,
    ports: [
      { id: 'in', label: '1', dx: -36, dy: 0, direction: 'bidirectional' },
      { id: 'out', label: '2', dx: 36, dy: 0, direction: 'bidirectional' },
    ],
    defaultParams: {},
  },
  heater: {
    type: 'heater',
    category: 'sources',
    name: 'Aquecedor de Fluido',
    shortName: 'Aquecedor',
    description: 'Elemento térmico para pré-aquecimento do óleo hidráulico.',
    width: 72,
    height: 54,
    ports: [
      { id: 'in', label: '1', dx: -36, dy: 0, direction: 'bidirectional' },
      { id: 'out', label: '2', dx: 36, dy: 0, direction: 'bidirectional' },
    ],
    defaultParams: {},
  },
  regulator: {
    type: 'regulator',
    category: 'sources',
    name: 'Regulador de Pressão (FRL)',
    shortName: 'Regulador',
    description: 'Limita e estabiliza a pressão a jusante.',
    width: 72,
    height: 56,
    ports: [
      { id: 'in', label: '1', dx: -36, dy: 0, direction: 'in' },
      { id: 'out', label: '2', dx: 36, dy: 0, direction: 'out' },
    ],
    defaultParams: { targetPressure: 6 },
  },
  valve_2_2: {
    type: 'valve_2_2',
    category: 'valves',
    name: 'Válvula Direcional 2/2 Vias',
    shortName: 'Válvula 2/2',
    description: 'Válvula de bloqueio/passagem de 2 vias e 2 posições.',
    width: 84,
    height: 60,
    ports: [
      { id: 'P', label: 'P', dx: 0, dy: 30, direction: 'in' },
      { id: 'A', label: 'A', dx: 0, dy: -30, direction: 'bidirectional' },
    ],
    defaultParams: { active: false, actuation: 'solenoid' },
  },
  valve_3_2: {
    type: 'valve_3_2',
    category: 'valves',
    name: 'Válvula Direcional 3/2 Vias',
    shortName: 'Válvula 3/2',
    description: 'Acionamento manual/solenoide com retorno por mola (NF).',
    width: 88,
    height: 64,
    ports: [
      { id: 'P', label: 'P', dx: -11, dy: 32, direction: 'in' },
      { id: 'T', label: 'T', dx: 11, dy: 32, direction: 'out' },
      { id: 'A', label: 'A', dx: 0, dy: -32, direction: 'bidirectional' },
    ],
    defaultParams: { active: false, actuation: 'solenoid' },
  },
  valve_4_2: {
    type: 'valve_4_2',
    category: 'valves',
    name: 'Válvula Direcional 4/2 Vias',
    shortName: 'Válvula 4/2',
    description: 'Válvula de 4 vias e 2 posições para atuadores de dupla ação.',
    width: 100,
    height: 68,
    ports: [
      { id: 'P', label: 'P', dx: -11, dy: 34, direction: 'in' },
      { id: 'T', label: 'T', dx: 11, dy: 34, direction: 'out' },
      { id: 'A', label: 'A', dx: -11, dy: -34, direction: 'bidirectional' },
      { id: 'B', label: 'B', dx: 11, dy: -34, direction: 'bidirectional' },
    ],
    defaultParams: { active: false, actuation: 'solenoid' },
  },
  valve_5_2: {
    type: 'valve_5_2',
    category: 'valves',
    name: 'Válvula Direcional 5/2 Vias',
    shortName: 'Válvula 5/2',
    description: 'Válvula pneumática 5/2 com escapes independentes EA e EB.',
    width: 112,
    height: 68,
    ports: [
      { id: 'EA', label: 'EA', dx: -13, dy: 34, direction: 'out' },
      { id: 'P', label: 'P', dx: 0, dy: 34, direction: 'in' },
      { id: 'EB', label: 'EB', dx: 13, dy: 34, direction: 'out' },
      { id: 'A', label: 'A', dx: -11, dy: -34, direction: 'bidirectional' },
      { id: 'B', label: 'B', dx: 11, dy: -34, direction: 'bidirectional' },
    ],
    defaultParams: { active: false, actuation: 'solenoid' },
  },
  valve_6_2: {
    type: 'valve_6_2',
    category: 'valves',
    name: 'Válvula Direcional 6/2 Vias',
    shortName: 'Válvula 6/2',
    description: 'Válvula direcional de 6 vias e 2 posições (desvio / seletora dupla).',
    width: 108,
    height: 70,
    ports: [
      { id: 'E', label: 'E', dx: -15, dy: 35, direction: 'bidirectional' },
      { id: 'A', label: 'A', dx: 0, dy: 35, direction: 'bidirectional' },
      { id: 'F', label: 'F', dx: 15, dy: 35, direction: 'bidirectional' },
      { id: 'B', label: 'B', dx: -15, dy: -35, direction: 'bidirectional' },
      { id: 'C', label: 'C', dx: 0, dy: -35, direction: 'bidirectional' },
      { id: 'D', label: 'D', dx: 15, dy: -35, direction: 'bidirectional' },
    ],
    defaultParams: { active: false, actuation: 'solenoid' },
  },
  valve_4_3: {
    type: 'valve_4_3',
    category: 'valves',
    name: 'Válvula Direcional 4/3 Vias',
    shortName: 'Válvula 4/3',
    description: 'Válvula 4 vias e 3 posições com centro configurável e duplo acionamento.',
    width: 132,
    height: 70,
    ports: [
      { id: 'P', label: 'P', dx: -11, dy: 35, direction: 'in' },
      { id: 'T', label: 'T', dx: 11, dy: 35, direction: 'out' },
      { id: 'A', label: 'A', dx: -11, dy: -35, direction: 'bidirectional' },
      { id: 'B', label: 'B', dx: 11, dy: -35, direction: 'bidirectional' },
    ],
    defaultParams: { spoolPosition: 1, active: false, actuation: 'solenoid' },
  },
  valve_5_3: {
    type: 'valve_5_3',
    category: 'valves',
    name: 'Válvula Direcional 5/3 Vias',
    shortName: 'Válvula 5/3',
    description: 'Válvula pneumática/hidráulica 5 vias e 3 posições.',
    width: 132,
    height: 70,
    ports: [
      { id: 'EA', label: 'EA', dx: -13, dy: 35, direction: 'out' },
      { id: 'P', label: 'P', dx: 0, dy: 35, direction: 'in' },
      { id: 'EB', label: 'EB', dx: 13, dy: 35, direction: 'out' },
      { id: 'A', label: 'A', dx: -11, dy: -35, direction: 'bidirectional' },
      { id: 'B', label: 'B', dx: 11, dy: -35, direction: 'bidirectional' },
    ],
    defaultParams: { spoolPosition: 1, active: false, actuation: 'solenoid' },
  },
  amp_prop_2ch: {
    type: 'amp_prop_2ch',
    category: 'valves',
    name: 'Amplificador Proporcional (2 Solenoides)',
    shortName: 'Amplificado...',
    description: 'Amplificador eletrônico de duplo canal para válvulas proporcionais.',
    width: 88,
    height: 60,
    ports: [
      { id: 'in', label: '1', dx: -44, dy: 0, direction: 'bidirectional' },
      { id: 'out', label: '2', dx: 44, dy: 0, direction: 'bidirectional' },
    ],
    defaultParams: { opening: 80 },
  },
  prop_valve_4_3: {
    type: 'prop_valve_4_3',
    category: 'valves',
    name: 'Válvula Proporcional Contínua 4/3',
    shortName: 'Válvula pro...',
    description: 'Válvula direcional proporcional contínua com comando de vazão e sentido.',
    width: 132,
    height: 70,
    ports: [
      { id: 'P', label: 'P', dx: -11, dy: 35, direction: 'in' },
      { id: 'T', label: 'T', dx: 11, dy: 35, direction: 'out' },
      { id: 'A', label: 'A', dx: -11, dy: -35, direction: 'bidirectional' },
      { id: 'B', label: 'B', dx: 11, dy: -35, direction: 'bidirectional' },
    ],
    defaultParams: { spoolPosition: 1, opening: 75, active: false, actuation: 'solenoid' },
  },
  amp_prop_1ch: {
    type: 'amp_prop_1ch',
    category: 'valves',
    name: 'Amplificador Proporcional (1 Solenoide)',
    shortName: 'Amplificado...',
    description: 'Amplificador eletrônico monocanal para acionamento proporcional.',
    width: 84,
    height: 56,
    ports: [
      { id: 'in', label: '1', dx: -42, dy: 0, direction: 'bidirectional' },
      { id: 'out', label: '2', dx: 42, dy: 0, direction: 'bidirectional' },
    ],
    defaultParams: { opening: 75 },
  },
  prop_throttle_2_2: {
    type: 'prop_throttle_2_2',
    category: 'valves',
    name: 'Válvula Estranguladora Proporcional 2/2',
    shortName: 'Válvula estr...',
    description: 'Estranguladora proporcional 2/2 vias controlada por corrente.',
    width: 106,
    height: 60,
    ports: [
      { id: 'P', label: 'A', dx: 17, dy: 30, direction: 'in' },
      { id: 'A', label: 'B', dx: 17, dy: -30, direction: 'bidirectional' },
    ],
    defaultParams: {
      opening: 70,
      active: true,
      hydraulicResistance: 0.32,
      spoolEdgeShape: 'triangular',
      spoolOverlapPct: 25,
      internalLeakage: 0.01,
    },
  },
  check_valve: {
    type: 'check_valve',
    category: 'valves',
    name: 'Válvula Antirretorno',
    shortName: 'Válvula anti...',
    description: 'Permite passagem de fluido em apenas um sentido.',
    width: 68,
    height: 54,
    ports: [
      { id: 'in', label: '1', dx: 0, dy: 27, direction: 'in' },
      { id: 'out', label: '2', dx: 0, dy: -27, direction: 'out' },
    ],
    defaultParams: { crackingPressure: 0.5 },
  },
  check_valve_spring: {
    type: 'check_valve_spring',
    category: 'valves',
    name: 'Válvula Antirretorno com Mola',
    shortName: 'Válvula anti...',
    description: 'Válvula de retenção carregada por mola calibrada.',
    width: 68,
    height: 58,
    ports: [
      { id: 'in', label: '1', dx: 0, dy: 29, direction: 'in' },
      { id: 'out', label: '2', dx: 0, dy: -29, direction: 'out' },
    ],
    defaultParams: { crackingPressure: 2.5 },
  },
  check_throttle: {
    type: 'check_throttle',
    category: 'valves',
    name: 'Válvula Antirretorno Estranguladora',
    shortName: 'Válvula anti...',
    description: 'Restringe vazão em um sentido e permite retorno livre no sentido oposto.',
    width: 78,
    height: 54,
    ports: [
      { id: 'in', label: '1', dx: -39, dy: 0, direction: 'bidirectional' },
      { id: 'out', label: '2', dx: 39, dy: 0, direction: 'bidirectional' },
    ],
    defaultParams: { opening: 45, crackingPressure: 0.3 },
  },
  pilot_check_valve: {
    type: 'pilot_check_valve',
    category: 'valves',
    name: 'Válvula Antirretorno Pilotada (Abertura)',
    shortName: 'Válvula anti...',
    description: 'Desbloqueia o fluxo reverso quando há pressão de pilotagem na porta X.',
    width: 76,
    height: 58,
    ports: [
      { id: 'in', label: '1', dx: 0, dy: 29, direction: 'bidirectional' },
      { id: 'out', label: '2', dx: 0, dy: -29, direction: 'bidirectional' },
      { id: 'X', label: 'X', dx: 38, dy: 16, direction: 'in' },
    ],
    defaultParams: { crackingPressure: 1.5 },
  },
  pilot_check_spring: {
    type: 'pilot_check_spring',
    category: 'valves',
    name: 'Válvula de Retenção Pilotada c/ Mola',
    shortName: 'Válvula de r...',
    description: 'Retenção pilotada para abertura com mola de vedação.',
    width: 76,
    height: 58,
    ports: [
      { id: 'in', label: '1', dx: 0, dy: 29, direction: 'bidirectional' },
      { id: 'out', label: '2', dx: 0, dy: -29, direction: 'bidirectional' },
      { id: 'X', label: 'X', dx: 38, dy: 16, direction: 'in' },
    ],
    defaultParams: { crackingPressure: 2.5 },
  },
  pilot_check_close: {
    type: 'pilot_check_close',
    category: 'valves',
    name: 'Válvula de Retenção Pilotada (Fechamento)',
    shortName: 'Válvula de r...',
    description: 'Bloqueia o fluxo quando há sinal piloto hidráulico no comando superior.',
    width: 76,
    height: 58,
    ports: [
      { id: 'in', label: '1', dx: 0, dy: 29, direction: 'bidirectional' },
      { id: 'out', label: '2', dx: 0, dy: -29, direction: 'bidirectional' },
      { id: 'X', label: 'X', dx: 38, dy: -16, direction: 'in' },
    ],
    defaultParams: { crackingPressure: 2.0 },
  },
  pilot_check_close_spring: {
    type: 'pilot_check_close_spring',
    category: 'valves',
    name: 'Válvula de Retenção Pilotada c/ Mola (Fech.)',
    shortName: 'Válvula de r...',
    description: 'Retenção com mola e pilotagem superior de fechamento forçado.',
    width: 76,
    height: 58,
    ports: [
      { id: 'in', label: '1', dx: 0, dy: 29, direction: 'bidirectional' },
      { id: 'out', label: '2', dx: 0, dy: -29, direction: 'bidirectional' },
      { id: 'X', label: 'X', dx: 38, dy: -16, direction: 'in' },
    ],
    defaultParams: { crackingPressure: 2.5 },
  },
  flow_control_2way: {
    type: 'flow_control_2way',
    category: 'valves',
    name: 'Válvula Reguladora de Vazão 2 Vias',
    shortName: 'Válvula dire...',
    description: 'Reguladora de caudal compensada à pressão de 2 vias.',
    width: 80,
    height: 54,
    ports: [
      { id: 'in', label: '1', dx: -40, dy: 0, direction: 'in' },
      { id: 'out', label: '2', dx: 40, dy: 0, direction: 'out' },
    ],
    defaultParams: { opening: 60 },
  },
  flow_control_3way: {
    type: 'flow_control_3way',
    category: 'valves',
    name: 'Válvula Reguladora de Vazão 3 Vias',
    shortName: 'Válvula reg...',
    description: 'Reguladora de vazão 3 vias com derivação de excesso ao tanque.',
    width: 80,
    height: 58,
    ports: [
      { id: 'in', label: '1', dx: -40, dy: 0, direction: 'in' },
      { id: 'out', label: '2', dx: 40, dy: 0, direction: 'out' },
      { id: 'T', label: '3', dx: -18, dy: 29, direction: 'out' },
    ],
    defaultParams: { opening: 60 },
  },
  shuttle_valve: {
    type: 'shuttle_valve',
    category: 'valves',
    name: 'Válvula Seletora (Elemento OU)',
    shortName: 'Válvula sele...',
    description: 'Transmite à saída A o maior sinal de pressão entre X e Y.',
    width: 76,
    height: 54,
    ports: [
      { id: 'X', label: 'X', dx: -38, dy: 0, direction: 'in' },
      { id: 'Y', label: 'Y', dx: 38, dy: 0, direction: 'in' },
      { id: 'A', label: 'A', dx: 0, dy: -27, direction: 'out' },
    ],
    defaultParams: {},
  },
  two_pressure_valve: {
    type: 'two_pressure_valve',
    category: 'valves',
    name: 'Válvula de Simultaneidade (Elemento E)',
    shortName: 'Válvula de ...',
    description: 'Libera saída A somente quando ambas entradas X e Y estão pressurizadas.',
    width: 76,
    height: 54,
    ports: [
      { id: 'X', label: 'X', dx: -38, dy: 0, direction: 'in' },
      { id: 'Y', label: 'Y', dx: 38, dy: 0, direction: 'in' },
      { id: 'A', label: 'A', dx: 0, dy: -27, direction: 'out' },
    ],
    defaultParams: {},
  },
  quick_exhaust: {
    type: 'quick_exhaust',
    category: 'valves',
    name: 'Válvula de Escape Rápido',
    shortName: 'Esc. Rápido',
    description: 'Descarrega rapidamente o atuador para R quando a entrada P despressuriza.',
    width: 76,
    height: 54,
    ports: [
      { id: 'P', label: 'P', dx: -38, dy: 0, direction: 'in' },
      { id: 'A', label: 'A', dx: 38, dy: 0, direction: 'bidirectional' },
      { id: 'R', label: 'R', dx: 0, dy: 27, direction: 'out' },
    ],
    defaultParams: {},
  },
  flow_divider: {
    type: 'flow_divider',
    category: 'valves',
    name: 'Válvula Divisora de Fluxo',
    shortName: 'Válvula dist...',
    description: 'Divide igualmente a vazão de entrada para dois ramos A e B.',
    width: 76,
    height: 60,
    ports: [
      { id: 'in', label: 'P', dx: 0, dy: 30, direction: 'in' },
      { id: 'A', label: 'A', dx: -20, dy: -30, direction: 'out' },
      { id: 'B', label: 'B', dx: 20, dy: -30, direction: 'out' },
    ],
    defaultParams: { opening: 100 },
  },
  shutoff_valve: {
    type: 'shutoff_valve',
    category: 'valves',
    name: 'Válvula de Fechamento (Registro)',
    shortName: 'Válvula de ...',
    description: 'Registro manual de bloqueio ou passagem integral da linha.',
    width: 72,
    height: 46,
    ports: [
      { id: 'in', label: '1', dx: -36, dy: 0, direction: 'bidirectional' },
      { id: 'out', label: '2', dx: 36, dy: 0, direction: 'bidirectional' },
    ],
    defaultParams: { active: true, opening: 100 },
  },
  nozzle: {
    type: 'nozzle',
    category: 'valves',
    name: 'Tobera / Estrangulamento Fixo',
    shortName: 'Tobera',
    description: 'Restrição de perfil suave em tobera para queda de pressão calibrada.',
    width: 72,
    height: 44,
    ports: [
      { id: 'in', label: '1', dx: -36, dy: 0, direction: 'bidirectional' },
      { id: 'out', label: '2', dx: 36, dy: 0, direction: 'bidirectional' },
    ],
    defaultParams: { opening: 60 },
  },
  orifice: {
    type: 'orifice',
    category: 'valves',
    name: 'Orifício Fixo',
    shortName: 'Orifício',
    description: 'Placa de orifício calibrada fixa para restrição de vazão.',
    width: 72,
    height: 46,
    ports: [
      { id: 'in', label: '1', dx: -36, dy: 0, direction: 'bidirectional' },
      { id: 'out', label: '2', dx: 36, dy: 0, direction: 'bidirectional' },
    ],
    defaultParams: { opening: 50 },
  },
  orifice_adjustable: {
    type: 'orifice_adjustable',
    category: 'valves',
    name: 'Orifício Ajustável',
    shortName: 'Orifício, aju...',
    description: 'Orifício de seção ajustável para controle de vazão.',
    width: 74,
    height: 50,
    ports: [
      { id: 'in', label: '1', dx: -37, dy: 0, direction: 'bidirectional' },
      { id: 'out', label: '2', dx: 37, dy: 0, direction: 'bidirectional' },
    ],
    defaultParams: { opening: 55 },
  },
  throttle: {
    type: 'throttle',
    category: 'valves',
    name: 'Válvula Estranguladora Ajustável',
    shortName: 'Válvula estr...',
    description: 'Orifício ajustável para controle de velocidade de atuadores.',
    width: 76,
    height: 52,
    ports: [
      { id: 'in', label: '1', dx: -38, dy: 0, direction: 'bidirectional' },
      { id: 'out', label: '2', dx: 38, dy: 0, direction: 'bidirectional' },
    ],
    defaultParams: { opening: 65 },
  },
  relief_valve: {
    type: 'relief_valve',
    category: 'valves',
    name: 'Válvula Limitadora de Pressão',
    shortName: 'Limitadora',
    description: 'Protege o sistema desviando fluxo ao tanque acima da pressão de ajuste.',
    width: 76,
    height: 64,
    ports: [
      { id: 'in', label: 'P', dx: 0, dy: -32, direction: 'in' },
      { id: 'out', label: 'T', dx: 0, dy: 32, direction: 'out' },
    ],
    defaultParams: { crackingPressure: 100 },
  },
  sequence_valve: {
    type: 'sequence_valve',
    category: 'valves',
    name: 'Válvula de Sequência',
    shortName: 'Sequência',
    description: 'Libera passagem para o ramo secundário após atingir a pressão ajustada.',
    width: 76,
    height: 64,
    ports: [
      { id: 'in', label: 'P', dx: -38, dy: 0, direction: 'in' },
      { id: 'out', label: 'A', dx: 38, dy: 0, direction: 'out' },
    ],
    defaultParams: { crackingPressure: 45 },
  },
  counterbalance_valve: {
    type: 'counterbalance_valve',
    category: 'valves',
    name: 'Válvula de Contrapressão',
    shortName: 'Contrapressão',
    description: 'Sustenta cargas verticais gerando contrapressão controlada no retorno.',
    width: 76,
    height: 64,
    ports: [
      { id: 'in', label: '1', dx: -38, dy: 0, direction: 'in' },
      { id: 'out', label: '2', dx: 38, dy: 0, direction: 'out' },
    ],
    defaultParams: { crackingPressure: 35 },
  },
  pressure_compensator: {
    type: 'pressure_compensator',
    category: 'valves',
    name: 'Compensador de Pressão',
    shortName: 'Compensador',
    description: 'Mantém diferencial de pressão estável independente da carga.',
    width: 76,
    height: 58,
    ports: [
      { id: 'in', label: '1', dx: -38, dy: 0, direction: 'in' },
      { id: 'out', label: '2', dx: 38, dy: 0, direction: 'out' },
    ],
    defaultParams: { targetPressure: 60 },
  },
  prop_relief: {
    type: 'prop_relief',
    category: 'valves',
    name: 'Válvula Limitadora de Pressão Proporcional',
    shortName: 'Válvula limit...',
    description: 'Limitadora de pressão proporcional com acionamento elétrico direto.',
    width: 82,
    height: 64,
    ports: [
      { id: 'in', label: 'P', dx: 0, dy: -32, direction: 'in' },
      { id: 'out', label: 'T', dx: 0, dy: 32, direction: 'out' },
    ],
    defaultParams: { crackingPressure: 80 },
  },
  prop_relief_piloted: {
    type: 'prop_relief_piloted',
    category: 'valves',
    name: 'Limitadora de Pressão Proporcional Pilotada',
    shortName: 'Válvula limit...',
    description: 'Limitadora de pressão proporcional pilotada com mola e solenoide.',
    width: 86,
    height: 64,
    ports: [
      { id: 'in', label: 'P', dx: 0, dy: -32, direction: 'in' },
      { id: 'out', label: 'T', dx: 0, dy: 32, direction: 'out' },
    ],
    defaultParams: { crackingPressure: 90 },
  },
  prop_pressure_reducer: {
    type: 'prop_pressure_reducer',
    category: 'valves',
    name: 'Válvula Redutora de Pressão Proporcional',
    shortName: 'Válvula red...',
    description: 'Mantém pressão reduzida no ramo secundário via comando proporcional.',
    width: 86,
    height: 64,
    ports: [
      { id: 'in', label: 'P', dx: 0, dy: 32, direction: 'in' },
      { id: 'out', label: 'A', dx: 0, dy: -32, direction: 'out' },
    ],
    defaultParams: { targetPressure: 50 },
  },
  prop_solenoid: {
    type: 'prop_solenoid',
    category: 'valves',
    name: 'Solenoide de Comando Proporcional',
    shortName: 'Solenoide d...',
    description: 'Atuador eletro-proporcional de acionamento contínuo.',
    width: 82,
    height: 52,
    ports: [
      { id: 'in', label: '1', dx: -41, dy: 0, direction: 'bidirectional' },
      { id: 'out', label: '2', dx: 41, dy: 0, direction: 'bidirectional' },
    ],
    defaultParams: { opening: 75 },
  },
  servo_valve_4_3: {
    type: 'servo_valve_4_3',
    category: 'valves',
    name: 'Válvula Reguladora Contínua / Servoválvula 4/3',
    shortName: 'Válvula reg...',
    description: 'Servoválvula contínua de alta resposta dinâmica com realimentação.',
    width: 132,
    height: 70,
    ports: [
      { id: 'P', label: 'P', dx: -11, dy: 35, direction: 'in' },
      { id: 'T', label: 'T', dx: 11, dy: 35, direction: 'out' },
      { id: 'A', label: 'A', dx: -11, dy: -35, direction: 'bidirectional' },
      { id: 'B', label: 'B', dx: 11, dy: -35, direction: 'bidirectional' },
    ],
    defaultParams: { spoolPosition: 1, opening: 85, active: false, actuation: 'solenoid' },
  },
  distance_rule: {
    type: 'distance_rule',
    category: 'actuators',
    name: 'Régua de Distância (Escala de Curso)',
    shortName: 'Régua de di...',
    description: 'Régua milimetrada de referência para fins de curso em cilindros.',
    width: 132,
    height: 28,
    ports: [],
    defaultParams: { strokeMm: 200 },
  },
  cylinder_single: {
    type: 'cylinder_single',
    category: 'actuators',
    name: 'Cilindro de Simples Ação',
    shortName: 'Cilindro de ...',
    description: 'Atuador linear com avanço por pressão e retorno por mola.',
    width: 140,
    height: 60,
    ports: [{ id: 'A', label: 'A', dx: -56, dy: 30, direction: 'bidirectional' }],
    defaultParams: { boreMm: 40, rodMm: 16, strokeMm: 200, loadN: 150 },
  },
  cylinder_double: {
    type: 'cylinder_double',
    category: 'actuators',
    name: 'Cilindro de Dupla Ação',
    shortName: 'Cilindro dobl...',
    description: 'Atuador linear bidirecional com câmaras de avanço e recuo.',
    width: 156,
    height: 64,
    ports: [
      { id: 'A', label: 'A', dx: -60, dy: 32, direction: 'bidirectional' },
      { id: 'B', label: 'B', dx: 36, dy: 32, direction: 'bidirectional' },
    ],
    defaultParams: { boreMm: 50, rodMm: 22, strokeMm: 250, loadN: 800 },
  },
  motor: {
    type: 'motor',
    category: 'actuators',
    name: 'Hidromotor',
    shortName: 'Hidromotor',
    description: 'Conversor rotativo contínuo com leitura de RPM e torque.',
    width: 80,
    height: 72,
    ports: [
      { id: 'A', label: 'A', dx: 0, dy: -36, direction: 'bidirectional' },
      { id: 'B', label: 'B', dx: 0, dy: 36, direction: 'bidirectional' },
    ],
    defaultParams: { displacementCc: 32, loadNm: 15 },
  },
  rotary_actuator: {
    type: 'rotary_actuator',
    category: 'actuators',
    name: 'Atuador Semirotativo',
    shortName: 'Atuador se...',
    description: 'Atuador oscilante semirotativo de ângulo limitado.',
    width: 84,
    height: 68,
    ports: [
      { id: 'A', label: 'A', dx: -42, dy: -16, direction: 'bidirectional' },
      { id: 'B', label: 'B', dx: -42, dy: 16, direction: 'bidirectional' },
    ],
    defaultParams: { strokeMm: 270, loadN: 200 },
  },
  pressure_gauge: {
    type: 'pressure_gauge',
    category: 'instruments',
    name: 'Aparato de Medição de Pressão (Manômetro)',
    shortName: 'Aparato de ...',
    description: 'Mede a pressão instantânea na linha em bar.',
    width: 60,
    height: 64,
    ports: [{ id: 'in', label: 'P', dx: 0, dy: 32, direction: 'in' }],
    defaultParams: {},
  },
  diff_pressure_gauge: {
    type: 'diff_pressure_gauge',
    category: 'instruments',
    name: 'Manômetro Diferencial',
    shortName: 'Manômetro ...',
    description: 'Mede a diferença de pressão entre dois pontos P1 e P2.',
    width: 64,
    height: 64,
    ports: [
      { id: 'p1', label: 'P1', dx: -14, dy: 32, direction: 'in' },
      { id: 'p2', label: 'P2', dx: 14, dy: 32, direction: 'in' },
    ],
    defaultParams: {},
  },
  pressure_indicator: {
    type: 'pressure_indicator',
    category: 'instruments',
    name: 'Indicador Óptico de Pressão',
    shortName: 'Indicador de...',
    description: 'Indicador visual que sinaliza presença de pressão na linha.',
    width: 60,
    height: 64,
    ports: [{ id: 'in', label: 'P', dx: 0, dy: 32, direction: 'in' }],
    defaultParams: { crackingPressure: 30, signalColor: '#800000' },
  },
  flow_meter: {
    type: 'flow_meter',
    category: 'instruments',
    name: 'Medidor de Vazão (Caudalímetro)',
    shortName: 'Medidor de ...',
    description: 'Monitora a taxa de escoamento instantânea ou acumulada.',
    width: 64,
    height: 64,
    ports: [
      { id: 'in', label: '1', dx: 0, dy: 32, direction: 'bidirectional' },
      { id: 'out', label: '2', dx: 0, dy: -32, direction: 'bidirectional' },
    ],
    defaultParams: { flowDisplayMode: 'instantaneous', hydraulicResistance: 0.0001 },
  },
  flow_meter_analog: {
    type: 'flow_meter_analog',
    category: 'instruments',
    name: 'Medidor de Vazão Analógico (M)',
    shortName: 'Medidor de ...',
    description: 'Medidor de vazão com totalizador volumétrico integrado.',
    width: 64,
    height: 64,
    ports: [
      { id: 'in', label: '1', dx: 0, dy: 32, direction: 'bidirectional' },
      { id: 'out', label: '2', dx: 0, dy: -32, direction: 'bidirectional' },
    ],
    defaultParams: { flowDisplayMode: 'accumulated', hydraulicResistance: 0.0001 },
  },
  flow_sensor_elec: {
    type: 'flow_sensor_elec',
    category: 'instruments',
    name: 'Medidor de Caudal (Conversor Elétrico)',
    shortName: 'Medidor de ...',
    description: 'Sensor de vazão com saída de sinal analógico.',
    width: 92,
    height: 64,
    ports: [
      { id: 'in', label: '1', dx: -18, dy: 32, direction: 'bidirectional' },
      { id: 'out', label: '2', dx: -18, dy: -32, direction: 'bidirectional' },
    ],
    defaultParams: {
      displacementL: 0.0082,
      displacementCc: 8.2,
      frictionCoeff: 0.0128,
      inertiaKgM2: 0.0001,
      loadNm: 0,
    },
  },
  pressure_switch: {
    type: 'pressure_switch',
    category: 'instruments',
    name: 'Pressostato Ajustável c/ Mola',
    shortName: 'Pressostato',
    description: 'Comuta contato elétrico ao atingir a pressão de ajuste.',
    width: 72,
    height: 58,
    ports: [{ id: 'in', label: 'P', dx: -36, dy: 0, direction: 'in' }],
    defaultParams: { crackingPressure: 30, sensingMark: '' },
  },
  pressure_sensor_elec: {
    type: 'pressure_sensor_elec',
    category: 'instruments',
    name: 'Pressostato / Transdutor Elétrico',
    shortName: 'Pressostato',
    description: 'Transdutor eletrônico de pressão com saída de comutação.',
    width: 68,
    height: 58,
    ports: [{ id: 'in', label: 'P', dx: -34, dy: 0, direction: 'in' }],
    defaultParams: { crackingPressure: 30, sensingMark: '' },
  },
  tachometer_sensor: {
    type: 'tachometer_sensor',
    category: 'instruments',
    name: 'Medidor de Caudal / Tacômetro',
    shortName: 'Medidor de ...',
    description: 'Sensor acoplado a medidor rotativo para leitura de caudal e RPM.',
    width: 94,
    height: 66,
    ports: [
      { id: 'A', label: 'A', dx: -20, dy: -33, direction: 'bidirectional' },
      { id: 'B', label: 'B', dx: -20, dy: 33, direction: 'bidirectional' },
    ],
    defaultParams: {
      displacementL: 0.0082,
      displacementCc: 8.2,
      frictionCoeff: 0.0128,
      inertiaKgM2: 0.0001,
      loadNm: 0,
    },
  },
  tee: {
    type: 'tee',
    category: 'instruments',
    name: 'Derivação em T',
    shortName: 'Junção T',
    description: 'Conector manifold de 3 vias para ramificação de linha.',
    width: 48,
    height: 48,
    ports: [
      { id: 'p1', label: '1', dx: -24, dy: 0, direction: 'bidirectional' },
      { id: 'p2', label: '2', dx: 24, dy: 0, direction: 'bidirectional' },
      { id: 'p3', label: '3', dx: 0, dy: 24, direction: 'bidirectional' },
    ],
    defaultParams: {},
  },
  ...EXTENDED_COMPONENT_SPECS,
};

export function isFeedDialogComponent(type: ComponentType): boolean {
  return (
    type === 'power_unit_simple' ||
    type === 'power_unit' ||
    type === 'filter' ||
    type === 'flexible_hose' ||
    type === 'accumulator' ||
    type === 'accumulator_simple' ||
    type === 'accumulator_unit' ||
    type === 'pump' ||
    type === 'pump_variable'
  );
}

export function isPropertyDialogComponent(type: ComponentType): boolean {
  return (
    type === 'motor' ||
    type === 'rotary_actuator' ||
    type === 'nozzle' ||
    type === 'throttle' ||
    type === 'orifice' ||
    type === 'orifice_adjustable' ||
    type === 'shutoff_valve' ||
    type === 'check_throttle' ||
    type === 'check_valve' ||
    type === 'check_valve_spring' ||
    type === 'pilot_check_valve' ||
    type === 'pilot_check_spring' ||
    type === 'pilot_check_close' ||
    type === 'pilot_check_close_spring' ||
    type === 'flow_control_2way' ||
    type === 'flow_control_3way' ||
    type === 'shuttle_valve' ||
    type === 'two_pressure_valve' ||
    type === 'flow_divider' ||
    type === 'relief_valve' ||
    type === 'relief_valve_piloted' ||
    type === 'relief_valve_ext' ||
    type === 'sequence_valve' ||
    type === 'counterbalance_valve' ||
    type === 'pressure_reducer_2' ||
    type === 'pressure_reducer_3' ||
    type === 'pressure_compensator' ||
    type === 'pressure_compensator_b' ||
    type === 'pressure_compensator_c' ||
    type === 'pressure_compensator_d' ||
    type === 'cartridge_valve_a' ||
    type === 'cartridge_valve_b' ||
    type === 'cartridge_valve_c' ||
    type === 'prop_valve_4_3' ||
    type === 'prop_throttle_2_2' ||
    type === 'servo_valve_4_3' ||
    type === 'amp_prop_2ch' ||
    type === 'amp_prop_1ch' ||
    type === 'prop_relief' ||
    type === 'prop_relief_piloted' ||
    type === 'prop_pressure_reducer' ||
    type === 'prop_solenoid' ||
    type === 'pressure_indicator' ||
    type === 'flow_meter' ||
    type === 'flow_meter_analog' ||
    type === 'pressure_switch' ||
    type === 'pressure_sensor_elec' ||
    type === 'elec_pressure_switch' ||
    type === 'elec_pressure_transducer' ||
    type === 'tachometer_sensor' ||
    type === 'flow_sensor_elec' ||
    type === 'elec_flow_transducer' ||
    type === 'elec_dc_motor' ||
    type === 'elec_stepper_motor' ||
    type === 'elec_solenoid_act' ||
    type === 'elec_func_gen' ||
    type === 'elec_setpoint_card' ||
    type === 'elec_relay' ||
    type === 'elec_relay_ton' ||
    type === 'elec_relay_toff' ||
    type === 'elec_counter_relay' ||
    type === 'elec_valve_solenoid' ||
    type === 'elec_amp_1ch' ||
    type === 'elec_amp_2ch' ||
    type === 'elec_prop_solenoid' ||
    type === 'elec_limiter' ||
    type === 'elec_push_no' ||
    type === 'elec_switch_no' ||
    type === 'elec_push_nc' ||
    type === 'elec_switch_nc' ||
    type === 'elec_push_co' ||
    type === 'elec_switch_co' ||
    type === 'elec_contact_no' ||
    type === 'elec_contact_nc' ||
    type === 'elec_contact_co' ||
    type === 'ladder_push_no' ||
    type === 'ladder_push_nc' ||
    type === 'ladder_push_co' ||
    type === 'ladder_contact_no' ||
    type === 'ladder_contact_nc' ||
    type === 'ladder_solenoid' ||
    type === 'ladder_relay' ||
    type === 'ladder_relay_sr' ||
    type === 'ladder_relay_sa'
  );
}

function computeResistanceFactor(resistanceMpa: number | undefined, baselineMpa: number): number {
  const r = Math.max(1e-7, resistanceMpa ?? baselineMpa);
  return Math.max(0.12, Math.min(4.0, Math.sqrt(baselineMpa / r)));
}

export function getRotatedPortOffset(
  dx: number,
  dy: number,
  rotation: 0 | 90 | 180 | 270
): { dx: number; dy: number } {
  switch (rotation) {
    case 90:
      return { dx: -dy, dy: dx };
    case 180:
      return { dx: -dx, dy: -dy };
    case 270:
      return { dx: dy, dy: -dx };
    default:
      return { dx, dy };
  }
}

export function getEffectivePortOffset(
  node: CircuitNode,
  port: PortSpec
): { dx: number; dy: number } {
  if (node.type === 'tee' && node.params.compactJunction) {
    return { dx: 0, dy: 0 };
  }
  const mirrorX =
    node.params.cylinderConfig?.mirrorHorizontal || node.params.valveConfig?.mirrorHorizontal
      ? -1
      : 1;
  const mirrorY =
    node.params.cylinderConfig?.mirrorVertical || node.params.valveConfig?.mirrorVertical
      ? -1
      : 1;
  return getRotatedPortOffset(port.dx * mirrorX, port.dy * mirrorY, node.rotation);
}

export function getPortWorldPosition(
  node: CircuitNode,
  portId: string
): { x: number; y: number } {
  const spec = COMPONENT_CATALOG[node.type];
  const port = spec.ports.find((p) => p.id === portId);
  if (!port) {
    return { x: node.x, y: node.y };
  }
  const rotated = getEffectivePortOffset(node, port);
  return {
    x: node.x + rotated.dx,
    y: node.y + rotated.dy,
  };
}

/**
 * Pure orthogonal pipe routing & segment dragging helpers (zero wavy curves).
 */
export function getPipePolylinePoints(
  pipe: PipeConnection,
  nodes: CircuitNode[]
): PipeWaypoint[] {
  const fromNode = nodes.find((n) => n.id === pipe.fromNodeId);
  const toNode = nodes.find((n) => n.id === pipe.toNodeId);
  if (!fromNode || !toNode) return [];

  const p1 = getPortWorldPosition(fromNode, pipe.fromPortId);
  const p2 = getPortWorldPosition(toNode, pipe.toPortId);

  if (pipe.waypoints && pipe.waypoints.length >= 1) {
    const pts = pipe.waypoints.map((w) => ({ ...w }));
    if (pts.length === 1) {
      if (Math.abs(pts[0].x - p1.x) <= Math.abs(pts[0].y - p1.y)) {
        pts[0].x = p1.x;
        pts[0].y = p2.y;
      } else {
        pts[0].y = p1.y;
        pts[0].x = p2.x;
      }
      return [p1, pts[0], p2];
    }
    // Keep endpoints strictly orthogonal to current port coordinates when nodes move
    if (Math.abs(pts[0].x - p1.x) <= Math.abs(pts[0].y - p1.y)) {
      pts[0].x = p1.x;
    } else {
      pts[0].y = p1.y;
    }
    const lastIdx = pts.length - 1;
    if (Math.abs(pts[lastIdx].x - p2.x) <= Math.abs(pts[lastIdx].y - p2.y)) {
      pts[lastIdx].x = p2.x;
    } else {
      pts[lastIdx].y = p2.y;
    }
    return [p1, ...pts, p2];
  }

  const fromSpec = COMPONENT_CATALOG[fromNode.type]?.ports.find((p) => p.id === pipe.fromPortId);
  const fromOff = fromSpec ? getEffectivePortOffset(fromNode, fromSpec) : { dx: 1, dy: 0 };
  const exitVertical = Math.abs(fromOff.dy) >= Math.abs(fromOff.dx);

  if (exitVertical) {
    const midY = Math.round((p1.y + p2.y) / 2);
    return [p1, { x: p1.x, y: midY }, { x: p2.x, y: midY }, p2];
  }
  const midX = Math.round((p1.x + p2.x) / 2);
  return [p1, { x: midX, y: p1.y }, { x: midX, y: p2.y }, p2];
}

export function moveOrthogonalPipeSegment(
  fullPoints: PipeWaypoint[],
  segmentIndex: number,
  targetCoord: number
): PipeWaypoint[] {
  if (fullPoints.length < 4 || segmentIndex < 0 || segmentIndex >= fullPoints.length - 1) {
    return fullPoints.slice(1, -1);
  }
  const pts = fullPoints.map((p) => ({ ...p }));
  const a = pts[segmentIndex];
  const b = pts[segmentIndex + 1];
  const isHorizontal = Math.abs(a.y - b.y) <= Math.abs(a.x - b.x);

  // If user grabs first or last port-anchored segment, insert a 16px orthogonal stub so it moves freely
  if (segmentIndex === 0) {
    const p1 = pts[0];
    if (isHorizontal) {
      const stubX = p1.x + (b.x >= p1.x ? 18 : -18);
      const nextPts = [
        p1,
        { x: stubX, y: p1.y },
        { x: stubX, y: targetCoord },
        { x: b.x, y: targetCoord },
        ...pts.slice(2),
      ];
      return nextPts.slice(1, -1);
    }
    const stubY = p1.y + (b.y >= p1.y ? 18 : -18);
    const nextPts = [
      p1,
      { x: p1.x, y: stubY },
      { x: targetCoord, y: stubY },
      { x: targetCoord, y: b.y },
      ...pts.slice(2),
    ];
    return nextPts.slice(1, -1);
  }

  if (segmentIndex === pts.length - 2) {
    const p2 = pts[pts.length - 1];
    if (isHorizontal) {
      const stubX = p2.x + (a.x >= p2.x ? 18 : -18);
      const nextPts = [
        ...pts.slice(0, pts.length - 2),
        { x: a.x, y: targetCoord },
        { x: stubX, y: targetCoord },
        { x: stubX, y: p2.y },
        p2,
      ];
      return nextPts.slice(1, -1);
    }
    const stubY = p2.y + (a.y >= p2.y ? 18 : -18);
    const nextPts = [
      ...pts.slice(0, pts.length - 2),
      { x: targetCoord, y: a.y },
      { x: targetCoord, y: stubY },
      { x: p2.x, y: stubY },
      p2,
    ];
    return nextPts.slice(1, -1);
  }

  // Interior segment: move both vertices along the perpendicular axis
  if (isHorizontal) {
    pts[segmentIndex].y = targetCoord;
    pts[segmentIndex + 1].y = targetCoord;
  } else {
    pts[segmentIndex].x = targetCoord;
    pts[segmentIndex + 1].x = targetCoord;
  }
  return pts.slice(1, -1);
}

export interface PipeProjectionHit {
  x: number;
  y: number;
  segmentIndex: number;
  distance: number;
}

export function projectPointOntoPipePolyline(
  pipe: PipeConnection,
  nodes: CircuitNode[],
  wx: number,
  wy: number
): PipeProjectionHit | null {
  const pts = getPipePolylinePoints(pipe, nodes);
  if (pts.length < 2) return null;
  let best: PipeProjectionHit | null = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-6) continue;
    const t = Math.max(0, Math.min(1, ((wx - a.x) * dx + (wy - a.y) * dy) / lenSq));
    const px = a.x + t * dx;
    const py = a.y + t * dy;
    const dist = Math.hypot(wx - px, wy - py);
    if (!best || dist < best.distance) {
      best = {
        x: Math.round(px),
        y: Math.round(py),
        segmentIndex: i,
        distance: dist,
      };
    }
  }
  return best;
}

function dedupePipeWaypoints(
  pts: PipeWaypoint[],
  startAnchor: PipeWaypoint,
  endAnchor: PipeWaypoint
): PipeWaypoint[] | undefined {
  const out: PipeWaypoint[] = [];
  for (const pt of pts) {
    if (
      (Math.abs(pt.x - startAnchor.x) < 1 && Math.abs(pt.y - startAnchor.y) < 1) ||
      (Math.abs(pt.x - endAnchor.x) < 1 && Math.abs(pt.y - endAnchor.y) < 1)
    ) {
      continue;
    }
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev.x - pt.x) < 1 && Math.abs(prev.y - pt.y) < 1) {
      continue;
    }
    out.push({ x: Math.round(pt.x), y: Math.round(pt.y) });
  }
  return out.length > 0 ? out : undefined;
}

export function splitPipeWithJunction(
  nodes: CircuitNode[],
  pipes: PipeConnection[],
  fromNodeId: string,
  fromPortId: string,
  targetPipeId: string,
  tapX: number,
  tapY: number,
  ids?: {
    junctionNodeId?: string;
    pipeBId?: string;
    pipeCId?: string;
  }
): {
  nodes: CircuitNode[];
  pipes: PipeConnection[];
  junctionNodeId: string | null;
} {
  const targetPipe = pipes.find((p) => p.id === targetPipeId);
  if (!targetPipe) {
    return { nodes, pipes, junctionNodeId: null };
  }
  const fullPts = getPipePolylinePoints(targetPipe, nodes);
  if (fullPts.length < 2) {
    return { nodes, pipes, junctionNodeId: null };
  }
  const hit = projectPointOntoPipePolyline(targetPipe, nodes, tapX, tapY);
  const jx = hit ? hit.x : Math.round(tapX);
  const jy = hit ? hit.y : Math.round(tapY);
  const segIdx = hit ? hit.segmentIndex : 0;

  const junctionNodeId =
    ids?.junctionNodeId ?? `junc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const pipeBId =
    ids?.pipeBId ?? `pipe_${Date.now()}_b_${Math.random().toString(36).slice(2, 5)}`;
  const pipeCId =
    ids?.pipeCId ?? `pipe_${Date.now()}_c_${Math.random().toString(36).slice(2, 5)}`;

  const junctionNode: CircuitNode = {
    id: junctionNodeId,
    type: 'tee',
    label: '',
    x: jx,
    y: jy,
    rotation: 0,
    params: { compactJunction: true },
  };

  const jAnchor = { x: jx, y: jy };
  const wpA = dedupePipeWaypoints(fullPts.slice(1, segIdx + 1), fullPts[0], jAnchor);
  const wpB = dedupePipeWaypoints(fullPts.slice(segIdx + 1, -1), jAnchor, fullPts[fullPts.length - 1]);

  const pipeA: PipeConnection = {
    id: targetPipe.id,
    fromNodeId: targetPipe.fromNodeId,
    fromPortId: targetPipe.fromPortId,
    toNodeId: junctionNodeId,
    toPortId: 'p1',
    waypoints: wpA,
  };
  const pipeB: PipeConnection = {
    id: pipeBId,
    fromNodeId: junctionNodeId,
    fromPortId: 'p2',
    toNodeId: targetPipe.toNodeId,
    toPortId: targetPipe.toPortId,
    waypoints: wpB,
  };

  const nextNodes = [...nodes, junctionNode];
  const nextPipes: PipeConnection[] = [];
  for (const pp of pipes) {
    if (pp.id === targetPipeId) {
      nextPipes.push(pipeA, pipeB);
    } else {
      nextPipes.push(pp);
    }
  }
  if (fromNodeId !== junctionNodeId) {
    nextPipes.push({
      id: pipeCId,
      fromNodeId,
      fromPortId,
      toNodeId: junctionNodeId,
      toPortId: 'p3',
    });
  }

  return {
    nodes: nextNodes,
    pipes: nextPipes,
    junctionNodeId,
  };
}

export function hasConfiguredActuatorSide(actuation?: ValveActuationSide | null): boolean {
  if (!actuation) return false;
  return Boolean(
    actuation.manual || actuation.mechanical || actuation.electrical || actuation.piloted
  );
}

const ACTUATOR_MARK_COMPONENT_TYPES: ReadonlySet<ComponentType> = new Set([
  'elec_push_no',
  'elec_push_nc',
  'elec_push_co',
  'elec_switch_no',
  'elec_switch_nc',
  'elec_switch_co',
  'elec_contact_no',
  'elec_contact_nc',
  'elec_contact_co',
  'elec_prox_cap',
  'elec_prox_ind',
  'elec_prox_mag',
  'elec_prox_opt',
  'elec_valve_solenoid',
  'elec_prop_solenoid',
  'prop_solenoid',
  'elec_solenoid_act',
  'elec_relay',
  'elec_relay_ton',
  'elec_relay_toff',
  'elec_counter_relay',
  'pressure_switch',
  'pressure_sensor_elec',
  'elec_pressure_switch',
  'ladder_push_no',
  'ladder_push_nc',
  'ladder_push_co',
  'ladder_contact_no',
  'ladder_contact_nc',
  'ladder_solenoid',
  'ladder_relay',
  'ladder_relay_sr',
  'ladder_relay_sa',
]);

export function isActuatorMarkComponent(type: ComponentType): boolean {
  return ACTUATOR_MARK_COMPONENT_TYPES.has(type);
}

type SignalDomain = 'fluid' | 'electrical' | 'digital' | 'any';

const HYBRID_FLUID_PORTS: Partial<Record<ComponentType, ReadonlySet<string>>> = {
  elec_pressure_switch: new Set(['in']),
  elec_pressure_transducer: new Set(['in']),
  elec_flow_transducer: new Set(['in', 'out']),
  pressure_sensor_elec: new Set(['in']),
  flow_sensor_elec: new Set(['in', 'out']),
};

function getPortSignalDomain(node: CircuitNode, portId: string): SignalDomain {
  if (node.type === 'tee') return 'any';
  const hybrid = HYBRID_FLUID_PORTS[node.type];
  if (hybrid?.has(portId)) return 'fluid';
  const cat = COMPONENT_CATALOG[node.type].category;
  if (cat === 'digital') return 'digital';
  if (cat === 'electrical') return 'electrical';
  return 'fluid';
}

function getPipeSignalDomain(pipe: PipeConnection, nodes: CircuitNode[]): SignalDomain {
  const fromNode = nodes.find((n) => n.id === pipe.fromNodeId);
  const toNode = nodes.find((n) => n.id === pipe.toNodeId);
  const dFrom = fromNode ? getPortSignalDomain(fromNode, pipe.fromPortId) : 'any';
  const dTo = toNode ? getPortSignalDomain(toNode, pipe.toPortId) : 'any';
  if (dFrom !== 'any') return dFrom;
  if (dTo !== 'any') return dTo;
  return 'any';
}

function domainsCompatible(a: SignalDomain, b: SignalDomain): boolean {
  return a === 'any' || b === 'any' || a === b;
}

const NON_INLINE_TWO_PORT_TYPES: ReadonlySet<ComponentType> = new Set([
  'pump',
  'pump_variable',
  'compressor',
  'power_unit',
  'power_unit_simple',
  'cylinder_double',
  'motor',
  'rotary_actuator',
  'diff_pressure_gauge',
]);

export interface PipeInsertSnap {
  pipeId: string;
  mode: 'tap' | 'inline';
  tapX: number;
  tapY: number;
  segmentIndex: number;
  distance: number;
  portId: string;
  secondaryPortId?: string;
  suggestedNodePos?: { x: number; y: number };
}

export function findPipeSnapForComponent(
  nodes: CircuitNode[],
  pipes: PipeConnection[],
  candidateNode: CircuitNode,
  options?: {
    preferredPipeId?: string;
    maxTapDistance?: number;
    maxInlineDistance?: number;
  }
): PipeInsertSnap | null {
  const spec = COMPONENT_CATALOG[candidateNode.type];
  if (!spec || spec.ports.length === 0) return null;

  const maxTapDist = options?.maxTapDistance ?? 48;
  const maxInlineDist = options?.maxInlineDistance ?? 28;
  const candidatePipes = options?.preferredPipeId
    ? pipes.filter(
        (p) =>
          p.id === options.preferredPipeId &&
          p.fromNodeId !== candidateNode.id &&
          p.toNodeId !== candidateNode.id
      )
    : pipes.filter(
        (p) => p.fromNodeId !== candidateNode.id && p.toNodeId !== candidateNode.id
      );

  if (candidatePipes.length === 0) return null;

  const isSinglePort = spec.ports.length === 1;
  const canInlineTwoPort =
    (spec.ports.length === 2 && !NON_INLINE_TWO_PORT_TYPES.has(candidateNode.type)) ||
    (candidateNode.type === 'tee' && !candidateNode.params.compactJunction);

  let bestSnap: PipeInsertSnap | null = null;

  for (const pipe of candidatePipes) {
    const pipeDomain = getPipeSignalDomain(pipe, nodes);
    const fullPts = getPipePolylinePoints(pipe, nodes);
    if (fullPts.length < 2) continue;

    // 1. Single-port component (e.g., Manômetro, Tanque, Pressostato, +24V/0V):
    //    Creates a compact T-junction dot in the middle of the pipe (like Manômetro P).
    if (isSinglePort) {
      const p0 = spec.ports[0];
      if (!domainsCompatible(getPortSignalDomain(candidateNode, p0.id), pipeDomain)) {
        continue;
      }
      const eff = getEffectivePortOffset(candidateNode, p0);
      const portHit = projectPointOntoPipePolyline(
        pipe,
        nodes,
        candidateNode.x + eff.dx,
        candidateNode.y + eff.dy
      );
      const centerHit = projectPointOntoPipePolyline(pipe, nodes, candidateNode.x, candidateNode.y);
      const bestHit =
        portHit && (!centerHit || portHit.distance <= centerHit.distance) ? portHit : centerHit;
      if (!bestHit) continue;

      const effectiveDist = options?.preferredPipeId
        ? 0
        : Math.min(portHit?.distance ?? Infinity, centerHit?.distance ?? Infinity);
      if (effectiveDist > maxTapDist) continue;

      let suggestedNodePos: { x: number; y: number } | undefined;
      const bodyTooCloseToPipe =
        Boolean(options?.preferredPipeId) ||
        (centerHit !== null && centerHit.distance < Math.max(22, spec.height / 2));

      if (bodyTooCloseToPipe) {
        const segA = fullPts[bestHit.segmentIndex] ?? fullPts[0];
        const segB = fullPts[bestHit.segmentIndex + 1] ?? fullPts[fullPts.length - 1];
        const isHorizontal = Math.abs(segA.y - segB.y) <= Math.abs(segA.x - segB.x);
        const clearance = 24;
        if (isHorizontal) {
          if (eff.dy >= 0) {
            suggestedNodePos = {
              x: Math.round(bestHit.x - eff.dx),
              y: Math.round(bestHit.y - eff.dy - clearance),
            };
          } else {
            suggestedNodePos = {
              x: Math.round(bestHit.x - eff.dx),
              y: Math.round(bestHit.y - eff.dy + clearance),
            };
          }
        } else {
          if (eff.dx <= 0) {
            suggestedNodePos = {
              x: Math.round(bestHit.x - eff.dx + clearance),
              y: Math.round(bestHit.y - eff.dy),
            };
          } else {
            suggestedNodePos = {
              x: Math.round(bestHit.x - eff.dx - clearance),
              y: Math.round(bestHit.y - eff.dy),
            };
          }
        }
      }

      if (!bestSnap || effectiveDist < bestSnap.distance) {
        bestSnap = {
          pipeId: pipe.id,
          mode: 'tap',
          tapX: bestHit.x,
          tapY: bestHit.y,
          segmentIndex: bestHit.segmentIndex,
          distance: effectiveDist,
          portId: p0.id,
          suggestedNodePos,
        };
      }
      continue;
    }

    // 2. Two-port inline component or Tee dropped right onto the middle of a pipe:
    if (canInlineTwoPort) {
      const pA = spec.ports[0];
      const pB = spec.ports[1];
      if (
        domainsCompatible(getPortSignalDomain(candidateNode, pA.id), pipeDomain) &&
        domainsCompatible(getPortSignalDomain(candidateNode, pB.id), pipeDomain)
      ) {
        const centerHit = projectPointOntoPipePolyline(
          pipe,
          nodes,
          candidateNode.x,
          candidateNode.y
        );
        const centerDist = options?.preferredPipeId ? 0 : (centerHit?.distance ?? Infinity);
        if (centerHit && centerDist <= maxInlineDist) {
          if (!bestSnap || centerDist < bestSnap.distance) {
            bestSnap = {
              pipeId: pipe.id,
              mode: 'inline',
              tapX: centerHit.x,
              tapY: centerHit.y,
              segmentIndex: centerHit.segmentIndex,
              distance: centerDist,
              portId: pA.id,
              secondaryPortId: pB.id,
              suggestedNodePos: { x: centerHit.x, y: centerHit.y },
            };
          }
          continue;
        }
      }
    }

    // 3. Multi-port component whose port lands near a pipe: tap that port into the pipe
    const multiPortTapMax = options?.preferredPipeId ? maxTapDist : Math.min(28, maxTapDist);
    for (const port of spec.ports) {
      if (!domainsCompatible(getPortSignalDomain(candidateNode, port.id), pipeDomain)) {
        continue;
      }
      const eff = getEffectivePortOffset(candidateNode, port);
      const hit = projectPointOntoPipePolyline(
        pipe,
        nodes,
        candidateNode.x + eff.dx,
        candidateNode.y + eff.dy
      );
      if (!hit) continue;
      const dist = options?.preferredPipeId ? hit.distance : hit.distance;
      if (dist <= multiPortTapMax && (!bestSnap || dist < bestSnap.distance)) {
        bestSnap = {
          pipeId: pipe.id,
          mode: 'tap',
          tapX: hit.x,
          tapY: hit.y,
          segmentIndex: hit.segmentIndex,
          distance: dist,
          portId: port.id,
        };
      }
    }
  }

  return bestSnap;
}

export function insertComponentIntoPipe(
  nodes: CircuitNode[],
  pipes: PipeConnection[],
  nodeId: string,
  options?: {
    preferredPipeId?: string;
    maxTapDistance?: number;
    maxInlineDistance?: number;
    ids?: {
      junctionNodeId?: string;
      pipeBId?: string;
      pipeCId?: string;
    };
  }
): {
  nodes: CircuitNode[];
  pipes: PipeConnection[];
  connected: boolean;
  mode: 'tap' | 'inline' | null;
  junctionNodeId: string | null;
} {
  const targetNode = nodes.find((n) => n.id === nodeId);
  if (!targetNode) {
    return { nodes, pipes, connected: false, mode: null, junctionNodeId: null };
  }

  const snap = findPipeSnapForComponent(nodes, pipes, targetNode, options);
  if (!snap) {
    return { nodes, pipes, connected: false, mode: null, junctionNodeId: null };
  }

  const adjustedNodes = snap.suggestedNodePos
    ? nodes.map((n) =>
        n.id === nodeId
          ? { ...n, x: snap.suggestedNodePos!.x, y: snap.suggestedNodePos!.y }
          : n
      )
    : nodes;

  if (snap.mode === 'tap') {
    const split = splitPipeWithJunction(
      adjustedNodes,
      pipes,
      nodeId,
      snap.portId,
      snap.pipeId,
      snap.tapX,
      snap.tapY,
      options?.ids
    );
    return {
      nodes: split.nodes,
      pipes: split.pipes,
      connected: Boolean(split.junctionNodeId),
      mode: split.junctionNodeId ? 'tap' : null,
      junctionNodeId: split.junctionNodeId,
    };
  }

  // Inline splice: split targetPipe into pipeA (from -> entryPort) and pipeB (exitPort -> to)
  const targetPipe = pipes.find((p) => p.id === snap.pipeId);
  const placedNode = adjustedNodes.find((n) => n.id === nodeId);
  if (!targetPipe || !placedNode || !snap.secondaryPortId) {
    return { nodes, pipes, connected: false, mode: null, junctionNodeId: null };
  }

  const fullPts = getPipePolylinePoints(targetPipe, nodes);
  if (fullPts.length < 2) {
    return { nodes, pipes, connected: false, mode: null, junctionNodeId: null };
  }

  const spec = COMPONENT_CATALOG[placedNode.type];
  const portA = spec.ports.find((p) => p.id === snap.portId);
  const portB = spec.ports.find((p) => p.id === snap.secondaryPortId);
  if (!portA || !portB) {
    return { nodes, pipes, connected: false, mode: null, junctionNodeId: null };
  }

  const effA = getEffectivePortOffset(placedNode, portA);
  const effB = getEffectivePortOffset(placedNode, portB);
  const posA = { x: placedNode.x + effA.dx, y: placedNode.y + effA.dy };
  const posB = { x: placedNode.x + effB.dx, y: placedNode.y + effB.dy };
  const segStart = fullPts[snap.segmentIndex] ?? fullPts[0];
  const segEnd = fullPts[snap.segmentIndex + 1] ?? fullPts[fullPts.length - 1];

  const dDirect =
    Math.hypot(segStart.x - posA.x, segStart.y - posA.y) +
    Math.hypot(segEnd.x - posB.x, segEnd.y - posB.y);
  const dSwap =
    Math.hypot(segStart.x - posB.x, segStart.y - posB.y) +
    Math.hypot(segEnd.x - posA.x, segEnd.y - posA.y);

  const entryPortId = dDirect <= dSwap ? portA.id : portB.id;
  const exitPortId = dDirect <= dSwap ? portB.id : portA.id;
  const entryAnchor = dDirect <= dSwap ? posA : posB;
  const exitAnchor = dDirect <= dSwap ? posB : posA;

  const wpA = dedupePipeWaypoints(
    fullPts.slice(1, snap.segmentIndex + 1),
    fullPts[0],
    entryAnchor
  );
  const wpB = dedupePipeWaypoints(
    fullPts.slice(snap.segmentIndex + 1, -1),
    exitAnchor,
    fullPts[fullPts.length - 1]
  );

  const pipeBId =
    options?.ids?.pipeBId ?? `pipe_${Date.now()}_in_${Math.random().toString(36).slice(2, 5)}`;

  const pipeA: PipeConnection = {
    id: targetPipe.id,
    fromNodeId: targetPipe.fromNodeId,
    fromPortId: targetPipe.fromPortId,
    toNodeId: nodeId,
    toPortId: entryPortId,
    waypoints: wpA,
  };
  const pipeB: PipeConnection = {
    id: pipeBId,
    fromNodeId: nodeId,
    fromPortId: exitPortId,
    toNodeId: targetPipe.toNodeId,
    toPortId: targetPipe.toPortId,
    waypoints: wpB,
  };

  const nextPipes: PipeConnection[] = [];
  for (const pp of pipes) {
    if (pp.id === targetPipe.id) {
      nextPipes.push(pipeA, pipeB);
    } else {
      nextPipes.push(pp);
    }
  }

  return {
    nodes: adjustedNodes,
    pipes: nextPipes,
    connected: true,
    mode: 'inline',
    junctionNodeId: null,
  };
}

export function createInitialSimulationState(
  nodes: CircuitNode[],
  pipes: PipeConnection[],
  fluid: FluidMedium,
  running = false
): SimulationState {
  const nodeStates: Record<string, NodeRuntimeState> = {};
  for (const node of nodes) {
    const spec = COMPONENT_CATALOG[node.type];
    const portPressures: Record<string, number> = {};
    const portFlows: Record<string, number> = {};
    for (const p of spec.ports) {
      portPressures[p.id] = 0;
      portFlows[p.id] = 0;
    }
    let initPistonPos = 0;
    if (node.type === 'cylinder_single' || node.type === 'cylinder_double') {
      const stroke = Math.max(1, node.params.strokeMm ?? (node.type === 'cylinder_single' ? 200 : 250));
      const initMm = node.params.cylinderConfig?.initialPosMm ?? 0;
      initPistonPos = Number(Math.min(1, Math.max(0, initMm / stroke)).toFixed(4));
    } else if (node.type === 'rotary_actuator') {
      initPistonPos = node.params.rotaryInitialPos === 'right' ? 1 : 0;
    }
    nodeStates[node.id] = {
      portPressures,
      portFlows,
      pistonPos: initPistonPos,
      velocityMs: 0,
      forceN: 0,
      flowLpm: 0,
      accumulatedVolumeL: 0,
      rpm: 0,
      isOpen: false,
      chamberAPressure: 0,
      chamberBPressure: 0,
    };
  }

  const pipeStates: Record<string, PipeRuntimeState> = {};
  for (const pipe of pipes) {
    pipeStates[pipe.id] = { pressureBar: 0, flowLpm: 0 };
  }

  return {
    timeSec: 0,
    running,
    fluid,
    ambientTempC: 24,
    nodes: nodeStates,
    pipes: pipeStates,
    maxSystemPressureBar: 0,
    totalFlowLpm: 0,
    powerKw: 0,
  };
}

function makePortKey(nodeId: string, portId: string): string {
  return `${nodeId}::${portId}`;
}

/**
 * Nodal conductance & compressible chamber solver.
 * Pure deterministic function: returns a new SimulationState for time step dtSec.
 */
export function stepFluidSimulation(
  prev: SimulationState,
  nodes: CircuitNode[],
  pipes: PipeConnection[],
  dtSec: number
): SimulationState {
  const dt = Math.min(Math.max(dtSec, 0.001), 0.05);
  const fluidScale = prev.fluid === 'pneumatic' ? 1.45 : 1.0;

  // Ensure every node & pipe has an entry in working state
  const nextNodes: Record<string, NodeRuntimeState> = {};
  const portPressure: Record<string, number> = {};

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const isPortPlugged = (nodeId: string, portId: string): boolean => {
    const n = nodeById.get(nodeId);
    return Boolean(n?.params.portConfigs?.[portId]?.blindPlug);
  };

  for (const node of nodes) {
    const spec = COMPONENT_CATALOG[node.type];
    const oldState = prev.nodes[node.id];
    const portPressures: Record<string, number> = {};
    const portFlows: Record<string, number> = {};
    for (const p of spec.ports) {
      const val = oldState?.portPressures?.[p.id] ?? 0;
      portPressures[p.id] = Number.isFinite(val) ? val : 0;
      portFlows[p.id] = 0;
      portPressure[makePortKey(node.id, p.id)] = portPressures[p.id];
    }
    nextNodes[node.id] = {
      portPressures,
      portFlows,
      pistonPos: oldState?.pistonPos ?? 0,
      velocityMs: oldState?.velocityMs ?? 0,
      forceN: oldState?.forceN ?? 0,
      flowLpm: oldState?.flowLpm ?? 0,
      accumulatedVolumeL: oldState?.accumulatedVolumeL ?? 0,
      rpm: oldState?.rpm ?? 0,
      isOpen: oldState?.isOpen ?? false,
      chamberAPressure: oldState?.chamberAPressure ?? 0,
      chamberBPressure: oldState?.chamberBPressure ?? 0,
    };
  }

  // Adjacency for Gauss-Seidel nodal pressure relaxation
  interface ConductiveEdge {
    a: string;
    b: string;
    conductance: number; // L/min per bar
    oneWay?: boolean;
    crackingBar?: number;
  }

  const edges: ConductiveEdge[] = [];
  const fixedNodes = new Map<string, number>();

  for (const pipe of pipes) {
    if (isPortPlugged(pipe.fromNodeId, pipe.fromPortId) || isPortPlugged(pipe.toNodeId, pipe.toPortId)) {
      continue;
    }
    const kA = makePortKey(pipe.fromNodeId, pipe.fromPortId);
    const kB = makePortKey(pipe.toNodeId, pipe.toPortId);
    if (kA in portPressure && kB in portPressure) {
      edges.push({ a: kA, b: kB, conductance: 28 * fluidScale });
    }
  }

  // Two-pass 24V -> 0V electrical control network solver (drives solenoids, relays, lamps, directional valves)
  const wiredPortSet = new Set<string>();
  const baseElecPipeAdj = new Map<string, string[]>();
  const addAdjacencyEdge = (map: Map<string, string[]>, a: string, b: string) => {
    if (!map.has(a)) map.set(a, []);
    if (!map.has(b)) map.set(b, []);
    map.get(a)!.push(b);
    map.get(b)!.push(a);
  };
  for (const pipe of pipes) {
    if (isPortPlugged(pipe.fromNodeId, pipe.fromPortId) || isPortPlugged(pipe.toNodeId, pipe.toPortId)) {
      continue;
    }
    const kA = makePortKey(pipe.fromNodeId, pipe.fromPortId);
    const kB = makePortKey(pipe.toNodeId, pipe.toPortId);
    wiredPortSet.add(kA);
    wiredPortSet.add(kB);
    addAdjacencyEdge(baseElecPipeAdj, kA, kB);
  }

  const pressureMarksTriggered = new Set<string>();
  for (const node of nodes) {
    if (
      node.type === 'pressure_switch' ||
      node.type === 'pressure_sensor_elec' ||
      node.type === 'elec_pressure_switch'
    ) {
      const pPrev =
        prev.nodes[node.id]?.portPressures?.['in'] ??
        prev.nodes[node.id]?.portPressures?.['p'] ??
        0;
      const threshold = Math.max(0.001, node.params.crackingPressure ?? 30);
      if (pPrev >= threshold || Boolean(node.params.active)) {
        const mk = (node.params.sensingMark ?? '').trim().toUpperCase();
        if (mk) pressureMarksTriggered.add(mk);
      }
    }
  }

  const mechanicalMarksTriggered = new Set<string>();
  for (const node of nodes) {
    if (node.type === 'cylinder_single' || node.type === 'cylinder_double') {
      const cylCfg = getEffectiveCylinderConfig(node);
      const strokeMm = Math.max(1, node.params.strokeMm ?? 200);
      const prevPosMm = (prev.nodes[node.id]?.pistonPos ?? 0) * strokeMm;
      for (const lbl of cylCfg.actuationLabels ?? []) {
        const mk = lbl.mark.trim().toUpperCase();
        if (!mk) continue;
        const start = Number(lbl.startMm);
        const end = Number(lbl.endMm);
        if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
        const lo = Math.min(start, end);
        const hi = Math.max(start, end);
        if (prevPosMm >= lo - 0.5 && prevPosMm <= hi + 0.5) {
          mechanicalMarksTriggered.add(mk);
        }
      }
    } else if (node.type === 'rotary_actuator') {
      const pos = prev.nodes[node.id]?.pistonPos ?? (node.params.rotaryInitialPos === 'right' ? 1 : 0);
      const m1 = (node.params.sensingMark ?? '').trim().toUpperCase();
      const m2 = (node.params.secondaryMark ?? '').trim().toUpperCase();
      if (m1 && pos <= 0.03) mechanicalMarksTriggered.add(m1);
      if (m2 && pos >= 0.97) mechanicalMarksTriggered.add(m2);
    }
  }

  const energizedRelayMarks = new Set<string>();
  const energizedValveSolenoidMarks = new Set<string>();
  const energizedElecNodeIds = new Set<string>();
  let unlabelledEnergizedValveSolenoids = 0;

  for (let pass = 0; pass < 2; pass++) {
    const elecAdj = new Map<string, string[]>();
    for (const [k, list] of baseElecPipeAdj.entries()) {
      elecAdj.set(k, [...list]);
    }
    const linkElecPorts = (nodeId: string, portA: string, portB: string) => {
      addAdjacencyEdge(elecAdj, makePortKey(nodeId, portA), makePortKey(nodeId, portB));
    };

    for (const node of nodes) {
      const p = node.params;
      const mk = (p.sensingMark ?? '').trim().toUpperCase();
      const markTriggered = Boolean(
        mk &&
          (energizedRelayMarks.has(mk) ||
            pressureMarksTriggered.has(mk) ||
            mechanicalMarksTriggered.has(mk))
      );

      switch (node.type) {
        case 'tee':
          linkElecPorts(node.id, 'p1', 'p2');
          linkElecPorts(node.id, 'p2', 'p3');
          linkElecPorts(node.id, 'p1', 'p3');
          break;
        case 'elec_push_no':
        case 'elec_switch_no':
        case 'ladder_push_no':
          if (Boolean(p.active) || markTriggered) {
            linkElecPorts(node.id, 'in', 'out');
          }
          break;
        case 'elec_push_nc':
        case 'elec_switch_nc':
        case 'ladder_push_nc':
          if (!(Boolean(p.active) || markTriggered)) {
            linkElecPorts(node.id, 'in', 'out');
          }
          break;
        case 'elec_push_co':
        case 'elec_switch_co':
          linkElecPorts(node.id, 'in', Boolean(p.active) || markTriggered ? 'no' : 'nc');
          break;
        case 'ladder_push_co':
          if (Boolean(p.active) || markTriggered) {
            linkElecPorts(node.id, 'in2', 'out2');
          } else {
            linkElecPorts(node.id, 'in1', 'out1');
          }
          break;
        case 'elec_contact_no':
        case 'ladder_contact_no':
          if (Boolean(p.active) || markTriggered) {
            linkElecPorts(node.id, 'in', 'out');
          }
          break;
        case 'elec_contact_nc':
        case 'ladder_contact_nc':
          if (!(Boolean(p.active) || markTriggered)) {
            linkElecPorts(node.id, 'in', 'out');
          }
          break;
        case 'elec_contact_co':
          linkElecPorts(node.id, 'in', Boolean(p.active) || markTriggered ? 'no' : 'nc');
          break;
        case 'elec_pressure_switch': {
          const pPrev = prev.nodes[node.id]?.portPressures?.['p'] ?? 0;
          const threshold = Math.max(0.001, p.crackingPressure ?? 30);
          if (pPrev >= threshold || Boolean(p.active)) {
            linkElecPorts(node.id, 'in', 'out');
          }
          break;
        }
        case 'elec_ammeter':
          linkElecPorts(node.id, 'in', 'out');
          break;
        case 'elec_limiter':
          linkElecPorts(node.id, 'v24', 'out');
          linkElecPorts(node.id, 'in', 'v0');
          break;
      }
    }

    const collectNet = (seeds: string[]): Set<string> => {
      const visited = new Set<string>(seeds);
      const queue = [...seeds];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        for (const nb of elecAdj.get(cur) ?? []) {
          if (!visited.has(nb)) {
            visited.add(nb);
            queue.push(nb);
          }
        }
      }
      return visited;
    };

    const seeds24: string[] = [];
    const seeds0: string[] = [];
    for (const node of nodes) {
      if (node.type === 'elec_24v' || node.type === 'ladder_24v') {
        seeds24.push(makePortKey(node.id, 'out'));
      } else if (node.type === 'elec_0v' || node.type === 'ladder_0v') {
        seeds0.push(makePortKey(node.id, 'out'));
      } else if (node.type === 'elec_func_gen' && Math.abs(node.params.funcGenAmpV ?? 10) > 0.1) {
        seeds24.push(makePortKey(node.id, 'out'));
      } else if (node.type === 'dig_hi' && node.params.active !== false) {
        seeds24.push(makePortKey(node.id, 'out'));
      }
    }

    let elecNet24 = collectNet(seeds24);
    const elecNet0 = collectNet(seeds0);

    const extra24: string[] = [];
    for (const node of nodes) {
      if (
        node.type === 'elec_prox_cap' ||
        node.type === 'elec_prox_ind' ||
        node.type === 'elec_prox_mag' ||
        node.type === 'elec_prox_opt'
      ) {
        const k24 = makePortKey(node.id, 'v24');
        const k0 = makePortKey(node.id, 'v0');
        const kOut = makePortKey(node.id, 'out');
        if (elecNet24.has(k24) && elecNet0.has(k0) && Boolean(node.params.active)) {
          extra24.push(kOut);
        }
      }
    }
    if (extra24.length > 0) {
      elecNet24 = collectNet([...elecNet24, ...extra24]);
    }

    energizedRelayMarks.clear();
    energizedValveSolenoidMarks.clear();
    energizedElecNodeIds.clear();
    unlabelledEnergizedValveSolenoids = 0;

    for (const node of nodes) {
      const p = node.params;
      const mk = (p.sensingMark ?? '').trim().toUpperCase();
      const kA =
        node.type === 'elec_counter_relay'
          ? makePortKey(node.id, 'a1')
          : makePortKey(node.id, 'in');
      const kB =
        node.type === 'elec_counter_relay'
          ? makePortKey(node.id, 'a2')
          : makePortKey(node.id, 'out');
      const isWired = wiredPortSet.has(kA) || wiredPortSet.has(kB);
      const wiredLoop =
        (elecNet24.has(kA) && elecNet0.has(kB)) || (elecNet24.has(kB) && elecNet0.has(kA));

      if (
        node.type === 'elec_valve_solenoid' ||
        node.type === 'ladder_solenoid' ||
        node.type === 'elec_prop_solenoid' ||
        node.type === 'elec_solenoid_act'
      ) {
        const energized = wiredLoop || (!isWired && Boolean(p.active));
        if (energized) {
          energizedElecNodeIds.add(node.id);
          if (mk) {
            energizedValveSolenoidMarks.add(mk);
            energizedRelayMarks.add(mk);
          } else {
            unlabelledEnergizedValveSolenoids += 1;
          }
        }
      } else if (
        node.type === 'elec_relay' ||
        node.type === 'elec_relay_ton' ||
        node.type === 'elec_relay_toff' ||
        node.type === 'elec_counter_relay' ||
        node.type === 'ladder_relay' ||
        node.type === 'ladder_relay_sr' ||
        node.type === 'ladder_relay_sa'
      ) {
        const nextTime = prev.timeSec + dt;
        const delaySec = Math.min(100, Math.max(0.01, p.relayDelaySec ?? 5));
        const coilDrive = wiredLoop || (!isWired && Boolean(p.active));
        let energized = coilDrive;
        if (node.type === 'elec_relay_ton' || node.type === 'ladder_relay_sr') {
          energized = coilDrive && nextTime >= delaySec;
        } else if (node.type === 'elec_relay_toff' || node.type === 'ladder_relay_sa') {
          energized = coilDrive || nextTime < delaySec;
        } else if (node.type === 'elec_counter_relay') {
          const preset = Math.min(9999, Math.max(0, Math.round(p.counterPreset ?? 5)));
          energized = preset === 0 || coilDrive;
        }
        if (energized) {
          energizedElecNodeIds.add(node.id);
          if (mk) energizedRelayMarks.add(mk);
        }
      } else if (
        node.type === 'elec_lamp' ||
        node.type === 'ladder_lamp' ||
        node.type === 'elec_buzzer' ||
        node.type === 'elec_dc_motor' ||
        node.type === 'elec_stepper_motor'
      ) {
        const energized = wiredLoop || (!isWired && p.active !== false && node.type.includes('motor'));
        if (energized) {
          energizedElecNodeIds.add(node.id);
        }
      }
    }
  }

  const resolveDirectionalValvePosition = (
    node: CircuitNode,
    isThree: boolean
  ): { posIdx: number; active: boolean } => {
    const p = node.params;
    const vCfg = getEffectiveValveConfig(node);
    const leftMark = (vCfg.leftActuation.mark || p.sensingMark || '').trim().toUpperCase();
    const rightMark = (vCfg.rightActuation.mark || p.secondaryMark || '').trim().toUpperCase();

    const leftHasSolenoid =
      vCfg.leftActuation.electrical === 'solenoid' ||
      vCfg.leftActuation.electrical === 'hydraulic_pilot_solenoid';
    const rightHasSolenoid =
      vCfg.rightActuation.electrical === 'solenoid' ||
      vCfg.rightActuation.electrical === 'hydraulic_pilot_solenoid';

    const leftHasMechanical = Boolean(vCfg.leftActuation.mechanical);
    const rightHasMechanical = Boolean(vCfg.rightActuation.mechanical);

    let leftElec = Boolean(
      leftMark &&
        ((leftHasSolenoid && energizedValveSolenoidMarks.has(leftMark)) ||
          (leftHasMechanical && mechanicalMarksTriggered.has(leftMark)) ||
          (!leftHasSolenoid &&
            !leftHasMechanical &&
            (energizedValveSolenoidMarks.has(leftMark) || mechanicalMarksTriggered.has(leftMark))))
    );
    let rightElec = Boolean(
      rightMark &&
        ((rightHasSolenoid && energizedValveSolenoidMarks.has(rightMark)) ||
          (rightHasMechanical && mechanicalMarksTriggered.has(rightMark)) ||
          (!rightHasSolenoid &&
            !rightHasMechanical &&
            (energizedValveSolenoidMarks.has(rightMark) || mechanicalMarksTriggered.has(rightMark))))
    );

    if (!leftMark && !rightMark && unlabelledEnergizedValveSolenoids > 0) {
      if (leftHasSolenoid) {
        leftElec = true;
      } else if (rightHasSolenoid) {
        rightElec = true;
      }
    }

    const hasAnySpring = Boolean(
      vCfg.leftActuation.springReturn || vCfg.rightActuation.springReturn
    );
    const rt = nextNodes[node.id];
    const prevSignalPos = prev.nodes[node.id]?.signalSpoolPos;

    if (isThree) {
      const restPos = Math.max(0, Math.min(2, vCfg.initialPosition ?? 1));
      const manualPos = Math.max(0, Math.min(2, p.spoolPosition ?? (p.active ? 0 : restPos)));
      let posIdx = manualPos;
      if (leftElec && !rightElec) {
        posIdx = 0;
        if (!hasAnySpring && rt) rt.signalSpoolPos = 0;
      } else if (rightElec && !leftElec) {
        posIdx = 2;
        if (!hasAnySpring && rt) rt.signalSpoolPos = 2;
      } else if (leftElec && rightElec) {
        posIdx = vCfg.dominantSignal
          ? vCfg.dominantSide === 'right'
            ? 2
            : 0
          : restPos;
        if (!hasAnySpring && rt) rt.signalSpoolPos = posIdx;
      } else if (!hasAnySpring && prevSignalPos !== undefined) {
        posIdx = prevSignalPos;
        if (rt) rt.signalSpoolPos = prevSignalPos;
      } else if (rt) {
        rt.signalSpoolPos = undefined;
      }
      return { posIdx, active: posIdx !== restPos };
    }

    const restPos = vCfg.initialPosition === 0 ? 0 : 1;
    const manualPos =
      p.spoolPosition !== undefined
        ? p.spoolPosition === 0
          ? 0
          : 1
        : p.active !== undefined
          ? p.active
            ? 0
            : 1
          : restPos;

    let posIdx = manualPos;
    if (leftElec && !rightElec) {
      posIdx = 0;
      if (!hasAnySpring && rt) rt.signalSpoolPos = 0;
    } else if (rightElec && !leftElec) {
      posIdx = 1;
      if (!hasAnySpring && rt) rt.signalSpoolPos = 1;
    } else if (leftElec && rightElec) {
      posIdx = vCfg.dominantSignal ? (vCfg.dominantSide === 'right' ? 1 : 0) : manualPos;
      if (!hasAnySpring && rt) rt.signalSpoolPos = posIdx;
    } else if (!hasAnySpring && prevSignalPos !== undefined) {
      posIdx = prevSignalPos;
      if (rt) rt.signalSpoolPos = prevSignalPos;
    } else if (rt) {
      rt.signalSpoolPos = undefined;
    }
    return { posIdx, active: posIdx === 0 };
  };

  // Internal component conductances and Dirichlet sources
  for (const node of nodes) {
    const p = node.params;
    const rt = nextNodes[node.id];

    switch (node.type) {
      case 'tank': {
        fixedNodes.set(makePortKey(node.id, 'in'), 0);
        break;
      }
      case 'power_unit_simple': {
        const targetP = Math.max(0, p.targetPressure ?? 120);
        fixedNodes.set(makePortKey(node.id, 'out'), targetP);
        break;
      }
      case 'pump':
      case 'pump_variable':
      case 'pump_prop': {
        const targetP = Math.max(0, p.targetPressure ?? 120);
        const suctionKey = makePortKey(node.id, 'suction');
        const outKey = makePortKey(node.id, 'out');
        fixedNodes.set(suctionKey, 0);
        fixedNodes.set(outKey, targetP);
        break;
      }
      case 'power_unit': {
        const targetP = Math.max(0, p.targetPressure ?? 120);
        fixedNodes.set(makePortKey(node.id, 'out'), targetP);
        fixedNodes.set(makePortKey(node.id, 'tank'), 0);
        break;
      }
      case 'accumulator_simple':
      case 'accumulator': {
        const inKey = makePortKey(node.id, 'in');
        const preCharge = Math.max(0, p.crackingPressure ?? 40);
        const pLine = portPressure[inKey] ?? 0;
        const storedP = Math.max(rt.chamberAPressure, pLine > preCharge ? pLine : 0);
        if (storedP > 0.2) {
          fixedNodes.set(inKey, Math.max(pLine, storedP * 0.98));
        }
        break;
      }
      case 'accumulator_unit': {
        const inKey = makePortKey(node.id, 'in');
        const outKey = makePortKey(node.id, 'out');
        fixedNodes.set(outKey, 0);
        edges.push({ a: inKey, b: outKey, conductance: 2 * fluidScale, oneWay: true, crackingBar: p.crackingPressure ?? 100 });
        break;
      }
      case 'compressor': {
        const targetP = Math.max(0, p.targetPressure ?? 6);
        fixedNodes.set(makePortKey(node.id, 'out'), targetP);
        break;
      }
      case 'regulator':
      case 'prop_pressure_reducer':
      case 'pressure_reducer_2': {
        const inKey = makePortKey(node.id, 'in');
        const outKey = makePortKey(node.id, 'out');
        const minP = node.type === 'prop_pressure_reducer' ? (p.minPressureBar ?? 0) : 0;
        const setP = Math.max(minP, p.targetPressure ?? p.crackingPressure ?? 50);
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.01);
        const pIn = portPressure[inKey] ?? 0;
        if (pIn > 0.05) {
          fixedNodes.set(outKey, Math.min(pIn, setP));
        } else {
          edges.push({ a: inKey, b: outKey, conductance: 14 * fluidScale * rFactor });
        }
        break;
      }
      case 'pressure_reducer_3': {
        const inKey = makePortKey(node.id, 'in');
        const outKey = makePortKey(node.id, 'out');
        const tKey = makePortKey(node.id, 'T');
        const setP = Math.max(0, p.targetPressure ?? p.crackingPressure ?? 50);
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.01);
        const pIn = portPressure[inKey] ?? 0;
        const pOut = portPressure[outKey] ?? 0;
        if (pIn > 0.05) {
          fixedNodes.set(outKey, Math.min(pIn, setP));
        } else {
          edges.push({ a: inKey, b: outKey, conductance: 14 * fluidScale * rFactor });
        }
        if (pOut > setP + 1) {
          edges.push({ a: outKey, b: tKey, conductance: 20 * fluidScale * rFactor, oneWay: true, crackingBar: setP });
        }
        break;
      }
      case 'tee': {
        const k1 = makePortKey(node.id, 'p1');
        const k2 = makePortKey(node.id, 'p2');
        const k3 = makePortKey(node.id, 'p3');
        edges.push({ a: k1, b: k2, conductance: 90 });
        edges.push({ a: k2, b: k3, conductance: 90 });
        edges.push({ a: k1, b: k3, conductance: 90 });
        break;
      }
      case 'flexible_hose':
      case 'filter': {
        const defaultR = node.type === 'filter' ? 0.0001 : 0.012;
        const r = Math.max(1e-7, p.hydraulicResistance ?? defaultR);
        const cond = Math.max(0.5, Math.min(80, (12 / Math.sqrt(r * 10000)) * fluidScale));
        edges.push({
          a: makePortKey(node.id, 'in'),
          b: makePortKey(node.id, 'out'),
          conductance: cond,
        });
        break;
      }
      case 'cooler':
      case 'heater':
      case 'pump_amplifier':
      case 'amp_prop_1ch':
      case 'amp_prop_2ch':
      case 'prop_solenoid': {
        edges.push({
          a: makePortKey(node.id, 'in'),
          b: makePortKey(node.id, 'out'),
          conductance: 42 * fluidScale,
        });
        break;
      }
      case 'flow_meter':
      case 'flow_meter_analog':
      case 'flow_sensor_elec': {
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.0001);
        edges.push({
          a: makePortKey(node.id, 'in'),
          b: makePortKey(node.id, 'out'),
          conductance: Math.max(0.2, 42 * fluidScale * rFactor),
        });
        break;
      }
      case 'throttle':
      case 'nozzle':
      case 'orifice_adjustable': {
        const baselineR = node.type === 'throttle' ? 0.045 : 0.01;
        const rFactor = computeResistanceFactor(p.hydraulicResistance, baselineR);
        const opening = Math.min(100, Math.max(0, p.opening ?? 60));
        if (opening > 0) {
          const g = Math.pow(opening / 100, 2) * 24 * fluidScale * rFactor;
          edges.push({
            a: makePortKey(node.id, 'in'),
            b: makePortKey(node.id, 'out'),
            conductance: Math.max(0.08, g),
          });
        }
        break;
      }
      case 'flow_control_2way': {
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.019);
        const nomScale =
          p.nominalFlowLpm !== undefined
            ? Math.max(0.08, Math.min(2.2, p.nominalFlowLpm / 10))
            : 1;
        const opening = Math.min(100, Math.max(2, p.opening ?? 60));
        const g = Math.pow(opening / 100, 2) * 24 * fluidScale * rFactor * nomScale;
        edges.push({
          a: makePortKey(node.id, 'in'),
          b: makePortKey(node.id, 'out'),
          conductance: Math.max(0.08, g),
        });
        break;
      }
      case 'flow_control_3way': {
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.019);
        const nomScale =
          p.nominalFlowLpm !== undefined
            ? Math.max(0.08, Math.min(2.2, p.nominalFlowLpm / 10))
            : 1;
        const opening = Math.min(100, Math.max(2, p.opening ?? 60));
        const g = Math.pow(opening / 100, 2) * 24 * fluidScale * rFactor * nomScale;
        const inKey = makePortKey(node.id, 'in');
        const outKey = makePortKey(node.id, 'out');
        const tKey = makePortKey(node.id, 'T');
        edges.push({ a: inKey, b: outKey, conductance: Math.max(0.1, g) });
        edges.push({ a: inKey, b: tKey, conductance: Math.max(0.5, ((100 - opening) / 100) * 12 * fluidScale) });
        break;
      }
      case 'check_valve':
      case 'check_valve_spring': {
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.01);
        const cracking = Math.max(0, p.crackingPressure ?? (node.type === 'check_valve_spring' ? 2.5 : 0.5));
        edges.push({
          a: makePortKey(node.id, 'in'),
          b: makePortKey(node.id, 'out'),
          conductance: 22 * fluidScale * rFactor,
          oneWay: true,
          crackingBar: cracking,
        });
        break;
      }
      case 'check_throttle': {
        const inKey = makePortKey(node.id, 'in');
        const outKey = makePortKey(node.id, 'out');
        const opening = Math.min(100, Math.max(0, p.opening ?? 45));
        const rThrottleFactor = computeResistanceFactor(p.hydraulicResistance, 0.01);
        const rCheckFactor = computeResistanceFactor(p.checkValveResistance, 0.01);
        const gThrottled =
          opening > 0 ? Math.max(0.08, Math.pow(opening / 100, 2) * 24 * fluidScale * rThrottleFactor) : 0;
        const pIn = portPressure[inKey] ?? 0;
        const pOut = portPressure[outKey] ?? 0;
        // Throttled forward (in -> out), free bypass reverse (out -> in)
        const activeG = pOut > pIn + 0.3 ? 22 * fluidScale * rCheckFactor : gThrottled;
        if (activeG > 0) {
          edges.push({
            a: inKey,
            b: outKey,
            conductance: activeG,
          });
        }
        break;
      }
      case 'pilot_check_valve':
      case 'pilot_check_spring': {
        const inKey = makePortKey(node.id, 'in');
        const outKey = makePortKey(node.id, 'out');
        const pilotKey = makePortKey(node.id, 'X');
        const pPilot = portPressure[pilotKey] ?? 0;
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.01);
        const areaRatio = Math.min(10, Math.max(1, p.areaRatio ?? (node.type === 'pilot_check_spring' ? 3.3 : 5)));
        const cracking = Math.max(0.1, p.crackingPressure ?? (node.type === 'pilot_check_spring' ? 1.0 : 1.5));
        const effectivePilot = pPilot * (areaRatio / 5);
        if (effectivePilot >= cracking) {
          rt.isOpen = true;
          edges.push({ a: inKey, b: outKey, conductance: 24 * fluidScale * rFactor });
        } else {
          rt.isOpen = false;
          edges.push({
            a: inKey,
            b: outKey,
            conductance: 22 * fluidScale * rFactor,
            oneWay: true,
            crackingBar: node.type === 'pilot_check_spring' ? cracking : 0.4,
          });
        }
        break;
      }
      case 'pilot_check_close':
      case 'pilot_check_close_spring': {
        const inKey = makePortKey(node.id, 'in');
        const outKey = makePortKey(node.id, 'out');
        const pilotKey = makePortKey(node.id, 'X');
        const pPilot = portPressure[pilotKey] ?? 0;
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.01);
        const areaRatio = Math.min(10, Math.max(1, p.areaRatio ?? 5));
        const cracking = Math.max(0.1, p.crackingPressure ?? (node.type === 'pilot_check_close_spring' ? 1.0 : 2.0));
        const effectivePilot = pPilot * (areaRatio / 5);
        if (effectivePilot >= cracking) {
          rt.isOpen = false; // Pilot pressure closes both directions
        } else {
          rt.isOpen = true;
          edges.push({
            a: inKey,
            b: outKey,
            conductance: 22 * fluidScale * rFactor,
            oneWay: true,
            crackingBar: node.type === 'pilot_check_close_spring' ? cracking : 0.4,
          });
        }
        break;
      }
      case 'shuttle_valve': {
        const xKey = makePortKey(node.id, 'X');
        const yKey = makePortKey(node.id, 'Y');
        const aKey = makePortKey(node.id, 'A');
        const pX = portPressure[xKey] ?? 0;
        const pY = portPressure[yKey] ?? 0;
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.01);
        edges.push({
          a: pX >= pY ? xKey : yKey,
          b: aKey,
          conductance: 28 * fluidScale * rFactor,
        });
        break;
      }
      case 'two_pressure_valve': {
        const xKey = makePortKey(node.id, 'X');
        const yKey = makePortKey(node.id, 'Y');
        const aKey = makePortKey(node.id, 'A');
        const pX = portPressure[xKey] ?? 0;
        const pY = portPressure[yKey] ?? 0;
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.01);
        if (pX > 0.2 && pY > 0.2) {
          edges.push({
            a: pX <= pY ? xKey : yKey,
            b: aKey,
            conductance: 24 * fluidScale * rFactor,
          });
        }
        break;
      }
      case 'quick_exhaust': {
        const pKey = makePortKey(node.id, 'P');
        const aKey = makePortKey(node.id, 'A');
        const rKey = makePortKey(node.id, 'R');
        const rPiped = pipes.some(
          (pp) =>
            (pp.fromNodeId === node.id && pp.fromPortId === 'R') ||
            (pp.toNodeId === node.id && pp.toPortId === 'R')
        );
        if (!rPiped) fixedNodes.set(rKey, 0);
        const pP = portPressure[pKey] ?? 0;
        const pA = portPressure[aKey] ?? 0;
        if (pP >= pA * 0.8) {
          edges.push({ a: pKey, b: aKey, conductance: 26 * fluidScale });
        } else {
          edges.push({ a: aKey, b: rKey, conductance: 38 * fluidScale });
        }
        break;
      }
      case 'flow_divider': {
        const inKey = makePortKey(node.id, 'in');
        const aKey = makePortKey(node.id, 'A');
        const bKey = makePortKey(node.id, 'B');
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.01);
        edges.push({ a: inKey, b: aKey, conductance: 18 * fluidScale * rFactor });
        edges.push({ a: inKey, b: bKey, conductance: 18 * fluidScale * rFactor });
        break;
      }
      case 'shutoff_valve': {
        const opening = Math.min(100, Math.max(0, p.opening ?? 100));
        if (p.active !== false && opening > 0) {
          const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.0625);
          rt.isOpen = true;
          edges.push({
            a: makePortKey(node.id, 'in'),
            b: makePortKey(node.id, 'out'),
            conductance: Math.max(0.1, 36 * fluidScale * Math.pow(opening / 100, 2) * rFactor),
          });
        } else {
          rt.isOpen = false;
        }
        break;
      }
      case 'orifice': {
        const opening = Math.min(100, Math.max(5, p.opening ?? 50));
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.01);
        edges.push({
          a: makePortKey(node.id, 'in'),
          b: makePortKey(node.id, 'out'),
          conductance: Math.max(0.2, Math.pow(opening / 100, 2) * 20 * fluidScale * rFactor),
        });
        break;
      }
      case 'relief_valve':
      case 'relief_valve_piloted':
      case 'prop_relief':
      case 'prop_relief_piloted': {
        const inKey = makePortKey(node.id, 'in');
        const outKey = makePortKey(node.id, 'out');
        const minP =
          node.type === 'prop_relief' || node.type === 'prop_relief_piloted'
            ? (p.minPressureBar ?? 0)
            : 0;
        const cracking = Math.max(0.1, Math.max(minP, p.crackingPressure ?? 100));
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.01);
        const pIn = portPressure[inKey] ?? 0;
        if (pIn > cracking) {
          rt.isOpen = true;
          edges.push({
            a: inKey,
            b: outKey,
            conductance: 35 * fluidScale * rFactor,
            oneWay: true,
            crackingBar: cracking,
          });
        } else {
          rt.isOpen = false;
        }
        break;
      }
      case 'relief_valve_ext': {
        const inKey = makePortKey(node.id, 'in');
        const outKey = makePortKey(node.id, 'out');
        const pilotKey = makePortKey(node.id, 'X');
        const cracking = Math.max(0.1, p.crackingPressure ?? 90);
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.01);
        const pPilot = Math.max(portPressure[inKey] ?? 0, portPressure[pilotKey] ?? 0);
        if (pPilot > cracking) {
          rt.isOpen = true;
          edges.push({
            a: inKey,
            b: outKey,
            conductance: 35 * fluidScale * rFactor,
            oneWay: true,
            crackingBar: cracking,
          });
        } else {
          rt.isOpen = false;
        }
        break;
      }
      case 'sequence_valve':
      case 'counterbalance_valve': {
        const inKey = makePortKey(node.id, 'in');
        const outKey = makePortKey(node.id, 'out');
        const cracking = Math.max(0.1, p.crackingPressure ?? 40);
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.01);
        const pIn = portPressure[inKey] ?? 0;
        if (pIn >= cracking) {
          rt.isOpen = true;
          edges.push({ a: inKey, b: outKey, conductance: 24 * fluidScale * rFactor });
        } else {
          rt.isOpen = false;
        }
        break;
      }
      case 'cartridge_valve_a':
      case 'cartridge_valve_b': {
        const aKey = makePortKey(node.id, 'in');
        const bKey = makePortKey(node.id, 'out');
        const xKey = makePortKey(node.id, 'X');
        const cracking = Math.max(0.05, p.crackingPressure ?? 1);
        const areaMode = p.cartridgeAreaMode ?? 'two_areas';
        const areaA = Math.min(100, Math.max(1, p.cartridgeAreaACm2 ?? 6));
        const areaB = areaMode === 'one_area' ? 0 : Math.min(100, Math.max(0, p.cartridgeAreaBCm2 ?? 3));
        const totalArea = areaA + areaB;
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.001);
        const areaScale = Math.max(0.35, Math.min(3.0, areaA / 6));
        const pA = portPressure[aKey] ?? 0;
        const pB = portPressure[bKey] ?? 0;
        const pX = portPressure[xKey] ?? 0;
        const effectiveDrive =
          areaMode === 'one_area'
            ? pA
            : (Math.max(pA, pB) * areaA + Math.min(pA, pB) * areaB) / Math.max(1, totalArea);
        if (effectiveDrive > pX + cracking) {
          rt.isOpen = true;
          edges.push({ a: aKey, b: bKey, conductance: 30 * fluidScale * rFactor * areaScale });
        } else {
          rt.isOpen = false;
        }
        break;
      }
      case 'cartridge_valve_c': {
        const aKey = makePortKey(node.id, 'in');
        const bKey = makePortKey(node.id, 'out');
        const xKey = makePortKey(node.id, 'X');
        const cracking = Math.max(0.05, p.crackingPressure ?? 1);
        const areaActive = Math.min(100, Math.max(1, p.cartridgeAreaACm2 ?? 6));
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.001);
        const areaScale = Math.max(0.35, Math.min(3.0, areaActive / 6));
        const pA = portPressure[aKey] ?? 0;
        const pB = portPressure[bKey] ?? 0;
        const pX = portPressure[xKey] ?? 0;
        const maxDrive = Math.max(pA, pB);
        if (maxDrive > pX + cracking) {
          rt.isOpen = true;
          edges.push({ a: aKey, b: bKey, conductance: 30 * fluidScale * rFactor * areaScale });
        } else {
          rt.isOpen = false;
        }
        break;
      }
      case 'pressure_compensator': {
        const inKey = makePortKey(node.id, 'in');
        const outKey = makePortKey(node.id, 'out');
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.01);
        const setP = Math.max(0.1, p.targetPressure ?? p.crackingPressure ?? 60);
        const pIn = portPressure[inKey] ?? 0;
        if (pIn >= 0.05) {
          rt.isOpen = true;
          const capRatio = pIn > setP ? Math.max(0.08, setP / pIn) : 1;
          edges.push({
            a: inKey,
            b: outKey,
            conductance: 22 * fluidScale * rFactor * capRatio,
          });
        } else {
          rt.isOpen = false;
          edges.push({
            a: inKey,
            b: outKey,
            conductance: 22 * fluidScale * rFactor,
          });
        }
        break;
      }
      case 'pressure_compensator_b':
      case 'pressure_compensator_c':
      case 'pressure_compensator_d': {
        const inKey = makePortKey(node.id, 'in');
        const outKey = makePortKey(node.id, 'out');
        const xKey = makePortKey(node.id, 'X');
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.01);
        const cracking = Math.max(0.1, p.crackingPressure ?? p.targetPressure ?? 10);
        const pIn = portPressure[inKey] ?? 0;
        const pX = portPressure[xKey] ?? 0;
        if (pIn >= cracking + pX * 0.25) {
          rt.isOpen = true;
          edges.push({
            a: inKey,
            b: outKey,
            conductance: 22 * fluidScale * rFactor,
          });
        } else {
          rt.isOpen = false;
        }
        break;
      }
      case 'prop_throttle_2_2': {
        const P = makePortKey(node.id, 'P');
        const A = makePortKey(node.id, 'A');
        const opening = Math.min(100, Math.max(0, p.opening ?? 70));
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.32);
        const edgeScale = p.spoolEdgeShape === 'rectangular' ? 1.25 : 1.0;
        const overlap = Math.min(30, Math.max(-30, p.spoolOverlapPct ?? 25));
        const overlapFactor = overlap >= 0 ? Math.max(0.5, 1 - overlap / 100) : 1 + Math.abs(overlap) / 100;
        const leakage = Math.min(100, Math.max(0, p.internalLeakage ?? 0.01));
        if (p.active !== false && opening > 2) {
          edges.push({
            a: P,
            b: A,
            conductance: Math.max(0.15, Math.pow(opening / 100, 2) * 24 * fluidScale * rFactor * edgeScale * overlapFactor),
          });
          rt.isOpen = true;
        } else {
          if (leakage > 0.05) {
            edges.push({ a: P, b: A, conductance: Math.min(1.2, leakage * 0.03) * fluidScale });
          }
          rt.isOpen = false;
        }
        break;
      }
      case 'valve_2_2': {
        const P = makePortKey(node.id, 'P');
        const A = makePortKey(node.id, 'A');
        const vCfg = getEffectiveValveConfig(node);
        const { posIdx, active } = resolveDirectionalValvePosition(node, false);
        rt.activeSpoolPos = posIdx;
        const pattern = vCfg.chambers[posIdx] || (active ? 'parallel' : 'closed');
        if (pattern !== 'closed') {
          edges.push({ a: P, b: A, conductance: 20 * fluidScale });
          rt.isOpen = true;
        } else {
          rt.isOpen = false;
        }
        break;
      }
      case 'valve_3_2': {
        const P = makePortKey(node.id, 'P');
        const T = makePortKey(node.id, 'T');
        const A = makePortKey(node.id, 'A');
        const vCfg = getEffectiveValveConfig(node);
        const { posIdx, active } = resolveDirectionalValvePosition(node, false);
        rt.activeSpoolPos = posIdx;
        const gScale = Math.max(6, Math.min(36, 18 * (0.0164 / Math.max(0.002, vCfg.hydraulicResistance))));
        const pattern = vCfg.chambers[posIdx] || (active ? 'p_to_a_b_exhaust' : 'p_closed_ab_t');
        const passesSupply =
          pattern === 'parallel' ||
          pattern === 'p_to_a_b_exhaust' ||
          pattern === 'p_to_a_bt_closed' ||
          pattern === 't_closed_pab';
        if (passesSupply) {
          edges.push({ a: P, b: A, conductance: gScale * fluidScale });
          rt.isOpen = true;
        } else {
          edges.push({ a: A, b: T, conductance: gScale * fluidScale });
          rt.isOpen = false;
        }
        break;
      }
      case 'valve_4_2':
      case 'valve_4_3':
      case 'prop_valve_4_3':
      case 'servo_valve_4_3': {
        const P = makePortKey(node.id, 'P');
        const T = makePortKey(node.id, 'T');
        const A = makePortKey(node.id, 'A');
        const B = makePortKey(node.id, 'B');
        const vCfg = getEffectiveValveConfig(node);
        const isProp = node.type === 'prop_valve_4_3' || node.type === 'servo_valve_4_3';
        const isThree = node.type === 'valve_4_3' || isProp;
        const rVal = isProp ? (p.hydraulicResistance ?? 0.32) : vCfg.hydraulicResistance;
        const rFactor = isProp
          ? computeResistanceFactor(rVal, 0.32)
          : Math.max(0.33, Math.min(2.0, 0.0164 / Math.max(0.002, rVal)));
        const edgeScale = isProp && p.spoolEdgeShape === 'rectangular' ? 1.25 : 1.0;
        const overlap = isProp ? Math.min(30, Math.max(-30, p.spoolOverlapPct ?? 25)) : 0;
        const overlapFactor =
          isProp && overlap >= 0 ? Math.max(0.55, 1 - overlap / 100) : 1 + Math.abs(overlap) / 120;
        const leakage = isProp ? Math.min(100, Math.max(0, p.internalLeakage ?? 0.01)) : 0;
        const gScale = Math.max(3, Math.min(40, 18 * rFactor * edgeScale * overlapFactor));
        const { posIdx } = resolveDirectionalValvePosition(node, isThree);
        rt.activeSpoolPos = posIdx;
        const fallbackPattern = isThree
          ? posIdx === 0
            ? 'crossed'
            : posIdx === 2
              ? 'parallel'
              : 'closed'
          : posIdx === 0
            ? 'parallel'
            : 'crossed';
        const pattern = vCfg.chambers[posIdx] || fallbackPattern;
        const g = gScale * fluidScale;

        if (isProp && leakage > 0.05) {
          edges.push({ a: P, b: T, conductance: Math.min(1.5, leakage * 0.03) * fluidScale });
        }
        if (isProp && pattern === 'closed' && overlap < 0) {
          const bypassG = Math.min(4.0, (Math.abs(overlap) / 30) * 3.0) * fluidScale;
          edges.push({ a: P, b: A, conductance: bypassG });
          edges.push({ a: P, b: B, conductance: bypassG });
          edges.push({ a: A, b: T, conductance: bypassG });
          edges.push({ a: B, b: T, conductance: bypassG });
        }

        switch (pattern) {
          case 'parallel':
            edges.push({ a: P, b: A, conductance: g });
            edges.push({ a: B, b: T, conductance: g });
            rt.isOpen = true;
            break;
          case 'crossed':
            edges.push({ a: P, b: B, conductance: g });
            edges.push({ a: A, b: T, conductance: g });
            rt.isOpen = isThree ? true : false;
            break;
          case 'p_closed_abt':
          case 'p_closed_ab_t':
            edges.push({ a: A, b: T, conductance: g });
            edges.push({ a: B, b: T, conductance: g });
            rt.isOpen = false;
            break;
          case 't_closed_pab':
            edges.push({ a: P, b: A, conductance: g });
            edges.push({ a: P, b: B, conductance: g });
            rt.isOpen = true;
            break;
          case 'a_closed_pbt':
            edges.push({ a: P, b: B, conductance: g });
            edges.push({ a: B, b: T, conductance: g });
            rt.isOpen = false;
            break;
          case 'b_closed_pat':
            edges.push({ a: P, b: A, conductance: g });
            edges.push({ a: A, b: T, conductance: g });
            rt.isOpen = false;
            break;
          case 'b_to_t_pa_closed':
            edges.push({ a: B, b: T, conductance: g });
            rt.isOpen = false;
            break;
          case 'p_to_a_bt_closed':
            edges.push({ a: P, b: A, conductance: g });
            rt.isOpen = true;
            break;
          case 'a_to_t_pb_closed':
            edges.push({ a: A, b: T, conductance: g });
            rt.isOpen = false;
            break;
          case 'p_to_b_at_closed':
            edges.push({ a: P, b: B, conductance: g });
            rt.isOpen = true;
            break;
          case 'p_to_t_ab_closed':
            edges.push({ a: P, b: T, conductance: g });
            rt.isOpen = false;
            break;
          case 'a_to_b_pt_closed':
            edges.push({ a: A, b: B, conductance: g });
            rt.isOpen = false;
            break;
          case 'p_to_t_a_to_b':
            edges.push({ a: P, b: T, conductance: g });
            edges.push({ a: A, b: B, conductance: g });
            rt.isOpen = false;
            break;
          case 'all_open':
            edges.push({ a: P, b: T, conductance: g });
            edges.push({ a: A, b: T, conductance: g });
            edges.push({ a: B, b: T, conductance: g });
            rt.isOpen = false;
            break;
          case 'closed':
          default:
            rt.isOpen = false;
            break;
        }
        break;
      }
      case 'valve_5_2':
      case 'valve_5_3': {
        const P = makePortKey(node.id, 'P');
        const EA = makePortKey(node.id, 'EA');
        const EB = makePortKey(node.id, 'EB');
        const A = makePortKey(node.id, 'A');
        const B = makePortKey(node.id, 'B');
        const eaPiped = pipes.some(
          (pp) =>
            (pp.fromNodeId === node.id && pp.fromPortId === 'EA') ||
            (pp.toNodeId === node.id && pp.toPortId === 'EA')
        );
        const ebPiped = pipes.some(
          (pp) =>
            (pp.fromNodeId === node.id && pp.fromPortId === 'EB') ||
            (pp.toNodeId === node.id && pp.toPortId === 'EB')
        );
        if (!eaPiped) fixedNodes.set(EA, 0);
        if (!ebPiped) fixedNodes.set(EB, 0);

        const isThree = node.type === 'valve_5_3';
        const vCfg = getEffectiveValveConfig(node);
        const { posIdx } = resolveDirectionalValvePosition(node, isThree);
        rt.activeSpoolPos = posIdx;
        const fallbackPattern = isThree
          ? posIdx === 0
            ? 'crossed'
            : posIdx === 2
              ? 'parallel'
              : 'closed'
          : posIdx === 0
            ? 'parallel'
            : 'crossed';
        const pattern = vCfg.chambers[posIdx] || fallbackPattern;
        if (pattern === 'parallel') {
          edges.push({ a: P, b: A, conductance: 20 * fluidScale });
          edges.push({ a: B, b: EB, conductance: 20 * fluidScale });
          rt.isOpen = true;
        } else if (pattern === 'crossed') {
          edges.push({ a: P, b: B, conductance: 20 * fluidScale });
          edges.push({ a: A, b: EA, conductance: 20 * fluidScale });
          rt.isOpen = isThree ? true : false;
        } else if (pattern === 'p_closed_abt' || pattern === 'p_closed_ab_t' || pattern === 'all_open') {
          edges.push({ a: A, b: EA, conductance: 20 * fluidScale });
          edges.push({ a: B, b: EB, conductance: 20 * fluidScale });
          rt.isOpen = false;
        } else if (pattern === 't_closed_pab') {
          edges.push({ a: P, b: A, conductance: 20 * fluidScale });
          edges.push({ a: P, b: B, conductance: 20 * fluidScale });
          rt.isOpen = true;
        } else {
          rt.isOpen = false;
        }
        break;
      }
      case 'valve_6_2': {
        const E = makePortKey(node.id, 'E');
        const A = makePortKey(node.id, 'A');
        const F = makePortKey(node.id, 'F');
        const B = makePortKey(node.id, 'B');
        const C = makePortKey(node.id, 'C');
        const D = makePortKey(node.id, 'D');
        const vCfg = getEffectiveValveConfig(node);
        const gScale = Math.max(
          6,
          Math.min(36, 18 * (0.0164 / Math.max(0.002, vCfg.hydraulicResistance)))
        );
        const { posIdx, active } = resolveDirectionalValvePosition(node, false);
        rt.activeSpoolPos = posIdx;
        const pattern = vCfg.chambers[posIdx] || (active ? 'crossed' : 'parallel');
        const g = gScale * fluidScale;
        if (pattern === 'closed') {
          rt.isOpen = false;
        } else if (pattern === 'crossed') {
          // Left chamber (active): B <-> E and F <-> C; A and D blocked
          edges.push({ a: B, b: E, conductance: g });
          edges.push({ a: F, b: C, conductance: g });
          rt.isOpen = true;
        } else {
          // Right chamber (rest, parallel): B <-> E and A <-> D; C and F blocked
          edges.push({ a: B, b: E, conductance: g });
          edges.push({ a: A, b: D, conductance: g });
          rt.isOpen = false;
        }
        break;
      }
      case 'motor':
      case 'tachometer_sensor':
      case 'rotary_actuator': {
        edges.push({
          a: makePortKey(node.id, 'A'),
          b: makePortKey(node.id, 'B'),
          conductance: 8 * fluidScale,
        });
        break;
      }
      case 'cylinder_single': {
        fixedNodes.set(makePortKey(node.id, 'A'), rt.chamberAPressure);
        break;
      }
      case 'cylinder_double': {
        fixedNodes.set(makePortKey(node.id, 'A'), rt.chamberAPressure);
        fixedNodes.set(makePortKey(node.id, 'B'), rt.chamberBPressure);
        break;
      }
      case 'distance_rule':
      case 'pressure_gauge':
      case 'diff_pressure_gauge':
      case 'pressure_indicator':
      case 'pressure_switch':
      case 'pressure_sensor_elec': {
        break;
      }
    }
  }

  // Build fast neighbor list for Gauss-Seidel iterations
  const neighbors = new Map<string, Array<{ other: string; g: number; oneWay?: boolean; isForward?: boolean; crack?: number }>>();
  for (const k of Object.keys(portPressure)) {
    neighbors.set(k, []);
  }
  for (const edge of edges) {
    neighbors.get(edge.a)?.push({
      other: edge.b,
      g: edge.conductance,
      oneWay: edge.oneWay,
      isForward: true,
      crack: edge.crackingBar ?? 0,
    });
    neighbors.get(edge.b)?.push({
      other: edge.a,
      g: edge.conductance,
      oneWay: edge.oneWay,
      isForward: false,
      crack: edge.crackingBar ?? 0,
    });
  }

  // Note: for cylinders, we do NOT pin their ports during relaxation! Instead we compute
  // the external network pressure driving into port A/B, then integrate chamber compliance.
  const cylinderFixedKeys = new Set<string>();
  for (const node of nodes) {
    if (node.type === 'cylinder_single') {
      const kA = makePortKey(node.id, 'A');
      fixedNodes.delete(kA);
      cylinderFixedKeys.add(kA);
    } else if (node.type === 'cylinder_double') {
      const kA = makePortKey(node.id, 'A');
      const kB = makePortKey(node.id, 'B');
      fixedNodes.delete(kA);
      fixedNodes.delete(kB);
      cylinderFixedKeys.add(kA);
      cylinderFixedKeys.add(kB);
    }
  }

  // Apply fixed pressures first
  for (const [key, val] of fixedNodes.entries()) {
    portPressure[key] = val;
  }

  // Gauss-Seidel nodal pressure relaxation (24 iterations)
  for (let iter = 0; iter < 24; iter++) {
    for (const key of Object.keys(portPressure)) {
      if (fixedNodes.has(key)) {
        portPressure[key] = fixedNodes.get(key)!;
        continue;
      }
      const nbs = neighbors.get(key);
      if (!nbs || nbs.length === 0) {
        // Bleed floating disconnected ports gently to 0
        portPressure[key] *= 0.7;
        continue;
      }

      let sumGP = 0;
      let sumG = 0;

      // If this port is a cylinder chamber port, add internal chamber compliance coupling
      if (cylinderFixedKeys.has(key)) {
        const [nId, pId] = key.split('::');
        const rt = nextNodes[nId];
        const chamberP = pId === 'A' ? rt.chamberAPressure : rt.chamberBPressure;
        const gChamber = 14 * fluidScale;
        sumGP += gChamber * chamberP;
        sumG += gChamber;
      }

      for (const nb of nbs) {
        const pOther = portPressure[nb.other];
        const pSelf = portPressure[key];
        if (nb.oneWay) {
          const crack = nb.crack ?? 0;
          if (nb.isForward) {
            // Flow allowed only from self -> other if pSelf > pOther + crack
            if (pSelf > pOther + crack) {
              sumGP += nb.g * (pOther + crack);
              sumG += nb.g;
            }
          } else {
            // Reverse view: other -> self allowed if pOther > pSelf + crack
            if (pOther > pSelf + crack) {
              sumGP += nb.g * (pOther - crack);
              sumG += nb.g;
            }
          }
        } else {
          sumGP += nb.g * pOther;
          sumG += nb.g;
        }
      }

      if (sumG > 0.0001) {
        portPressure[key] = Math.max(0, sumGP / sumG);
      } else {
        portPressure[key] *= 0.85;
      }
    }
  }

  // Pump / Compressor / Power unit maxFlow saturation check
  let totalSourceFlow = 0;
  for (const node of nodes) {
    if (
      node.type === 'pump' ||
      node.type === 'pump_variable' ||
      node.type === 'pump_prop' ||
      node.type === 'power_unit' ||
      node.type === 'power_unit_simple' ||
      node.type === 'compressor'
    ) {
      const outKey = makePortKey(node.id, 'out');
      const nbs = neighbors.get(outKey) ?? [];
      let outflow = 0;
      for (const nb of nbs) {
        outflow += Math.max(0, (portPressure[outKey] - portPressure[nb.other]) * nb.g);
      }
      const computedPumpFlow =
        (node.type === 'pump' || node.type === 'pump_variable') &&
        (node.params.rpm !== undefined || node.params.displacementL !== undefined)
          ? (node.params.rpm ?? 1320) * (node.params.displacementL ?? 0.0016)
          : undefined;
      const baseMaxFlow =
        computedPumpFlow ??
        node.params.maxFlow ??
        (node.type === 'compressor' ? 180 : 24);
      const leakLpm = (node.params.internalLeakage ?? 0) * ((portPressure[outKey] ?? 0) / 10);
      const maxFlow = Math.max(0, baseMaxFlow - leakLpm);
      const netOut = isPortPlugged(node.id, 'out') ? 0 : Math.min(outflow, maxFlow);
      nextNodes[node.id].flowLpm = Number(netOut.toFixed(2));
      if (node.params.rpm !== undefined) {
        nextNodes[node.id].rpm = node.params.rpm;
      }
      totalSourceFlow += nextNodes[node.id].flowLpm;
    }
  }

  // Update Actuators (Cylinders & Motors) & Sensor readouts
  for (const node of nodes) {
    const rt = nextNodes[node.id];
    const p = node.params;
    const spec = COMPONENT_CATALOG[node.type];
    for (const port of spec.ports) {
      rt.portPressures[port.id] = Number((portPressure[makePortKey(node.id, port.id)] ?? 0).toFixed(2));
    }

    if (node.type === 'cylinder_single') {
      const cfg = getEffectiveCylinderConfig(node);
      const boreMm = p.boreMm ?? 40;
      const rodMm = p.rodMm ?? 16;
      const strokeMm = Math.max(1, p.strokeMm ?? 200);
      const strokeM = strokeMm / 1000;
      const areas = computeCylinderAreasCm2(boreMm, rodMm, cfg.rodType, cfg.throughRod);
      const areaCap = Math.max(1e-6, areas.pistonAreaCm2 * 1e-4);

      const posMm = rt.pistonPos * strokeMm;
      const baseLoadN = evaluateForceProfileN(cfg, p.loadN ?? 150, posMm);
      const angleRad = ((cfg.mountingAngleDeg ?? 0) * Math.PI) / 180;
      const gravityAxialN = (cfg.movingMassKg ?? 0) * 9.81 * Math.sin(angleRad);
      const normalLoadN = Math.abs((cfg.movingMassKg ?? 0) * 9.81 * Math.cos(angleRad));
      const coeff =
        Math.abs(rt.velocityMs) > 0.002
          ? cfg.frictionMode === 'material'
            ? FRICTION_MATERIALS[cfg.frictionMaterial].dynamicCoeff
            : cfg.dynamicFriction
          : cfg.frictionMode === 'material'
            ? FRICTION_MATERIALS[cfg.frictionMaterial].staticCoeff
            : cfg.staticFriction;
      const frictionN = normalLoadN * Math.max(0, coeff);
      const totalResistiveN = Math.abs(baseLoadN) + frictionN;

      const portAKey = makePortKey(node.id, 'A');
      const pPortA = portPressure[portAKey] ?? 0;
      const qLpm = (pPortA - rt.chamberAPressure) * 14 * fluidScale;
      const qM3s = Math.max(0, qLpm) / 60000;

      const hasSpring = cfg.springReturn || cfg.cylinderType !== 'double';
      const springDir = cfg.cylinderType === 'single_retract' ? -1 : 1;
      const springForce = hasSpring ? springDir * (120 + rt.pistonPos * 380) : 0;
      const pressureForce = rt.chamberAPressure * 1e5 * areaCap;
      let netForce = pressureForce - springForce - gravityAxialN - (baseLoadN < 0 ? baseLoadN : 0);
      if (baseLoadN >= 0) {
        if (netForce > totalResistiveN) {
          netForce -= totalResistiveN;
        } else if (netForce < -totalResistiveN) {
          netForce += totalResistiveN;
        } else {
          netForce = 0;
        }
      }

      const endCushion =
        cfg.cushioning && (rt.pistonPos > 0.93 || rt.pistonPos < 0.07) ? 1.8 : 1.0;
      const damping = 1800 * endCushion;
      let vel = netForce / damping;
      if (vel > 0) {
        vel = Math.min(vel, Math.max(0.02, qM3s / areaCap));
      }

      let nextPos = rt.pistonPos + (vel / strokeM) * dt;
      if (nextPos >= 1) {
        nextPos = 1;
        vel = 0;
      } else if (nextPos <= 0) {
        nextPos = 0;
        vel = 0;
      }

      const leakLpm = (cfg.internalLeakage ?? 0) * (rt.chamberAPressure / 10);
      const sweptLpm = vel * areaCap * 60000 + leakLpm;
      const flowDrop = Math.max(-25, Math.min(pPortA * 0.75, sweptLpm / (14 * fluidScale)));
      const targetChamberP = Math.max(0, pPortA - flowDrop);
      const alpha = prev.fluid === 'pneumatic' ? 0.22 : 0.38;
      const nextChamberP = rt.chamberAPressure + (targetChamberP - rt.chamberAPressure) * alpha;

      rt.chamberAPressure = Number(Math.max(0, Math.min(350, nextChamberP)).toFixed(2));
      rt.pistonPos = Number(nextPos.toFixed(4));
      rt.velocityMs = Number(vel.toFixed(3));
      rt.forceN = Number((pressureForce - springForce).toFixed(1));
      rt.flowLpm = Number(Math.abs(sweptLpm + (targetChamberP - rt.chamberAPressure) * 0.2).toFixed(2));
    } else if (node.type === 'cylinder_double') {
      const cfg = getEffectiveCylinderConfig(node);
      const boreMm = p.boreMm ?? 50;
      const rodMm = p.rodMm ?? 22;
      const strokeMm = Math.max(1, p.strokeMm ?? 250);
      const strokeM = strokeMm / 1000;
      const areas = computeCylinderAreasCm2(boreMm, rodMm, cfg.rodType, cfg.throughRod);
      const areaCap = Math.max(1e-6, areas.pistonAreaCm2 * 1e-4);
      const areaRod = Math.max(areaCap * 0.3, areas.annularAreaCm2 * 1e-4);

      const posMm = rt.pistonPos * strokeMm;
      const baseLoadN = evaluateForceProfileN(cfg, p.loadN ?? 800, posMm);
      const angleRad = ((cfg.mountingAngleDeg ?? 0) * Math.PI) / 180;
      const gravityAxialN = (cfg.movingMassKg ?? 0) * 9.81 * Math.sin(angleRad);
      const normalLoadN = Math.abs((cfg.movingMassKg ?? 0) * 9.81 * Math.cos(angleRad));
      const coeff =
        Math.abs(rt.velocityMs) > 0.002
          ? cfg.frictionMode === 'material'
            ? FRICTION_MATERIALS[cfg.frictionMaterial].dynamicCoeff
            : cfg.dynamicFriction
          : cfg.frictionMode === 'material'
            ? FRICTION_MATERIALS[cfg.frictionMaterial].staticCoeff
            : cfg.staticFriction;
      const frictionN = normalLoadN * Math.max(0, coeff);
      const loadThresholdN = Math.abs(baseLoadN) + frictionN;

      const pPortA = portPressure[makePortKey(node.id, 'A')] ?? 0;
      const pPortB = portPressure[makePortKey(node.id, 'B')] ?? 0;

      const qALpm = (pPortA - rt.chamberAPressure) * 14 * fluidScale;
      const qBLpm = (pPortB - rt.chamberBPressure) * 14 * fluidScale;
      const qAM3s = Math.max(0, qALpm) / 60000;
      const qBM3s = Math.max(0, qBLpm) / 60000;

      const forceA = rt.chamberAPressure * 1e5 * areaCap;
      const forceB = rt.chamberBPressure * 1e5 * areaRod;
      let netForce = forceA - forceB - gravityAxialN - (baseLoadN < 0 ? baseLoadN : 0);

      if (baseLoadN >= 0) {
        if (Math.abs(netForce) <= loadThresholdN) {
          netForce = 0;
        } else {
          netForce -= Math.sign(netForce) * loadThresholdN;
        }
      }

      const endCushion =
        cfg.cushioning && (rt.pistonPos > 0.93 || rt.pistonPos < 0.07) ? 1.7 : 1.0;
      const damping = (prev.fluid === 'pneumatic' ? 2400 : 4200) * endCushion;
      let vel = netForce / damping;

      if (vel > 0) {
        vel = Math.min(vel, Math.max(0.02, qAM3s / areaCap));
      } else if (vel < 0) {
        vel = Math.max(vel, -Math.max(0.02, qBM3s / areaRod));
      }

      let nextPos = rt.pistonPos + (vel / strokeM) * dt;
      if (nextPos >= 1) {
        nextPos = 1;
        vel = 0;
      } else if (nextPos <= 0) {
        nextPos = 0;
        vel = 0;
      }

      const leakLpm = (cfg.internalLeakage ?? 0) * (Math.abs(rt.chamberAPressure - rt.chamberBPressure) / 10);
      const sweptALpm = vel * areaCap * 60000 + leakLpm;
      const sweptBLpm = -vel * areaRod * 60000 - leakLpm;
      const dropA = Math.max(-25, Math.min(pPortA * 0.75, sweptALpm / (14 * fluidScale)));
      const dropB = Math.max(-25, Math.min(pPortB * 0.75, sweptBLpm / (14 * fluidScale)));
      const targetA = Math.max(0, pPortA - dropA);
      const targetB = Math.max(0, pPortB - dropB);
      const alpha = prev.fluid === 'pneumatic' ? 0.22 : 0.38;

      rt.chamberAPressure = Number(
        Math.max(0, Math.min(350, rt.chamberAPressure + (targetA - rt.chamberAPressure) * alpha)).toFixed(2)
      );
      rt.chamberBPressure = Number(
        Math.max(0, Math.min(350, rt.chamberBPressure + (targetB - rt.chamberBPressure) * alpha)).toFixed(2)
      );
      rt.pistonPos = Number(nextPos.toFixed(4));
      rt.velocityMs = Number(vel.toFixed(3));
      rt.forceN = Number((forceA - forceB).toFixed(1));
      rt.flowLpm = Number(Math.max(Math.abs(sweptALpm), Math.abs(sweptBLpm)).toFixed(2));
    } else if (node.type === 'motor' || node.type === 'tachometer_sensor') {
      const pA = rt.portPressures['A'] ?? 0;
      const pB = rt.portPressures['B'] ?? 0;
      const dP = pA - pB;
      const disp =
        p.displacementL !== undefined
          ? Math.max(1, p.displacementL * 1000)
          : Math.max(5, p.displacementCc ?? 32); // cc/rev
      const driveTorque = (Math.abs(dP) * 1e5 * (disp * 1e-6)) / (2 * Math.PI);
      const loadNm = p.loadNm ?? 0;
      const netTorqueRatio =
        driveTorque > 0.05
          ? Math.max(0, Math.min(1.5, (driveTorque - Math.max(0, loadNm) * 0.6) / driveTorque))
          : 0;
      const frictionDamp = 1 / (1 + Math.max(0, p.frictionCoeff ?? 0.0128) * 5);
      const flowLpm = dP * 8 * fluidScale * frictionDamp * (loadNm > 0 ? Math.max(0.15, netTorqueRatio) : 1);
      const targetRpm = (flowLpm * 1000) / disp;
      const inertia = Math.max(0.0001, p.inertiaKgM2 ?? 0.0001);
      const inertiaAlpha = Math.max(0.08, Math.min(1, 0.0002 / inertia));
      const smoothedRpm = rt.rpm + (targetRpm - rt.rpm) * inertiaAlpha;
      rt.flowLpm = Number(Math.abs(flowLpm).toFixed(2));
      rt.rpm = Number(smoothedRpm.toFixed(0));
      rt.forceN = Number(driveTorque.toFixed(1));
    } else if (node.type === 'rotary_actuator') {
      const pA = rt.portPressures['A'] ?? 0;
      const pB = rt.portPressures['B'] ?? 0;
      const dP = pA - pB;
      const frictionDamp = 1 / (1 + Math.max(0, (p.frictionCoeff ?? 0.1) - 0.1) * 0.4);
      const inertiaDamp = 1 / (1 + Math.max(0, (p.inertiaKgM2 ?? 0.001) - 0.001) * 12);
      const loadDrag = Math.max(0, p.loadNm ?? 0) * 0.02;
      const effectiveDP = Math.abs(dP) > 2 + loadDrag ? dP : 0;
      const vel = effectiveDP !== 0 ? Math.sign(effectiveDP) * Math.min(1.5, Math.abs(effectiveDP) / 40) * frictionDamp * inertiaDamp : 0;
      rt.pistonPos = Number(Math.min(1, Math.max(0, rt.pistonPos + vel * dt)).toFixed(4));
      rt.velocityMs = Number(vel.toFixed(3));
      rt.forceN = Number((dP * 3.5).toFixed(1));
    } else if (node.type === 'accumulator_simple' || node.type === 'accumulator') {
      const pIn = rt.portPressures['in'] ?? 0;
      const preCharge = Math.max(0, p.crackingPressure ?? 40);
      rt.chamberAPressure = Number((rt.chamberAPressure + (pIn - rt.chamberAPressure) * 0.15).toFixed(2));
      rt.isOpen = rt.chamberAPressure >= preCharge;
    } else if (node.type === 'check_valve' || node.type === 'check_valve_spring') {
      const pIn = rt.portPressures['in'] ?? 0;
      const pOut = rt.portPressures['out'] ?? 0;
      const crack = p.crackingPressure ?? (node.type === 'check_valve_spring' ? 2.5 : 0.5);
      const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.01);
      rt.isOpen = pIn > pOut + crack;
      rt.flowLpm = rt.isOpen ? Number(((pIn - pOut - crack) * 22 * fluidScale * rFactor).toFixed(2)) : 0;
    } else if (node.type === 'check_throttle') {
      const pIn = rt.portPressures['in'] ?? 0;
      const pOut = rt.portPressures['out'] ?? 0;
      const opening = Math.min(100, Math.max(0, p.opening ?? 45));
      const rThrottleFactor = computeResistanceFactor(p.hydraulicResistance, 0.01);
      const rCheckFactor = computeResistanceFactor(p.checkValveResistance, 0.01);
      const g =
        pOut > pIn + 0.3
          ? 22 * fluidScale * rCheckFactor
          : opening > 0
            ? Math.max(0.08, Math.pow(opening / 100, 2) * 24 * fluidScale * rThrottleFactor)
            : 0;
      rt.flowLpm = Number((Math.abs(pIn - pOut) * g).toFixed(2));
      rt.isOpen = rt.flowLpm > 0.2;
    } else if (
      node.type === 'throttle' ||
      node.type === 'nozzle' ||
      node.type === 'orifice' ||
      node.type === 'orifice_adjustable' ||
      node.type === 'flow_control_2way' ||
      node.type === 'flow_control_3way' ||
      node.type === 'shutoff_valve' ||
      node.type === 'flexible_hose' ||
      node.type === 'filter' ||
      node.type === 'cooler' ||
      node.type === 'heater' ||
      node.type === 'flow_meter' ||
      node.type === 'flow_meter_analog' ||
      node.type === 'flow_sensor_elec' ||
      node.type === 'regulator' ||
      node.type === 'prop_pressure_reducer' ||
      node.type === 'pressure_reducer_2' ||
      node.type === 'pressure_reducer_3' ||
      node.type === 'pressure_compensator' ||
      node.type === 'pressure_compensator_b' ||
      node.type === 'pressure_compensator_c' ||
      node.type === 'pressure_compensator_d' ||
      node.type === 'cartridge_valve_a' ||
      node.type === 'cartridge_valve_b' ||
      node.type === 'cartridge_valve_c'
    ) {
      const pIn = rt.portPressures['in'] ?? 0;
      const pOut = rt.portPressures['out'] ?? 0;
      let g = 42 * fluidScale;
      if (
        node.type === 'throttle' ||
        node.type === 'nozzle' ||
        node.type === 'orifice' ||
        node.type === 'orifice_adjustable'
      ) {
        const baselineR = node.type === 'throttle' ? 0.045 : 0.01;
        const rFactor = computeResistanceFactor(p.hydraulicResistance, baselineR);
        const op = Math.min(100, Math.max(0, p.opening ?? 55));
        g = op > 0 ? Math.max(0.08, Math.pow(op / 100, 2) * 24 * fluidScale * rFactor) : 0;
      } else if (node.type === 'flow_control_2way' || node.type === 'flow_control_3way') {
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.019);
        const nomScale =
          p.nominalFlowLpm !== undefined
            ? Math.max(0.08, Math.min(2.2, p.nominalFlowLpm / 10))
            : 1;
        g = Math.max(0.08, Math.pow(Math.max(2, p.opening ?? 55) / 100, 2) * 24 * fluidScale * rFactor * nomScale);
      } else if (node.type === 'shutoff_valve') {
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.0625);
        const op = Math.min(100, Math.max(0, p.opening ?? 100));
        g = p.active !== false && op > 0 ? 36 * fluidScale * Math.pow(op / 100, 2) * rFactor : 0;
      } else if (
        node.type === 'pressure_compensator' ||
        node.type === 'pressure_compensator_b' ||
        node.type === 'pressure_compensator_c' ||
        node.type === 'pressure_compensator_d'
      ) {
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.01);
        g = rt.isOpen === false ? 0 : 22 * fluidScale * rFactor;
      } else if (
        node.type === 'cartridge_valve_a' ||
        node.type === 'cartridge_valve_b' ||
        node.type === 'cartridge_valve_c'
      ) {
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.001);
        const areaScale = Math.max(0.35, Math.min(3.0, (p.cartridgeAreaACm2 ?? 6) / 6));
        g = rt.isOpen ? 30 * fluidScale * rFactor * areaScale : 0;
      } else if (
        node.type === 'flow_meter' ||
        node.type === 'flow_meter_analog' ||
        node.type === 'flow_sensor_elec'
      ) {
        const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.0001);
        g = Math.max(0.2, 42 * fluidScale * rFactor);
      }
      const rawFlow = Math.abs(pIn - pOut) * g;
      const cappedFlow =
        (node.type === 'flow_control_2way' || node.type === 'flow_control_3way') && p.nominalFlowLpm !== undefined
          ? Math.min(rawFlow, p.nominalFlowLpm)
          : rawFlow;
      rt.flowLpm = Number(cappedFlow.toFixed(2));
      if (node.type === 'flow_meter' || node.type === 'flow_meter_analog') {
        const prevVol = rt.accumulatedVolumeL ?? 0;
        rt.accumulatedVolumeL = Number((prevVol + (rt.flowLpm / 60) * dt).toFixed(4));
      } else if (node.type === 'flow_sensor_elec') {
        const disp = p.displacementL !== undefined ? Math.max(1, p.displacementL * 1000) : Math.max(1, p.displacementCc ?? 8.2);
        const frictionDamp = 1 / (1 + Math.max(0, p.frictionCoeff ?? 0.0128) * 5);
        const targetRpm = ((rt.flowLpm * 1000) / disp) * frictionDamp;
        const inertia = Math.max(0.0001, p.inertiaKgM2 ?? 0.0001);
        const alpha = Math.max(0.08, Math.min(1, 0.0002 / inertia));
        rt.rpm = Number((rt.rpm + (targetRpm - rt.rpm) * alpha).toFixed(0));
      }
    } else if (node.type === 'elec_flow_transducer') {
      const pSig = rt.portPressures['p'] ?? 0;
      const disp = p.displacementL !== undefined ? Math.max(1, p.displacementL * 1000) : Math.max(1, p.displacementCc ?? 8.2);
      const frictionDamp = 1 / (1 + Math.max(0, p.frictionCoeff ?? 0.0128) * 5);
      const loadFactor = Math.max(0.15, 1 - Math.max(0, p.loadNm ?? 0) * 0.01);
      const estFlow = Math.max(0, pSig * 0.5 * frictionDamp * loadFactor);
      rt.flowLpm = Number(estFlow.toFixed(2));
      rt.rpm = Number(((estFlow * 1000) / disp).toFixed(0));
    } else if (node.type === 'elec_dc_motor' || node.type === 'elec_stepper_motor') {
      const noLoad = Math.min(20000, Math.max(10, p.noLoadRpm ?? 75));
      const loadNm = Math.min(20, Math.max(0, p.loadNm ?? 0));
      const kA = makePortKey(node.id, 'in');
      const kB = makePortKey(node.id, 'out');
      const wired = wiredPortSet.has(kA) || wiredPortSet.has(kB);
      const isPowered = wired ? energizedElecNodeIds.has(node.id) : p.active !== false;
      const activeFactor = !isPowered ? 0 : Math.max(0, 1 - loadNm / 25);
      const targetRpm = noLoad * activeFactor;
      rt.rpm = Number(targetRpm.toFixed(1));
      rt.forceN = Number(loadNm.toFixed(2));
      rt.isOpen = isPowered;
    } else if (node.type === 'elec_func_gen') {
      const freq = Math.min(100, Math.max(0, p.funcGenFreqHz ?? 1));
      const amp = Math.min(10, Math.max(0, p.funcGenAmpV ?? 10));
      const offset = Math.min(10, Math.max(-10, p.funcGenOffsetV ?? 0));
      const t = prev.timeSec + dt;
      const phase = (t * freq) % 1;
      let wave = 0;
      switch (p.funcGenWaveform ?? 'sine') {
        case 'constant':
          wave = 1;
          break;
        case 'square':
          wave = phase < 0.5 ? 1 : -1;
          break;
        case 'triangle':
          wave = phase < 0.5 ? -1 + 4 * phase : 3 - 4 * phase;
          break;
        case 'profile':
          wave = Math.sin(2 * Math.PI * phase) * 0.8;
          break;
        case 'sine':
        default:
          wave = Math.sin(2 * Math.PI * phase);
          break;
      }
      const outV = Math.min(10, Math.max(-10, offset + amp * wave));
      rt.chamberAPressure = Number(outV.toFixed(2));
    } else if (node.type === 'elec_setpoint_card') {
      const vals = p.setpointValues ?? [0];
      const enabled = p.setpointEnabled ?? [true];
      const activeIdx = Math.max(0, enabled.findIndex(Boolean));
      rt.chamberAPressure = Number((vals[activeIdx] ?? 0).toFixed(2));
    } else if (node.type === 'elec_limiter') {
      const durationMs = Math.min(10000, Math.max(1, p.inrushDurationMs ?? 100));
      const limitA = Math.min(100, Math.max(0.1, p.currentLimitA ?? 2));
      rt.chamberAPressure = Number(limitA.toFixed(2));
      rt.isOpen = (prev.timeSec + dt) * 1000 <= durationMs || Boolean(p.active);
    } else if (
      node.type === 'elec_relay' ||
      node.type === 'elec_relay_ton' ||
      node.type === 'elec_relay_toff' ||
      node.type === 'elec_counter_relay' ||
      node.type === 'ladder_relay' ||
      node.type === 'ladder_relay_sr' ||
      node.type === 'ladder_relay_sa' ||
      node.type === 'elec_valve_solenoid' ||
      node.type === 'ladder_solenoid' ||
      node.type === 'elec_prop_solenoid' ||
      node.type === 'elec_solenoid_act' ||
      node.type === 'elec_lamp' ||
      node.type === 'ladder_lamp' ||
      node.type === 'elec_buzzer'
    ) {
      if (node.type === 'elec_counter_relay') {
        const preset = Math.min(9999, Math.max(0, Math.round(p.counterPreset ?? 5)));
        rt.forceN = preset;
      }
      const isCoilActive = energizedElecNodeIds.has(node.id);
      rt.isOpen = isCoilActive;
      rt.coilEnergized = isCoilActive;
      rt.electrified = isCoilActive;
    } else if (
      node.type === 'elec_push_no' ||
      node.type === 'elec_switch_no' ||
      node.type === 'elec_push_nc' ||
      node.type === 'elec_switch_nc' ||
      node.type === 'elec_push_co' ||
      node.type === 'elec_switch_co' ||
      node.type === 'elec_contact_no' ||
      node.type === 'elec_contact_nc' ||
      node.type === 'elec_contact_co' ||
      node.type === 'ladder_push_no' ||
      node.type === 'ladder_push_nc' ||
      node.type === 'ladder_push_co' ||
      node.type === 'ladder_contact_no' ||
      node.type === 'ladder_contact_nc'
    ) {
      const mk = (p.sensingMark ?? '').trim().toUpperCase();
      const markTriggered = Boolean(
        mk && (energizedRelayMarks.has(mk) || pressureMarksTriggered.has(mk))
      );
      rt.isOpen = Boolean(p.active) || markTriggered;
    } else if (node.type === 'prop_throttle_2_2') {
      const pP = rt.portPressures['P'] ?? 0;
      const pA = rt.portPressures['A'] ?? 0;
      const opening = Math.min(100, Math.max(0, p.opening ?? 70));
      const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.32);
      const edgeScale = p.spoolEdgeShape === 'rectangular' ? 1.25 : 1.0;
      const overlap = Math.min(30, Math.max(-30, p.spoolOverlapPct ?? 25));
      const overlapFactor =
        overlap >= 0 ? Math.max(0.5, 1 - overlap / 100) : 1 + Math.abs(overlap) / 100;
      const leakage = Math.min(100, Math.max(0, p.internalLeakage ?? 0.01));
      const g =
        p.active !== false && opening > 2
          ? Math.max(
              0.15,
              Math.pow(opening / 100, 2) *
                24 *
                fluidScale *
                rFactor *
                edgeScale *
                overlapFactor
            )
          : leakage > 0.05
            ? Math.min(1.2, leakage * 0.03) * fluidScale
            : 0;
      rt.flowLpm = Number((Math.abs(pP - pA) * g).toFixed(2));
    } else if (node.type === 'flow_divider') {
      const pIn = rt.portPressures['in'] ?? 0;
      const pA = rt.portPressures['A'] ?? 0;
      const pB = rt.portPressures['B'] ?? 0;
      const rFactor = computeResistanceFactor(p.hydraulicResistance, 0.01);
      rt.flowLpm = Number(((Math.abs(pIn - pA) + Math.abs(pIn - pB)) * 18 * fluidScale * rFactor).toFixed(2));
    } else if (
      node.type === 'pressure_switch' ||
      node.type === 'pressure_sensor_elec' ||
      node.type === 'pressure_indicator' ||
      node.type === 'elec_pressure_switch' ||
      node.type === 'elec_pressure_transducer'
    ) {
      const pIn = rt.portPressures['in'] ?? rt.portPressures['p'] ?? 0;
      const threshold = Math.max(0.001, p.crackingPressure ?? 30);
      rt.isOpen = pIn >= threshold;
      rt.flowLpm = 0;
    } else if (node.type === 'pressure_gauge' || node.type === 'diff_pressure_gauge') {
      rt.flowLpm = 0;
    }
  }

  // Compute pipe pressures and signed flow rates
  const nextPipes: Record<string, PipeRuntimeState> = {};
  let maxPressure = 0;
  const flowCapLpm = Math.max(0.1, totalSourceFlow);
  for (const pipe of pipes) {
    const plugged =
      isPortPlugged(pipe.fromNodeId, pipe.fromPortId) ||
      isPortPlugged(pipe.toNodeId, pipe.toPortId);
    const pFrom = portPressure[makePortKey(pipe.fromNodeId, pipe.fromPortId)] ?? 0;
    const pTo = portPressure[makePortKey(pipe.toNodeId, pipe.toPortId)] ?? 0;
    const avgP = (pFrom + pTo) / 2;
    const rawFlow = plugged ? 0 : (pFrom - pTo) * 28 * fluidScale;
    const clampedMag = Math.min(Math.abs(rawFlow), flowCapLpm);
    const flow = rawFlow >= 0 ? clampedMag : -clampedMag;
    if (nextNodes[pipe.fromNodeId]?.portFlows) {
      nextNodes[pipe.fromNodeId].portFlows![pipe.fromPortId] = Number(
        Math.max(nextNodes[pipe.fromNodeId].portFlows![pipe.fromPortId] ?? 0, clampedMag).toFixed(2)
      );
    }
    if (nextNodes[pipe.toNodeId]?.portFlows) {
      nextNodes[pipe.toNodeId].portFlows![pipe.toPortId] = Number(
        Math.max(nextNodes[pipe.toNodeId].portFlows![pipe.toPortId] ?? 0, clampedMag).toFixed(2)
      );
    }
    if (avgP > maxPressure) maxPressure = avgP;
    nextPipes[pipe.id] = {
      pressureBar: Number(avgP.toFixed(2)),
      flowLpm: Number(flow.toFixed(2)),
    };
  }

  for (const node of nodes) {
    const rt = nextNodes[node.id];
    if (
      (node.type === 'pump' ||
        node.type === 'pump_variable' ||
        node.type === 'pump_prop' ||
        node.type === 'power_unit' ||
        node.type === 'power_unit_simple' ||
        node.type === 'compressor') &&
      rt.portFlows
    ) {
      rt.portFlows['out'] = isPortPlugged(node.id, 'out') ? 0 : Number(rt.flowLpm.toFixed(2));
      if (rt.portFlows['suction'] !== undefined) {
        rt.portFlows['suction'] = isPortPlugged(node.id, 'suction') ? 0 : Number(rt.flowLpm.toFixed(2));
      }
    }
    for (const val of Object.values(rt.portPressures)) {
      if (val > maxPressure) maxPressure = val;
    }
  }

  // Hydraulic power P(kW) = (p(bar) * Q(L/min)) / 600
  const powerKw = Number(((maxPressure * totalSourceFlow) / 600).toFixed(2));

  return {
    timeSec: Number((prev.timeSec + dt).toFixed(3)),
    running: prev.running,
    fluid: prev.fluid,
    ambientTempC: prev.ambientTempC,
    nodes: nextNodes,
    pipes: nextPipes,
    maxSystemPressureBar: Number(maxPressure.toFixed(1)),
    totalFlowLpm: Number(totalSourceFlow.toFixed(1)),
    powerKw,
  };
}
