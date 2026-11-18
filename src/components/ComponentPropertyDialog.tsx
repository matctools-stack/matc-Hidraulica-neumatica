import React, { useEffect, useRef, useState } from 'react';
import { GripHorizontal, X } from 'lucide-react';
import type { CircuitNode, ComponentParams, ComponentType } from '../types/circuit';

interface ComponentPropertyDialogProps {
  node: CircuitNode | null;
  canEdit: boolean;
  isDark: boolean;
  onClose: () => void;
  onApply: (nodeId: string, params: Partial<ComponentParams>) => void;
  onResetAccumulatedFlow?: (nodeId: string) => void;
}

function getPropertyDialogTitle(type: ComponentType): string {
  switch (type) {
    case 'motor':
      return 'Hidromotor';
    case 'rotary_actuator':
      return 'Atuador semi-giratório';
    case 'nozzle':
      return 'Tobera';
    case 'throttle':
      return 'Válvula estranguladora';
    case 'orifice':
      return 'Orifício';
    case 'orifice_adjustable':
      return 'Orifício, ajustável';
    case 'shutoff_valve':
      return 'Válvula de fechamento';
    case 'check_throttle':
      return 'Válvula antirretorno estranguladora';
    case 'check_valve':
      return 'Válvula antirretorno';
    case 'check_valve_spring':
      return 'Válvula antirretorno com mola';
    case 'pilot_check_valve':
      return 'Válvula antirretorno (desbloqueável)';
    case 'pilot_check_spring':
      return 'Válvula de retenção pilotada, pré-carregada por mola';
    case 'pilot_check_close':
      return 'Válvula de retenção com fechamento pilotado';
    case 'pilot_check_close_spring':
      return 'Válvula de retenção com fechamento pilotado, pré-carregada com mola';
    case 'flow_control_2way':
      return 'Válvula direcional de 2 vias reguladora de corrente';
    case 'flow_control_3way':
      return 'Válvula reguladora de corrente de 3 vias';
    case 'shuttle_valve':
      return 'Válvula seletora';
    case 'two_pressure_valve':
      return 'Válvula de simultaneidade';
    case 'flow_divider':
      return 'Válvula distribuidora de corrente';
    case 'relief_valve':
      return 'Válvula limitadora de pressão';
    case 'relief_valve_piloted':
      return 'Válvula limitadora de pressão pré-comandada';
    case 'relief_valve_ext':
      return 'Válvula limitadora de pressão com mola';
    case 'sequence_valve':
      return 'Válvula de desconexão frenado';
    case 'counterbalance_valve':
      return 'Válvula reguladora de pressão de ajuste';
    case 'pressure_reducer_3':
      return 'Válvula direcional de 3 vias redutora de pressão';
    case 'pressure_compensator_c':
      return 'Compensador de pressão fechado ajustável';
    case 'pressure_compensator_d':
      return 'Compensador de pressão de abertura ajustável';
    case 'pressure_reducer_2':
      return 'Válvula reguladora de pressão';
    case 'pressure_compensator':
      return 'Válvula reguladora de pressão fechada';
    case 'pressure_compensator_b':
      return 'Válvula de pressão de abertura';
    case 'cartridge_valve_a':
    case 'cartridge_valve_b':
      return 'Válvula de cartucho de abertura';
    case 'cartridge_valve_c':
      return 'Válvula de cartucho de fechamento';
    case 'prop_valve_4_3':
      return 'Válvula proporcional de 4/3 vias';
    case 'prop_throttle_2_2':
      return 'Válvula estranguladora proporcional 2/2';
    case 'servo_valve_4_3':
      return 'Servoválvula proporcional de 4/3 vias';
    case 'amp_prop_2ch':
    case 'elec_amp_2ch':
      return 'Amplificador proporcional de 2 canais';
    case 'amp_prop_1ch':
    case 'elec_amp_1ch':
      return 'Amplificador proporcional de 1 canal';
    case 'prop_relief':
      return 'Válvula limitadora de pressão proporcional';
    case 'prop_relief_piloted':
      return 'Válvula limitadora de pressão proporcional pilotada';
    case 'prop_pressure_reducer':
      return 'Válvula redutora de pressão proporcional';
    case 'prop_solenoid':
    case 'elec_prop_solenoid':
      return 'Solenoide de válvula proporcional, de posição controlada';
    case 'pressure_indicator':
      return 'Indicador de pressão';
    case 'flow_meter':
      return 'Medidor de vazão';
    case 'flow_meter_analog':
      return 'Medidor de vazão analógico';
    case 'pressure_switch':
    case 'pressure_sensor_elec':
    case 'elec_pressure_switch':
    case 'elec_pressure_transducer':
      return 'Pressostato';
    case 'tachometer_sensor':
    case 'flow_sensor_elec':
    case 'elec_flow_transducer':
      return 'Medidor de caudal';
    case 'elec_dc_motor':
      return 'Motor DC';
    case 'elec_stepper_motor':
      return 'Motor de Passo';
    case 'elec_solenoid_act':
      return 'Solenoide elétrico';
    case 'elec_func_gen':
      return 'Gerador de funções';
    case 'elec_setpoint_card':
      return 'Cartão de valor de consignação';
    case 'elec_relay':
      return 'Relé';
    case 'elec_relay_ton':
      return 'Relé com retardo na ativação';
    case 'elec_relay_toff':
      return 'Relé com retardo na desativação';
    case 'elec_counter_relay':
      return 'Contador-seletor';
    case 'elec_valve_solenoid':
      return 'Solenoide de válvula';
    case 'elec_limiter':
      return 'Limitador de corrente de arranque';
    case 'elec_push_no':
    case 'ladder_push_no':
      return 'Botoeira (Contato NA)';
    case 'elec_push_nc':
    case 'ladder_push_nc':
      return 'Botoeira (Contato NF)';
    case 'elec_switch_no':
      return 'Chave com trava (NA)';
    case 'elec_switch_nc':
      return 'Chave com trava (NF)';
    case 'elec_contact_no':
    case 'ladder_contact_no':
      return 'Contato auxiliar NA (Obturador)';
    case 'elec_contact_nc':
    case 'ladder_contact_nc':
      return 'Contato auxiliar NF (Ruptor)';
    case 'ladder_solenoid':
      return 'Solenoide de válvula (Ladder)';
    case 'ladder_relay':
      return 'Relé auxiliar (Ladder)';
    case 'ladder_relay_sr':
      return 'Relé com retardo na ativação (Ladder)';
    case 'ladder_relay_sa':
      return 'Relé com retardo na desativação (Ladder)';
    default:
      return 'Propriedades do componente';
  }
}

function getPropertyHelpText(type: ComponentType): string {
  switch (type) {
    case 'motor':
      return 'Defina o deslocamento volumétrico por rotação (l ou cm³), o atrito viscoso (N·m·s/rad), o momento de inércia (kg·m²) e o torque de carga externo (Nm).';
    case 'rotary_actuator':
      return 'Configure as marcas de fim de curso, posição inicial (Esquerda ou Direita), ângulo máximo de rotação (1..360°), deslocamento, atrito, inércia e torque externo.';
    case 'throttle':
    case 'orifice_adjustable':
    case 'shutoff_valve':
      return 'Ajuste o grau de abertura (0..100%), habilite a exibição da porcentagem no diagrama e defina o coeficiente de resistência hidráulica R na equação Δp = R · Q².';
    case 'check_throttle':
      return 'Ajuste o grau de abertura na direção estrangulada e as resistências hidráulicas independentes da estrangulação e da válvula de retenção.';
    case 'pilot_check_valve':
    case 'pilot_check_spring':
    case 'pilot_check_close':
    case 'pilot_check_close_spring':
      return 'Defina a relação de área piloto r (1..10), a pressão nominal da mola (nos modelos pré-carregados) e a resistência hidráulica do corpo.';
    case 'flow_control_2way':
    case 'flow_control_3way':
      return 'Configure o caudal nominal regulado (0.01..500 l/min) e a resistência hidráulica mínima com válvula totalmente aberta.';
    case 'relief_valve':
    case 'relief_valve_piloted':
    case 'relief_valve_ext':
    case 'sequence_valve':
    case 'counterbalance_valve':
    case 'pressure_reducer_2':
    case 'pressure_reducer_3':
    case 'pressure_compensator':
    case 'pressure_compensator_b':
    case 'pressure_compensator_c':
    case 'pressure_compensator_d':
      return 'Ajuste a pressão nominal de abertura/regulação (MPa ou bar) e o coeficiente de resistência hidráulica R na equação Δp = R · Q².';
    case 'cartridge_valve_a':
    case 'cartridge_valve_b':
      return 'Escolha entre uma ou duas áreas ativas (A e B), defina as áreas em qcm ou mm², a pressão nominal da mola (0..1 MPa) e a resistência hidráulica.';
    case 'cartridge_valve_c':
      return 'Defina a área ativa (qcm ou mm²), a pressão nominal da mola (0..1 MPa) e o coeficiente de resistência hidráulica da válvula de cartucho de fechamento.';
    case 'prop_valve_4_3':
    case 'prop_throttle_2_2':
    case 'servo_valve_4_3':
      return 'Configure a resistência hidráulica, o perfil da borda de controle da corrediça (Retangular ou Triangular), a sobreposição relativa (-30..30%) e as fugas internas.';
    case 'amp_prop_2ch':
    case 'elec_amp_2ch':
      return 'Defina as marcas de ligação para Porta A e Porta B e a corrente de salto inicial (0..25%) do amplificador proporcional de 2 canais.';
    case 'amp_prop_1ch':
    case 'elec_amp_1ch':
      return 'Defina a marca de ligação e a corrente de salto inicial (0..25%) do amplificador proporcional de 1 canal.';
    case 'prop_relief':
    case 'prop_relief_piloted':
    case 'prop_pressure_reducer':
      return 'Defina a faixa de pressão nominal (Mín. e Máx. em MPa ou bar) e a resistência hidráulica característica Δp = R · Q².';
    case 'prop_solenoid':
    case 'elec_prop_solenoid':
      return 'Defina a marca de identificação do solenoide proporcional de posição controlada associado à válvula hidráulica.';
    case 'pressure_indicator':
      return 'Defina a pressão de comutação (MPa ou bar) e a cor do sinal óptico exibido quando a pressão atingir o limiar configurado.';
    case 'flow_meter':
    case 'flow_meter_analog':
      return 'Escolha entre exibir Vazão instantânea ou Vazão acumulada (clique em Restabelecer para zerar o totalizador) e configure a resistência hidráulica Δp = R · Q².';
    case 'pressure_switch':
    case 'pressure_sensor_elec':
    case 'elec_pressure_switch':
    case 'elec_pressure_transducer':
      return 'Ajuste a pressão de comutação (0.0001..35 MPa) e a marca elétrica associada aos contatos do circuito de comando.';
    case 'tachometer_sensor':
    case 'flow_sensor_elec':
    case 'elec_flow_transducer':
      return 'Configure o deslocamento volumétrico por rotação, o atrito, o momento de inércia e o torque externo do medidor de caudal rotativo.';
    case 'elec_dc_motor':
    case 'elec_stepper_motor':
      return 'Defina a velocidade de rotação em vazio (1/min ou 1/s) e o torque de carga aplicado no eixo (Nm ou mNm).';
    case 'elec_solenoid_act':
      return 'Configure a marca de identificação elétrica do atuador solenoide.';
    case 'elec_func_gen':
      return 'Selecione o formato de onda (Constante, Retângulo, Seno, Triângulo ou Perfil de tensão) e ajuste Frequência (Hz), Amplitude (V) e Deslocamento y (V).';
    case 'elec_setpoint_card':
      return 'Habilite até 8 pontos de consignação (W1..W8 em -10..10 V), defina os tempos de rampa R1..R4 e o modo de comutação.';
    case 'elec_relay':
      return 'Defina a marca de identificação da bobina do relé associada aos contatos auxiliares do circuito elétrico.';
    case 'elec_relay_ton':
    case 'elec_relay_toff':
      return 'Ajuste o tempo de retardo do relé temporizador (0.01..100 s) e a marca associada aos seus contatos.';
    case 'elec_counter_relay':
      return 'Defina o valor de pré-seleção de pulsos (0..9999) e a marca de identificação do contador-seletor.';
    case 'elec_valve_solenoid':
      return 'Defina a marca de identificação do solenoide que aciona a válvula direcional pneumática ou hidráulica correspondente.';
    case 'elec_limiter':
      return 'Configure a duração do pulso de partida (1..10000 ms) e o limite máximo de corrente (0.1..100 A) do limitador de corrente de arranque.';
    default:
      return 'Defina o coeficiente de resistência hidráulica R na equação Δp = R · Q² e visualize a curva característica clicando em Curva...';
  }
}

function getDefaultResistance(type: ComponentType): number {
  switch (type) {
    case 'throttle':
      return 0.045;
    case 'shutoff_valve':
      return 0.0625;
    case 'flow_control_2way':
    case 'flow_control_3way':
      return 0.019;
    case 'cartridge_valve_a':
    case 'cartridge_valve_b':
    case 'cartridge_valve_c':
      return 0.001;
    case 'flow_meter':
    case 'flow_meter_analog':
    case 'flow_sensor_elec':
      return 0.0001;
    case 'prop_valve_4_3':
    case 'prop_throttle_2_2':
    case 'servo_valve_4_3':
      return 0.32;
    default:
      return 0.01;
  }
}

const PRESSURE_SLIDER_TYPES = new Set<ComponentType>([
  'relief_valve',
  'relief_valve_piloted',
  'relief_valve_ext',
  'sequence_valve',
  'counterbalance_valve',
  'pressure_reducer_3',
  'pressure_compensator_c',
  'pressure_compensator_d',
]);

const PRESSURE_NOSLIDER_TYPES = new Set<ComponentType>([
  'pressure_reducer_2',
  'pressure_compensator',
  'pressure_compensator_b',
]);

const PROP_SPOOL_VALVE_TYPES = new Set<ComponentType>([
  'prop_valve_4_3',
  'prop_throttle_2_2',
  'servo_valve_4_3',
]);

const PROP_PRESSURE_RANGE_TYPES = new Set<ComponentType>([
  'prop_relief',
  'prop_relief_piloted',
  'prop_pressure_reducer',
]);

const PRESSURE_SWITCH_TYPES = new Set<ComponentType>([
  'pressure_switch',
  'pressure_sensor_elec',
  'elec_pressure_switch',
  'elec_pressure_transducer',
]);

const FLOW_CAUDAL_TYPES = new Set<ComponentType>([
  'tachometer_sensor',
  'flow_sensor_elec',
  'elec_flow_transducer',
]);

const ELEC_MARK_TYPES = new Set<ComponentType>([
  'elec_push_no',
  'elec_push_nc',
  'elec_switch_no',
  'elec_switch_nc',
  'elec_contact_no',
  'elec_contact_nc',
  'ladder_push_no',
  'ladder_push_nc',
  'ladder_contact_no',
  'ladder_contact_nc',
  'ladder_solenoid',
  'ladder_relay',
  'ladder_relay_sr',
  'ladder_relay_sa',
]);

const SIGNAL_COLORS = [
  { hex: '#800000', label: 'Vermelho escuro' },
  { hex: '#DC2626', label: 'Vermelho' },
  { hex: '#EA580C', label: 'Laranja' },
  { hex: '#EAB308', label: 'Amarelo' },
  { hex: '#16A34A', label: 'Verde' },
  { hex: '#0EA5E9', label: 'Azul claro' },
  { hex: '#2563EB', label: 'Azul' },
  { hex: '#7C3AED', label: 'Violeta' },
];

