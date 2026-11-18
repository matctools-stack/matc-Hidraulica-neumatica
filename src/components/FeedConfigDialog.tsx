import React, { useEffect, useRef, useState } from 'react';
import { GripHorizontal, X } from 'lucide-react';
import type { CircuitNode, ComponentParams } from '../types/circuit';

interface FeedConfigDialogProps {
  node: CircuitNode | null;
  canEdit: boolean;
  isDark: boolean;
  onClose: () => void;
  onApply: (nodeId: string, params: Partial<ComponentParams>) => void;
}

function getDialogTitle(type: CircuitNode['type']): string {
  switch (type) {
    case 'power_unit_simple':
      return 'Grupo motriz (simplificado)';
    case 'power_unit':
      return 'Grupo motriz';
    case 'filter':
      return 'Filtro';
    case 'flexible_hose':
      return 'Tubo flexível com acoplamento de fechamento rápido';
    case 'accumulator':
    case 'accumulator_simple':
      return 'Acumulador';
    case 'pump_variable':
      return 'Bomba de deslocamento variável';
    case 'pump':
      return 'Bomba de deslocamento constante';
    case 'accumulator_unit':
      return 'Acumulador de membrana com bloco de fechamento';
    default:
      return 'Propriedades do elemento de alimentação';
  }
}

function getHelpText(type: CircuitNode['type']): string {
  switch (type) {
    case 'power_unit_simple':
    case 'power_unit':
      return 'Defina a pressão nominal da válvula limitadora integrada (MPa ou bar), o caudal da bomba (l/min) e o coeficiente de fugas internas (l/(min·MPa)).';
    case 'filter':
    case 'flexible_hose':
      return 'Ajuste o coeficiente de resistência hidráulica R na equação Δp = R · Q². Clique em Curva... para visualizar a curva característica de perda de carga.';
    case 'accumulator':
    case 'accumulator_simple':
      return 'Configure o volume nominal do acumulador (l ou cm³), o estado de carga inicial do gás (MPa ou bar) e a exibição da indicação de pressão no símbolo.';
    case 'pump':
    case 'pump_variable':
      return 'Ajuste a rotação (1/min), o deslocamento volumétrico por rotação (l ou cm³), a pressão máxima da bomba e as fugas internas. O caudal resultante é calculado por Q = n · V.';
    case 'accumulator_unit':
      return 'Configure a pressão nominal da válvula limitadora de pressão do bloco de segurança e a pressão de pré-carga (estado de carga) do acumulador de membrana.';
    default:
      return '';
  }
}

