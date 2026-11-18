import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, GripHorizontal, HelpCircle, X } from 'lucide-react';
import {
  getEffectiveValveConfig,
  hasConfiguredActuatorSide,
  isDirectionalValveType,
} from '../engine/fluidSolver';
import type {
  CircuitNode,
  ComponentParams,
  ValveActuationSide,
  ValveChamberPattern,
  ValveConfig,
  ValveElecActuation,
  ValveManualActuation,
  ValveMechActuation,
} from '../types/circuit';
import {
  CHAMBER_PATTERN_LABELS,
  DirectionalValveSymbol,
  ValveActuationSvg,
  ValveChamberPatternSvg,
} from './ValveIsoRenderer';

interface ValveConfigDialogProps {
  node: CircuitNode | null;
  canEdit: boolean;
  isDark: boolean;
  onClose: () => void;
  onApply: (nodeId: string, label: string, params: Partial<ComponentParams>) => void;
  onOpenMechanicalConnection?: (
    side: 'left' | 'right',
    currentMark: string,
    applyMarkToDraft: (mark: string) => void
  ) => void;
}

const MANUAL_OPTIONS: Array<{ value: ValveManualActuation; label: string }> = [
  { value: '', label: '(Nenhum)' },
  { value: 'manual_general', label: 'Acionamento manual' },
  { value: 'manual_detent', label: 'Acionamento manual com trava' },
  { value: 'button', label: 'Botão pulsador' },
  { value: 'button_detent', label: 'Botão pulsador com trava' },
  { value: 'lever', label: 'Alavanca manual' },
  { value: 'detent_lever', label: 'Alavanca com trava' },
  { value: 'pedal', label: 'Pedal' },
  { value: 'pedal_detent', label: 'Pedal com trava' },
];

const MECH_OPTIONS: Array<{ value: ValveMechActuation; label: string }> = [
  { value: '', label: '(Nenhum)' },
  { value: 'plunger', label: 'Apalpador (Came)' },
  { value: 'roller', label: 'Rolete mecânico' },
  { value: 'idle_roller', label: 'Rolete escamoteável (avanço)' },
  { value: 'idle_roller_rev', label: 'Rolete escamoteável (retorno)' },
  { value: 'limit_sensor', label: 'Sensor fim de curso' },
  { value: 'proximity_sensor', label: 'Sensor de proximidade' },
];

const ELEC_OPTIONS: Array<{ value: ValveElecActuation; label: string }> = [
  { value: '', label: '(Nenhum)' },
  { value: 'solenoid', label: 'Solenoide elétrico' },
  { value: 'hydraulic_pilot', label: 'Piloto hidráulico' },
  { value: 'hydraulic_pilot_solenoid', label: 'Piloto hidráulico com solenoide' },
];

interface SymbolDropdownOption<T extends string> {
  value: T;
  label: string;
}

interface SymbolDropdownProps<T extends string> {
  ariaLabel: string;
  value: T;
  disabled?: boolean;
  options: Array<SymbolDropdownOption<T>>;
  onChange: (value: T) => void;
  renderSymbol: (value: T) => React.ReactNode;
  buttonHeightClass?: string;
  optionHeightClass?: string;
}

