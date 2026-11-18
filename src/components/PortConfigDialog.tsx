import React, { useEffect, useRef, useState } from 'react';
import { GripHorizontal, X } from 'lucide-react';
import { COMPONENT_CATALOG } from '../engine/fluidSolver';
import type { CircuitNode, FluidMedium, PortConfig, PortSpec } from '../types/circuit';

interface PortConfigDialogProps {
  node: CircuitNode | null;
  port: PortSpec | null;
  fluid: FluidMedium;
  canEdit: boolean;
  isDark: boolean;
  onClose: () => void;
  onApply: (nodeId: string, portId: string, config: PortConfig) => void;
}

export const PortConfigDialog: React.FC<PortConfigDialogProps> = ({
  node,
  port,
  fluid,
  canEdit,
  isDark,
  onClose,
  onApply,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [designation, setDesignation] = useState('');
  const [showPressure, setShowPressure] = useState(false);
  const [showFlow, setShowFlow] = useState(false);
  const [blindPlug, setBlindPlug] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 240, y: 140 };
    return {
      x: Math.max(12, Math.round((window.innerWidth - 310) / 2)),
      y: Math.max(12, Math.round((window.innerHeight - 250) / 2)),
    };
  });

  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  useEffect(() => {
    if (!node || !port) return;
    const cfg = node.params.portConfigs?.[port.id];
    setDesignation(cfg?.designation ?? '');
    setShowPressure(Boolean(cfg?.showPressure));
    setShowFlow(Boolean(cfg?.showFlow));
    setBlindPlug(Boolean(cfg?.blindPlug));
    setShowHelp(false);

    if (typeof window !== 'undefined') {
      const dlgW = Math.min(310, window.innerWidth - 24);
      const dlgH = Math.min(260, window.innerHeight - 24);
      setPos({
        x: Math.max(12, Math.round((window.innerWidth - dlgW) / 2)),
        y: Math.max(12, Math.round((window.innerHeight - dlgH) / 2)),
      });
    }
  }, [node, port]);

  if (!node || !port) return null;

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
    const w = panelRef.current?.offsetWidth ?? 310;
    const h = panelRef.current?.offsetHeight ?? 240;
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
      onApply(node.id, port.id, {
        designation: designation.trim() || undefined,
        showPressure,
        showFlow,
        blindPlug,
      });
    }
    onClose();
  };

  const cat = COMPONENT_CATALOG[node.type]?.category;
  const isElectrical = cat === 'electrical' || cat === 'digital' || cat === 'easyport';
  const title = isElectrical
    ? 'Conexão (elétrica)'
    : fluid === 'pneumatic'
      ? 'Conexão (pneumática)'
      : 'Conexão (hidráulica)';
  const firstValueLabel = isElectrical ? 'Tensão [V]' : 'Pressão [MPa]';
  const secondValueLabel = isElectrical ? 'Corrente [A]' : 'Fluxo [l/min]';
  const inputCls = isDark
    ? 'bg-slate-950 border-slate-600 text-slate-100 focus:border-sky-500'
    : 'bg-white border-sky-600/80 text-slate-900 focus:border-sky-700';
  const btnCls = isDark
    ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-100'
    : 'bg-[#E1E1E1] hover:bg-[#D5E1F2] border-[#ADADAD] text-slate-900';

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={title}
      data-testid="port-config-dialog"
      style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
      className={`fixed top-0 left-0 z-50 w-[min(310px,calc(100vw-20px))] border shadow-2xl text-xs select-none ${
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

      <form onSubmit={handleSubmit} className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <label htmlFor="port-designation" className="shrink-0">
            Denominação da conexão
          </label>
          <input
            id="port-designation"
            type="text"
            disabled={!canEdit}
            placeholder={port.label}
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            className={`flex-1 min-w-0 h-6 px-1.5 border outline-none ${inputCls}`}
          />
        </div>

        <fieldset className={`border p-2.5 space-y-1.5 ${isDark ? 'border-slate-700' : 'border-[#D0D0D0]'}`}>
          <legend className="px-1 text-[11.5px]">Mostrar valores</legend>
          <label className="flex items-center gap-2 pl-4 cursor-pointer">
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={showPressure}
              onChange={(e) => setShowPressure(e.target.checked)}
            />
            <span>{firstValueLabel}</span>
          </label>
          <label className="flex items-center gap-2 pl-4 cursor-pointer">
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={showFlow}
              onChange={(e) => setShowFlow(e.target.checked)}
            />
            <span>{secondValueLabel}</span>
          </label>
        </fieldset>

        <div className="flex justify-center">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={blindPlug}
              onChange={(e) => setBlindPlug(e.target.checked)}
            />
            <span>Tampão cego</span>
          </label>
        </div>

        {showHelp && (
          <div
            className={`p-2 border text-[11px] leading-relaxed ${
              isDark
                ? 'bg-slate-950 border-slate-700 text-slate-300'
                : 'bg-sky-50 border-sky-200 text-slate-700'
            }`}
          >
            Configure a denominação exibida na conexão, ative leituras ao vivo de {firstValueLabel} e {secondValueLabel}, ou marque Tampão cego para bloquear fisicamente a passagem nesta porta.
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
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
