import React from 'react';
import type { ExtendedComponentType } from '../data/extendedCatalog';
import type { ComponentType } from '../types/circuit';

export interface ExtendedSymbolProps {
  type: ComponentType;
  stroke: string;
  fillBg: string;
  accent: string;
  muted: string;
  active?: boolean;
  label?: string;
  isThumb?: boolean;
  funcGenWaveform?: 'constant' | 'square' | 'sine' | 'triangle' | 'profile';
  relayDelaySec?: number;
  counterPreset?: number;
}

export function getExtendedThumbViewBox(type: ComponentType): string {
  switch (type) {
    case 'dig_mod_16':
    case 'ep_analog_in':
    case 'ep_analog_out':
    case 'ep_port_in':
    case 'ep_port_out':
    case 'other_state_chart':
    case 'other_func_chart':
    case 'other_bar_chart':
    case 'other_parts_list':
    case 'other_rect':
      return '-58 -36 116 72';
    case 'elec_amp_1ch':
    case 'elec_amp_2ch':
    case 'elec_comparator':
    case 'grafcet_action':
    case 'grafcet_sync':
      return '-46 -34 92 68';
    case 'elec_limiter':
      return '-38 -38 80 76';
    default:
      return '-38 -34 76 68';
  }
}

export function renderExtendedSymbolSvg({
  type,
  stroke,
  fillBg,
  accent,
  muted,
  active = false,
  label,
  isThumb = false,
  funcGenWaveform = 'sine',
  relayDelaySec = 5,
  counterPreset = 5,
}: ExtendedSymbolProps): React.ReactNode | null {
  const sw = isThumb ? 1.5 : 1.7;
  const thin = isThumb ? 1.2 : 1.3;
  const activeCol = active ? accent : stroke;

  switch (type as ExtendedComponentType) {
    // =========================================================================
    // 1. VÁLVULAS DE PRESSÃO (10 novas)
    // =========================================================================
    case 'relief_valve_piloted':
      return (
        <g>
          <rect x={-16} y={-14} width={28} height={28} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={-30} x2={0} y2={-14} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={14} x2={0} y2={30} stroke={stroke} strokeWidth={sw} />
          <line x1={-4} y1={-10} x2={-4} y2={11} stroke={activeCol} strokeWidth={sw} />
          <polygon points="-4,11 -7.5,5 -0.5,5" fill={activeCol} />
          <polyline points="0,-21 -23,-21 -23,8 -16,8" fill="none" stroke={stroke} strokeWidth={thin} strokeDasharray="3 2" />
          <rect x={12} y={-8} width={14} height={16} fill={fillBg} stroke={stroke} strokeWidth={thin} />
          <polygon points="24,-4 15,0 24,4" fill={stroke} />
          <path d="M26,-3 L30,0 L26,3" fill="none" stroke={stroke} strokeWidth={thin} />
        </g>
      );

    case 'relief_valve_ext':
      return (
        <g>
          <rect x={-16} y={-14} width={28} height={28} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={-30} x2={0} y2={-14} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={14} x2={0} y2={30} stroke={stroke} strokeWidth={sw} />
          <line x1={-4} y1={-10} x2={-4} y2={11} stroke={activeCol} strokeWidth={sw} />
          <polygon points="-4,11 -7.5,5 -0.5,5" fill={activeCol} />
          <line x1={-36} y1={0} x2={-16} y2={0} stroke={stroke} strokeWidth={thin} strokeDasharray="3 2" />
          <polyline points="0,-21 -23,-21 -23,0" fill="none" stroke={stroke} strokeWidth={thin} strokeDasharray="3 2" />
          <rect x={12} y={-7} width={9} height={14} fill={fillBg} stroke={stroke} strokeWidth={thin} />
          <path d="M21,-4 L24,4 L27,-4 L30,4 L33,-4" fill="none" stroke={stroke} strokeWidth={thin} />
          <line x1={22} y1={9} x2={34} y2={-9} stroke={stroke} strokeWidth={thin} />
          <polygon points="34,-9 29,-7.5 32.5,-4" fill={stroke} />
        </g>
      );

    case 'pressure_reducer_2':
      return (
        <g>
          <rect x={-14} y={-14} width={28} height={28} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={-30} x2={0} y2={-14} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={14} x2={0} y2={30} stroke={stroke} strokeWidth={sw} />
          <line x1={-4} y1={11} x2={-4} y2={-11} stroke={activeCol} strokeWidth={sw} />
          <polygon points="-4,-11 -7.5,-5 -0.5,-5" fill={activeCol} />
          <polyline points="0,-21 -22,-21 -22,6 -14,6" fill="none" stroke={stroke} strokeWidth={thin} strokeDasharray="3 2" />
          <path d="M14,-4 L17,4 L20,-4 L23,4 L26,-4" fill="none" stroke={stroke} strokeWidth={thin} />
        </g>
      );

    case 'pressure_reducer_3':
      return (
        <g>
          <rect x={-14} y={-14} width={28} height={28} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={-30} x2={0} y2={-14} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={14} x2={0} y2={30} stroke={stroke} strokeWidth={sw} />
          <line x1={-34} y1={14} x2={-14} y2={14} stroke={stroke} strokeWidth={thin} />
          <line x1={-4} y1={11} x2={-4} y2={-11} stroke={activeCol} strokeWidth={sw} />
          <polygon points="-4,-11 -7.5,-5 -0.5,-5" fill={activeCol} />
          <polyline points="0,-21 -22,-21 -22,4 -14,4" fill="none" stroke={stroke} strokeWidth={thin} strokeDasharray="3 2" />
          <path d="M14,-4 L17,4 L20,-4 L23,4 L26,-4" fill="none" stroke={stroke} strokeWidth={thin} />
          <line x1={15} y1={8} x2={28} y2={-8} stroke={stroke} strokeWidth={thin} />
          <polygon points="28,-8 23,-6.5 26.5,-3" fill={stroke} />
        </g>
      );

    case 'pressure_compensator_b':
      return (
        <g>
          <rect x={-14} y={-14} width={28} height={28} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={-30} x2={0} y2={-14} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={14} x2={0} y2={30} stroke={stroke} strokeWidth={sw} />
          <line x1={-4} y1={11} x2={-4} y2={-11} stroke={activeCol} strokeWidth={sw} />
          <polygon points="-4,-11 -7.5,-5 -0.5,-5" fill={activeCol} />
          <line x1={-34} y1={0} x2={-14} y2={0} stroke={stroke} strokeWidth={thin} strokeDasharray="3 2" />
          <path d="M14,-4 L17,4 L20,-4 L23,4 L26,-4" fill="none" stroke={stroke} strokeWidth={thin} />
        </g>
      );

    case 'pressure_compensator_c':
      return (
        <g>
          <rect x={-14} y={-14} width={28} height={28} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={-30} x2={0} y2={-14} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={14} x2={0} y2={30} stroke={stroke} strokeWidth={sw} />
          <line x1={-4} y1={11} x2={-4} y2={-11} stroke={activeCol} strokeWidth={sw} />
          <polygon points="-4,-11 -7.5,-5 -0.5,-5" fill={activeCol} />
          <line x1={-34} y1={0} x2={-14} y2={0} stroke={stroke} strokeWidth={thin} strokeDasharray="3 2" />
          <path d="M14,-4 L17,4 L20,-4 L23,4 L26,-4" fill="none" stroke={stroke} strokeWidth={thin} />
          <line x1={14} y1={9} x2={28} y2={9} stroke={stroke} strokeWidth={thin} strokeDasharray="3 2" />
        </g>
      );

    case 'pressure_compensator_d':
      return (
        <g>
          <rect x={-14} y={-14} width={28} height={28} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={-30} x2={0} y2={-14} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={14} x2={0} y2={30} stroke={stroke} strokeWidth={sw} />
          <line x1={-4} y1={11} x2={-4} y2={-11} stroke={activeCol} strokeWidth={sw} />
          <polygon points="-4,-11 -7.5,-5 -0.5,-5" fill={activeCol} />
          <polyline points="0,21 -26,21 -26,-2 -14,-2" fill="none" stroke={stroke} strokeWidth={thin} strokeDasharray="3 2" />
          <line x1={-34} y1={5} x2={-14} y2={5} stroke={stroke} strokeWidth={thin} strokeDasharray="3 2" />
          <path d="M14,-4 L17,4 L20,-4 L23,4 L26,-4" fill="none" stroke={stroke} strokeWidth={thin} />
          <line x1={14} y1={9} x2={28} y2={9} stroke={stroke} strokeWidth={thin} strokeDasharray="3 2" />
        </g>
      );

    case 'cartridge_valve_a':
      return (
        <g>
          <line x1={0} y1={-34} x2={0} y2={-24} stroke={stroke} strokeWidth={sw} />
          <rect x={-12} y={-24} width={24} height={34} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <path d="M-7,-20 L7,-17 L-7,-14 L7,-11 L-7,-8" fill="none" stroke={stroke} strokeWidth={thin} />
          <line x1={-12} y1={-5} x2={12} y2={-5} stroke={stroke} strokeWidth={sw} />
          <polygon points="-12,10 12,10 0,24" fill={fillBg} stroke={activeCol} strokeWidth={sw} />
          <line x1={0} y1={24} x2={0} y2={34} stroke={stroke} strokeWidth={sw} />
          <line x1={12} y1={12} x2={30} y2={12} stroke={stroke} strokeWidth={sw} />
        </g>
      );

    case 'cartridge_valve_b':
      return (
        <g>
          <line x1={0} y1={-34} x2={0} y2={-24} stroke={stroke} strokeWidth={sw} />
          <rect x={-12} y={-24} width={24} height={34} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <path d="M-7,-20 L7,-17 L-7,-14 L7,-11 L-7,-8" fill="none" stroke={stroke} strokeWidth={thin} />
          <line x1={-12} y1={-5} x2={12} y2={-5} stroke={stroke} strokeWidth={sw} />
          <polygon points="-12,10 12,10 0,24" fill={fillBg} stroke={activeCol} strokeWidth={sw} />
          <line x1={0} y1={18} x2={0} y2={34} stroke={stroke} strokeWidth={sw} />
          <line x1={12} y1={12} x2={30} y2={12} stroke={stroke} strokeWidth={sw} />
        </g>
      );

    case 'cartridge_valve_c':
      return (
        <g>
          <line x1={0} y1={-34} x2={0} y2={-24} stroke={stroke} strokeWidth={sw} />
          <rect x={-12} y={-24} width={24} height={46} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <path d="M-7,-20 L7,-17 L-7,-14 L7,-11 L-7,-8" fill="none" stroke={stroke} strokeWidth={thin} />
          <line x1={-12} y1={-4} x2={12} y2={-4} stroke={stroke} strokeWidth={sw} />
          <line x1={-12} y1={6} x2={12} y2={6} stroke={stroke} strokeWidth={sw} />
          <line x1={-12} y1={15} x2={12} y2={15} stroke={stroke} strokeWidth={thin} />
          <line x1={0} y1={22} x2={0} y2={34} stroke={stroke} strokeWidth={sw} />
          <line x1={12} y1={10} x2={30} y2={10} stroke={stroke} strokeWidth={sw} />
        </g>
      );

    // =========================================================================
    // 2. COMPONENTES ELÉTRICOS — ATUADORES
    // =========================================================================
    case 'elec_solenoid_act':
      return (
        <g>
          <line x1={0} y1={-28} x2={0} y2={-12} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={12} x2={0} y2={28} stroke={stroke} strokeWidth={sw} />
          <rect x={-16} y={-12} width={32} height={24} fill={active ? (accent + '22') : fillBg} stroke={activeCol} strokeWidth={sw} />
          <line x1={-16} y1={12} x2={16} y2={-12} stroke={activeCol} strokeWidth={thin} />
          <line x1={16} y1={0} x2={28} y2={0} stroke={stroke} strokeWidth={thin} strokeDasharray="3 2" />
          <polygon points="28,0 23,-3 23,3" fill={stroke} />
        </g>
      );

    case 'elec_dc_motor':
      return (
        <g>
          <line x1={0} y1={-28} x2={0} y2={-16} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={16} x2={0} y2={28} stroke={stroke} strokeWidth={sw} />
          <circle cx={0} cy={0} r={16} fill={fillBg} stroke={activeCol} strokeWidth={sw} />
          <text x={0} y={3} textAnchor="middle" fontSize={12} fontWeight={700} fill={activeCol}>M</text>
          <line x1={-6} y1={8} x2={6} y2={8} stroke={activeCol} strokeWidth={thin} />
        </g>
      );

    case 'elec_stepper_motor':
      return (
        <g>
          <line x1={0} y1={-28} x2={0} y2={-16} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={16} x2={0} y2={28} stroke={stroke} strokeWidth={sw} />
          <circle cx={0} cy={0} r={16} fill={fillBg} stroke={activeCol} strokeWidth={sw} />
          <text x={0} y={2} textAnchor="middle" fontSize={10} fontWeight={700} fill={activeCol}>M~</text>
          <polyline points="-7,9 -3,9 -3,6 3,6 3,9 7,9" fill="none" stroke={accent} strokeWidth={thin} />
        </g>
      );

    // =========================================================================
    // 3. COMPONENTES ELÉTRICOS — ALIMENTAÇÃO DE TENSÃO
    // =========================================================================
    case 'elec_0v':
    case 'elec_24v':
      return (
        <g>
          <text x={-4} y={-6} textAnchor="middle" fontSize={12} fontWeight={600} fill={stroke}>
            {type === 'elec_24v' ? '+24V' : '0V'}
          </text>
          <circle cx={-8} cy={4} r={4.5} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <line x1={-3.5} y1={4} x2={26} y2={4} stroke={stroke} strokeWidth={sw} />
        </g>
      );

    case 'elec_func_gen':
      return (
        <g>
          <rect x={-26} y={-14} width={52} height={28} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <line x1={-34} y1={-10} x2={-26} y2={-10} stroke={stroke} strokeWidth={thin} />
          <line x1={-34} y1={10} x2={-26} y2={10} stroke={stroke} strokeWidth={thin} />
          <line x1={26} y1={0} x2={34} y2={0} stroke={stroke} strokeWidth={sw} />
          <rect x={-19} y={-8} width={38} height={16} fill="none" stroke={stroke} strokeWidth={thin} />
          {funcGenWaveform === 'constant' && (
            <line x1={-15} y1={0} x2={15} y2={0} stroke={accent} strokeWidth={thin} />
          )}
          {funcGenWaveform === 'square' && (
            <polyline points="-15,4 -11,4 -11,-4 -3,-4 -3,4 5,4 5,-4 13,-4 13,4" fill="none" stroke={accent} strokeWidth={thin} />
          )}
          {funcGenWaveform === 'triangle' && (
            <polyline points="-15,4 -9,-4 -3,4 3,-4 9,4 15,-4" fill="none" stroke={accent} strokeWidth={thin} />
          )}
          {(funcGenWaveform === 'sine' || funcGenWaveform === 'profile') && (
            <path d="M-15,0 Q-9,-8 -3,0 T9,0 T15,0" fill="none" stroke={accent} strokeWidth={thin} />
          )}
        </g>
      );

    case 'elec_setpoint_card':
      return (
        <g>
          <rect x={-24} y={-18} width={48} height={36} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <line x1={-34} y1={0} x2={-24} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={24} y1={0} x2={34} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={-18} y1={0} x2={18} y2={0} stroke={muted} strokeWidth={1} />
          <line x1={0} y1={-14} x2={0} y2={14} stroke={muted} strokeWidth={1} />
          <polyline points="-14,10 -6,10 6,-10 14,-10" fill="none" stroke={accent} strokeWidth={sw} />
        </g>
      );

    // =========================================================================
    // 4. COMPONENTES ELÉTRICOS — SENSORES E INSTRUMENTOS DE MEDIDA
    // =========================================================================
    case 'elec_pressure_switch':
      return (
        <g>
          <line x1={-34} y1={0} x2={-22} y2={0} stroke={stroke} strokeWidth={thin} strokeDasharray="3 2" />
          <rect x={-22} y={-18} width={44} height={36} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={-28} x2={0} y2={-18} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={18} x2={0} y2={28} stroke={stroke} strokeWidth={sw} />
          <polygon points="0,-14 7,-7 0,0 -7,-7" fill="none" stroke={stroke} strokeWidth={thin} />
          <text x={-13} y={13} fontSize={9} fontWeight={700} fill={stroke}>P</text>
          <line x1={-6} y1={12} x2={4} y2={7} stroke={activeCol} strokeWidth={sw} />
          <line x1={4} y1={12} x2={14} y2={12} stroke={stroke} strokeWidth={sw} />
          <polyline points="22,6 28,6 28,-2 33,-2 33,6" fill="none" stroke={stroke} strokeWidth={thin} />
        </g>
      );

    case 'elec_pressure_transducer':
      return (
        <g>
          <line x1={-34} y1={0} x2={-18} y2={0} stroke={stroke} strokeWidth={thin} strokeDasharray="3 2" />
          <polygon points="-18,0 -23,-3 -23,3" fill={stroke} />
          <rect x={-18} y={-18} width={36} height={36} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <line x1={-18} y1={18} x2={18} y2={-18} stroke={stroke} strokeWidth={thin} />
          <polygon points="-12,-12 -4,-12 -8,-6" fill="none" stroke={stroke} strokeWidth={thin} />
          <path d="M-2,13 Q6,4 13,13" fill="none" stroke={accent} strokeWidth={thin} />
          <line x1={18} y1={0} x2={34} y2={0} stroke={stroke} strokeWidth={sw} />
        </g>
      );

    case 'elec_flow_transducer':
      return (
        <g>
          <line x1={-34} y1={0} x2={-18} y2={0} stroke={stroke} strokeWidth={thin} strokeDasharray="3 2" />
          <polygon points="-18,0 -23,-3 -23,3" fill={stroke} />
          <rect x={-18} y={-18} width={36} height={36} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <line x1={-18} y1={18} x2={18} y2={-18} stroke={stroke} strokeWidth={thin} />
          <path d="M-13,-13 Q-6,-8 1,-13" fill="none" stroke={stroke} strokeWidth={thin} />
          <path d="M-13,-5 Q-6,-10 1,-5" fill="none" stroke={stroke} strokeWidth={thin} />
          <path d="M-2,13 Q6,4 13,13" fill="none" stroke={accent} strokeWidth={thin} />
          <line x1={18} y1={0} x2={34} y2={0} stroke={stroke} strokeWidth={sw} />
        </g>
      );

    case 'elec_ammeter':
    case 'elec_voltmeter':
      return (
        <g>
          <line x1={0} y1={-28} x2={0} y2={-15} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={15} x2={0} y2={28} stroke={stroke} strokeWidth={sw} />
          <circle cx={0} cy={0} r={15} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <text x={0} y={4.5} textAnchor="middle" fontSize={14} fontWeight={700} fill={accent}>
            {type === 'elec_ammeter' ? 'A' : 'V'}
          </text>
        </g>
      );

    case 'elec_encoder':
      return (
        <g>
          <line x1={0} y1={-29} x2={0} y2={-20} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={20} x2={0} y2={29} stroke={stroke} strokeWidth={sw} />
          <line x1={22} y1={0} x2={34} y2={0} stroke={stroke} strokeWidth={sw} />
          <rect x={-22} y={-20} width={44} height={40} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <polygon points="-18,-14 -4,-7 -18,0" fill="none" stroke={stroke} strokeWidth={thin} />
          <text x={-13} y={-5} fontSize={6.5} fill={stroke}>10V</text>
          <rect x={6} y={-10} width={8} height={22} fill="none" stroke={stroke} strokeWidth={thin} />
          <line x1={14} y1={0} x2={22} y2={0} stroke={accent} strokeWidth={sw} />
          <polygon points="14,0 18,-3 18,3" fill={accent} />
        </g>
      );

    case 'elec_lamp':
      return (
        <g>
          <line x1={0} y1={-28} x2={0} y2={-13} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={13} x2={0} y2={28} stroke={stroke} strokeWidth={sw} />
          <circle cx={0} cy={0} r={13} fill={active ? '#FEF08A' : fillBg} stroke={active ? '#CA8A04' : stroke} strokeWidth={sw} />
          <line x1={-9.2} y1={-9.2} x2={9.2} y2={9.2} stroke={active ? '#CA8A04' : stroke} strokeWidth={sw} />
          <line x1={9.2} y1={-9.2} x2={-9.2} y2={9.2} stroke={active ? '#CA8A04' : stroke} strokeWidth={sw} />
        </g>
      );

    case 'elec_buzzer':
      return (
        <g>
          <line x1={0} y1={-28} x2={0} y2={28} stroke={stroke} strokeWidth={sw} />
          <polygon points="0,-6 14,-14 14,14 0,6" fill={active ? accent + '33' : fillBg} stroke={activeCol} strokeWidth={sw} />
        </g>
      );

    // =========================================================================
    // 5. COMPONENTES ELÉTRICOS — RELÉS
    // =========================================================================
    case 'elec_relay':
      return (
        <g>
          <line x1={0} y1={-28} x2={0} y2={-12} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={12} x2={0} y2={28} stroke={stroke} strokeWidth={sw} />
          <rect x={-18} y={-12} width={36} height={24} fill={active ? accent + '22' : fillBg} stroke={activeCol} strokeWidth={sw} />
        </g>
      );

    case 'elec_relay_ton':
      return (
        <g>
          <line x1={0} y1={-28} x2={0} y2={-12} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={12} x2={0} y2={28} stroke={stroke} strokeWidth={sw} />
          <rect x={-26} y={-12} width={52} height={24} fill={fillBg} stroke={activeCol} strokeWidth={sw} />
          <line x1={-10} y1={-12} x2={-10} y2={12} stroke={activeCol} strokeWidth={sw} />
          <line x1={-26} y1={-12} x2={-10} y2={12} stroke={activeCol} strokeWidth={thin} />
          <line x1={-10} y1={-12} x2={-26} y2={12} stroke={activeCol} strokeWidth={thin} />
          <text x={8} y={4} textAnchor="middle" fontSize={11} fontWeight={600} fill={stroke}>
            {Number(relayDelaySec)}
          </text>
        </g>
      );

    case 'elec_relay_toff':
      return (
        <g>
          <line x1={0} y1={-28} x2={0} y2={-12} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={12} x2={0} y2={28} stroke={stroke} strokeWidth={sw} />
          <rect x={-26} y={-12} width={52} height={24} fill={fillBg} stroke={activeCol} strokeWidth={sw} />
          <rect x={-26} y={-12} width={16} height={24} fill={activeCol} />
          <text x={8} y={4} textAnchor="middle" fontSize={11} fontWeight={600} fill={stroke}>
            {Number(relayDelaySec)}
          </text>
        </g>
      );

    case 'elec_counter_relay':
      return (
        <g>
          <line x1={-16} y1={-29} x2={-16} y2={-14} stroke={stroke} strokeWidth={sw} />
          <line x1={-16} y1={14} x2={-16} y2={29} stroke={stroke} strokeWidth={sw} />
          <line x1={16} y1={-29} x2={16} y2={-14} stroke={stroke} strokeWidth={sw} />
          <line x1={16} y1={14} x2={16} y2={29} stroke={stroke} strokeWidth={sw} />
          <rect x={-28} y={-14} width={56} height={28} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <line x1={-10} y1={-14} x2={-10} y2={14} stroke={stroke} strokeWidth={thin} />
          <circle cx={-19} cy={0} r={5.5} fill="none" stroke={stroke} strokeWidth={thin} />
          <text x={9} y={5} textAnchor="middle" fontSize={11} fontWeight={600} fill={stroke}>
            {Number(counterPreset)}
          </text>
        </g>
      );

    case 'elec_valve_solenoid':
      return (
        <g>
          <line x1={0} y1={-28} x2={0} y2={-11} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={11} x2={0} y2={28} stroke={stroke} strokeWidth={sw} />
          <rect x={-24} y={-11} width={32} height={22} fill={active ? accent + '22' : fillBg} stroke={activeCol} strokeWidth={sw} />
          <line x1={-24} y1={11} x2={8} y2={-11} stroke={activeCol} strokeWidth={thin} />
          <line x1={8} y1={0} x2={22} y2={0} stroke={stroke} strokeWidth={thin} strokeDasharray="3 2" />
          <line x1={24} y1={-11} x2={24} y2={11} stroke={stroke} strokeWidth={thin} />
          <polygon points="20,-9 28,-9 24,0" fill="none" stroke={stroke} strokeWidth={thin} />
          <polygon points="20,9 28,9 24,0" fill="none" stroke={stroke} strokeWidth={thin} />
        </g>
      );

    case 'elec_amp_1ch':
      return (
        <g>
          <line x1={-38} y1={0} x2={-24} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={-14} y1={-28} x2={-14} y2={-14} stroke={stroke} strokeWidth={sw} />
          <line x1={-14} y1={14} x2={-14} y2={28} stroke={stroke} strokeWidth={sw} />
          <rect x={-24} y={-14} width={20} height={28} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <polygon points="-20,-8 -8,0 -20,8" fill="none" stroke={accent} strokeWidth={thin} />
          <polyline points="-4,-5 12,-5 12,-11 26,-11 26,11 12,11 12,5 -4,5" fill="none" stroke={stroke} strokeWidth={thin} />
          <rect x={22} y={-6} width={10} height={12} fill={fillBg} stroke={stroke} strokeWidth={thin} />
          <line x1={21} y1={8} x2={34} y2={-8} stroke={stroke} strokeWidth={thin} />
        </g>
      );

    case 'elec_amp_2ch':
      return (
        <g>
          <line x1={-38} y1={0} x2={-24} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={-14} y1={-30} x2={-14} y2={-14} stroke={stroke} strokeWidth={sw} />
          <line x1={-14} y1={14} x2={-14} y2={30} stroke={stroke} strokeWidth={sw} />
          <rect x={-24} y={-14} width={20} height={28} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <polygon points="-20,-8 -8,0 -20,8" fill="none" stroke={accent} strokeWidth={thin} />
          <polyline points="-4,-6 12,-6 12,-18 26,-18 26,-8 12,-8" fill="none" stroke={stroke} strokeWidth={thin} />
          <polyline points="-4,6 12,6 12,18 26,18 26,8 12,8" fill="none" stroke={stroke} strokeWidth={thin} />
          <rect x={22} y={-16} width={10} height={8} fill={fillBg} stroke={stroke} strokeWidth={thin} />
          <rect x={22} y={8} width={10} height={8} fill={fillBg} stroke={stroke} strokeWidth={thin} />
        </g>
      );

    case 'elec_prop_solenoid':
      return (
        <g>
          <line x1={0} y1={-28} x2={0} y2={-11} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={11} x2={0} y2={28} stroke={stroke} strokeWidth={sw} />
          <rect x={-24} y={-11} width={32} height={22} fill={fillBg} stroke={activeCol} strokeWidth={sw} />
          <line x1={-24} y1={11} x2={8} y2={-11} stroke={activeCol} strokeWidth={thin} />
          <line x1={-20} y1={15} x2={4} y2={-15} stroke={accent} strokeWidth={thin} />
          <polygon points="4,-15 -2,-13 2,-9" fill={accent} />
          <line x1={8} y1={0} x2={22} y2={0} stroke={stroke} strokeWidth={thin} strokeDasharray="3 2" />
          <polygon points="20,-9 28,-9 24,0" fill="none" stroke={stroke} strokeWidth={thin} />
          <polygon points="20,9 28,9 24,0" fill="none" stroke={stroke} strokeWidth={thin} />
        </g>
      );

    case 'elec_limiter':
      return (
        <g>
          {/* Outer shaded casing matching FluidSIM start current limiter */}
          <rect x={-22} y={-28} width={44} height={56} fill={muted} fillOpacity={0.28} stroke={stroke} strokeWidth={sw} />
          {/* Inner dashed outline */}
          <rect x={-18} y={-24} width={30} height={48} fill="none" stroke={stroke} strokeWidth={thin} strokeDasharray="3 2" />
          {/* Top 24V terminal and switch */}
          <line x1={-4} y1={-34} x2={-4} y2={-18} stroke={stroke} strokeWidth={sw} />
          <line x1={-4} y1={-5} x2={-11} y2={-17} stroke={activeCol} strokeWidth={sw} />
          <line x1={-4} y1={-5} x2={-4} y2={2} stroke={stroke} strokeWidth={sw} />
          {/* Limiter block with V chevron and forward current arrow */}
          <rect x={-14} y={2} width={20} height={18} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <polyline points="-14,2 -4,8 6,2" fill="none" stroke={stroke} strokeWidth={thin} />
          <line x1={-11} y1={13} x2={1} y2={13} stroke={stroke} strokeWidth={thin} />
          <polygon points="3,13 -2,10.5 -2,15.5" fill={stroke} />
          {/* Bottom OUT terminal */}
          <line x1={-4} y1={20} x2={-4} y2={34} stroke={stroke} strokeWidth={sw} />
          {/* Right IN and 0V leads */}
          <line x1={12} y1={-12} x2={34} y2={-12} stroke={stroke} strokeWidth={thin} />
          <line x1={12} y1={14} x2={34} y2={14} stroke={stroke} strokeWidth={thin} />
        </g>
      );

    // =========================================================================
    // 6. INTERRUPTORES — ACIONADO MANUALMENTE & COMUNS
    // =========================================================================
    case 'elec_push_no':
    case 'elec_switch_no':
    case 'elec_contact_no': {
      const isPush = type === 'elec_push_no';
      const isSwitch = type === 'elec_switch_no';
      return (
        <g>
          <line x1={0} y1={-28} x2={0} y2={-10} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={10} x2={0} y2={28} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={10} x2={active ? 0 : -8} y2={-10} stroke={activeCol} strokeWidth={sw} />
          {(isPush || isSwitch) && (
            <g data-actuator-trigger="left" className="cursor-pointer">
              <rect x={-30} y={-12} width={25} height={24} fill="transparent">
                <title>Clique no acionador para abrir Conexão (mecânica)</title>
              </rect>
              <polyline points="-22,-6 -26,-6 -26,6 -22,6" fill="none" stroke={stroke} strokeWidth={thin} />
              <line x1={-26} y1={0} x2={-20} y2={0} stroke={stroke} strokeWidth={thin} />
              <line x1={-18} y1={0} x2={-5} y2={0} stroke={stroke} strokeWidth={thin} strokeDasharray="3 2" />
              {isSwitch && <polyline points="-18,-3 -14,2 -10,-3" fill="none" stroke={stroke} strokeWidth={thin} />}
            </g>
          )}
        </g>
      );
    }

    case 'elec_push_nc':
    case 'elec_switch_nc':
    case 'elec_contact_nc': {
      const isPush = type === 'elec_push_nc';
      const isSwitch = type === 'elec_switch_nc';
      return (
        <g>
          <line x1={0} y1={-28} x2={0} y2={-10} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={-10} x2={9} y2={-10} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={10} x2={0} y2={28} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={10} x2={active ? 11 : 7} y2={-11} stroke={activeCol} strokeWidth={sw} />
          {(isPush || isSwitch) && (
            <g data-actuator-trigger="left" className="cursor-pointer">
              <rect x={-30} y={-12} width={25} height={24} fill="transparent">
                <title>Clique no acionador para abrir Conexão (mecânica)</title>
              </rect>
              <polyline points="-22,-6 -26,-6 -26,6 -22,6" fill="none" stroke={stroke} strokeWidth={thin} />
              <line x1={-26} y1={0} x2={-20} y2={0} stroke={stroke} strokeWidth={thin} />
              <line x1={-18} y1={0} x2={4} y2={0} stroke={stroke} strokeWidth={thin} strokeDasharray="3 2" />
              {isSwitch && <polyline points="-18,-3 -14,2 -10,-3" fill="none" stroke={stroke} strokeWidth={thin} />}
            </g>
          )}
        </g>
      );
    }

    case 'elec_push_co':
    case 'elec_switch_co':
    case 'elec_contact_co': {
      const isPush = type === 'elec_push_co';
      const isSwitch = type === 'elec_switch_co';
      return (
        <g>
          <line x1={-12} y1={-28} x2={-12} y2={-10} stroke={stroke} strokeWidth={sw} />
          <line x1={-12} y1={-10} x2={-4} y2={-10} stroke={stroke} strokeWidth={sw} />
          <line x1={12} y1={-28} x2={12} y2={-10} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={10} x2={0} y2={28} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={10} x2={active ? 10 : -7} y2={-11} stroke={activeCol} strokeWidth={sw} />
          {(isPush || isSwitch) && (
            <g data-actuator-trigger="left" className="cursor-pointer">
              <rect x={-32} y={-12} width={25} height={24} fill="transparent">
                <title>Clique no acionador para abrir Conexão (mecânica)</title>
              </rect>
              <polyline points="-24,-6 -28,-6 -28,6 -24,6" fill="none" stroke={stroke} strokeWidth={thin} />
              <line x1={-28} y1={0} x2={-22} y2={0} stroke={stroke} strokeWidth={thin} />
              <line x1={-20} y1={0} x2={-4} y2={0} stroke={stroke} strokeWidth={thin} strokeDasharray="3 2" />
              {isSwitch && <polyline points="-20,-3 -16,2 -12,-3" fill="none" stroke={stroke} strokeWidth={thin} />}
            </g>
          )}
        </g>
      );
    }

    // =========================================================================
    // 7. SENSORES DE PROXIMIDADE (Interruptor de alimentação)
    // =========================================================================
    case 'elec_prox_cap':
    case 'elec_prox_ind':
    case 'elec_prox_mag':
    case 'elec_prox_opt':
      return (
        <g data-actuator-trigger="left" className="cursor-pointer">
          <title>Clique para vincular Marca (Conexão mecânica)</title>
          <line x1={-16} y1={-29} x2={-16} y2={-18} stroke={stroke} strokeWidth={sw} />
          <line x1={16} y1={-29} x2={16} y2={-18} stroke={stroke} strokeWidth={sw} />
          <rect x={-24} y={-18} width={48} height={36} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <polygon points="0,-14 7,-7 0,0 -7,-7" fill="none" stroke={stroke} strokeWidth={thin} />
          <line x1={-14} y1={6} x2={-4} y2={6} stroke={stroke} strokeWidth={thin} />
          <line x1={-2} y1={6} x2={10} y2={1} stroke={activeCol} strokeWidth={sw} />
          <line x1={10} y1={6} x2={20} y2={6} stroke={stroke} strokeWidth={thin} />
          <line x1={24} y1={0} x2={32} y2={0} stroke={stroke} strokeWidth={sw} />
          {type === 'elec_prox_cap' && (
            <>
              <line x1={-18} y1={9} x2={-18} y2={15} stroke={accent} strokeWidth={1.6} />
              <line x1={-14} y1={9} x2={-14} y2={15} stroke={accent} strokeWidth={1.6} />
            </>
          )}
          {type === 'elec_prox_ind' && <rect x={-19} y={10} width={9} height={5} fill={stroke} />}
          {type === 'elec_prox_mag' && <rect x={-19} y={11} width={11} height={3} fill={accent} />}
          {type === 'elec_prox_opt' && (
            <>
              <line x1={-20} y1={14} x2={-13} y2={9} stroke={accent} strokeWidth={1.3} />
              <line x1={-14} y1={15} x2={-7} y2={10} stroke={accent} strokeWidth={1.3} />
            </>
          )}
        </g>
      );

    // =========================================================================
    // 8. REGULADOR
    // =========================================================================
    case 'elec_comparator':
      return (
        <g>
          <line x1={-38} y1={0} x2={-28} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={28} y1={0} x2={38} y2={0} stroke={stroke} strokeWidth={sw} />
          <rect x={-28} y={-16} width={56} height={32} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <rect x={-22} y={-9} width={16} height={18} fill="none" stroke={stroke} strokeWidth={thin} />
          <polyline points="-19,3 -14,3 -11,-4 -8,-4" fill="none" stroke={accent} strokeWidth={thin} />
          <line x1={-6} y1={0} x2={6} y2={0} stroke={stroke} strokeWidth={thin} />
          <rect x={6} y={-9} width={16} height={18} fill="none" stroke={stroke} strokeWidth={thin} />
          <polyline points="9,5 12,5 12,-5 17,-5 17,5 19,5" fill="none" stroke={accent} strokeWidth={thin} />
        </g>
      );

    case 'elec_pid':
    case 'elec_z_ctrl':
      return (
        <g>
          <line x1={-34} y1={-10} x2={-22} y2={-10} stroke={stroke} strokeWidth={sw} />
          <line x1={-34} y1={10} x2={-22} y2={10} stroke={stroke} strokeWidth={sw} />
          <line x1={22} y1={0} x2={34} y2={0} stroke={stroke} strokeWidth={sw} />
          <rect x={-22} y={-16} width={44} height={32} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <polygon points="-22,-16 -6,0 -22,16" fill="none" stroke={stroke} strokeWidth={thin} />
          <text x={8} y={5} textAnchor="middle" fontSize={12} fontWeight={700} fill={accent}>
            {type === 'elec_pid' ? 'PID' : 'Z'}
          </text>
        </g>
      );

    // =========================================================================
    // 9. SÍMBOLOS DE DIAGRAMA DE LADDER
    // =========================================================================
    case 'ladder_0v':
    case 'ladder_24v':
      return (
        <g>
          <circle cx={0} cy={-4} r={14} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <text x={0} y={1} textAnchor="middle" fontSize={11} fontWeight={700} fill={type === 'ladder_24v' ? accent : stroke}>
            {type === 'ladder_24v' ? '24V' : '0V'}
          </text>
          <line x1={0} y1={10} x2={0} y2={26} stroke={stroke} strokeWidth={sw} />
        </g>
      );

    case 'ladder_push_no':
      return (
        <g>
          <line x1={-32} y1={0} x2={-10} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={10} y1={0} x2={32} y2={0} stroke={stroke} strokeWidth={sw} />
          <g data-actuator-trigger="left" className="cursor-pointer">
            <rect x={-14} y={-18} width={28} height={18} fill="transparent" />
            <line x1={-12} y1={active ? -2 : -7} x2={12} y2={active ? -2 : -7} stroke={activeCol} strokeWidth={sw} />
            <line x1={0} y1={active ? -10 : -15} x2={0} y2={active ? -2 : -7} stroke={activeCol} strokeWidth={sw} />
          </g>
          <circle cx={-10} cy={0} r={2} fill={stroke} />
          <circle cx={10} cy={0} r={2} fill={stroke} />
        </g>
      );

    case 'ladder_push_nc':
      return (
        <g>
          <line x1={-32} y1={0} x2={-10} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={10} y1={0} x2={32} y2={0} stroke={stroke} strokeWidth={sw} />
          <g data-actuator-trigger="left" className="cursor-pointer">
            <rect x={-14} y={-12} width={28} height={22} fill="transparent" />
            <line x1={-12} y1={active ? 8 : 2} x2={12} y2={active ? 8 : 2} stroke={activeCol} strokeWidth={sw} />
            <line x1={0} y1={-8} x2={0} y2={active ? 8 : 2} stroke={activeCol} strokeWidth={sw} />
          </g>
          <circle cx={-10} cy={0} r={2} fill={stroke} />
          <circle cx={10} cy={0} r={2} fill={stroke} />
        </g>
      );

    case 'ladder_push_co':
      return (
        <g>
          <line x1={-32} y1={-8} x2={-10} y2={-8} stroke={stroke} strokeWidth={sw} />
          <line x1={10} y1={-8} x2={32} y2={-8} stroke={stroke} strokeWidth={sw} />
          <line x1={-32} y1={8} x2={-10} y2={8} stroke={stroke} strokeWidth={sw} />
          <line x1={10} y1={8} x2={32} y2={8} stroke={stroke} strokeWidth={sw} />
          <g data-actuator-trigger="left" className="cursor-pointer">
            <rect x={-14} y={-16} width={28} height={22} fill="transparent" />
            <line x1={-12} y1={-5} x2={12} y2={-5} stroke={activeCol} strokeWidth={sw} />
            <line x1={-12} y1={3} x2={12} y2={3} stroke={activeCol} strokeWidth={sw} />
            <line x1={0} y1={-14} x2={0} y2={3} stroke={activeCol} strokeWidth={thin} />
          </g>
        </g>
      );

    case 'ladder_contact_no':
      return (
        <g>
          <line x1={-32} y1={0} x2={-10} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={10} y1={0} x2={32} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={-10} y1={0} x2={9} y2={active ? 0 : 8} stroke={activeCol} strokeWidth={sw} />
          <circle cx={10} cy={0} r={1.8} fill={stroke} />
        </g>
      );

    case 'ladder_contact_nc':
      return (
        <g>
          <line x1={-32} y1={0} x2={-10} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={10} y1={0} x2={32} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={-10} y1={0} x2={10} y2={active ? 7 : -3} stroke={activeCol} strokeWidth={sw} />
          <line x1={6} y1={0} x2={10} y2={0} stroke={stroke} strokeWidth={sw} />
        </g>
      );

    case 'ladder_solenoid':
      return (
        <g>
          <line x1={-32} y1={0} x2={-14} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={14} y1={0} x2={32} y2={0} stroke={stroke} strokeWidth={sw} />
          <polyline points="-14,0 -6,10 6,-10 14,0" fill="none" stroke={activeCol} strokeWidth={sw} />
        </g>
      );

    case 'ladder_relay':
    case 'ladder_relay_sr':
    case 'ladder_relay_sa':
      return (
        <g>
          <line x1={-32} y1={0} x2={-13} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={13} y1={0} x2={32} y2={0} stroke={stroke} strokeWidth={sw} />
          <circle cx={0} cy={0} r={13} fill={active ? accent + '22' : fillBg} stroke={activeCol} strokeWidth={sw} />
          {type !== 'ladder_relay' && (
            <text x={0} y={4} textAnchor="middle" fontSize={10} fontWeight={700} fill={activeCol}>
              {type === 'ladder_relay_sr' ? 'SR' : 'SA'}
            </text>
          )}
        </g>
      );

    case 'ladder_lamp':
      return (
        <g>
          <line x1={-32} y1={0} x2={-12} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={12} y1={0} x2={32} y2={0} stroke={stroke} strokeWidth={sw} />
          <circle cx={0} cy={0} r={12} fill={active ? '#FEF08A' : fillBg} stroke={active ? '#CA8A04' : stroke} strokeWidth={sw} />
          <line x1={-8.5} y1={-8.5} x2={8.5} y2={8.5} stroke={active ? '#CA8A04' : stroke} strokeWidth={sw} />
          <line x1={8.5} y1={-8.5} x2={-8.5} y2={8.5} stroke={active ? '#CA8A04' : stroke} strokeWidth={sw} />
        </g>
      );

    // =========================================================================
    // 10. TÉCNICA DIGITAL (28 itens)
    // =========================================================================
    case 'dig_mod_16':
      return (
        <g>
          <line x1={-44} y1={0} x2={-34} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={34} y1={0} x2={44} y2={0} stroke={stroke} strokeWidth={sw} />
          <rect x={-34} y={-14} width={68} height={28} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          {[-28, -20, -12, -4, 4, 12, 20, 28].map((px) => (
            <React.Fragment key={px}>
              <line x1={px} y1={-20} x2={px} y2={-14} stroke={stroke} strokeWidth={1.1} />
              <line x1={px} y1={14} x2={px} y2={20} stroke={stroke} strokeWidth={1.1} />
            </React.Fragment>
          ))}
          <text x={0} y={4} textAnchor="middle" fontSize={9} fontWeight={700} fill={accent}>DIG 16</text>
        </g>
      );

    case 'dig_mod_io':
      return (
        <g>
          <line x1={0} y1={-30} x2={0} y2={-18} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={18} x2={0} y2={30} stroke={stroke} strokeWidth={sw} />
          <rect x={-30} y={-18} width={60} height={36} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          {[-24, -16, -8, 0, 8, 16, 24].map((px) => (
            <React.Fragment key={px}>
              <line x1={px} y1={-24} x2={px} y2={-18} stroke={stroke} strokeWidth={1} />
              <line x1={px} y1={18} x2={px} y2={24} stroke={stroke} strokeWidth={1} />
            </React.Fragment>
          ))}
          <text x={0} y={4} textAnchor="middle" fontSize={9} fontWeight={700} fill={accent}>I/O</text>
        </g>
      );

    case 'dig_lo':
    case 'dig_hi':
      return (
        <g>
          <rect x={-16} y={-18} width={30} height={36} fill={active ? accent + '22' : fillBg} stroke={activeCol} strokeWidth={sw} />
          <line x1={14} y1={0} x2={28} y2={0} stroke={stroke} strokeWidth={sw} />
          <text x={-1} y={5} textAnchor="middle" fontSize={14} fontWeight={600} fill={activeCol}>
            {type === 'dig_hi' ? 'hi' : 'lo'}
          </text>
        </g>
      );

    case 'dig_in':
    case 'dig_mem':
      return (
        <g>
          <line x1={-32} y1={0} x2={-15} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={15} y1={0} x2={32} y2={0} stroke={stroke} strokeWidth={sw} />
          <rect x={-15} y={-18} width={30} height={36} fill={active ? accent + '22' : fillBg} stroke={activeCol} strokeWidth={sw} />
          <text x={0} y={5} textAnchor="middle" fontSize={13} fontWeight={700} fill={activeCol}>
            {type === 'dig_in' ? 'I' : 'M'}
          </text>
        </g>
      );

    case 'dig_out':
      return (
        <g>
          <line x1={-30} y1={0} x2={-15} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={15} y1={-8} x2={30} y2={-8} stroke={stroke} strokeWidth={sw} />
          <line x1={15} y1={8} x2={30} y2={8} stroke={stroke} strokeWidth={sw} />
          <rect x={-15} y={-18} width={30} height={36} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <text x={0} y={5} textAnchor="middle" fontSize={13} fontWeight={700} fill={accent}>Q</text>
        </g>
      );

    case 'dig_and':
    case 'dig_or':
    case 'dig_and_edge':
    case 'dig_nand':
    case 'dig_nand_edge':
    case 'dig_nor': {
      const hasDot = type === 'dig_nand' || type === 'dig_nand_edge' || type === 'dig_nor';
      const gateText =
        type === 'dig_or' || type === 'dig_nor'
          ? '≥1'
          : type === 'dig_and_edge'
            ? '& ↑'
            : type === 'dig_nand_edge'
              ? '& ↓'
              : '&';
      return (
        <g>
          <line x1={-32} y1={-12} x2={-16} y2={-12} stroke={stroke} strokeWidth={sw} />
          <line x1={-32} y1={0} x2={-16} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={-32} y1={12} x2={-16} y2={12} stroke={stroke} strokeWidth={sw} />
          <line x1={16} y1={0} x2={32} y2={0} stroke={stroke} strokeWidth={sw} />
          <rect x={-16} y={-20} width={32} height={40} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          {hasDot && <circle cx={19} cy={0} r={3.2} fill={stroke} />}
          <text x={0} y={5} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={stroke}>{gateText}</text>
        </g>
      );
    }

    case 'dig_not':
      return (
        <g>
          <line x1={-32} y1={0} x2={-15} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={15} y1={0} x2={32} y2={0} stroke={stroke} strokeWidth={sw} />
          <rect x={-15} y={-18} width={30} height={36} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <circle cx={18} cy={0} r={3.2} fill={stroke} />
          <text x={0} y={5} textAnchor="middle" fontSize={13} fontWeight={700} fill={stroke}>1</text>
        </g>
      );

    case 'dig_xor':
    case 'dig_rs':
      return (
        <g>
          <line x1={-32} y1={-10} x2={-16} y2={-10} stroke={stroke} strokeWidth={sw} />
          <line x1={-32} y1={10} x2={-16} y2={10} stroke={stroke} strokeWidth={sw} />
          <line x1={16} y1={0} x2={32} y2={0} stroke={stroke} strokeWidth={sw} />
          <rect x={-16} y={-18} width={32} height={36} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <text x={0} y={5} textAnchor="middle" fontSize={12} fontWeight={700} fill={stroke}>
            {type === 'dig_xor' ? '=1' : 'RS'}
          </text>
        </g>
      );

    case 'dig_pulse_gen':
    case 'dig_freq_gen':
    case 'dig_pulse_relay':
      return (
        <g>
          <line x1={-32} y1={-8} x2={-17} y2={-8} stroke={stroke} strokeWidth={sw} />
          {type !== 'dig_pulse_gen' && <line x1={-32} y1={8} x2={-17} y2={8} stroke={stroke} strokeWidth={sw} />}
          <line x1={17} y1={0} x2={32} y2={0} stroke={stroke} strokeWidth={sw} />
          <rect x={-17} y={-18} width={34} height={36} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          {type === 'dig_pulse_gen' && (
            <polyline points="-13,6 -9,6 -9,-4 -3,-4 -3,6 3,6 3,-4 9,-4 9,6 13,6" fill="none" stroke={accent} strokeWidth={thin} />
          )}
          {type === 'dig_freq_gen' && (
            <polyline points="-13,6 -10,6 -10,-4 -6,-4 -6,6 -2,6 -2,-4 2,-4 2,6 6,6 6,-4 10,-4 10,6" fill="none" stroke={accent} strokeWidth={thin} />
          )}
          {type === 'dig_pulse_relay' && (
            <>
              <polyline points="-12,-3 -7,-3 -7,-11 -2,-11 -2,-3 4,-3 4,-11 9,-11 9,-3" fill="none" stroke={stroke} strokeWidth={thin} />
              <polyline points="-12,11 -7,11 -7,3 4,3 4,11 12,11" fill="none" stroke={accent} strokeWidth={thin} />
            </>
          )}
        </g>
      );

    case 'dig_ton':
    case 'dig_toff':
    case 'dig_tonoff':
    case 'dig_ton_mem':
    case 'dig_wipe_up':
    case 'dig_wipe_down':
      return (
        <g>
          <line x1={-32} y1={-10} x2={-17} y2={-10} stroke={stroke} strokeWidth={sw} />
          <line x1={-32} y1={10} x2={-17} y2={10} stroke={stroke} strokeWidth={sw} />
          <line x1={17} y1={0} x2={32} y2={0} stroke={stroke} strokeWidth={sw} />
          <rect x={-17} y={-20} width={34} height={40} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <polyline points="-12,-5 -7,-5 -7,-13 7,-13 7,-5 12,-5" fill="none" stroke={stroke} strokeWidth={thin} />
          <polyline
            points={
              type === 'dig_toff'
                ? '-12,4 -7,4 -7,-4 11,-4 11,4 13,4'
                : type === 'dig_wipe_up' || type === 'dig_wipe_down'
                  ? '-12,4 -7,4 -7,-4 -1,-4 -1,4 12,4'
                  : '-12,4 -1,4 -1,-4 10,-4 10,4 13,4'
            }
            fill="none"
            stroke={accent}
            strokeWidth={thin}
          />
          <text x={0} y={16} textAnchor="middle" fontSize={10} fontWeight={700} fill={stroke}>3</text>
        </g>
      );

    case 'dig_counter':
      return (
        <g>
          <line x1={-32} y1={-12} x2={-17} y2={-12} stroke={stroke} strokeWidth={sw} />
          <line x1={-32} y1={0} x2={-17} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={-32} y1={12} x2={-17} y2={12} stroke={stroke} strokeWidth={sw} />
          <line x1={17} y1={0} x2={32} y2={0} stroke={stroke} strokeWidth={sw} />
          <rect x={-17} y={-20} width={34} height={40} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <text x={0} y={-5} textAnchor="middle" fontSize={8} fontWeight={700} fill={stroke}>↑</text>
          <text x={0} y={4} textAnchor="middle" fontSize={10} fontWeight={700} fill={accent}>+/-</text>
          <text x={0} y={16} textAnchor="middle" fontSize={10} fontWeight={700} fill={stroke}>0</text>
        </g>
      );

    case 'dig_schmitt':
      return (
        <g>
          <line x1={-32} y1={0} x2={-17} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={17} y1={0} x2={32} y2={0} stroke={stroke} strokeWidth={sw} />
          <rect x={-17} y={-18} width={34} height={36} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <polygon points="-10,-1 0,-11 10,-1" fill="none" stroke={stroke} strokeWidth={thin} />
          <polygon points="-10,9 0,-1 10,9" fill="none" stroke={accent} strokeWidth={thin} />
        </g>
      );

    case 'dig_timer':
      return (
        <g>
          <line x1={16} y1={0} x2={30} y2={0} stroke={stroke} strokeWidth={sw} />
          <rect x={-18} y={-20} width={34} height={40} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <circle cx={-1} cy={-6} r={9} fill="none" stroke={stroke} strokeWidth={thin} />
          <polyline points="-1,-12 -1,-6 4,-6" fill="none" stroke={accent} strokeWidth={thin} />
          <text x={-1} y={15} textAnchor="middle" fontSize={11} fontWeight={700} fill={stroke}>10</text>
        </g>
      );

    // =========================================================================
    // 11. EASYPORT / OPC / DDE (6 itens)
    // =========================================================================
    case 'ep_analog_in':
    case 'ep_analog_out':
    case 'ep_port_in':
    case 'ep_port_out': {
      const isIn = type === 'ep_analog_in' || type === 'ep_port_in';
      const is8Bit = type === 'ep_port_in' || type === 'ep_port_out';
      const cols = is8Bit ? 8 : 4;
      const boxW = 88;
      const step = boxW / cols;
      return (
        <g>
          <rect x={-boxW / 2} y={-16} width={boxW} height={32} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <line x1={-boxW / 2} y1={isIn ? 4 : -4} x2={boxW / 2} y2={isIn ? 4 : -4} stroke={stroke} strokeWidth={thin} />
          {Array.from({ length: cols }).map((_, idx) => {
            const x = -boxW / 2 + idx * step;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <line x1={x} y1={isIn ? 4 : -16} x2={x} y2={isIn ? 16 : -4} stroke={stroke} strokeWidth={thin} />
                )}
                <text x={x + step / 2} y={isIn ? 13 : -7} textAnchor="middle" fontSize={7.5} fontWeight={600} fill={stroke}>
                  {idx}
                </text>
                <line
                  x1={x + step / 2}
                  y1={isIn ? 16 : -24}
                  x2={x + step / 2}
                  y2={isIn ? 24 : -16}
                  stroke={stroke}
                  strokeWidth={thin}
                />
              </React.Fragment>
            );
          })}
          <text x={0} y={isIn ? -3 : 9} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={accent}>
            {type === 'ep_analog_in'
              ? 'Analog-In'
              : type === 'ep_analog_out'
                ? 'Analog-Out'
                : type === 'ep_port_in'
                  ? 'Port In'
                  : 'Port Out'}
          </text>
        </g>
      );
    }

    case 'ep_multipol':
      return (
        <g>
          <line x1={-30} y1={0} x2={-18} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={18} y1={0} x2={30} y2={0} stroke={stroke} strokeWidth={sw} />
          <rect x={-18} y={-26} width={36} height={52} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <polygon points="-10,-21 10,-21 8,-14 -8,-14" fill="none" stroke={stroke} strokeWidth={thin} />
          {[-8, 0, 8, 16].map((py) => (
            <React.Fragment key={py}>
              <circle cx={-9} cy={py} r={2.3} fill="none" stroke={stroke} strokeWidth={thin} />
              <circle cx={9} cy={py} r={2.3} fill="none" stroke={stroke} strokeWidth={thin} />
            </React.Fragment>
          ))}
        </g>
      );

    case 'ep_universal_io':
      return (
        <g>
          <line x1={-34} y1={0} x2={-24} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={-30} x2={0} y2={-22} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={22} x2={0} y2={30} stroke={stroke} strokeWidth={sw} />
          <rect x={-24} y={-22} width={48} height={44} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <circle cx={0} cy={0} r={14} fill="none" stroke={stroke} strokeWidth={sw} />
          <circle cx={0} cy={-7} r={2} fill={stroke} />
          <circle cx={0} cy={7} r={2} fill={stroke} />
          <circle cx={-7} cy={0} r={2} fill={stroke} />
          <text x={11} y={-11} fontSize={7} fontWeight={700} fill={accent}>24V</text>
        </g>
      );

    // =========================================================================
    // 12. GRAFCET (6 itens)
    // =========================================================================
    case 'grafcet_step':
      return (
        <g>
          <line x1={0} y1={-28} x2={0} y2={-16} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={16} x2={0} y2={28} stroke={stroke} strokeWidth={sw} />
          <line x1={16} y1={0} x2={28} y2={0} stroke={stroke} strokeWidth={sw} />
          <rect x={-16} y={-16} width={32} height={32} fill={active ? accent + '22' : fillBg} stroke={activeCol} strokeWidth={sw} />
          <text x={0} y={4} textAnchor="middle" fontSize={10} fontWeight={700} fill={stroke}>
            {label ? label.slice(0, 4) : '1'}
          </text>
        </g>
      );

    case 'grafcet_trans':
      return (
        <g>
          <line x1={0} y1={-24} x2={0} y2={24} stroke={stroke} strokeWidth={sw} />
          <line x1={-14} y1={0} x2={14} y2={0} stroke={activeCol} strokeWidth={2.4} />
        </g>
      );

    case 'grafcet_action':
      return (
        <g>
          <line x1={-42} y1={0} x2={-32} y2={0} stroke={stroke} strokeWidth={sw} />
          <rect x={-32} y={-12} width={64} height={24} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <text x={0} y={4} textAnchor="middle" fontSize={9.5} fontWeight={600} fill={stroke}>
            {label ? label.slice(0, 10) : 'Ação'}
          </text>
        </g>
      );

    case 'grafcet_sync':
      return (
        <g>
          <line x1={0} y1={-16} x2={0} y2={-3} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={3} x2={0} y2={16} stroke={stroke} strokeWidth={sw} />
          <line x1={-32} y1={-3} x2={32} y2={-3} stroke={stroke} strokeWidth={2} />
          <line x1={-32} y1={3} x2={32} y2={3} stroke={stroke} strokeWidth={2} />
        </g>
      );

    case 'grafcet_partial':
      return (
        <g>
          <polyline points="-28,26 -28,-26 28,-26 28,26" fill="none" stroke={stroke} strokeWidth={sw} />
        </g>
      );

    case 'grafcet_io':
      return (
        <g>
          <line x1={-38} y1={0} x2={-18} y2={0} stroke={stroke} strokeWidth={sw} />
          <line x1={18} y1={0} x2={38} y2={0} stroke={stroke} strokeWidth={sw} />
          <rect x={-18} y={-28} width={36} height={56} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <line x1={-18} y1={-18} x2={18} y2={-18} stroke={stroke} strokeWidth={thin} />
          {[-10, -2, 6, 14, 22].map((py) => (
            <React.Fragment key={py}>
              <line x1={-25} y1={py} x2={-18} y2={py} stroke={stroke} strokeWidth={1.2} />
              <line x1={18} y1={py} x2={25} y2={py} stroke={stroke} strokeWidth={1.2} />
            </React.Fragment>
          ))}
          <text x={0} y={-20} textAnchor="middle" fontSize={7} fontWeight={700} fill={accent}>I/O</text>
        </g>
      );

    // =========================================================================
    // 13. OUTROS (10 itens)
    // =========================================================================
    case 'other_state_chart':
      return (
        <g>
          <rect x={-48} y={-24} width={96} height={48} fill={fillBg} stroke="#2563EB" strokeWidth={sw} />
          <line x1={-26} y1={-24} x2={-26} y2={24} stroke="#2563EB" strokeWidth={thin} />
          <line x1={-2} y1={-24} x2={-2} y2={24} stroke="#2563EB" strokeWidth={thin} />
          <polyline points="-2,12 16,12 24,-10 42,-10" fill="none" stroke={accent} strokeWidth={thin} />
        </g>
      );

    case 'other_func_chart':
      return (
        <g>
          <rect x={-48} y={-20} width={96} height={40} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <line x1={-48} y1={-6} x2={48} y2={-6} stroke={stroke} strokeWidth={thin} />
          <line x1={-48} y1={8} x2={48} y2={8} stroke={stroke} strokeWidth={thin} />
          {[-28, -8, 12, 32].map((px) => (
            <line key={px} x1={px} y1={-20} x2={px} y2={20} stroke={stroke} strokeWidth={1} />
          ))}
        </g>
      );

    case 'other_bar_chart': {
      const pct = Math.min(100, Math.max(0, active ? 100 : 65));
      return (
        <g>
          <rect x={-44} y={-9} width={88} height={18} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <rect x={-43} y={-8} width={(86 * pct) / 100} height={16} fill={accent} fillOpacity={0.35} />
        </g>
      );
    }

    case 'other_parts_list':
      return (
        <g>
          <rect x={-48} y={-10} width={96} height={20} fill={fillBg} stroke={stroke} strokeWidth={sw} />
          <line x1={-20} y1={-10} x2={-20} y2={10} stroke={stroke} strokeWidth={thin} />
          <line x1={-48} y1={0} x2={48} y2={0} stroke={stroke} strokeWidth={1} />
          <text x={-34} y={-2} textAnchor="middle" fontSize={6.5} fontWeight={700} fill={stroke}>Pos</text>
          <text x={14} y={-2} textAnchor="middle" fontSize={6.5} fontWeight={700} fill={stroke}>Lista de peças</text>
        </g>
      );

    case 'other_text':
      return (
        <g>
          {!isThumb && (
            <rect
              x={-38}
              y={-14}
              width={76}
              height={28}
              rx={3}
              fill="transparent"
              stroke={muted}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}
          <text x={0} y={5} textAnchor="middle" fontSize={isThumb ? 14 : 13} fontWeight={600} fill={stroke}>
            {isThumb ? 'Text' : (label || 'Text')}
          </text>
        </g>
      );

    case 'other_circle':
      return <circle cx={0} cy={0} r={24} fill="none" stroke={stroke} strokeWidth={sw} />;

    case 'other_ellipse':
      return <ellipse cx={0} cy={0} rx={32} ry={20} fill="none" stroke={stroke} strokeWidth={sw} />;

    case 'other_square':
      return <rect x={-24} y={-24} width={48} height={48} fill="none" stroke={stroke} strokeWidth={sw} />;

    case 'other_rect':
      return <rect x={-38} y={-20} width={76} height={40} fill="none" stroke={stroke} strokeWidth={sw} />;

    default:
      return null;
  }
}
