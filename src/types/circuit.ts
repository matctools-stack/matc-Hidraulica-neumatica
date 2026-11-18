export type FluidMedium = 'hydraulic' | 'pneumatic';

export type ComponentType =
  // Elementos de alimentação
  | 'power_unit_simple'
  | 'pump'
  | 'pump_variable'
  | 'compressor'
  | 'tank'
  | 'power_unit'
  | 'pump_amplifier'
  | 'pump_prop'
  | 'accumulator_simple'
  | 'accumulator'
  | 'accumulator_unit'
  | 'flexible_hose'
  | 'filter'
  | 'cooler'
  | 'heater'
  | 'regulator'
  // Válvulas direcionais
  | 'valve_2_2'
  | 'valve_3_2'
  | 'valve_4_2'
  | 'valve_5_2'
  | 'valve_4_3'
  | 'valve_5_3'
  | 'valve_6_2'
  // Válvulas contínuas
  | 'amp_prop_2ch'
  | 'prop_valve_4_3'
  | 'amp_prop_1ch'
  | 'prop_throttle_2_2'
  | 'prop_relief'
  | 'prop_relief_piloted'
  | 'prop_pressure_reducer'
  | 'prop_solenoid'
  | 'servo_valve_4_3'
  // Válvulas de fechamento e controle de vazão
  | 'nozzle'
  | 'throttle'
  | 'orifice'
  | 'orifice_adjustable'
  | 'shutoff_valve'
  | 'check_throttle'
  | 'check_valve'
  | 'check_valve_spring'
  | 'pilot_check_valve'
  | 'pilot_check_spring'
  | 'pilot_check_close'
  | 'pilot_check_close_spring'
  | 'flow_control_2way'
  | 'flow_control_3way'
  | 'shuttle_valve'
  | 'two_pressure_valve'
  | 'quick_exhaust'
  | 'flow_divider'
  // Válvulas de pressão
  | 'relief_valve'
  | 'relief_valve_piloted'
  | 'relief_valve_ext'
  | 'sequence_valve'
  | 'pressure_reducer_2'
  | 'pressure_reducer_3'
  | 'counterbalance_valve'
  | 'pressure_compensator'
  | 'pressure_compensator_b'
  | 'pressure_compensator_c'
  | 'pressure_compensator_d'
  | 'cartridge_valve_a'
  | 'cartridge_valve_b'
  | 'cartridge_valve_c'
  // Atuadores
  | 'distance_rule'
  | 'cylinder_single'
  | 'cylinder_double'
  | 'motor'
  | 'rotary_actuator'
  // Sensores e instrumentos de medida (Hidráulica/Pneumática)
  | 'pressure_gauge'
  | 'diff_pressure_gauge'
  | 'pressure_indicator'
  | 'flow_meter'
  | 'flow_meter_analog'
  | 'flow_sensor_elec'
  | 'pressure_switch'
  | 'pressure_sensor_elec'
  | 'tachometer_sensor'
  | 'tee'
  // Componentes elétricos — Atuadores
  | 'elec_solenoid_act'
  | 'elec_dc_motor'
  | 'elec_stepper_motor'
  // Componentes elétricos — Alimentação de tensão
  | 'elec_0v'
  | 'elec_24v'
  | 'elec_func_gen'
  | 'elec_setpoint_card'
  // Componentes elétricos — Sensores e instrumentos de medida
  | 'elec_pressure_switch'
  | 'elec_pressure_transducer'
  | 'elec_flow_transducer'
  | 'elec_ammeter'
  | 'elec_voltmeter'
  | 'elec_encoder'
  | 'elec_lamp'
  | 'elec_buzzer'
  // Componentes elétricos — Relés
  | 'elec_relay'
  | 'elec_relay_ton'
  | 'elec_relay_toff'
  | 'elec_counter_relay'
  | 'elec_valve_solenoid'
  | 'elec_amp_1ch'
  | 'elec_amp_2ch'
  | 'elec_prop_solenoid'
  | 'elec_limiter'
  // Componentes elétricos — Interruptores (Acionado manualmente)
  | 'elec_push_no'
  | 'elec_switch_no'
  | 'elec_push_nc'
  | 'elec_switch_nc'
  | 'elec_push_co'
  | 'elec_switch_co'
  // Componentes elétricos — Interruptores comuns
  | 'elec_contact_no'
  | 'elec_contact_nc'
  | 'elec_contact_co'
  // Componentes elétricos — Interruptor de alimentação (Sensores de proximidade)
  | 'elec_prox_cap'
  | 'elec_prox_ind'
  | 'elec_prox_mag'
  | 'elec_prox_opt'
  // Componentes elétricos — Regulador
  | 'elec_comparator'
  | 'elec_pid'
  | 'elec_z_ctrl'
  // Componentes elétricos — Símbolos de diagrama de Ladder
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
  // Técnica Digital
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
  // EasyPort/OPC/DDE
  | 'ep_analog_in'
  | 'ep_analog_out'
  | 'ep_multipol'
  | 'ep_universal_io'
  | 'ep_port_in'
  | 'ep_port_out'
  // GRAFCET
  | 'grafcet_step'
  | 'grafcet_trans'
  | 'grafcet_action'
  | 'grafcet_sync'
  | 'grafcet_partial'
  | 'grafcet_io'
  // Outros
  | 'other_state_chart'
  | 'other_func_chart'
  | 'other_bar_chart'
  | 'other_parts_list'
  | 'other_text'
  | 'other_circle'
  | 'other_ellipse'
  | 'other_square'
  | 'other_rect';

