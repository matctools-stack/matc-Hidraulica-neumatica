import type { ComponentCatalogItem, ComponentType, PortSpec } from '../types/circuit';

export type ExtendedComponentType = Extract<
  ComponentType,
  | 'relief_valve_piloted'
  | 'relief_valve_ext'
  | 'pressure_reducer_2'
  | 'pressure_reducer_3'
  | 'pressure_compensator_b'
  | 'pressure_compensator_c'
  | 'pressure_compensator_d'
  | 'cartridge_valve_a'
  | 'cartridge_valve_b'
  | 'cartridge_valve_c'
  | 'elec_solenoid_act'
  | 'elec_dc_motor'
  | 'elec_stepper_motor'
  | 'elec_0v'
  | 'elec_24v'
  | 'elec_func_gen'
  | 'elec_setpoint_card'
  | 'elec_pressure_switch'
  | 'elec_pressure_transducer'
  | 'elec_flow_transducer'
  | 'elec_ammeter'
  | 'elec_voltmeter'
  | 'elec_encoder'
  | 'elec_lamp'
  | 'elec_buzzer'
  | 'elec_relay'
  | 'elec_relay_ton'
  | 'elec_relay_toff'
  | 'elec_counter_relay'
  | 'elec_valve_solenoid'
  | 'elec_amp_1ch'
  | 'elec_amp_2ch'
  | 'elec_prop_solenoid'
  | 'elec_limiter'
  | 'elec_push_no'
  | 'elec_switch_no'
  | 'elec_push_nc'
  | 'elec_switch_nc'
  | 'elec_push_co'
  | 'elec_switch_co'
  | 'elec_contact_no'
  | 'elec_contact_nc'
  | 'elec_contact_co'
  | 'elec_prox_cap'
  | 'elec_prox_ind'
  | 'elec_prox_mag'
  | 'elec_prox_opt'
  | 'elec_comparator'
  | 'elec_pid'
  | 'elec_z_ctrl'
  | 'ladder_0v'
  | 'ladder_24v'
  | 'ladder_push_no'
  | 'ladder_push_nc'
  | 'ladder_push_co'
  | 'ladder_contact_no'
  | 'ladder_contact_nc'
  | 'ladder_solenoid'
  | 'ladder_relay'
  | 'ladder_relay_sr'
  | 'ladder_relay_sa'
  | 'ladder_lamp'
  | 'dig_mod_16'
  | 'dig_mod_io'
  | 'dig_lo'
  | 'dig_hi'
  | 'dig_in'
  | 'dig_out'
  | 'dig_mem'
  | 'dig_and'
  | 'dig_or'
  | 'dig_not'
  | 'dig_and_edge'
  | 'dig_nand'
  | 'dig_nand_edge'
  | 'dig_nor'
  | 'dig_xor'
  | 'dig_rs'
  | 'dig_pulse_gen'
  | 'dig_freq_gen'
  | 'dig_pulse_relay'
  | 'dig_ton'
  | 'dig_toff'
  | 'dig_tonoff'
  | 'dig_ton_mem'
  | 'dig_wipe_up'
  | 'dig_wipe_down'
  | 'dig_counter'
  | 'dig_schmitt'
  | 'dig_timer'
  | 'ep_analog_in'
  | 'ep_analog_out'
  | 'ep_multipol'
  | 'ep_universal_io'
  | 'ep_port_in'
  | 'ep_port_out'
  | 'grafcet_step'
  | 'grafcet_trans'
  | 'grafcet_action'
  | 'grafcet_sync'
  | 'grafcet_partial'
  | 'grafcet_io'
  | 'other_state_chart'
  | 'other_func_chart'
  | 'other_bar_chart'
  | 'other_parts_list'
  | 'other_text'
  | 'other_circle'
  | 'other_ellipse'
  | 'other_square'
  | 'other_rect'
>;

const ELEC_VERT_PORTS: PortSpec[] = [
  { id: 'in', label: 'A1', dx: 0, dy: -28, direction: 'in' },
  { id: 'out', label: 'A2', dx: 0, dy: 28, direction: 'out' },
];

const ELEC_CO_PORTS: PortSpec[] = [
  { id: 'in', label: '11', dx: 0, dy: 28, direction: 'in' },
  { id: 'nc', label: '12', dx: -12, dy: -28, direction: 'out' },
  { id: 'no', label: '14', dx: 12, dy: -28, direction: 'out' },
];

const LADDER_HORIZ_PORTS: PortSpec[] = [
  { id: 'in', label: 'L1', dx: -32, dy: 0, direction: 'in' },
  { id: 'out', label: 'L2', dx: 32, dy: 0, direction: 'out' },
];

const DIG_1IN_1OUT: PortSpec[] = [
  { id: 'in', label: 'I', dx: -32, dy: 0, direction: 'in' },
  { id: 'out', label: 'Q', dx: 32, dy: 0, direction: 'out' },
];

const DIG_3IN_1OUT: PortSpec[] = [
  { id: 'i1', label: 'I1', dx: -32, dy: -12, direction: 'in' },
  { id: 'i2', label: 'I2', dx: -32, dy: 0, direction: 'in' },
  { id: 'i3', label: 'I3', dx: -32, dy: 12, direction: 'in' },
  { id: 'out', label: 'Q', dx: 32, dy: 0, direction: 'out' },
];

const DIG_2IN_1OUT: PortSpec[] = [
  { id: 's', label: 'S', dx: -32, dy: -10, direction: 'in' },
  { id: 'r', label: 'R', dx: -32, dy: 10, direction: 'in' },
  { id: 'out', label: 'Q', dx: 32, dy: 0, direction: 'out' },
];

