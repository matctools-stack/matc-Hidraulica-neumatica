import React from 'react';
import { COMPONENT_CATALOG, getEffectiveValveConfig } from '../engine/fluidSolver';
import type {
  CircuitNode,
  NodeRuntimeState,
  ValveActuationSide,
  ValveChamberPattern,
  ValveConfig,
} from '../types/circuit';

export const CHAMBER_PATTERN_LABELS: Array<{ id: ValveChamberPattern; label: string }> = [
  { id: '', label: '(Vazio)' },
  { id: 'closed', label: 'Centro fechado (A, B, P, T bloqueados)' },
  { id: 'p_closed_abt', label: 'P fechado; A, B, T interligados' },
  { id: 't_closed_pab', label: 'T fechado; P, A, B interligados' },
  { id: 'a_closed_pbt', label: 'A fechado; P, B, T interligados' },
  { id: 'b_closed_pat', label: 'B fechado; P, A, T interligados' },
  { id: 'parallel', label: 'Vias paralelas (P→A, B→T)' },
  { id: 'crossed', label: 'Vias cruzadas (P→B, A→T)' },
  { id: 'b_to_t_pa_closed', label: 'B→T aberto; P e A bloqueados' },
  { id: 'p_to_a_bt_closed', label: 'P→A aberto; B e T bloqueados' },
  { id: 'a_to_t_pb_closed', label: 'A→T diagonal; P e B bloqueados' },
  { id: 'p_to_b_at_closed', label: 'P→B diagonal; A e T bloqueados' },
  { id: 'p_to_t_ab_closed', label: 'Tandem (P→T; A e B bloqueados)' },
  { id: 'a_to_b_pt_closed', label: 'A↔B interligados; P e T bloqueados' },
  { id: 'p_to_t_a_to_b', label: 'A↔B e P↔T em ponte dupla' },
  { id: 'all_open', label: 'Centro aberto (P, T, A, B interligados)' },
];

export type ValvePortVariant = 'two_way' | 'three_way' | 'four_way' | 'five_way' | 'six_way';

interface ChamberPatternSvgProps {
  pattern: ValveChamberPattern;
  x: number;
  y: number;
  w: number;
  h: number;
  stroke: string;
  portVariant?: ValvePortVariant;
}