export type PortDirection = 'in' | 'out' | 'bidirectional';

export interface PortSpec {
  id: string;
  label: string;
  /** Offset from component center (x, y) in unrotated local coordinates */
  dx: number;
  dy: number;
  direction: PortDirection;
}

export type ComponentCatalogCategory =
  | 'sources'
  | 'valves'
  | 'actuators'
  | 'instruments'
  | 'electrical'
  | 'digital'
  | 'easyport'
  | 'grafcet'
  | 'others';

export interface ComponentCatalogItem {
  type: ComponentType;
  category: ComponentCatalogCategory;
  name: string;
  shortName: string;
  description: string;
  width: number;
  height: number;
  ports: PortSpec[];
  defaultParams: ComponentParams;
}

export interface CylinderForcePoint {
  posMm: number;
  forceN: number;
}

export interface CylinderActuationLabel {
  mark: string;
  startMm: string;
  endMm: string;
}

export type CylinderTypeOption = 'single_extend' | 'single_retract' | 'double';
export type CylinderRodOption = 'single' | 'double' | 'rodless';
export type FrictionMaterialId =
  | 'steel_steel'
  | 'cast_iron'
  | 'wood_wood'
  | 'steel_wood'
  | 'steel_ice'
  | 'tire_asphalt';

export interface CylinderConfig {
  /** Tipo de cilindro */
  cylinderType: CylinderTypeOption;
  springReturn: boolean;
  /** Tipo de haste */
  rodType: CylinderRodOption;
  throughRod: boolean;
  magneticCoupling: boolean;
  slideGuide: boolean;
  /** Propriedades */
  cushioning: boolean;
  cushioningAdjustable: boolean;
  sensing: boolean;
  sensingMark: string;
  /** Espelhar */
  mirrorHorizontal: boolean;
  mirrorVertical: boolean;
  /** Parâmetros */
  initialPosMm: number;
  mountingAngleDeg: number;
  internalLeakage: number;
  areaUnit: 'qcm' | 'qmm';
  showVelocity: boolean;
  showForce: boolean;
  /** Carga externa */
  movingMassKg: number;
  frictionMode: 'material' | 'manual';
  frictionMaterial: FrictionMaterialId;
  staticFriction: number;
  dynamicFriction: number;
  /** Perfil de força */
  forceMode: 'constant' | 'variable';
  forceProfile: CylinderForcePoint[];
  forceChartRangeN: number;
  /** Etiquetas de acionamento (6 linhas) */
  actuationLabels: CylinderActuationLabel[];
}