export const EXTENDED_COMPONENT_SPECS: Record<ExtendedComponentType, ComponentCatalogItem> = {
  // === 1. Válvulas de pressão (10 novas) ===
  relief_valve_piloted: {
    type: 'relief_valve_piloted',
    category: 'valves',
    name: 'Válvula Limitadora de Pressão Pilotada',
    shortName: 'Válvula limit...',
    description: 'Válvula limitadora de pressão com estágio piloto interno e retorno ao tanque.',
    width: 72,
    height: 60,
    ports: [
      { id: 'in', label: 'P', dx: 0, dy: -30, direction: 'in' },
      { id: 'out', label: 'T', dx: 0, dy: 30, direction: 'out' },
    ],
    defaultParams: { crackingPressure: 100 },
  },
  relief_valve_ext: {
    type: 'relief_valve_ext',
    category: 'valves',
    name: 'Válvula Limitadora de Pressão Pré-comandada',
    shortName: 'Válvula limit...',
    description: 'Válvula limitadora de pressão com pré-comando hidráulico externo (porta X).',
    width: 76,
    height: 60,
    ports: [
      { id: 'in', label: 'P', dx: 0, dy: -30, direction: 'in' },
      { id: 'out', label: 'T', dx: 0, dy: 30, direction: 'out' },
      { id: 'X', label: 'X', dx: -36, dy: 0, direction: 'in' },
    ],
    defaultParams: { crackingPressure: 90 },
  },
  pressure_reducer_2: {
    type: 'pressure_reducer_2',
    category: 'valves',
    name: 'Válvula Reguladora de Pressão (2 Vias)',
    shortName: 'Válvula reg...',
    description: 'Válvula redutora de pressão de 2 vias mantendo pressão secundária constante.',
    width: 68,
    height: 60,
    ports: [
      { id: 'in', label: 'P', dx: 0, dy: 30, direction: 'in' },
      { id: 'out', label: 'A', dx: 0, dy: -30, direction: 'out' },
    ],
    defaultParams: { targetPressure: 50 },
  },
  pressure_reducer_3: {
    type: 'pressure_reducer_3',
    category: 'valves',
    name: 'Válvula Reguladora de Pressão (3 Vias)',
    shortName: 'Válvula reg...',
    description: 'Válvula redutora de pressão de 3 vias com alívio secundário ao tanque (porta T).',
    width: 72,
    height: 60,
    ports: [
      { id: 'in', label: 'P', dx: 0, dy: 30, direction: 'in' },
      { id: 'out', label: 'A', dx: 0, dy: -30, direction: 'out' },
      { id: 'T', label: 'T', dx: -34, dy: 14, direction: 'out' },
    ],
    defaultParams: { targetPressure: 50 },
  },
  pressure_compensator_b: {
    type: 'pressure_compensator_b',
    category: 'valves',
    name: 'Compensador de Pressão (Piloto Montante)',
    shortName: 'Compensad...',
    description: 'Compensador diferencial de pressão com tomada piloto a montante.',
    width: 68,
    height: 60,
    ports: [
      { id: 'in', label: 'P', dx: 0, dy: 30, direction: 'in' },
      { id: 'out', label: 'A', dx: 0, dy: -30, direction: 'out' },
      { id: 'X', label: 'X', dx: -34, dy: 0, direction: 'in' },
    ],
    defaultParams: { crackingPressure: 10 },
  },
  pressure_compensator_c: {
    type: 'pressure_compensator_c',
    category: 'valves',
    name: 'Compensador de Pressão (Mola + Piloto)',
    shortName: 'Compensad...',
    description: 'Compensador de pressão com equilíbrio entre mola regulável e linha piloto.',
    width: 68,
    height: 60,
    ports: [
      { id: 'in', label: 'P', dx: 0, dy: 30, direction: 'in' },
      { id: 'out', label: 'A', dx: 0, dy: -30, direction: 'out' },
      { id: 'X', label: 'X', dx: -34, dy: 0, direction: 'in' },
    ],
    defaultParams: { crackingPressure: 12 },
  },
  pressure_compensator_d: {
    type: 'pressure_compensator_d',
    category: 'valves',
    name: 'Compensador de Pressão (Duplo Piloto)',
    shortName: 'Compensad...',
    description: 'Compensador de pressão bidiferencial para controle de queda de pressão Δp.',
    width: 72,
    height: 60,
    ports: [
      { id: 'in', label: 'P', dx: 0, dy: 30, direction: 'in' },
      { id: 'out', label: 'A', dx: 0, dy: -30, direction: 'out' },
      { id: 'X', label: 'X', dx: -34, dy: 0, direction: 'in' },
    ],
    defaultParams: { crackingPressure: 15 },
  },
  cartridge_valve_a: {
    type: 'cartridge_valve_a',
    category: 'valves',
    name: 'Válvula de Cartucho (Elemento Lógico 2/2)',
    shortName: 'Válvula de ...',
    description: 'Válvula lógica de cartucho cônico com mola de fechamento e piloto superior.',
    width: 60,
    height: 68,
    ports: [
      { id: 'in', label: 'A', dx: 0, dy: 34, direction: 'bidirectional' },
      { id: 'out', label: 'B', dx: 30, dy: 12, direction: 'bidirectional' },
      { id: 'X', label: 'X', dx: 0, dy: -34, direction: 'in' },
    ],
    defaultParams: {
      crackingPressure: 1,
      cartridgeAreaMode: 'two_areas',
      cartridgeAreaACm2: 6,
      cartridgeAreaBCm2: 3,
      hydraulicResistance: 0.001,
    },
  },
  cartridge_valve_b: {
    type: 'cartridge_valve_b',
    category: 'valves',
    name: 'Válvula de Cartucho com Amortecimento',
    shortName: 'Válvula de ...',
    description: 'Válvula lógica de cartucho cônico com pino de amortecimento na sede.',
    width: 60,
    height: 68,
    ports: [
      { id: 'in', label: 'A', dx: 0, dy: 34, direction: 'bidirectional' },
      { id: 'out', label: 'B', dx: 30, dy: 12, direction: 'bidirectional' },
      { id: 'X', label: 'X', dx: 0, dy: -34, direction: 'in' },
    ],
    defaultParams: {
      crackingPressure: 1,
      cartridgeAreaMode: 'two_areas',
      cartridgeAreaACm2: 6,
      cartridgeAreaBCm2: 3,
      hydraulicResistance: 0.001,
    },
  },
  cartridge_valve_c: {
    type: 'cartridge_valve_c',
    category: 'valves',
    name: 'Válvula de Cartucho (Carretel com Orifício)',
    shortName: 'Válvula de ...',
    description: 'Válvula de cartucho tipo carretel com câmara intermediária e piloto superior.',
    width: 60,
    height: 68,
    ports: [
      { id: 'in', label: 'A', dx: 0, dy: 34, direction: 'bidirectional' },
      { id: 'out', label: 'B', dx: 30, dy: 10, direction: 'bidirectional' },
      { id: 'X', label: 'X', dx: 0, dy: -34, direction: 'in' },
    ],
    defaultParams: {
      crackingPressure: 1,
      cartridgeAreaACm2: 6,
      hydraulicResistance: 0.001,
    },
  },

  // === 2. Componentes elétricos — Atuadores ===
  elec_solenoid_act: {
    type: 'elec_solenoid_act',
    category: 'electrical',
    name: 'Atuador Eletromagnético (Solenoide Linear)',
    shortName: 'Solenoide lin...',
    description: 'Atuador eletromagnético linear acionado por tensão 24V CC.',
    width: 64,
    height: 56,
    ports: ELEC_VERT_PORTS,
    defaultParams: { active: false, sensingMark: '' },
  },
  elec_dc_motor: {
    type: 'elec_dc_motor',
    category: 'electrical',
    name: 'Motor Elétrico CC',
    shortName: 'Motor CC',
    description: 'Motor de corrente contínua para acionamento rotativo.',
    width: 60,
    height: 60,
    ports: ELEC_VERT_PORTS,
    defaultParams: { active: false, noLoadRpm: 75, loadNm: 0 },
  },
  elec_stepper_motor: {
    type: 'elec_stepper_motor',
    category: 'electrical',
    name: 'Motor de Passo / Servo Elétrico',
    shortName: 'Motor passo',
    description: 'Motor elétrico de posicionamento com controle de pulso.',
    width: 64,
    height: 60,
    ports: ELEC_VERT_PORTS,
    defaultParams: { active: false, noLoadRpm: 75, loadNm: 0 },
  },

  // === 3. Componentes elétricos — Alimentação de tensão ===
  elec_0v: {
    type: 'elec_0v',
    category: 'electrical',
    name: 'Fonte de Tensão (0V)',
    shortName: 'Fonte de t...',
    description: 'Terminal de referência elétrica 0V (GND).',
    width: 56,
    height: 44,
    ports: [{ id: 'out', label: '0V', dx: 26, dy: 4, direction: 'bidirectional' }],
    defaultParams: {},
  },
  elec_24v: {
    type: 'elec_24v',
    category: 'electrical',
    name: 'Fonte de Tensão (+24V)',
    shortName: 'Fonte de t...',
    description: 'Terminal de alimentação elétrica +24V CC.',
    width: 56,
    height: 44,
    ports: [{ id: 'out', label: '+24V', dx: 26, dy: 4, direction: 'out' }],
    defaultParams: { targetPressure: 24 },
  },
  elec_func_gen: {
    type: 'elec_func_gen',
    category: 'electrical',
    name: 'Gerador de Funções Elétricas',
    shortName: 'Gerador d...',
    description: 'Gerador de sinal analógico senoidal, triangular ou quadrado.',
    width: 72,
    height: 48,
    ports: [
      { id: 'v24', label: '+24V', dx: -34, dy: -10, direction: 'in' },
      { id: 'v0', label: '0V', dx: -34, dy: 10, direction: 'in' },
      { id: 'out', label: 'U', dx: 34, dy: 0, direction: 'out' },
    ],
    defaultParams: {
      opening: 50,
      funcGenWaveform: 'sine',
      funcGenFreqHz: 1,
      funcGenAmpV: 10,
      funcGenOffsetV: 0,
    },
  },
  elec_setpoint_card: {
    type: 'elec_setpoint_card',
    category: 'electrical',
    name: 'Cartão de Valor de Consignação (Setpoint)',
    shortName: 'Cartão cons...',
    description: 'Cartão eletrônico de referência de rampa e valor nominal.',
    width: 72,
    height: 56,
    ports: [
      { id: 'in', label: 'IN', dx: -34, dy: 0, direction: 'in' },
      { id: 'out', label: 'OUT', dx: 34, dy: 0, direction: 'out' },
    ],
    defaultParams: {
      opening: 50,
      setpointValues: [0, 0, 0, 0, 0, 0, 0, 0],
      setpointEnabled: [true, false, false, false, false, false, false, false],
      setpointRamps: [0, 0, 0, 0],
      setpointMode: 'wait_time',
      setpointSwitchTimeSec: 1,
    },
  },

  // === 4. Componentes elétricos — Sensores e instrumentos de medida ===
  elec_pressure_switch: {
    type: 'elec_pressure_switch',
    category: 'electrical',
    name: 'Pressostato (Saída Elétrica)',
    shortName: 'Pressostato',
    description: 'Pressostato eletromecânico com saída por contato elétrico comutável.',
    width: 68,
    height: 56,
    ports: [
      { id: 'p', label: 'P', dx: -34, dy: 0, direction: 'in' },
      { id: 'in', label: '1', dx: 0, dy: -28, direction: 'in' },
      { id: 'out', label: '4', dx: 0, dy: 28, direction: 'out' },
    ],
    defaultParams: { crackingPressure: 30, sensingMark: '' },
  },
  elec_pressure_transducer: {
    type: 'elec_pressure_transducer',
    category: 'electrical',
    name: 'Transdutor de Pressão Elétrico',
    shortName: 'Pressostato',
    description: 'Sensor transmissor de pressão com saída analógica 0-10V / 4-20mA.',
    width: 68,
    height: 56,
    ports: [
      { id: 'p', label: 'P', dx: -34, dy: 0, direction: 'in' },
      { id: 'out', label: 'U', dx: 34, dy: 0, direction: 'out' },
    ],
    defaultParams: { crackingPressure: 30, sensingMark: '' },
  },
  elec_flow_transducer: {
    type: 'elec_flow_transducer',
    category: 'electrical',
    name: 'Medidor de Caudal / Transdutor de Vazão',
    shortName: 'Medidor cau...',
    description: 'Sensor eletrônico de vazão com saída analógica proporcional.',
    width: 68,
    height: 56,
    ports: [
      { id: 'p', label: 'Q', dx: -34, dy: 0, direction: 'in' },
      { id: 'out', label: 'U', dx: 34, dy: 0, direction: 'out' },
    ],
    defaultParams: {
      displacementL: 0.0082,
      displacementCc: 8.2,
      frictionCoeff: 0.0128,
      inertiaKgM2: 0.0001,
      loadNm: 0,
    },
  },
  elec_ammeter: {
    type: 'elec_ammeter',
    category: 'electrical',
    name: 'Amperímetro',
    shortName: 'Amperímetro',
    description: 'Instrumento de medição de corrente elétrica em série.',
    width: 56,
    height: 56,
    ports: ELEC_VERT_PORTS,
    defaultParams: {},
  },
  elec_voltmeter: {
    type: 'elec_voltmeter',
    category: 'electrical',
    name: 'Voltímetro',
    shortName: 'Voltímetro',
    description: 'Instrumento de medição de tensão elétrica em paralelo.',
    width: 56,
    height: 56,
    ports: ELEC_VERT_PORTS,
    defaultParams: {},
  },
  elec_encoder: {
    type: 'elec_encoder',
    category: 'electrical',
    name: 'Encoder / Potenciômetro de Deslocamento',
    shortName: 'Encoder de ...',
    description: 'Transdutor potenciométrico de deslocamento linear 0-10V.',
    width: 68,
    height: 58,
    ports: [
      { id: 'in', label: '+U', dx: 0, dy: -29, direction: 'in' },
      { id: 'out', label: '0V', dx: 0, dy: 29, direction: 'out' },
      { id: 'sig', label: 'S', dx: 34, dy: 0, direction: 'out' },
    ],
    defaultParams: {},
  },
  elec_lamp: {
    type: 'elec_lamp',
    category: 'electrical',
    name: 'Indicador Luminoso (Lâmpada)',
    shortName: 'Indicador lu...',
    description: 'Sinalizador óptico luminoso de painel elétrico.',
    width: 52,
    height: 56,
    ports: ELEC_VERT_PORTS,
    defaultParams: { active: false },
  },
  elec_buzzer: {
    type: 'elec_buzzer',
    category: 'electrical',
    name: 'Indicador Acústico (Cigarrinha/Buzzer)',
    shortName: 'Indicador ac...',
    description: 'Sinalizador sonoro elétrico para alarme ou aviso de ciclo.',
    width: 56,
    height: 56,
    ports: ELEC_VERT_PORTS,
    defaultParams: { active: false },
  },

  // === 5. Componentes elétricos — Relés ===
  elec_relay: {
    type: 'elec_relay',
    category: 'electrical',
    name: 'Relé Auxiliar',
    shortName: 'Relé',
    description: 'Bobina de relé eletromecânico padrão (A1/A2).',
    width: 56,
    height: 56,
    ports: ELEC_VERT_PORTS,
    defaultParams: { active: false, sensingMark: '' },
  },
  elec_relay_ton: {
    type: 'elec_relay_ton',
    category: 'electrical',
    name: 'Relé com Retardo na Ativação (TON)',
    shortName: 'Relé com re...',
    description: 'Relé temporizado com retardo na energização (On-Delay).',
    width: 68,
    height: 56,
    ports: ELEC_VERT_PORTS,
    defaultParams: { active: false, relayDelaySec: 5, sensingMark: '' },
  },
  elec_relay_toff: {
    type: 'elec_relay_toff',
    category: 'electrical',
    name: 'Relé com Retardo na Desativação (TOFF)',
    shortName: 'Relé com re...',
    description: 'Relé temporizado com retardo na desenergização (Off-Delay).',
    width: 68,
    height: 56,
    ports: ELEC_VERT_PORTS,
    defaultParams: { active: false, relayDelaySec: 5, sensingMark: '' },
  },
  elec_counter_relay: {
    type: 'elec_counter_relay',
    category: 'electrical',
    name: 'Contador-Seletor Elétrico',
    shortName: 'Contador-se...',
    description: 'Relé contador pré-determinador com entradas de pulso (A1/A2) e reset (R1/R2).',
    width: 72,
    height: 58,
    ports: [
      { id: 'a1', label: 'A1', dx: -16, dy: -29, direction: 'in' },
      { id: 'a2', label: 'A2', dx: -16, dy: 29, direction: 'out' },
      { id: 'r1', label: 'R1', dx: 16, dy: -29, direction: 'in' },
      { id: 'r2', label: 'R2', dx: 16, dy: 29, direction: 'out' },
    ],
    defaultParams: { active: false, counterPreset: 5, sensingMark: '' },
  },
  elec_valve_solenoid: {
    type: 'elec_valve_solenoid',
    category: 'electrical',
    name: 'Solenoide de Válvula',
    shortName: 'Solenoide d...',
    description: 'Bobina solenoide de comando elétrico para válvulas direcionais.',
    width: 68,
    height: 56,
    ports: ELEC_VERT_PORTS,
    defaultParams: { active: false, sensingMark: '' },
  },
  elec_amp_1ch: {
    type: 'elec_amp_1ch',
    category: 'electrical',
    name: 'Amplificador Proporcional (1 Canal)',
    shortName: 'Amplificado...',
    description: 'Amplificador eletrônico de potência para solenoide proporcional de 1 canal.',
    width: 80,
    height: 56,
    ports: [
      { id: 'in', label: 'IN', dx: -38, dy: 0, direction: 'in' },
      { id: 'v24', label: '+24V', dx: -14, dy: -28, direction: 'in' },
      { id: 'v0', label: '0V', dx: -14, dy: 28, direction: 'in' },
    ],
    defaultParams: { opening: 60, sensingMark: '', jumpCurrentPct: 0 },
  },
  elec_amp_2ch: {
    type: 'elec_amp_2ch',
    category: 'electrical',
    name: 'Amplificador Proporcional (2 Canais)',
    shortName: 'Amplificado...',
    description: 'Amplificador eletrônico de potência para dupla bobina proporcional.',
    width: 80,
    height: 60,
    ports: [
      { id: 'in', label: 'IN', dx: -38, dy: 0, direction: 'in' },
      { id: 'v24', label: '+24V', dx: -14, dy: -30, direction: 'in' },
      { id: 'v0', label: '0V', dx: -14, dy: 30, direction: 'in' },
    ],
    defaultParams: { opening: 60, sensingMark: '', secondaryMark: '', jumpCurrentPct: 0 },
  },
  elec_prop_solenoid: {
    type: 'elec_prop_solenoid',
    category: 'electrical',
    name: 'Solenoide de Válvula Proporcional',
    shortName: 'Solenoide d...',
    description: 'Bobina eletromagnética proporcional com corrente regulável.',
    width: 72,
    height: 56,
    ports: ELEC_VERT_PORTS,
    defaultParams: { opening: 60, sensingMark: '' },
  },
  elec_limiter: {
    type: 'elec_limiter',
    category: 'electrical',
    name: 'Limitador de Corrente de Arranque',
    shortName: 'Limitador de...',
    description: 'Unidade eletrônica limitadora de corrente de arranque para proteção de bobinas e motores.',
    width: 72,
    height: 68,
    ports: [
      { id: 'v24', label: '24V', dx: -4, dy: -34, direction: 'in' },
      { id: 'out', label: 'OUT', dx: -4, dy: 34, direction: 'out' },
      { id: 'in', label: 'IN', dx: 34, dy: -12, direction: 'in' },
      { id: 'v0', label: '0V', dx: 34, dy: 14, direction: 'in' },
    ],
    defaultParams: { inrushDurationMs: 100, currentLimitA: 2 },
  },

  // === 6. Interruptores — Acionado manualmente ===
  elec_push_no: {
    type: 'elec_push_no',
    category: 'electrical',
    name: 'Pulsador (Obturador / NA)',
    shortName: 'Pulsador (O...',
    description: 'Botoeira de pulso momentâneo normalmente aberta (NA).',
    width: 56,
    height: 56,
    ports: ELEC_VERT_PORTS,
    defaultParams: { active: false },
  },
  elec_switch_no: {
    type: 'elec_switch_no',
    category: 'electrical',
    name: 'Interruptor (Obturador / NA)',
    shortName: 'Interruptor (...',
    description: 'Chave interruptora com trava mecânica normalmente aberta (NA).',
    width: 56,
    height: 56,
    ports: ELEC_VERT_PORTS,
    defaultParams: { active: false },
  },
  elec_push_nc: {
    type: 'elec_push_nc',
    category: 'electrical',
    name: 'Pulsador (Franqueador / NF)',
    shortName: 'Pulsador (Fr...',
    description: 'Botoeira de pulso momentâneo normalmente fechada (NF).',
    width: 56,
    height: 56,
    ports: ELEC_VERT_PORTS,
    defaultParams: { active: false },
  },
  elec_switch_nc: {
    type: 'elec_switch_nc',
    category: 'electrical',
    name: 'Interruptor (Franqueador / NF)',
    shortName: 'Interruptor (...',
    description: 'Chave interruptora com trava mecânica normalmente fechada (NF).',
    width: 56,
    height: 56,
    ports: ELEC_VERT_PORTS,
    defaultParams: { active: false },
  },
  elec_push_co: {
    type: 'elec_push_co',
    category: 'electrical',
    name: 'Pulsador (Comutador)',
    shortName: 'Pulsador (C...',
    description: 'Botoeira com contato reversível/comutador (NA + NF).',
    width: 60,
    height: 56,
    ports: ELEC_CO_PORTS,
    defaultParams: { active: false },
  },
  elec_switch_co: {
    type: 'elec_switch_co',
    category: 'electrical',
    name: 'Interruptor (Comutador)',
    shortName: 'Interruptor (...',
    description: 'Chave com trava e contato reversível/comutador (NA + NF).',
    width: 60,
    height: 56,
    ports: ELEC_CO_PORTS,
    defaultParams: { active: false },
  },

  // === 7. Interruptores comuns ===
  elec_contact_no: {
    type: 'elec_contact_no',
    category: 'electrical',
    name: 'Obturador (Contato NA)',
    shortName: 'Obturador',
    description: 'Contato auxiliar normalmente aberto (NA) acionado por relé ou fim de curso.',
    width: 50,
    height: 56,
    ports: ELEC_VERT_PORTS,
    defaultParams: { active: false },
  },
  elec_contact_nc: {
    type: 'elec_contact_nc',
    category: 'electrical',
    name: 'Franqueador (Contato NF)',
    shortName: 'Franqueador',
    description: 'Contato auxiliar normalmente fechado (NF) acionado por relé ou fim de curso.',
    width: 50,
    height: 56,
    ports: ELEC_VERT_PORTS,
    defaultParams: { active: false },
  },
  elec_contact_co: {
    type: 'elec_contact_co',
    category: 'electrical',
    name: 'Comutador (Contato Reversível)',
    shortName: 'Comutador',
    description: 'Contato auxiliar reversível (11-12/14) acionado por relé.',
    width: 56,
    height: 56,
    ports: ELEC_CO_PORTS,
    defaultParams: { active: false },
  },

  // === 8. Interruptor de alimentação (Sensores de Proximidade) ===
  elec_prox_cap: {
    type: 'elec_prox_cap',
    category: 'electrical',
    name: 'Sensor de Proximidade Capacitivo',
    shortName: 'Sensor cap...',
    description: 'Interruptor de proximidade capacitivo 3 fios (24V / 0V / Sinal).',
    width: 64,
    height: 58,
    ports: [
      { id: 'v24', label: '+', dx: -16, dy: -29, direction: 'in' },
      { id: 'v0', label: '-', dx: 16, dy: -29, direction: 'in' },
      { id: 'out', label: 'Q', dx: 32, dy: 0, direction: 'out' },
    ],
    defaultParams: { active: false },
  },
  elec_prox_ind: {
    type: 'elec_prox_ind',
    category: 'electrical',
    name: 'Sensor de Proximidade Indutivo',
    shortName: 'Sensor ind...',
    description: 'Interruptor de proximidade indutivo para detecção metálica.',
    width: 64,
    height: 58,
    ports: [
      { id: 'v24', label: '+', dx: -16, dy: -29, direction: 'in' },
      { id: 'v0', label: '-', dx: 16, dy: -29, direction: 'in' },
      { id: 'out', label: 'Q', dx: 32, dy: 0, direction: 'out' },
    ],
    defaultParams: { active: false },
  },
  elec_prox_mag: {
    type: 'elec_prox_mag',
    category: 'electrical',
    name: 'Sensor de Proximidade Magnético (Reed)',
    shortName: 'Sensor mag...',
    description: 'Interruptor magnético reed switch para êmbolos de cilindros.',
    width: 64,
    height: 58,
    ports: [
      { id: 'v24', label: '+', dx: -16, dy: -29, direction: 'in' },
      { id: 'v0', label: '-', dx: 16, dy: -29, direction: 'in' },
      { id: 'out', label: 'Q', dx: 32, dy: 0, direction: 'out' },
    ],
    defaultParams: { active: false },
  },
  elec_prox_opt: {
    type: 'elec_prox_opt',
    category: 'electrical',
    name: 'Sensor de Proximidade Óptico',
    shortName: 'Sensor óp...',
    description: 'Interruptor fotoelétrico óptico com saída de chaveamento 24V.',
    width: 64,
    height: 58,
    ports: [
      { id: 'v24', label: '+', dx: -16, dy: -29, direction: 'in' },
      { id: 'v0', label: '-', dx: 16, dy: -29, direction: 'in' },
      { id: 'out', label: 'Q', dx: 32, dy: 0, direction: 'out' },
    ],
    defaultParams: { active: false },
  },

  // === 9. Regulador ===
  elec_comparator: {
    type: 'elec_comparator',
    category: 'electrical',
    name: 'Comparador Analógico',
    shortName: 'Comparador',
    description: 'Bloco comparador com histerese entre valor nominal e realimentação.',
    width: 76,
    height: 52,
    ports: [
      { id: 'in', label: 'w', dx: -38, dy: 0, direction: 'in' },
      { id: 'out', label: 'y', dx: 38, dy: 0, direction: 'out' },
    ],
    defaultParams: {},
  },
  elec_pid: {
    type: 'elec_pid',
    category: 'electrical',
    name: 'Regulador PID Contínuo',
    shortName: 'Regulador...',
    description: 'Controlador proporcional-integral-derivativo para malha fechada.',
    width: 68,
    height: 52,
    ports: [
      { id: 'w', label: 'w', dx: -34, dy: -10, direction: 'in' },
      { id: 'x', label: 'x', dx: -34, dy: 10, direction: 'in' },
      { id: 'out', label: 'y', dx: 34, dy: 0, direction: 'out' },
    ],
    defaultParams: {},
  },
  elec_z_ctrl: {
    type: 'elec_z_ctrl',
    category: 'electrical',
    name: 'Regulador de Estado Z (Digital)',
    shortName: 'Regulador d...',
    description: 'Controlador discreto no domínio Z para sistemas hidráulicos servo-controlados.',
    width: 68,
    height: 52,
    ports: [
      { id: 'w', label: 'w', dx: -34, dy: -10, direction: 'in' },
      { id: 'x', label: 'x', dx: -34, dy: 10, direction: 'in' },
      { id: 'out', label: 'y', dx: 34, dy: 0, direction: 'out' },
    ],
    defaultParams: {},
  },

  // === 10. Símbolos de diagrama de Ladder ===
  ladder_0v: {
    type: 'ladder_0v',
    category: 'electrical',
    name: 'Conexão Elétrica 0V (Ladder)',
    shortName: 'Conexão el...',
    description: 'Barramento de retorno 0V para diagramas Ladder.',
    width: 52,
    height: 52,
    ports: [{ id: 'out', label: '0V', dx: 0, dy: 26, direction: 'bidirectional' }],
    defaultParams: {},
  },
  ladder_24v: {
    type: 'ladder_24v',
    category: 'electrical',
    name: 'Conexão Elétrica 24V (Ladder)',
    shortName: 'Conexão el...',
    description: 'Barramento de alimentação +24V para diagramas Ladder.',
    width: 52,
    height: 52,
    ports: [{ id: 'out', label: '24V', dx: 0, dy: 26, direction: 'out' }],
    defaultParams: {},
  },
  ladder_push_no: {
    type: 'ladder_push_no',
    category: 'electrical',
    name: 'Pulsador NA (Ladder)',
    shortName: 'Pulsador (n...',
    description: 'Botoeira normalmente aberta horizontal para diagrama Ladder.',
    width: 64,
    height: 44,
    ports: LADDER_HORIZ_PORTS,
    defaultParams: { active: false },
  },
  ladder_push_nc: {
    type: 'ladder_push_nc',
    category: 'electrical',
    name: 'Pulsador NF (Ladder)',
    shortName: 'Pulsador (n...',
    description: 'Botoeira normalmente fechada horizontal para diagrama Ladder.',
    width: 64,
    height: 44,
    ports: LADDER_HORIZ_PORTS,
    defaultParams: { active: false },
  },
  ladder_push_co: {
    type: 'ladder_push_co',
    category: 'electrical',
    name: 'Pulsador Comutador (Ladder)',
    shortName: 'Pulsador (c...',
    description: 'Botoeira dupla (NA + NF) horizontal para diagrama Ladder.',
    width: 64,
    height: 52,
    ports: [
      { id: 'in1', label: '11', dx: -32, dy: -8, direction: 'in' },
      { id: 'out1', label: '12', dx: 32, dy: -8, direction: 'out' },
      { id: 'in2', label: '23', dx: -32, dy: 8, direction: 'in' },
      { id: 'out2', label: '24', dx: 32, dy: 8, direction: 'out' },
    ],
    defaultParams: { active: false },
  },
  ladder_contact_no: {
    type: 'ladder_contact_no',
    category: 'electrical',
    name: 'Contato Normalmente Aberto (Ladder)',
    shortName: 'Contacto no...',
    description: 'Contato NA em linha horizontal para lógica Ladder.',
    width: 64,
    height: 44,
    ports: LADDER_HORIZ_PORTS,
    defaultParams: { active: false },
  },
  ladder_contact_nc: {
    type: 'ladder_contact_nc',
    category: 'electrical',
    name: 'Contato Normalmente Fechado (Ladder)',
    shortName: 'Contacto no...',
    description: 'Contato NF em linha horizontal para lógica Ladder.',
    width: 64,
    height: 44,
    ports: LADDER_HORIZ_PORTS,
    defaultParams: { active: false },
  },
  ladder_solenoid: {
    type: 'ladder_solenoid',
    category: 'electrical',
    name: 'Solenoide de Válvula (Ladder)',
    shortName: 'Solenoide d...',
    description: 'Saída de solenoide de válvula no padrão Ladder.',
    width: 64,
    height: 44,
    ports: LADDER_HORIZ_PORTS,
    defaultParams: { active: false },
  },
  ladder_relay: {
    type: 'ladder_relay',
    category: 'electrical',
    name: 'Relé (Ladder)',
    shortName: 'Relé (Ladder)',
    description: 'Bobina de relé auxiliar no padrão Ladder.',
    width: 64,
    height: 44,
    ports: LADDER_HORIZ_PORTS,
    defaultParams: { active: false },
  },
  ladder_relay_sr: {
    type: 'ladder_relay_sr',
    category: 'electrical',
    name: 'Relé com Retardo Ativação SR (Ladder)',
    shortName: 'Relé com ret...',
    description: 'Bobina temporizada com retardo na ativação no padrão Ladder.',
    width: 64,
    height: 44,
    ports: LADDER_HORIZ_PORTS,
    defaultParams: { active: false },
  },
  ladder_relay_sa: {
    type: 'ladder_relay_sa',
    category: 'electrical',
    name: 'Relé com Retardo Desativação SA (Ladder)',
    shortName: 'Relé com ret...',
    description: 'Bobina temporizada com retardo na desativação no padrão Ladder.',
    width: 64,
    height: 44,
    ports: LADDER_HORIZ_PORTS,
    defaultParams: { active: false },
  },
  ladder_lamp: {
    type: 'ladder_lamp',
    category: 'electrical',
    name: 'Indicador Luminoso (Ladder)',
    shortName: 'Indicador lu...',
    description: 'Lâmpada sinalizadora no padrão Ladder.',
    width: 64,
    height: 44,
    ports: LADDER_HORIZ_PORTS,
    defaultParams: { active: false },
  },

  // === 11. Técnica Digital (28 itens) ===
  dig_mod_16: {
    type: 'dig_mod_16',
    category: 'digital',
    name: 'Módulo Digital (CI 16 Pinos)',
    shortName: 'Módulo digital',
    description: 'Bloco integrado programável digital de 16 entradas e saídas.',
    width: 88,
    height: 54,
    ports: [
      { id: 'in', label: 'IN', dx: -44, dy: 0, direction: 'in' },
      { id: 'out', label: 'OUT', dx: 44, dy: 0, direction: 'out' },
    ],
    defaultParams: {},
  },
  dig_mod_io: {
    type: 'dig_mod_io',
    category: 'digital',
    name: 'Módulo Digital E/S (8x8)',
    shortName: 'Módulo digital',
    description: 'Módulo lógico digital com 8 entradas superiores e 8 saídas inferiores.',
    width: 84,
    height: 60,
    ports: [
      { id: 'in', label: 'I', dx: 0, dy: -30, direction: 'in' },
      { id: 'out', label: 'Q', dx: 0, dy: 30, direction: 'out' },
    ],
    defaultParams: {},
  },
  dig_lo: {
    type: 'dig_lo',
    category: 'digital',
    name: 'Nível Lógico Baixo (lo)',
    shortName: 'Nível lógic...',
    description: 'Constante digital fixa em nível lógico 0 (LOW).',
    width: 56,
    height: 48,
    ports: [{ id: 'out', label: '0', dx: 28, dy: 0, direction: 'out' }],
    defaultParams: { active: false },
  },
  dig_hi: {
    type: 'dig_hi',
    category: 'digital',
    name: 'Nível Lógico Alto (hi)',
    shortName: 'Nível lógic...',
    description: 'Constante digital fixa em nível lógico 1 (HIGH).',
    width: 56,
    height: 48,
    ports: [{ id: 'out', label: '1', dx: 28, dy: 0, direction: 'out' }],
    defaultParams: { active: true },
  },
  dig_in: {
    type: 'dig_in',
    category: 'digital',
    name: 'Entrada Digital (I)',
    shortName: 'Entrada',
    description: 'Pino de entrada lógica para blocos digitais.',
    width: 60,
    height: 48,
    ports: DIG_1IN_1OUT,
    defaultParams: { active: false },
  },
  dig_out: {
    type: 'dig_out',
    category: 'digital',
    name: 'Saída Digital (Q)',
    shortName: 'Saída',
    description: 'Pino de saída lógica com indicação direta e invertida.',
    width: 60,
    height: 48,
    ports: [
      { id: 'in', label: 'I', dx: -30, dy: 0, direction: 'in' },
      { id: 'q', label: 'Q', dx: 30, dy: -8, direction: 'out' },
      { id: 'qn', label: '/Q', dx: 30, dy: 8, direction: 'out' },
    ],
    defaultParams: {},
  },
  dig_mem: {
    type: 'dig_mem',
    category: 'digital',
    name: 'Bit de Memória (M)',
    shortName: 'Bits de me...',
    description: 'Marcador / bit de memória auxiliar interno (Flag M).',
    width: 60,
    height: 48,
    ports: DIG_1IN_1OUT,
    defaultParams: { active: false },
  },
  dig_and: {
    type: 'dig_and',
    category: 'digital',
    name: 'Porta Lógica AND (&)',
    shortName: 'AND',
    description: 'Porta lógica E (saída 1 somente quando todas as entradas ativas são 1).',
    width: 64,
    height: 54,
    ports: DIG_3IN_1OUT,
    defaultParams: {},
  },
  dig_or: {
    type: 'dig_or',
    category: 'digital',
    name: 'Porta Lógica OR (>=1)',
    shortName: 'OR',
    description: 'Porta lógica OU (saída 1 quando ao menos uma entrada for 1).',
    width: 64,
    height: 54,
    ports: DIG_3IN_1OUT,
    defaultParams: {},
  },
  dig_not: {
    type: 'dig_not',
    category: 'digital',
    name: 'Porta Lógica NOT (Inversor)',
    shortName: 'NOT',
    description: 'Inversor lógico (saída negada da entrada).',
    width: 60,
    height: 48,
    ports: DIG_1IN_1OUT,
    defaultParams: {},
  },
  dig_and_edge: {
    type: 'dig_and_edge',
    category: 'digital',
    name: 'AND com Detecção de Flanco Subida',
    shortName: 'AND activa...',
    description: 'Porta AND disparada na borda de subida do sinal.',
    width: 64,
    height: 54,
    ports: DIG_3IN_1OUT,
    defaultParams: {},
  },
  dig_nand: {
    type: 'dig_nand',
    category: 'digital',
    name: 'Porta Lógica NAND',
    shortName: 'NAND',
    description: 'Porta lógica NÃO-E (saída 0 quando todas as entradas são 1).',
    width: 64,
    height: 54,
    ports: DIG_3IN_1OUT,
    defaultParams: {},
  },
  dig_nand_edge: {
    type: 'dig_nand_edge',
    category: 'digital',
    name: 'NAND com Detecção de Flanco Descida',
    shortName: 'NAND Con ...',
    description: 'Porta NAND disparada na borda de descida.',
    width: 64,
    height: 54,
    ports: DIG_3IN_1OUT,
    defaultParams: {},
  },
  dig_nor: {
    type: 'dig_nor',
    category: 'digital',
    name: 'Porta Lógica NOR',
    shortName: 'NOR',
    description: 'Porta lógica NÃO-OU.',
    width: 64,
    height: 54,
    ports: DIG_3IN_1OUT,
    defaultParams: {},
  },
  dig_xor: {
    type: 'dig_xor',
    category: 'digital',
    name: 'Porta Lógica XOR (=1)',
    shortName: 'XOR',
    description: 'Porta lógica OU-Exclusivo (saída 1 quando entradas diferem).',
    width: 64,
    height: 48,
    ports: DIG_2IN_1OUT,
    defaultParams: {},
  },
  dig_rs: {
    type: 'dig_rs',
    category: 'digital',
    name: 'Relé com Auto-Retenção (Flip-Flop RS)',
    shortName: 'Relé con en...',
    description: 'Biestável Set/Reset com prioridade de Reset.',
    width: 64,
    height: 48,
    ports: DIG_2IN_1OUT,
    defaultParams: { active: false },
  },
  dig_pulse_gen: {
    type: 'dig_pulse_gen',
    category: 'digital',
    name: 'Gerador de Pulsos Assíncrono',
    shortName: 'Gerador d...',
    description: 'Oscilador gerador de trens de pulso ajustáveis.',
    width: 64,
    height: 52,
    ports: DIG_1IN_1OUT,
    defaultParams: {},
  },
  dig_freq_gen: {
    type: 'dig_freq_gen',
    category: 'digital',
    name: 'Gerador de Frequência / PWM',
    shortName: 'Gerador d...',
    description: 'Gerador de sinal digital de frequência variável.',
    width: 64,
    height: 52,
    ports: DIG_2IN_1OUT,
    defaultParams: {},
  },
  dig_pulse_relay: {
    type: 'dig_pulse_relay',
    category: 'digital',
    name: 'Relé de Pulso (Telerruptor)',
    shortName: 'Relé de pu...',
    description: 'Comuta a saída a cada pulso recebido na entrada.',
    width: 64,
    height: 52,
    ports: DIG_2IN_1OUT,
    defaultParams: {},
  },
  dig_ton: {
    type: 'dig_ton',
    category: 'digital',
    name: 'Temporizador Retardo à Ativação (TON)',
    shortName: 'Retardo a la...',
    description: 'Atrasa a subida do sinal de saída por tempo programado.',
    width: 64,
    height: 54,
    ports: DIG_2IN_1OUT,
    defaultParams: {},
  },
  dig_toff: {
    type: 'dig_toff',
    category: 'digital',
    name: 'Temporizador Retardo à Desativação (TOFF)',
    shortName: 'Retardo a la...',
    description: 'Mantém a saída ligada após queda da entrada por tempo programado.',
    width: 64,
    height: 54,
    ports: DIG_2IN_1OUT,
    defaultParams: {},
  },
  dig_tonoff: {
    type: 'dig_tonoff',
    category: 'digital',
    name: 'Temporizador Retardo Ativação/Desativação',
    shortName: 'Retardo a la...',
    description: 'Aplica retardo tanto na subida quanto na descida do sinal.',
    width: 64,
    height: 54,
    ports: DIG_2IN_1OUT,
    defaultParams: {},
  },
  dig_ton_mem: {
    type: 'dig_ton_mem',
    category: 'digital',
    name: 'Temporizador Retardo Ativação c/ Memória',
    shortName: 'Retardo a la...',
    description: 'Temporizador retentivo na ativação com pino de reset.',
    width: 64,
    height: 54,
    ports: DIG_2IN_1OUT,
    defaultParams: {},
  },
  dig_wipe_up: {
    type: 'dig_wipe_up',
    category: 'digital',
    name: 'Relé Limpador (Pulso na Subida)',
    shortName: 'Relé recorta...',
    description: 'Gera um pulso de duração fixa na transição positiva.',
    width: 64,
    height: 54,
    ports: DIG_2IN_1OUT,
    defaultParams: {},
  },
  dig_wipe_down: {
    type: 'dig_wipe_down',
    category: 'digital',
    name: 'Relé Limpador (Pulso na Descida)',
    shortName: 'Relé recorta...',
    description: 'Gera um pulso de duração fixa na transição negativa.',
    width: 64,
    height: 54,
    ports: DIG_2IN_1OUT,
    defaultParams: {},
  },
  dig_counter: {
    type: 'dig_counter',
    category: 'digital',
    name: 'Contador Digital Crescente/Decrescente',
    shortName: 'Contador de...',
    description: 'Contador de pulsos digitais com direção +/- e preset.',
    width: 68,
    height: 54,
    ports: DIG_3IN_1OUT,
    defaultParams: {},
  },
  dig_schmitt: {
    type: 'dig_schmitt',
    category: 'digital',
    name: 'Disparador Schmitt (Histerese)',
    shortName: 'Disparador ...',
    description: 'Conversor analógico-digital com janela de histerese.',
    width: 64,
    height: 52,
    ports: DIG_1IN_1OUT,
    defaultParams: {},
  },
  dig_timer: {
    type: 'dig_timer',
    category: 'digital',
    name: 'Temporizador Horário / Relógio',
    shortName: 'Temporizador',
    description: 'Bloco temporizador de ciclo ou relógio semanal.',
    width: 60,
    height: 58,
    ports: [{ id: 'out', label: 'Q', dx: 30, dy: 0, direction: 'out' }],
    defaultParams: {},
  },

  // === 12. EasyPort/OPC/DDE (6 itens) ===
  ep_analog_in: {
    type: 'ep_analog_in',
    category: 'easyport',
    name: 'EasyPort Analog-In (4 Canais)',
    shortName: 'Analog-In',
    description: 'Interface de aquisição de 4 entradas analógicas EasyPort/OPC.',
    width: 96,
    height: 54,
    ports: [
      { id: 'c0', label: '0', dx: -30, dy: 27, direction: 'out' },
      { id: 'c1', label: '1', dx: -10, dy: 27, direction: 'out' },
      { id: 'c2', label: '2', dx: 10, dy: 27, direction: 'out' },
      { id: 'c3', label: '3', dx: 30, dy: 27, direction: 'out' },
    ],
    defaultParams: {},
  },
  ep_analog_out: {
    type: 'ep_analog_out',
    category: 'easyport',
    name: 'EasyPort Analog-Out (2 Canais)',
    shortName: 'Analog-Out',
    description: 'Interface de envio de 2 saídas analógicas EasyPort/OPC.',
    width: 92,
    height: 54,
    ports: [
      { id: 'c0', label: '0', dx: -20, dy: -27, direction: 'in' },
      { id: 'c1', label: '1', dx: 20, dy: -27, direction: 'in' },
    ],
    defaultParams: {},
  },
  ep_multipol: {
    type: 'ep_multipol',
    category: 'easyport',
    name: 'Conector MultiPol (Terminal de Válvulas)',
    shortName: 'MultiPol',
    description: 'Conector multipolar industrial para ilha de válvulas e sensores.',
    width: 60,
    height: 68,
    ports: [
      { id: 'in', label: 'BUS', dx: -30, dy: 0, direction: 'bidirectional' },
      { id: 'out', label: 'IO', dx: 30, dy: 0, direction: 'bidirectional' },
    ],
    defaultParams: {},
  },
  ep_universal_io: {
    type: 'ep_universal_io',
    category: 'easyport',
    name: 'Universal-I/O (M12 24V)',
    shortName: 'Universal-I/O',
    description: 'Conector universal I/O M12 com alimentação +24V/0V e sinal.',
    width: 68,
    height: 60,
    ports: [
      { id: 'v24', label: '+24', dx: 0, dy: -30, direction: 'in' },
      { id: 'v0', label: '0V', dx: 0, dy: 30, direction: 'in' },
      { id: 'sig', label: 'S', dx: -34, dy: 0, direction: 'bidirectional' },
    ],
    defaultParams: {},
  },
  ep_port_in: {
    type: 'ep_port_in',
    category: 'easyport',
    name: 'Porta de Entrada EasyPort (8 Bits)',
    shortName: 'Puerto de e...',
    description: 'Barramento de 8 entradas digitais EasyPort/OPC/DDE.',
    width: 96,
    height: 54,
    ports: [
      { id: 'b0', label: '0', dx: -28, dy: 27, direction: 'out' },
      { id: 'b7', label: '7', dx: 28, dy: 27, direction: 'out' },
    ],
    defaultParams: {},
  },
  ep_port_out: {
    type: 'ep_port_out',
    category: 'easyport',
    name: 'Porta de Saída EasyPort (8 Bits)',
    shortName: 'Puerto de s...',
    description: 'Barramento de 8 saídas digitais EasyPort/OPC/DDE.',
    width: 96,
    height: 54,
    ports: [
      { id: 'b0', label: '0', dx: -28, dy: -27, direction: 'in' },
      { id: 'b7', label: '7', dx: 28, dy: -27, direction: 'in' },
    ],
    defaultParams: {},
  },

  // === 13. GRAFCET (6 itens) ===
  grafcet_step: {
    type: 'grafcet_step',
    category: 'grafcet',
    name: 'Passo GRAFCET',
    shortName: 'Passo',
    description: 'Etapa/Passo sequencial do diagrama GRAFCET (IEC 60848).',
    width: 56,
    height: 56,
    ports: [
      { id: 'in', label: 'IN', dx: 0, dy: -28, direction: 'in' },
      { id: 'out', label: 'OUT', dx: 0, dy: 28, direction: 'out' },
      { id: 'act', label: 'A', dx: 28, dy: 0, direction: 'out' },
    ],
    defaultParams: { active: false },
  },
  grafcet_trans: {
    type: 'grafcet_trans',
    category: 'grafcet',
    name: 'Transição GRAFCET',
    shortName: 'Transição',
    description: 'Condição de transição entre passos GRAFCET.',
    width: 48,
    height: 48,
    ports: ELEC_VERT_PORTS,
    defaultParams: { active: false },
  },
  grafcet_action: {
    type: 'grafcet_action',
    category: 'grafcet',
    name: 'Ação GRAFCET',
    shortName: 'Ação',
    description: 'Bloco retangular de ação associada a um passo GRAFCET.',
    width: 84,
    height: 40,
    ports: [{ id: 'in', label: 'E', dx: -42, dy: 0, direction: 'in' }],
    defaultParams: {},
  },
  grafcet_sync: {
    type: 'grafcet_sync',
    category: 'grafcet',
    name: 'Sincronização GRAFCET',
    shortName: 'Sincronização',
    description: 'Barra dupla horizontal de divergência/convergência simultânea.',
    width: 80,
    height: 32,
    ports: [
      { id: 'in', label: 'IN', dx: 0, dy: -16, direction: 'in' },
      { id: 'out', label: 'OUT', dx: 0, dy: 16, direction: 'out' },
    ],
    defaultParams: {},
  },
  grafcet_partial: {
    type: 'grafcet_partial',
    category: 'grafcet',
    name: 'GRAFCET Parcial (Macro-Etapa / Moldura)',
    shortName: 'GRAFCET ...',
    description: 'Moldura de encapsulamento para sub-GRAFCET parcial.',
    width: 76,
    height: 68,
    ports: [],
    defaultParams: {},
  },
  grafcet_io: {
    type: 'grafcet_io',
    category: 'grafcet',
    name: 'GRAFCET I/O (Tabela de Entradas/Saídas)',
    shortName: 'GRAFCET I/O',
    description: 'Bloco de interface de variáveis de entrada e saída GRAFCET.',
    width: 76,
    height: 72,
    ports: [
      { id: 'in', label: 'I', dx: -38, dy: 0, direction: 'in' },
      { id: 'out', label: 'Q', dx: 38, dy: 0, direction: 'out' },
    ],
    defaultParams: {},
  },

  // === 14. Outros (10 itens) ===
  other_state_chart: {
    type: 'other_state_chart',
    category: 'others',
    name: 'Diagrama de Estado',
    shortName: 'Diagrama d...',
    description: 'Quadro gráfico para visualização de estados ao longo do tempo.',
    width: 110,
    height: 64,
    ports: [],
    defaultParams: {},
  },
  other_func_chart: {
    type: 'other_func_chart',
    category: 'others',
    name: 'Diagrama de Funções (Passo-Tempo)',
    shortName: 'Diagrama d...',
    description: 'Tabela cronológica de funções e passos de atuadores.',
    width: 110,
    height: 56,
    ports: [],
    defaultParams: {},
  },
  other_bar_chart: {
    type: 'other_bar_chart',
    category: 'others',
    name: 'Diagrama de Barras / Indicador de Nível',
    shortName: 'Diagrama d...',
    description: 'Barra indicadora horizontal para visualização analógica no diagrama.',
    width: 100,
    height: 36,
    ports: [],
    defaultParams: { opening: 65 },
  },
  other_parts_list: {
    type: 'other_parts_list',
    category: 'others',
    name: 'Lista de Peças (BOM)',
    shortName: 'Lista de pe...',
    description: 'Tabela de lista de materiais dos componentes do circuito.',
    width: 110,
    height: 44,
    ports: [],
    defaultParams: {},
  },
  other_text: {
    type: 'other_text',
    category: 'others',
    name: 'Componente de Texto / Anotação',
    shortName: 'Component...',
    description: 'Rótulo de texto editável para legendas técnicas no esquema.',
    width: 84,
    height: 36,
    ports: [],
    defaultParams: {},
  },
  other_circle: {
    type: 'other_circle',
    category: 'others',
    name: 'Círculo (Desenho CAD)',
    shortName: 'Círculo',
    description: 'Primitiva geométrica circular para anotações no esquema.',
    width: 64,
    height: 64,
    ports: [],
    defaultParams: {},
  },
  other_ellipse: {
    type: 'other_ellipse',
    category: 'others',
    name: 'Elipse (Desenho CAD)',
    shortName: 'Elipse',
    description: 'Primitiva geométrica elíptica para anotações no esquema.',
    width: 84,
    height: 56,
    ports: [],
    defaultParams: {},
  },
  other_square: {
    type: 'other_square',
    category: 'others',
    name: 'Quadrado (Desenho CAD)',
    shortName: 'Quadrado',
    description: 'Primitiva geométrica quadrada para agrupamento visual.',
    width: 64,
    height: 64,
    ports: [],
    defaultParams: {},
  },
  other_rect: {
    type: 'other_rect',
    category: 'others',
    name: 'Retângulo (Desenho CAD)',
    shortName: 'Retângulo',
    description: 'Primitiva geométrica retangular para molduras e zonas.',
    width: 92,
    height: 56,
    ports: [],
    defaultParams: {},
  },
};