export const FeedConfigDialog: React.FC<FeedConfigDialogProps> = ({
  node,
  canEdit,
  isDark,
  onClose,
  onApply,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showCurve, setShowCurve] = useState(false);

  // Unit selectors matching FluidSIM dropdowns
  const [pressureUnit, setPressureUnit] = useState<'MPa' | 'bar'>('MPa');
  const [prechargeUnit, setPrechargeUnit] = useState<'MPa' | 'bar'>('MPa');
  const [resistanceUnit, setResistanceUnit] = useState<'mpa' | 'bar'>('mpa');
  const [volumeUnit, setVolumeUnit] = useState<'l' | 'cm3'>('l');
  const [dispUnit, setDispUnit] = useState<'l' | 'cm3'>('l');

  // Form values (stored in FluidSIM display units, converted to internal units on apply)
  const [pressureVal, setPressureVal] = useState('6');
  const [flowVal, setFlowVal] = useState('2');
  const [leakageVal, setLeakageVal] = useState('0');
  const [resistanceVal, setResistanceVal] = useState('0.0001');
  const [volumeVal, setVolumeVal] = useState('0.32');
  const [prechargeVal, setPrechargeVal] = useState('1');
  const [showPressureInd, setShowPressureInd] = useState(true);
  const [rpmVal, setRpmVal] = useState(1320);
  const [dispVal, setDispVal] = useState('0.0016');

  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 220, y: 120 };
    return {
      x: Math.max(12, Math.round((window.innerWidth - 430) / 2)),
      y: Math.max(12, Math.round((window.innerHeight - 320) / 2)),
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
    setShowCurve(false);
    setPressureUnit('MPa');
    setPrechargeUnit('MPa');
    setResistanceUnit('mpa');
    setVolumeUnit('l');
    setDispUnit('l');

    const p = node.params;
    if (node.type === 'power_unit_simple' || node.type === 'power_unit') {
      const targetBar = p.targetPressure ?? 60;
      setPressureVal(String(Number((targetBar / 10).toFixed(4))));
      setFlowVal(String(p.maxFlow ?? 2));
      setLeakageVal(String(p.internalLeakage ?? 0));
    } else if (node.type === 'filter' || node.type === 'flexible_hose') {
      const defR = node.type === 'filter' ? 0.0001 : 0.012;
      setResistanceVal(String(p.hydraulicResistance ?? defR));
    } else if (node.type === 'accumulator' || node.type === 'accumulator_simple') {
      setVolumeVal(String(p.volumeL ?? 0.32));
      const preBar = p.crackingPressure ?? 10;
      setPrechargeVal(String(Number((preBar / 10).toFixed(4))));
      setShowPressureInd(p.showPressureIndication !== false);
    } else if (node.type === 'pump_variable' || node.type === 'pump') {
      setRpmVal(p.rpm ?? 1320);
      setDispVal(String(p.displacementL ?? 0.0016));
      const maxBar = p.targetPressure ?? 60;
      setPressureVal(String(Number((maxBar / 10).toFixed(4))));
      setLeakageVal(String(p.internalLeakage ?? 0));
    } else if (node.type === 'accumulator_unit') {
      const reliefBar = p.crackingPressure ?? 60;
      const preBar = (p.targetPressure ?? 10);
      setPressureVal(String(Number((reliefBar / 10).toFixed(4))));
      setPrechargeVal(String(Number((preBar / 10).toFixed(4))));
    }

    if (typeof window !== 'undefined') {
      const dlgW = Math.min(440, window.innerWidth - 24);
      const dlgH = Math.min(360, window.innerHeight - 24);
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
    const w = panelRef.current?.offsetWidth ?? 430;
    const h = panelRef.current?.offsetHeight ?? 300;
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

  const switchPrechargeUnit = (nextUnit: 'MPa' | 'bar') => {
    if (nextUnit === prechargeUnit) return;
    const num = Number.parseFloat(prechargeVal);
    if (Number.isFinite(num)) {
      setPrechargeVal(
        nextUnit === 'bar'
          ? String(Number((num * 10).toFixed(3)))
          : String(Number((num / 10).toFixed(4)))
      );
    }
    setPrechargeUnit(nextUnit);
  };

  const switchResistanceUnit = (nextUnit: 'mpa' | 'bar') => {
    if (nextUnit === resistanceUnit) return;
    const num = Number.parseFloat(resistanceVal);
    if (Number.isFinite(num)) {
      setResistanceVal(
        nextUnit === 'bar'
          ? String(Number((num * 10).toPrecision(5)))
          : String(Number((num / 10).toPrecision(5)))
      );
    }
    setResistanceUnit(nextUnit);
  };

  const switchVolumeUnit = (nextUnit: 'l' | 'cm3') => {
    if (nextUnit === volumeUnit) return;
    const num = Number.parseFloat(volumeVal);
    if (Number.isFinite(num)) {
      setVolumeVal(
        nextUnit === 'cm3'
          ? String(Number((num * 1000).toFixed(2)))
          : String(Number((num / 1000).toFixed(4)))
      );
    }
    setVolumeUnit(nextUnit);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      onClose();
      return;
    }

    const toBar = (raw: string, unit: 'MPa' | 'bar', fallbackBar: number) => {
      const n = Number.parseFloat(raw);
      if (!Number.isFinite(n)) return fallbackBar;
      return Number(Math.max(0, unit === 'MPa' ? n * 10 : n).toFixed(2));
    };

    if (node.type === 'power_unit_simple' || node.type === 'power_unit') {
      const targetPressure = Math.min(400, Math.max(0.1, toBar(pressureVal, pressureUnit, 60)));
      const maxFlow = Math.min(500, Math.max(0, Number.parseFloat(flowVal) || 0));
      const internalLeakage = Math.min(100, Math.max(0, Number.parseFloat(leakageVal) || 0));
      onApply(node.id, { targetPressure, maxFlow, internalLeakage });
    } else if (node.type === 'filter' || node.type === 'flexible_hose') {
      const rawR = Number.parseFloat(resistanceVal);
      const rMpa = Number.isFinite(rawR) ? (resistanceUnit === 'bar' ? rawR / 10 : rawR) : 0.0001;
      const hydraulicResistance = Math.min(100, Math.max(1e-7, rMpa));
      onApply(node.id, { hydraulicResistance });
    } else if (node.type === 'accumulator' || node.type === 'accumulator_simple') {
      const rawV = Number.parseFloat(volumeVal);
      const volL = Number.isFinite(rawV) ? (volumeUnit === 'cm3' ? rawV / 1000 : rawV) : 0.32;
      const volumeL = Math.min(100, Math.max(0.01, Number(volL.toFixed(4))));
      const crackingPressure = Math.min(400, toBar(prechargeVal, prechargeUnit, 10));
      onApply(node.id, {
        volumeL,
        crackingPressure,
        showPressureIndication: showPressureInd,
      });
    } else if (node.type === 'pump_variable' || node.type === 'pump') {
      const rpm = Math.min(3000, Math.max(0, Math.round(rpmVal)));
      const rawD = Number.parseFloat(dispVal);
      const dL = Number.isFinite(rawD) ? (dispUnit === 'cm3' ? rawD / 1000 : rawD) : 0.0016;
      const displacementL = Math.min(1, Math.max(0.001, Number(dL.toFixed(5))));
      const targetPressure = Math.min(400, Math.max(1, toBar(pressureVal, pressureUnit, 60)));
      const internalLeakage = Math.min(100, Math.max(0, Number.parseFloat(leakageVal) || 0));
      const maxFlow = Number((rpm * displacementL).toFixed(2));
      onApply(node.id, {
        rpm,
        displacementL,
        targetPressure,
        internalLeakage,
        maxFlow,
      });
    } else if (node.type === 'accumulator_unit') {
      const crackingPressure = Math.min(350, toBar(pressureVal, pressureUnit, 60));
      const targetPressure = Math.min(350, Math.max(1, toBar(prechargeVal, prechargeUnit, 10)));
      onApply(node.id, {
        crackingPressure,
        targetPressure,
      });
    }

    onClose();
  };

  const title = getDialogTitle(node.type);
  const resNum = Math.max(
    1e-7,
    Number.parseFloat(resistanceVal) * (resistanceUnit === 'bar' ? 0.1 : 1) || 0.0001
  );

  const inputCls = isDark
    ? 'bg-slate-950 border-slate-600 text-slate-100 focus:border-sky-500'
    : 'bg-white border-sky-600/80 text-slate-900 focus:border-sky-700';

  const selectCls = isDark
    ? 'bg-slate-800 border-slate-600 text-slate-200'
    : 'bg-[#E1E1E1] border-[#ADADAD] text-slate-900';

  const btnCls = isDark
    ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-100'
    : 'bg-[#E1E1E1] hover:bg-[#D5E1F2] border-[#ADADAD] text-slate-900';

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={title}
      data-testid="feed-config-dialog"
      style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
      className={`fixed top-0 left-0 z-50 w-[min(430px,calc(100vw-20px))] border shadow-2xl text-xs select-none ${
        isDark
          ? 'bg-slate-900 border-slate-700 text-slate-100'
          : 'bg-[#F0F0F0] border-[#888888] text-slate-900'
      }`}
    >
      {/* Window Title Bar */}
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
        {/* 1. Grupo motriz (simplificado) / Grupo motriz */}
        {(node.type === 'power_unit_simple' || node.type === 'power_unit') && (
          <>
            <fieldset className={`border p-2.5 space-y-2 ${isDark ? 'border-slate-700' : 'border-[#D0D0D0]'}`}>
              <legend className="px-1 text-[11.5px]">Válvula limitadora de pressão</legend>
              <div className="grid grid-cols-[120px_76px_1fr] items-center gap-2">
                <label htmlFor="feed-pressure-nom" className="text-right">
                  Pressão nominal
                </label>
                <input
                  id="feed-pressure-nom"
                  type="number"
                  step="any"
                  min={pressureUnit === 'MPa' ? 0.01 : 0.1}
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
                  <option value="MPa">MPa (0.01..40)</option>
                  <option value="bar">bar (0.1..400)</option>
                </select>
              </div>
            </fieldset>

            <fieldset className={`border p-2.5 space-y-2 ${isDark ? 'border-slate-700' : 'border-[#D0D0D0]'}`}>
              <legend className="px-1 text-[11.5px]">Bomba</legend>
              <div className="grid grid-cols-[120px_76px_1fr] items-center gap-2">
                <label htmlFor="feed-pump-flow" className="text-right">
                  Caudal
                </label>
                <input
                  id="feed-pump-flow"
                  type="number"
                  step="any"
                  min={0}
                  max={500}
                  disabled={!canEdit}
                  value={flowVal}
                  onChange={(e) => setFlowVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select
                  aria-label="Unidade de caudal"
                  defaultValue="l/min"
                  className={`h-6 px-1.5 border ${selectCls}`}
                >
                  <option value="l/min">l/min (0..500)</option>
                </select>
              </div>

              <div className="grid grid-cols-[120px_76px_1fr] items-center gap-2">
                <label htmlFor="feed-pump-leak" className="text-right">
                  Fugas internas
                </label>
                <input
                  id="feed-pump-leak"
                  type="number"
                  step="any"
                  min={0}
                  max={100}
                  disabled={!canEdit}
                  value={leakageVal}
                  onChange={(e) => setLeakageVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select
                  aria-label="Unidade de fugas internas"
                  defaultValue="lmpmpa"
                  className={`h-6 px-1.5 border ${selectCls}`}
                >
                  <option value="lmpmpa">l/(min*MPa) (0..100)</option>
                </select>
              </div>
            </fieldset>
          </>
        )}

        {/* 2 & 6. Filtro / Tubo flexível */}
        {(node.type === 'filter' || node.type === 'flexible_hose') && (
          <fieldset className={`border p-2.5 space-y-2 ${isDark ? 'border-slate-700' : 'border-[#D0D0D0]'}`}>
            <legend className="px-1 text-[11.5px]">Resistência hidráulica</legend>
            <div className="grid grid-cols-[72px_1fr_84px] items-center gap-2">
              <input
                aria-label="Resistência hidráulica"
                type="number"
                step="any"
                min={1e-7}
                max={100}
                disabled={!canEdit}
                value={resistanceVal}
                onChange={(e) => setResistanceVal(e.target.value)}
                className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
              />
              <select
                aria-label="Unidade de resistência hidráulica"
                value={resistanceUnit}
                onChange={(e) => switchResistanceUnit(e.target.value as 'mpa' | 'bar')}
                className={`h-6 px-1.5 border ${selectCls}`}
              >
                <option value="mpa">MPa/(l/min)^2 (1e-007..100)</option>
                <option value="bar">bar/(l/min)^2 (1e-006..1000)</option>
              </select>
              <button
                type="button"
                onClick={() => setShowCurve((v) => !v)}
                className={`h-6 px-2 border ${btnCls}`}
              >
                Curva...
              </button>
            </div>

            {showCurve && (
              <div
                className={`p-2 border rounded-sm ${
                  isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] mb-1 text-slate-500">
                  <span>Curva Δp = R · Q² (R = {resNum.toPrecision(3)} MPa/(l/min)²)</span>
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
                      const maxDp = Math.max(0.01, resNum * 900);
                      const dp = resNum * q * q;
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
            )}
          </fieldset>
        )}

        {/* 3. Acumulador */}
        {(node.type === 'accumulator' || node.type === 'accumulator_simple') && (
          <div className="space-y-2.5 pt-1">
            <div className="grid grid-cols-[120px_76px_1fr] items-center gap-2">
              <label htmlFor="acc-volume" className="text-right">
                Volume
              </label>
              <input
                id="acc-volume"
                type="number"
                step="any"
                min={volumeUnit === 'l' ? 0.01 : 10}
                max={volumeUnit === 'l' ? 100 : 100000}
                disabled={!canEdit}
                value={volumeVal}
                onChange={(e) => setVolumeVal(e.target.value)}
                className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
              />
              <select
                aria-label="Unidade de volume"
                value={volumeUnit}
                onChange={(e) => switchVolumeUnit(e.target.value as 'l' | 'cm3')}
                className={`h-6 px-1.5 border ${selectCls}`}
              >
                <option value="l">l (0.01..100)</option>
                <option value="cm3">cm³ (10..100000)</option>
              </select>
            </div>

            <div className="grid grid-cols-[120px_76px_1fr] items-center gap-2">
              <label htmlFor="acc-precharge" className="text-right">
                Estado de carga
              </label>
              <input
                id="acc-precharge"
                type="number"
                step="any"
                min={0}
                max={prechargeUnit === 'MPa' ? 40 : 400}
                disabled={!canEdit}
                value={prechargeVal}
                onChange={(e) => setPrechargeVal(e.target.value)}
                className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
              />
              <select
                aria-label="Unidade de estado de carga"
                value={prechargeUnit}
                onChange={(e) => switchPrechargeUnit(e.target.value as 'MPa' | 'bar')}
                className={`h-6 px-1.5 border ${selectCls}`}
              >
                <option value="MPa">MPa (0..40)</option>
                <option value="bar">bar (0..400)</option>
              </select>
            </div>

            <div className="pl-[128px] pt-0.5">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={showPressureInd}
                  onChange={(e) => setShowPressureInd(e.target.checked)}
                />
                <span>Indicação de pressão</span>
              </label>
            </div>
          </div>
        )}

        {/* 4. Bomba de deslocamento variável / constante */}
        {(node.type === 'pump_variable' || node.type === 'pump') && (
          <div className="space-y-2.5">
            <fieldset className={`border p-2.5 space-y-2 ${isDark ? 'border-slate-700' : 'border-[#D0D0D0]'}`}>
              <div className="grid grid-cols-[110px_76px_1fr] items-center gap-2">
                <label htmlFor="pump-rpm" className="text-right">
                  Revolução
                </label>
                <input
                  id="pump-rpm"
                  type="number"
                  min={0}
                  max={3000}
                  disabled={!canEdit}
                  value={rpmVal}
                  onChange={(e) => setRpmVal(Math.min(3000, Math.max(0, Number(e.target.value) || 0)))}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select
                  aria-label="Unidade de revolução"
                  defaultValue="rpm"
                  className={`h-6 px-1.5 border ${selectCls}`}
                >
                  <option value="rpm">1/min (0..3000)</option>
                </select>
              </div>
              <div className="px-2">
                <div className="flex justify-between px-1 mb-0.5">
                  {Array.from({ length: 21 }, (_, idx) => (
                    <span
                      key={idx}
                      className={`w-px h-1.5 ${isDark ? 'bg-slate-600' : 'bg-slate-400'}`}
                    />
                  ))}
                </div>
                <input
                  aria-label="Controle deslizante de revolução"
                  type="range"
                  min={0}
                  max={3000}
                  step={30}
                  disabled={!canEdit}
                  value={rpmVal}
                  onChange={(e) => setRpmVal(Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>
            </fieldset>

            <div className="space-y-1.5 px-2.5">
              <div className="grid grid-cols-[110px_76px_1fr] items-center gap-2">
                <label htmlFor="pump-disp" className="text-right">
                  Deslocamento
                </label>
                <input
                  id="pump-disp"
                  type="number"
                  step="any"
                  min={dispUnit === 'l' ? 0.001 : 1}
                  max={dispUnit === 'l' ? 1 : 1000}
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
                  <option value="l">l (0.001..1)</option>
                  <option value="cm3">cm³ (1..1000)</option>
                </select>
              </div>

              <div className="grid grid-cols-[110px_76px_1fr] items-center gap-2">
                <label htmlFor="pump-pmax" className="text-right">
                  Pressão máxima
                </label>
                <input
                  id="pump-pmax"
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
                  aria-label="Unidade de pressão máxima"
                  value={pressureUnit}
                  onChange={(e) => switchPressureUnit(e.target.value as 'MPa' | 'bar')}
                  className={`h-6 px-1.5 border ${selectCls}`}
                >
                  <option value="MPa">MPa (0.1..40)</option>
                  <option value="bar">bar (1..400)</option>
                </select>
              </div>

              <div className="grid grid-cols-[110px_76px_1fr] items-center gap-2">
                <label htmlFor="pump-leak" className="text-right">
                  Fugas internas
                </label>
                <input
                  id="pump-leak"
                  type="number"
                  step="any"
                  min={0}
                  max={100}
                  disabled={!canEdit}
                  value={leakageVal}
                  onChange={(e) => setLeakageVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select
                  aria-label="Unidade de fugas internas da bomba"
                  defaultValue="lmpmpa"
                  className={`h-6 px-1.5 border ${selectCls}`}
                >
                  <option value="lmpmpa">l/(min*MPa) (0..100)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 5. Acumulador a membrana com bloco de fechamento */}
        {node.type === 'accumulator_unit' && (
          <>
            <fieldset className={`border p-2.5 space-y-2 ${isDark ? 'border-slate-700' : 'border-[#D0D0D0]'}`}>
              <legend className="px-1 text-[11.5px]">Válvula limitadora de pressão</legend>
              <div className="grid grid-cols-[120px_76px_1fr] items-center gap-2">
                <label htmlFor="accu-unit-relief" className="text-right">
                  Pressão nominal
                </label>
                <input
                  id="accu-unit-relief"
                  type="number"
                  step="any"
                  min={0}
                  max={pressureUnit === 'MPa' ? 35 : 350}
                  disabled={!canEdit}
                  value={pressureVal}
                  onChange={(e) => setPressureVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select
                  aria-label="Unidade de pressão nominal da válvula"
                  value={pressureUnit}
                  onChange={(e) => switchPressureUnit(e.target.value as 'MPa' | 'bar')}
                  className={`h-6 px-1.5 border ${selectCls}`}
                >
                  <option value="MPa">MPa (0..35)</option>
                  <option value="bar">bar (0..350)</option>
                </select>
              </div>
            </fieldset>

            <fieldset className={`border p-2.5 space-y-2 ${isDark ? 'border-slate-700' : 'border-[#D0D0D0]'}`}>
              <legend className="px-1 text-[11.5px]">Acumulador</legend>
              <div className="grid grid-cols-[120px_76px_1fr] items-center gap-2">
                <label htmlFor="accu-unit-precharge" className="text-right">
                  Estado de carga
                </label>
                <input
                  id="accu-unit-precharge"
                  type="number"
                  step="any"
                  min={prechargeUnit === 'MPa' ? 0.1 : 1}
                  max={prechargeUnit === 'MPa' ? 35 : 350}
                  disabled={!canEdit}
                  value={prechargeVal}
                  onChange={(e) => setPrechargeVal(e.target.value)}
                  className={`h-6 px-1.5 text-right font-mono border outline-none ${inputCls}`}
                />
                <select
                  aria-label="Unidade de estado de carga do acumulador"
                  value={prechargeUnit}
                  onChange={(e) => switchPrechargeUnit(e.target.value as 'MPa' | 'bar')}
                  className={`h-6 px-1.5 border ${selectCls}`}
                >
                  <option value="MPa">MPa (0.1..35)</option>
                  <option value="bar">bar (1..350)</option>
                </select>
              </div>
            </fieldset>
          </>
        )}

        {showHelp && (
          <div
            className={`p-2 border text-[11px] leading-relaxed ${
              isDark
                ? 'bg-slate-950 border-slate-700 text-slate-300'
                : 'bg-sky-50 border-sky-200 text-slate-700'
            }`}
          >
            {getHelpText(node.type)}
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