function SymbolDropdown<T extends string>({
  ariaLabel,
  value,
  disabled = false,
  options,
  onChange,
  renderSymbol,
  buttonHeightClass = 'h-8',
  optionHeightClass = 'h-8',
}: SymbolDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  }>({ top: 0, left: 0, width: 76, maxHeight: 340 });

  const updateMenuPosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const desiredH = Math.min(580, options.length * 32 + 6);
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(580, openUp ? spaceAbove : spaceBelow));
    const actualH = Math.min(desiredH, maxHeight);
    const top = openUp
      ? Math.max(8, rect.top - actualH - 1)
      : Math.min(window.innerHeight - actualH - 8, rect.bottom + 1);
    const width = Math.max(rect.width, 64);
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    setMenuPos({ top, left, width, maxHeight });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (ev: MouseEvent) => {
      const target = ev.target as Node | null;
      if (
        target &&
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const handleReposition = () => updateMenuPosition();
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open]);

  const activeOpt = options.find((o) => o.value === value);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={activeOpt?.label || ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={`w-full ${buttonHeightClass} flex items-stretch rounded-sm border bg-white dark:bg-slate-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          open
            ? 'border-sky-600 ring-1 ring-sky-500'
            : 'border-slate-400/80 dark:border-slate-700 hover:border-sky-500'
        }`}
      >
        <span className="flex-1 min-w-0 flex items-center justify-center px-1 overflow-hidden">
          {renderSymbol(value)}
        </span>
        <span
          className={`w-5 shrink-0 flex items-center justify-center border-l ${
            open
              ? 'bg-[#CCE0F5] dark:bg-sky-900/60 border-sky-500 text-slate-800 dark:text-slate-100'
              : 'bg-[#E5F1FB] dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          <ChevronDown className="w-3 h-3" />
        </span>
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              position: 'fixed',
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              maxHeight: menuPos.maxHeight,
            }}
            className="z-[90] overflow-y-auto border border-sky-600 dark:border-sky-500 bg-white dark:bg-slate-900 shadow-xl py-0.5"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value || '__empty__'}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  aria-label={opt.label}
                  title={opt.label}
                  data-value={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={`w-full ${optionHeightClass} flex items-center justify-center px-1.5 border border-transparent transition-colors ${
                    isSelected
                      ? 'bg-sky-100/90 dark:bg-sky-900/60 border-dotted border-slate-700 dark:border-sky-300'
                      : 'hover:bg-sky-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {renderSymbol(opt.value)}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}

const DEFAULT_EMPTY_VALVE_CFG = getEffectiveValveConfig({
  id: 'tmp',
  type: 'valve_4_2',
  label: '',
  x: 0,
  y: 0,
  rotation: 0,
  params: {},
});

export const ValveConfigDialog: React.FC<ValveConfigDialogProps> = ({
  node,
  canEdit,
  isDark,
  onClose,
  onApply,
  onOpenMechanicalConnection,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [label, setLabel] = useState('');
  const [cfg, setCfg] = useState<ValveConfig>(DEFAULT_EMPTY_VALVE_CFG);
  const [showCurve, setShowCurve] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 140, y: 60 };
    return {
      x: Math.max(12, Math.round((window.innerWidth - 650) / 2)),
      y: Math.max(12, Math.round((window.innerHeight - 540) / 2)),
    };
  });

  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  useEffect(() => {
    if (!node || !isDirectionalValveType(node.type)) return;
    setLabel(node.label);
    setCfg(getEffectiveValveConfig(node));
    setShowCurve(false);
    setShowHelp(false);

    if (typeof window !== 'undefined') {
      const dlgW = Math.min(680, window.innerWidth - 24);
      const dlgH = Math.min(560, window.innerHeight - 24);
      setPos({
        x: Math.max(12, Math.round((window.innerWidth - dlgW) / 2)),
        y: window.innerWidth < 640 ? 12 : Math.max(12, Math.round((window.innerHeight - dlgH) / 2)),
      });
    }
  }, [node]);

  useEffect(() => {
    const clamp = () => {
      const el = panelRef.current;
      const w = el ? el.offsetWidth : Math.min(680, window.innerWidth - 24);
      const h = el ? el.offsetHeight : Math.min(540, window.innerHeight - 24);
      setPos((p) => ({
        x: Math.min(Math.max(12, p.x), Math.max(12, window.innerWidth - w - 12)),
        y: Math.min(Math.max(12, p.y), Math.max(12, window.innerHeight - h - 12)),
      }));
    };
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, []);

  if (!node || !isDirectionalValveType(node.type)) {
    return null;
  }

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
    const el = panelRef.current;
    const w = el ? el.offsetWidth : 660;
    const h = el ? el.offsetHeight : 540;
    const nextX = dragRef.current.origX + (e.clientX - dragRef.current.startX);
    const nextY = dragRef.current.origY + (e.clientY - dragRef.current.startY);
    setPos({
      x: Math.min(Math.max(8, nextX), Math.max(8, window.innerWidth - w - 8)),
      y: Math.min(Math.max(8, nextY), Math.max(8, window.innerHeight - h - 8)),
    });
  };

  const handleHeaderPointerUp = () => {
    dragRef.current = null;
  };

  const updateSide = (side: 'leftActuation' | 'rightActuation', patch: Partial<ValveActuationSide>) => {
    setCfg((prev) => ({
      ...prev,
      [side]: { ...prev[side], ...patch },
    }));
  };

  const updateChamber = (idx: 0 | 1 | 2 | 3, value: ValveChamberPattern) => {
    setCfg((prev) => {
      const next = [...prev.chambers] as ValveConfig['chambers'];
      next[idx] = value;
      return { ...prev, chambers: next };
    });
  };

  const handleSave = () => {
    const isThree =
      node.type === 'valve_4_3' ||
      node.type === 'valve_5_3' ||
      node.type === 'prop_valve_4_3' ||
      node.type === 'servo_valve_4_3';
    const nextPos = isThree
      ? Math.max(0, Math.min(2, cfg.initialPosition))
      : cfg.initialPosition === 0
        ? 0
        : 1;
    onApply(node.id, label.trim() || node.label, {
      valveConfig: cfg,
      spoolPosition: nextPos,
      active: nextPos === 0,
      sensingMark: cfg.leftActuation.mark?.trim() || undefined,
      secondaryMark: cfg.rightActuation.mark?.trim() || undefined,
    });
    onClose();
  };

  const strokeColor = isDark ? '#E2E8F0' : '#0F172A';
  const previewNode: CircuitNode = {
    ...node,
    label,
    params: {
      ...node.params,
      valveConfig: cfg,
      spoolPosition: cfg.initialPosition,
      active: cfg.initialPosition === 0,
    },
  };

  const renderActuationPanel = (
    title: string,
    sideKey: 'leftActuation' | 'rightActuation',
    sideDir: 'left' | 'right'
  ) => {
    const side = cfg[sideKey];
    const renderActuationOptionIcon = (actuation: ValveActuationSide) => (
      <svg viewBox="0 0 42 26" className="w-10 h-6 pointer-events-none">
        <ValveActuationSvg
          side={sideDir}
          actuation={actuation}
          edgeX={sideDir === 'left' ? 32 : 10}
          centerY={14}
          stroke={strokeColor}
          accent="#0284C7"
        />
      </svg>
    );

    return (
      <fieldset className="border border-slate-300 dark:border-slate-700 rounded-sm p-2.5 space-y-2 bg-slate-50/40 dark:bg-slate-950/30">
        <legend className="px-1 text-[11px] font-medium text-slate-800 dark:text-slate-200">
          {title}
        </legend>

        <label className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200">
          <input
            type="checkbox"
            disabled={!canEdit}
            checked={side.springReturn}
            onChange={(e) => updateSide(sideKey, { springReturn: e.target.checked })}
            className="accent-sky-600"
          />
          <span>Retorno de mola</span>
        </label>

        <div className="space-y-1">
          <label className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={side.piloted}
              onChange={(e) => updateSide(sideKey, { piloted: e.target.checked })}
              className="accent-sky-600"
            />
            <span>Pilotado</span>
          </label>
          <label
            className={`flex items-center gap-2 pl-5 text-xs ${
              side.piloted ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <input
              type="checkbox"
              disabled={!canEdit || !side.piloted}
              checked={side.externalFeed}
              onChange={(e) => updateSide(sideKey, { externalFeed: e.target.checked })}
              className="accent-sky-600"
            />
            <span>Alimentação externa</span>
          </label>
        </div>

        {/* Esforço muscular */}
        <div className="grid grid-cols-[1fr_76px] items-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-700 dark:text-slate-300 leading-tight">
            Esforço muscular
          </span>
          <SymbolDropdown<ValveManualActuation>
            ariaLabel={`${title} - Esforço muscular`}
            disabled={!canEdit}
            value={side.manual}
            options={MANUAL_OPTIONS}
            onChange={(val) => updateSide(sideKey, { manual: val })}
            renderSymbol={(val) =>
              val
                ? renderActuationOptionIcon({
                    springReturn: false,
                    piloted: false,
                    externalFeed: false,
                    manual: val,
                    mechanical: '',
                    electrical: '',
                  })
                : null
            }
          />
        </div>

        {/* Mecânico */}
        <div className="grid grid-cols-[1fr_76px] items-center gap-1.5">
          <span className="text-[11px] text-slate-700 dark:text-slate-300 leading-tight">
            Mecânico
          </span>
          <SymbolDropdown<ValveMechActuation>
            ariaLabel={`${title} - Mecânico`}
            disabled={!canEdit}
            value={side.mechanical}
            options={MECH_OPTIONS}
            onChange={(val) => updateSide(sideKey, { mechanical: val })}
            renderSymbol={(val) =>
              val
                ? renderActuationOptionIcon({
                    springReturn: false,
                    piloted: false,
                    externalFeed: false,
                    manual: '',
                    mechanical: val,
                    electrical: '',
                  })
                : null
            }
          />
        </div>

        {/* Hidráulico / Elétrico */}
        <div className="grid grid-cols-[1fr_76px] items-center gap-1.5">
          <span className="text-[11px] text-slate-700 dark:text-slate-300 leading-tight">
            Hidráulico / Elétrico
          </span>
          <SymbolDropdown<ValveElecActuation>
            ariaLabel={`${title} - Hidráulico ou Elétrico`}
            disabled={!canEdit}
            value={side.electrical}
            options={ELEC_OPTIONS}
            onChange={(val) => updateSide(sideKey, { electrical: val })}
            renderSymbol={(val) =>
              val
                ? renderActuationOptionIcon({
                    springReturn: false,
                    piloted: false,
                    externalFeed: false,
                    manual: '',
                    mechanical: '',
                    electrical: val,
                  })
                : null
            }
          />
        </div>

        {(() => {
          const hasMech = Boolean(side.mechanical);
          const hasSolenoid =
            side.electrical === 'solenoid' || side.electrical === 'hydraulic_pilot_solenoid';
          const hasAnyActuator = hasConfiguredActuatorSide(side);
          if (!hasAnyActuator) return null;
          return (
            <div className="space-y-1.5 pt-0.5">
              <div className="grid grid-cols-[1fr_76px] items-center gap-1.5">
                <label
                  htmlFor={`valve-${sideKey}-mark`}
                  className="text-[11px] text-slate-700 dark:text-slate-300 leading-tight"
                >
                  {hasMech ? 'Marca mecânica' : hasSolenoid ? 'Marca solenoide' : 'Marca conexão'}
                </label>
                <input
                  id={`valve-${sideKey}-mark`}
                  type="text"
                  disabled={!canEdit}
                  placeholder={hasMech ? (sideDir === 'left' ? '1S1' : '1S2') : sideDir === 'left' ? 'Y1' : 'Y2'}
                  value={side.mark ?? ''}
                  onChange={(e) => updateSide(sideKey, { mark: e.target.value })}
                  className="h-6 px-1.5 text-[11px] font-mono border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-sm outline-none"
                />
              </div>
              {onOpenMechanicalConnection && (
                <button
                  type="button"
                  data-testid={`mech-conn-btn-${sideDir}`}
                  disabled={!canEdit}
                  onClick={() =>
                    onOpenMechanicalConnection(sideDir, side.mark ?? '', (nextMark) =>
                      updateSide(sideKey, { mark: nextMark })
                    )
                  }
                  className="w-full py-1 px-2 rounded-sm border border-sky-400 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-800 dark:text-sky-200 text-[11px] font-medium disabled:opacity-50"
                >
                  Conexão...
                </button>
              )}
            </div>
          );
        })()}
      </fieldset>
    );
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Configurar válvula"
      data-testid="valve-config-dialog"
      style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
      className="fixed top-0 left-0 z-50 w-[min(680px,calc(100vw-24px))] max-h-[calc(100vh-24px)] flex flex-col rounded border border-slate-400 dark:border-slate-700 bg-[#F0F0F0] dark:bg-slate-900 shadow-2xl overflow-hidden text-xs text-slate-900 dark:text-slate-100"
    >
      {/* Draggable Title Bar */}
      <div
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        className="h-8 shrink-0 px-3 bg-white dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between cursor-move select-none touch-none"
      >
        <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
          <GripHorizontal className="w-3.5 h-3.5 text-slate-400" />
          <span>Configurar válvula</span>
        </div>
        <button
          type="button"
          aria-label="Fechar configuração de válvula"
          onClick={onClose}
          className="p-1 rounded hover:bg-red-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 bg-[#F0F0F0] dark:bg-slate-900">
        {/* Top 3-Column Section */}
        <div className="grid grid-cols-1 md:grid-cols-[175px_1fr_175px] gap-2.5 items-stretch">
          {renderActuationPanel('Acionamento esquerdo', 'leftActuation', 'left')}

          {/* Center: Name & Valve Body */}
          <div className="flex flex-col gap-2">
            <fieldset className="border border-slate-300 dark:border-slate-700 rounded-sm p-2">
              <legend className="px-1 text-[11px] font-medium">Denominação de componentes</legend>
              <input
                type="text"
                aria-label="Denominação de componentes"
                disabled={!canEdit}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full px-2 py-1 border border-sky-500 dark:border-slate-600 bg-white dark:bg-slate-950 text-xs focus:outline-none"
              />
            </fieldset>

            <fieldset className="flex-1 border border-slate-300 dark:border-slate-700 rounded-sm p-2.5 flex flex-col justify-between gap-2">
              <legend className="px-1 text-[11px] font-medium">Corpo da válvula</legend>

              <div className="flex justify-center">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={cfg.reversible}
                    onChange={(e) => setCfg((p) => ({ ...p, reversible: e.target.checked }))}
                    className="accent-sky-600"
                  />
                  <span>Reversível</span>
                </label>
              </div>

              {/* 4 Chamber Pattern Graphical Dropdowns */}
              <div className="grid grid-cols-4 gap-1.5">
                {([0, 1, 2, 3] as const).map((idx) => (
                  <SymbolDropdown<ValveChamberPattern>
                    key={idx}
                    ariaLabel={`Câmara ${idx + 1}`}
                    disabled={!canEdit}
                    value={cfg.chambers[idx]}
                    options={CHAMBER_PATTERN_LABELS.map((opt) => ({
                      value: opt.id,
                      label: opt.label,
                    }))}
                    onChange={(val) => updateChamber(idx, val)}
                    buttonHeightClass="h-10"
                    optionHeightClass="h-[30px]"
                    renderSymbol={(pat) =>
                      pat ? (
                        <svg viewBox="0 0 36 32" className="w-7 h-7 pointer-events-none">
                          <rect
                            x={4}
                            y={2}
                            width={28}
                            height={28}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth={1.3}
                          />
                          <ValveChamberPatternSvg
                            pattern={pat}
                            x={4}
                            y={2}
                            w={28}
                            h={28}
                            stroke={strokeColor}
                            portVariant={
                              node.type === 'valve_2_2'
                                ? 'two_way'
                                : node.type === 'valve_3_2'
                                  ? 'three_way'
                                  : node.type === 'valve_5_2' || node.type === 'valve_5_3'
                                    ? 'five_way'
                                    : node.type === 'valve_6_2'
                                      ? 'six_way'
                                      : 'four_way'
                            }
                          />
                        </svg>
                      ) : null
                    }
                  />
                ))}
              </div>

              {/* Initial Position Radios */}
              <fieldset className="border border-slate-300 dark:border-slate-700 rounded-sm px-2 py-1.5">
                <legend className="px-1 text-[11px]">Posição inicial</legend>
                <div className="grid grid-cols-4 place-items-center py-0.5">
                  {([0, 1, 2, 3] as const).map((idx) => {
                    const enabled = Boolean(cfg.chambers[idx]);
                    return (
                      <input
                        key={idx}
                        type="radio"
                        name="valve-initial-pos"
                        aria-label={`Posição inicial ${idx + 1}`}
                        disabled={!canEdit || !enabled}
                        checked={cfg.initialPosition === idx}
                        onChange={() => setCfg((p) => ({ ...p, initialPosition: idx }))}
                        className="accent-sky-600 cursor-pointer disabled:opacity-40"
                      />
                    );
                  })}
                </div>
              </fieldset>
            </fieldset>
          </div>

          {renderActuationPanel('Acionamento direito', 'rightActuation', 'right')}
        </div>

        {/* Dominant Side Strip */}
        <div className="border border-slate-300 dark:border-slate-700 rounded-sm px-4 py-2 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="radio"
              name="valve-dom-side"
              disabled={!canEdit}
              checked={cfg.dominantSide === 'left'}
              onChange={() => setCfg((p) => ({ ...p, dominantSide: 'left' }))}
              className="accent-sky-600"
            />
            <span>Esquerda</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={cfg.dominantSignal}
              onChange={(e) => setCfg((p) => ({ ...p, dominantSignal: e.target.checked }))}
              className="accent-sky-600"
            />
            <span>Sinal dominante</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="radio"
              name="valve-dom-side"
              disabled={!canEdit}
              checked={cfg.dominantSide === 'right'}
              onChange={() => setCfg((p) => ({ ...p, dominantSide: 'right' }))}
              className="accent-sky-600"
            />
            <span>Direita</span>
          </label>
        </div>

        {/* Hydraulic Resistance Row */}
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-xs font-medium">Resistência hidráulica</span>
          <input
            type="number"
            aria-label="Resistência hidráulica"
            disabled={!canEdit}
            step="0.0001"
            min="0.0000001"
            max="100"
            value={cfg.hydraulicResistance}
            onChange={(e) =>
              setCfg((p) => ({
                ...p,
                hydraulicResistance: Math.max(1e-7, Number(e.target.value) || 0.0164),
              }))
            }
            className="w-24 px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-right text-xs"
          />
          <select
            aria-label="Unidade de resistência"
            disabled={!canEdit}
            value={cfg.resistanceUnit}
            onChange={(e) =>
              setCfg((p) => ({ ...p, resistanceUnit: e.target.value as ValveConfig['resistanceUnit'] }))
            }
            className="flex-1 min-w-[170px] px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
          >
            <option value="mpa_lmin2">MPa/(l/min)^2 (1e-007..100)</option>
            <option value="bar_lmin2">bar/(l/min)^2 (1e-006..1000)</option>
          </select>
          <button
            type="button"
            onClick={() => setShowCurve((v) => !v)}
            className="px-4 py-1 border border-slate-400 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-sm text-xs"
          >
            Curva...
          </button>
        </div>

        {showCurve && (
          <div className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 rounded-sm">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-medium">Curva característica ΔP = R · Q²</span>
              <span className="font-mono text-sky-600">
                R = {cfg.hydraulicResistance} {cfg.resistanceUnit === 'mpa_lmin2' ? 'MPa/(l/min)²' : 'bar/(l/min)²'}
              </span>
            </div>
            <svg viewBox="0 0 360 90" className="w-full h-24">
              <rect x={36} y={8} width={310} height={64} fill="none" stroke="#CBD5E1" strokeWidth={1} />
              <path
                d={`M 36 72 ${Array.from({ length: 16 })
                  .map((_, i) => {
                    const q = i * 4; // 0..60 l/min
                    const dpBar = cfg.hydraulicResistance * (cfg.resistanceUnit === 'mpa_lmin2' ? 10 : 1) * q * q;
                    const px = 36 + (i / 15) * 310;
                    const py = 72 - Math.min(60, (dpBar / 15) * 60);
                    return `L ${px.toFixed(1)} ${py.toFixed(1)}`;
                  })
                  .join(' ')}`}
                fill="none"
                stroke="#0284C7"
                strokeWidth={2}
              />
              <text x={190} y={86} textAnchor="middle" fontSize={9} fill="#64748B">
                Vazão Q [l/min] (0..60)
              </text>
            </svg>
          </div>
        )}

        {/* Bottom Row: Mirroring + Live Valve Preview Box */}
        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-2.5 items-stretch">
          <fieldset className="border border-slate-300 dark:border-slate-700 rounded-sm p-2.5 space-y-2">
            <legend className="px-1 text-[11px] font-medium">Espelhar</legend>
            <label className="flex items-center gap-2.5 text-xs">
              <span className="w-6 h-5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 flex items-center justify-center font-mono text-[10px]">
                ▯|▯
              </span>
              <input
                type="checkbox"
                disabled={!canEdit}
                checked={cfg.mirrorHorizontal}
                onChange={(e) => setCfg((p) => ({ ...p, mirrorHorizontal: e.target.checked }))}
                className="accent-sky-600"
              />
              <span>Horizontal</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs">
              <span className="w-6 h-5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 flex items-center justify-center font-mono text-[10px]">
                ═
              </span>
              <input
                type="checkbox"
                disabled={!canEdit}
                checked={cfg.mirrorVertical}
                onChange={(e) => setCfg((p) => ({ ...p, mirrorVertical: e.target.checked }))}
                className="accent-sky-600"
              />
              <span>Vertical</span>
            </label>
          </fieldset>

          <div className="border border-slate-400 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-sm flex items-center justify-center min-h-[86px] p-2">
            <svg viewBox="-145 -48 290 96" className="w-full max-w-[290px] h-20">
              <DirectionalValveSymbol
                node={previewNode}
                isDark={isDark}
                accent="#0284C7"
              />
            </svg>
          </div>
        </div>

        {showHelp && (
          <div className="p-2.5 rounded border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 text-[11px] text-slate-700 dark:text-slate-200 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <span>
              Configure os acionamentos esquerdo e direito (mola, piloto, pedal, alavanca, rolete ou
              solenoide), selecione os símbolos internos das câmaras e a posição inicial. A
              resistência hidráulica define a queda de pressão quadrática ΔP = R·Q².
            </span>
          </div>
        )}
      </div>

      {/* Classic Footer Buttons: OK / Cancelar / Ajuda */}
      <div className="shrink-0 px-3 py-2 border-t border-slate-300 dark:border-slate-700 bg-[#F0F0F0] dark:bg-slate-900 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canEdit}
          className="px-6 py-1 rounded-sm border border-sky-600 bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium shadow-xs disabled:opacity-50"
        >
          OK
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-1 rounded-sm border border-slate-400 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          className="px-5 py-1 rounded-sm border border-slate-400 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          Ajuda
        </button>
      </div>
    </div>
  );
};
