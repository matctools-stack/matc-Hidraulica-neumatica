import React, { useEffect, useRef, useState } from 'react';
import { GripHorizontal, X } from 'lucide-react';
import { getEffectiveValveConfig, isDirectionalValveType } from '../engine/fluidSolver';
import type { CircuitNode, FluidMedium } from '../types/circuit';

export interface MechanicalConnectionTarget {
  nodeId: string;
  side: 'left' | 'right';
}

interface MechanicalConnectionDialogProps {
  target: MechanicalConnectionTarget | null;
  node: CircuitNode | null;
  fluid: FluidMedium;
  canEdit: boolean;
  isDark: boolean;
  initialMarkOverride?: string;
  anchorPos?: { x: number; y: number };
  availableMarks?: string[];
  onClose: () => void;
  onApply: (nodeId: string, side: 'left' | 'right', mark: string) => void;
}

export const DistanceRulePreviewSvg: React.FC<{ stroke?: string }> = ({
  stroke = '#0F172A',
}) => {
  const cells = 10;
  const barX = 16;
  const barY = 7;
  const barW = 72;
  const barH = 12;
  const step = barW / cells;

  return (
    <svg
      viewBox="0 0 112 52"
      className="w-[104px] h-[48px] pointer-events-none"
      aria-label="Símbolo da Régua de distância"
    >
      {/* Top segmented distance rule scale */}
      <rect
        x={barX}
        y={barY}
        width={barW}
        height={barH}
        fill="none"
        stroke={stroke}
        strokeWidth={1.3}
      />
      {Array.from({ length: cells - 1 }).map((_, idx) => (
        <line
          key={idx}
          x1={barX + (idx + 1) * step}
          y1={barY}
          x2={barX + (idx + 1) * step}
          y2={barY + barH}
          stroke={stroke}
          strokeWidth={1.1}
        />
      ))}

      {/* Lower cylinder / actuator reference outline matching FluidSIM */}
      <line x1={barX} y1={24} x2={barX + barW} y2={24} stroke={stroke} strokeWidth={1.3} />
      <line x1={barX} y1={24} x2={barX} y2={42} stroke={stroke} strokeWidth={1.3} />
      <line x1={barX + barW} y1={24} x2={barX + barW} y2={33} stroke={stroke} strokeWidth={1.3} />
      <line x1={barX + 14} y1={24} x2={barX + 14} y2={42} stroke={stroke} strokeWidth={1.3} />
      <rect
        x={barX + 34}
        y={33}
        width={52}
        height={6}
        fill="none"
        stroke={stroke}
        strokeWidth={1.3}
      />
      <line x1={barX + 34} y1={24} x2={barX + 34} y2={42} stroke={stroke} strokeWidth={1.3} />
    </svg>
  );
};