export const ValveChamberPatternSvg: React.FC<ChamberPatternSvgProps> = ({
  pattern,
  x,
  y,
  w,
  h,
  stroke,
  portVariant = 'four_way',
}) => {
  const xL = x + w * 0.25;
  const xR = x + w * 0.75;
  const xM = x + w * 0.5;
  const xbL = x + w * 0.205;
  const xbM = xM;
  const xbR = x + w * 0.795;
  const yT = y;
  const yB = y + h;
  const yM = y + h * 0.5;
  const pad = Math.max(4, h * 0.22);

  const blockTop = (px: number) => (
    <g>
      <line x1={px} y1={yT} x2={px} y2={yT + pad} stroke={stroke} strokeWidth={1.5} />
      <line x1={px - 3.6} y1={yT + pad} x2={px + 3.6} y2={yT + pad} stroke={stroke} strokeWidth={1.5} />
    </g>
  );

  const blockBottom = (px: number) => (
    <g>
      <line x1={px} y1={yB} x2={px} y2={yB - pad} stroke={stroke} strokeWidth={1.5} />
      <line x1={px - 3.6} y1={yB - pad} x2={px + 3.6} y2={yB - pad} stroke={stroke} strokeWidth={1.5} />
    </g>
  );

  if (portVariant === 'two_way') {
    if (pattern === 'closed') {
      return (
        <g>
          {blockTop(xM)}
          {blockBottom(xM)}
        </g>
      );
    }
    return (
      <g>
        <line x1={xM} y1={yB} x2={xM} y2={yT} stroke={stroke} strokeWidth={1.6} />
        <polygon points={`${xM},${yT} ${xM - 3.2},${yT + 6.5} ${xM + 3.2},${yT + 6.5}`} fill={stroke} />
      </g>
    );
  }

  if (portVariant === 'three_way') {
    switch (pattern) {
      case 'closed':
        return (
          <g>
            {blockTop(xM)}
            {blockBottom(xL)}
            {blockBottom(xR)}
          </g>
        );
      case 'parallel':
      case 'p_to_a_b_exhaust':
      case 'p_to_a_bt_closed':
        return (
          <g>
            <line x1={xL} y1={yB} x2={xM} y2={yT} stroke={stroke} strokeWidth={1.6} />
            <polygon points={`${xM},${yT} ${xM - 5},${yT + 5.5} ${xM + 2},${yT + 7}`} fill={stroke} />
            {blockBottom(xR)}
          </g>
        );
      case 'crossed':
      case 'p_closed_ab_t':
      case 'b_to_t_pa_closed':
      case 'a_to_t_pb_closed':
        return (
          <g>
            {blockBottom(xL)}
            <line x1={xM} y1={yT} x2={xR} y2={yB} stroke={stroke} strokeWidth={1.6} />
            <polygon points={`${xR},${yB} ${xR - 5.5},${yB - 5} ${xR + 1.5},${yB - 7}`} fill={stroke} />
          </g>
        );
      case 't_closed_pab':
      case 'all_open':
        return (
          <g>
            <line x1={xM} y1={yT} x2={xM} y2={yM} stroke={stroke} strokeWidth={1.5} />
            <line x1={xL} y1={yB} x2={xM} y2={yM} stroke={stroke} strokeWidth={1.5} />
            <line x1={xR} y1={yB} x2={xM} y2={yM} stroke={stroke} strokeWidth={1.5} />
            <circle cx={xM} cy={yM} r={2.2} fill={stroke} />
          </g>
        );
      default:
        return (
          <g>
            {blockTop(xM)}
            <polyline
              points={`${xL},${yB} ${xL},${yB - pad} ${xR},${yB - pad} ${xR},${yB}`}
              fill="none"
              stroke={stroke}
              strokeWidth={1.6}
            />
          </g>
        );
    }
  }

  if (portVariant === 'six_way') {
    const spread6 = w >= 46 ? 15 : w * 0.3;
    const x6L = xM - spread6;
    const x6M = xM;
    const x6R = xM + spread6;
    if (pattern === 'closed') {
      return (
        <g>
          {blockTop(x6L)}
          {blockTop(x6M)}
          {blockTop(x6R)}
          {blockBottom(x6L)}
          {blockBottom(x6M)}
          {blockBottom(x6R)}
        </g>
      );
    }
    if (pattern === 'crossed') {
      return (
        <g>
          <line x1={x6L} y1={yT} x2={x6L} y2={yB} stroke={stroke} strokeWidth={1.6} />
          <polygon points={`${x6L},${yB} ${x6L - 3},${yB - 6.5} ${x6L + 3},${yB - 6.5}`} fill={stroke} />
          {blockBottom(x6M)}
          {blockTop(x6R)}
          <line x1={x6R} y1={yB} x2={x6M} y2={yT} stroke={stroke} strokeWidth={1.6} />
          <polygon points={`${x6M},${yT} ${x6M - 1},${yT + 7} ${x6M + 5},${yT + 4.5}`} fill={stroke} />
        </g>
      );
    }
    // Rest/default 6/2 chamber: B->E vertical down arrow, C top blocked, A->D diagonal up-right, F bottom blocked
    return (
      <g>
        <line x1={x6L} y1={yT} x2={x6L} y2={yB} stroke={stroke} strokeWidth={1.6} />
        <polygon points={`${x6L},${yB} ${x6L - 3},${yB - 6.5} ${x6L + 3},${yB - 6.5}`} fill={stroke} />
        {blockTop(x6M)}
        {blockBottom(x6R)}
        <line x1={x6M} y1={yB} x2={x6R} y2={yT} stroke={stroke} strokeWidth={1.6} />
        <polygon points={`${x6R},${yT} ${x6R - 5},${yT + 4.5} ${x6R + 1},${yT + 7}`} fill={stroke} />
      </g>
    );
  }

  if (portVariant === 'five_way') {
    switch (pattern) {
      case 'closed':
        return (
          <g>
            {blockTop(xL)}
            {blockTop(xR)}
            {blockBottom(xbL)}
            {blockBottom(xbM)}
            {blockBottom(xbR)}
          </g>
        );
      case 'parallel':
        return (
          <g>
            {blockBottom(xbL)}
            <line x1={xbM} y1={yB} x2={xL} y2={yT} stroke={stroke} strokeWidth={1.6} />
            <polygon points={`${xL},${yT} ${xL - 1.5},${yT + 7} ${xL + 4.5},${yT + 4.8}`} fill={stroke} />
            <line x1={xR} y1={yT} x2={xbR} y2={yB} stroke={stroke} strokeWidth={1.6} />
            <polygon points={`${xbR},${yB} ${xbR - 4.2},${yB - 5.5} ${xbR + 2.4},${yB - 6.5}`} fill={stroke} />
          </g>
        );
      case 'crossed':
        return (
          <g>
            {blockBottom(xbR)}
            <line x1={xbM} y1={yB} x2={xR} y2={yT} stroke={stroke} strokeWidth={1.6} />
            <polygon points={`${xR},${yT} ${xR - 4.5},${yT + 4.8} ${xR + 1.5},${yT + 7}`} fill={stroke} />
            <line x1={xL} y1={yT} x2={xbL} y2={yB} stroke={stroke} strokeWidth={1.6} />
            <polygon points={`${xbL},${yB} ${xbL - 2.4},${yB - 6.5} ${xbL + 4.2},${yB - 5.5}`} fill={stroke} />
          </g>
        );
      case 'p_closed_abt':
      case 'p_closed_ab_t':
      case 'all_open':
        return (
          <g>
            {blockBottom(xbM)}
            <line x1={xL} y1={yT} x2={xbL} y2={yB} stroke={stroke} strokeWidth={1.6} />
            <polygon points={`${xbL},${yB} ${xbL - 2.4},${yB - 6.5} ${xbL + 4.2},${yB - 5.5}`} fill={stroke} />
            <line x1={xR} y1={yT} x2={xbR} y2={yB} stroke={stroke} strokeWidth={1.6} />
            <polygon points={`${xbR},${yB} ${xbR - 4.2},${yB - 5.5} ${xbR + 2.4},${yB - 6.5}`} fill={stroke} />
          </g>
        );
      case 't_closed_pab':
        return (
          <g>
            {blockBottom(xbL)}
            {blockBottom(xbR)}
            <line x1={xbM} y1={yB} x2={xbM} y2={yM} stroke={stroke} strokeWidth={1.5} />
            <polyline points={`${xL},${yT} ${xL},${yM} ${xR},${yM} ${xR},${yT}`} fill="none" stroke={stroke} strokeWidth={1.5} />
            <circle cx={xbM} cy={yM} r={2.2} fill={stroke} />
          </g>
        );
      default:
        break;
    }
  }

  switch (pattern) {
    case 'closed':
      return (
        <g>
          {blockTop(xL)}
          {blockTop(xR)}
          {blockBottom(xL)}
          {blockBottom(xR)}
        </g>
      );

    case 'p_closed_abt':
      // P blocked; A, B, T interconnected with dot on right vertical
      return (
        <g>
          {blockBottom(xL)}
          <polyline points={`${xL},${yT} ${xL},${yM} ${xR},${yM}`} fill="none" stroke={stroke} strokeWidth={1.5} />
          <line x1={xR} y1={yT} x2={xR} y2={yB} stroke={stroke} strokeWidth={1.5} />
          <circle cx={xR} cy={yM} r={2.3} fill={stroke} />
        </g>
      );

    case 't_closed_pab':
      // T blocked; P, A, B interconnected with dot on left vertical
      return (
        <g>
          {blockBottom(xR)}
          <line x1={xL} y1={yT} x2={xL} y2={yB} stroke={stroke} strokeWidth={1.5} />
          <polyline points={`${xL},${yM} ${xR},${yM} ${xR},${yT}`} fill="none" stroke={stroke} strokeWidth={1.5} />
          <circle cx={xL} cy={yM} r={2.3} fill={stroke} />
        </g>
      );

    case 'a_closed_pbt':
      // A blocked; P, B, T interconnected with dot on right vertical
      return (
        <g>
          {blockTop(xL)}
          <polyline points={`${xL},${yB} ${xL},${yM} ${xR},${yM}`} fill="none" stroke={stroke} strokeWidth={1.5} />
          <line x1={xR} y1={yT} x2={xR} y2={yB} stroke={stroke} strokeWidth={1.5} />
          <circle cx={xR} cy={yM} r={2.3} fill={stroke} />
        </g>
      );

    case 'b_closed_pat':
      // B blocked; P, A, T interconnected with dot on left vertical
      return (
        <g>
          {blockTop(xR)}
          <line x1={xL} y1={yT} x2={xL} y2={yB} stroke={stroke} strokeWidth={1.5} />
          <polyline points={`${xL},${yM} ${xR},${yM} ${xR},${yB}`} fill="none" stroke={stroke} strokeWidth={1.5} />
          <circle cx={xL} cy={yM} r={2.3} fill={stroke} />
        </g>
      );

    case 'parallel':
      return (
        <g>
          <line x1={xL} y1={yB} x2={xL} y2={yT} stroke={stroke} strokeWidth={1.6} />
          <polygon points={`${xL},${yT} ${xL - 3.2},${yT + 6.5} ${xL + 3.2},${yT + 6.5}`} fill={stroke} />
          <line x1={xR} y1={yT} x2={xR} y2={yB} stroke={stroke} strokeWidth={1.6} />
          <polygon points={`${xR},${yB} ${xR - 3.2},${yB - 6.5} ${xR + 3.2},${yB - 6.5}`} fill={stroke} />
        </g>
      );

    case 'crossed':
      return (
        <g>
          <line x1={xL} y1={yB} x2={xR} y2={yT} stroke={stroke} strokeWidth={1.6} />
          <polygon points={`${xR},${yT} ${xR - 6},${yT + 4} ${xR - 0.5},${yT + 7.5}`} fill={stroke} />
          <line x1={xR} y1={yB} x2={xL} y2={yT} stroke={stroke} strokeWidth={1.6} />
          <polygon points={`${xR},${yB} ${xR - 6},${yB - 4} ${xR - 0.5},${yB - 7.5}`} fill={stroke} />
        </g>
      );

    case 'b_to_t_pa_closed':
      return (
        <g>
          {blockTop(xL)}
          {blockBottom(xL)}
          <line x1={xR} y1={yT} x2={xR} y2={yB} stroke={stroke} strokeWidth={1.6} />
          <polygon points={`${xR},${yB} ${xR - 3.2},${yB - 6.5} ${xR + 3.2},${yB - 6.5}`} fill={stroke} />
        </g>
      );

    case 'p_to_a_bt_closed':
      return (
        <g>
          <line x1={xL} y1={yB} x2={xL} y2={yT} stroke={stroke} strokeWidth={1.6} />
          <polygon points={`${xL},${yT} ${xL - 3.2},${yT + 6.5} ${xL + 3.2},${yT + 6.5}`} fill={stroke} />
          {blockTop(xR)}
          {blockBottom(xR)}
        </g>
      );

    case 'a_to_t_pb_closed':
      return (
        <g>
          {blockTop(xR)}
          {blockBottom(xL)}
          <line x1={xL} y1={yT} x2={xR} y2={yB} stroke={stroke} strokeWidth={1.6} />
          <polygon points={`${xR},${yB} ${xR - 6},${yB - 4} ${xR - 0.5},${yB - 7.5}`} fill={stroke} />
        </g>
      );

    case 'p_to_b_at_closed':
      return (
        <g>
          {blockTop(xL)}
          {blockBottom(xR)}
          <line x1={xL} y1={yB} x2={xR} y2={yT} stroke={stroke} strokeWidth={1.6} />
          <polygon points={`${xR},${yT} ${xR - 6},${yT + 4} ${xR - 0.5},${yT + 7.5}`} fill={stroke} />
        </g>
      );

    case 'p_to_t_ab_closed':
      return (
        <g>
          {blockTop(xL)}
          {blockTop(xR)}
          <polyline
            points={`${xL},${yB} ${xL},${yB - pad} ${xR},${yB - pad} ${xR},${yB}`}
            fill="none"
            stroke={stroke}
            strokeWidth={1.6}
          />
        </g>
      );

    case 'a_to_b_pt_closed':
      return (
        <g>
          <polyline
            points={`${xL},${yT} ${xL},${yT + pad} ${xR},${yT + pad} ${xR},${yT}`}
            fill="none"
            stroke={stroke}
            strokeWidth={1.6}
          />
          {blockBottom(xL)}
          {blockBottom(xR)}
        </g>
      );

    case 'p_to_t_a_to_b':
      return (
        <g>
          <polyline
            points={`${xL},${yT} ${xL},${yT + pad} ${xR},${yT + pad} ${xR},${yT}`}
            fill="none"
            stroke={stroke}
            strokeWidth={1.6}
          />
          <polyline
            points={`${xL},${yB} ${xL},${yB - pad} ${xR},${yB - pad} ${xR},${yB}`}
            fill="none"
            stroke={stroke}
            strokeWidth={1.6}
          />
        </g>
      );

    case 'all_open':
      return (
        <g>
          <line x1={xL} y1={yT} x2={xL} y2={yB} stroke={stroke} strokeWidth={1.5} />
          <line x1={xR} y1={yT} x2={xR} y2={yB} stroke={stroke} strokeWidth={1.5} />
          <line x1={xL} y1={yM} x2={xR} y2={yM} stroke={stroke} strokeWidth={1.5} />
          <circle cx={xL} cy={yM} r={2.3} fill={stroke} />
          <circle cx={xR} cy={yM} r={2.3} fill={stroke} />
        </g>
      );

    // Legacy / 3-2 compatibility aliases
    case 'p_to_a_b_exhaust':
      return (
        <g>
          <line x1={xL} y1={yB} x2={xM} y2={yT} stroke={stroke} strokeWidth={1.6} />
          <polygon points={`${xM},${yT} ${xM - 5},${yT + 5.5} ${xM + 2},${yT + 7}`} fill={stroke} />
          {blockBottom(xR)}
        </g>
      );

    case 'p_closed_ab_t':
      return (
        <g>
          {blockBottom(xL)}
          <polyline
            points={`${xL},${yT} ${xL},${yM} ${xR},${yM} ${xR},${yB}`}
            fill="none"
            stroke={stroke}
            strokeWidth={1.5}
          />
          <line x1={xR} y1={yT} x2={xR} y2={yM} stroke={stroke} strokeWidth={1.5} />
          <circle cx={xR} cy={yM} r={2.3} fill={stroke} />
        </g>
      );

    case 'check_up':
      return (
        <g>
          <line x1={xM} y1={yT} x2={xM} y2={yB} stroke={stroke} strokeWidth={1.5} />
          <circle cx={xM} cy={yT + h * 0.45} r={3.5} fill="none" stroke={stroke} strokeWidth={1.4} />
          <polyline
            points={`${xM - 5},${yT + h * 0.62} ${xM},${yT + h * 0.45} ${xM + 5},${yT + h * 0.62}`}
            fill="none"
            stroke={stroke}
            strokeWidth={1.4}
          />
        </g>
      );

    default:
      return null;
  }
};

