import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { formatTerminalTag, type AppOptions } from '../engine/appOptions';
import type { CircuitNode, SimulationState } from '../types/circuit';
import { COMPONENT_CATALOG } from '../engine/fluidSolver';

export type ActiveOptionsDialog =
  | 'simulation'
  | 'opc_dde'
  | 'sound'
  | 'didactic'
  | 'grid'
  | 'terminal'
  | null;

interface OptionsDialogsProps {
  activeDialog: ActiveOptionsDialog;
  options: AppOptions;
  nodes: CircuitNode[];
  simState: SimulationState;
  onClose: () => void;
  onApply: (next: AppOptions) => void;
  onOpenHelp: (topic: string) => void;
}

const SWATCH_PALETTE = [
  '#808000',
  '#800000',
  '#FF00FF',
  '#FF0000',
  '#008080',
  '#00FF00',
  '#0000FF',
  '#000080',
  '#D97706',
  '#0284C7',
  '#334155',
  '#000000',
];

const ColorComboSwatch: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
}> = ({ id, label, value, onChange }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="grid grid-cols-[1fr_92px] items-center gap-2 relative">
      <label htmlFor={id} className="text-right text-[11px] text-slate-800 dark:text-slate-200 leading-tight">
        {label}
      </label>
      <div className="relative">
        <button
          id={id}
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full h-6 px-1 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-600 rounded-[2px] flex items-center justify-between gap-1 hover:border-sky-600"
          aria-label={`${label}: ${value}`}
        >
          <span
            className="flex-1 h-4 border border-dotted border-slate-700/60"
            style={{ backgroundColor: value }}
          />
          <ChevronDown className="w-3 h-3 text-slate-600 dark:text-slate-300 shrink-0" />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-0.5 z-30 p-1.5 bg-white dark:bg-slate-900 border border-slate-400 dark:border-slate-700 shadow-lg rounded-sm w-36">
            <div className="grid grid-cols-4 gap-1 mb-1.5">
              {SWATCH_PALETTE.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  title={hex}
                  onClick={() => {
                    onChange(hex);
                    setOpen(false);
                  }}
                  className={`h-5 border ${
                    value.toUpperCase() === hex.toUpperCase()
                      ? 'border-sky-500 ring-1 ring-sky-500'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
            <label className="flex items-center justify-between gap-1 text-[10px] text-slate-600 dark:text-slate-300 cursor-pointer">
              <span>Personalizar:</span>
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-7 h-5 p-0 border-0 bg-transparent cursor-pointer"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

const SoundRowIcon: React.FC<{
  kind: 'switch' | 'relay' | 'valve' | 'cylinder' | 'buzzer';
}> = ({ kind }) => {
  switch (kind) {
    case 'switch':
      return (
        <svg viewBox="0 0 88 30" className="w-[82px] h-[28px] bg-white border border-slate-200 shrink-0">
          <g stroke="#0F172A" strokeWidth="1.2" fill="none">
            <line x1="16" y1="3" x2="16" y2="10" />
            <line x1="16" y1="20" x2="16" y2="27" />
            <line x1="16" y1="20" x2="11" y2="10" />
            <path d="M 7 15 L 13 15 M 7 12 L 7 18" />
            <line x1="42" y1="3" x2="42" y2="10" />
            <line x1="42" y1="20" x2="42" y2="27" />
            <polyline points="42,20 37,11 45,11" />
            <line x1="68" y1="3" x2="68" y2="10" />
            <line x1="68" y1="20" x2="68" y2="27" />
            <line x1="68" y1="20" x2="63" y2="10" />
            <polyline points="59,13 62,13 62,17 65,17" />
          </g>
        </svg>
      );
    case 'relay':
      return (
        <svg viewBox="0 0 88 30" className="w-[82px] h-[28px] bg-white border border-slate-200 shrink-0">
          <g stroke="#0F172A" strokeWidth="1.2" fill="none">
            <line x1="22" y1="2" x2="22" y2="9" />
            <rect x="10" y="9" width="24" height="12" />
            <line x1="22" y1="21" x2="22" y2="28" />
            <rect x="37" y="9" width="12" height="12" fill="#0F172A" />
            <line x1="64" y1="2" x2="64" y2="9" />
            <rect x="49" y="9" width="28" height="12" />
            <line x1="64" y1="21" x2="64" y2="28" />
          </g>
        </svg>
      );
    case 'valve':
      return (
        <svg viewBox="0 0 88 30" className="w-[82px] h-[28px] bg-white border border-slate-200 shrink-0">
          <g stroke="#0F172A" strokeWidth="1.15" fill="none">
            <rect x="11" y="15" width="12" height="9" />
            <line x1="11" y1="24" x2="23" y2="15" />
            <rect x="23" y="7" width="18" height="17" />
            <rect x="41" y="7" width="18" height="17" />
            <line x1="32" y1="24" x2="32" y2="9" />
            <polygon points="32,7 29.5,12 34.5,12" fill="#0F172A" stroke="none" />
            <line x1="47" y1="24" x2="47" y2="17" />
            <line x1="44" y1="17" x2="50" y2="17" />
            <line x1="53" y1="7" x2="53" y2="24" />
            <polygon points="53,24 50.5,19 55.5,19" fill="#0F172A" stroke="none" />
            <polyline points="59,16 62,11 65,20 68,11 71,20 74,15" />
            <line x1="32" y1="2" x2="32" y2="7" />
            <line x1="53" y1="24" x2="53" y2="29" />
          </g>
        </svg>
      );
    case 'cylinder':
      return (
        <svg viewBox="0 0 88 30" className="w-[82px] h-[28px] bg-white border border-slate-200 shrink-0">
          <g stroke="#0F172A" strokeWidth="1.2" fill="none">
            <rect x="12" y="7" width="44" height="15" />
            <rect x="24" y="7" width="4" height="15" fill="#FFFFFF" />
            <rect x="28" y="13" width="44" height="3.5" fill="#E2E8F0" />
            <line x1="18" y1="22" x2="18" y2="28" />
            <line x1="49" y1="22" x2="49" y2="28" />
          </g>
        </svg>
      );
    case 'buzzer':
      return (
        <svg viewBox="0 0 88 30" className="w-[82px] h-[28px] bg-white border border-slate-200 shrink-0">
          <g stroke="#0F172A" strokeWidth="1.2" fill="none">
            <line x1="39" y1="4" x2="39" y2="26" />
            <line x1="39" y1="10" x2="33" y2="10" />
            <line x1="39" y1="20" x2="33" y2="20" />
            <polygon points="39,15 51,7 51,23" />
          </g>
        </svg>
      );
  }
};

export const OptionsDialogs: React.FC<OptionsDialogsProps> = ({
  activeDialog,
  options,
  nodes,
  simState,
  onClose,
  onApply,
  onOpenHelp,
}) => {
  const [draft, setDraft] = useState<AppOptions>(() => structuredClone(options));
  const [showTerminalPreview, setShowTerminalPreview] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  useEffect(() => {
    if (activeDialog) {
      setDraft(structuredClone(options));
      setShowTerminalPreview(false);
      setPos({
        x: Math.max(16, Math.round(window.innerWidth / 2 - 230)),
        y: Math.max(48, Math.round(window.innerHeight / 2 - 200)),
      });
    }
  }, [activeDialog, options]);

  if (!activeDialog) return null;

  const titleMap: Record<Exclude<ActiveOptionsDialog, null>, string> = {
    simulation: 'Opções - Simulação',
    opc_dde: 'Opções de OPC/DDE',
    sound: 'Opções - Som',
    didactic: 'Opções - Didática',
    grid: 'Opções - Grade',
    terminal: 'Opções - Diagrama de atribuição de terminais',
  };

  const widthClass =
    activeDialog === 'simulation'
      ? 'w-[min(560px,calc(100vw-24px))]'
      : activeDialog === 'opc_dde' || activeDialog === 'terminal'
        ? 'w-[min(410px,calc(100vw-24px))]'
        : 'w-[min(340px,calc(100vw-24px))]';

  const handleHeaderDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
  };

  const handleHeaderMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    setPos({
      x: Math.max(8, dragRef.current.origX + (e.clientX - dragRef.current.startX)),
      y: Math.max(8, dragRef.current.origY + (e.clientY - dragRef.current.startY)),
    });
  };

  const handleHeaderUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    dragRef.current = null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(draft);
    onClose();
  };

  const terminalRows = (() => {
    const rows: Array<{
      terminal: string;
      mark: string;
      label: string;
      kind: string;
      state: string;
    }> = [];
    let group = 1;
    let pin = 1;
    for (const n of nodes) {
      const rt = simState.nodes[n.id];
      const m1 = n.params.valveConfig?.leftActuation?.mark || n.params.sensingMark;
      const m2 = n.params.valveConfig?.rightActuation?.mark || n.params.secondaryMark;
      if (m1?.trim()) {
        rows.push({
          terminal: formatTerminalTag(group, pin, draft.terminalDiagram.naming),
          mark: m1.trim(),
          label: n.label,
          kind: COMPONENT_CATALOG[n.type].name,
          state: rt?.coilEnergized || rt?.isOpen || n.params.active ? 'Ativo' : 'Repouso',
        });
        pin += 1;
      }
      if (m2?.trim()) {
        rows.push({
          terminal: formatTerminalTag(group, pin, draft.terminalDiagram.naming),
          mark: m2.trim(),
          label: `${n.label} (Lado dir.)`,
          kind: COMPONENT_CATALOG[n.type].name,
          state: rt?.activeSpoolPos === 2 ? 'Ativo' : 'Repouso',
        });
        pin += 1;
      }
      if (pin > 4 && draft.terminalDiagram.optimize === 'clear') {
        group += 1;
        pin = 1;
      }
    }
    return rows;
  })();

  const fieldsetCls =
    'border border-slate-300 dark:border-slate-700 rounded-[2px] px-3 pt-2 pb-3 space-y-2';
  const legendCls = 'px-1 text-[11px] font-normal text-slate-800 dark:text-slate-200';
  const winBtnCls =
    'min-w-[78px] h-7 px-3 rounded-[2px] border border-slate-400 dark:border-slate-600 bg-[#E1E1E1] dark:bg-slate-800 hover:bg-[#E5F1FB] dark:hover:bg-slate-700 text-xs text-slate-900 dark:text-slate-100';

  return (
    <div className="fixed inset-0 z-[140] pointer-events-none">
      <form
        role="dialog"
        aria-label={titleMap[activeDialog]}
        data-testid={`options-dialog-${activeDialog}`}
        onSubmit={handleSubmit}
        style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
        className={`pointer-events-auto fixed top-0 left-0 ${widthClass} max-h-[calc(100vh-32px)] flex flex-col rounded-[3px] border border-slate-500 dark:border-slate-700 bg-[#F0F0F0] dark:bg-slate-900 shadow-2xl text-xs text-slate-900 dark:text-slate-100`}
      >
        {/* Classic Draggable Window Title Bar */}
        <div
          onPointerDown={handleHeaderDown}
          onPointerMove={handleHeaderMove}
          onPointerUp={handleHeaderUp}
          className="h-8 shrink-0 px-3 bg-white dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between cursor-move select-none touch-none"
        >
          <span className="font-normal text-[12px] truncate">{titleMap[activeDialog]}</span>
          <button
            type="button"
            aria-label={`Fechar ${titleMap[activeDialog]}`}
            onClick={onClose}
            className="p-1 rounded hover:bg-red-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3.5 overflow-y-auto space-y-3">
          {/* 1. Opções - Simulação */}
          {activeDialog === 'simulation' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                {/* Left Column: Cor da linha */}
                <fieldset className={fieldsetCls}>
                  <legend className={legendCls}>Cor da linha</legend>
                  <div className="space-y-2 pt-0.5">
                    <ColorComboSwatch
                      id="sim-color-none"
                      label="Sem pressão"
                      value={draft.simulation.lineColors.noPressure}
                      onChange={(v) =>
                        setDraft((d) => ({
                          ...d,
                          simulation: {
                            ...d.simulation,
                            lineColors: { ...d.simulation.lineColors, noPressure: v },
                          },
                        }))
                      }
                    />
                    <ColorComboSwatch
                      id="sim-color-pressure"
                      label="Transmissor de pressão"
                      value={draft.simulation.lineColors.pressureTransmitter}
                      onChange={(v) =>
                        setDraft((d) => ({
                          ...d,
                          simulation: {
                            ...d.simulation,
                            lineColors: { ...d.simulation.lineColors, pressureTransmitter: v },
                          },
                        }))
                      }
                    />
                    <ColorComboSwatch
                      id="sim-color-vapor"
                      label="Pressão de vapor"
                      value={draft.simulation.lineColors.vaporPressure}
                      onChange={(v) =>
                        setDraft((d) => ({
                          ...d,
                          simulation: {
                            ...d.simulation,
                            lineColors: { ...d.simulation.lineColors, vaporPressure: v },
                          },
                        }))
                      }
                    />
                    <ColorComboSwatch
                      id="sim-color-current"
                      label="Transmissor de corrente"
                      value={draft.simulation.lineColors.currentTransmitter}
                      onChange={(v) =>
                        setDraft((d) => ({
                          ...d,
                          simulation: {
                            ...d.simulation,
                            lineColors: { ...d.simulation.lineColors, currentTransmitter: v },
                          },
                        }))
                      }
                    />
                    <ColorComboSwatch
                      id="sim-color-lo"
                      label="Estado digital Lo (baixo)"
                      value={draft.simulation.lineColors.digitalLo}
                      onChange={(v) =>
                        setDraft((d) => ({
                          ...d,
                          simulation: {
                            ...d.simulation,
                            lineColors: { ...d.simulation.lineColors, digitalLo: v },
                          },
                        }))
                      }
                    />
                    <ColorComboSwatch
                      id="sim-color-hi"
                      label="Estado digital Hi (alto)"
                      value={draft.simulation.lineColors.digitalHi}
                      onChange={(v) =>
                        setDraft((d) => ({
                          ...d,
                          simulation: {
                            ...d.simulation,
                            lineColors: { ...d.simulation.lineColors, digitalHi: v },
                          },
                        }))
                      }
                    />
                  </div>
                </fieldset>

                {/* Right Column: Velocidade + Designação de etiquetas */}
                <div className="flex flex-col gap-3">
                  <fieldset className={fieldsetCls}>
                    <legend className={legendCls}>Velocidade de simulação</legend>
                    <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                      <input
                        type="radio"
                        name="sim-speed-mode"
                        checked={draft.simulation.speedMode === 'realtime'}
                        onChange={() =>
                          setDraft((d) => ({
                            ...d,
                            simulation: { ...d.simulation, speedMode: 'realtime' },
                          }))
                        }
                      />
                      <span>Manter tempo real</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                      <input
                        type="radio"
                        name="sim-speed-mode"
                        checked={draft.simulation.speedMode === 'continuous'}
                        onChange={() =>
                          setDraft((d) => ({
                            ...d,
                            simulation: { ...d.simulation, speedMode: 'continuous' },
                          }))
                        }
                      />
                      <span>Contínuo</span>
                    </label>
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="sim-speed-mode"
                          checked={draft.simulation.speedMode === 'slow_motion'}
                          onChange={() =>
                            setDraft((d) => ({
                              ...d,
                              simulation: { ...d.simulation, speedMode: 'slow_motion' },
                            }))
                          }
                        />
                        <span>Fator de desaceleração</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <span>1 :</span>
                        <input
                          type="number"
                          aria-label="Fator de desaceleração"
                          min={1}
                          max={100}
                          disabled={draft.simulation.speedMode !== 'slow_motion'}
                          value={draft.simulation.slowMotionFactor}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              simulation: {
                                ...d.simulation,
                                slowMotionFactor: Math.max(1, Number(e.target.value) || 1),
                              },
                            }))
                          }
                          className="w-14 h-6 px-1.5 border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 disabled:bg-slate-200 dark:disabled:bg-slate-800/40 disabled:text-slate-400 font-mono text-[11px]"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className={fieldsetCls}>
                    <legend className={legendCls}>Designação de etiquetas</legend>
                    <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                      <input
                        type="checkbox"
                        checked={draft.simulation.showLabelCase}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            simulation: { ...d.simulation, showLabelCase: e.target.checked },
                          }))
                        }
                      />
                      <span>Mostrar maiúsculas e minúsculas</span>
                    </label>
                    <label
                      className={`flex items-center gap-2 pl-5 text-[11px] ${
                        draft.simulation.showLabelCase ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={!draft.simulation.showLabelCase}
                        checked={draft.simulation.caseSensitiveLabels}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            simulation: { ...d.simulation, caseSensitiveLabels: e.target.checked },
                          }))
                        }
                      />
                      <span>Distinguir maiúsculas e minúsculas</span>
                    </label>
                  </fieldset>
                </div>
              </div>

              {/* Bottom Full Width: Técnica digital */}
              <fieldset className={fieldsetCls}>
                <legend className={legendCls}>
                  Técnica digital (Compatibilidade com Siemens LOGO!Soft)
                </legend>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={draft.simulation.digitalOpenInputsHi}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        simulation: { ...d.simulation, digitalOpenInputsHi: e.target.checked },
                      }))
                    }
                  />
                  <span>
                    Colocar automaticamente entradas digitais abertas de AND, NAND e NOT em Hi
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={draft.simulation.digitalOpenInputsWarning}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        simulation: { ...d.simulation, digitalOpenInputsWarning: e.target.checked },
                      }))
                    }
                  />
                  <span>Mostrar aviso nas entradas digitais abertas</span>
                </label>
              </fieldset>
            </>
          )}

          {/* 2. Opções de OPC/DDE */}
          {activeDialog === 'opc_dde' && (
            <fieldset className={fieldsetCls}>
              <legend className={legendCls}>Propriedades da comunicação</legend>

              <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                <input
                  type="radio"
                  name="opc-mode"
                  checked={draft.opcDde.mode === 'none'}
                  onChange={() => setDraft((d) => ({ ...d, opcDde: { ...d.opcDde, mode: 'none' } }))}
                />
                <span>Não desbloquear a comunicação externa</span>
              </label>

              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="radio"
                    name="opc-mode"
                    checked={draft.opcDde.mode === 'easyport'}
                    onChange={() =>
                      setDraft((d) => ({ ...d, opcDde: { ...d.opcDde, mode: 'easyport' } }))
                    }
                  />
                  <span>Conexão EasyPort direta</span>
                </label>
                <div
                  className={`ml-6 p-2.5 border border-slate-300 dark:border-slate-700 space-y-1.5 text-[11px] ${
                    draft.opcDde.mode !== 'easyport' ? 'opacity-50' : ''
                  }`}
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={draft.opcDde.mode !== 'easyport'}
                      checked={draft.opcDde.easyPortBufferEvents}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          opcDde: { ...d.opcDde, easyPortBufferEvents: e.target.checked },
                        }))
                      }
                    />
                    <span>Habilitar buffer de eventos</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={draft.opcDde.mode !== 'easyport'}
                      checked={draft.opcDde.easyPortSyncIO}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          opcDde: { ...d.opcDde, easyPortSyncIO: e.target.checked },
                        }))
                      }
                    />
                    <span>Sincronizar entradas e saídas</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="radio"
                    name="opc-mode"
                    checked={draft.opcDde.mode === 'opc'}
                    onChange={() => setDraft((d) => ({ ...d, opcDde: { ...d.opcDde, mode: 'opc' } }))}
                  />
                  <span>Modo OPC</span>
                </label>
                <div
                  className={`ml-6 p-2.5 border border-slate-300 dark:border-slate-700 text-[11px] ${
                    draft.opcDde.mode !== 'opc' ? 'opacity-50' : ''
                  }`}
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={draft.opcDde.mode !== 'opc'}
                      checked={draft.opcDde.opcBufferEvents}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          opcDde: { ...d.opcDde, opcBufferEvents: e.target.checked },
                        }))
                      }
                    />
                    <span>Habilitar buffer de eventos</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="radio"
                    name="opc-mode"
                    checked={draft.opcDde.mode === 'dde'}
                    onChange={() => setDraft((d) => ({ ...d, opcDde: { ...d.opcDde, mode: 'dde' } }))}
                  />
                  <span>Modo DDE</span>
                </label>
                <div
                  className={`ml-6 p-2.5 border border-slate-300 dark:border-slate-700 space-y-2 text-[11px] ${
                    draft.opcDde.mode !== 'dde' ? 'opacity-50' : ''
                  }`}
                >
                  <div className="grid grid-cols-[64px_1fr] items-center gap-2">
                    <label htmlFor="dde-server" className="text-right">
                      Servidor
                    </label>
                    <input
                      id="dde-server"
                      type="text"
                      disabled={draft.opcDde.mode !== 'dde'}
                      value={draft.opcDde.ddeServer}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          opcDde: { ...d.opcDde, ddeServer: e.target.value },
                        }))
                      }
                      className="h-6 px-2 border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 disabled:bg-slate-100 dark:disabled:bg-slate-800/40"
                    />
                  </div>
                  <div className="grid grid-cols-[64px_1fr] items-center gap-2">
                    <label htmlFor="dde-topic" className="text-right">
                      Tema
                    </label>
                    <input
                      id="dde-topic"
                      type="text"
                      disabled={draft.opcDde.mode !== 'dde'}
                      value={draft.opcDde.ddeTopic}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          opcDde: { ...d.opcDde, ddeTopic: e.target.value },
                        }))
                      }
                      className="h-6 px-2 border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 disabled:bg-slate-100 dark:disabled:bg-slate-800/40"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={draft.opcDde.mode !== 'dde'}
                      checked={draft.opcDde.ddeFpcAddressing}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          opcDde: { ...d.opcDde, ddeFpcAddressing: e.target.checked },
                        }))
                      }
                    />
                    <span>Modo de endereçamento FPC</span>
                  </label>
                </div>
              </div>
            </fieldset>
          )}

          {/* 3. Opções - Som */}
          {activeDialog === 'sound' && (
            <fieldset className={fieldsetCls}>
              <legend className={legendCls}>Ativar som</legend>
              <div className="space-y-2.5 pt-1">
                {(
                  [
                    { key: 'switchSound', label: 'Interruptor', kind: 'switch' },
                    { key: 'relaySound', label: 'Relé', kind: 'relay' },
                    { key: 'valveSound', label: 'Válvula', kind: 'valve' },
                    { key: 'cylinderSound', label: 'Cilindro', kind: 'cylinder' },
                    { key: 'buzzerSound', label: 'Indicador acústico', kind: 'buzzer' },
                  ] as const
                ).map((row) => (
                  <label key={row.key} className="flex items-center gap-3 cursor-pointer text-[11px]">
                    <SoundRowIcon kind={row.kind} />
                    <input
                      type="checkbox"
                      checked={draft.sound[row.key]}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          sound: { ...d.sound, [row.key]: e.target.checked },
                        }))
                      }
                    />
                    <span>{row.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {/* 4. Opções - Didática */}
          {activeDialog === 'didactic' && (
            <>
              <fieldset className={fieldsetCls}>
                <legend className={legendCls}>Velocidade da animação</legend>
                <div className="px-4 pt-2 pb-1 space-y-1.5">
                  <input
                    type="range"
                    aria-label="Velocidade da animação"
                    min={1}
                    max={5}
                    step={1}
                    value={draft.didactic.animationSpeed}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        didactic: { ...d.didactic, animationSpeed: Number(e.target.value) },
                      }))
                    }
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                  <div className="flex justify-between px-1 text-[10px] text-slate-400">
                    <span>|</span>
                    <span>|</span>
                    <span>|</span>
                    <span>|</span>
                    <span>|</span>
                  </div>
                  <div className="flex justify-between text-[11px] px-1">
                    <span>Lenta</span>
                    <span>Rápida</span>
                  </div>
                </div>
              </fieldset>

              <fieldset className={fieldsetCls}>
                <legend className={legendCls}>Apresentação contínua</legend>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="radio"
                    name="didactic-pres-mode"
                    checked={draft.didactic.presentationMode === 'manual'}
                    onChange={() =>
                      setDraft((d) => ({
                        ...d,
                        didactic: { ...d.didactic, presentationMode: 'manual' },
                      }))
                    }
                  />
                  <span>Manualmente</span>
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="didactic-pres-mode"
                      checked={draft.didactic.presentationMode === 'auto'}
                      onChange={() =>
                        setDraft((d) => ({
                          ...d,
                          didactic: { ...d.didactic, presentationMode: 'auto' },
                        }))
                      }
                    />
                    <span>Automaticamente após</span>
                  </label>
                  <input
                    type="number"
                    aria-label="Segundos para apresentação automática"
                    min={1}
                    max={120}
                    value={draft.didactic.autoDelaySeconds}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        didactic: {
                          ...d.didactic,
                          autoDelaySeconds: Math.max(1, Number(e.target.value) || 1),
                        },
                      }))
                    }
                    className="w-11 h-6 px-1.5 text-right border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
                  />
                  <span>Segundos</span>
                </div>
              </fieldset>

              <div className="flex justify-center pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={draft.didactic.infiniteRepeat}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        didactic: { ...d.didactic, infiniteRepeat: e.target.checked },
                      }))
                    }
                  />
                  <span>Repetição infinita</span>
                </label>
              </div>
            </>
          )}

          {/* 5. Opções - Grade */}
          {activeDialog === 'grid' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <fieldset className={fieldsetCls}>
                  <legend className={legendCls}>Largura</legend>
                  {(
                    [
                      { value: 'coarse', label: 'Grosso' },
                      { value: 'medium', label: 'Médio' },
                      { value: 'fine', label: 'Fino' },
                    ] as const
                  ).map((item) => (
                    <label key={item.value} className="flex items-center gap-2 cursor-pointer text-[11px]">
                      <input
                        type="radio"
                        name="grid-width"
                        checked={draft.grid.width === item.value}
                        onChange={() =>
                          setDraft((d) => ({
                            ...d,
                            grid: { ...d.grid, width: item.value },
                          }))
                        }
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </fieldset>

                <fieldset className={fieldsetCls}>
                  <legend className={legendCls}>Estilo</legend>
                  {(
                    [
                      { value: 'dot', label: 'Ponto' },
                      { value: 'cross', label: 'Cruz' },
                      { value: 'line', label: 'Linha' },
                    ] as const
                  ).map((item) => (
                    <label key={item.value} className="flex items-center gap-2 cursor-pointer text-[11px]">
                      <input
                        type="radio"
                        name="grid-style"
                        checked={draft.grid.style === item.value}
                        onChange={() =>
                          setDraft((d) => ({
                            ...d,
                            grid: { ...d.grid, style: item.value },
                          }))
                        }
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </fieldset>
              </div>

              <div className="flex justify-center pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={draft.grid.showGrid}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        grid: { ...d.grid, showGrid: e.target.checked },
                      }))
                    }
                  />
                  <span>Mostrar grade</span>
                </label>
              </div>
            </>
          )}

          {/* 6. Opções - Diagrama de atribuição de terminais */}
          {activeDialog === 'terminal' && (
            <>
              <fieldset className={fieldsetCls}>
                <legend className={legendCls}>Otimizar</legend>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="radio"
                    name="term-opt"
                    checked={draft.terminalDiagram.optimize === 'clear'}
                    onChange={() =>
                      setDraft((d) => ({
                        ...d,
                        terminalDiagram: { ...d.terminalDiagram, optimize: 'clear' },
                      }))
                    }
                  />
                  <span>Dispor terminais claramente</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="radio"
                    name="term-opt"
                    checked={draft.terminalDiagram.optimize === 'reduce'}
                    onChange={() =>
                      setDraft((d) => ({
                        ...d,
                        terminalDiagram: { ...d.terminalDiagram, optimize: 'reduce' },
                      }))
                    }
                  />
                  <span>Reduzir o número de terminais</span>
                </label>
              </fieldset>

              <fieldset className={fieldsetCls}>
                <legend className={legendCls}>Cabeamento</legend>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="radio"
                    name="term-wire"
                    checked={draft.terminalDiagram.wiring === 'logical'}
                    onChange={() =>
                      setDraft((d) => ({
                        ...d,
                        terminalDiagram: { ...d.terminalDiagram, wiring: 'logical' },
                      }))
                    }
                  />
                  <span>Ordem lógica</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="radio"
                    name="term-wire"
                    checked={draft.terminalDiagram.wiring === 'bridges'}
                    onChange={() =>
                      setDraft((d) => ({
                        ...d,
                        terminalDiagram: { ...d.terminalDiagram, wiring: 'bridges' },
                      }))
                    }
                  />
                  <span>Preferência de pontes</span>
                </label>
              </fieldset>

              <fieldset className={fieldsetCls}>
                <legend className={legendCls}>Denominação dos terminais</legend>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="radio"
                    name="term-naming"
                    checked={draft.terminalDiagram.naming === 'x_dash'}
                    onChange={() =>
                      setDraft((d) => ({
                        ...d,
                        terminalDiagram: { ...d.terminalDiagram, naming: 'x_dash' },
                      }))
                    }
                  />
                  <span>X1-1, X1-2, X2-1, ...</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="radio"
                    name="term-naming"
                    checked={draft.terminalDiagram.naming === 'prefix_x'}
                    onChange={() =>
                      setDraft((d) => ({
                        ...d,
                        terminalDiagram: { ...d.terminalDiagram, naming: 'prefix_x' },
                      }))
                    }
                  />
                  <span>1X1, 1X2, 2X1, ...</span>
                </label>
              </fieldset>

              <div>
                <button
                  type="button"
                  onClick={() => setShowTerminalPreview((v) => !v)}
                  className="text-[11px] text-sky-700 dark:text-sky-400 hover:underline font-medium"
                >
                  {showTerminalPreview
                    ? 'Ocultar tabela de bornes e marcas do circuito'
                    : `Ver bornes e marcas atribuídas (${terminalRows.length})`}
                </button>
                {showTerminalPreview && (
                  <div className="mt-2 max-h-36 overflow-y-auto border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-[2px]">
                    {terminalRows.length === 0 ? (
                      <p className="p-2.5 text-[11px] text-slate-500 text-center">
                        Nenhuma marca atribuída no diagrama atual (ex.: Y1, K1).
                      </p>
                    ) : (
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700">
                            <th className="py-1 px-2">Terminal</th>
                            <th className="py-1 px-2">Marca</th>
                            <th className="py-1 px-2">Componente</th>
                            <th className="py-1 px-2">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {terminalRows.map((r, i) => (
                            <tr key={`${r.terminal}-${i}`} className="border-b border-slate-200 dark:border-slate-800">
                              <td className="py-1 px-2 font-mono">{r.terminal}</td>
                              <td className="py-1 px-2 font-mono font-semibold text-sky-600">{r.mark}</td>
                              <td className="py-1 px-2 truncate max-w-[130px]">{r.label}</td>
                              <td className="py-1 px-2">{r.state}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Buttons: Aceitar / Cancelar / Ajuda */}
        <div className="px-3.5 pb-3 pt-1 flex items-center justify-center gap-2.5">
          <button
            type="submit"
            className={`${winBtnCls} border-sky-600 ring-1 ring-sky-600/40 font-medium`}
          >
            Aceitar
          </button>
          <button type="button" onClick={onClose} className={winBtnCls}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onOpenHelp(activeDialog)}
            className={winBtnCls}
          >
            Ajuda
          </button>
        </div>
      </form>
    </div>
  );
};