export type ValveManualActuation =
  | ''
  | 'manual_general'
  | 'manual_detent'
  | 'button'
  | 'button_detent'
  | 'lever'
  | 'detent_lever'
  | 'pedal'
  | 'pedal_detent';

export type ValveMechActuation =
  | ''
  | 'plunger'
  | 'roller'
  | 'idle_roller'
  | 'idle_roller_rev'
  | 'limit_sensor'
  | 'proximity_sensor';

export type ValveElecActuation =
  | ''
  | 'solenoid'
  | 'hydraulic_pilot'
  | 'hydraulic_pilot_solenoid'
  | 'pneumatic_pilot';

export type ValveChamberPattern =
  | ''
  | 'closed'
  | 'p_closed_abt'
  | 't_closed_pab'
  | 'a_closed_pbt'
  | 'b_closed_pat'
  | 'parallel'
  | 'crossed'
  | 'b_to_t_pa_closed'
  | 'p_to_a_bt_closed'
  | 'a_to_t_pb_closed'
  | 'p_to_b_at_closed'
  | 'p_to_t_ab_closed'
  | 'a_to_b_pt_closed'
  | 'p_to_t_a_to_b'
  | 'all_open'
  | 'p_to_a_b_exhaust'
  | 'p_closed_ab_t'
  | 'check_up';

export interface ValveActuationSide {
  springReturn: boolean;
  piloted: boolean;
  externalFeed: boolean;
  manual: ValveManualActuation;
  mechanical: ValveMechActuation;
  electrical: ValveElecActuation;
  /** Electrical solenoid / pilot mark (e.g. Y1, Y2) */
  mark?: string;
}

export interface ValveConfig {
  leftActuation: ValveActuationSide;
  rightActuation: ValveActuationSide;
  reversible: boolean;
  chambers: [
    ValveChamberPattern,
    ValveChamberPattern,
    ValveChamberPattern,
    ValveChamberPattern,
  ];
  initialPosition: 0 | 1 | 2 | 3;
  dominantSide: 'left' | 'right';
  dominantSignal: boolean;
  hydraulicResistance: number;
  resistanceUnit: 'mpa_lmin2' | 'bar_lmin2';
  mirrorHorizontal: boolean;
  mirrorVertical: boolean;
}

export interface PortConfig {
  /** Custom connection designation (e.g. P, T, A, B) */
  designation?: string;
  /** Show live port pressure in MPa */
  showPressure?: boolean;
  /** Show live port flow in l/min */
  showFlow?: boolean;
  /** Blind plug sealing this connection port */
  blindPlug?: boolean;
}