interface ValveActuationSvgProps {
  side: 'left' | 'right';
  actuation: ValveActuationSide;
  edgeX: number;
  centerY: number;
  stroke: string;
  accent: string;
  isActive?: boolean;
  isProportional?: boolean;
}

export const ValveActuationSvg: React.FC<ValveActuationSvgProps> = ({
  side,
  actuation,
  edgeX,
  centerY,
  stroke,
  accent,
  isActive = false,
  isProportional = false,
}) => {
  const dir = side === 'left' ? -1 : 1;
  const activeStroke = isActive ? accent : stroke;

  const hasOperator =
    actuation.manual || actuation.mechanical || actuation.electrical || actuation.piloted;

  const items: React.ReactNode[] = [];
  let cursorOffset = 0;
  let renderedInlinePropSpring = false;

  // Hydraulic / Electric symbols (Screenshot 3 & Proportional continuous valves)
  if (actuation.electrical === 'solenoid' && isProportional) {
    const boxW = 20;
    const bx = side === 'left' ? edgeX - boxW : edgeX;
    const boxY = centerY + 4;
    const boxH = 20;
    const boxCenterY = boxY + boxH / 2;
    const outerCircleX = side === 'left' ? bx : bx + boxW;
    const arrowStart =
      side === 'left' ? { x: bx + boxW - 3, y: boxY + boxH + 3 } : { x: bx + 3, y: boxY + boxH + 3 };
    const arrowEnd =
      side === 'left' ? { x: bx - 4, y: boxY - 6 } : { x: bx + boxW + 4, y: boxY - 6 };
    const headBase =
      side === 'left'
        ? `${arrowEnd.x},${arrowEnd.y} ${arrowEnd.x + 1.5},${arrowEnd.y + 6} ${arrowEnd.x + 6},${arrowEnd.y + 3}`
        : `${arrowEnd.x},${arrowEnd.y} ${arrowEnd.x - 1.5},${arrowEnd.y + 6} ${arrowEnd.x - 6},${arrowEnd.y + 3}`;

    if (actuation.springReturn) {
      renderedInlinePropSpring = true;
      const sx = edgeX;
      const spDir = dir;
      items.push(
        <path
          key="prop-spring-top"
          d={`M ${sx} ${centerY - 23} L ${sx + spDir * 3.5} ${centerY - 7} L ${sx + spDir * 7} ${centerY - 23} L ${sx + spDir * 10.5} ${centerY - 7} L ${sx + spDir * 14} ${centerY - 23} L ${sx + spDir * 17.5} ${centerY - 7}`}
          fill="none"
          stroke={stroke}
          strokeWidth={1.3}
        />
      );
    }

    items.push(
      <g key="prop-sol">
        <rect
          x={bx}
          y={boxY}
          width={boxW}
          height={boxH}
          fill={isActive ? accent : 'none'}
          fillOpacity={isActive ? 0.2 : 0}
          stroke={activeStroke}
          strokeWidth={1.35}
        />
        <line
          x1={bx + 4}
          y1={boxY + boxH}
          x2={bx + boxW - 4}
          y2={boxY}
          stroke={activeStroke}
          strokeWidth={1.25}
        />
        <line
          x1={arrowStart.x}
          y1={arrowStart.y}
          x2={arrowEnd.x}
          y2={arrowEnd.y}
          stroke={activeStroke}
          strokeWidth={1.35}
        />
        <polygon points={headBase} fill={activeStroke} />
        <circle
          cx={outerCircleX}
          cy={boxCenterY}
          r={2.5}
          fill="#FFFFFF"
          stroke={activeStroke}
          strokeWidth={1.2}
        />
      </g>
    );
    cursorOffset += 22;
  } else if (actuation.electrical === 'solenoid') {
    const bx = side === 'left' ? edgeX - 18 : edgeX;
    items.push(
      <g key="sol">
        <rect
          x={bx}
          y={centerY - 6}
          width={18}
          height={12}
          fill={isActive ? accent : 'none'}
          fillOpacity={isActive ? 0.2 : 0}
          stroke={activeStroke}
          strokeWidth={1.4}
        />
        <line
          x1={bx + 4}
          y1={centerY + 6}
          x2={bx + 14}
          y2={centerY - 6}
          stroke={activeStroke}
          strokeWidth={1.3}
        />
      </g>
    );
    cursorOffset += 18;
  } else if (
    actuation.electrical === 'hydraulic_pilot' ||
    actuation.electrical === 'pneumatic_pilot'
  ) {
    const sx = edgeX + dir * cursorOffset;
    const ex = sx + dir * 16;
    const fill = actuation.electrical === 'hydraulic_pilot' ? activeStroke : 'none';
    items.push(
      <g key="pilot">
        <line x1={sx} y1={centerY} x2={ex} y2={centerY} stroke={activeStroke} strokeWidth={1.4} />
        {side === 'left' ? (
          <polygon
            points={`${sx - 5},${centerY} ${sx - 12},${centerY - 4.5} ${sx - 12},${centerY + 4.5}`}
            fill={fill}
            stroke={activeStroke}
            strokeWidth={1.2}
          />
        ) : (
          <polygon
            points={`${sx + 5},${centerY} ${sx + 12},${centerY - 4.5} ${sx + 12},${centerY + 4.5}`}
            fill={fill}
            stroke={activeStroke}
            strokeWidth={1.2}
          />
        )}
      </g>
    );
    cursorOffset += 16;
  } else if (actuation.electrical === 'hydraulic_pilot_solenoid') {
    // Arrow -> solenoid coil box (Screenshot 3 bottom option)
    const sx = edgeX + dir * cursorOffset;
    const bx = side === 'left' ? sx - 12 : sx;
    items.push(
      <g key="pilot-sol">
        <rect
          x={bx}
          y={centerY - 5}
          width={12}
          height={10}
          fill={isActive ? accent : 'none'}
          fillOpacity={isActive ? 0.2 : 0}
          stroke={activeStroke}
          strokeWidth={1.3}
        />
        <line x1={bx + 2} y1={centerY + 5} x2={bx + 10} y2={centerY - 5} stroke={activeStroke} strokeWidth={1.2} />
        <line
          x1={bx + (side === 'left' ? 0 : 12)}
          y1={centerY}
          x2={bx + (side === 'left' ? -12 : 24)}
          y2={centerY}
          stroke={activeStroke}
          strokeWidth={1.3}
        />
        {side === 'left' ? (
          <polygon points={`${bx - 2},${centerY} ${bx - 8},${centerY - 3.5} ${bx - 8},${centerY + 3.5}`} fill={activeStroke} />
        ) : (
          <polygon points={`${bx + 14},${centerY} ${bx + 20},${centerY - 3.5} ${bx + 20},${centerY + 3.5}`} fill={activeStroke} />
        )}
      </g>
    );
    cursorOffset += 22;
  }

  if (actuation.piloted) {
    const sx = edgeX + dir * cursorOffset;
    const ex = sx + dir * 10;
    items.push(
      <g key="piloted">
        <rect
          x={Math.min(sx, ex)}
          y={centerY - 6}
          width={10}
          height={12}
          fill="none"
          stroke={activeStroke}
          strokeWidth={1.2}
          strokeDasharray="2 1"
        />
      </g>
    );
    cursorOffset += 10;
  }

  // Mechanical symbols (Screenshot 2)
  if (actuation.mechanical) {
    const sx = edgeX + dir * cursorOffset;
    if (actuation.mechanical === 'plunger') {
      const tipX = sx + dir * 11;
      items.push(
        <g key="plunger">
          <line x1={sx} y1={centerY - 3.5} x2={tipX} y2={centerY - 3.5} stroke={activeStroke} strokeWidth={1.3} />
          <line x1={sx} y1={centerY + 3.5} x2={tipX} y2={centerY + 3.5} stroke={activeStroke} strokeWidth={1.3} />
          <path
            d={`M ${tipX} ${centerY - 3.5} A 3.5 3.5 0 0 ${side === 'left' ? 0 : 1} ${tipX} ${centerY + 3.5}`}
            fill="none"
            stroke={activeStroke}
            strokeWidth={1.3}
          />
        </g>
      );
      cursorOffset += 16;
    } else if (actuation.mechanical === 'roller') {
      const cx = sx + dir * 12;
      items.push(
        <g key="roller">
          <line x1={sx} y1={centerY - 3} x2={cx} y2={centerY - 3} stroke={activeStroke} strokeWidth={1.3} />
          <line x1={sx} y1={centerY + 3} x2={cx} y2={centerY + 3} stroke={activeStroke} strokeWidth={1.3} />
          <circle cx={cx} cy={centerY} r={4} fill="none" stroke={activeStroke} strokeWidth={1.3} />
          <circle cx={cx} cy={centerY} r={1.2} fill={activeStroke} />
        </g>
      );
      cursorOffset += 17;
    } else if (actuation.mechanical === 'idle_roller' || actuation.mechanical === 'idle_roller_rev') {
      const cx = sx + dir * 13;
      const arrowDir = actuation.mechanical === 'idle_roller' ? 1 : -1;
      items.push(
        <g key="idle_roller">
          <line x1={sx} y1={centerY + 4} x2={sx + dir * 6} y2={centerY + 4} stroke={activeStroke} strokeWidth={1.3} />
          <line x1={sx + dir * 6} y1={centerY + 4} x2={cx} y2={centerY - 4} stroke={activeStroke} strokeWidth={1.3} />
          <circle cx={cx} cy={centerY - 5} r={3.5} fill="none" stroke={activeStroke} strokeWidth={1.3} />
          <circle cx={cx} cy={centerY - 5} r={1} fill={activeStroke} />
          <line x1={cx + 5 * arrowDir} y1={centerY - 6} x2={cx + 11 * arrowDir} y2={centerY - 6} stroke={activeStroke} strokeWidth={1.2} />
          <polygon
            points={`${cx + 12 * arrowDir},${centerY - 6} ${cx + 8 * arrowDir},${centerY - 8.5} ${cx + 8 * arrowDir},${centerY - 3.5}`}
            fill={activeStroke}
          />
        </g>
      );
      cursorOffset += 18;
    } else if (actuation.mechanical === 'limit_sensor') {
      const bx = side === 'left' ? sx - 16 : sx;
      items.push(
        <g key="limit_sensor">
          <rect x={bx} y={centerY - 6} width={16} height={12} fill="none" stroke={activeStroke} strokeWidth={1.3} />
          <line x1={bx + 8} y1={centerY - 4} x2={bx + 8} y2={centerY + 4} stroke={activeStroke} strokeWidth={1.1} />
          <line x1={bx + 4} y1={centerY} x2={bx + 12} y2={centerY} stroke={activeStroke} strokeWidth={1.1} />
          <line x1={bx + 5} y1={centerY - 3} x2={bx + 11} y2={centerY + 3} stroke={activeStroke} strokeWidth={1.1} />
          <line x1={bx + 11} y1={centerY - 3} x2={bx + 5} y2={centerY + 3} stroke={activeStroke} strokeWidth={1.1} />
        </g>
      );
      cursorOffset += 16;
    } else if (actuation.mechanical === 'proximity_sensor') {
      const bx = side === 'left' ? sx - 18 : sx;
      items.push(
        <g key="proximity_sensor">
          <rect x={bx} y={centerY - 6} width={18} height={12} fill="none" stroke={activeStroke} strokeWidth={1.3} />
          <rect x={bx} y={centerY - 6} width={4} height={12} fill={activeStroke} />
          <polygon points={`${bx + 11},${centerY - 4} ${bx + 6},${centerY} ${bx + 11},${centerY + 4}`} fill="none" stroke={activeStroke} strokeWidth={1.1} />
          <polygon points={`${bx + 12},${centerY - 4} ${bx + 16},${centerY} ${bx + 12},${centerY + 4}`} fill="none" stroke={activeStroke} strokeWidth={1.1} />
        </g>
      );
      cursorOffset += 18;
    }
  }

  // Manual symbols (Screenshot 1: 8 options)
  if (actuation.manual) {
    const sx = edgeX + dir * cursorOffset;
    const isDetent =
      actuation.manual === 'manual_detent' ||
      actuation.manual === 'button_detent' ||
      actuation.manual === 'detent_lever' ||
      actuation.manual === 'pedal_detent';

    const drawRailsAndDetent = (endX: number) => (
      <g>
        <line x1={sx} y1={centerY - 3.5} x2={endX} y2={centerY - 3.5} stroke={activeStroke} strokeWidth={1.3} />
        <line x1={sx} y1={centerY + 3.5} x2={endX} y2={centerY + 3.5} stroke={activeStroke} strokeWidth={1.3} />
        {isDetent && (
          <polyline
            points={`${sx + dir * 4},${centerY - 3.5} ${sx + dir * 6},${centerY - 1} ${sx + dir * 8},${centerY - 3.5}`}
            fill="none"
            stroke={activeStroke}
            strokeWidth={1.2}
          />
        )}
      </g>
    );

    if (actuation.manual === 'manual_general' || actuation.manual === 'manual_detent') {
      const endX = sx + dir * 13;
      items.push(
        <g key="manual-gen">
          {drawRailsAndDetent(endX)}
          <line x1={endX} y1={centerY - 6.5} x2={endX} y2={centerY + 6.5} stroke={activeStroke} strokeWidth={1.5} />
        </g>
      );
      cursorOffset += 15;
    } else if (actuation.manual === 'button' || actuation.manual === 'button_detent') {
      const endX = sx + dir * 12;
      items.push(
        <g key="btn">
          {drawRailsAndDetent(endX)}
          <line x1={endX} y1={centerY - 6.5} x2={endX} y2={centerY + 6.5} stroke={activeStroke} strokeWidth={1.3} />
          <path
            d={`M ${endX} ${centerY - 6.5} Q ${endX + dir * 6} ${centerY} ${endX} ${centerY + 6.5}`}
            fill={isActive ? accent : 'none'}
            fillOpacity={isActive ? 0.25 : 0}
            stroke={activeStroke}
            strokeWidth={1.4}
          />
        </g>
      );
      cursorOffset += 17;
    } else if (actuation.manual === 'lever' || actuation.manual === 'detent_lever') {
      const endX = sx + dir * 13;
      const knobX = endX + dir * 3;
      items.push(
        <g key="lever">
          {drawRailsAndDetent(endX)}
          <line x1={endX - dir * 2} y1={centerY + 5} x2={knobX} y2={centerY - 8} stroke={activeStroke} strokeWidth={1.4} />
          <circle cx={knobX} cy={centerY - 9.5} r={2} fill="none" stroke={activeStroke} strokeWidth={1.3} />
        </g>
      );
      cursorOffset += 18;
    } else if (actuation.manual === 'pedal' || actuation.manual === 'pedal_detent') {
      const endX = sx + dir * 13;
      items.push(
        <g key="pedal">
          {drawRailsAndDetent(endX)}
          <polyline
            points={`${endX - dir * 3},${centerY + 5} ${endX + dir * 3},${centerY - 7} ${endX + dir * 5},${centerY - 5}`}
            fill="none"
            stroke={activeStroke}
            strokeWidth={1.4}
          />
        </g>
      );
      cursorOffset += 18;
    }
  }

  if (actuation.springReturn && !renderedInlinePropSpring) {
    const sx = edgeX + dir * cursorOffset;
    if (isProportional && !hasOperator) {
      const spDir = dir;
      items.push(
        <path
          key="spring"
          d={`M ${sx} ${centerY - 23} L ${sx + spDir * 3.5} ${centerY - 7} L ${sx + spDir * 7} ${centerY - 23} L ${sx + spDir * 10.5} ${centerY - 7} L ${sx + spDir * 14} ${centerY - 23} L ${sx + spDir * 17.5} ${centerY - 7}`}
          fill="none"
          stroke={stroke}
          strokeWidth={1.3}
        />
      );
    } else {
      const step = dir * 3.5;
      items.push(
        <path
          key="spring"
          d={`M ${sx} ${centerY - 6} L ${sx + step} ${centerY - 2} L ${sx} ${centerY + 2} L ${sx + step * 1.4} ${centerY + 6} L ${sx + step * 2.2} ${centerY - 6} L ${sx + step * 3} ${centerY + 6}`}
          fill="none"
          stroke={stroke}
          strokeWidth={1.3}
        />
      );
    }
  }

  const hitW = Math.max(24, cursorOffset + 6);
  const hitX = side === 'left' ? edgeX - hitW : edgeX;

  return (
    <g
      data-valve-side={side}
      data-actuator-configured={hasOperator ? 'true' : undefined}
      className="cursor-pointer"
    >
      <rect x={hitX} y={centerY - 24} width={hitW} height={48} fill="transparent">
        {hasOperator && (
          <title>Clique para abrir Conexão (mecânica) · Na simulação, aciona o operador</title>
        )}
      </rect>
      {items}
    </g>
  );
};

