import React from 'react';
import type { ComponentType, CylinderConfig, ValveConfig } from '../types/circuit';
import { getExtendedThumbViewBox, renderExtendedSymbolSvg } from './ExtendedSymbolRenderers';
import { ValveActuationSvg, ValveChamberPatternSvg } from './ValveIsoRenderer';

interface ComponentSymbolThumbProps {
  type: ComponentType;
  isDark?: boolean;
  valveConfig?: ValveConfig;
  cylinderConfig?: Partial<CylinderConfig>;
}

export const ComponentSymbolThumb: React.FC<ComponentSymbolThumbProps> = ({
  type,
  isDark = false,
  valveConfig,
  cylinderConfig,
}) => {
  const stroke = isDark ? '#E2E8F0' : '#0F172A';
  const accent = '#0284C7';

  if (
    type === 'valve_2_2' ||
    type === 'valve_3_2' ||
    type === 'valve_4_2' ||
    type === 'valve_5_2' ||
    type === 'valve_6_2' ||
    type === 'valve_4_3' ||
    type === 'valve_5_3' ||
    type === 'prop_valve_4_3' ||
    type === 'servo_valve_4_3'
  ) {
    const isThree =
      type === 'valve_4_3' ||
      type === 'valve_5_3' ||
      type === 'prop_valve_4_3' ||
      type === 'servo_valve_4_3';
    const isContinuous = type === 'prop_valve_4_3' || type === 'servo_valve_4_3';
    const isSixWay = type === 'valve_6_2';
    const count = isThree ? 3 : 2;
    const cw = isSixWay ? 20 : isThree ? 14 : 16;
    const ch = 18;
    const startX = isSixWay ? 16 : isThree ? 15 : 20;
    const topY = 11;
    const defaultChambers =
      type === 'valve_2_2'
        ? ['parallel', 'closed']
        : type === 'valve_3_2'
          ? ['p_to_a_b_exhaust', 'p_closed_ab_t']
          : isSixWay
            ? ['crossed', 'parallel']
            : isThree
              ? ['crossed', 'closed', 'parallel']
              : ['parallel', 'crossed'];
    const chambers = valveConfig?.chambers ?? defaultChambers;
    const portVariant =
      type === 'valve_2_2'
        ? 'two_way'
        : type === 'valve_3_2'
          ? 'three_way'
          : type === 'valve_5_2' || type === 'valve_5_3'
            ? 'five_way'
            : isSixWay
              ? 'six_way'
              : 'four_way';

    // Align port stems + connector circles over the resting chamber (idx = 1)
    const rcx = startX + cw * 1.5;
    const topXs =
      type === 'valve_2_2' || type === 'valve_3_2'
        ? [rcx]
        : isSixWay
          ? [rcx - 6, rcx, rcx + 6]
          : [rcx - 3.5, rcx + 3.5];
    const bottomXs =
      type === 'valve_2_2'
        ? [rcx]
        : type === 'valve_3_2'
          ? [rcx - 4, rcx + 4]
          : type === 'valve_5_2' || type === 'valve_5_3'
            ? [rcx - 4.5, rcx, rcx + 4.5]
            : isSixWay
              ? [rcx - 6, rcx, rcx + 6]
              : [rcx - 3.5, rcx + 3.5];
    const portFill = isDark ? '#0F172A' : '#FFFFFF';

    return (
      <svg viewBox="0 0 72 40" className="w-12 h-8">
        {isContinuous && (
          <>
            <line x1={startX} y1={topY - 2.5} x2={startX + count * cw} y2={topY - 2.5} stroke={stroke} strokeWidth="1.1" />
            <line x1={startX} y1={topY + ch + 2.5} x2={startX + count * cw} y2={topY + ch + 2.5} stroke={stroke} strokeWidth="1.1" />
          </>
        )}
        {Array.from({ length: count }).map((_, idx) => (
          <g key={idx}>
            <rect
              x={startX + idx * cw}
              y={topY}
              width={cw}
              height={ch}
              fill="none"
              stroke={stroke}
              strokeWidth="1.3"
            />
            <ValveChamberPatternSvg
              pattern={(chambers[idx] as never) || 'closed'}
              x={startX + idx * cw}
              y={topY}
              w={cw}
              h={ch}
              stroke={stroke}
              portVariant={portVariant}
            />
          </g>
        ))}
        {valveConfig && (
          <g>
            <ValveActuationSvg
              side="left"
              actuation={valveConfig.leftActuation}
              edgeX={startX}
              centerY={topY + ch / 2}
              stroke={stroke}
              accent={accent}
            />
            <ValveActuationSvg
              side="right"
              actuation={valveConfig.rightActuation}
              edgeX={startX + count * cw}
              centerY={topY + ch / 2}
              stroke={stroke}
              accent={accent}
            />
          </g>
        )}
        {!valveConfig && isContinuous && (
          <g>
            {/* Left top spring + proportional solenoid + diagonal arrow + outer circle */}
            <path d={`M${startX},${topY + 1} L${startX - 2.5},${topY + 6} L${startX - 5},${topY + 1} L${startX - 7.5},${topY + 6} L${startX - 10},${topY + 1}`} fill="none" stroke={stroke} strokeWidth="1" />
            <rect x={4} y={topY + 8} width={11} height={9} fill="none" stroke={stroke} strokeWidth="1.1" />
            <line x1={6.5} y1={topY + 17} x2={12.5} y2={topY + 8} stroke={stroke} strokeWidth="1.0" />
            <line x1={14} y1={topY + 19} x2={2} y2={topY + 5} stroke={stroke} strokeWidth="1.1" />
            <polygon points={`2,${topY + 5} 3.5,${topY + 8.5} 6,${topY + 6.5}`} fill={stroke} />
            <circle cx={4} cy={topY + 12.5} r={1.6} fill="#FFFFFF" stroke={stroke} strokeWidth="0.9" />
            {type === 'prop_valve_4_3' ? (
              <>
                {/* Right top spring + proportional solenoid + diagonal arrow + outer circle */}
                <path d={`M${startX + count * cw},${topY + 1} L${startX + count * cw + 2.5},${topY + 6} L${startX + count * cw + 5},${topY + 1} L${startX + count * cw + 7.5},${topY + 6} L${startX + count * cw + 10},${topY + 1}`} fill="none" stroke={stroke} strokeWidth="1" />
                <rect x={startX + count * cw} y={topY + 8} width={11} height={9} fill="none" stroke={stroke} strokeWidth="1.1" />
                <line x1={startX + count * cw + 2.5} y1={topY + 17} x2={startX + count * cw + 8.5} y2={topY + 8} stroke={stroke} strokeWidth="1.0" />
                <line x1={startX + count * cw + 1} y1={topY + 19} x2={startX + count * cw + 13} y2={topY + 5} stroke={stroke} strokeWidth="1.1" />
                <polygon points={`${startX + count * cw + 13},${topY + 5} ${startX + count * cw + 11.5},${topY + 8.5} ${startX + count * cw + 9},${topY + 6.5}`} fill={stroke} />
                <circle cx={startX + count * cw + 11} cy={topY + 12.5} r={1.6} fill="#FFFFFF" stroke={stroke} strokeWidth="0.9" />
              </>
            ) : (
              <path d={`M${startX + count * cw},${topY + 1} L${startX + count * cw + 2.5},${topY + 6} L${startX + count * cw + 5},${topY + 1} L${startX + count * cw + 7.5},${topY + 6} L${startX + count * cw + 10},${topY + 1}`} fill="none" stroke={stroke} strokeWidth="1" />
            )}
          </g>
        )}
        {/* Port stems + port connector circles aligned over resting chamber */}
        {topXs.map((px, i) => (
          <g key={`top-${i}`}>
            <line x1={px} y1={topY - 4} x2={px} y2={topY} stroke={stroke} strokeWidth="1.15" />
            <circle cx={px} cy={topY - 4.5} r={1.25} fill={portFill} stroke={stroke} strokeWidth="1" />
          </g>
        ))}
        {bottomXs.map((px, i) => (
          <g key={`bot-${i}`}>
            <line x1={px} y1={topY + ch} x2={px} y2={topY + ch + 4} stroke={stroke} strokeWidth="1.15" />
            <circle cx={px} cy={topY + ch + 4.5} r={1.25} fill={portFill} stroke={stroke} strokeWidth="1" />
          </g>
        ))}
      </svg>
    );
  }

  switch (type) {
    // 1. Elementos de alimentação
    case 'power_unit_simple':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <polygon points="24,10 14,29 34,29" fill={stroke} />
          <line x1="24" y1="6" x2="24" y2="11" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );

    case 'pump':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <circle cx="24" cy="20" r="11" fill="none" stroke={stroke} strokeWidth="1.6" />
          <polygon points="24,9.5 19.5,16 28.5,16" fill={stroke} />
          <line x1="24" y1="3" x2="24" y2="9" stroke={stroke} strokeWidth="1.5" />
          <line x1="24" y1="31" x2="24" y2="37" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );

    case 'pump_variable':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <circle cx="24" cy="20" r="11" fill="none" stroke={stroke} strokeWidth="1.6" />
          <polygon points="24,9.5 19.5,16 28.5,16" fill={stroke} />
          <line x1="24" y1="3" x2="24" y2="9" stroke={stroke} strokeWidth="1.5" />
          <line x1="24" y1="31" x2="24" y2="37" stroke={stroke} strokeWidth="1.5" />
          <line x1="12" y1="31" x2="36" y2="9" stroke={stroke} strokeWidth="1.4" />
          <polygon points="36,9 30.5,10.5 34.5,14.5" fill={stroke} />
        </svg>
      );

    case 'compressor':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <circle cx="22" cy="20" r="11" fill="none" stroke={stroke} strokeWidth="1.6" />
          <polygon points="18,14 27,20 18,26" fill="none" stroke={stroke} strokeWidth="1.5" />
          <line x1="33" y1="20" x2="43" y2="20" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );

    case 'tank':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <path d="M16,20 V29 H32 V20" fill="none" stroke={stroke} strokeWidth="1.6" />
          <line x1="24" y1="10" x2="24" y2="26" stroke={stroke} strokeWidth="1.4" />
        </svg>
      );

    case 'power_unit':
      return (
        <svg viewBox="0 0 56 40" className="w-12 h-8">
          <rect x="6" y="4" width="44" height="32" fill="none" stroke={stroke} strokeWidth="1.1" strokeDasharray="4 2 1 2" />
          <path d="M14,26 V32 H42 V26" fill="none" stroke={stroke} strokeWidth="1.3" />
          <circle cx="28" cy="22" r="4.5" fill="none" stroke={stroke} strokeWidth="1.2" />
          <circle cx="38" cy="22" r="4" fill="none" stroke={stroke} strokeWidth="1.1" />
          <text x="38" y="24" textAnchor="middle" fontSize="5.5" fill={stroke}>M</text>
          <line x1="28" y1="17.5" x2="28" y2="6" stroke={stroke} strokeWidth="1.2" />
          <line x1="28" y1="12" x2="49" y2="12" stroke={stroke} strokeWidth="1.2" />
          <rect x="11" y="13" width="8" height="8" fill="none" stroke={stroke} strokeWidth="1.1" />
          <circle cx="15" cy="8" r="3" fill="none" stroke={stroke} strokeWidth="1.1" />
        </svg>
      );

    case 'pump_amplifier':
      return (
        <svg viewBox="0 0 56 40" className="w-12 h-8">
          <line x1="5" y1="20" x2="10" y2="20" stroke={stroke} strokeWidth="1.3" />
          <rect x="10" y="13" width="14" height="14" fill="none" stroke={stroke} strokeWidth="1.3" />
          <line x1="17" y1="10" x2="17" y2="13" stroke={stroke} strokeWidth="1.2" />
          <line x1="17" y1="27" x2="17" y2="30" stroke={stroke} strokeWidth="1.2" />
          <polygon points="14,16 21,20 14,24" fill="none" stroke={stroke} strokeWidth="1.2" />
          <polyline points="24,17 34,17 34,13 44,13 44,27 34,27 34,23 24,23" fill="none" stroke={stroke} strokeWidth="1.2" />
          <rect x="42" y="16" width="8" height="8" fill="none" stroke={stroke} strokeWidth="1.2" />
          <line x1="41" y1="26" x2="51" y2="14" stroke={stroke} strokeWidth="1.2" />
        </svg>
      );

    case 'pump_prop':
      return (
        <svg viewBox="0 0 56 40" className="w-12 h-8">
          <rect x="8" y="16" width="12" height="10" fill="none" stroke={stroke} strokeWidth="1.2" />
          <line x1="6" y1="27" x2="22" y2="15" stroke={stroke} strokeWidth="1.2" />
          <polygon points="22,15 18,16 20,19" fill={stroke} />
          <line x1="6" y1="29" x2="23" y2="29" stroke={stroke} strokeWidth="1.2" />
          <circle cx="36" cy="18" r="10" fill="none" stroke={stroke} strokeWidth="1.4" />
          <polygon points="36,8.5 32,14 40,14" fill={stroke} />
          <line x1="25" y1="27" x2="47" y2="9" stroke={stroke} strokeWidth="1.3" />
          <polygon points="47,9 42,10.5 45.5,14" fill={stroke} />
        </svg>
      );

    case 'accumulator_simple':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <rect x="16" y="6" width="16" height="25" rx="8" fill="none" stroke={stroke} strokeWidth="1.5" />
          <line x1="24" y1="31" x2="24" y2="37" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );

    case 'accumulator':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <rect x="16" y="6" width="16" height="25" rx="8" fill="none" stroke={stroke} strokeWidth="1.5" />
          <line x1="16" y1="19" x2="32" y2="19" stroke={stroke} strokeWidth="1.3" />
          <polygon points="20,11 28,11 24,17" fill="none" stroke={stroke} strokeWidth="1.3" />
          <line x1="24" y1="31" x2="24" y2="37" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );

    case 'accumulator_unit':
      return (
        <svg viewBox="0 0 56 40" className="w-12 h-8">
          <rect x="6" y="6" width="44" height="28" fill="none" stroke={stroke} strokeWidth="1.1" strokeDasharray="4 2 1 2" />
          <rect x="10" y="13" width="8" height="9" fill="none" stroke={stroke} strokeWidth="1.1" />
          <circle cx="14" cy="8" r="3" fill="none" stroke={stroke} strokeWidth="1.1" />
          <rect x="24" y="15" width="18" height="7" fill="none" stroke={stroke} strokeWidth="1.1" />
          <circle cx="38" cy="9" r="3" fill="none" stroke={stroke} strokeWidth="1.1" />
          <line x1="18" y1="28" x2="46" y2="28" stroke={stroke} strokeWidth="1.2" />
        </svg>
      );

    case 'flexible_hose':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <line x1="6" y1="20" x2="14" y2="20" stroke={stroke} strokeWidth="1.5" />
          <circle cx="16" cy="20" r="2.2" fill="none" stroke={stroke} strokeWidth="1.4" />
          <path d="M18.2,20 Q24,27 29.8,20" fill="none" stroke={stroke} strokeWidth="1.5" />
          <circle cx="32" cy="20" r="2.2" fill="none" stroke={stroke} strokeWidth="1.4" />
          <line x1="34" y1="20" x2="42" y2="20" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );

    case 'filter':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <polygon points="24,8 37,20 24,32 11,20" fill="none" stroke={stroke} strokeWidth="1.5" />
          <line x1="4" y1="20" x2="11" y2="20" stroke={stroke} strokeWidth="1.5" />
          <line x1="37" y1="20" x2="44" y2="20" stroke={stroke} strokeWidth="1.5" />
          <line x1="24" y1="9" x2="24" y2="31" stroke={stroke} strokeWidth="1.3" strokeDasharray="3 2" />
        </svg>
      );

    case 'cooler':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <polygon points="24,8 37,20 24,32 11,20" fill="none" stroke={stroke} strokeWidth="1.5" />
          <line x1="4" y1="20" x2="44" y2="20" stroke={stroke} strokeWidth="1.3" />
          <line x1="24" y1="9" x2="24" y2="31" stroke={stroke} strokeWidth="1.3" />
          <polygon points="24,10 21.5,14.5 26.5,14.5" fill={stroke} />
          <polygon points="24,30 21.5,25.5 26.5,25.5" fill={stroke} />
        </svg>
      );

    case 'heater':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <polygon points="24,8 37,20 24,32 11,20" fill="none" stroke={stroke} strokeWidth="1.5" />
          <line x1="4" y1="20" x2="44" y2="20" stroke={stroke} strokeWidth="1.3" />
          <line x1="24" y1="9" x2="24" y2="31" stroke={stroke} strokeWidth="1.3" />
          <polygon points="24,18 21.5,13.5 26.5,13.5" fill={stroke} />
          <polygon points="24,22 21.5,26.5 26.5,26.5" fill={stroke} />
        </svg>
      );

    case 'regulator':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <rect x="11" y="10" width="26" height="20" fill="none" stroke={stroke} strokeWidth="1.5" />
          <line x1="5" y1="20" x2="43" y2="20" stroke={stroke} strokeWidth="1.4" />
          <polygon points="19,14 29,20 19,26" fill="none" stroke={accent} strokeWidth="1.5" />
        </svg>
      );

    // 2. Atuadores
    case 'distance_rule':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <rect x="4" y="15" width="40" height="9" fill="none" stroke={stroke} strokeWidth="1.4" />
          {[8, 12, 16, 20, 24, 28, 32, 36, 40].map((x) => (
            <line key={x} x1={x} y1="15" x2={x} y2="24" stroke={stroke} strokeWidth="1.1" />
          ))}
        </svg>
      );

    case 'cylinder_single':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <rect x="6" y="13" width="26" height="14" fill="none" stroke={stroke} strokeWidth="1.5" />
          <line x1="10" y1="13" x2="10" y2="27" stroke={stroke} strokeWidth="2.4" />
          <rect x="10" y="18" width="33" height="4" fill="none" stroke={stroke} strokeWidth="1.3" />
          <line x1="8" y1="27" x2="8" y2="33" stroke={stroke} strokeWidth="1.4" />
        </svg>
      );

    case 'cylinder_double': {
      const hasCushion = Boolean(cylinderConfig?.cushioning);
      const isThrough = Boolean(cylinderConfig?.throughRod);
      return (
        <svg viewBox="0 0 54 40" className="w-11 h-8">
          <rect x={isThrough ? 12 : 6} y="13" width="28" height="14" fill="none" stroke={stroke} strokeWidth="1.5" />
          <rect x={isThrough ? 22 : 12} y="13" width="3" height="14" fill={stroke} />
          <rect
            x={isThrough ? 3 : 15}
            y="18"
            width={isThrough ? 47 : 33}
            height="4"
            fill="none"
            stroke={stroke}
            strokeWidth="1.3"
          />
          {hasCushion && (
            <>
              <rect x={isThrough ? 19 : 9} y="16" width="3" height="8" fill="none" stroke={stroke} strokeWidth="1.1" />
              <line x1={isThrough ? 18 : 8} y1="29" x2={isThrough ? 29 : 21} y2="9" stroke={stroke} strokeWidth="1.2" />
              <polygon points={isThrough ? '29,9 25,10 27.5,13' : '21,9 17,10 19.5,13'} fill={stroke} />
            </>
          )}
          <line x1={isThrough ? 15 : 9} y1="27" x2={isThrough ? 15 : 9} y2="33" stroke={stroke} strokeWidth="1.4" />
          <line x1={isThrough ? 37 : 31} y1="27" x2={isThrough ? 37 : 31} y2="33" stroke={stroke} strokeWidth="1.4" />
        </svg>
      );
    }

    case 'motor':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <circle cx="21" cy="20" r="10.5" fill="none" stroke={stroke} strokeWidth="1.5" />
          <line x1="21" y1="3" x2="21" y2="9.5" stroke={stroke} strokeWidth="1.4" />
          <line x1="21" y1="30.5" x2="21" y2="37" stroke={stroke} strokeWidth="1.4" />
          <polygon points="21,15.5 17,10.5 25,10.5" fill={stroke} />
          <polygon points="21,24.5 17,29.5 25,29.5" fill={stroke} />
          <line x1="31" y1="18" x2="43" y2="18" stroke={stroke} strokeWidth="1.4" />
          <line x1="31" y1="22" x2="43" y2="22" stroke={stroke} strokeWidth="1.4" />
          <path d="M36,12 A9,9 0 0,1 36,28" fill="none" stroke={stroke} strokeWidth="1.2" />
        </svg>
      );

    case 'rotary_actuator':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <path d="M18,9 H21 A11,11 0 0,1 21,31 H18 Z" fill="none" stroke={stroke} strokeWidth="1.5" />
          <polygon points="18,9 26,11 18,16" fill={stroke} />
          <line x1="8" y1="14" x2="18" y2="14" stroke={stroke} strokeWidth="1.4" />
          <line x1="8" y1="26" x2="18" y2="26" stroke={stroke} strokeWidth="1.4" />
          <line x1="32" y1="18" x2="42" y2="18" stroke={stroke} strokeWidth="1.4" />
          <line x1="32" y1="22" x2="42" y2="22" stroke={stroke} strokeWidth="1.4" />
        </svg>
      );

    // 3. Válvulas contínuas
    case 'amp_prop_2ch':
      return (
        <svg viewBox="0 0 56 40" className="w-12 h-8">
          <line x1="4" y1="20" x2="9" y2="20" stroke={stroke} strokeWidth="1.2" />
          <rect x="9" y="13" width="14" height="14" fill="none" stroke={stroke} strokeWidth="1.3" />
          <line x1="16" y1="9" x2="16" y2="13" stroke={stroke} strokeWidth="1.2" />
          <line x1="16" y1="27" x2="16" y2="31" stroke={stroke} strokeWidth="1.2" />
          <polygon points="13,16 20,20 13,24" fill="none" stroke={stroke} strokeWidth="1.2" />
          <polyline points="23,17 34,17 34,9 44,9 44,17" fill="none" stroke={stroke} strokeWidth="1.1" />
          <polyline points="23,23 34,23 34,31 44,31 44,23" fill="none" stroke={stroke} strokeWidth="1.1" />
          <rect x="42" y="10" width="8" height="6" fill="none" stroke={stroke} strokeWidth="1.1" />
          <line x1="42" y1="17" x2="51" y2="8" stroke={stroke} strokeWidth="1.1" />
          <rect x="42" y="24" width="8" height="6" fill="none" stroke={stroke} strokeWidth="1.1" />
          <line x1="42" y1="31" x2="51" y2="22" stroke={stroke} strokeWidth="1.1" />
        </svg>
      );

    case 'amp_prop_1ch':
      return (
        <svg viewBox="0 0 56 40" className="w-12 h-8">
          <line x1="4" y1="20" x2="9" y2="20" stroke={stroke} strokeWidth="1.2" />
          <rect x="9" y="13" width="14" height="14" fill="none" stroke={stroke} strokeWidth="1.3" />
          <line x1="16" y1="9" x2="16" y2="13" stroke={stroke} strokeWidth="1.2" />
          <line x1="16" y1="27" x2="16" y2="31" stroke={stroke} strokeWidth="1.2" />
          <polygon points="13,16 20,20 13,24" fill="none" stroke={stroke} strokeWidth="1.2" />
          <polyline points="23,17 34,17 34,13 44,13 44,27 34,27 34,23 23,23" fill="none" stroke={stroke} strokeWidth="1.2" />
          <rect x="42" y="16" width="8" height="8" fill="none" stroke={stroke} strokeWidth="1.2" />
          <line x1="41" y1="26" x2="51" y2="14" stroke={stroke} strokeWidth="1.2" />
        </svg>
      );

    case 'prop_throttle_2_2':
      return (
        <svg viewBox="0 0 60 40" className="w-12 h-8">
          <line x1="18" y1="8.5" x2="44" y2="8.5" stroke={stroke} strokeWidth="1.1" />
          <line x1="18" y1="31.5" x2="44" y2="31.5" stroke={stroke} strokeWidth="1.1" />
          <rect x="18" y="11" width="13" height="18" fill="none" stroke={stroke} strokeWidth="1.3" />
          <rect x="31" y="11" width="13" height="18" fill="none" stroke={stroke} strokeWidth="1.3" />
          {/* Left chamber: double-headed vertical arrow */}
          <line x1="24.5" y1="14" x2="24.5" y2="26" stroke={stroke} strokeWidth="1.2" />
          <polygon points="24.5,11.5 22.3,15.5 26.7,15.5" fill={stroke} />
          <polygon points="24.5,28.5 22.3,24.5 26.7,24.5" fill={stroke} />
          {/* Right chamber: closed T-stops */}
          <line x1="37.5" y1="11" x2="37.5" y2="17" stroke={stroke} strokeWidth="1.2" />
          <line x1="34.5" y1="17" x2="40.5" y2="17" stroke={stroke} strokeWidth="1.2" />
          <line x1="37.5" y1="23" x2="37.5" y2="29" stroke={stroke} strokeWidth="1.2" />
          <line x1="34.5" y1="23" x2="40.5" y2="23" stroke={stroke} strokeWidth="1.2" />
          {/* Left proportional solenoid (bottom half) + diagonal arrow + outer circle */}
          <rect x="6" y="18" width="12" height="11" fill="none" stroke={stroke} strokeWidth="1.2" />
          <line x1="9" y1="29" x2="15" y2="18" stroke={stroke} strokeWidth="1.1" />
          <line x1="17" y1="30" x2="4" y2="14" stroke={stroke} strokeWidth="1.1" />
          <polygon points="4,14 5.5,18 8,16" fill={stroke} />
          <circle cx="6" cy="23.5" r="1.7" fill="#FFFFFF" stroke={stroke} strokeWidth="1" />
          {/* Right spring */}
          <path d="M44,18 L46.5,26 L49,18 L51.5,26 L54,18" fill="none" stroke={stroke} strokeWidth="1.1" />
          {/* Port stems B & A over right chamber */}
          <line x1="37.5" y1="5" x2="37.5" y2="11" stroke={stroke} strokeWidth="1.2" />
          <line x1="37.5" y1="29" x2="37.5" y2="35" stroke={stroke} strokeWidth="1.2" />
        </svg>
      );

    case 'prop_relief':
      return (
        <svg viewBox="0 0 52 40" className="w-11 h-8">
          <rect x="15" y="11" width="18" height="18" fill="none" stroke={stroke} strokeWidth="1.4" />
          <line x1="24" y1="4" x2="24" y2="11" stroke={stroke} strokeWidth="1.3" />
          <line x1="24" y1="29" x2="24" y2="36" stroke={stroke} strokeWidth="1.3" />
          <line x1="20" y1="13" x2="20" y2="27" stroke={stroke} strokeWidth="1.4" />
          <polygon points="20,27 17,22 23,22" fill={stroke} />
          <polyline points="15,15 8,15 8,7 24,7" fill="none" stroke={stroke} strokeWidth="1.1" strokeDasharray="3 2" />
          <rect x="33" y="16" width="10" height="8" fill="none" stroke={stroke} strokeWidth="1.2" />
          <line x1="32" y1="27" x2="46" y2="12" stroke={stroke} strokeWidth="1.3" />
          <polygon points="46,12 41,13.5 44.5,16.5" fill={stroke} />
        </svg>
      );

    case 'prop_relief_piloted':
      return (
        <svg viewBox="0 0 56 40" className="w-12 h-8">
          <rect x="14" y="11" width="18" height="18" fill="none" stroke={stroke} strokeWidth="1.4" />
          <line x1="23" y1="4" x2="23" y2="11" stroke={stroke} strokeWidth="1.3" />
          <line x1="23" y1="29" x2="23" y2="36" stroke={stroke} strokeWidth="1.3" />
          <line x1="19" y1="13" x2="19" y2="27" stroke={stroke} strokeWidth="1.4" />
          <polygon points="19,27 16,22 22,22" fill={stroke} />
          <polyline points="14,15 7,15 7,7 23,7" fill="none" stroke={stroke} strokeWidth="1.1" strokeDasharray="3 2" />
          <path d="M32,16 L35,23 L38,16 L41,23" fill="none" stroke={stroke} strokeWidth="1.1" />
          <rect x="42" y="16" width="9" height="8" fill="none" stroke={stroke} strokeWidth="1.2" />
          <line x1="39" y1="27" x2="52" y2="12" stroke={stroke} strokeWidth="1.2" />
        </svg>
      );

    case 'prop_pressure_reducer':
      return (
        <svg viewBox="0 0 56 40" className="w-12 h-8">
          <rect x="14" y="11" width="18" height="18" fill="none" stroke={stroke} strokeWidth="1.4" />
          <line x1="23" y1="4" x2="23" y2="11" stroke={stroke} strokeWidth="1.3" />
          <line x1="23" y1="29" x2="23" y2="36" stroke={stroke} strokeWidth="1.3" />
          <line x1="19" y1="13" x2="19" y2="27" stroke={stroke} strokeWidth="1.4" />
          <polygon points="19,13 16,18 22,18" fill={stroke} />
          <polyline points="14,15 7,15 7,7 23,7" fill="none" stroke={stroke} strokeWidth="1.1" strokeDasharray="3 2" />
          <path d="M32,16 L35,23 L38,16 L41,23" fill="none" stroke={stroke} strokeWidth="1.1" />
          <rect x="42" y="16" width="9" height="8" fill="none" stroke={stroke} strokeWidth="1.2" />
          <line x1="39" y1="27" x2="52" y2="12" stroke={stroke} strokeWidth="1.2" />
        </svg>
      );

    case 'prop_solenoid':
      return (
        <svg viewBox="0 0 52 40" className="w-11 h-8">
          <line x1="5" y1="20" x2="14" y2="20" stroke={stroke} strokeWidth="1.3" />
          <rect x="14" y="14" width="16" height="12" fill="none" stroke={stroke} strokeWidth="1.4" />
          <line x1="22" y1="26" x2="22" y2="34" stroke={stroke} strokeWidth="1.3" />
          <line x1="15" y1="29" x2="29" y2="9" stroke={stroke} strokeWidth="1.3" />
          <polygon points="29,9 24.5,11 27.5,13.5" fill={stroke} />
          <line x1="30" y1="20" x2="39" y2="20" stroke={stroke} strokeWidth="1.2" strokeDasharray="3 2" />
          <polygon points="39,14 44,14 41.5,20" fill="none" stroke={stroke} strokeWidth="1.1" />
          <polygon points="39,26 44,26 41.5,20" fill="none" stroke={stroke} strokeWidth="1.1" />
        </svg>
      );

    // 4. Válvulas de fechamento e controle de vazão
    case 'nozzle':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <line x1="5" y1="20" x2="43" y2="20" stroke={stroke} strokeWidth="1.5" />
          <path d="M16,13 Q24,18.5 32,13" fill="none" stroke={stroke} strokeWidth="1.5" />
          <path d="M16,27 Q24,21.5 32,27" fill="none" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );

    case 'throttle':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <line x1="4" y1="20" x2="44" y2="20" stroke={stroke} strokeWidth="1.5" />
          <path d="M15,13 Q24,23.5 33,13" fill="none" stroke={stroke} strokeWidth="1.5" />
          <path d="M15,27 Q24,16.5 33,27" fill="none" stroke={stroke} strokeWidth="1.5" />
          <line x1="15" y1="29" x2="31" y2="13" stroke={stroke} strokeWidth="1.35" />
          <polygon points="34,10 27.5,12 32,16.5" fill={stroke} />
        </svg>
      );

    case 'orifice':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <line x1="5" y1="20" x2="43" y2="20" stroke={stroke} strokeWidth="1.5" />
          <polyline points="19,12 24,17.5 29,12" fill="none" stroke={stroke} strokeWidth="1.5" />
          <polyline points="19,28 24,22.5 29,28" fill="none" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );

    case 'orifice_adjustable':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <line x1="5" y1="20" x2="43" y2="20" stroke={stroke} strokeWidth="1.5" />
          <polyline points="19,12 24,17.5 29,12" fill="none" stroke={stroke} strokeWidth="1.5" />
          <polyline points="19,28 24,22.5 29,28" fill="none" stroke={stroke} strokeWidth="1.5" />
          <line x1="15" y1="29" x2="33" y2="11" stroke={stroke} strokeWidth="1.4" />
          <polygon points="33,11 28,12.5 31.5,16" fill={stroke} />
        </svg>
      );

    case 'shutoff_valve':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <line x1="5" y1="20" x2="16" y2="20" stroke={stroke} strokeWidth="1.5" />
          <line x1="32" y1="20" x2="43" y2="20" stroke={stroke} strokeWidth="1.5" />
          <polygon points="16,13 24,20 16,27" fill="none" stroke={stroke} strokeWidth="1.5" />
          <polygon points="32,13 24,20 32,27" fill="none" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );

    case 'check_throttle':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <rect x="8" y="8" width="32" height="24" fill="none" stroke={stroke} strokeWidth="1.1" strokeDasharray="3 2" />
          <line x1="3" y1="20" x2="45" y2="20" stroke={stroke} strokeWidth="1.3" />
          <polyline points="11,20 11,13 37,13 37,20" fill="none" stroke={stroke} strokeWidth="1.2" />
          <path d="M19,10 Q24,14 29,10" fill="none" stroke={stroke} strokeWidth="1.3" />
          <path d="M19,16 Q24,12 29,16" fill="none" stroke={stroke} strokeWidth="1.3" />
          <line x1="19" y1="17" x2="29" y2="8" stroke={stroke} strokeWidth="1.2" />
          <polyline points="11,20 11,26 37,26 37,20" fill="none" stroke={stroke} strokeWidth="1.2" />
          <polyline points="26,23 21,26 26,29" fill="none" stroke={stroke} strokeWidth="1.2" />
          <circle cx="22.5" cy="26" r="2.2" fill="none" stroke={stroke} strokeWidth="1.2" />
        </svg>
      );

    case 'check_valve':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <line x1="24" y1="5" x2="24" y2="16" stroke={stroke} strokeWidth="1.5" />
          <line x1="24" y1="25" x2="24" y2="35" stroke={stroke} strokeWidth="1.5" />
          <circle cx="24" cy="19" r="3.5" fill="none" stroke={stroke} strokeWidth="1.5" />
          <polyline points="17,19 24,26 31,19" fill="none" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );

    case 'check_valve_spring':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <line x1="24" y1="4" x2="24" y2="18" stroke={stroke} strokeWidth="1.5" />
          <line x1="24" y1="27" x2="24" y2="36" stroke={stroke} strokeWidth="1.5" />
          <path d="M21,8 L27,10 L21,12 L27,14 L21,16" fill="none" stroke={stroke} strokeWidth="1.2" />
          <circle cx="24" cy="21" r="3.2" fill="none" stroke={stroke} strokeWidth="1.4" />
          <polyline points="17,21 24,28 31,21" fill="none" stroke={stroke} strokeWidth="1.4" />
        </svg>
      );

    case 'pilot_check_valve':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <rect x="13" y="9" width="20" height="22" fill="none" stroke={stroke} strokeWidth="1.3" />
          <line x1="23" y1="3" x2="23" y2="16" stroke={stroke} strokeWidth="1.4" />
          <line x1="23" y1="24" x2="23" y2="37" stroke={stroke} strokeWidth="1.4" />
          <circle cx="23" cy="19" r="3" fill="none" stroke={stroke} strokeWidth="1.4" />
          <polyline points="18,19 23,24 28,19" fill="none" stroke={stroke} strokeWidth="1.4" />
          <polyline points="33,28 42,28 42,35" fill="none" stroke={stroke} strokeWidth="1.2" strokeDasharray="3 2" />
        </svg>
      );

    case 'pilot_check_spring':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <rect x="13" y="9" width="20" height="22" fill="none" stroke={stroke} strokeWidth="1.3" />
          <line x1="23" y1="3" x2="23" y2="18" stroke={stroke} strokeWidth="1.4" />
          <line x1="23" y1="26" x2="23" y2="37" stroke={stroke} strokeWidth="1.4" />
          <path d="M20,10 L26,12 L20,14 L26,16" fill="none" stroke={stroke} strokeWidth="1.1" />
          <circle cx="23" cy="20.5" r="2.8" fill="none" stroke={stroke} strokeWidth="1.3" />
          <polyline points="18,20.5 23,25.5 28,20.5" fill="none" stroke={stroke} strokeWidth="1.3" />
          <polyline points="33,28 42,28 42,35" fill="none" stroke={stroke} strokeWidth="1.2" strokeDasharray="3 2" />
        </svg>
      );

    case 'pilot_check_close':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <rect x="13" y="9" width="20" height="22" fill="none" stroke={stroke} strokeWidth="1.3" />
          <line x1="23" y1="3" x2="23" y2="16" stroke={stroke} strokeWidth="1.4" />
          <line x1="23" y1="24" x2="23" y2="37" stroke={stroke} strokeWidth="1.4" />
          <circle cx="23" cy="19" r="3" fill="none" stroke={stroke} strokeWidth="1.4" />
          <polyline points="18,19 23,24 28,19" fill="none" stroke={stroke} strokeWidth="1.4" />
          <polyline points="33,12 42,12 42,5" fill="none" stroke={stroke} strokeWidth="1.2" strokeDasharray="3 2" />
        </svg>
      );

    case 'pilot_check_close_spring':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <rect x="13" y="9" width="20" height="22" fill="none" stroke={stroke} strokeWidth="1.3" />
          <line x1="23" y1="3" x2="23" y2="18" stroke={stroke} strokeWidth="1.4" />
          <line x1="23" y1="26" x2="23" y2="37" stroke={stroke} strokeWidth="1.4" />
          <path d="M20,10 L26,12 L20,14 L26,16" fill="none" stroke={stroke} strokeWidth="1.1" />
          <circle cx="23" cy="20.5" r="2.8" fill="none" stroke={stroke} strokeWidth="1.3" />
          <polyline points="18,20.5 23,25.5 28,20.5" fill="none" stroke={stroke} strokeWidth="1.3" />
          <polyline points="33,12 42,12 42,5" fill="none" stroke={stroke} strokeWidth="1.2" strokeDasharray="3 2" />
        </svg>
      );

    case 'flow_control_2way':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <rect x="11" y="10" width="26" height="20" fill="none" stroke={stroke} strokeWidth="1.4" />
          <line x1="4" y1="20" x2="44" y2="20" stroke={stroke} strokeWidth="1.4" />
          <path d="M18,14 Q24,19 30,14" fill="none" stroke={stroke} strokeWidth="1.3" />
          <path d="M18,26 Q24,21 30,26" fill="none" stroke={stroke} strokeWidth="1.3" />
          <line x1="17" y1="28" x2="31" y2="12" stroke={stroke} strokeWidth="1.3" />
          <polygon points="36,20 32,17.5 32,22.5" fill={stroke} />
        </svg>
      );

    case 'flow_control_3way':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <rect x="11" y="10" width="26" height="20" fill="none" stroke={stroke} strokeWidth="1.4" />
          <line x1="4" y1="18" x2="44" y2="18" stroke={stroke} strokeWidth="1.4" />
          <path d="M21,13 Q26,17.5 31,13" fill="none" stroke={stroke} strokeWidth="1.2" />
          <path d="M21,23 Q26,18.5 31,23" fill="none" stroke={stroke} strokeWidth="1.2" />
          <line x1="20" y1="25" x2="32" y2="11" stroke={stroke} strokeWidth="1.2" />
          <line x1="16" y1="18" x2="16" y2="36" stroke={stroke} strokeWidth="1.3" />
          <circle cx="16" cy="18" r="1.5" fill={stroke} />
          <polygon points="16,29 14,25 18,25" fill={stroke} />
        </svg>
      );

    case 'shuttle_valve':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <rect x="11" y="12" width="26" height="18" fill="none" stroke={stroke} strokeWidth="1.4" />
          <line x1="5" y1="21" x2="18" y2="21" stroke={stroke} strokeWidth="1.4" />
          <line x1="30" y1="21" x2="43" y2="21" stroke={stroke} strokeWidth="1.4" />
          <line x1="24" y1="5" x2="24" y2="21" stroke={stroke} strokeWidth="1.4" />
          <circle cx="19" cy="21" r="2.8" fill="none" stroke={stroke} strokeWidth="1.4" />
          <polyline points="27,17 31,21 27,25" fill="none" stroke={stroke} strokeWidth="1.4" />
        </svg>
      );

    case 'two_pressure_valve':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <rect x="11" y="12" width="26" height="18" fill="none" stroke={stroke} strokeWidth="1.4" />
          <line x1="5" y1="21" x2="16" y2="21" stroke={stroke} strokeWidth="1.4" />
          <line x1="32" y1="21" x2="43" y2="21" stroke={stroke} strokeWidth="1.4" />
          <line x1="24" y1="5" x2="24" y2="12" stroke={stroke} strokeWidth="1.4" />
          <line x1="16" y1="16" x2="16" y2="26" stroke={stroke} strokeWidth="1.4" />
          <line x1="32" y1="16" x2="32" y2="26" stroke={stroke} strokeWidth="1.4" />
          <line x1="16" y1="21" x2="32" y2="21" stroke={stroke} strokeWidth="1.4" />
        </svg>
      );

    case 'quick_exhaust':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <rect x="11" y="10" width="26" height="18" fill="none" stroke={stroke} strokeWidth="1.4" />
          <line x1="5" y1="19" x2="18" y2="19" stroke={stroke} strokeWidth="1.4" />
          <line x1="30" y1="19" x2="43" y2="19" stroke={stroke} strokeWidth="1.4" />
          <line x1="24" y1="24" x2="24" y2="35" stroke={stroke} strokeWidth="1.4" />
          <polygon points="24,23 19,15 29,15" fill="none" stroke={accent} strokeWidth="1.3" />
        </svg>
      );

    case 'flow_divider':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <rect x="10" y="9" width="28" height="22" fill="none" stroke={stroke} strokeWidth="1.4" />
          <line x1="24" y1="27" x2="24" y2="36" stroke={stroke} strokeWidth="1.4" />
          <polyline points="24,27 17,27 17,4" fill="none" stroke={stroke} strokeWidth="1.3" />
          <polyline points="24,27 31,27 31,4" fill="none" stroke={stroke} strokeWidth="1.3" />
          <path d="M14,15 Q17,18 20,15" fill="none" stroke={stroke} strokeWidth="1.1" />
          <path d="M14,22 Q17,19 20,22" fill="none" stroke={stroke} strokeWidth="1.1" />
          <path d="M28,15 Q31,18 34,15" fill="none" stroke={stroke} strokeWidth="1.1" />
          <path d="M28,22 Q31,19 34,22" fill="none" stroke={stroke} strokeWidth="1.1" />
        </svg>
      );

    // 5. Válvulas de pressão
    case 'relief_valve':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <rect x="14" y="10" width="20" height="20" fill="none" stroke={stroke} strokeWidth="1.5" />
          <line x1="24" y1="4" x2="24" y2="10" stroke={stroke} strokeWidth="1.4" />
          <line x1="24" y1="30" x2="24" y2="36" stroke={stroke} strokeWidth="1.4" />
          <line x1="24" y1="14" x2="24" y2="26" stroke={stroke} strokeWidth="1.5" />
          <polygon points="24,26 20,21 28,21" fill={stroke} />
        </svg>
      );

    case 'sequence_valve':
    case 'counterbalance_valve':
    case 'pressure_compensator':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <rect x="13" y="10" width="22" height="20" fill="none" stroke={stroke} strokeWidth="1.5" />
          <line x1="5" y1="20" x2="43" y2="20" stroke={stroke} strokeWidth="1.4" />
          <polygon points="31,20 25,16 25,24" fill={stroke} />
          <polyline points="8,20 8,13 24,13" fill="none" stroke={accent} strokeWidth="1.2" strokeDasharray="2 1" />
        </svg>
      );

    // 6. Sensores e instrumentos de medida
    case 'pressure_gauge':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <circle cx="24" cy="17" r="11" fill="none" stroke={stroke} strokeWidth="1.5" />
          <line x1="31" y1="24" x2="17" y2="10" stroke={stroke} strokeWidth="1.4" />
          <polygon points="17,10 18.5,15 22,11.5" fill={stroke} />
          <line x1="24" y1="28" x2="24" y2="35" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );

    case 'diff_pressure_gauge':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <circle cx="24" cy="17" r="11" fill="none" stroke={stroke} strokeWidth="1.5" />
          <line x1="31" y1="24" x2="17" y2="10" stroke={stroke} strokeWidth="1.4" />
          <polygon points="17,10 18.5,15 22,11.5" fill={stroke} />
          <line x1="17" y1="26" x2="17" y2="35" stroke={stroke} strokeWidth="1.4" />
          <line x1="31" y1="26" x2="31" y2="35" stroke={stroke} strokeWidth="1.4" />
        </svg>
      );

    case 'pressure_indicator':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <circle cx="24" cy="17" r="11" fill="none" stroke={stroke} strokeWidth="1.5" />
          <line x1="16.2" y1="9.2" x2="31.8" y2="24.8" stroke={stroke} strokeWidth="1.4" />
          <line x1="31.8" y1="9.2" x2="16.2" y2="24.8" stroke={stroke} strokeWidth="1.4" />
          <line x1="24" y1="28" x2="24" y2="35" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );

    case 'flow_meter':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <circle cx="24" cy="20" r="10" fill="none" stroke={stroke} strokeWidth="1.5" />
          <line x1="24" y1="4" x2="24" y2="10" stroke={stroke} strokeWidth="1.4" />
          <line x1="24" y1="30" x2="24" y2="36" stroke={stroke} strokeWidth="1.4" />
          <path d="M18,12 Q22,20 18,28" fill="none" stroke={stroke} strokeWidth="1.3" />
          <path d="M30,12 Q26,20 30,28" fill="none" stroke={stroke} strokeWidth="1.3" />
        </svg>
      );

    case 'flow_meter_analog':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <circle cx="24" cy="20" r="10.5" fill="none" stroke={stroke} strokeWidth="1.5" />
          <line x1="24" y1="4" x2="24" y2="9.5" stroke={stroke} strokeWidth="1.4" />
          <line x1="24" y1="30.5" x2="24" y2="36" stroke={stroke} strokeWidth="1.4" />
          <path d="M18,12 Q21.5,20 18,28" fill="none" stroke={stroke} strokeWidth="1.2" />
          <path d="M30,12 Q26.5,20 30,28" fill="none" stroke={stroke} strokeWidth="1.2" />
          <text x="24" y="23" textAnchor="middle" fontSize="9.5" fontWeight="700" fill={stroke}>M</text>
        </svg>
      );

    case 'flow_sensor_elec':
      return (
        <svg viewBox="0 0 56 40" className="w-12 h-8">
          <circle cx="17" cy="20" r="9.5" fill="none" stroke={stroke} strokeWidth="1.4" />
          <line x1="17" y1="4" x2="17" y2="10.5" stroke={stroke} strokeWidth="1.3" />
          <line x1="17" y1="29.5" x2="17" y2="36" stroke={stroke} strokeWidth="1.3" />
          <path d="M12,13 Q15,20 12,27" fill="none" stroke={stroke} strokeWidth="1.2" />
          <path d="M22,13 Q19,20 22,27" fill="none" stroke={stroke} strokeWidth="1.2" />
          <line x1="26.5" y1="20" x2="34" y2="20" stroke={stroke} strokeWidth="1.3" />
          <polygon points="34,20 30,17.5 30,22.5" fill={stroke} />
          <rect x="34" y="12" width="16" height="16" fill="none" stroke={stroke} strokeWidth="1.4" />
          <line x1="34" y1="28" x2="50" y2="12" stroke={stroke} strokeWidth="1.2" />
          <path d="M40,25 A4.5,4.5 0 0,1 48,25" fill="none" stroke={stroke} strokeWidth="1.2" />
        </svg>
      );

    case 'pressure_switch':
      return (
        <svg viewBox="0 0 54 40" className="w-11 h-8">
          <line x1="5" y1="20" x2="15" y2="20" stroke={stroke} strokeWidth="1.4" />
          <polygon points="15,20 10.5,17 10.5,23" fill={stroke} />
          <rect x="15" y="11" width="18" height="18" fill="none" stroke={stroke} strokeWidth="1.4" />
          <line x1="15" y1="29" x2="33" y2="11" stroke={stroke} strokeWidth="1.2" />
          <path d="M23,26 A4.5,4.5 0 0,1 31,26" fill="none" stroke={stroke} strokeWidth="1.2" />
          <path d="M33,15 L36,24 L39,15 L42,24 L45,15 L48,24" fill="none" stroke={stroke} strokeWidth="1.2" />
        </svg>
      );

    case 'pressure_sensor_elec':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <line x1="6" y1="20" x2="18" y2="20" stroke={stroke} strokeWidth="1.5" />
          <polygon points="18,20 13,17 13,23" fill={stroke} />
          <rect x="18" y="10" width="20" height="20" fill="none" stroke={stroke} strokeWidth="1.5" />
          <line x1="18" y1="30" x2="38" y2="10" stroke={stroke} strokeWidth="1.3" />
          <path d="M26,26 A5,5 0 0,1 35,26" fill="none" stroke={stroke} strokeWidth="1.3" />
        </svg>
      );

    case 'tachometer_sensor':
      return (
        <svg viewBox="0 0 56 40" className="w-12 h-8">
          <circle cx="15" cy="20" r="9.5" fill="none" stroke={stroke} strokeWidth="1.4" />
          <line x1="15" y1="4" x2="15" y2="10.5" stroke={stroke} strokeWidth="1.3" />
          <line x1="15" y1="29.5" x2="15" y2="36" stroke={stroke} strokeWidth="1.3" />
          <polygon points="15,15 12,11 18,11" fill={stroke} />
          <polygon points="15,25 12,29 18,29" fill={stroke} />
          <line x1="24.5" y1="18" x2="35" y2="18" stroke={stroke} strokeWidth="1.3" />
          <line x1="24.5" y1="22" x2="35" y2="22" stroke={stroke} strokeWidth="1.3" />
          <rect x="35" y="12" width="16" height="16" fill="none" stroke={stroke} strokeWidth="1.4" />
          <circle cx="43" cy="20" r="4.5" fill="none" stroke={stroke} strokeWidth="1.3" />
        </svg>
      );

    case 'tee':
      return (
        <svg viewBox="0 0 48 40" className="w-10 h-8">
          <line x1="8" y1="18" x2="40" y2="18" stroke={stroke} strokeWidth="2" />
          <line x1="24" y1="18" x2="24" y2="33" stroke={stroke} strokeWidth="2" />
          <circle cx="24" cy="18" r="3.5" fill={stroke} />
        </svg>
      );

    default: {
      const extSvg = renderExtendedSymbolSvg({
        type,
        stroke,
        fillBg: isDark ? '#0F172A' : '#FFFFFF',
        accent,
        muted: isDark ? '#64748B' : '#94A3B8',
        isThumb: true,
      });
      if (!extSvg) return null;
      return (
        <svg viewBox={getExtendedThumbViewBox(type)} className="w-12 h-8">
          {extSvg}
        </svg>
      );
    }
  }
};