export interface ComponentParams {
  /** Pump / Compressor / Regulator target pressure in bar */
  targetPressure?: number;
  /** Pump / Compressor max flow in L/min */
  maxFlow?: number;
  /** Pump / Power unit internal leakage in l/(min*MPa) */
  internalLeakage?: number;
  /** Hydraulic resistance for filter / flexible hose in MPa/(l/min)^2 */
  hydraulicResistance?: number;
  /** Accumulator volume in liters */
  volumeL?: number;
  /** Whether accumulator displays pressure indication badge */
  showPressureIndication?: boolean;
  /** Pump speed in 1/min (RPM) */
  rpm?: number;
  /** Pump displacement in liters/rev */
  displacementL?: number;
  /** Relief / Check / Sequence / Precharge pressure in bar */
  crackingPressure?: number;
  /** Throttle / Shutoff opening percentage (0 - 100) */
  opening?: number;
  /** Directional valve active spool state (legacy / 2-pos) */
  active?: boolean;
  /** 3-position / multi-position spool index (0, 1, 2, 3) */
  spoolPosition?: number;
  /** Valve actuation mode label */
  actuation?: 'manual' | 'solenoid';
  /** Full FluidSIM directional valve configuration */
  valveConfig?: ValveConfig;
  /** Cylinder bore diameter in mm */
  boreMm?: number;
  /** Cylinder rod diameter in mm */
  rodMm?: number;
  /** Cylinder stroke length in mm */
  strokeMm?: number;
  /** External mechanical load force in N */
  loadN?: number;
  /** Complete FluidSIM cylinder configuration */
  cylinderConfig?: CylinderConfig;
  /** Motor displacement in cc/rev */
  displacementCc?: number;
  /** Motor load torque in Nm */
  loadNm?: number;
  /** Viscous friction coefficient in N*m*s/rad (motor / rotary actuator) */
  frictionCoeff?: number;
  /** Moment of inertia in kg*m^2 (motor / rotary actuator) */
  inertiaKgM2?: number;
  /** Whether throttle / shutoff / check-throttle displays opening % badge */
  showOpeningBadge?: boolean;
  /** Secondary check valve hydraulic resistance in MPa/(l/min)^2 (check_throttle) */
  checkValveResistance?: number;
  /** Pilot area ratio r = X : B or r = X : A (1..10) */
  areaRatio?: number;
  /** Nominal flow rate in l/min (0.01..500) for 2-way & 3-way flow control valves */
  nominalFlowLpm?: number;
  /** Initial position for semi-rotary actuator */
  rotaryInitialPos?: 'left' | 'right';
  /** Primary & secondary actuation marks (e.g. rotary actuator Marca fields) */
  sensingMark?: string;
  secondaryMark?: string;
  /** Cartridge valve active area configuration ('one_area' | 'two_areas') */
  cartridgeAreaMode?: 'one_area' | 'two_areas';
  /** Cartridge valve Area A / active area in cm² (qcm: 1..100) */
  cartridgeAreaACm2?: number;
  /** Cartridge valve Area B in cm² (qcm: 0..100) */
  cartridgeAreaBCm2?: number;
  /** Proportional directional/throttle spool control edge shape */
  spoolEdgeShape?: 'rectangular' | 'triangular';
  /** Relative spool overlap percentage (-30..30) */
  spoolOverlapPct?: number;
  /** Proportional amplifier jump current percentage (0..25) */
  jumpCurrentPct?: number;
  /** Minimum nominal pressure in bar for proportional pressure valves (0..10 bar / 0..1 MPa) */
  minPressureBar?: number;
  /** Pressure indicator signal color hex (e.g. #800000) */
  signalColor?: string;
  /** Flow meter display mode ('instantaneous' | 'accumulated') */
  flowDisplayMode?: 'instantaneous' | 'accumulated';
  /** Counter incremented when user clicks Restabelecer on flow meter */
  accumulatedVolumeResetSeq?: number;
  /** Electrical DC / stepper motor no-load speed (RPM: 10..20000) */
  noLoadRpm?: number;
  /** Electrical function generator parameters */
  funcGenWaveform?: 'constant' | 'square' | 'sine' | 'triangle' | 'profile';
  funcGenFreqHz?: number;
  funcGenAmpV?: number;
  funcGenOffsetV?: number;
  /** Electrical setpoint card parameters */
  setpointValues?: number[];
  setpointEnabled?: boolean[];
  setpointRamps?: number[];
  setpointMode?: 'wait_time' | 'advance' | 'external';
  setpointSwitchTimeSec?: number;
  /** Inrush current limiter pulse duration in ms (1..10000) */
  inrushDurationMs?: number;
  /** Inrush current limiter threshold in A (0.1..100) */
  currentLimitA?: number;
  /** Timer relay delay in seconds (0.01..100) */
  relayDelaySec?: number;
  /** Preset counter relay target count (0..9999) */
  counterPreset?: number;
  /** Compact inline junction dot created when splitting a pipe mid-segment */
  compactJunction?: boolean;
  /** Per-port hydraulic connection display & plug configuration */
  portConfigs?: Record<string, PortConfig>;
}

