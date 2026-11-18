import React from 'react';
import type { CircuitNode, FluidMedium, NodeRuntimeState } from '../types/circuit';
import { renderExtendedSymbolSvg } from './ExtendedSymbolRenderers';
import { DirectionalValveSymbol } from './ValveIsoRenderer';

interface SchematicNodeSvgProps {
  node: CircuitNode;
  runtime?: NodeRuntimeState;
  fluid: FluidMedium;
  isDark: boolean;
}

export const SchematicNodeSvg: React.FC<SchematicNodeSvgProps> = ({
  node,
  runtime,
  fluid,
  isDark,
}) => {
  const stroke = isDark ? '#E2E8F0' : '#0F172A';
  const muted = isDark ? '#64748B' : '#94A3B8';
  const fillBg = isDark ? '#0F172A' : '#FFFFFF';
  const accent = fluid === 'hydraulic' ? '#0284C7' : '#0EA5E9';
  const activeColor = '#DC2626';

  const pressureIn = Math.max(
    ...Object.values(runtime?.portPressures ?? { p: 0 }),
    0
  );
  const pistonPos = runtime?.pistonPos ?? 0;

  switch (node.type) {
    case 'power_unit_simple': {
      const target = node.params.targetPressure ?? 120;
      return (
        <g>
          <line x1={0} y1={-30} x2={0} y2={-16} stroke={accent} strokeWidth={2} />
          <polygon points="0,-16 -16,14 16,14" fill={stroke} />
          <text x={0} y={26} textAnchor="middle" fontSize={9} className="font-mono" fill={muted}>
            {target} bar
          </text>
        </g>
      );
    }

    case 'pump': {
      return (
        <g>
          <line x1={0} y1={-24} x2={0} y2={-16} stroke={stroke} strokeWidth={1.8} />
          <line x1={0} y1={16} x2={0} y2={24} stroke={stroke} strokeWidth={1.8} />
          <circle cx={0} cy={0} r={16} fill={fillBg} stroke={stroke} strokeWidth={1.8} />
          <polygon points="0,-15.5 -6,-6.5 6,-6.5" fill={stroke} />
        </g>
      );
    }

    case 'pump_variable': {
      return (
        <g>
          <line x1={0} y1={-24} x2={0} y2={-16} stroke={stroke} strokeWidth={1.8} />
          <line x1={0} y1={16} x2={0} y2={24} stroke={stroke} strokeWidth={1.8} />
          <circle cx={0} cy={0} r={16} fill={fillBg} stroke={stroke} strokeWidth={1.8} />
          <polygon points="0,-15.5 -6,-6.5 6,-6.5" fill={stroke} />
          <line x1={-15} y1={15} x2={15} y2={-15} stroke={stroke} strokeWidth={1.5} />
          <polygon points="16,-16 9,-14.5 14.5,-9" fill={stroke} />
        </g>
      );
    }

    case 'compressor': {
      const target = node.params.targetPressure ?? 6;
      return (
        <g>
          <rect x={-36} y={-28} width={72} height={56} rx={8} fill={fillBg} stroke={stroke} strokeWidth={1.8} />
          <circle cx={-4} cy={0} r={17} fill="none" stroke={stroke} strokeWidth={1.8} />
          <polygon points="-8,-7 5,0 -8,7" fill="none" stroke={accent} strokeWidth={1.8} />
          <line x1={13} y1={0} x2={40} y2={0} stroke={accent} strokeWidth={2.2} />
          <text x={0} y={24} textAnchor="middle" fontSize={9} className="font-mono" fill={muted}>
            {target} bar
          </text>
        </g>
      );
    }

    case 'tank': {
      return (
        <g>
          <path d="M-13,-3 V9 H13 V-3" fill="none" stroke={stroke} strokeWidth={1.8} />
          <line x1={-8} y1={3} x2={8} y2={3} stroke={accent} strokeWidth={1.4} strokeDasharray="2.5 2" />
          <line x1={0} y1={-15} x2={0} y2={3} stroke={stroke} strokeWidth={1.6} />
        </g>
      );
    }

    case 'power_unit': {
      const target = node.params.targetPressure ?? 120;
      return (
        <g>
          <rect x={-46} y={-36} width={92} height={72} fill={fillBg} stroke={stroke} strokeWidth={1.4} strokeDasharray="6 3 2 3" />
          {/* Internal tank */}
          <path d="M-30,14 V28 H24 V14" fill="none" stroke={stroke} strokeWidth={1.7} />
          {/* Pump + motor */}
          <circle cx={-4} cy={8} r={9} fill="none" stroke={stroke} strokeWidth={1.5} />
          <polygon points="-4,-1 -8,5 0,5" fill={accent} />
          <circle cx={14} cy={8} r={7.5} fill="none" stroke={stroke} strokeWidth={1.4} />
          <text x={14} y={11} textAnchor="middle" fontSize={8} fontWeight={700} fill={stroke}>M</text>
          {/* Piping to P & T ports */}
          <polyline points="-4,-1 -4,-12 48,-12" fill="none" stroke={accent} strokeWidth={1.8} />
          <polyline points="48,16 32,16 32,22 24,22" fill="none" stroke={stroke} strokeWidth={1.5} />
          {/* Relief valve & gauge */}
          <rect x={-32} y={-10} width={14} height={14} fill="none" stroke={stroke} strokeWidth={1.3} />
          <line x1={-25} y1={-12} x2={-4} y2={-12} stroke={stroke} strokeWidth={1.3} />
          <circle cx={-25} cy={-22} r={6} fill="none" stroke={stroke} strokeWidth={1.3} />
          <line x1={-25} y1={-16} x2={-25} y2={-10} stroke={stroke} strokeWidth={1.2} />
          <text x={24} y={-20} textAnchor="middle" fontSize={8.5} className="font-mono" fill={muted}>
            {target}b
          </text>
        </g>
      );
    }

    case 'pump_amplifier': {
      const openPct = node.params.opening ?? 75;
      return (
        <g>
          <line x1={-42} y1={0} x2={-28} y2={0} stroke={stroke} strokeWidth={1.6} />
          <rect x={-28} y={-14} width={24} height={28} fill={fillBg} stroke={stroke} strokeWidth={1.6} />
          <polygon points="-22,-7 -9,0 -22,7" fill="none" stroke={accent} strokeWidth={1.6} />
          <line x1={-16} y1={-20} x2={-16} y2={-14} stroke={stroke} strokeWidth={1.4} />
          <line x1={-16} y1={14} x2={-16} y2={20} stroke={stroke} strokeWidth={1.4} />
          <polyline points="-4,-6 14,-6 14,-13 30,-13 30,13 14,13 14,6 -4,6" fill="none" stroke={stroke} strokeWidth={1.4} />
          <rect x={24} y={-8} width={12} height={16} fill={fillBg} stroke={stroke} strokeWidth={1.4} />
          <line x1={22} y1={12} x2={38} y2={-12} stroke={accent} strokeWidth={1.5} />
          <line x1={36} y1={0} x2={42} y2={0} stroke={stroke} strokeWidth={1.6} />
          <text x={14} y={24} textAnchor="middle" fontSize={8} className="font-mono" fill={muted}>
            {openPct}%
          </text>
        </g>
      );
    }

    case 'pump_prop': {
      const target = node.params.targetPressure ?? 150;
      const openPct = node.params.opening ?? 80;
      return (
        <g>
          <rect x={-42} y={-28} width={84} height={56} rx={6} fill={fillBg} stroke={stroke} strokeWidth={1.6} />
          <rect x={-34} y={-6} width={18} height={14} fill="none" stroke={stroke} strokeWidth={1.4} />
          <line x1={-37} y1={11} x2={-13} y2={-9} stroke={accent} strokeWidth={1.4} />
          <line x1={-36} y1={16} x2={-12} y2={16} stroke={stroke} strokeWidth={1.4} />
          <circle cx={14} cy={0} r={17} fill="none" stroke={stroke} strokeWidth={1.7} />
          <polygon points="21,-7 29,0 21,7" fill={accent} />
          <line x1={-2} y1={16} x2={30} y2={-16} stroke={stroke} strokeWidth={1.5} />
          <polygon points="30,-16 23,-14.5 28.5,-9" fill={stroke} />
          <line x1={-44} y1={0} x2={-34} y2={0} stroke={stroke} strokeWidth={1.7} />
          <line x1={31} y1={0} x2={44} y2={0} stroke={accent} strokeWidth={2} />
          <text x={14} y={24} textAnchor="middle" fontSize={8} className="font-mono" fill={muted}>
            {target}b · {openPct}%
          </text>
        </g>
      );
    }

    case 'accumulator_simple':
    case 'accumulator': {
      const preCharge = node.params.crackingPressure ?? 50;
      const stored = runtime?.portPressures?.in ?? 0;
      return (
        <g>
          <rect x={-18} y={-32} width={36} height={56} rx={18} fill={fillBg} stroke={stroke} strokeWidth={1.8} />
          {stored > 1 && (
            <rect
              x={-16}
              y={4}
              width={32}
              height={18}
              rx={8}
              fill={accent}
              fillOpacity={Math.min(0.45, 0.15 + stored / 200)}
            />
          )}
          {node.type === 'accumulator' && (
            <>
              <line x1={-18} y1={-2} x2={18} y2={-2} stroke={stroke} strokeWidth={1.5} />
              <polygon points="-8,-20 8,-20 0,-7" fill="none" stroke={stroke} strokeWidth={1.5} />
            </>
          )}
          <line x1={0} y1={24} x2={0} y2={37} stroke={stroke} strokeWidth={1.8} />
          {node.params.showPressureIndication !== false && (
            <text x={0} y={16} textAnchor="middle" fontSize={8.5} className="font-mono" fill={muted}>
              {preCharge}b
            </text>
          )}
        </g>
      );
    }

    case 'accumulator_unit': {
      const crack = node.params.crackingPressure ?? 100;
      return (
        <g>
          <rect x={-45} y={-32} width={90} height={64} fill={fillBg} stroke={stroke} strokeWidth={1.4} strokeDasharray="6 3 2 3" />
          <line x1={-47} y1={0} x2={47} y2={0} stroke={stroke} strokeWidth={1.5} />
          <rect x={-34} y={-10} width={16} height={16} fill="none" stroke={stroke} strokeWidth={1.4} />
          <circle cx={-26} cy={-20} r={6} fill="none" stroke={stroke} strokeWidth={1.3} />
          <rect x={-4} y={-7} width={34} height={14} fill={fillBg} stroke={stroke} strokeWidth={1.4} />
          <circle cx={24} cy={-19} r={6} fill="none" stroke={stroke} strokeWidth={1.3} />
          <line x1={-26} y1={18} x2={34} y2={18} stroke={accent} strokeWidth={1.4} />
          <text x={8} y={29} textAnchor="middle" fontSize={8} className="font-mono" fill={muted}>
            {crack}b
          </text>
        </g>
      );
    }

    case 'flexible_hose': {
      return (
        <g>
          <line x1={-36} y1={0} x2={-18} y2={0} stroke={stroke} strokeWidth={1.8} />
          <circle cx={-15} cy={0} r={3.5} fill={fillBg} stroke={stroke} strokeWidth={1.7} />
          <path d="M-11.5,0 Q0,16 11.5,0" fill="none" stroke={accent} strokeWidth={1.9} />
          <circle cx={15} cy={0} r={3.5} fill={fillBg} stroke={stroke} strokeWidth={1.7} />
          <line x1={18} y1={0} x2={36} y2={0} stroke={stroke} strokeWidth={1.8} />
        </g>
      );
    }

    case 'filter': {
      return (
        <g>
          <polygon points="0,-24 24,0 0,24 -24,0" fill={fillBg} stroke={stroke} strokeWidth={1.8} />
          <line x1={-36} y1={0} x2={-24} y2={0} stroke={stroke} strokeWidth={1.8} />
          <line x1={24} y1={0} x2={36} y2={0} stroke={stroke} strokeWidth={1.8} />
          <line x1={0} y1={-22} x2={0} y2={22} stroke={accent} strokeWidth={1.6} strokeDasharray="4 3" />
        </g>
      );
    }

    case 'cooler': {
      return (
        <g>
          <polygon points="0,-24 24,0 0,24 -24,0" fill={fillBg} stroke={stroke} strokeWidth={1.8} />
          <line x1={-36} y1={0} x2={36} y2={0} stroke={stroke} strokeWidth={1.6} />
          <line x1={0} y1={-22} x2={0} y2={22} stroke={accent} strokeWidth={1.6} />
          <polygon points="0,-20 -4,-13 4,-13" fill={accent} />
          <polygon points="0,20 -4,13 4,13" fill={accent} />
        </g>
      );
    }

    case 'heater': {
      return (
        <g>
          <polygon points="0,-24 24,0 0,24 -24,0" fill={fillBg} stroke={stroke} strokeWidth={1.8} />
          <line x1={-36} y1={0} x2={36} y2={0} stroke={stroke} strokeWidth={1.6} />
          <line x1={0} y1={-22} x2={0} y2={22} stroke={activeColor} strokeWidth={1.6} />
          <polygon points="0,-5 -4,-12 4,-12" fill={activeColor} />
          <polygon points="0,5 -4,12 4,12" fill={activeColor} />
        </g>
      );
    }

    case 'regulator': {
      const setP = node.params.targetPressure ?? 6;
      return (
        <g>
          <rect x={-32} y={-22} width={64} height={44} rx={6} fill={fillBg} stroke={stroke} strokeWidth={1.8} />
          <line x1={-36} y1={0} x2={36} y2={0} stroke={stroke} strokeWidth={1.6} />
          <polygon points="-8,-10 8,0 -8,10" fill="none" stroke={accent} strokeWidth={1.6} />
          <path d="M-12,-18 L0,-10 L12,-18" fill="none" stroke={muted} strokeWidth={1.4} />
          <text x={0} y={18} textAnchor="middle" fontSize={9} className="font-mono" fill={muted}>
            {setP} bar
          </text>
        </g>
      );
    }

    case 'valve_2_2':
    case 'valve_3_2':
    case 'valve_4_2':
    case 'valve_5_2':
    case 'valve_6_2':
    case 'valve_4_3':
    case 'valve_5_3':
    case 'prop_valve_4_3':
    case 'servo_valve_4_3': {
      return (
        <DirectionalValveSymbol
          node={node}
          isDark={isDark}
          accent={accent}
          activeColor={activeColor}
          runtime={runtime}
        />
      );
    }

    case 'amp_prop_2ch': {
      const openPct = node.params.opening ?? 80;
      return (
        <g>
          <line x1={-44} y1={0} x2={-30} y2={0} stroke={stroke} strokeWidth={1.6} />
          <rect x={-30} y={-14} width={22} height={28} fill={fillBg} stroke={stroke} strokeWidth={1.6} />
          <line x1={-19} y1={-22} x2={-19} y2={-14} stroke={stroke} strokeWidth={1.4} />
          <line x1={-19} y1={14} x2={-19} y2={22} stroke={stroke} strokeWidth={1.4} />
          <polygon points="-24,-7 -12,0 -24,7" fill="none" stroke={accent} strokeWidth={1.6} />
          <polyline points="-8,-6 12,-6 12,-20 30,-20 30,-8" fill="none" stroke={stroke} strokeWidth={1.4} />
          <polyline points="-8,6 12,6 12,20 30,20 30,8" fill="none" stroke={stroke} strokeWidth={1.4} />
          <rect x={24} y={-18} width={14} height={10} fill={fillBg} stroke={stroke} strokeWidth={1.4} />
          <line x1={23} y1={-6} x2={40} y2={-21} stroke={accent} strokeWidth={1.4} />
          <rect x={24} y={8} width={14} height={10} fill={fillBg} stroke={stroke} strokeWidth={1.4} />
          <line x1={23} y1={21} x2={40} y2={6} stroke={accent} strokeWidth={1.4} />
          <line x1={38} y1={0} x2={44} y2={0} stroke={stroke} strokeWidth={1.6} />
          <text x={4} y={2} textAnchor="middle" fontSize={7.5} className="font-mono" fill={muted}>
            {openPct}%
          </text>
        </g>
      );
    }

    case 'amp_prop_1ch': {
      const openPct = node.params.opening ?? 75;
      return (
        <g>
          <line x1={-42} y1={0} x2={-28} y2={0} stroke={stroke} strokeWidth={1.6} />
          <rect x={-28} y={-14} width={22} height={28} fill={fillBg} stroke={stroke} strokeWidth={1.6} />
          <line x1={-17} y1={-21} x2={-17} y2={-14} stroke={stroke} strokeWidth={1.4} />
          <line x1={-17} y1={14} x2={-17} y2={21} stroke={stroke} strokeWidth={1.4} />
          <polygon points="-22,-7 -10,0 -22,7" fill="none" stroke={accent} strokeWidth={1.6} />
          <polyline points="-6,-6 14,-6 14,-13 30,-13 30,13 14,13 14,6 -6,6" fill="none" stroke={stroke} strokeWidth={1.4} />
          <rect x={24} y={-8} width={12} height={16} fill={fillBg} stroke={stroke} strokeWidth={1.4} />
          <line x1={22} y1={12} x2={38} y2={-12} stroke={accent} strokeWidth={1.5} />
          <line x1={36} y1={0} x2={42} y2={0} stroke={stroke} strokeWidth={1.6} />
          <text x={14} y={24} textAnchor="middle" fontSize={8} className="font-mono" fill={muted}>
            {openPct}%
          </text>
        </g>
      );
    }

    case 'prop_throttle_2_2': {
      const isOpen = node.params.active !== false;
      const openPct = node.params.opening ?? 70;
      return (
        <g>
          {/* Proportional rails */}
          <line x1={-34} y1={-22.5} x2={34} y2={-22.5} stroke={accent} strokeWidth={1.4} />
          <line x1={-34} y1={22.5} x2={34} y2={22.5} stroke={accent} strokeWidth={1.4} />
          {/* Two valve chambers */}
          <rect
            x={-34}
            y={-19}
            width={34}
            height={38}
            fill={isOpen ? (isDark ? '#0C4A6E' : '#E0F2FE') : fillBg}
            stroke={isOpen ? accent : stroke}
            strokeWidth={1.6}
          />
          <rect
            x={0}
            y={-19}
            width={34}
            height={38}
            fill={!isOpen ? (isDark ? '#0C4A6E' : '#E0F2FE') : fillBg}
            stroke={!isOpen ? accent : stroke}
            strokeWidth={1.6}
          />
          {/* Left proportional solenoid (bottom half) + diagonal arrow + small outer circle */}
          <rect x={-52} y={1} width={18} height={18} fill={fillBg} stroke={stroke} strokeWidth={1.4} />
          <line x1={-48} y1={19} x2={-38} y2={1} stroke={stroke} strokeWidth={1.3} />
          <line x1={-37} y1={21} x2={-56} y2={-4} stroke={accent} strokeWidth={1.4} />
          <polygon points="-56,-4 -54,2 -50,-1" fill={accent} />
          <circle cx={-52} cy={10} r={2.5} fill={fillBg} stroke={stroke} strokeWidth={1.2} />
          {/* Right spring */}
          <path d="M34,0 L37.5,11 L41,0 L44.5,11 L48,0 L51.5,11" fill="none" stroke={stroke} strokeWidth={1.35} />
          {/* Left chamber: vertical bidirectional double-headed arrow */}
          <line x1={-17} y1={-13} x2={-17} y2={13} stroke={stroke} strokeWidth={1.6} />
          <polygon points="-17,-18 -20.5,-10 -13.5,-10" fill={stroke} />
          <polygon points="-17,18 -20.5,10 -13.5,10" fill={stroke} />
          {/* Right chamber: closed T-stops top & bottom */}
          <line x1={17} y1={-19} x2={17} y2={-6} stroke={stroke} strokeWidth={1.5} />
          <line x1={11} y1={-6} x2={23} y2={-6} stroke={stroke} strokeWidth={1.5} />
          <line x1={17} y1={6} x2={17} y2={19} stroke={stroke} strokeWidth={1.5} />
          <line x1={11} y1={6} x2={23} y2={6} stroke={stroke} strokeWidth={1.5} />
          {/* Port stems B (top) & A (bottom) aligned on right chamber */}
          <line x1={17} y1={-30} x2={17} y2={-19} stroke={stroke} strokeWidth={1.7} />
          <line x1={17} y1={19} x2={17} y2={30} stroke={stroke} strokeWidth={1.7} />
          <text x={-17} y={33} textAnchor="middle" fontSize={7.5} className="font-mono" fill={accent}>
            {openPct}%
          </text>
        </g>
      );
    }

    case 'check_valve':
    case 'check_valve_spring': {
      const open = runtime?.isOpen ?? false;
      const hasSpring = node.type === 'check_valve_spring';
      return (
        <g>
          <line x1={0} y1={hasSpring ? -29 : -27} x2={0} y2={-5} stroke={stroke} strokeWidth={1.8} />
          <line x1={0} y1={9} x2={0} y2={hasSpring ? 29 : 27} stroke={stroke} strokeWidth={1.8} />
          {hasSpring && (
            <path d="M-4,-20 L4,-17 L-4,-14 L4,-11 L-4,-8" fill="none" stroke={muted} strokeWidth={1.4} />
          )}
          <circle cx={0} cy={open ? -3 : 1} r={5} fill={open ? accent : fillBg} stroke={stroke} strokeWidth={1.7} />
          <polyline points="-10,1 0,11 10,1" fill="none" stroke={stroke} strokeWidth={1.8} />
        </g>
      );
    }

    case 'check_throttle': {
      const openPct = node.params.opening ?? 45;
      const gap = 2 + (openPct / 100) * 6;
      const showBadge = node.params.showOpeningBadge !== false;
      return (
        <g>
          <rect x={-34} y={-24} width={68} height={48} rx={4} fill={fillBg} stroke={stroke} strokeWidth={1.6} strokeDasharray="4 2" />
          <line x1={-39} y1={0} x2={-22} y2={0} stroke={stroke} strokeWidth={1.7} />
          <line x1={22} y1={0} x2={39} y2={0} stroke={stroke} strokeWidth={1.7} />
          <polyline points="-22,0 -22,-11 22,-11 22,0" fill="none" stroke={stroke} strokeWidth={1.5} />
          <path d={`M-10,-16 Q0,${-11 + gap * 0.4} 10,-16`} fill="none" stroke={accent} strokeWidth={1.7} />
          <path d={`M-10,-6 Q0,${-11 - gap * 0.4} 10,-6`} fill="none" stroke={accent} strokeWidth={1.7} />
          <line x1={-8} y1={-4} x2={8} y2={-18} stroke={stroke} strokeWidth={1.3} />
          <polyline points="-22,0 -22,12 22,12 22,0" fill="none" stroke={stroke} strokeWidth={1.5} />
          <polyline points="6,6 -2,12 6,18" fill="none" stroke={stroke} strokeWidth={1.5} />
          <circle cx={-1} cy={12} r={3.5} fill={accent} />
          {showBadge && (
            <text x={0} y={22} textAnchor="middle" fontSize={8} className="font-mono" fill={accent}>
              {openPct}%
            </text>
          )}
        </g>
      );
    }

    case 'pilot_check_valve':
    case 'pilot_check_spring':
    case 'pilot_check_close':
    case 'pilot_check_close_spring': {
      const open = runtime?.isOpen ?? false;
      const hasSpring =
        node.type === 'pilot_check_spring' || node.type === 'pilot_check_close_spring';
      const isClosePilot =
        node.type === 'pilot_check_close' || node.type === 'pilot_check_close_spring';
      const pilotY = isClosePilot ? -16 : 16;
      return (
        <g>
          <rect x={-22} y={-22} width={44} height={44} rx={3} fill={fillBg} stroke={stroke} strokeWidth={1.6} />
          <line x1={0} y1={-29} x2={0} y2={-4} stroke={stroke} strokeWidth={1.8} />
          <line x1={0} y1={9} x2={0} y2={29} stroke={stroke} strokeWidth={1.8} />
          {hasSpring && (
            <path d="M-4,-18 L4,-15 L-4,-12 L4,-9" fill="none" stroke={muted} strokeWidth={1.3} />
          )}
          <circle cx={0} cy={open ? -3 : 1} r={4.5} fill={open ? accent : fillBg} stroke={stroke} strokeWidth={1.6} />
          <polyline points="-9,1 0,10 9,1" fill="none" stroke={stroke} strokeWidth={1.7} />
          <line x1={22} y1={pilotY} x2={38} y2={pilotY} stroke={accent} strokeWidth={1.5} strokeDasharray="4 2" />
          <polygon
            points={isClosePilot ? '14,-16 20,-19 20,-13' : '14,16 20,13 20,19'}
            fill={accent}
          />
        </g>
      );
    }

    case 'flow_control_2way': {
      const openPct = node.params.opening ?? 60;
      return (
        <g>
          <rect x={-32} y={-20} width={64} height={40} rx={3} fill={fillBg} stroke={stroke} strokeWidth={1.6} />
          <line x1={-40} y1={0} x2={40} y2={0} stroke={stroke} strokeWidth={1.7} />
          <path d="M-12,-10 Q0,-3 12,-10" fill="none" stroke={accent} strokeWidth={1.7} />
          <path d="M-12,10 Q0,3 12,10" fill="none" stroke={accent} strokeWidth={1.7} />
          <line x1={-11} y1={12} x2={11} y2={-12} stroke={stroke} strokeWidth={1.4} />
          <polygon points="26,0 18,-4.5 18,4.5" fill={stroke} />
          <text x={0} y={17} textAnchor="middle" fontSize={8} className="font-mono" fill={muted}>
            {openPct}%
          </text>
        </g>
      );
    }

    case 'flow_control_3way': {
      const openPct = node.params.opening ?? 60;
      return (
        <g>
          <rect x={-32} y={-22} width={64} height={44} rx={3} fill={fillBg} stroke={stroke} strokeWidth={1.6} />
          <line x1={-40} y1={0} x2={40} y2={0} stroke={stroke} strokeWidth={1.7} />
          <path d="M-4,-10 Q8,-3 20,-10" fill="none" stroke={accent} strokeWidth={1.7} />
          <path d="M-4,10 Q8,3 20,10" fill="none" stroke={accent} strokeWidth={1.7} />
          <line x1={-3} y1={12} x2={19} y2={-12} stroke={stroke} strokeWidth={1.4} />
          <line x1={-18} y1={0} x2={-18} y2={29} stroke={stroke} strokeWidth={1.7} />
          <circle cx={-18} cy={0} r={2.8} fill={stroke} />
          <polygon points="-18,16 -22,9 -14,9" fill={stroke} />
          <text x={12} y={18} textAnchor="middle" fontSize={8} className="font-mono" fill={muted}>
            {openPct}%
          </text>
        </g>
      );
    }

    case 'shuttle_valve': {
      return (
        <g>
          <rect x={-28} y={-20} width={56} height={40} rx={4} fill={fillBg} stroke={stroke} strokeWidth={1.6} />
          <line x1={-38} y1={0} x2={-14} y2={0} stroke={stroke} strokeWidth={1.8} />
          <line x1={14} y1={0} x2={38} y2={0} stroke={stroke} strokeWidth={1.8} />
          <line x1={0} y1={0} x2={0} y2={-27} stroke={stroke} strokeWidth={1.8} />
          <polyline points="-14,-8 -7,0 -14,8" fill="none" stroke={stroke} strokeWidth={1.5} />
          <polyline points="14,-8 7,0 14,8" fill="none" stroke={stroke} strokeWidth={1.5} />
          <circle cx={0} cy={0} r={5} fill={accent} />
        </g>
      );
    }

    case 'two_pressure_valve': {
      return (
        <g>
          <rect x={-28} y={-20} width={56} height={40} rx={4} fill={fillBg} stroke={stroke} strokeWidth={1.6} />
          <line x1={-38} y1={0} x2={-14} y2={0} stroke={stroke} strokeWidth={1.8} />
          <line x1={14} y1={0} x2={38} y2={0} stroke={stroke} strokeWidth={1.8} />
          <line x1={0} y1={-10} x2={0} y2={-27} stroke={stroke} strokeWidth={1.8} />
          <line x1={-14} y1={-10} x2={-14} y2={10} stroke={accent} strokeWidth={2} />
          <line x1={14} y1={-10} x2={14} y2={10} stroke={accent} strokeWidth={2} />
          <line x1={-14} y1={0} x2={14} y2={0} stroke={accent} strokeWidth={2} />
        </g>
      );
    }

    case 'quick_exhaust': {
      return (
        <g>
          <rect x={-28} y={-20} width={56} height={40} rx={4} fill={fillBg} stroke={stroke} strokeWidth={1.6} />
          <line x1={-38} y1={0} x2={-10} y2={0} stroke={stroke} strokeWidth={1.8} />
          <line x1={10} y1={0} x2={38} y2={0} stroke={stroke} strokeWidth={1.8} />
          <line x1={0} y1={8} x2={0} y2={27} stroke={stroke} strokeWidth={1.8} />
          <polygon points="0,4 -9,-8 9,-8" fill="none" stroke={accent} strokeWidth={1.6} />
          <line x1={-12} y1={8} x2={12} y2={8} stroke={stroke} strokeWidth={1.5} />
        </g>
      );
    }

    case 'flow_divider': {
      return (
        <g>
          <rect x={-32} y={-24} width={64} height={48} rx={4} fill={fillBg} stroke={stroke} strokeWidth={1.6} />
          <line x1={0} y1={30} x2={0} y2={12} stroke={stroke} strokeWidth={1.8} />
          <polyline points="0,12 -20,12 -20,-30" fill="none" stroke={stroke} strokeWidth={1.7} />
          <polyline points="0,12 20,12 20,-30" fill="none" stroke={stroke} strokeWidth={1.7} />
          <path d="M-24,-10 Q-20,-2 -16,-10" fill="none" stroke={accent} strokeWidth={1.6} />
          <path d="M16,-10 Q20,-2 24,-10" fill="none" stroke={accent} strokeWidth={1.6} />
        </g>
      );
    }

    case 'shutoff_valve': {
      const openPct = node.params.opening ?? 100;
      const open = node.params.active !== false && openPct > 0;
      const showBadge = node.params.showOpeningBadge === true;
      return (
        <g>
          <rect x={-36} y={-18} width={72} height={36} fill="transparent" />
          <line x1={-36} y1={0} x2={-14} y2={0} stroke={stroke} strokeWidth={1.8} />
          <line x1={14} y1={0} x2={36} y2={0} stroke={stroke} strokeWidth={1.8} />
          <polygon points="-14,-9 0,0 -14,9" fill={open ? accent : 'none'} stroke={stroke} strokeWidth={1.6} />
          <polygon points="14,-9 0,0 14,9" fill={open ? accent : 'none'} stroke={stroke} strokeWidth={1.6} />
          {!open && <line x1={0} y1={-12} x2={0} y2={12} stroke={activeColor} strokeWidth={2} />}
          {showBadge && (
            <g transform={`rotate(${-node.rotation})`}>
              <text x={0} y={21} textAnchor="middle" fontSize={8.5} className="font-mono" fill={accent}>
                {openPct}%
              </text>
            </g>
          )}
        </g>
      );
    }

    case 'nozzle': {
      const openPct = node.params.opening ?? 60;
      const bow = 2 + (100 - openPct) * 0.05;
      return (
        <g>
          <rect x={-36} y={-18} width={72} height={36} fill="transparent" />
          <line x1={-36} y1={0} x2={36} y2={0} stroke={stroke} strokeWidth={1.7} />
          <path d={`M-13,-10 Q0,${bow} 13,-10`} fill="none" stroke={stroke} strokeWidth={1.7} />
          <path d={`M-13,10 Q0,${-bow} 13,10`} fill="none" stroke={stroke} strokeWidth={1.7} />
          <g transform={`rotate(${-node.rotation})`}>
            <text x={0} y={node.rotation === 90 || node.rotation === 270 ? 3.5 : 21} textAnchor="middle" fontSize={8.5} className="font-mono" fill={muted}>
              {openPct}%
            </text>
          </g>
        </g>
      );
    }

    case 'orifice':
    case 'orifice_adjustable': {
      const openPct = node.params.opening ?? 50;
      const isAdj = node.type === 'orifice_adjustable';
      const showBadge = !isAdj || node.params.showOpeningBadge !== false;
      return (
        <g>
          <rect x={-37} y={-20} width={74} height={40} fill="transparent" />
          <line x1={isAdj ? -37 : -36} y1={0} x2={isAdj ? 37 : 36} y2={0} stroke={stroke} strokeWidth={1.7} />
          <polyline points="-7,-11 0,-3 7,-11" fill="none" stroke={stroke} strokeWidth={1.8} />
          <polyline points="-7,11 0,3 7,11" fill="none" stroke={stroke} strokeWidth={1.8} />
          {isAdj && (
            <>
              <line x1={-13} y1={13} x2={11} y2={-11} stroke={stroke} strokeWidth={1.5} />
              <polygon points="15,-15 7,-12.5 11.5,-8" fill={stroke} />
            </>
          )}
          {showBadge && (
            <g transform={`rotate(${-node.rotation})`}>
              <text x={0} y={node.rotation === 90 || node.rotation === 270 ? 3.5 : 21} textAnchor="middle" fontSize={8.5} className="font-mono" fill={muted}>
                {openPct}%
              </text>
            </g>
          )}
        </g>
      );
    }

    case 'throttle': {
      const openPct = node.params.opening ?? 65;
      const bow = 3.5 + (100 - openPct) * 0.045;
      const showBadge = node.params.showOpeningBadge !== false;
      return (
        <g>
          <rect x={-38} y={-22} width={76} height={44} fill="transparent" />
          {/* Straight center horizontal line */}
          <line x1={-38} y1={0} x2={38} y2={0} stroke={stroke} strokeWidth={1.8} />
          {/* Symmetric upper and lower converging arcs matching FluidSIM image */}
          <path d={`M-14,-11 Q0,${bow} 14,-11`} fill="none" stroke={stroke} strokeWidth={1.8} />
          <path d={`M-14,11 Q0,${-bow} 14,11`} fill="none" stroke={stroke} strokeWidth={1.8} />
          {/* Diagonal adjustment arrow bottom-left to top-right with solid arrowhead */}
          <line x1={-14} y1={14} x2={12} y2={-12} stroke={stroke} strokeWidth={1.55} />
          <polygon points="16,-16 7.8,-13.5 13.5,-7.8" fill={stroke} />
          {showBadge && (
            <g transform={`rotate(${-node.rotation})`}>
              <text
                x={node.rotation === 90 || node.rotation === 270 ? 22 : 0}
                y={node.rotation === 90 || node.rotation === 270 ? 3.5 : 22}
                textAnchor={node.rotation === 90 || node.rotation === 270 ? 'start' : 'middle'}
                fontSize={8.5}
                fontWeight={600}
                className="font-mono"
                fill={accent}
                paintOrder="stroke"
                stroke={fillBg}
                strokeWidth={3}
              >
                {openPct}%
              </text>
            </g>
          )}
        </g>
      );
    }

    case 'relief_valve':
    case 'prop_relief':
    case 'prop_relief_piloted': {
      const crack = node.params.crackingPressure ?? 100;
      const open = runtime?.isOpen ?? false;
      const isProp = node.type === 'prop_relief' || node.type === 'prop_relief_piloted';
      return (
        <g>
          <rect
            x={-26}
            y={-26}
            width={52}
            height={52}
            rx={4}
            fill={open ? (isDark ? '#450A0A' : '#FEE2E2') : fillBg}
            stroke={open ? activeColor : stroke}
            strokeWidth={1.8}
          />
          <line x1={0} y1={-32} x2={0} y2={-26} stroke={stroke} strokeWidth={1.8} />
          <line x1={0} y1={26} x2={0} y2={32} stroke={stroke} strokeWidth={1.8} />
          <line x1={0} y1={-16} x2={0} y2={16} stroke={open ? activeColor : stroke} strokeWidth={2} />
          <polygon points="0,16 -5,8 5,8" fill={open ? activeColor : stroke} />
          <polyline points="0,-26 -18,-26 -18,0 -26,0" fill="none" stroke={accent} strokeWidth={1.2} strokeDasharray="3 2" />
          <path d="M26,-6 L32,-2 L26,2 L32,6 L26,10" fill="none" stroke={muted} strokeWidth={1.3} />
          {isProp && (
            <>
              <rect x={26} y={-12} width={12} height={14} fill={fillBg} stroke={stroke} strokeWidth={1.3} />
              <line x1={23} y1={14} x2={40} y2={-14} stroke={accent} strokeWidth={1.5} />
            </>
          )}
          <text x={0} y={-15} textAnchor="middle" fontSize={8} className="font-mono" fill={muted}>
            {crack}b
          </text>
        </g>
      );
    }

    case 'prop_pressure_reducer': {
      const target = node.params.targetPressure ?? 50;
      return (
        <g>
          <rect x={-26} y={-26} width={52} height={52} rx={4} fill={fillBg} stroke={stroke} strokeWidth={1.8} />
          <line x1={0} y1={-32} x2={0} y2={-26} stroke={stroke} strokeWidth={1.8} />
          <line x1={0} y1={26} x2={0} y2={32} stroke={stroke} strokeWidth={1.8} />
          <line x1={0} y1={-16} x2={0} y2={16} stroke={stroke} strokeWidth={2} />
          <polygon points="0,-16 -5,-8 5,-8" fill={stroke} />
          <polyline points="0,-26 -18,-26 -18,0 -26,0" fill="none" stroke={accent} strokeWidth={1.2} strokeDasharray="3 2" />
          <rect x={26} y={-8} width={12} height={14} fill={fillBg} stroke={stroke} strokeWidth={1.3} />
          <line x1={23} y1={12} x2={40} y2={-12} stroke={accent} strokeWidth={1.5} />
          <text x={0} y={20} textAnchor="middle" fontSize={8} className="font-mono" fill={muted}>
            {target}b
          </text>
        </g>
      );
    }

    case 'prop_solenoid': {
      const openPct = node.params.opening ?? 75;
      return (
        <g>
          <line x1={-41} y1={0} x2={-20} y2={0} stroke={stroke} strokeWidth={1.6} />
          <rect x={-20} y={-14} width={28} height={28} fill={fillBg} stroke={stroke} strokeWidth={1.6} />
          <line x1={-16} y1={18} x2={6} y2={-18} stroke={accent} strokeWidth={1.6} />
          <polygon points="6,-18 0,-15 4,-11" fill={accent} />
          <line x1={8} y1={0} x2={24} y2={0} stroke={stroke} strokeWidth={1.3} strokeDasharray="3 2" />
          <polygon points="24,-10 34,-10 29,0" fill="none" stroke={stroke} strokeWidth={1.4} />
          <polygon points="24,10 34,10 29,0" fill="none" stroke={stroke} strokeWidth={1.4} />
          <line x1={34} y1={0} x2={41} y2={0} stroke={stroke} strokeWidth={1.6} />
          <text x={-6} y={23} textAnchor="middle" fontSize={8} className="font-mono" fill={muted}>
            {openPct}%
          </text>
        </g>
      );
    }

    case 'sequence_valve':
    case 'counterbalance_valve':
    case 'pressure_compensator': {
      const crack = node.params.crackingPressure ?? node.params.targetPressure ?? 45;
      const open = runtime?.isOpen ?? false;
      return (
        <g>
          <rect
            x={-28}
            y={-24}
            width={56}
            height={48}
            rx={4}
            fill={open ? (isDark ? '#0C4A6E' : '#E0F2FE') : fillBg}
            stroke={open ? accent : stroke}
            strokeWidth={1.8}
          />
          <line x1={-38} y1={0} x2={-28} y2={0} stroke={stroke} strokeWidth={1.8} />
          <line x1={28} y1={0} x2={38} y2={0} stroke={stroke} strokeWidth={1.8} />
          <line x1={-18} y1={0} x2={18} y2={0} stroke={stroke} strokeWidth={1.8} />
          <polygon points="18,0 10,-4.5 10,4.5" fill={stroke} />
          <polyline points="-28,0 -28,-16 0,-16" fill="none" stroke={accent} strokeWidth={1.2} strokeDasharray="3 2" />
          <path d="M28,-6 L34,-2 L28,2 L34,6" fill="none" stroke={muted} strokeWidth={1.3} />
          <text x={0} y={18} textAnchor="middle" fontSize={8} className="font-mono" fill={muted}>
            {crack}b
          </text>
        </g>
      );
    }

    case 'distance_rule': {
      const strokeMm = node.params.strokeMm ?? 200;
      const cells = 10;
      const w = 120;
      const step = w / cells;
      return (
        <g>
          <rect x={-60} y={-8} width={w} height={16} fill={fillBg} stroke={stroke} strokeWidth={1.5} />
          {Array.from({ length: cells - 1 }).map((_, idx) => (
            <line
              key={idx}
              x1={-60 + (idx + 1) * step}
              y1={-8}
              x2={-60 + (idx + 1) * step}
              y2={8}
              stroke={stroke}
              strokeWidth={1.1}
            />
          ))}
          <text x={0} y={-11} textAnchor="middle" fontSize={8} className="font-mono" fill={muted}>
            0..{strokeMm} mm
          </text>
        </g>
      );
    }

    case 'cylinder_single': {
      const cfg = node.params.cylinderConfig;
      const strokeMm = node.params.strokeMm ?? 200;
      const travelPx = pistonPos * 56;
      const capP = runtime?.chamberAPressure ?? 0;
      const scaleX = cfg?.mirrorHorizontal ? -1 : 1;
      const scaleY = cfg?.mirrorVertical ? -1 : 1;
      const activeLabels = (cfg?.actuationLabels ?? []).filter((l) => l.mark.trim());
      const readoutParts = [`${Math.round(pistonPos * 100)}%`];
      if (cfg?.showVelocity) readoutParts.push(`${(runtime?.velocityMs ?? 0).toFixed(2)} m/s`);
      if (cfg?.showForce) readoutParts.push(`${Math.round(runtime?.forceN ?? 0)} N`);

      return (
        <g>
          <g transform={`scale(${scaleX}, ${scaleY})`}>
            <rect x={-64} y={-20} width={110} height={40} rx={3} fill={fillBg} stroke={stroke} strokeWidth={2} />
            <rect
              x={-62}
              y={-18}
              width={Math.max(4, 18 + travelPx)}
              height={36}
              fill={capP > 1 ? accent : 'transparent'}
              fillOpacity={Math.min(0.45, 0.12 + capP / 200)}
            />
            {cfg?.cushioning && (
              <>
                <rect x={-48 + travelPx} y={-8} width={4} height={16} fill={muted} stroke={stroke} strokeWidth={0.9} />
                {cfg.cushioningAdjustable && (
                  <line x1={-58} y1={14} x2={-44} y2={-14} stroke={stroke} strokeWidth={1.1} />
                )}
              </>
            )}
            {(cfg?.springReturn ?? true) && (
              <path
                d={`M${-36 + travelPx},0 L${-24 + travelPx * 0.7},-8 L${-12 + travelPx * 0.5},8 L0,-8 L16,8 L32,-8 L44,0`}
                fill="none"
                stroke={muted}
                strokeWidth={1.4}
              />
            )}
            <rect x={-46 + travelPx} y={-18} width={10} height={36} fill={stroke} />
            {cfg?.sensing && (
              <rect x={-44 + travelPx} y={-16} width={6} height={6} fill={accent} />
            )}
            {cfg?.rodType !== 'rodless' && (
              <rect x={-36 + travelPx} y={-5} width={86} height={10} fill={muted} stroke={stroke} strokeWidth={1.2} />
            )}
            {cfg?.throughRod && cfg?.rodType !== 'rodless' && (
              <rect x={-82} y={-5} width={36 + travelPx} height={10} fill={muted} stroke={stroke} strokeWidth={1.2} />
            )}
            <line x1={-56} y1={20} x2={-56} y2={30} stroke={stroke} strokeWidth={1.8} />
          </g>

          {activeLabels.length > 0 && (
            <g transform="translate(0, -34)">
              <line x1={-56} y1={0} x2={40} y2={0} stroke={stroke} strokeWidth={1.2} />
              {activeLabels.map((lbl, idx) => {
                const startRatio = Math.min(1, Math.max(0, (Number(lbl.startMm) || 0) / Math.max(1, strokeMm)));
                const lx = -56 + startRatio * 96;
                return (
                  <g key={idx} transform={`translate(${lx}, 0)`}>
                    <line x1={0} y1={-4} x2={0} y2={4} stroke={accent} strokeWidth={1.5} />
                    <text x={0} y={-6} textAnchor="middle" fontSize={8} fontWeight={600} fill={accent}>
                      {lbl.mark}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          <text x={-10} y={activeLabels.length > 0 ? -48 : -24} textAnchor="middle" fontSize={9.5} className="font-mono" fill={muted}>
            {readoutParts.join(' · ')}
          </text>
        </g>
      );
    }

    case 'cylinder_double': {
      const cfg = node.params.cylinderConfig;
      const strokeMm = node.params.strokeMm ?? 250;
      const travelPx = pistonPos * 60;
      const capA = runtime?.chamberAPressure ?? 0;
      const capB = runtime?.chamberBPressure ?? 0;
      const scaleX = cfg?.mirrorHorizontal ? -1 : 1;
      const scaleY = cfg?.mirrorVertical ? -1 : 1;
      const activeLabels = (cfg?.actuationLabels ?? []).filter((l) => l.mark.trim());
      const readoutParts = [`${Math.round(pistonPos * 100)}%`];
      if (cfg?.showVelocity) readoutParts.push(`${(runtime?.velocityMs ?? 0).toFixed(2)} m/s`);
      if (cfg?.showForce || !cfg) readoutParts.push(`${Math.round(runtime?.forceN ?? 0)} N`);

      return (
        <g>
          <g transform={`scale(${scaleX}, ${scaleY})`}>
            <rect x={-68} y={-22} width={116} height={44} rx={3} fill={fillBg} stroke={stroke} strokeWidth={2} />
            <rect
              x={-66}
              y={-20}
              width={Math.max(4, 16 + travelPx)}
              height={40}
              fill={capA > 1 ? (capA > 70 ? activeColor : accent) : 'transparent'}
              fillOpacity={Math.min(0.42, 0.1 + capA / 220)}
            />
            <rect
              x={-40 + travelPx}
              y={-20}
              width={Math.max(4, 86 - travelPx)}
              height={40}
              fill={capB > 1 ? accent : 'transparent'}
              fillOpacity={Math.min(0.35, 0.1 + capB / 220)}
            />
            {cfg?.cushioning && (
              <>
                <rect x={-55 + travelPx} y={-9} width={5} height={18} fill={muted} stroke={stroke} strokeWidth={0.9} />
                <rect x={-40 + travelPx} y={-9} width={5} height={18} fill={muted} stroke={stroke} strokeWidth={0.9} />
                {cfg.cushioningAdjustable && (
                  <>
                    <line x1={-60} y1={16} x2={-48} y2={-16} stroke={stroke} strokeWidth={1.1} />
                    <line x1={32} y1={16} x2={44} y2={-16} stroke={stroke} strokeWidth={1.1} />
                  </>
                )}
              </>
            )}
            <rect x={-50 + travelPx} y={-20} width={10} height={40} fill={stroke} />
            {cfg?.sensing && (
              <rect x={-48 + travelPx} y={-18} width={6} height={6} fill={accent} />
            )}
            {cfg?.rodType !== 'rodless' && (
              <>
                <rect x={-40 + travelPx} y={-6} width={92} height={12} fill={muted} stroke={stroke} strokeWidth={1.2} />
                {cfg?.rodType === 'double' && (
                  <rect x={-40 + travelPx} y={-12} width={92} height={4} fill={muted} stroke={stroke} strokeWidth={1} />
                )}
              </>
            )}
            {cfg?.throughRod && cfg?.rodType !== 'rodless' && (
              <rect x={-86} y={-6} width={36 + travelPx} height={12} fill={muted} stroke={stroke} strokeWidth={1.2} />
            )}
            <line x1={-60} y1={22} x2={-60} y2={32} stroke={stroke} strokeWidth={1.8} />
            <line x1={36} y1={22} x2={36} y2={32} stroke={stroke} strokeWidth={1.8} />
          </g>

          {activeLabels.length > 0 && (
            <g transform="translate(0, -36)">
              <line x1={-60} y1={0} x2={44} y2={0} stroke={stroke} strokeWidth={1.2} />
              {activeLabels.map((lbl, idx) => {
                const startRatio = Math.min(1, Math.max(0, (Number(lbl.startMm) || 0) / Math.max(1, strokeMm)));
                const lx = -60 + startRatio * 104;
                return (
                  <g key={idx} transform={`translate(${lx}, 0)`}>
                    <line x1={0} y1={-4} x2={0} y2={4} stroke={accent} strokeWidth={1.5} />
                    <text x={0} y={-6} textAnchor="middle" fontSize={8} fontWeight={600} fill={accent}>
                      {lbl.mark}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          <text x={-10} y={activeLabels.length > 0 ? -50 : -29} textAnchor="middle" fontSize={9.5} className="font-mono" fill={muted}>
            {readoutParts.join(' · ')}
          </text>
        </g>
      );
    }

    case 'motor': {
      const rpm = runtime?.rpm ?? 0;
      return (
        <g>
          <circle cx={-6} cy={0} r={22} fill={fillBg} stroke={stroke} strokeWidth={1.8} />
          <line x1={0} y1={-36} x2={0} y2={-21} stroke={stroke} strokeWidth={1.8} />
          <line x1={0} y1={21} x2={0} y2={36} stroke={stroke} strokeWidth={1.8} />
          <polygon points="-6,-10 -12,-20 0,-20" fill={accent} />
          <polygon points="-6,10 -12,20 0,20" fill={muted} />
          <line x1={16} y1={-4} x2={36} y2={-4} stroke={stroke} strokeWidth={1.7} />
          <line x1={16} y1={4} x2={36} y2={4} stroke={stroke} strokeWidth={1.7} />
          <path d="M26,-16 A16,16 0 0,1 26,16" fill="none" stroke={accent} strokeWidth={1.4} />
          <text x={-6} y={3} textAnchor="middle" fontSize={8.5} className="font-mono" fill={muted}>
            {rpm}
          </text>
        </g>
      );
    }

    case 'rotary_actuator': {
      const rotaryPos =
        runtime?.pistonPos ?? (node.params.rotaryInitialPos === 'right' ? 1 : 0);
      const deg = Math.round(rotaryPos * (node.params.strokeMm ?? 180));
      const markText = [node.params.sensingMark, node.params.secondaryMark]
        .filter((m) => m && m.trim().length > 0)
        .join(' / ');
      return (
        <g>
          <path d="M-16,-24 H-6 A24,24 0 0,1 -6,24 H-16 Z" fill={fillBg} stroke={stroke} strokeWidth={1.8} />
          <polygon points="-16,-24 4,-19 -16,-8" fill={accent} />
          <line x1={-42} y1={-16} x2={-16} y2={-16} stroke={stroke} strokeWidth={1.8} />
          <line x1={-42} y1={16} x2={-16} y2={16} stroke={stroke} strokeWidth={1.8} />
          <line x1={18} y1={-4} x2={40} y2={-4} stroke={stroke} strokeWidth={1.7} />
          <line x1={18} y1={4} x2={40} y2={4} stroke={stroke} strokeWidth={1.7} />
          <text x={2} y={5} textAnchor="middle" fontSize={8.5} className="font-mono" fill={muted}>
            {deg}°
          </text>
          {markText && (
            <text x={0} y={-28} textAnchor="middle" fontSize={8} fontWeight={600} fill={accent}>
              {markText}
            </text>
          )}
        </g>
      );
    }

    case 'pressure_gauge': {
      const pVal = runtime?.portPressures?.in ?? pressureIn;
      const maxScale = fluid === 'hydraulic' ? 200 : 12;
      const angleDeg = -135 + Math.min(1, pVal / maxScale) * 270;
      return (
        <g>
          <line x1={0} y1={22} x2={0} y2={32} stroke={stroke} strokeWidth={1.8} />
          <circle cx={0} cy={-2} r={24} fill={fillBg} stroke={stroke} strokeWidth={2} />
          <g transform={`translate(0, -4) rotate(${angleDeg})`}>
            <line x1={0} y1={2} x2={0} y2={-15} stroke={activeColor} strokeWidth={2} strokeLinecap="round" />
          </g>
          <circle cx={0} cy={-4} r={2.5} fill={stroke} />
          <text
            x={0}
            y={17}
            textAnchor="middle"
            fontSize={8.5}
            fontWeight={600}
            className="font-mono"
            fill={accent}
            paintOrder="stroke"
            stroke={fillBg}
            strokeWidth={3}
          >
            {pVal.toFixed(1)}b
          </text>
        </g>
      );
    }

    case 'diff_pressure_gauge': {
      const p1 = runtime?.portPressures?.p1 ?? 0;
      const p2 = runtime?.portPressures?.p2 ?? 0;
      const dp = Math.abs(p1 - p2);
      return (
        <g>
          <line x1={-14} y1={18} x2={-14} y2={32} stroke={stroke} strokeWidth={1.8} />
          <line x1={14} y1={18} x2={14} y2={32} stroke={stroke} strokeWidth={1.8} />
          <circle cx={0} cy={-4} r={24} fill={fillBg} stroke={stroke} strokeWidth={2} />
          <line x1={11} y1={7} x2={-11} y2={-15} stroke={activeColor} strokeWidth={1.9} />
          <polygon points="-11,-15 -9,-8 -4,-13" fill={activeColor} />
          <text
            x={0}
            y={15}
            textAnchor="middle"
            fontSize={8.5}
            fontWeight={600}
            className="font-mono"
            fill={accent}
            paintOrder="stroke"
            stroke={fillBg}
            strokeWidth={3}
          >
            Δ{dp.toFixed(1)}b
          </text>
        </g>
      );
    }

    case 'pressure_indicator': {
      const active = runtime?.isOpen ?? false;
      const pVal = runtime?.portPressures?.in ?? pressureIn;
      const sigCol = node.params.signalColor ?? '#800000';
      return (
        <g>
          <line x1={0} y1={22} x2={0} y2={32} stroke={stroke} strokeWidth={1.8} />
          <circle
            cx={0}
            cy={-2}
            r={23}
            fill={active ? sigCol : fillBg}
            stroke={active ? sigCol : stroke}
            strokeWidth={2}
          />
          <line
            x1={-16}
            y1={-18}
            x2={16}
            y2={14}
            stroke={active ? '#FFFFFF' : stroke}
            strokeWidth={1.8}
          />
          <line
            x1={16}
            y1={-18}
            x2={-16}
            y2={14}
            stroke={active ? '#FFFFFF' : stroke}
            strokeWidth={1.8}
          />
          <text
            x={0}
            y={16}
            textAnchor="middle"
            fontSize={8}
            className="font-mono"
            fill={active ? '#FFFFFF' : muted}
          >
            {pVal.toFixed(0)}b
          </text>
        </g>
      );
    }

    case 'flow_meter':
    case 'flow_meter_analog': {
      const flow = runtime?.flowLpm ?? 0;
      const accVol = runtime?.accumulatedVolumeL ?? 0;
      const mode =
        node.params.flowDisplayMode ??
        (node.type === 'flow_meter_analog' ? 'accumulated' : 'instantaneous');
      const isAccMode = mode === 'accumulated';
      return (
        <g>
          <line x1={0} y1={-32} x2={0} y2={-22} stroke={stroke} strokeWidth={1.8} />
          <line x1={0} y1={22} x2={0} y2={32} stroke={stroke} strokeWidth={1.8} />
          <circle cx={0} cy={0} r={22} fill={fillBg} stroke={stroke} strokeWidth={1.8} />
          <path d="M-12,-14 Q-4,0 -12,14" fill="none" stroke={accent} strokeWidth={1.7} />
          <path d="M12,-14 Q4,0 12,14" fill="none" stroke={accent} strokeWidth={1.7} />
          {isAccMode && (
            <text x={0} y={-4} textAnchor="middle" fontSize={10} fontWeight={700} fill={stroke}>
              M
            </text>
          )}
          <text x={0} y={12} textAnchor="middle" fontSize={7.5} className="font-mono" fill={muted}>
            {isAccMode ? `${accVol.toFixed(2)}l` : flow.toFixed(1)}
          </text>
        </g>
      );
    }

    case 'flow_sensor_elec': {
      const flow = runtime?.flowLpm ?? 0;
      return (
        <g>
          <line x1={-18} y1={-32} x2={-18} y2={-20} stroke={stroke} strokeWidth={1.8} />
          <line x1={-18} y1={20} x2={-18} y2={32} stroke={stroke} strokeWidth={1.8} />
          <circle cx={-18} cy={0} r={20} fill={fillBg} stroke={stroke} strokeWidth={1.8} />
          <path d="M-28,-13 Q-22,0 -28,13" fill="none" stroke={accent} strokeWidth={1.6} />
          <path d="M-8,-13 Q-14,0 -8,13" fill="none" stroke={accent} strokeWidth={1.6} />
          <line x1={2} y1={0} x2={14} y2={0} stroke={stroke} strokeWidth={1.6} />
          <polygon points="14,0 8,-3.5 8,3.5" fill={stroke} />
          <rect x={14} y={-15} width={28} height={30} fill={fillBg} stroke={stroke} strokeWidth={1.6} />
          <line x1={14} y1={15} x2={42} y2={-15} stroke={stroke} strokeWidth={1.3} />
          <path d="M24,10 A6,6 0 0,1 36,10" fill="none" stroke={accent} strokeWidth={1.4} />
          <text x={-18} y={4} textAnchor="middle" fontSize={8} className="font-mono" fill={muted}>
            {flow.toFixed(1)}
          </text>
        </g>
      );
    }

    case 'pressure_switch':
    case 'pressure_sensor_elec': {
      const threshold = node.params.crackingPressure ?? 50;
      const tripped = runtime?.isOpen ?? false;
      const hasSpring = node.type === 'pressure_switch';
      return (
        <g>
          <line x1={hasSpring ? -36 : -34} y1={0} x2={-20} y2={0} stroke={stroke} strokeWidth={1.8} />
          <rect
            x={-20}
            y={-18}
            width={40}
            height={36}
            fill={tripped ? (isDark ? '#064E3B' : '#DCFCE7') : fillBg}
            stroke={tripped ? '#16A34A' : stroke}
            strokeWidth={1.8}
          />
          <line x1={-20} y1={18} x2={20} y2={-18} stroke={stroke} strokeWidth={1.4} />
          <path d="M2,12 A7,7 0 0,1 14,12" fill="none" stroke={stroke} strokeWidth={1.4} />
          {hasSpring && (
            <path d="M20,-5 L27,-2 L20,1 L27,4" fill="none" stroke={muted} strokeWidth={1.2} />
          )}
          <text x={0} y={-22} textAnchor="middle" fontSize={8.5} className="font-mono" fill={accent}>
            {threshold}b
          </text>
        </g>
      );
    }

    case 'tachometer_sensor': {
      const rpm = runtime?.rpm ?? 0;
      return (
        <g>
          <line x1={-20} y1={-33} x2={-20} y2={-19} stroke={stroke} strokeWidth={1.8} />
          <line x1={-20} y1={19} x2={-20} y2={33} stroke={stroke} strokeWidth={1.8} />
          <circle cx={-20} cy={0} r={19} fill={fillBg} stroke={stroke} strokeWidth={1.8} />
          <polygon points="-20,-8 -25,-16 -15,-16" fill={accent} />
          <polygon points="-20,8 -25,16 -15,16" fill={muted} />
          <line x1={-1} y1={-3} x2={14} y2={-3} stroke={stroke} strokeWidth={1.6} />
          <line x1={-1} y1={3} x2={14} y2={3} stroke={stroke} strokeWidth={1.6} />
          <rect x={14} y={-16} width={30} height={32} fill={fillBg} stroke={stroke} strokeWidth={1.6} />
          <circle cx={29} cy={0} r={8.5} fill="none" stroke={stroke} strokeWidth={1.4} />
          <text x={29} y={24} textAnchor="middle" fontSize={8} className="font-mono" fill={accent}>
            {rpm} RPM
          </text>
        </g>
      );
    }

    case 'tee': {
      if (node.params.compactJunction) {
        return <circle cx={0} cy={0} r={4.5} fill={stroke} />;
      }
      return (
        <g>
          <line x1={-24} y1={0} x2={24} y2={0} stroke={stroke} strokeWidth={2.4} />
          <line x1={0} y1={0} x2={0} y2={24} stroke={stroke} strokeWidth={2.4} />
          <circle cx={0} cy={0} r={5} fill={accent} />
        </g>
      );
    }

    default: {
      const isActive = Boolean(node.params.active) || Boolean(runtime?.isOpen);
      const extNode = renderExtendedSymbolSvg({
        type: node.type,
        stroke,
        fillBg,
        accent,
        muted,
        active: isActive,
        label: node.label,
        isThumb: false,
        funcGenWaveform: node.params.funcGenWaveform,
        relayDelaySec: node.params.relayDelaySec,
        counterPreset: node.params.counterPreset,
      });
      if (!extNode) return null;

      const showCracking =
        node.type === 'relief_valve_piloted' ||
        node.type === 'relief_valve_ext' ||
        node.type === 'pressure_compensator_b' ||
        node.type === 'pressure_compensator_c' ||
        node.type === 'pressure_compensator_d' ||
        node.type === 'cartridge_valve_a' ||
        node.type === 'cartridge_valve_b' ||
        node.type === 'cartridge_valve_c' ||
        node.type === 'elec_pressure_switch' ||
        node.type === 'elec_pressure_transducer';
      const showSetPressure =
        node.type === 'pressure_reducer_2' || node.type === 'pressure_reducer_3';
      const showMarkBadge =
        (node.type.startsWith('elec_push_') ||
          node.type.startsWith('elec_switch_') ||
          node.type.startsWith('elec_contact_') ||
          node.type === 'elec_valve_solenoid' ||
          node.type === 'elec_prop_solenoid' ||
          node.type === 'elec_relay' ||
          node.type === 'elec_relay_ton' ||
          node.type === 'elec_relay_toff' ||
          node.type === 'elec_counter_relay' ||
          node.type.startsWith('ladder_push_') ||
          node.type.startsWith('ladder_contact_') ||
          node.type === 'ladder_solenoid' ||
          node.type.startsWith('ladder_relay')) &&
        Boolean(node.params.sensingMark?.trim());

      return (
        <g>
          {extNode}
          {showCracking && (
            <text x={32} y={-14} fontSize={8} className="font-mono" fill={muted}>
              {node.params.crackingPressure ?? 50}b
            </text>
          )}
          {showSetPressure && (
            <text x={32} y={-14} fontSize={8} className="font-mono" fill={muted}>
              {node.params.targetPressure ?? 50}b
            </text>
          )}
          {showMarkBadge && (
            <g data-actuator-trigger="left" className="cursor-pointer">
              <text
                x={node.type.startsWith('ladder_') ? 0 : -29}
                y={node.type.startsWith('ladder_') ? -18 : -13}
                textAnchor={node.type.startsWith('ladder_') ? 'middle' : 'end'}
                fontSize={8.5}
                fontWeight={700}
                className="font-mono"
                fill={accent}
              >
                {node.params.sensingMark?.trim()}
              </text>
            </g>
          )}
        </g>
      );
    }
  }
};