interface DirectionalValveSymbolProps {
  node: CircuitNode;
  isDark: boolean;
  accent: string;
  activeColor?: string;
  runtime?: NodeRuntimeState;
}

export const DirectionalValveSymbol: React.FC<DirectionalValveSymbolProps> = ({
  node,
  isDark,
  accent,
  runtime,
}) => {
  const stroke = isDark ? '#E2E8F0' : '#0F172A';
  const fillBg = isDark ? '#0F172A' : '#FFFFFF';
  const activeFill = isDark ? '#0C4A6E' : '#E0F2FE';
  const restFill = isDark ? '#1E293B' : '#F8FAFC';

  const vCfg: ValveConfig = getEffectiveValveConfig(node);
  const spec = COMPONENT_CATALOG[node.type];
  const isProp = node.type === 'prop_valve_4_3' || node.type === 'servo_valve_4_3';
  const isThree =
    node.type === 'valve_4_3' ||
    node.type === 'valve_5_3' ||
    node.type === 'prop_valve_4_3' ||
    node.type === 'servo_valve_4_3';

  const chamberCount = isThree ? 3 : 2;
  const chamberW = node.type === 'valve_2_2' ? 36 : node.type === 'valve_6_2' ? 54 : 44;
  const chamberH = node.type === 'valve_2_2' ? 44 : node.type === 'valve_3_2' ? 48 : 52;
  const totalW = chamberW * chamberCount;
  const startX = -totalW / 2;
  const topY = -chamberH / 2;

  const portVariant: ValvePortVariant =
    node.type === 'valve_2_2'
      ? 'two_way'
      : node.type === 'valve_3_2'
        ? 'three_way'
        : node.type === 'valve_5_2' || node.type === 'valve_5_3'
          ? 'five_way'
          : node.type === 'valve_6_2'
            ? 'six_way'
            : 'four_way';

  const restPos = isThree
    ? Math.max(0, Math.min(2, vCfg.initialPosition ?? 1))
    : vCfg.initialPosition === 0
      ? 0
      : 1;
  const activeIdx =
    runtime?.activeSpoolPos !== undefined
      ? runtime.activeSpoolPos
      : isThree
        ? Math.max(0, Math.min(2, node.params.spoolPosition ?? restPos))
        : node.params.spoolPosition !== undefined
          ? node.params.spoolPosition === 0
            ? 0
            : 1
          : node.params.active !== undefined
            ? node.params.active
              ? 0
              : 1
            : restPos;

  // Physical spool shift in the actuator's push direction:
  // - 3-pos: left actuator pushes body right (+chamberW) so chamber 0 aligns over central ports;
  //          right actuator pushes body left (-chamberW) so chamber 2 aligns over central ports.
  // - 2-pos: left actuator pushes body right (+chamberW/2) so chamber 0 aligns over central ports;
  //          right actuator/spring keeps body left (-chamberW/2) so chamber 1 aligns over central ports.
  const shiftX = isThree
    ? (1 - activeIdx) * chamberW
    : activeIdx === 0
      ? chamberW / 2
      : -chamberW / 2;

  const scaleX = vCfg.mirrorHorizontal ? -1 : 1;
  const scaleY = vCfg.mirrorVertical ? -1 : 1;

  return (
    <g>
      <g transform={`scale(${scaleX}, ${scaleY})`}>
        <g
          data-testid={`valve-spool-${node.id}`}
          data-spool-shift={shiftX}
          data-active-pos={activeIdx}
          transform={`translate(${shiftX}, 0)`}
          style={{ transition: 'transform 160ms ease-out' }}
        >
          {isProp && (
            <>
              <line x1={startX} y1={topY - 3.5} x2={startX + totalW} y2={topY - 3.5} stroke={accent} strokeWidth={1.3} />
              <line x1={startX} y1={topY + chamberH + 3.5} x2={startX + totalW} y2={topY + chamberH + 3.5} stroke={accent} strokeWidth={1.3} />
            </>
          )}

          {Array.from({ length: chamberCount }).map((_, idx) => {
            const cx = startX + idx * chamberW;
            const isCurrent = idx === activeIdx;
            const pattern =
              vCfg.chambers[idx] ||
              (isThree
                ? idx === 0
                  ? 'crossed'
                  : idx === 2
                    ? 'parallel'
                    : 'closed'
                : idx === 0
                  ? 'parallel'
                  : 'crossed');

            return (
              <g key={idx}>
                <rect
                  x={cx}
                  y={topY}
                  width={chamberW}
                  height={chamberH}
                  fill={isCurrent ? activeFill : idx === 1 && isThree ? restFill : fillBg}
                  stroke={isCurrent ? accent : stroke}
                  strokeWidth={isCurrent ? 2 : 1.6}
                />
                <ValveChamberPatternSvg
                  pattern={pattern}
                  x={cx}
                  y={topY}
                  w={chamberW}
                  h={chamberH}
                  stroke={stroke}
                  portVariant={portVariant}
                />
              </g>
            );
          })}

          <ValveActuationSvg
            side="left"
            actuation={vCfg.leftActuation}
            edgeX={startX}
            centerY={0}
            stroke={stroke}
            accent={accent}
            isActive={activeIdx === 0}
            isProportional={isProp}
          />
          <ValveActuationSvg
            side="right"
            actuation={vCfg.rightActuation}
            edgeX={startX + totalW}
            centerY={0}
            stroke={stroke}
            accent={accent}
            isActive={isThree ? activeIdx === 2 : activeIdx === 1}
            isProportional={isProp}
          />

          {(vCfg.leftActuation.mark?.trim() || node.params.sensingMark?.trim()) && (
            <g
              data-valve-side="left"
              data-actuator-configured="true"
              className="cursor-pointer"
              transform={`scale(${scaleX}, ${scaleY})`}
            >
              <text
                x={vCfg.mirrorHorizontal ? totalW / 2 + 16 : startX - 16}
                y={-18}
                textAnchor="middle"
                fontSize={9.5}
                fontWeight={700}
                className="font-mono select-none"
                fill={activeIdx === 0 ? accent : stroke}
              >
                {vCfg.leftActuation.mark?.trim() || node.params.sensingMark?.trim()}
              </text>
            </g>
          )}
          {(vCfg.rightActuation.mark?.trim() || node.params.secondaryMark?.trim()) && (
            <g
              data-valve-side="right"
              data-actuator-configured="true"
              className="cursor-pointer"
              transform={`scale(${scaleX}, ${scaleY})`}
            >
              <text
                x={vCfg.mirrorHorizontal ? startX - 16 : totalW / 2 + 16}
                y={-18}
                textAnchor="middle"
                fontSize={9.5}
                fontWeight={700}
                className="font-mono select-none"
                fill={(isThree ? activeIdx === 2 : activeIdx === 1) ? accent : stroke}
              >
                {vCfg.rightActuation.mark?.trim() || node.params.secondaryMark?.trim()}
              </text>
            </g>
          )}
        </g>
      </g>

      {/* Stationary manifold port stems always stay aligned with port circles */}
      {spec.ports.map((port) => {
        const stemY1 = port.dy > 0 ? chamberH / 2 : -chamberH / 2;
        return (
          <line
            key={port.id}
            x1={port.dx}
            y1={stemY1}
            x2={port.dx}
            y2={port.dy}
            stroke={stroke}
            strokeWidth={1.7}
          />
        );
      })}
    </g>
  );
};