export interface CircuitNode {
  id: string;
  type: ComponentType;
  label: string;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  params: ComponentParams;
}

export interface PipeWaypoint {
  x: number;
  y: number;
}

export interface PipeConnection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
  waypoints?: PipeWaypoint[];
}

export interface NodeRuntimeState {
  portPressures: Record<string, number>;
  /** Live flow rate magnitude per port in L/min */
  portFlows?: Record<string, number>;
  /** Cylinder extension 0..1 */
  pistonPos: number;
  /** Cylinder velocity in m/s */
  velocityMs: number;
  /** Force output in N */
  forceN: number;
  /** Flow rate through component in L/min */
  flowLpm: number;
  /** Accumulated total volume in liters for flow meters */
  accumulatedVolumeL?: number;
  /** Motor speed in RPM */
  rpm: number;
  /** Whether relief valve or check valve is currently open */
  isOpen: boolean;
  /** Chamber pressures in bar (for cylinders) */
  chamberAPressure: number;
  chamberBPressure: number;
  /** Effective runtime spool position when electrically/pilot actuated (0, 1, 2) */
  activeSpoolPos?: number;
  /** Memorized spool position from solenoid/mechanical pulse on non-spring (bistable) valves */
  signalSpoolPos?: number;
  /** Whether an electrical solenoid coil or relay coil is energized */
  coilEnergized?: boolean;
  /** Whether an electrical component is carrying live circuit power */
  electrified?: boolean;
}

export interface PipeRuntimeState {
  pressureBar: number;
  flowLpm: number; // positive = from -> to, negative = to -> from
}

export interface SimulationState {
  timeSec: number;
  running: boolean;
  fluid: FluidMedium;
  ambientTempC: number;
  nodes: Record<string, NodeRuntimeState>;
  pipes: Record<string, PipeRuntimeState>;
  maxSystemPressureBar: number;
  totalFlowLpm: number;
  powerKw: number;
}

export interface TelemetryPoint {
  t: number;
  pressureBar: number;
  flowLpm: number;
  extensionPct: number;
}

export interface CircuitProject {
  id: string;
  name: string;
  description: string;
  fluid: FluidMedium;
  nodes: CircuitNode[];
  pipes: PipeConnection[];
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  isPreset?: boolean;
}

export type UserRole = 'admin' | 'engineer' | 'operator';

export interface OfflineUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  saltHex: string;
  passwordHashHex: string;
  active: boolean;
  createdAt: string;
  expiresAt?: string;
  lastLoginAt?: string;
}

export interface AuthSession {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
  signedInAt: string;
  expiresAt: string;
  offlineToken: string;
  licenseTier: 'Community Offline' | 'Industrial Pro';
  /** True when authenticated via an admin-issued Preview Share code/link (never has admin/creation access) */
  isPreviewShare?: boolean;
  previewShareCode?: string;
  previewAccessLevel?: 'full' | 'view';
}

export interface PreviewShareRecord {
  id: string;
  code: string;
  label: string;
  accessLevel: 'full' | 'view';
  expiresAt?: string;
  createdAt: string;
  createdBy: string;
  revoked: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action:
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGOUT'
    | 'WORKSTATION_LOCKED'
    | 'PROJECT_SAVED'
    | 'PROJECT_DELETED'
    | 'PROJECT_EXPORTED'
    | 'PROJECT_IMPORTED'
    | 'USER_CREATED'
    | 'USER_TOGGLED'
    | 'LICENSE_ACTIVATED'
    | 'PREVIEW_SHARE_CREATED'
    | 'PREVIEW_SHARE_REVOKED'
    | 'PREVIEW_ACCESS_GRANTED';
  detail: string;
}