export const MechanicalConnectionDialog: React.FC<MechanicalConnectionDialogProps> = ({
  target,
  node,
  fluid,
  canEdit,
  isDark,
  initialMarkOverride,
  anchorPos,
  availableMarks = [],
  onClose,
  onApply,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [mark, setMark] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 240, y: 140 };
    return {
      x: Math.max(12, Math.round((window.innerWidth - 332) / 2)),
      y: Math.max(12, Math.round((window.innerHeight - 236) / 2)),
    };
  });

  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  useEffect(() => {
    if (!target || !node) return;
    let currentMark = '';
    if (initialMarkOverride !== undefined) {
      currentMark = initialMarkOverride;
    } else if (isDirectionalValveType(node.type)) {
      const cfg = getEffectiveValveConfig(node);
      currentMark =
        target.side === 'left'
          ? cfg.leftActuation.mark ?? node.params.sensingMark ?? ''
          : cfg.rightActuation.mark ?? node.params.secondaryMark ?? '';
    } else {
      currentMark =
        target.side === 'left'
          ? node.params.sensingMark ?? ''
          : node.params.secondaryMark ?? '';
    }
    setMark(currentMark);
    setShowHelp(false);

    if (typeof window !== 'undefined') {
      const dlgW = Math.min(332, window.innerWidth - 24);
      const dlgH = Math.min(236, window.innerHeight - 24);
      if (anchorPos) {
        const preferredX = anchorPos.x + 18;
        const preferredY = anchorPos.y - 36;
        const clampedX = Math.min(
          Math.max(12, preferredX),
          Math.max(12, window.innerWidth - dlgW - 12)
        );
        const clampedY = Math.min(
          Math.max(12, preferredY),
          Math.max(12, window.innerHeight - dlgH - 12)
        );
        setPos({ x: Math.round(clampedX), y: Math.round(clampedY) });
      } else {
        setPos({
          x: Math.max(12, Math.round((window.innerWidth - dlgW) / 2)),
          y: Math.max(12, Math.round((window.innerHeight - dlgH) / 2)),
        });
      }
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 30);
    return () => window.clearTimeout(timer);
  }, [target, node, initialMarkOverride, anchorPos]);

  if (!target || !node) return null;

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
    const w = panelRef.current?.offsetWidth ?? 332;
    const h = panelRef.current?.offsetHeight ?? 236;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canEdit) {
      onApply(node.id, target.side, mark.trim());
    }
    onClose();
  };

  const inputCls = isDark
    ? 'bg-slate-950 border-sky-500 text-slate-100 focus:border-sky-400'
    : 'bg-white border-sky-600 text-slate-900 focus:border-sky-700';
  const btnCls = isDark
    ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-100'
    : 'bg-[#E1E1E1] hover:bg-[#D5E1F2] border-[#ADADAD] text-slate-900';

  const circuitText =
    fluid === 'pneumatic' ? 'do circuito pneumático:' : 'do circuito hidráulico:';

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Conexão (mecânica)"
      data-testid="mechanical-connection-dialog"
      style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
      className={`fixed top-0 left-0 z-[70] w-[min(332px,calc(100vw-20px))] border shadow-2xl text-xs select-none ${
        isDark
          ? 'bg-slate-900 border-slate-700 text-slate-100'
          : 'bg-[#F0F0F0] border-[#888888] text-slate-900'
      }`}
    >
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
          <span className="truncate font-normal text-[12.5px]">Conexão (mecânica)</span>
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

      <form onSubmit={handleSubmit} className="p-3.5 space-y-3.5">
        {/* Marca row */}
        <div className="grid grid-cols-[120px_1fr] items-center gap-2">
          <label htmlFor="mech-connection-mark" className="text-right pr-1">
            Marca
          </label>
          <input
            ref={inputRef}
            id="mech-connection-mark"
            type="text"
            list={availableMarks.length > 0 ? 'mech-connection-marks' : undefined}
            disabled={!canEdit}
            placeholder="ex: 1S1"
            value={mark}
            onChange={(e) => setMark(e.target.value)}
            className={`w-full h-6 px-2 border outline-none font-mono ${inputCls}`}
          />
          {availableMarks.length > 0 && (
            <datalist id="mech-connection-marks">
              {availableMarks.map((mk) => (
                <option key={mk} value={mk} />
              ))}
            </datalist>
          )}
        </div>

        {/* Componente correspondente + Régua de distância preview */}
        <div className="grid grid-cols-[164px_1fr] items-center gap-3 pt-0.5">
          <div className="text-center leading-snug text-[11.5px]">
            <div>Componente correspondente</div>
            <div>{circuitText}</div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-[112px] h-[58px] border flex items-center justify-center ${
                isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-[#D0D0D0]'
              }`}
            >
              <DistanceRulePreviewSvg stroke={isDark ? '#E2E8F0' : '#0F172A'} />
            </div>
            <span className="text-[11.5px] text-center">Régua de distância</span>
          </div>
        </div>

        {showHelp && (
          <div
            className={`p-2 border text-[11px] leading-relaxed ${
              isDark
                ? 'bg-slate-950 border-slate-700 text-slate-300'
                : 'bg-sky-50 border-sky-200 text-slate-700'
            }`}
          >
            Informe a <strong>Marca</strong> (ex: <span className="font-mono">1S1</span>,{' '}
            <span className="font-mono">1S2</span>) correspondente à etiqueta configurada na{' '}
            <strong>Régua de distância</strong> / cilindro para que este acionador mecânico comute
            automaticamente quando o êmbolo atingir a posição programada.
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="submit"
            className={`min-w-[78px] h-6 px-3 border font-medium ${btnCls} ring-1 ring-sky-500/80`}
          >
            Aceitar
          </button>
          <button type="button" onClick={onClose} className={`min-w-[78px] h-6 px-3 border ${btnCls}`}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className={`min-w-[78px] h-6 px-3 border ${btnCls}`}
          >
            Ajuda
          </button>
        </div>
      </form>
    </div>
  );
};