export const ComponentPropertyDialog: React.FC<ComponentPropertyDialogProps> = ({
  node,
  canEdit,
  isDark,
  onClose,
  onApply,
  onResetAccumulatedFlow,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [curveTarget, setCurveTarget] = useState<'none' | 'primary' | 'check'>('none');

  // Unit selectors
  const [dispUnit, setDispUnit] = useState<'l' | 'cm3'>('l');
  const [pressureUnit, setPressureUnit] = useState<'MPa' | 'bar'>('MPa');
  const [resUnit, setResUnit] = useState<'mpa' | 'bar'>('mpa');
  const [checkResUnit, setCheckResUnit] = useState<'mpa' | 'bar'>('mpa');
  const [speedUnit, setSpeedUnit] = useState<'rpm' | 'rps'>('rpm');
  const [motorTorqueUnit, setMotorTorqueUnit] = useState<'Nm' | 'mNm'>('Nm');

  // Form states
  const [dispVal, setDispVal] = useState('0.0082');
  const [frictionVal, setFrictionVal] = useState('0.0128');
  const [inertiaVal, setInertiaVal] = useState('0.0001');
  const [torqueVal, setTorqueVal] = useState('0');

  // Rotary actuator specific
  const [markPrimary, setMarkPrimary] = useState('');
  const [markSecondary, setMarkSecondary] = useState('');
  const [rotaryInitialPos, setRotaryInitialPos] = useState<'left' | 'right'>('left');
  const [angleDegVal, setAngleDegVal] = useState('180');

  // Opening & resistance
  const [openingVal, setOpeningVal] = useState(100);
  const [showOpeningBadge, setShowOpeningBadge] = useState(false);
  const [resVal, setResVal] = useState('0.01');
  const [checkResVal, setCheckResVal] = useState('0.01');

  // Pilot check & spring pressure & area ratio
  const [pressureVal, setPressureVal] = useState('0.1');
  const [areaRatioVal, setAreaRatioVal] = useState('5');

  // Flow control nominal flow
  const [nominalFlowVal, setNominalFlowVal] = useState(1);

  // Cartridge valve specific states
  const [cartridgeMode, setCartridgeMode] = useState<'one_area' | 'two_areas'>('two_areas');
  const [areaAVal, setAreaAVal] = useState('6');
  const [areaAUnit, setAreaAUnit] = useState<'qcm' | 'mm2'>('qcm');
  const [areaBVal, setAreaBVal] = useState('3');
  const [areaBUnit, setAreaBUnit] = useState<'qcm' | 'mm2'>('qcm');

  // Proportional & continuous component states
  const [spoolEdgeShape, setSpoolEdgeShape] = useState<'rectangular' | 'triangular'>('triangular');
  const [spoolOverlapVal, setSpoolOverlapVal] = useState('25');
  const [internalLeakageVal, setInternalLeakageVal] = useState('0.01');
  const [jumpCurrentVal, setJumpCurrentVal] = useState('0');
  const [minPressureVal, setMinPressureVal] = useState('0');
  const [minPressureUnit, setMinPressureUnit] = useState<'MPa' | 'bar'>('MPa');

  // Pressure indicator & Flow meters
  const [signalColor, setSignalColor] = useState('#800000');
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [flowDisplayMode, setFlowDisplayMode] = useState<'instantaneous' | 'accumulated'>('instantaneous');
  const [flowResetNotice, setFlowResetNotice] = useState(false);

  // Electrical DC / Stepper motor & Function generator & Setpoint card
  const [noLoadRpmVal, setNoLoadRpmVal] = useState('75');
  const [funcGenWaveform, setFuncGenWaveform] = useState<'constant' | 'square' | 'sine' | 'triangle' | 'profile'>('sine');
  const [funcGenFreqVal, setFuncGenFreqVal] = useState(1);
  const [funcGenAmpVal, setFuncGenAmpVal] = useState(10);
  const [funcGenOffsetVal, setFuncGenOffsetVal] = useState(0);
  const [showProfileNote, setShowProfileNote] = useState(false);

  const [setpointValues, setSetpointValues] = useState<string[]>(Array(8).fill('0'));
  const [setpointEnabled, setSetpointEnabled] = useState<boolean[]>([
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
  ]);
  const [setpointRamps, setSetpointRamps] = useState<string[]>(Array(4).fill('0'));
  const [setpointMode, setSetpointMode] = useState<'wait_time' | 'advance' | 'external'>('wait_time');
  const [setpointTimeVal, setSetpointTimeVal] = useState('1');

  // Relays, Counter & Starting Current Limiter
  const [inrushDurationVal, setInrushDurationVal] = useState('100');
  const [currentLimitVal, setCurrentLimitVal] = useState('2');
  const [relayDelayVal, setRelayDelayVal] = useState('5');
  const [counterPresetVal, setCounterPresetVal] = useState('5');

  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 220, y: 120 };
    return {
      x: Math.max(12, Math.round((window.innerWidth - 460) / 2)),
      y: Math.max(12, Math.round((window.innerHeight - 360) / 2)),
    };
  });

  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  useEffect(() => {
    if (!node) return;
    setShowHelp(false);
    setCurveTarget('none');
    setDispUnit('l');
    setPressureUnit('MPa');
    setMinPressureUnit('MPa');
    setResUnit('mpa');
    setCheckResUnit('mpa');
    setAreaAUnit('qcm');
    setAreaBUnit('qcm');
    setSpeedUnit('rpm');
    setMotorTorqueUnit('Nm');
    setColorPickerOpen(false);
    setFlowResetNotice(false);
    setShowProfileNote(false);

    const p = node.params;
    const defR = getDefaultResistance(node.type);
    setResVal(String(p.hydraulicResistance ?? defR));
    setCheckResVal(String(p.checkValveResistance ?? 0.01));

    if (node.type === 'motor' || FLOW_CAUDAL_TYPES.has(node.type)) {
      const dL =
        p.displacementL !== undefined
          ? p.displacementL
          : p.displacementCc !== undefined
            ? Number((p.displacementCc / 1000).toFixed(5))
            : 0.0082;
      setDispVal(String(dL));
      setFrictionVal(String(p.frictionCoeff ?? 0.0128));
      setInertiaVal(String(p.inertiaKgM2 ?? 0.0001));
      setTorqueVal(String(p.loadNm ?? 0));
    } else if (node.type === 'rotary_actuator') {
      setMarkPrimary(p.sensingMark ?? '');
      setMarkSecondary(p.secondaryMark ?? '');
      setRotaryInitialPos(p.rotaryInitialPos ?? 'left');
      setAngleDegVal(String(p.strokeMm ?? 180));
      setDispVal(String(p.displacementL ?? 0.1));
      setFrictionVal(String(p.frictionCoeff ?? 0.1));
      setInertiaVal(String(p.inertiaKgM2 ?? 0.001));
      setTorqueVal(String(p.loadNm ?? 0));
    } else if (
      node.type === 'throttle' ||
      node.type === 'orifice_adjustable' ||
      node.type === 'shutoff_valve' ||
      node.type === 'check_throttle'
    ) {
      const defOpen = node.type === 'shutoff_valve' ? 100 : p.opening ?? 100;
      setOpeningVal(p.opening ?? defOpen);
      setShowOpeningBadge(
        p.showOpeningBadge ?? (node.type === 'shutoff_valve' ? false : true)
      );
    } else if (
      node.type === 'pilot_check_valve' ||
      node.type === 'pilot_check_spring' ||
      node.type === 'pilot_check_close' ||
      node.type === 'pilot_check_close_spring'
    ) {
      const defaultRatio = node.type === 'pilot_check_spring' ? 3.3 : 5;
      setAreaRatioVal(String(p.areaRatio ?? defaultRatio));
      const crackBar = p.crackingPressure ?? 1.0; // 0.1 MPa = 1 bar
      setPressureVal(String(Number((crackBar / 10).toFixed(4))));
    } else if (node.type === 'flow_control_2way' || node.type === 'flow_control_3way') {
      setNominalFlowVal(p.nominalFlowLpm ?? 1);
    } else if (PRESSURE_SLIDER_TYPES.has(node.type) || PRESSURE_NOSLIDER_TYPES.has(node.type)) {
      const fallbackBar = PRESSURE_NOSLIDER_TYPES.has(node.type) ? 10 : 50;
      const barVal =
        node.type === 'pressure_reducer_2' ||
        node.type === 'pressure_reducer_3' ||
        node.type === 'pressure_compensator'
          ? (p.targetPressure ?? p.crackingPressure ?? fallbackBar)
          : (p.crackingPressure ?? p.targetPressure ?? fallbackBar);
      const minBar = PRESSURE_NOSLIDER_TYPES.has(node.type) ? 0.1 : 0;
      const clampedBar = Math.min(400, Math.max(minBar, barVal));
      setPressureVal(String(Number((clampedBar / 10).toFixed(4))));
    } else if (
      node.type === 'cartridge_valve_a' ||
      node.type === 'cartridge_valve_b' ||
      node.type === 'cartridge_valve_c'
    ) {
      setCartridgeMode(p.cartridgeAreaMode ?? 'two_areas');
      setAreaAVal(String(p.cartridgeAreaACm2 ?? 6));
      setAreaBVal(String(p.cartridgeAreaBCm2 ?? 3));
      const crackBar = Math.min(10, Math.max(0, p.crackingPressure ?? 1));
      setPressureVal(String(Number((crackBar / 10).toFixed(4))));
    } else if (PROP_SPOOL_VALVE_TYPES.has(node.type)) {
      setSpoolEdgeShape(p.spoolEdgeShape ?? 'triangular');
      setSpoolOverlapVal(String(p.spoolOverlapPct ?? 25));
      setInternalLeakageVal(String(p.internalLeakage ?? 0.01));
    } else if (
      node.type === 'amp_prop_2ch' ||
      node.type === 'amp_prop_1ch' ||
      node.type === 'elec_amp_2ch' ||
      node.type === 'elec_amp_1ch'
    ) {
      setMarkPrimary(p.sensingMark ?? '');
      setMarkSecondary(p.secondaryMark ?? '');
      setJumpCurrentVal(String(p.jumpCurrentPct ?? 0));
    } else if (PROP_PRESSURE_RANGE_TYPES.has(node.type)) {
      const minBar = Math.min(10, Math.max(0, p.minPressureBar ?? 0));
      const maxBar = Math.min(
        400,
        Math.max(
          1,
          node.type === 'prop_pressure_reducer'
            ? (p.targetPressure ?? p.crackingPressure ?? 100)
            : (p.crackingPressure ?? p.targetPressure ?? 100)
        )
      );
      setMinPressureVal(String(Number((minBar / 10).toFixed(4))));
      setPressureVal(String(Number((maxBar / 10).toFixed(4))));
    } else if (
      node.type === 'prop_solenoid' ||
      node.type === 'elec_prop_solenoid' ||
      node.type === 'elec_solenoid_act' ||
      node.type === 'elec_valve_solenoid' ||
      node.type === 'elec_relay'
    ) {
      setMarkPrimary(p.sensingMark ?? '');
    } else if (node.type === 'elec_relay_ton' || node.type === 'elec_relay_toff') {
      setRelayDelayVal(String(p.relayDelaySec ?? 5));
      setMarkPrimary(p.sensingMark ?? '');
    } else if (node.type === 'elec_counter_relay') {
      setCounterPresetVal(String(p.counterPreset ?? 5));
      setMarkPrimary(p.sensingMark ?? '');
    } else if (node.type === 'elec_limiter') {
      setInrushDurationVal(String(p.inrushDurationMs ?? 100));
      setCurrentLimitVal(String(p.currentLimitA ?? 2));
    } else if (ELEC_MARK_TYPES.has(node.type)) {
      setMarkPrimary(p.sensingMark ?? '');
      if (node.type === 'ladder_relay_sr' || node.type === 'ladder_relay_sa') {
        setRelayDelayVal(String(p.relayDelaySec ?? 5));
      }
    } else if (node.type === 'pressure_indicator') {
      const pBar = Math.min(400, Math.max(0.001, p.crackingPressure ?? 30));
      setPressureVal(String(Number((pBar / 10).toFixed(4))));
      setSignalColor(p.signalColor ?? '#800000');
    } else if (node.type === 'flow_meter' || node.type === 'flow_meter_analog') {
      setFlowDisplayMode(
        p.flowDisplayMode ?? (node.type === 'flow_meter_analog' ? 'accumulated' : 'instantaneous')
      );
    } else if (PRESSURE_SWITCH_TYPES.has(node.type)) {
      const pBar = Math.min(350, Math.max(0.001, p.crackingPressure ?? 30));
      setPressureVal(String(Number((pBar / 10).toFixed(4))));
      setMarkPrimary(p.sensingMark ?? '');
    } else if (node.type === 'elec_dc_motor' || node.type === 'elec_stepper_motor') {
      setNoLoadRpmVal(String(p.noLoadRpm ?? 75));
      setTorqueVal(String(p.loadNm ?? 0));
    } else if (node.type === 'elec_func_gen') {
      setFuncGenWaveform(p.funcGenWaveform ?? 'sine');
      setFuncGenFreqVal(p.funcGenFreqHz ?? 1);
      setFuncGenAmpVal(p.funcGenAmpV ?? 10);
      setFuncGenOffsetVal(p.funcGenOffsetV ?? 0);
    } else if (node.type === 'elec_setpoint_card') {
      const vals = p.setpointValues ?? [];
      setSetpointValues(Array.from({ length: 8 }, (_, idx) => String(vals[idx] ?? 0)));
      const en = p.setpointEnabled ?? [];
      setSetpointEnabled(
        Array.from({ length: 8 }, (_, idx) => (idx === 0 ? true : Boolean(en[idx])))
      );
      const ramps = p.setpointRamps ?? [];
      setSetpointRamps(Array.from({ length: 4 }, (_, idx) => String(ramps[idx] ?? 0)));
      setSetpointMode(p.setpointMode ?? 'wait_time');
      setSetpointTimeVal(String(p.setpointSwitchTimeSec ?? 1));
    }

    if (typeof window !== 'undefined') {
      const dlgW = Math.min(540, window.innerWidth - 24);
      const dlgH = Math.min(
        node.type === 'rotary_actuator' || node.type === 'elec_func_gen' ? 520 : 440,
        window.innerHeight - 24
      );
      setPos({
        x: Math.max(12, Math.round((window.innerWidth - dlgW) / 2)),
        y: Math.max(12, Math.round((window.innerHeight - dlgH) / 2)),
      });
    }
  }, [node]);

  if (!node) return null;

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
  };

  const handleHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const w = panelRef.current?.offsetWidth ?? 460;
    const h = panelRef.current?.offsetHeight ?? 320;
    const nx = dragRef.current.origX + (e.clientX - dragRef.current.startX);
    const ny = dragRef.current.origY + (e.clientY - dragRef.current.startY);
    setPos({
      x: Math.min(Math.max(8, nx), Math.max(8, window.innerWidth - w - 8)),
      y: Math.min(Math.max(8, ny), Math.max(8, window.innerHeight - h - 8)),
    });
  };

  const handleHeaderPointerUp = () => {
    dragRef.current = null;
  };

  const switchDispUnit = (nextUnit: 'l' | 'cm3') => {
    if (nextUnit === dispUnit) return;
    const num = Number.parseFloat(dispVal);
    if (Number.isFinite(num)) {
      setDispVal(
        nextUnit === 'cm3'
          ? String(Number((num * 1000).toFixed(3)))
          : String(Number((num / 1000).toFixed(5)))
      );
    }
    setDispUnit(nextUnit);
  };

  const switchPressureUnit = (nextUnit: 'MPa' | 'bar') => {
    if (nextUnit === pressureUnit) return;
    const num = Number.parseFloat(pressureVal);
    if (Number.isFinite(num)) {
      setPressureVal(
        nextUnit === 'bar'
          ? String(Number((num * 10).toFixed(3)))
          : String(Number((num / 10).toFixed(4)))
      );
    }
    setPressureUnit(nextUnit);
  };

  const switchMinPressureUnit = (nextUnit: 'MPa' | 'bar') => {
    if (nextUnit === minPressureUnit) return;
    const num = Number.parseFloat(minPressureVal);
    if (Number.isFinite(num)) {
      setMinPressureVal(
        nextUnit === 'bar'
          ? String(Number((num * 10).toFixed(3)))
          : String(Number((num / 10).toFixed(4)))
      );
    }
    setMinPressureUnit(nextUnit);
  };

  const switchResUnit = (nextUnit: 'mpa' | 'bar', which: 'primary' | 'check') => {
    if (which === 'primary') {
      if (nextUnit === resUnit) return;
      const num = Number.parseFloat(resVal);
      if (Number.isFinite(num)) {
        setResVal(
          nextUnit === 'bar'
            ? String(Number((num * 10).toPrecision(5)))
            : String(Number((num / 10).toPrecision(5)))
        );
      }
      setResUnit(nextUnit);
    } else {
      if (nextUnit === checkResUnit) return;
      const num = Number.parseFloat(checkResVal);
      if (Number.isFinite(num)) {
        setCheckResVal(
          nextUnit === 'bar'
            ? String(Number((num * 10).toPrecision(5)))
            : String(Number((num / 10).toPrecision(5)))
        );
      }
      setCheckResUnit(nextUnit);
    }
  };

  const switchAreaUnit = (nextUnit: 'qcm' | 'mm2', which: 'A' | 'B') => {
    if (which === 'A') {
      if (nextUnit === areaAUnit) return;
      const num = Number.parseFloat(areaAVal);
      if (Number.isFinite(num)) {
        setAreaAVal(
          nextUnit === 'mm2'
            ? String(Number((num * 100).toFixed(2)))
            : String(Number((num / 100).toFixed(4)))
        );
      }
      setAreaAUnit(nextUnit);
    } else {
      if (nextUnit === areaBUnit) return;
      const num = Number.parseFloat(areaBVal);
      if (Number.isFinite(num)) {
        setAreaBVal(
          nextUnit === 'mm2'
            ? String(Number((num * 100).toFixed(2)))
            : String(Number((num / 100).toFixed(4)))
        );
      }
      setAreaBUnit(nextUnit);
    }
  };

  const switchSpeedUnit = (nextUnit: 'rpm' | 'rps') => {
    if (nextUnit === speedUnit) return;
    const num = Number.parseFloat(noLoadRpmVal);
    if (Number.isFinite(num)) {
      setNoLoadRpmVal(
        nextUnit === 'rps'
          ? String(Number((num / 60).toFixed(2)))
          : String(Number((num * 60).toFixed(1)))
      );
    }
    setSpeedUnit(nextUnit);
  };

  const switchMotorTorqueUnit = (nextUnit: 'Nm' | 'mNm') => {
    if (nextUnit === motorTorqueUnit) return;
    const num = Number.parseFloat(torqueVal);
    if (Number.isFinite(num)) {
      setTorqueVal(
        nextUnit === 'mNm'
          ? String(Number((num * 1000).toFixed(1)))
          : String(Number((num / 1000).toFixed(4)))
      );
    }
    setMotorTorqueUnit(nextUnit);
  };

  const parseResistanceMpa = (raw: string, unit: 'mpa' | 'bar', fallback: number): number => {
    const val = Number.parseFloat(raw);
    const mpa = Number.isFinite(val) ? (unit === 'bar' ? val / 10 : val) : fallback;
    return Math.min(100, Math.max(1e-7, mpa));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      onClose();
      return;
    }

    const defR = getDefaultResistance(node.type);
    const hydraulicResistance = parseResistanceMpa(resVal, resUnit, defR);

    if (node.type === 'motor' || FLOW_CAUDAL_TYPES.has(node.type)) {
      const rawD = Number.parseFloat(dispVal);
      const dL = Number.isFinite(rawD) ? (dispUnit === 'cm3' ? rawD / 1000 : rawD) : 0.0082;
      const displacementL = Math.min(5, Math.max(0.001, Number(dL.toFixed(5))));
      const displacementCc = Number((displacementL * 1000).toFixed(2));
      const frictionCoeff = Math.min(100, Math.max(0.001, Number.parseFloat(frictionVal) || 0.0128));
      const inertiaKgM2 = Math.min(1, Math.max(0.0001, Number.parseFloat(inertiaVal) || 0.0001));
      const loadNm = Math.min(1000, Math.max(-1000, Number.parseFloat(torqueVal) || 0));
      onApply(node.id, {
        displacementL,
        displacementCc,
        frictionCoeff,
        inertiaKgM2,
        loadNm,
      });
    } else if (node.type === 'rotary_actuator') {
      const strokeMm = Math.min(360, Math.max(1, Math.round(Number.parseFloat(angleDegVal) || 180)));
      const rawD = Number.parseFloat(dispVal);
      const dL = Number.isFinite(rawD) ? (dispUnit === 'cm3' ? rawD / 1000 : rawD) : 0.1;
      const displacementL = Math.min(5, Math.max(0.001, Number(dL.toFixed(5))));
      const frictionCoeff = Math.min(100, Math.max(0.01, Number.parseFloat(frictionVal) || 0.1));
      const inertiaKgM2 = Math.min(1, Math.max(0.0001, Number.parseFloat(inertiaVal) || 0.001));
      const loadNm = Math.min(1000, Math.max(-1000, Number.parseFloat(torqueVal) || 0));
      onApply(node.id, {
        sensingMark: markPrimary.trim(),
        secondaryMark: markSecondary.trim(),
        rotaryInitialPos,
        strokeMm,
        displacementL,
        frictionCoeff,
        inertiaKgM2,
        loadNm,
      });
    } else if (
      node.type === 'throttle' ||
      node.type === 'orifice_adjustable' ||
      node.type === 'shutoff_valve'
    ) {
      const opening = Math.min(100, Math.max(0, Math.round(openingVal)));
      onApply(node.id, {
        opening,
        active: node.type === 'shutoff_valve' ? opening > 0 : node.params.active,
        showOpeningBadge,
        hydraulicResistance,
      });
    } else if (node.type === 'check_throttle') {
      const opening = Math.min(100, Math.max(0, Math.round(openingVal)));
      const checkValveResistance = parseResistanceMpa(checkResVal, checkResUnit, 0.01);
      onApply(node.id, {
        opening,
        showOpeningBadge,
        hydraulicResistance,
        checkValveResistance,
      });
    } else if (
      node.type === 'pilot_check_valve' ||
      node.type === 'pilot_check_spring' ||
      node.type === 'pilot_check_close' ||
      node.type === 'pilot_check_close_spring'
    ) {
      const areaRatio = Math.min(10, Math.max(1, Number.parseFloat(areaRatioVal) || 5));
      const hasSpring =
        node.type === 'pilot_check_spring' || node.type === 'pilot_check_close_spring';
      if (hasSpring) {
        const rawP = Number.parseFloat(pressureVal);
        const pBar = Number.isFinite(rawP) ? (pressureUnit === 'MPa' ? rawP * 10 : rawP) : 1.0;
        const crackingPressure = Math.min(400, Math.max(0.01, Number(pBar.toFixed(2))));
        onApply(node.id, { areaRatio, crackingPressure, hydraulicResistance });
      } else {
        onApply(node.id, { areaRatio, hydraulicResistance });
      }
    } else if (node.type === 'flow_control_2way' || node.type === 'flow_control_3way') {
      const nominalFlowLpm = Math.min(500, Math.max(0.01, Number(nominalFlowVal) || 1));
      const opening = Math.min(100, Math.max(5, Math.round(Math.min(100, (nominalFlowLpm / 50) * 100))));
      onApply(node.id, {
        nominalFlowLpm,
        opening,
        hydraulicResistance,
      });
    } else if (PRESSURE_SLIDER_TYPES.has(node.type) || PRESSURE_NOSLIDER_TYPES.has(node.type)) {
      const rawP = Number.parseFloat(pressureVal);
      const minBar = PRESSURE_NOSLIDER_TYPES.has(node.type) ? 0.1 : 0;
      const fallbackBar = PRESSURE_NOSLIDER_TYPES.has(node.type) ? 10 : 50;
      const pBar = Number.isFinite(rawP) ? (pressureUnit === 'MPa' ? rawP * 10 : rawP) : fallbackBar;
      const clampedBar = Math.min(400, Math.max(minBar, Number(pBar.toFixed(3))));
      if (
        node.type === 'pressure_reducer_2' ||
        node.type === 'pressure_reducer_3' ||
        node.type === 'pressure_compensator'
      ) {
        onApply(node.id, {
          targetPressure: clampedBar,
          crackingPressure: clampedBar,
          hydraulicResistance,
        });
      } else {
        onApply(node.id, {
          crackingPressure: clampedBar,
          hydraulicResistance,
        });
      }
    } else if (node.type === 'cartridge_valve_a' || node.type === 'cartridge_valve_b') {
      const rawA = Number.parseFloat(areaAVal);
      const aCm2 = Number.isFinite(rawA) ? (areaAUnit === 'mm2' ? rawA / 100 : rawA) : 6;
      const cartridgeAreaACm2 = Math.min(100, Math.max(1, Number(aCm2.toFixed(4))));

      const rawB = Number.parseFloat(areaBVal);
      const bCm2 = Number.isFinite(rawB) ? (areaBUnit === 'mm2' ? rawB / 100 : rawB) : 3;
      const cartridgeAreaBCm2 =
        cartridgeMode === 'one_area'
          ? 0
          : Math.min(100, Math.max(0, Number(bCm2.toFixed(4))));

      const rawP = Number.parseFloat(pressureVal);
      const pBar = Number.isFinite(rawP) ? (pressureUnit === 'MPa' ? rawP * 10 : rawP) : 1;
      const crackingPressure = Math.min(10, Math.max(0, Number(pBar.toFixed(3))));

      onApply(node.id, {
        cartridgeAreaMode: cartridgeMode,
        cartridgeAreaACm2,
        cartridgeAreaBCm2,
        crackingPressure,
        hydraulicResistance,
      });
    } else if (node.type === 'cartridge_valve_c') {
      const rawA = Number.parseFloat(areaAVal);
      const aCm2 = Number.isFinite(rawA) ? (areaAUnit === 'mm2' ? rawA / 100 : rawA) : 6;
      const cartridgeAreaACm2 = Math.min(100, Math.max(1, Number(aCm2.toFixed(4))));

      const rawP = Number.parseFloat(pressureVal);
      const pBar = Number.isFinite(rawP) ? (pressureUnit === 'MPa' ? rawP * 10 : rawP) : 1;
      const crackingPressure = Math.min(10, Math.max(0, Number(pBar.toFixed(3))));

      onApply(node.id, {
        cartridgeAreaACm2,
        crackingPressure,
        hydraulicResistance,
      });
    } else if (PROP_SPOOL_VALVE_TYPES.has(node.type)) {
      const rawOverlap = Number.parseFloat(spoolOverlapVal);
      const spoolOverlapPct = Number.isFinite(rawOverlap)
        ? Math.min(30, Math.max(-30, Number(rawOverlap.toFixed(2))))
        : 25;
      const rawLeak = Number.parseFloat(internalLeakageVal);
      const internalLeakage = Number.isFinite(rawLeak)
        ? Math.min(100, Math.max(0, Number(rawLeak.toFixed(4))))
        : 0.01;
      onApply(node.id, {
        hydraulicResistance,
        spoolEdgeShape,
        spoolOverlapPct,
        internalLeakage,
      });
    } else if (node.type === 'amp_prop_2ch' || node.type === 'elec_amp_2ch') {
      const rawJump = Number.parseFloat(jumpCurrentVal);
      const jumpCurrentPct = Number.isFinite(rawJump)
        ? Math.min(25, Math.max(0, Number(rawJump.toFixed(2))))
        : 0;
      onApply(node.id, {
        sensingMark: markPrimary.trim(),
        secondaryMark: markSecondary.trim(),
        jumpCurrentPct,
      });
    } else if (node.type === 'amp_prop_1ch' || node.type === 'elec_amp_1ch') {
      const rawJump = Number.parseFloat(jumpCurrentVal);
      const jumpCurrentPct = Number.isFinite(rawJump)
        ? Math.min(25, Math.max(0, Number(rawJump.toFixed(2))))
        : 0;
      onApply(node.id, {
        sensingMark: markPrimary.trim(),
        jumpCurrentPct,
      });
    } else if (PROP_PRESSURE_RANGE_TYPES.has(node.type)) {
      const rawMin = Number.parseFloat(minPressureVal);
      const minBarRaw = Number.isFinite(rawMin)
        ? (minPressureUnit === 'MPa' ? rawMin * 10 : rawMin)
        : 0;
      const minPressureBar = Math.min(10, Math.max(0, Number(minBarRaw.toFixed(3))));

      const rawMax = Number.parseFloat(pressureVal);
      const maxBarRaw = Number.isFinite(rawMax)
        ? (pressureUnit === 'MPa' ? rawMax * 10 : rawMax)
        : 100;
      const maxPressureBar = Math.min(
        400,
        Math.max(Math.max(1, minPressureBar), Number(maxBarRaw.toFixed(3)))
      );

      if (node.type === 'prop_pressure_reducer') {
        onApply(node.id, {
          minPressureBar,
          targetPressure: maxPressureBar,
          crackingPressure: maxPressureBar,
          hydraulicResistance,
        });
      } else {
        onApply(node.id, {
          minPressureBar,
          crackingPressure: maxPressureBar,
          hydraulicResistance,
        });
      }
    } else if (
      node.type === 'prop_solenoid' ||
      node.type === 'elec_prop_solenoid' ||
      node.type === 'elec_solenoid_act' ||
      node.type === 'elec_valve_solenoid' ||
      node.type === 'elec_relay'
    ) {
      onApply(node.id, {
        sensingMark: markPrimary.trim(),
      });
    } else if (node.type === 'elec_relay_ton' || node.type === 'elec_relay_toff') {
      const rawDelay = Number.parseFloat(relayDelayVal);
      const relayDelaySec = Number.isFinite(rawDelay)
        ? Math.min(100, Math.max(0.01, Number(rawDelay.toFixed(2))))
        : 5;
      onApply(node.id, {
        relayDelaySec,
        sensingMark: markPrimary.trim(),
      });
    } else if (node.type === 'elec_counter_relay') {
      const rawCount = Number.parseInt(counterPresetVal, 10);
      const counterPreset = Number.isFinite(rawCount)
        ? Math.min(9999, Math.max(0, rawCount))
        : 5;
      onApply(node.id, {
        counterPreset,
        sensingMark: markPrimary.trim(),
      });
    } else if (node.type === 'elec_limiter') {
      const rawDur = Number.parseFloat(inrushDurationVal);
      const inrushDurationMs = Number.isFinite(rawDur)
        ? Math.min(10000, Math.max(1, Math.round(rawDur)))
        : 100;
      const rawLim = Number.parseFloat(currentLimitVal);
      const currentLimitA = Number.isFinite(rawLim)
        ? Math.min(100, Math.max(0.1, Number(rawLim.toFixed(2))))
        : 2;
      onApply(node.id, {
        inrushDurationMs,
        currentLimitA,
      });
    } else if (ELEC_MARK_TYPES.has(node.type)) {
      const extra: Partial<ComponentParams> =
        node.type === 'ladder_relay_sr' || node.type === 'ladder_relay_sa'
          ? {
              relayDelaySec: Math.min(
                100,
                Math.max(0.01, Number((Number.parseFloat(relayDelayVal) || 5).toFixed(2)))
              ),
            }
          : {};
      onApply(node.id, {
        sensingMark: markPrimary.trim(),
        ...extra,
      });
    } else if (node.type === 'pressure_indicator') {
      const rawP = Number.parseFloat(pressureVal);
      const pBar = Number.isFinite(rawP) ? (pressureUnit === 'MPa' ? rawP * 10 : rawP) : 30;
      const crackingPressure = Math.min(400, Math.max(0.001, Number(pBar.toFixed(4))));
      onApply(node.id, {
        crackingPressure,
        signalColor,
      });
    } else if (node.type === 'flow_meter' || node.type === 'flow_meter_analog') {
      onApply(node.id, {
        flowDisplayMode,
        hydraulicResistance,
      });
    } else if (PRESSURE_SWITCH_TYPES.has(node.type)) {
      const rawP = Number.parseFloat(pressureVal);
      const pBar = Number.isFinite(rawP) ? (pressureUnit === 'MPa' ? rawP * 10 : rawP) : 30;
      const crackingPressure = Math.min(350, Math.max(0.001, Number(pBar.toFixed(4))));
      onApply(node.id, {
        crackingPressure,
        sensingMark: markPrimary.trim(),
      });
    } else if (node.type === 'elec_dc_motor' || node.type === 'elec_stepper_motor') {
      const rawRpm = Number.parseFloat(noLoadRpmVal);
      const rpm = Number.isFinite(rawRpm) ? (speedUnit === 'rps' ? rawRpm * 60 : rawRpm) : 75;
      const noLoadRpm = Math.min(20000, Math.max(10, Number(rpm.toFixed(1))));
      const rawTorque = Number.parseFloat(torqueVal);
      const tNm = Number.isFinite(rawTorque)
        ? motorTorqueUnit === 'mNm'
          ? rawTorque / 1000
          : rawTorque
        : 0;
      const loadNm = Math.min(20, Math.max(0, Number(tNm.toFixed(4))));
      onApply(node.id, {
        noLoadRpm,
        loadNm,
      });
    } else if (node.type === 'elec_func_gen') {
      onApply(node.id, {
        funcGenWaveform,
        funcGenFreqHz: Math.min(100, Math.max(0, Number(funcGenFreqVal) || 0)),
        funcGenAmpV: Math.min(10, Math.max(0, Number(funcGenAmpVal) || 0)),
        funcGenOffsetV: Math.min(10, Math.max(-10, Number(funcGenOffsetVal) || 0)),
      });
    } else if (node.type === 'elec_setpoint_card') {
      const cleanVals = setpointValues.map((raw) => {
        const n = Number.parseFloat(raw);
        return Number.isFinite(n) ? Math.min(10, Math.max(-10, Number(n.toFixed(2)))) : 0;
      });
      const cleanEnabled = setpointEnabled.map((v, idx) => (idx === 0 ? true : Boolean(v)));
      const cleanRamps = setpointRamps.map((raw) => {
        const n = Number.parseFloat(raw);
        return Number.isFinite(n) ? Math.min(10, Math.max(0, Number(n.toFixed(2)))) : 0;
      });
      const rawTime = Number.parseFloat(setpointTimeVal);
      const setpointSwitchTimeSec = Number.isFinite(rawTime)
        ? Math.min(100, Math.max(0.01, Number(rawTime.toFixed(2))))
        : 1;
      onApply(node.id, {
        setpointValues: cleanVals,
        setpointEnabled: cleanEnabled,
        setpointRamps: cleanRamps,
        setpointMode,
        setpointSwitchTimeSec,
      });
    } else {
      // nozzle, orifice, check_valve, check_valve_spring, shuttle_valve, two_pressure_valve, flow_divider
      onApply(node.id, { hydraulicResistance });
    }

    onClose();
  };

  const title = getPropertyDialogTitle(node.type);
  const inputCls = isDark
    ? 'bg-slate-950 border-slate-600 text-slate-100 focus:border-sky-500'
    : 'bg-white border-sky-600/80 text-slate-900 focus:border-sky-700';

  const selectCls = isDark
    ? 'bg-slate-800 border-slate-600 text-slate-200'
    : 'bg-[#E1E1E1] border-[#ADADAD] text-slate-900';

  const btnCls = isDark
    ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-100'
    : 'bg-[#E1E1E1] hover:bg-[#D5E1F2] border-[#ADADAD] text-slate-900';

  const fieldsetCls = `border p-2.5 space-y-2 ${isDark ? 'border-slate-700' : 'border-[#D0D0D0]'}`;

  const activeR =
    curveTarget === 'check'
      ? parseResistanceMpa(checkResVal, checkResUnit, 0.01)
      : parseResistanceMpa(resVal, resUnit, getDefaultResistance(node.type));

  const renderResistanceFieldset = (legendLabel: string) => (
    <fieldset className={fieldsetCls}>
      <legend className="px-1 text-[11.5px]">{legendLabel}</legend>
      <div className="grid grid-cols-[72px_1fr_84px] items-center gap-2">
        <input
          aria-label={legendLabel}
          type="number"
          step="any"
          min={resUnit === 'mpa' ? 1e-7 : 1e-6}
          max={resUnit === 'mpa' ? 100 : 1000}
          disabled={!canEdit}
          value={resVal}
          onChange={(e) => setResVal(e.target.value)}
          className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
        />
        <select
          aria-label="Unidade de resistência hidráulica"
          value={resUnit}
          onChange={(e) => switchResUnit(e.target.value as 'mpa' | 'bar', 'primary')}
          className={`h-6 px-1.5 border ${selectCls}`}
        >
          <option value="mpa">MPa/(l/min)^2 (1e-007..100)</option>
          <option value="bar">bar/(l/min)^2 (1e-006..1000)</option>
        </select>
        <button
          type="button"
          onClick={() => setCurveTarget((c) => (c === 'primary' ? 'none' : 'primary'))}
          className={`h-6 px-2 border ${btnCls}`}
        >
          Curva...
        </button>
      </div>
    </fieldset>
  );

  const renderCurvePanel = () => {
    if (curveTarget === 'none') return null;
    const curveTitle =
      curveTarget === 'check'
        ? 'Curva Válvula de antirretorno: Δp = R · Q²'
        : 'Curva Δp = R · Q²';
    return (
      <div
        className={`p-2 border rounded-sm ${
          isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between text-[10px] mb-1 text-slate-500">
          <span>
            {curveTitle} (R = {activeR.toPrecision(3)} MPa/(l/min)²)
          </span>
          <span className="font-mono">Q: 0..30 l/min</span>
        </div>
        <svg viewBox="0 0 260 90" className="w-full h-24">
          <line x1={28} y1={10} x2={28} y2={74} stroke="#94A3B8" strokeWidth={1} />
          <line x1={28} y1={74} x2={248} y2={74} stroke="#94A3B8" strokeWidth={1} />
          <polyline
            fill="none"
            stroke="#0284C7"
            strokeWidth={1.8}
            points={Array.from({ length: 16 }, (_, idx) => {
              const q = idx * 2;
              const maxDp = Math.max(0.01, activeR * 900);
              const dp = activeR * q * q;
              const px = 28 + (q / 30) * 215;
              const py = 74 - Math.min(1, dp / maxDp) * 60;
              return `${px.toFixed(1)},${py.toFixed(1)}`;
            }).join(' ')}
          />
          <text x={246} y={85} textAnchor="end" fontSize={8} fill="#64748B">
            Q [l/min]
          </text>
          <text x={4} y={14} fontSize={8} fill="#64748B">
            Δp
          </text>
        </svg>
      </div>
    );
  };

  const renderOpeningFieldset = () => (
    <fieldset className={fieldsetCls}>
      <legend className="px-1 text-[11.5px]">Grau de abertura</legend>
      <div className="flex items-center gap-3">
        <input
          aria-label="Grau de abertura (%)"
          type="number"
          min={0}
          max={100}
          step={1}
          disabled={!canEdit}
          value={openingVal}
          onChange={(e) =>
            setOpeningVal(Math.min(100, Math.max(0, Number.parseFloat(e.target.value) || 0)))
          }
          className={`w-[72px] h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
        />
        <span className="text-[11.5px]">(0..100 %)</span>
        <label className="inline-flex items-center gap-1.5 cursor-pointer ml-2">
          <input
            type="checkbox"
            disabled={!canEdit}
            checked={showOpeningBadge}
            onChange={(e) => setShowOpeningBadge(e.target.checked)}
          />
          <span>Mostrar grau de abertura</span>
        </label>
      </div>
      <div className="px-1 pt-1">
        <div className="flex justify-between px-1 mb-0.5">
          {Array.from({ length: 11 }, (_, idx) => (
            <span key={idx} className={`w-px h-1.5 ${isDark ? 'bg-slate-600' : 'bg-slate-400'}`} />
          ))}
        </div>
        <input
          aria-label="Controle deslizante de grau de abertura"
          type="range"
          min={0}
          max={100}
          step={1}
          disabled={!canEdit}
          value={openingVal}
          onChange={(e) => setOpeningVal(Number(e.target.value))}
          className="w-full accent-sky-600 cursor-pointer"
        />
      </div>
    </fieldset>
  );

  const renderAreaRatioFieldset = (isClosePilot: boolean, hasSpring: boolean) => {
    const formula = isClosePilot ? 'r = X : A' : 'r = X : B';
    return (
      <fieldset className={fieldsetCls}>
        <legend className="px-1 text-[11.5px]">Relação de área</legend>
        <div className="flex items-center gap-3">
          <input
            aria-label="Relação de área"
            type="number"
            step="any"
            min={1}
            max={10}
            disabled={!canEdit}
            value={areaRatioVal}
            onChange={(e) => setAreaRatioVal(e.target.value)}
            className={`w-[72px] h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
          />
          <span className="text-[11.5px]">(1..10)</span>
          <div className="w-[100px] h-[64px] bg-white border border-slate-300 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 96 62" className="w-full h-full">
              <text x={35} y={13} textAnchor="middle" fontSize={10} fontWeight={700} fill="#0F172A">
                B
              </text>
              <text x={35} y={58} textAnchor="middle" fontSize={10} fontWeight={700} fill="#0F172A">
                A
              </text>
              <rect x={20} y={17} width={30} height={28} fill="none" stroke="#0F172A" strokeWidth={1.1} />
              <line x1={35} y1={13} x2={35} y2={26} stroke="#0F172A" strokeWidth={1.1} />
              <line x1={35} y1={35} x2={35} y2={49} stroke="#0F172A" strokeWidth={1.1} />
              {hasSpring && (
                <path
                  d="M32,19 L38,21 L32,23 L38,25 L32,27"
                  fill="none"
                  stroke="#0F172A"
                  strokeWidth={0.9}
                />
              )}
              <circle cx={35} cy={31} r={3.2} fill="#FFFFFF" stroke="#0F172A" strokeWidth={1.1} />
              <polyline points="29,31 35,36 41,31" fill="none" stroke="#0F172A" strokeWidth={1.1} />
              {isClosePilot ? (
                <>
                  <polyline
                    points="50,21 68,21"
                    fill="none"
                    stroke="#0F172A"
                    strokeWidth={1}
                    strokeDasharray="3 2"
                  />
                  <text x={71} y={24} fontSize={10} fontWeight={700} fill="#0F172A">
                    X
                  </text>
                </>
              ) : (
                <>
                  <polyline
                    points="50,41 55,41 55,47 68,47"
                    fill="none"
                    stroke="#0F172A"
                    strokeWidth={1}
                    strokeDasharray="3 2"
                  />
                  <text x={71} y={50} fontSize={10} fontWeight={700} fill="#0F172A">
                    X
                  </text>
                </>
              )}
            </svg>
          </div>
          <span className="font-mono text-[11.5px] font-medium whitespace-nowrap">{formula}</span>
        </div>
      </fieldset>
    );
  };

  const renderNominalPressureFieldset = () => (
    <fieldset className={fieldsetCls}>
      <legend className="px-1 text-[11.5px]">Pressão nominal</legend>
      <div className="grid grid-cols-[72px_1fr] items-center gap-2">
        <input
          aria-label="Pressão nominal"
          type="number"
          step="any"
          min={pressureUnit === 'MPa' ? 0.001 : 0.01}
          max={pressureUnit === 'MPa' ? 40 : 400}
          disabled={!canEdit}
          value={pressureVal}
          onChange={(e) => setPressureVal(e.target.value)}
          className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
        />
        <select
          aria-label="Unidade de pressão nominal"
          value={pressureUnit}
          onChange={(e) => switchPressureUnit(e.target.value as 'MPa' | 'bar')}
          className={`h-6 px-1.5 border ${selectCls}`}
        >
          <option value="MPa">MPa (0.001..40)</option>
          <option value="bar">bar (0.01..400)</option>
        </select>
      </div>
    </fieldset>
  );

  const renderAmplifierHydraulicBoxes = () => (
    <fieldset className={fieldsetCls}>
      <legend className="px-1 text-[11.5px]">Componente correspondente do circuito hidráulico:</legend>
      <div className="grid grid-cols-3 gap-2 pt-0.5">
        <div className="h-[58px] bg-white border border-slate-300 flex items-center justify-center">
          <svg viewBox="0 0 110 52" className="w-full h-full">
            <line x1={18} y1={10} x2={72} y2={10} stroke="#0F172A" strokeWidth={1.3} />
            <line x1={18} y1={42} x2={72} y2={42} stroke="#0F172A" strokeWidth={1.3} />
            <line x1={26} y1={13} x2={26} y2={39} stroke="#0F172A" strokeWidth={1.3} />
            <rect x={18} y={13} width={54} height={26} fill="none" stroke="#0F172A" strokeWidth={1.3} />
            <rect x={72} y={24} width={22} height={15} fill="none" stroke="#0F172A" strokeWidth={1.2} />
            <line x1={77} y1={39} x2={89} y2={24} stroke="#0F172A" strokeWidth={1.1} />
            <line x1={71} y1={43} x2={93} y2={15} stroke="#0F172A" strokeWidth={1.3} />
            <polygon points="93,15 88,18 91,21" fill="#0F172A" />
          </svg>
        </div>

        <div className="h-[58px] bg-white border border-slate-300 flex items-center justify-center">
          <svg viewBox="0 0 110 52" className="w-full h-full">
            <polyline points="12,13 24,13 24,39 12,39" fill="none" stroke="#0F172A" strokeWidth={1.3} />
            <rect x={24} y={18} width={22} height={16} fill="none" stroke="#0F172A" strokeWidth={1.3} />
            <polygon points="31,20 40,26 31,32" fill="#0F172A" />
            <line x1={46} y1={14} x2={46} y2={38} stroke="#0F172A" strokeWidth={1.3} />
            <path d="M46,20 L51,32 L56,20 L61,32" fill="none" stroke="#0F172A" strokeWidth={1.2} />
            <rect x={61} y={20} width={22} height={12} fill="none" stroke="#0F172A" strokeWidth={1.2} />
            <line x1={66} y1={32} x2={78} y2={20} stroke="#0F172A" strokeWidth={1.1} />
            <line x1={60} y1={40} x2={82} y2={10} stroke="#0F172A" strokeWidth={1.3} />
            <polygon points="82,10 77,13 80,16" fill="#0F172A" />
          </svg>
        </div>

        <div className="h-[58px] bg-white border border-slate-300 flex items-center justify-center">
          <svg viewBox="0 0 110 52" className="w-full h-full">
            <rect x={20} y={14} width={16} height={16} fill="none" stroke="#0F172A" strokeWidth={1.2} />
            <line x1={23} y1={30} x2={33} y2={14} stroke="#0F172A" strokeWidth={1.1} />
            <polyline points="16,12 16,33 42,33 50,24" fill="none" stroke="#0F172A" strokeWidth={1.2} />
            <path d="M22,36 L34,39 L22,42 L34,45" fill="none" stroke="#0F172A" strokeWidth={1.1} />
            <line x1={12} y1={32} x2={52} y2={17} stroke="#0F172A" strokeWidth={1.2} />
            <polygon points="52,17 46,17 48,21" fill="#0F172A" />
            <circle cx={68} cy={26} r={14} fill="none" stroke="#0F172A" strokeWidth={1.3} />
            <polygon points="68,12.5 64,19 72,19" fill="#0F172A" />
            <line x1={68} y1={4} x2={68} y2={12} stroke="#0F172A" strokeWidth={1.3} />
            <line x1={68} y1={40} x2={68} y2={48} stroke="#0F172A" strokeWidth={1.3} />
            <line x1={50} y1={40} x2={88} y2={10} stroke="#0F172A" strokeWidth={1.3} />
            <polygon points="88,10 82,12 85,16" fill="#0F172A" />
          </svg>
        </div>
      </div>
    </fieldset>
  );

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={title}
      data-testid="component-property-dialog"
      style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
      className={`fixed top-0 left-0 z-50 ${
        node.type === 'elec_setpoint_card'
          ? 'w-[min(590px,calc(100vw-20px))]'
          : 'w-[min(540px,calc(100vw-20px))]'
      } border shadow-2xl text-xs select-none ${
        isDark
          ? 'bg-slate-900 border-slate-700 text-slate-100'
          : 'bg-[#F0F0F0] border-[#888888] text-slate-900'
      }`}
    >
      {/* Classic Window Title Bar */}
      <div
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        className={`h-8 px-2.5 flex items-center justify-between border-b cursor-move touch-none ${
          isDark
            ? 'bg-slate-800 border-slate-700 text-slate-100'
            : 'bg-white border-[#DCDCDC] text-slate-900'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <GripHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate font-normal text-[12.5px]">{title}</span>
        </div>
        <button
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          className="p-1 hover:bg-red-600 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-3 space-y-2.5">
        {/* 1. Hidromotor */}
        {node.type === 'motor' && (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-[132px_76px_1fr] items-center gap-2">
              <label htmlFor="motor-disp" className="text-right">
                Deslocamento
              </label>
              <input
                id="motor-disp"
                type="number"
                step="any"
                min={dispUnit === 'l' ? 0.001 : 1}
                max={dispUnit === 'l' ? 5 : 5000}
                disabled={!canEdit}
                value={dispVal}
                onChange={(e) => setDispVal(e.target.value)}
                className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
              />
              <select
                aria-label="Unidade de deslocamento do hidromotor"
                value={dispUnit}
                onChange={(e) => switchDispUnit(e.target.value as 'l' | 'cm3')}
                className={`h-6 px-1.5 border ${selectCls}`}
              >
                <option value="l">l (0.001..5)</option>
                <option value="cm3">cm³ (1..5000)</option>
              </select>
            </div>

            <div className="grid grid-cols-[132px_76px_1fr] items-center gap-2">
              <label htmlFor="motor-fric" className="text-right">
                Atrito
              </label>
              <input
                id="motor-fric"
                type="number"
                step="any"
                min={0.001}
                max={100}
                disabled={!canEdit}
                value={frictionVal}
                onChange={(e) => setFrictionVal(e.target.value)}
                className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
              />
              <select aria-label="Unidade de atrito" defaultValue="nmsrad" className={`h-6 px-1.5 border ${selectCls}`}>
                <option value="nmsrad">N*m*s/rad (0.001..100)</option>
              </select>
            </div>

            <div className="grid grid-cols-[132px_76px_1fr] items-center gap-2">
              <label htmlFor="motor-inertia" className="text-right">
                Momento de inércia
              </label>
              <input
                id="motor-inertia"
                type="number"
                step="any"
                min={0.0001}
                max={1}
                disabled={!canEdit}
                value={inertiaVal}
                onChange={(e) => setInertiaVal(e.target.value)}
                className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
              />
              <select aria-label="Unidade de momento de inércia" defaultValue="kgm2" className={`h-6 px-1.5 border ${selectCls}`}>
                <option value="kgm2">kg*m^2 (0.0001..1)</option>
              </select>
            </div>

            <div className="grid grid-cols-[132px_76px_1fr] items-center gap-2">
              <label htmlFor="motor-torque" className="text-right">
                Torque externo
              </label>
              <input
                id="motor-torque"
                type="number"
                step="any"
                min={-1000}
                max={1000}
                disabled={!canEdit}
                value={torqueVal}
                onChange={(e) => setTorqueVal(e.target.value)}
                className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
              />
              <select aria-label="Unidade de torque externo" defaultValue="nm" className={`h-6 px-1.5 border ${selectCls}`}>
                <option value="nm">Nm (-1000..1000)</option>
              </select>
            </div>
          </div>
        )}

        {/* 2. Atuador semi-giratório */}
        {node.type === 'rotary_actuator' && (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <fieldset className={fieldsetCls}>
                <legend className="px-1 text-[11.5px]">Marca</legend>
                <input
                  aria-label="Marca principal"
                  type="text"
                  disabled={!canEdit}
                  value={markPrimary}
                  onChange={(e) => setMarkPrimary(e.target.value)}
                  className={`w-full h-6 px-1.5 border outline-none ${inputCls}`}
                />
                <input
                  aria-label="Marca secundária"
                  type="text"
                  disabled={!canEdit}
                  value={markSecondary}
                  onChange={(e) => setMarkSecondary(e.target.value)}
                  className={`w-full h-6 px-1.5 border outline-none ${inputCls}`}
                />
              </fieldset>

              <fieldset className={fieldsetCls}>
                <legend className="px-1 text-[11.5px]">Posição inicial</legend>
                <div className="space-y-1.5 pt-0.5 pl-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="rotary-init-pos"
                      disabled={!canEdit}
                      checked={rotaryInitialPos === 'left'}
                      onChange={() => setRotaryInitialPos('left')}
                    />
                    <span>Esquerda</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="rotary-init-pos"
                      disabled={!canEdit}
                      checked={rotaryInitialPos === 'right'}
                      onChange={() => setRotaryInitialPos('right')}
                    />
                    <span>Direita</span>
                  </label>
                </div>
              </fieldset>
            </div>

            <fieldset className={fieldsetCls}>
              <div className="grid grid-cols-[126px_76px_1fr] items-center gap-2">
                <label htmlFor="rotary-angle" className="text-right">
                  Ângulo de rotação
                </label>
                <input
                  id="rotary-angle"
                  type="number"
                  min={1}
                  max={360}
                  step={1}
                  disabled={!canEdit}
                  value={angleDegVal}
                  onChange={(e) => setAngleDegVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select aria-label="Unidade de ângulo de rotação" defaultValue="deg" className={`h-6 px-1.5 border ${selectCls}`}>
                  <option value="deg">Graus angulares (Deg) (1..360)</option>
                </select>
              </div>

              <div className="grid grid-cols-[126px_76px_1fr] items-center gap-2">
                <label htmlFor="rotary-disp" className="text-right">
                  Deslocamento
                </label>
                <input
                  id="rotary-disp"
                  type="number"
                  step="any"
                  min={dispUnit === 'l' ? 0.001 : 1}
                  max={dispUnit === 'l' ? 5 : 5000}
                  disabled={!canEdit}
                  value={dispVal}
                  onChange={(e) => setDispVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select
                  aria-label="Unidade de deslocamento do atuador"
                  value={dispUnit}
                  onChange={(e) => switchDispUnit(e.target.value as 'l' | 'cm3')}
                  className={`h-6 px-1.5 border ${selectCls}`}
                >
                  <option value="l">l (0.001..5)</option>
                  <option value="cm3">cm³ (1..5000)</option>
                </select>
              </div>

              <div className="grid grid-cols-[126px_76px_1fr] items-center gap-2">
                <label htmlFor="rotary-fric" className="text-right">
                  Atrito
                </label>
                <input
                  id="rotary-fric"
                  type="number"
                  step="any"
                  min={0.01}
                  max={100}
                  disabled={!canEdit}
                  value={frictionVal}
                  onChange={(e) => setFrictionVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select aria-label="Unidade de atrito do atuador" defaultValue="nmsrad" className={`h-6 px-1.5 border ${selectCls}`}>
                  <option value="nmsrad">N*m*s/rad (0.01..100)</option>
                </select>
              </div>

              <div className="grid grid-cols-[126px_76px_1fr] items-center gap-2">
                <label htmlFor="rotary-inertia" className="text-right">
                  Momento de inércia
                </label>
                <input
                  id="rotary-inertia"
                  type="number"
                  step="any"
                  min={0.0001}
                  max={1}
                  disabled={!canEdit}
                  value={inertiaVal}
                  onChange={(e) => setInertiaVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select aria-label="Unidade de inércia do atuador" defaultValue="kgm2" className={`h-6 px-1.5 border ${selectCls}`}>
                  <option value="kgm2">kg*m^2 (0.0001..1)</option>
                </select>
              </div>

              <div className="grid grid-cols-[126px_76px_1fr] items-center gap-2">
                <label htmlFor="rotary-torque" className="text-right">
                  Torque externo
                </label>
                <input
                  id="rotary-torque"
                  type="number"
                  step="any"
                  min={-1000}
                  max={1000}
                  disabled={!canEdit}
                  value={torqueVal}
                  onChange={(e) => setTorqueVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select aria-label="Unidade de torque do atuador" defaultValue="nm" className={`h-6 px-1.5 border ${selectCls}`}>
                  <option value="nm">Nm (-1000..1000)</option>
                </select>
              </div>
            </fieldset>

            {/* Corresponding electrical & hydraulic preview boxes */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-center gap-3">
                <span className="text-right text-[11.5px] leading-tight w-48">
                  Componente correspondente do circuito elétrico:
                </span>
                <div className="w-[104px] h-[44px] bg-white border border-slate-300 flex items-center justify-center">
                  <svg viewBox="0 0 100 40" className="w-full h-full">
                    <line x1={22} y1={5} x2={22} y2={13} stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={18} y1={13} x2={22} y2={25} stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={22} y1={25} x2={22} y2={35} stroke="#0F172A" strokeWidth={1.3} />

                    <line x1={48} y1={5} x2={48} y2={13} stroke="#0F172A" strokeWidth={1.3} />
                    <polyline points="48,13 53,13 48,25" fill="none" stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={48} y1={25} x2={48} y2={35} stroke="#0F172A" strokeWidth={1.3} />

                    <line x1={74} y1={5} x2={74} y2={13} stroke="#0F172A" strokeWidth={1.3} />
                    <polyline points="74,13 68,25 68,35" fill="none" stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={82} y1={24} x2={82} y2={35} stroke="#0F172A" strokeWidth={1.3} />
                  </svg>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <span className="text-right text-[11.5px] leading-tight w-48">
                  Componente correspondente do circuito hidráulico:
                </span>
                <div className="w-[104px] h-[44px] bg-white border border-slate-300 flex items-center justify-center">
                  <svg viewBox="0 0 100 40" className="w-full h-full">
                    <path
                      d="M32,16 H44 V24 H32 A4,4 0 0,1 32,16 Z"
                      fill="none"
                      stroke="#0F172A"
                      strokeWidth={1.3}
                    />
                    <polyline points="68,8 44,8 44,32 68,32" fill="none" stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={62} y1={8} x2={62} y2={32} stroke="#0F172A" strokeWidth={1.3} />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3, 5, 8, 13, 14. Pure Hydraulic Resistance components */}
        {(node.type === 'nozzle' ||
          node.type === 'orifice' ||
          node.type === 'check_valve' ||
          node.type === 'check_valve_spring' ||
          node.type === 'shuttle_valve' ||
          node.type === 'two_pressure_valve' ||
          node.type === 'flow_divider') && (
          <>
            {renderResistanceFieldset('Resistência hidráulica')}
            {renderCurvePanel()}
          </>
        )}

        {/* 4, 5-adj, 6. Opening degree + Hydraulic Resistance */}
        {(node.type === 'throttle' ||
          node.type === 'orifice_adjustable' ||
          node.type === 'shutoff_valve') && (
          <>
            {renderOpeningFieldset()}
            {renderResistanceFieldset('Resistência hidráulica')}
            {renderCurvePanel()}
          </>
        )}

        {/* 7. Check-throttle valve (Opening + dual hydraulic resistance rows) */}
        {node.type === 'check_throttle' && (
          <>
            {renderOpeningFieldset()}
            <fieldset className={fieldsetCls}>
              <legend className="px-1 text-[11.5px]">Resistência hidráulica</legend>
              <div className="grid grid-cols-[128px_68px_minmax(0,1fr)_72px] items-center gap-2">
                <label htmlFor="chk-thr-r" className="text-right">
                  Estrangulação
                </label>
                <input
                  id="chk-thr-r"
                  type="number"
                  step="any"
                  min={resUnit === 'mpa' ? 1e-7 : 1e-6}
                  max={resUnit === 'mpa' ? 100 : 1000}
                  disabled={!canEdit}
                  value={resVal}
                  onChange={(e) => setResVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select
                  aria-label="Unidade de resistência da estrangulação"
                  value={resUnit}
                  onChange={(e) => switchResUnit(e.target.value as 'mpa' | 'bar', 'primary')}
                  className={`h-6 px-1.5 border w-full min-w-0 ${selectCls}`}
                >
                  <option value="mpa">MPa/(l/min)^2 (1e-007..100)</option>
                  <option value="bar">bar/(l/min)^2 (1e-006..1000)</option>
                </select>
                <button
                  type="button"
                  onClick={() => setCurveTarget((c) => (c === 'primary' ? 'none' : 'primary'))}
                  className={`h-6 px-2 border ${btnCls}`}
                >
                  Curva...
                </button>
              </div>

              <div className="grid grid-cols-[128px_68px_minmax(0,1fr)_72px] items-center gap-2">
                <label htmlFor="chk-val-r" className="text-right">
                  Válvula de antirretorno
                </label>
                <input
                  id="chk-val-r"
                  type="number"
                  step="any"
                  min={checkResUnit === 'mpa' ? 1e-7 : 1e-6}
                  max={checkResUnit === 'mpa' ? 100 : 1000}
                  disabled={!canEdit}
                  value={checkResVal}
                  onChange={(e) => setCheckResVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select
                  aria-label="Unidade de resistência da válvula antirretorno"
                  value={checkResUnit}
                  onChange={(e) => switchResUnit(e.target.value as 'mpa' | 'bar', 'check')}
                  className={`h-6 px-1.5 border w-full min-w-0 ${selectCls}`}
                >
                  <option value="mpa">MPa/(l/min)^2 (1e-007..100)</option>
                  <option value="bar">bar/(l/min)^2 (1e-006..1000)</option>
                </select>
                <button
                  type="button"
                  onClick={() => setCurveTarget((c) => (c === 'check' ? 'none' : 'check'))}
                  className={`h-6 px-2 border ${btnCls}`}
                >
                  Curva...
                </button>
              </div>
            </fieldset>
            {renderCurvePanel()}
          </>
        )}

        {/* 9, 10, 11, 12. Pilot Check Valves */}
        {(node.type === 'pilot_check_valve' ||
          node.type === 'pilot_check_spring' ||
          node.type === 'pilot_check_close' ||
          node.type === 'pilot_check_close_spring') && (
          <>
            {(node.type === 'pilot_check_spring' || node.type === 'pilot_check_close_spring') &&
              renderNominalPressureFieldset()}
            {renderAreaRatioFieldset(
              node.type === 'pilot_check_close' || node.type === 'pilot_check_close_spring',
              node.type === 'pilot_check_spring' || node.type === 'pilot_check_close_spring'
            )}
            {renderResistanceFieldset('Resistência hidráulica')}
            {renderCurvePanel()}
          </>
        )}

        {/* 13. 2-way & 3-way Flow Control Valves */}
        {(node.type === 'flow_control_2way' || node.type === 'flow_control_3way') && (
          <>
            <fieldset className={fieldsetCls}>
              <legend className="px-1 text-[11.5px]">Caudal nominal</legend>
              <div className="flex items-center gap-2">
                <input
                  aria-label="Caudal nominal (l/min)"
                  type="number"
                  step="any"
                  min={0.01}
                  max={500}
                  disabled={!canEdit}
                  value={nominalFlowVal}
                  onChange={(e) =>
                    setNominalFlowVal(
                      Math.min(500, Math.max(0.01, Number.parseFloat(e.target.value) || 0.01))
                    )
                  }
                  className={`w-[72px] h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select
                  aria-label="Unidade de caudal nominal"
                  defaultValue="lpm"
                  className={`h-6 px-1.5 border w-48 ${selectCls}`}
                >
                  <option value="lpm">l/min (0.01..500)</option>
                </select>
              </div>
              <div className="px-1 pt-1">
                <div className="flex justify-between px-1 mb-0.5">
                  {Array.from({ length: 11 }, (_, idx) => (
                    <span key={idx} className={`w-px h-1.5 ${isDark ? 'bg-slate-600' : 'bg-slate-400'}`} />
                  ))}
                </div>
                <input
                  aria-label="Controle deslizante de caudal nominal"
                  type="range"
                  min={0.01}
                  max={500}
                  step={1}
                  disabled={!canEdit}
                  value={nominalFlowVal}
                  onChange={(e) => setNominalFlowVal(Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>
            </fieldset>
            {renderResistanceFieldset('Resistência hidráulica mínima')}
            {renderCurvePanel()}
          </>
        )}

        {/* 14. Pressure Valves WITH Slider (8 components - Image 1) */}
        {PRESSURE_SLIDER_TYPES.has(node.type) && (() => {
          const maxP = pressureUnit === 'MPa' ? 40 : 400;
          const numericP = Math.min(maxP, Math.max(0, Number.parseFloat(pressureVal) || 0));
          return (
            <>
              <fieldset className={fieldsetCls}>
                <legend className="px-1 text-[11.5px]">Pressão nominal</legend>
                <div className="flex items-center gap-2">
                  <input
                    aria-label="Pressão nominal"
                    type="number"
                    step="any"
                    min={0}
                    max={maxP}
                    disabled={!canEdit}
                    value={pressureVal}
                    onChange={(e) => setPressureVal(e.target.value)}
                    className={`w-[72px] h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                  />
                  <select
                    aria-label="Unidade de pressão nominal"
                    value={pressureUnit}
                    onChange={(e) => switchPressureUnit(e.target.value as 'MPa' | 'bar')}
                    className={`h-6 px-1.5 border w-48 ${selectCls}`}
                  >
                    <option value="MPa">MPa (0..40)</option>
                    <option value="bar">bar (0..400)</option>
                  </select>
                </div>
                <div className="px-1 pt-1">
                  <div className="flex justify-between px-1 mb-0.5">
                    {Array.from({ length: 41 }, (_, idx) => (
                      <span
                        key={idx}
                        className={`w-px ${idx % 5 === 0 ? 'h-2' : 'h-1'} ${
                          isDark ? 'bg-slate-600' : 'bg-slate-400'
                        }`}
                      />
                    ))}
                  </div>
                  <input
                    aria-label="Controle deslizante de pressão nominal"
                    type="range"
                    min={0}
                    max={maxP}
                    step={pressureUnit === 'MPa' ? 0.5 : 5}
                    disabled={!canEdit}
                    value={numericP}
                    onChange={(e) => setPressureVal(e.target.value)}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                </div>
              </fieldset>
              {renderResistanceFieldset('Resistência hidráulica')}
              {renderCurvePanel()}
            </>
          );
        })()}

        {/* 15. Pressure Valves WITHOUT Slider (3 components - Image 2) */}
        {PRESSURE_NOSLIDER_TYPES.has(node.type) && (
          <>
            <fieldset className={fieldsetCls}>
              <legend className="px-1 text-[11.5px]">Pressão nominal</legend>
              <div className="flex items-center gap-2">
                <input
                  aria-label="Pressão nominal"
                  type="number"
                  step="any"
                  min={pressureUnit === 'MPa' ? 0.01 : 0.1}
                  max={pressureUnit === 'MPa' ? 40 : 400}
                  disabled={!canEdit}
                  value={pressureVal}
                  onChange={(e) => setPressureVal(e.target.value)}
                  className={`w-[72px] h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select
                  aria-label="Unidade de pressão nominal"
                  value={pressureUnit}
                  onChange={(e) => switchPressureUnit(e.target.value as 'MPa' | 'bar')}
                  className={`h-6 px-1.5 border w-48 ${selectCls}`}
                >
                  <option value="MPa">MPa (0.01..40)</option>
                  <option value="bar">bar (0.1..400)</option>
                </select>
              </div>
            </fieldset>
            {renderResistanceFieldset('Resistência hidráulica')}
            {renderCurvePanel()}
          </>
        )}

        {/* 16. Opening Cartridge Valves (cartridge_valve_a, cartridge_valve_b - Image 3) */}
        {(node.type === 'cartridge_valve_a' || node.type === 'cartridge_valve_b') && (
          <>
            <fieldset className={fieldsetCls}>
              <legend className="px-1 text-[11.5px]">Tipo de válvula</legend>
              <div className="grid grid-cols-[1fr_116px] items-center gap-3 px-1">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="cartridge-area-mode"
                      disabled={!canEdit}
                      checked={cartridgeMode === 'one_area'}
                      onChange={() => setCartridgeMode('one_area')}
                    />
                    <span>Uma área ativa</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="cartridge-area-mode"
                      disabled={!canEdit}
                      checked={cartridgeMode === 'two_areas'}
                      onChange={() => setCartridgeMode('two_areas')}
                    />
                    <span>Duas áreas ativas</span>
                  </label>
                </div>

                <div className="w-[116px] h-[72px] bg-white border border-slate-300 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 116 72" className="w-full h-full">
                    {/* Top X port line */}
                    <line x1={54} y1={2} x2={54} y2={8} stroke="#0F172A" strokeWidth={1.2} />
                    {/* Cartridge housing */}
                    <rect x={39} y={8} width={30} height={48} fill="none" stroke="#0F172A" strokeWidth={1.2} />
                    {/* Spring */}
                    <path
                      d="M44,10 L62,14 L44,18 L62,22 L44,26"
                      fill="none"
                      stroke="#0F172A"
                      strokeWidth={1.1}
                    />
                    {/* Spool shoulder */}
                    <line x1={39} y1={31} x2={69} y2={31} stroke="#0F172A" strokeWidth={1.2} />
                    {/* Poppet cone */}
                    {cartridgeMode === 'two_areas' ? (
                      <>
                        <line x1={39} y1={43} x2={69} y2={43} stroke="#0F172A" strokeWidth={1.1} />
                        <polyline points="42,43 54,56 66,43" fill="none" stroke="#0F172A" strokeWidth={1.2} />
                        <line x1={36} y1={52} x2={46} y2={48} stroke="#0F172A" strokeWidth={0.9} />
                        <text x={28} y={58} fontSize={11} fontWeight={700} fill="#0F172A">
                          B
                        </text>
                      </>
                    ) : (
                      <polyline points="42,43 54,56 66,43" fill="none" stroke="#0F172A" strokeWidth={1.2} />
                    )}
                    {/* Bottom A port + callout */}
                    <line x1={54} y1={56} x2={54} y2={69} stroke="#0F172A" strokeWidth={1.2} />
                    <line x1={58} y1={53} x2={72} y2={60} stroke="#0F172A" strokeWidth={0.9} />
                    <text x={74} y={65} fontSize={11} fontWeight={700} fill="#0F172A">
                      A
                    </text>
                    {/* Right side B port line */}
                    <line x1={69} y1={43} x2={92} y2={43} stroke="#0F172A" strokeWidth={1.2} />
                  </svg>
                </div>
              </div>
            </fieldset>

            <fieldset className={fieldsetCls}>
              <legend className="px-1 text-[11.5px]">Parâmetros</legend>
              <div className="grid grid-cols-[128px_68px_minmax(0,1fr)_72px] items-center gap-2">
                <label htmlFor="cart-area-a" className="text-right">
                  Área A
                </label>
                <input
                  id="cart-area-a"
                  type="number"
                  step="any"
                  min={areaAUnit === 'qcm' ? 1 : 100}
                  max={areaAUnit === 'qcm' ? 100 : 10000}
                  disabled={!canEdit}
                  value={areaAVal}
                  onChange={(e) => setAreaAVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select
                  aria-label="Unidade de Área A"
                  value={areaAUnit}
                  onChange={(e) => switchAreaUnit(e.target.value as 'qcm' | 'mm2', 'A')}
                  className={`h-6 px-1.5 border w-full min-w-0 ${selectCls}`}
                >
                  <option value="qcm">qcm (1..100)</option>
                  <option value="mm2">mm² (100..10000)</option>
                </select>
                <div />
              </div>

              <div className="grid grid-cols-[128px_68px_minmax(0,1fr)_72px] items-center gap-2">
                <label
                  htmlFor="cart-area-b"
                  className={`text-right ${cartridgeMode === 'one_area' ? 'opacity-50' : ''}`}
                >
                  Área B
                </label>
                <input
                  id="cart-area-b"
                  type="number"
                  step="any"
                  min={0}
                  max={areaBUnit === 'qcm' ? 100 : 10000}
                  disabled={!canEdit || cartridgeMode === 'one_area'}
                  value={cartridgeMode === 'one_area' ? '0' : areaBVal}
                  onChange={(e) => setAreaBVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls} disabled:opacity-50`}
                />
                <select
                  aria-label="Unidade de Área B"
                  disabled={cartridgeMode === 'one_area'}
                  value={areaBUnit}
                  onChange={(e) => switchAreaUnit(e.target.value as 'qcm' | 'mm2', 'B')}
                  className={`h-6 px-1.5 border w-full min-w-0 ${selectCls} disabled:opacity-50`}
                >
                  <option value="qcm">qcm (0..100)</option>
                  <option value="mm2">mm² (0..10000)</option>
                </select>
                <div />
              </div>

              <div className="grid grid-cols-[128px_68px_minmax(0,1fr)_72px] items-center gap-2">
                <label htmlFor="cart-press" className="text-right">
                  Pressão nominal
                </label>
                <input
                  id="cart-press"
                  type="number"
                  step="any"
                  min={0}
                  max={pressureUnit === 'MPa' ? 1 : 10}
                  disabled={!canEdit}
                  value={pressureVal}
                  onChange={(e) => setPressureVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select
                  aria-label="Unidade de pressão nominal do cartucho"
                  value={pressureUnit}
                  onChange={(e) => switchPressureUnit(e.target.value as 'MPa' | 'bar')}
                  className={`h-6 px-1.5 border w-full min-w-0 ${selectCls}`}
                >
                  <option value="MPa">MPa (0..1)</option>
                  <option value="bar">bar (0..10)</option>
                </select>
                <div />
              </div>

              <div className="grid grid-cols-[128px_68px_minmax(0,1fr)_72px] items-center gap-2">
                <label htmlFor="cart-res" className="text-right whitespace-nowrap">
                  Resistência hidráulica
                </label>
                <input
                  id="cart-res"
                  type="number"
                  step="any"
                  min={resUnit === 'mpa' ? 1e-7 : 1e-6}
                  max={resUnit === 'mpa' ? 100 : 1000}
                  disabled={!canEdit}
                  value={resVal}
                  onChange={(e) => setResVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select
                  aria-label="Unidade de resistência hidráulica do cartucho"
                  value={resUnit}
                  onChange={(e) => switchResUnit(e.target.value as 'mpa' | 'bar', 'primary')}
                  className={`h-6 px-1.5 border w-full min-w-0 ${selectCls}`}
                >
                  <option value="mpa">MPa/(l/min)^2 (1e-007..100)</option>
                  <option value="bar">bar/(l/min)^2 (1e-006..1000)</option>
                </select>
                <button
                  type="button"
                  onClick={() => setCurveTarget((c) => (c === 'primary' ? 'none' : 'primary'))}
                  className={`h-6 px-2 border ${btnCls}`}
                >
                  Curva...
                </button>
              </div>
            </fieldset>
            {renderCurvePanel()}
          </>
        )}

        {/* 17. Closing Cartridge Valve (cartridge_valve_c - Image 4) */}
        {node.type === 'cartridge_valve_c' && (
          <>
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-[128px_68px_minmax(0,1fr)_72px] items-center gap-2">
                <label htmlFor="cartc-area" className="text-right">
                  Área ativa
                </label>
                <input
                  id="cartc-area"
                  type="number"
                  step="any"
                  min={areaAUnit === 'qcm' ? 1 : 100}
                  max={areaAUnit === 'qcm' ? 100 : 10000}
                  disabled={!canEdit}
                  value={areaAVal}
                  onChange={(e) => setAreaAVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select
                  aria-label="Unidade de Área ativa"
                  value={areaAUnit}
                  onChange={(e) => switchAreaUnit(e.target.value as 'qcm' | 'mm2', 'A')}
                  className={`h-6 px-1.5 border w-full min-w-0 ${selectCls}`}
                >
                  <option value="qcm">qcm (1..100)</option>
                  <option value="mm2">mm² (100..10000)</option>
                </select>
                <div />
              </div>

              <div className="grid grid-cols-[128px_68px_minmax(0,1fr)_72px] items-center gap-2">
                <label htmlFor="cartc-press" className="text-right">
                  Pressão nominal
                </label>
                <input
                  id="cartc-press"
                  type="number"
                  step="any"
                  min={0}
                  max={pressureUnit === 'MPa' ? 1 : 10}
                  disabled={!canEdit}
                  value={pressureVal}
                  onChange={(e) => setPressureVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select
                  aria-label="Unidade de pressão nominal do cartucho de fechamento"
                  value={pressureUnit}
                  onChange={(e) => switchPressureUnit(e.target.value as 'MPa' | 'bar')}
                  className={`h-6 px-1.5 border w-full min-w-0 ${selectCls}`}
                >
                  <option value="MPa">MPa (0..1)</option>
                  <option value="bar">bar (0..10)</option>
                </select>
                <div />
              </div>

              <div className="grid grid-cols-[128px_68px_minmax(0,1fr)_72px] items-center gap-2">
                <label htmlFor="cartc-res" className="text-right whitespace-nowrap">
                  Resistência hidráulica
                </label>
                <input
                  id="cartc-res"
                  type="number"
                  step="any"
                  min={resUnit === 'mpa' ? 1e-7 : 1e-6}
                  max={resUnit === 'mpa' ? 100 : 1000}
                  disabled={!canEdit}
                  value={resVal}
                  onChange={(e) => setResVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select
                  aria-label="Unidade de resistência hidráulica do cartucho de fechamento"
                  value={resUnit}
                  onChange={(e) => switchResUnit(e.target.value as 'mpa' | 'bar', 'primary')}
                  className={`h-6 px-1.5 border w-full min-w-0 ${selectCls}`}
                >
                  <option value="mpa">MPa/(l/min)^2 (1e-007..100)</option>
                  <option value="bar">bar/(l/min)^2 (1e-006..1000)</option>
                </select>
                <button
                  type="button"
                  onClick={() => setCurveTarget((c) => (c === 'primary' ? 'none' : 'primary'))}
                  className={`h-6 px-2 border ${btnCls}`}
                >
                  Curva...
                </button>
              </div>
            </div>
            {renderCurvePanel()}
          </>
        )}

        {/* 18. Proportional 4/3, 2/2 Throttle, and 4/3 Servo Valves (Image 2) */}
        {PROP_SPOOL_VALVE_TYPES.has(node.type) && (
          <>
            {renderResistanceFieldset('Resistência hidráulica')}
            {renderCurvePanel()}
            <div className="grid grid-cols-2 gap-2.5">
              <fieldset className={fieldsetCls}>
                <legend className="px-1 text-[11.5px]">Borda de controle da corrediça</legend>
                <div className="space-y-1.5 pt-0.5 pl-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="prop-spool-edge"
                      disabled={!canEdit}
                      checked={spoolEdgeShape === 'rectangular'}
                      onChange={() => setSpoolEdgeShape('rectangular')}
                    />
                    <span>Retangular</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="prop-spool-edge"
                      disabled={!canEdit}
                      checked={spoolEdgeShape === 'triangular'}
                      onChange={() => setSpoolEdgeShape('triangular')}
                    />
                    <span>Triangular</span>
                  </label>
                </div>
              </fieldset>

              <fieldset className={fieldsetCls}>
                <legend className="px-1 text-[11.5px]">Sobreposição relativa da corrediça</legend>
                <div className="flex items-center gap-2 pt-2 pl-2">
                  <input
                    aria-label="Sobreposição relativa da corrediça"
                    type="number"
                    step="any"
                    min={-30}
                    max={30}
                    disabled={!canEdit}
                    value={spoolOverlapVal}
                    onChange={(e) => setSpoolOverlapVal(e.target.value)}
                    className={`w-[72px] h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                  />
                  <span className="text-[11.5px]">% (-30..30)</span>
                </div>
              </fieldset>
            </div>

            <fieldset className={fieldsetCls}>
              <legend className="px-1 text-[11.5px]">Fugas internas</legend>
              <div className="grid grid-cols-[72px_220px] items-center gap-2">
                <input
                  aria-label="Fugas internas"
                  type="number"
                  step="any"
                  min={0}
                  max={100}
                  disabled={!canEdit}
                  value={internalLeakageVal}
                  onChange={(e) => setInternalLeakageVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select
                  aria-label="Unidade de fugas internas"
                  defaultValue="lminmpa"
                  className={`h-6 px-1.5 border ${selectCls}`}
                >
                  <option value="lminmpa">l/(min*MPa) (0..100)</option>
                </select>
              </div>
            </fieldset>
          </>
        )}

        {/* 19. 2-Channel Proportional Amplifier (Image 3) */}
        {(node.type === 'amp_prop_2ch' || node.type === 'elec_amp_2ch') && (
          <div className="space-y-2.5">
            <fieldset className={fieldsetCls}>
              <legend className="px-1 text-[11.5px]">Marca</legend>
              <div className="space-y-2 pl-6">
                <div className="flex items-center gap-3">
                  <input
                    aria-label="Porta A"
                    type="text"
                    disabled={!canEdit}
                    value={markPrimary}
                    onChange={(e) => setMarkPrimary(e.target.value)}
                    className={`w-[156px] h-6 px-1.5 border outline-none ${inputCls}`}
                  />
                  <span>Porta A</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    aria-label="Porta B"
                    type="text"
                    disabled={!canEdit}
                    value={markSecondary}
                    onChange={(e) => setMarkSecondary(e.target.value)}
                    className={`w-[156px] h-6 px-1.5 border outline-none ${inputCls}`}
                  />
                  <span>Porta B</span>
                </div>
              </div>
            </fieldset>

            <div className={`border p-3 flex items-center justify-center gap-3 ${isDark ? 'border-slate-700' : 'border-[#D0D0D0]'}`}>
              <label htmlFor="amp2-jump">Corrente de salto</label>
              <input
                id="amp2-jump"
                type="number"
                step="any"
                min={0}
                max={25}
                disabled={!canEdit}
                value={jumpCurrentVal}
                onChange={(e) => setJumpCurrentVal(e.target.value)}
                className={`w-[72px] h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
              />
              <span>% (0..25)</span>
            </div>

            {renderAmplifierHydraulicBoxes()}
          </div>
        )}

        {/* 20. 1-Channel Proportional Amplifier (Image 4) */}
        {(node.type === 'amp_prop_1ch' || node.type === 'elec_amp_1ch') && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-[150px_1fr] items-center gap-3">
              <label htmlFor="amp1-marca" className="text-right">
                Marca
              </label>
              <input
                id="amp1-marca"
                type="text"
                disabled={!canEdit}
                value={markPrimary}
                onChange={(e) => setMarkPrimary(e.target.value)}
                className={`w-[156px] h-6 px-1.5 border outline-none ${inputCls}`}
              />
            </div>

            <div className="grid grid-cols-[150px_1fr] items-center gap-3">
              <label htmlFor="amp1-jump" className="text-right">
                Corrente de salto
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="amp1-jump"
                  type="number"
                  step="any"
                  min={0}
                  max={25}
                  disabled={!canEdit}
                  value={jumpCurrentVal}
                  onChange={(e) => setJumpCurrentVal(e.target.value)}
                  className={`w-[72px] h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <span>% (0..25)</span>
              </div>
            </div>

            {renderAmplifierHydraulicBoxes()}
          </div>
        )}

        {/* 21. Proportional Relief / Piloted Relief / Pressure Reducer (Image 5) */}
        {PROP_PRESSURE_RANGE_TYPES.has(node.type) && (
          <>
            <fieldset className={fieldsetCls}>
              <legend className="px-1 text-[11.5px]">Pressão nominal</legend>
              <div className="grid grid-cols-[72px_185px_42px] items-center gap-2">
                <input
                  aria-label="Pressão nominal mínima"
                  type="number"
                  step="any"
                  min={0}
                  max={minPressureUnit === 'MPa' ? 1 : 10}
                  disabled={!canEdit}
                  value={minPressureVal}
                  onChange={(e) => setMinPressureVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select
                  aria-label="Unidade de pressão nominal mínima"
                  value={minPressureUnit}
                  onChange={(e) => switchMinPressureUnit(e.target.value as 'MPa' | 'bar')}
                  className={`h-6 px-1.5 border ${selectCls}`}
                >
                  <option value="MPa">MPa (0..1)</option>
                  <option value="bar">bar (0..10)</option>
                </select>
                <span>Mín.</span>
              </div>

              <div className="grid grid-cols-[72px_185px_42px] items-center gap-2">
                <input
                  aria-label="Pressão nominal máxima"
                  type="number"
                  step="any"
                  min={pressureUnit === 'MPa' ? 0.1 : 1}
                  max={pressureUnit === 'MPa' ? 40 : 400}
                  disabled={!canEdit}
                  value={pressureVal}
                  onChange={(e) => setPressureVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select
                  aria-label="Unidade de pressão nominal máxima"
                  value={pressureUnit}
                  onChange={(e) => switchPressureUnit(e.target.value as 'MPa' | 'bar')}
                  className={`h-6 px-1.5 border ${selectCls}`}
                >
                  <option value="MPa">MPa (0.1..40)</option>
                  <option value="bar">bar (1..400)</option>
                </select>
                <span>Máx.</span>
              </div>
            </fieldset>
            {renderResistanceFieldset('Resistência hidráulica')}
            {renderCurvePanel()}
          </>
        )}

        {/* 22. Proportional Solenoid (Image 6) */}
        {(node.type === 'prop_solenoid' || node.type === 'elec_prop_solenoid') && (
          <div className="space-y-4 pt-2 pb-1">
            <div className="grid grid-cols-[164px_1fr] items-center gap-3">
              <label htmlFor="propsol-marca" className="text-right">
                Marca
              </label>
              <input
                id="propsol-marca"
                type="text"
                disabled={!canEdit}
                value={markPrimary}
                onChange={(e) => setMarkPrimary(e.target.value)}
                className={`w-[156px] h-6 px-1.5 border outline-none ${inputCls}`}
              />
            </div>

            <div className="grid grid-cols-[164px_1fr] items-center gap-3">
              <span className="text-right leading-tight">
                Componente correspondente do circuito hidráulico:
              </span>
              <div className="w-[126px] h-[64px] bg-white border border-slate-300 flex items-center justify-center">
                <svg viewBox="0 0 120 56" className="w-full h-full">
                  <line x1={52} y1={6} x2={52} y2={15} stroke="#0F172A" strokeWidth={1.2} />
                  <line x1={68} y1={6} x2={68} y2={15} stroke="#0F172A" strokeWidth={1.2} />
                  <line x1={52} y1={39} x2={52} y2={48} stroke="#0F172A" strokeWidth={1.2} />
                  <line x1={68} y1={39} x2={68} y2={48} stroke="#0F172A" strokeWidth={1.2} />
                  <line x1={28} y1={13} x2={92} y2={13} stroke="#0F172A" strokeWidth={1.2} />
                  <line x1={28} y1={41} x2={92} y2={41} stroke="#0F172A" strokeWidth={1.2} />
                  <rect x={28} y={16} width={21} height={22} fill="none" stroke="#0F172A" strokeWidth={1.2} />
                  <rect x={49} y={16} width={22} height={22} fill="none" stroke="#0F172A" strokeWidth={1.2} />
                  <rect x={71} y={16} width={21} height={22} fill="none" stroke="#0F172A" strokeWidth={1.2} />
                  {/* Left crossed */}
                  <line x1={32} y1={17} x2={45} y2={37} stroke="#0F172A" strokeWidth={1.1} />
                  <line x1={32} y1={37} x2={45} y2={17} stroke="#0F172A" strokeWidth={1.1} />
                  {/* Center closed T */}
                  <line x1={54} y1={16} x2={54} y2={22} stroke="#0F172A" strokeWidth={1.1} />
                  <line x1={51} y1={22} x2={57} y2={22} stroke="#0F172A" strokeWidth={1.1} />
                  <line x1={66} y1={16} x2={66} y2={22} stroke="#0F172A" strokeWidth={1.1} />
                  <line x1={63} y1={22} x2={69} y2={22} stroke="#0F172A" strokeWidth={1.1} />
                  <line x1={54} y1={32} x2={54} y2={38} stroke="#0F172A" strokeWidth={1.1} />
                  <line x1={51} y1={32} x2={57} y2={32} stroke="#0F172A" strokeWidth={1.1} />
                  <line x1={66} y1={32} x2={66} y2={38} stroke="#0F172A" strokeWidth={1.1} />
                  <line x1={63} y1={32} x2={69} y2={32} stroke="#0F172A" strokeWidth={1.1} />
                  {/* Right parallel */}
                  <line x1={76} y1={18} x2={76} y2={37} stroke="#0F172A" strokeWidth={1.1} />
                  <polygon points="76,17 74,21 78,21" fill="#0F172A" />
                  <line x1={87} y1={17} x2={87} y2={36} stroke="#0F172A" strokeWidth={1.1} />
                  <polygon points="87,37 85,33 89,33" fill="#0F172A" />
                  {/* Left spring + proportional solenoid */}
                  <path d="M28,17 L25,24 L22,17 L19,24 L16,17" fill="none" stroke="#0F172A" strokeWidth={1} />
                  <rect x={12} y={26} width={16} height={10} fill="none" stroke="#0F172A" strokeWidth={1.1} />
                  <line x1={15} y1={36} x2={25} y2={26} stroke="#0F172A" strokeWidth={1} />
                  <line x1={26} y1={38} x2={10} y2={24} stroke="#0F172A" strokeWidth={1.1} />
                  <polygon points="10,24 12,28 14.5,25.5" fill="#0F172A" />
                  {/* Right spring */}
                  <path d="M92,19 L95,26 L98,19 L101,26 L104,19" fill="none" stroke="#0F172A" strokeWidth={1} />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* 23. Pressure Indicator (Image 1) */}
        {node.type === 'pressure_indicator' && (
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-[150px_68px_1fr] items-center gap-2">
              <label htmlFor="ind-press" className="text-right">
                Pressão de comutação
              </label>
              <input
                id="ind-press"
                type="number"
                step="any"
                min={pressureUnit === 'MPa' ? 0.0001 : 0.001}
                max={pressureUnit === 'MPa' ? 40 : 400}
                disabled={!canEdit}
                value={pressureVal}
                onChange={(e) => setPressureVal(e.target.value)}
                className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
              />
              <select
                aria-label="Unidade de pressão de comutação"
                value={pressureUnit}
                onChange={(e) => switchPressureUnit(e.target.value as 'MPa' | 'bar')}
                className={`h-6 px-1.5 border ${selectCls}`}
              >
                <option value="MPa">MPa (0.0001..40)</option>
                <option value="bar">bar (0.001..400)</option>
              </select>
            </div>

            <div className="grid grid-cols-[150px_1fr] items-center gap-2 relative">
              <span className="text-right">Cor do sinal</span>
              <div className="relative">
                <button
                  type="button"
                  aria-label="Cor do sinal"
                  aria-expanded={colorPickerOpen}
                  disabled={!canEdit}
                  onClick={() => setColorPickerOpen((v) => !v)}
                  className={`w-full h-6 px-1.5 border flex items-center justify-between gap-2 ${selectCls}`}
                >
                  <span
                    className="flex-1 h-3.5 border border-black/25"
                    style={{ backgroundColor: signalColor }}
                  />
                  <span className="text-[10px]">▾</span>
                </button>
                {colorPickerOpen && (
                  <div
                    role="listbox"
                    aria-label="Selecionar cor do sinal"
                    className={`absolute left-0 right-0 top-full mt-0.5 z-50 border shadow-lg p-1 space-y-1 ${
                      isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-400'
                    }`}
                  >
                    {SIGNAL_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        role="option"
                        aria-selected={signalColor === c.hex}
                        aria-label={c.label}
                        onClick={() => {
                          setSignalColor(c.hex);
                          setColorPickerOpen(false);
                        }}
                        className="w-full h-5 px-1.5 flex items-center gap-2 hover:bg-sky-100 dark:hover:bg-slate-800"
                      >
                        <span
                          className="flex-1 h-3 border border-black/25"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="text-[10px] w-24 text-left truncate">{c.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 24. Flow Meter / Analog Flow Meter (Image 2) */}
        {(node.type === 'flow_meter' || node.type === 'flow_meter_analog') && (
          <>
            <fieldset className={fieldsetCls}>
              <legend className="px-1 text-[11.5px]">Mostrar</legend>
              <div className="space-y-2.5 pl-10 pr-2 py-0.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white border border-slate-300 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 32 32" className="w-6 h-6">
                      <line x1={16} y1={1} x2={16} y2={6} stroke="#0F172A" strokeWidth={1.3} />
                      <line x1={16} y1={26} x2={16} y2={31} stroke="#0F172A" strokeWidth={1.3} />
                      <circle cx={16} cy={16} r={10} fill="none" stroke="#0F172A" strokeWidth={1.3} />
                      <path d="M10,9 Q14,16 10,23" fill="none" stroke="#0F172A" strokeWidth={1.2} />
                      <path d="M22,9 Q18,16 22,23" fill="none" stroke="#0F172A" strokeWidth={1.2} />
                    </svg>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="flow-display-mode"
                      disabled={!canEdit}
                      checked={flowDisplayMode === 'instantaneous'}
                      onChange={() => setFlowDisplayMode('instantaneous')}
                    />
                    <span>Vazão instantânea</span>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white border border-slate-300 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 32 32" className="w-6 h-6">
                        <line x1={16} y1={1} x2={16} y2={6} stroke="#0F172A" strokeWidth={1.3} />
                        <line x1={16} y1={26} x2={16} y2={31} stroke="#0F172A" strokeWidth={1.3} />
                        <circle cx={16} cy={16} r={10} fill="none" stroke="#0F172A" strokeWidth={1.3} />
                        <path d="M10,9 Q14,16 10,23" fill="none" stroke="#0F172A" strokeWidth={1.2} />
                        <path d="M22,9 Q18,16 22,23" fill="none" stroke="#0F172A" strokeWidth={1.2} />
                        <text x={16} y={19} textAnchor="middle" fontSize={8} fontWeight={700} fill="#0F172A">
                          M
                        </text>
                      </svg>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="flow-display-mode"
                        disabled={!canEdit}
                        checked={flowDisplayMode === 'accumulated'}
                        onChange={() => setFlowDisplayMode('accumulated')}
                      />
                      <span>Vazão acumulada</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => {
                      onResetAccumulatedFlow?.(node.id);
                      setFlowResetNotice(true);
                    }}
                    className={`h-6 px-4 border ${btnCls}`}
                  >
                    Restabelecer
                  </button>
                </div>
                {flowResetNotice && (
                  <p className="text-[10.5px] text-sky-600 dark:text-sky-400">
                    Totalizador volumétrico zerado (0.00 l).
                  </p>
                )}
              </div>
            </fieldset>
            {renderResistanceFieldset('Resistência hidráulica')}
            {renderCurvePanel()}
          </>
        )}

        {/* 25. Pressure Switch (Image 3) */}
        {PRESSURE_SWITCH_TYPES.has(node.type) && (
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-[150px_68px_1fr] items-center gap-2">
              <label htmlFor="ps-press" className="text-right">
                Pressão de comutação
              </label>
              <input
                id="ps-press"
                type="number"
                step="any"
                min={pressureUnit === 'MPa' ? 0.0001 : 0.001}
                max={pressureUnit === 'MPa' ? 35 : 350}
                disabled={!canEdit}
                value={pressureVal}
                onChange={(e) => setPressureVal(e.target.value)}
                className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
              />
              <select
                aria-label="Unidade de pressão de comutação"
                value={pressureUnit}
                onChange={(e) => switchPressureUnit(e.target.value as 'MPa' | 'bar')}
                className={`h-6 px-1.5 border ${selectCls}`}
              >
                <option value="MPa">MPa (0.0001..35)</option>
                <option value="bar">bar (0.001..350)</option>
              </select>
            </div>

            <div className="grid grid-cols-[150px_1fr] items-center gap-2">
              <label htmlFor="ps-marca" className="text-right">
                Marca
              </label>
              <input
                id="ps-marca"
                type="text"
                disabled={!canEdit}
                value={markPrimary}
                onChange={(e) => setMarkPrimary(e.target.value)}
                className={`w-[164px] h-6 px-1.5 border outline-none ${inputCls}`}
              />
            </div>

            <fieldset className={fieldsetCls}>
              <legend className="px-1 text-[11.5px]">Componente correspondente do circuito elétrico:</legend>
              <div className="flex items-center justify-center gap-6 py-1">
                <div className="w-[104px] h-[54px] bg-white border border-slate-300 flex items-center justify-center">
                  <svg viewBox="0 0 100 50" className="w-full h-full">
                    <line x1={22} y1={8} x2={22} y2={17} stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={18} y1={17} x2={22} y2={31} stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={22} y1={31} x2={22} y2={42} stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={48} y1={8} x2={48} y2={17} stroke="#0F172A" strokeWidth={1.3} />
                    <polyline points="48,17 53,17 48,31" fill="none" stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={48} y1={31} x2={48} y2={42} stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={74} y1={8} x2={74} y2={17} stroke="#0F172A" strokeWidth={1.3} />
                    <polyline points="74,17 68,31 68,42" fill="none" stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={82} y1={30} x2={82} y2={42} stroke="#0F172A" strokeWidth={1.3} />
                  </svg>
                </div>

                <div className="w-[104px] h-[54px] bg-white border border-slate-300 flex items-center justify-center">
                  <svg viewBox="0 0 100 50" className="w-full h-full">
                    <line x1={46} y1={2} x2={46} y2={9} stroke="#0F172A" strokeWidth={1.2} />
                    <line x1={46} y1={41} x2={46} y2={48} stroke="#0F172A" strokeWidth={1.2} />
                    <rect x={28} y={9} width={36} height={32} fill="none" stroke="#0F172A" strokeWidth={1.2} />
                    <polygon points="46,12 52,18 46,24 40,18" fill="none" stroke="#0F172A" strokeWidth={1.1} />
                    <text x={33} y={35} fontSize={10} fontWeight={700} fill="#0F172A">P</text>
                    <line x1={40} y1={35} x2={49} y2={29} stroke="#0F172A" strokeWidth={1.2} />
                    <line x1={49} y1={35} x2={59} y2={35} stroke="#0F172A" strokeWidth={1.2} />
                    <polyline points="64,29 70,29 70,21 76,21 76,29" fill="none" stroke="#0F172A" strokeWidth={1.1} />
                  </svg>
                </div>
              </div>
            </fieldset>
          </div>
        )}

        {/* 26. Flow Caudal Sensor / Tachometer (Images 4 & 5) */}
        {FLOW_CAUDAL_TYPES.has(node.type) && (
          <div className="grid grid-cols-[1fr_74px] items-start gap-3 py-1">
            <div className="space-y-2.5">
              <div className="grid grid-cols-[136px_74px_1fr] items-center gap-2">
                <label htmlFor="fc-disp" className="text-right">
                  Deslocamento
                </label>
                <input
                  id="fc-disp"
                  type="number"
                  step="any"
                  min={dispUnit === 'l' ? 0.001 : 1}
                  max={dispUnit === 'l' ? 5 : 5000}
                  disabled={!canEdit}
                  value={dispVal}
                  onChange={(e) => setDispVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select
                  aria-label="Unidade de deslocamento"
                  value={dispUnit}
                  onChange={(e) => switchDispUnit(e.target.value as 'l' | 'cm3')}
                  className={`h-6 px-1.5 border ${selectCls}`}
                >
                  <option value="l">l (0.001..5)</option>
                  <option value="cm3">cm³ (1..5000)</option>
                </select>
              </div>

              <div className="grid grid-cols-[136px_74px_1fr] items-center gap-2">
                <label htmlFor="fc-fric" className="text-right">
                  Atrito
                </label>
                <input
                  id="fc-fric"
                  type="number"
                  step="any"
                  min={0.001}
                  max={100}
                  disabled={!canEdit}
                  value={frictionVal}
                  onChange={(e) => setFrictionVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select aria-label="Unidade de atrito" defaultValue="nmsrad" className={`h-6 px-1.5 border ${selectCls}`}>
                  <option value="nmsrad">N*m*s/rad (0.001..100)</option>
                </select>
              </div>

              <div className="grid grid-cols-[136px_74px_1fr] items-center gap-2">
                <label htmlFor="fc-inertia" className="text-right">
                  Momento de inércia
                </label>
                <input
                  id="fc-inertia"
                  type="number"
                  step="any"
                  min={0.0001}
                  max={1}
                  disabled={!canEdit}
                  value={inertiaVal}
                  onChange={(e) => setInertiaVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select aria-label="Unidade de momento de inércia" defaultValue="kgm2" className={`h-6 px-1.5 border ${selectCls}`}>
                  <option value="kgm2">kg*m^2 (0.0001..1)</option>
                </select>
              </div>

              <div className="grid grid-cols-[136px_74px_1fr] items-center gap-2">
                <label htmlFor="fc-torque" className="text-right">
                  Torque externo
                </label>
                <input
                  id="fc-torque"
                  type="number"
                  step="any"
                  min={-1000}
                  max={1000}
                  disabled={!canEdit}
                  value={torqueVal}
                  onChange={(e) => setTorqueVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select aria-label="Unidade de torque externo" defaultValue="nm" className={`h-6 px-1.5 border ${selectCls}`}>
                  <option value="nm">Nm (-1000..1000)</option>
                </select>
              </div>
            </div>

            {/* Flow Meter Rotary Symbol Badge (Image 5) */}
            <div
              title="Medidor de caudal"
              className="w-[72px] h-[54px] bg-slate-200 border border-slate-400 flex items-center justify-center shrink-0 mt-1"
            >
              <svg viewBox="0 0 72 54" className="w-full h-full">
                <circle cx={19} cy={6} r={2.2} fill="none" stroke="#0F172A" strokeWidth={1.1} />
                <circle cx={19} cy={48} r={2.2} fill="none" stroke="#0F172A" strokeWidth={1.1} />
                <line x1={19} y1={8.2} x2={19} y2={14} stroke="#0F172A" strokeWidth={1.2} />
                <line x1={19} y1={40} x2={19} y2={45.8} stroke="#0F172A" strokeWidth={1.2} />
                <circle cx={19} cy={27} r={13} fill="none" stroke="#0F172A" strokeWidth={1.2} />
                <polygon points="19,21 15,14 23,14" fill="#0F172A" />
                <polygon points="19,33 15,40 23,40" fill="#0F172A" />
                <line x1={32} y1={24} x2={44} y2={24} stroke="#0F172A" strokeWidth={1.2} />
                <line x1={32} y1={30} x2={44} y2={30} stroke="#0F172A" strokeWidth={1.2} />
                <path d="M37,16 A7,7 0 0,1 37,38" fill="none" stroke="#0F172A" strokeWidth={1} />
                <rect x={44} y={14} width={22} height={26} fill="none" stroke="#0F172A" strokeWidth={1.2} />
                <circle cx={55} cy={27} r={7.5} fill="none" stroke="#0F172A" strokeWidth={1.1} />
              </svg>
            </div>
          </div>
        )}

        {/* 27. Electrical DC / Stepper Motor (Image 7) */}
        {(node.type === 'elec_dc_motor' || node.type === 'elec_stepper_motor') && (
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-[150px_68px_1fr] items-center gap-2">
              <label htmlFor="dcm-rpm" className="text-right">
                Revoluções em vazio
              </label>
              <input
                id="dcm-rpm"
                type="number"
                step="any"
                min={speedUnit === 'rpm' ? 10 : 0.16}
                max={speedUnit === 'rpm' ? 20000 : 333.3}
                disabled={!canEdit}
                value={noLoadRpmVal}
                onChange={(e) => setNoLoadRpmVal(e.target.value)}
                className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
              />
              <select
                aria-label="Unidade de rotações em vazio"
                value={speedUnit}
                onChange={(e) => switchSpeedUnit(e.target.value as 'rpm' | 'rps')}
                className={`h-6 px-1.5 border ${selectCls}`}
              >
                <option value="rpm">1/min (10..20000)</option>
                <option value="rps">1/s (0.16..333.3)</option>
              </select>
            </div>

            <div className="grid grid-cols-[150px_68px_1fr] items-center gap-2">
              <label htmlFor="dcm-torque" className="text-right">
                Torque
              </label>
              <input
                id="dcm-torque"
                type="number"
                step="any"
                min={0}
                max={motorTorqueUnit === 'Nm' ? 20 : 20000}
                disabled={!canEdit}
                value={torqueVal}
                onChange={(e) => setTorqueVal(e.target.value)}
                className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
              />
              <select
                aria-label="Unidade de torque do motor elétrico"
                value={motorTorqueUnit}
                onChange={(e) => switchMotorTorqueUnit(e.target.value as 'Nm' | 'mNm')}
                className={`h-6 px-1.5 border ${selectCls}`}
              >
                <option value="Nm">Nm (0..20)</option>
                <option value="mNm">mNm (0..20000)</option>
              </select>
            </div>
          </div>
        )}

        {/* 27b. Electrical Solenoid Actuator */}
        {node.type === 'elec_solenoid_act' && (
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-[150px_1fr] items-center gap-3">
              <label htmlFor="esol-marca" className="text-right">
                Marca
              </label>
              <input
                id="esol-marca"
                type="text"
                disabled={!canEdit}
                value={markPrimary}
                onChange={(e) => setMarkPrimary(e.target.value)}
                className={`w-[164px] h-6 px-1.5 border outline-none ${inputCls}`}
              />
            </div>
          </div>
        )}

        {/* 28. Function Generator (Image 8) */}
        {node.type === 'elec_func_gen' && (
          <>
            <fieldset className={fieldsetCls}>
              <legend className="px-1 text-[11.5px]">Tipo de sinal</legend>
              <div className="space-y-2 py-0.5 px-2">
                <div className="grid grid-cols-[138px_1fr] items-center gap-3">
                  <div className="h-[26px] bg-white border border-slate-300 flex items-center justify-center">
                    <svg viewBox="0 0 110 22" className="w-full h-full">
                      <line x1={12} y1={11} x2={98} y2={11} stroke="#0F172A" strokeWidth={1.3} />
                    </svg>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="func-gen-wave"
                      disabled={!canEdit}
                      checked={funcGenWaveform === 'constant'}
                      onChange={() => setFuncGenWaveform('constant')}
                    />
                    <span>Constante</span>
                  </label>
                </div>

                <div className="grid grid-cols-[138px_1fr] items-center gap-3">
                  <div className="h-[26px] bg-white border border-slate-300 flex items-center justify-center">
                    <svg viewBox="0 0 110 22" className="w-full h-full">
                      <polyline
                        points="12,18 22,18 22,4 38,4 38,18 54,18 54,4 70,4 70,18 86,18 86,4 98,4"
                        fill="none"
                        stroke="#0F172A"
                        strokeWidth={1.2}
                      />
                    </svg>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="func-gen-wave"
                      disabled={!canEdit}
                      checked={funcGenWaveform === 'square'}
                      onChange={() => setFuncGenWaveform('square')}
                    />
                    <span>Retângulo</span>
                  </label>
                </div>

                <div className="grid grid-cols-[138px_1fr] items-center gap-3">
                  <div className="h-[26px] bg-white border border-slate-300 flex items-center justify-center">
                    <svg viewBox="0 0 110 22" className="w-full h-full">
                      <path
                        d="M12,11 Q23,-3 34,11 T56,11 T78,11 T100,11"
                        fill="none"
                        stroke="#0F172A"
                        strokeWidth={1.2}
                      />
                    </svg>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="func-gen-wave"
                      disabled={!canEdit}
                      checked={funcGenWaveform === 'sine'}
                      onChange={() => setFuncGenWaveform('sine')}
                    />
                    <span>Seno</span>
                  </label>
                </div>

                <div className="grid grid-cols-[138px_1fr] items-center gap-3">
                  <div className="h-[26px] bg-white border border-slate-300 flex items-center justify-center">
                    <svg viewBox="0 0 110 22" className="w-full h-full">
                      <polyline
                        points="12,18 24,4 36,18 48,4 60,18 72,4 84,18 96,4"
                        fill="none"
                        stroke="#0F172A"
                        strokeWidth={1.2}
                      />
                    </svg>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="func-gen-wave"
                      disabled={!canEdit}
                      checked={funcGenWaveform === 'triangle'}
                      onChange={() => setFuncGenWaveform('triangle')}
                    />
                    <span>Triângulo</span>
                  </label>
                </div>

                <div className="grid grid-cols-[138px_1fr] items-center gap-3">
                  <button
                    type="button"
                    disabled={!canEdit || funcGenWaveform !== 'profile'}
                    onClick={() => setShowProfileNote((v) => !v)}
                    className={`h-6 px-2 border disabled:opacity-50 ${btnCls}`}
                  >
                    Editar perfil...
                  </button>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="func-gen-wave"
                      disabled={!canEdit}
                      checked={funcGenWaveform === 'profile'}
                      onChange={() => setFuncGenWaveform('profile')}
                    />
                    <span>Perfil de tensão</span>
                  </label>
                </div>
                {showProfileNote && funcGenWaveform === 'profile' && (
                  <p className="text-[10.5px] text-sky-600 dark:text-sky-400">
                    Perfil de tensão definido pelos parâmetros de Amplitude e Deslocamento y ao longo do ciclo.
                  </p>
                )}
              </div>
            </fieldset>

            <fieldset className={fieldsetCls}>
              <legend className="px-1 text-[11.5px]">Parâmetros de sinal</legend>
              <div className="space-y-2.5">
                <div className="grid grid-cols-[100px_54px_76px_1fr] items-center gap-2">
                  <label htmlFor="fg-freq" className="text-right">
                    Frequência
                  </label>
                  <input
                    id="fg-freq"
                    type="number"
                    step="any"
                    min={0}
                    max={100}
                    disabled={!canEdit}
                    value={funcGenFreqVal}
                    onChange={(e) =>
                      setFuncGenFreqVal(Math.min(100, Math.max(0, Number.parseFloat(e.target.value) || 0)))
                    }
                    className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                  />
                  <span className="text-[11px]">Hz (0..100)</span>
                  <input
                    aria-label="Controle deslizante de frequência"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    disabled={!canEdit}
                    value={funcGenFreqVal}
                    onChange={(e) => setFuncGenFreqVal(Number(e.target.value))}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-[100px_54px_76px_1fr] items-center gap-2">
                  <label htmlFor="fg-amp" className="text-right">
                    Amplitude
                  </label>
                  <input
                    id="fg-amp"
                    type="number"
                    step="any"
                    min={0}
                    max={10}
                    disabled={!canEdit}
                    value={funcGenAmpVal}
                    onChange={(e) =>
                      setFuncGenAmpVal(Math.min(10, Math.max(0, Number.parseFloat(e.target.value) || 0)))
                    }
                    className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                  />
                  <span className="text-[11px]">V (0..10)</span>
                  <input
                    aria-label="Controle deslizante de amplitude"
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    disabled={!canEdit}
                    value={funcGenAmpVal}
                    onChange={(e) => setFuncGenAmpVal(Number(e.target.value))}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-[100px_54px_76px_1fr] items-center gap-2">
                  <label htmlFor="fg-off" className="text-right">
                    deslocamento y
                  </label>
                  <input
                    id="fg-off"
                    type="number"
                    step="any"
                    min={-10}
                    max={10}
                    disabled={!canEdit}
                    value={funcGenOffsetVal}
                    onChange={(e) =>
                      setFuncGenOffsetVal(Math.min(10, Math.max(-10, Number.parseFloat(e.target.value) || 0)))
                    }
                    className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                  />
                  <span className="text-[11px]">V (-10..10)</span>
                  <input
                    aria-label="Controle deslizante de deslocamento y"
                    type="range"
                    min={-10}
                    max={10}
                    step={0.5}
                    disabled={!canEdit}
                    value={funcGenOffsetVal}
                    onChange={(e) => setFuncGenOffsetVal(Number(e.target.value))}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                </div>
              </div>
            </fieldset>
          </>
        )}

        {/* 29. Setpoint Value Card (Images 9 & 10) */}
        {node.type === 'elec_setpoint_card' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <fieldset className={`${fieldsetCls} min-w-0`}>
              <legend className="px-1 text-[11.5px]">Pontos de consignação</legend>
              <div className="space-y-1.5">
                {Array.from({ length: 8 }, (_, idx) => {
                  const isFirst = idx === 0;
                  const checked = isFirst ? true : Boolean(setpointEnabled[idx]);
                  return (
                    <div key={idx} className="grid grid-cols-[26px_minmax(0,1fr)_64px_18px] items-center gap-1.5">
                      <label htmlFor={`sp-w-${idx + 1}`} className="font-mono">
                        W{idx + 1}
                      </label>
                      <input
                        id={`sp-w-${idx + 1}`}
                        type="number"
                        step="any"
                        min={-10}
                        max={10}
                        disabled={!canEdit || !checked}
                        value={setpointValues[idx] ?? '0'}
                        onChange={(e) =>
                          setSetpointValues((prev) =>
                            prev.map((v, i) => (i === idx ? e.target.value : v))
                          )
                        }
                        className={`w-full min-w-0 h-6 px-1.5 text-right font-mono border outline-none ${inputCls} disabled:opacity-45`}
                      />
                      <span className="text-[10.5px] whitespace-nowrap">(-10..10 V)</span>
                      <input
                        type="checkbox"
                        aria-label={`Habilitar W${idx + 1}`}
                        disabled={!canEdit || isFirst}
                        checked={checked}
                        onChange={(e) =>
                          setSetpointEnabled((prev) =>
                            prev.map((v, i) => (i === idx ? e.target.checked : v))
                          )
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </fieldset>

            <div className="space-y-2.5 min-w-0">
              <fieldset className={`${fieldsetCls} min-w-0`}>
                <legend className="px-1 text-[11.5px]">Rampas</legend>
                <div className="space-y-1.5">
                  {Array.from({ length: 4 }, (_, idx) => (
                    <div key={idx} className="grid grid-cols-[24px_minmax(0,1fr)_72px] items-center gap-1.5">
                      <label htmlFor={`sp-r-${idx + 1}`} className="font-mono">
                        R{idx + 1}
                      </label>
                      <input
                        id={`sp-r-${idx + 1}`}
                        type="number"
                        step="any"
                        min={0}
                        max={10}
                        disabled={!canEdit}
                        value={setpointRamps[idx] ?? '0'}
                        onChange={(e) =>
                          setSetpointRamps((prev) =>
                            prev.map((v, i) => (i === idx ? e.target.value : v))
                          )
                        }
                        className={`w-full min-w-0 h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                      />
                      <span className="text-[10.5px] whitespace-nowrap">(0..10 s / V)</span>
                    </div>
                  ))}
                </div>
              </fieldset>

              <fieldset className={`${fieldsetCls} min-w-0`}>
                <legend className="px-1 text-[11.5px]">Modo de funcionamento</legend>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sp-op-mode"
                      disabled={!canEdit}
                      checked={setpointMode === 'wait_time'}
                      onChange={() => setSetpointMode('wait_time')}
                    />
                    <span>Esperar tempo de comutação</span>
                  </label>
                  <div className="flex items-center gap-2 pl-5">
                    <input
                      aria-label="Tempo de comutação (s)"
                      type="number"
                      step="any"
                      min={0.01}
                      max={100}
                      disabled={!canEdit || setpointMode !== 'wait_time'}
                      value={setpointTimeVal}
                      onChange={(e) => setSetpointTimeVal(e.target.value)}
                      className={`w-[78px] h-6 px-1.5 text-right font-mono border outline-none ${inputCls} disabled:opacity-50`}
                    />
                    <span className="text-[11px]">(0.01..100 s)</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sp-op-mode"
                      disabled={!canEdit}
                      checked={setpointMode === 'advance'}
                      onChange={() => setSetpointMode('advance')}
                    />
                    <span>Avançar pontos de consignação</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sp-op-mode"
                      disabled={!canEdit}
                      checked={setpointMode === 'external'}
                      onChange={() => setSetpointMode('external')}
                    />
                    <span>Controle externo</span>
                  </label>
                </div>
              </fieldset>
            </div>
          </div>
        )}

        {/* 30. Starting Current Limiter (elec_limiter - image_9dc276a0.png) */}
        {node.type === 'elec_limiter' && (
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-[150px_76px_1fr] items-center gap-2">
              <label htmlFor="lim-dur" className="text-right">
                Duração
              </label>
              <input
                id="lim-dur"
                type="number"
                step={1}
                min={1}
                max={10000}
                disabled={!canEdit}
                value={inrushDurationVal}
                onChange={(e) => setInrushDurationVal(e.target.value)}
                className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
              />
              <span>(1..10000 ms)</span>
            </div>

            <div className="grid grid-cols-[150px_76px_1fr] items-center gap-2">
              <label htmlFor="lim-curr" className="text-right">
                Limite de corrente
              </label>
              <input
                id="lim-curr"
                type="number"
                step="any"
                min={0.1}
                max={100}
                disabled={!canEdit}
                value={currentLimitVal}
                onChange={(e) => setCurrentLimitVal(e.target.value)}
                className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
              />
              <span>(0.1..100 A)</span>
            </div>
          </div>
        )}

        {/* 31. Valve Solenoid (elec_valve_solenoid - image_3cd3ab64.png) */}
        {node.type === 'elec_valve_solenoid' && (
          <div className="space-y-4 pt-2 pb-1">
            <div className="grid grid-cols-[164px_1fr] items-center gap-3">
              <label htmlFor="vsol-marca" className="text-right">
                Marca
              </label>
              <input
                id="vsol-marca"
                type="text"
                disabled={!canEdit}
                value={markPrimary}
                onChange={(e) => setMarkPrimary(e.target.value)}
                className={`w-[156px] h-6 px-1.5 border outline-none ${inputCls}`}
              />
            </div>

            <div className="grid grid-cols-[164px_1fr] items-center gap-3">
              <span className="text-right leading-tight">
                Componente correspondente do circuito pneumático:
              </span>
              <div className="w-[126px] h-[64px] bg-white border border-slate-300 flex items-center justify-center">
                <svg viewBox="0 0 120 56" className="w-full h-full">
                  <rect x={22} y={29} width={22} height={12} fill="none" stroke="#0F172A" strokeWidth={1.3} />
                  <line x1={27} y1={41} x2={37} y2={29} stroke="#0F172A" strokeWidth={1.2} />
                  <rect x={44} y={18} width={28} height={23} fill="none" stroke="#0F172A" strokeWidth={1.3} />
                  <polyline points="92,18 72,18 72,41 92,41" fill="none" stroke="#0F172A" strokeWidth={1.3} />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* 32. Electromechanical Relay (elec_relay) */}
        {node.type === 'elec_relay' && (
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-[150px_1fr] items-center gap-3">
              <label htmlFor="erelay-marca" className="text-right">
                Marca
              </label>
              <input
                id="erelay-marca"
                type="text"
                disabled={!canEdit}
                value={markPrimary}
                onChange={(e) => setMarkPrimary(e.target.value)}
                className={`w-[164px] h-6 px-1.5 border outline-none ${inputCls}`}
              />
            </div>

            <fieldset className={fieldsetCls}>
              <legend className="px-1 text-[11.5px]">Componentes correspondentes do circuito:</legend>
              <div className="flex items-center justify-center gap-6 py-1">
                <div className="w-[108px] h-[52px] bg-white border border-slate-300 flex items-center justify-center">
                  <svg viewBox="0 0 100 48" className="w-full h-full">
                    <line x1={22} y1={6} x2={22} y2={16} stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={17} y1={16} x2={22} y2={31} stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={22} y1={31} x2={22} y2={42} stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={50} y1={6} x2={50} y2={16} stroke="#0F172A" strokeWidth={1.3} />
                    <polyline points="50,16 55,16 50,31" fill="none" stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={50} y1={31} x2={50} y2={42} stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={78} y1={6} x2={78} y2={16} stroke="#0F172A" strokeWidth={1.3} />
                    <polyline points="78,16 72,31 72,42" fill="none" stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={86} y1={30} x2={86} y2={42} stroke="#0F172A" strokeWidth={1.3} />
                  </svg>
                </div>
              </div>
            </fieldset>
          </div>
        )}

        {/* 33. Timer Relays ON/OFF Delay (elec_relay_ton / elec_relay_toff) */}
        {(node.type === 'elec_relay_ton' || node.type === 'elec_relay_toff') && (
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-[150px_76px_1fr] items-center gap-2">
              <label htmlFor="trelay-delay" className="text-right">
                Tempo de retardo
              </label>
              <input
                id="trelay-delay"
                type="number"
                step="any"
                min={0.01}
                max={100}
                disabled={!canEdit}
                value={relayDelayVal}
                onChange={(e) => setRelayDelayVal(e.target.value)}
                className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
              />
              <span>s (0.01..100)</span>
            </div>

            <div className="grid grid-cols-[150px_1fr] items-center gap-2">
              <label htmlFor="trelay-marca" className="text-right">
                Marca
              </label>
              <input
                id="trelay-marca"
                type="text"
                disabled={!canEdit}
                value={markPrimary}
                onChange={(e) => setMarkPrimary(e.target.value)}
                className={`w-[164px] h-6 px-1.5 border outline-none ${inputCls}`}
              />
            </div>

            <fieldset className={fieldsetCls}>
              <legend className="px-1 text-[11.5px]">Componentes correspondentes do circuito:</legend>
              <div className="flex items-center justify-center gap-6 py-1">
                <div className="w-[108px] h-[52px] bg-white border border-slate-300 flex items-center justify-center">
                  <svg viewBox="0 0 100 48" className="w-full h-full">
                    <line x1={34} y1={6} x2={34} y2={16} stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={29} y1={16} x2={34} y2={31} stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={34} y1={31} x2={34} y2={42} stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={20} y1={24} x2={31} y2={24} stroke="#0F172A" strokeWidth={1} strokeDasharray="2 2" />
                    <path d="M22,19 A5,5 0 0,0 22,29" fill="none" stroke="#0F172A" strokeWidth={1} />
                    <line x1={68} y1={6} x2={68} y2={16} stroke="#0F172A" strokeWidth={1.3} />
                    <polyline points="68,16 73,16 68,31" fill="none" stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={68} y1={31} x2={68} y2={42} stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={54} y1={24} x2={69} y2={24} stroke="#0F172A" strokeWidth={1} strokeDasharray="2 2" />
                    <path d="M56,19 A5,5 0 0,0 56,29" fill="none" stroke="#0F172A" strokeWidth={1} />
                  </svg>
                </div>
              </div>
            </fieldset>
          </div>
        )}

        {/* 34. Counter Relay (elec_counter_relay) */}
        {node.type === 'elec_counter_relay' && (
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-[150px_76px_1fr] items-center gap-2">
              <label htmlFor="crelay-preset" className="text-right">
                Valor de pré-seleção
              </label>
              <input
                id="crelay-preset"
                type="number"
                step={1}
                min={0}
                max={9999}
                disabled={!canEdit}
                value={counterPresetVal}
                onChange={(e) => setCounterPresetVal(e.target.value)}
                className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
              />
              <span>(0..9999)</span>
            </div>

            <div className="grid grid-cols-[150px_1fr] items-center gap-2">
              <label htmlFor="crelay-marca" className="text-right">
                Marca
              </label>
              <input
                id="crelay-marca"
                type="text"
                disabled={!canEdit}
                value={markPrimary}
                onChange={(e) => setMarkPrimary(e.target.value)}
                className={`w-[164px] h-6 px-1.5 border outline-none ${inputCls}`}
              />
            </div>

            <fieldset className={fieldsetCls}>
              <legend className="px-1 text-[11.5px]">Componentes correspondentes do circuito:</legend>
              <div className="flex items-center justify-center gap-6 py-1">
                <div className="w-[108px] h-[52px] bg-white border border-slate-300 flex items-center justify-center">
                  <svg viewBox="0 0 100 48" className="w-full h-full">
                    <line x1={34} y1={6} x2={34} y2={16} stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={29} y1={16} x2={34} y2={31} stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={34} y1={31} x2={34} y2={42} stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={68} y1={6} x2={68} y2={16} stroke="#0F172A" strokeWidth={1.3} />
                    <polyline points="68,16 73,16 68,31" fill="none" stroke="#0F172A" strokeWidth={1.3} />
                    <line x1={68} y1={31} x2={68} y2={42} stroke="#0F172A" strokeWidth={1.3} />
                  </svg>
                </div>
              </div>
            </fieldset>
          </div>
        )}

        {/* 35. Electrical Switches, Contacts & Ladder Elements */}
        {ELEC_MARK_TYPES.has(node.type) && (
          <div className="space-y-3 py-1">
            {(node.type === 'ladder_relay_sr' || node.type === 'ladder_relay_sa') && (
              <div className="grid grid-cols-[150px_76px_1fr] items-center gap-2">
                <label htmlFor="ladder-delay" className="text-right">
                  Tempo de retardo
                </label>
                <input
                  id="ladder-delay"
                  type="number"
                  step="any"
                  min={0.01}
                  max={100}
                  disabled={!canEdit}
                  value={relayDelayVal}
                  onChange={(e) => setRelayDelayVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <span>s (0.01..100)</span>
              </div>
            )}

            <div className="grid grid-cols-[150px_1fr] items-center gap-2">
              <label htmlFor="elec-generic-marca" className="text-right">
                Marca
              </label>
              <input
                id="elec-generic-marca"
                type="text"
                disabled={!canEdit}
                placeholder="ex: K1, Y1, S1"
                value={markPrimary}
                onChange={(e) => setMarkPrimary(e.target.value)}
                className={`w-[164px] h-6 px-1.5 border outline-none ${inputCls}`}
              />
            </div>

            <div className="px-2 py-1.5 border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 text-[11px] leading-snug text-slate-600 dark:text-slate-300">
              Associe a mesma marca entre botoeiras/chaves, contatos, relés e solenoides de válvulas direcionais (ex.:{' '}
              <span className="font-mono font-semibold">Y1</span> ou{' '}
              <span className="font-mono font-semibold">K1</span>) para comutar o fluxo automaticamente ao acionar o comando elétrico.
            </div>
          </div>
        )}

        {showHelp && (
          <div
            className={`p-2 border text-[11px] leading-relaxed ${
              isDark
                ? 'bg-slate-950 border-slate-700 text-slate-300'
                : 'bg-sky-50 border-sky-200 text-slate-700'
            }`}
          >
            {getPropertyHelpText(node.type)}
          </div>
        )}

        {/* Footer Buttons: Aceitar / Cancelar / Ajuda */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="submit"
            className={`min-w-[76px] h-6 px-3 border font-medium ${btnCls} ring-1 ring-sky-500/70`}
          >
            Aceitar
          </button>
          <button type="button" onClick={onClose} className={`min-w-[76px] h-6 px-3 border ${btnCls}`}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className={`min-w-[76px] h-6 px-3 border ${btnCls}`}
          >
            Ajuda
          </button>
        </div>
      </form>
    </div>
  );
};
