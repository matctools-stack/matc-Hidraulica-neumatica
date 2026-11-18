import React, { useEffect, useRef, useState } from 'react';
import { GripHorizontal, HelpCircle, X } from 'lucide-react';
import {
  computeCylinderAreasCm2,
  FRICTION_MATERIALS,
  getEffectiveCylinderConfig,
} from '../engine/fluidSolver';
import type {
  CircuitNode,
  ComponentParams,
  CylinderConfig,
  FrictionMaterialId,
} from '../types/circuit';

type ConfigTabId = 'config' | 'params' | 'load' | 'force' | 'labels';

interface CylinderConfigDialogProps {
  node: CircuitNode | null;
  canEdit: boolean;
  isDark: boolean;
  onClose: () => void;
  onApply: (
    nodeId: string,
    nextType: 'cylinder_single' | 'cylinder_double',
    label: string,
    params: Partial<ComponentParams>
  ) => void;
}

const HELP_TEXT: Record<ConfigTabId, string> = {
  config:
    'Defina a denominação, o tipo construtivo (simples ou dupla ação), o tipo de haste, amortecimento de fim de curso, detecção magnética e espelhamento do símbolo ISO.',
  params:
    'Configure curso máximo, posição inicial do pistão, diâmetros do êmbolo/haste, ângulo de montagem e vazamentos internos. As áreas efetivas são calculadas automaticamente.',
  load:
    'Especifique a massa em movimento e os coeficientes de atrito estático e dinâmico (por material pré-definido ou manualmente). O ângulo de montagem influencia a força normal.',
  force:
    'Selecione força resistente constante ou defina um perfil variável ao longo do curso clicando no gráfico e ajustando Posição do pistão e Força.',
  labels:
    'Configure até 6 marcas de acionamento com faixa Início/Fim em milímetros para acionar chaves de fim de curso, sensores magnéticos ou roletes pneumáticos.',
};

const TABS: Array<{ id: ConfigTabId; label: string }> = [
  { id: 'config', label: 'Configuração' },
  { id: 'params', label: 'Parâmetros' },
  { id: 'load', label: 'Carga externa' },
  { id: 'force', label: 'Perfil de força' },
  { id: 'labels', label: 'Etiquetas de acionamento' },
];

export const CylinderConfigDialog: React.FC<CylinderConfigDialogProps> = ({
  node,
  canEdit,
  isDark,
  onClose,
  onApply,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<ConfigTabId>('config');
  const [showHelp, setShowHelp] = useState(false);

  const [label, setLabel] = useState('');
  const [boreMm, setBoreMm] = useState(50);
  const [rodMm, setRodMm] = useState(22);
  const [strokeMm, setStrokeMm] = useState(200);
  const [loadN, setLoadN] = useState(0);
  const [cfg, setCfg] = useState<CylinderConfig>(() =>
    getEffectiveCylinderConfig({
      id: 'tmp',
      type: 'cylinder_double',
      label: '',
      x: 0,
      y: 0,
      rotation: 0,
      params: {},
    })
  );
  const [selectedPointIdx, setSelectedPointIdx] = useState<number>(0);

  // Floating draggable position
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 160, y: 72 };
    const x = Math.max(12, Math.round((window.innerWidth - 540) / 2));
    const y = Math.max(12, Math.round((window.innerHeight - 520) / 2));
    return { x, y };
  });

  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  useEffect(() => {
    if (!node) return;
    setActiveTab('config');
    setShowHelp(false);
    setLabel(node.label);
    const defaultBore = node.type === 'cylinder_single' ? 40 : 50;
    const defaultRod = node.type === 'cylinder_single' ? 16 : 22;
    const defaultStroke = node.type === 'cylinder_single' ? 200 : 250;
    const nextStroke = node.params.strokeMm ?? defaultStroke;
    setBoreMm(node.params.boreMm ?? defaultBore);
    setRodMm(node.params.rodMm ?? defaultRod);
    setStrokeMm(nextStroke);
    setLoadN(node.params.loadN ?? 0);
    const eff = getEffectiveCylinderConfig(node);
    if (
      eff.forceProfile.length === 2 &&
      eff.forceProfile[0].posMm === 0 &&
      eff.forceProfile[1].posMm === 200 &&
      nextStroke !== 200
    ) {
      eff.forceProfile = [
        { posMm: 0, forceN: eff.forceProfile[0].forceN },
        { posMm: nextStroke, forceN: eff.forceProfile[1].forceN },
      ];
    }
    setCfg(eff);
    setSelectedPointIdx(0);

    if (typeof window !== 'undefined') {
      const dlgW = Math.min(600, window.innerWidth - 24);
      const dlgH = Math.min(580, window.innerHeight - 24);
      setPos({
        x: Math.max(12, Math.round((window.innerWidth - dlgW) / 2)),
        y: window.innerWidth < 640 ? 12 : Math.max(12, Math.round((window.innerHeight - dlgH) / 2)),
      });
    }
  }, [node]);

  useEffect(() => {
    const clampToViewport = () => {
      const el = panelRef.current;
      const w = el ? el.offsetWidth : Math.min(600, window.innerWidth - 24);
      const h = el ? el.offsetHeight : Math.min(540, window.innerHeight - 40);
      setPos((p) => ({
        x: Math.min(Math.max(12, p.x), Math.max(12, window.innerWidth - w - 12)),
        y: Math.min(Math.max(12, p.y), Math.max(12, window.innerHeight - h - 12)),
      }));
    };
    window.addEventListener('resize', clampToViewport);
    return () => window.removeEventListener('resize', clampToViewport);
  }, []);

  if (!node || (node.type !== 'cylinder_single' && node.type !== 'cylinder_double')) {
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
    const nextX = dragRef.current.origX + (e.clientX - dragRef.current.startX);
    const nextY = dragRef.current.origY + (e.clientY - dragRef.current.startY);
    const maxX = el ? Math.max(8, window.innerWidth - el.offsetWidth - 8) : nextX;
    const maxY = el ? Math.max(8, window.innerHeight - el.offsetHeight - 8) : nextY;
    setPos({
      x: Math.min(Math.max(8, nextX), maxX),
      y: Math.min(Math.max(8, nextY), maxY),
    });
  };

  const handleHeaderPointerUp = () => {
    dragRef.current = null;
  };

  const updateCfg = <K extends keyof CylinderConfig>(key: K, value: CylinderConfig[K]) => {
    setCfg((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectMaterial = (matId: FrictionMaterialId) => {
    const mat = FRICTION_MATERIALS[matId];
    setCfg((prev) => ({
      ...prev,
      frictionMode: 'material',
      frictionMaterial: matId,
      staticFriction: mat.staticCoeff,
      dynamicFriction: mat.dynamicCoeff,
    }));
  };

  const areas = computeCylinderAreasCm2(boreMm, rodMm, cfg.rodType, cfg.throughRod);
  const areaMultiplier = cfg.areaUnit === 'qmm' ? 100 : 1;
  const pistonAreaDisplay = (areas.pistonAreaCm2 * areaMultiplier).toFixed(2);
  const annularAreaDisplay = (areas.annularAreaCm2 * areaMultiplier).toFixed(2);

  const handleSave = () => {
    const nextType: 'cylinder_single' | 'cylinder_double' =
      cfg.cylinderType === 'double' ? 'cylinder_double' : 'cylinder_single';
    onApply(node.id, nextType, label.trim() || node.label, {
      boreMm: Math.max(1, Math.min(1000, boreMm)),
      rodMm: Math.max(0, Math.min(1000, rodMm)),
      strokeMm: Math.max(1, Math.min(5000, strokeMm)),
      loadN,
      cylinderConfig: {
        ...cfg,
        initialPosMm: Math.max(0, Math.min(strokeMm, cfg.initialPosMm)),
      },
    });
    onClose();
  };

  // Force chart geometry
  const chartW = 330;
  const chartH = 170;
  const padL = 38;
  const padR = 12;
  const padT = 10;
  const padB = 26;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const rangeN = Math.max(100, cfg.forceChartRangeN);

  const displayedPoints =
    cfg.forceMode === 'constant'
      ? [
          { posMm: 0, forceN: loadN },
          { posMm: strokeMm, forceN: loadN },
        ]
      : [...cfg.forceProfile].sort((a, b) => a.posMm - b.posMm);

  const toChartX = (mm: number) =>
    padL + (Math.min(strokeMm, Math.max(0, mm)) / Math.max(1, strokeMm)) * plotW;
  const toChartY = (fN: number) => {
    const clamped = Math.min(rangeN, Math.max(-rangeN, fN));
    return padT + ((rangeN - clamped) / (2 * rangeN)) * plotH;
  };

  const handleChartClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (cfg.forceMode !== 'variable' || !canEdit) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * chartW;
    const sy = ((e.clientY - rect.top) / rect.height) * chartH;
    if (sx < padL || sx > chartW - padR || sy < padT || sy > chartH - padB) return;
    const posMm = Math.round(((sx - padL) / plotW) * strokeMm);
    const forceN = Math.round(rangeN - ((sy - padT) / plotH) * 2 * rangeN);
    const next = [...cfg.forceProfile, { posMm, forceN }].sort((a, b) => a.posMm - b.posMm);
    const idx = next.findIndex((p) => p.posMm === posMm && p.forceN === forceN);
    updateCfg('forceProfile', next);
    setSelectedPointIdx(Math.max(0, idx));
  };

  const selectedPt = cfg.forceProfile[selectedPointIdx] ?? null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label="Configurar cilindro"
      data-testid="cylinder-config-dialog"
      style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
      className="fixed top-0 left-0 z-50 w-[calc(100vw-24px)] max-w-[600px] max-h-[calc(100vh-24px)] flex flex-col rounded border border-slate-500 dark:border-slate-700 bg-[#F0F0F0] dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden text-xs"
    >
      {/* Classic Windows Draggable Title Bar */}
      <div
        data-testid="cylinder-config-drag-handle"
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        className="h-8 shrink-0 px-3 bg-white dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between gap-2 cursor-move select-none touch-none"
      >
        <div className="flex items-center gap-2 font-normal text-[12px] text-slate-900 dark:text-white">
          <GripHorizontal className="w-3.5 h-3.5 text-slate-400" />
          <span>Configurar cilindro</span>
        </div>
        <button
          type="button"
          aria-label="Fechar configurar cilindro"
          onClick={onClose}
          className="p-1 rounded hover:bg-red-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 5 Tabs Header */}
      <div className="shrink-0 px-2.5 pt-2 flex flex-wrap sm:flex-nowrap items-end gap-0.5 border-b border-slate-300 dark:border-slate-700 bg-[#F0F0F0] dark:bg-slate-900 overflow-x-auto">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 py-1 text-[11px] rounded-t border transition-colors whitespace-nowrap ${
                active
                  ? 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 border-b-white dark:border-b-slate-950 -mb-px font-medium text-slate-900 dark:text-white'
                  : 'bg-[#E5E5E5] dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Body */}
      <div className="flex-1 min-h-0 p-3 bg-white dark:bg-slate-950 overflow-y-auto space-y-2.5">
        {activeTab === 'config' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Left Column */}
            <div className="space-y-2.5">
              <fieldset className="border border-slate-300 dark:border-slate-700 rounded-sm p-2.5 pt-1.5">
                <legend className="px-1 text-[11px] text-slate-700 dark:text-slate-300">
                  Denominação de componentes
                </legend>
                <input
                  type="text"
                  aria-label="Denominação de componentes"
                  disabled={!canEdit}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full px-2 py-1 border border-sky-500 dark:border-sky-600 rounded-sm bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </fieldset>

              <fieldset className="border border-slate-300 dark:border-slate-700 rounded-sm p-2.5 pt-1.5 space-y-1.5">
                <legend className="px-1 text-[11px] text-slate-700 dark:text-slate-300">
                  Tipo de haste
                </legend>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="rodType"
                    disabled={!canEdit}
                    checked={cfg.rodType === 'single'}
                    onChange={() => updateCfg('rodType', 'single')}
                  />
                  <span>Uma haste</span>
                </label>
                <label
                  className={`flex items-center gap-2 pl-5 ${
                    cfg.rodType !== 'single' ? 'opacity-50' : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!canEdit || cfg.rodType !== 'single'}
                    checked={cfg.rodType === 'single' && cfg.throughRod}
                    onChange={(e) => updateCfg('throughRod', e.target.checked)}
                  />
                  <span>Passante</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                  <input
                    type="radio"
                    name="rodType"
                    disabled={!canEdit}
                    checked={cfg.rodType === 'double'}
                    onChange={() => updateCfg('rodType', 'double')}
                  />
                  <span>Duas hastes</span>
                </label>
                <label
                  className={`flex items-center gap-2 pl-5 ${
                    cfg.rodType !== 'double' ? 'opacity-50' : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!canEdit || cfg.rodType !== 'double'}
                    checked={cfg.rodType === 'double' && cfg.throughRod}
                    onChange={(e) => updateCfg('throughRod', e.target.checked)}
                  />
                  <span>Passante</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                  <input
                    type="radio"
                    name="rodType"
                    disabled={!canEdit}
                    checked={cfg.rodType === 'rodless'}
                    onChange={() =>
                      setCfg((prev) => ({
                        ...prev,
                        rodType: 'rodless',
                        throughRod: false,
                      }))
                    }
                  />
                  <span>Sem haste</span>
                </label>
                <label
                  className={`flex items-center gap-2 pl-5 ${
                    cfg.rodType !== 'rodless' ? 'opacity-50' : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!canEdit || cfg.rodType !== 'rodless'}
                    checked={cfg.magneticCoupling}
                    onChange={(e) => updateCfg('magneticCoupling', e.target.checked)}
                  />
                  <span>com acoplamento magnético</span>
                </label>
                <label
                  className={`flex items-center gap-2 pl-5 ${
                    cfg.rodType !== 'rodless' ? 'opacity-50' : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!canEdit || cfg.rodType !== 'rodless'}
                    checked={cfg.slideGuide}
                    onChange={(e) => updateCfg('slideGuide', e.target.checked)}
                  />
                  <span>com corrediça</span>
                </label>
              </fieldset>

              <fieldset className="border border-slate-300 dark:border-slate-700 rounded-sm p-2.5 pt-1.5 space-y-1.5">
                <legend className="px-1 text-[11px] text-slate-700 dark:text-slate-300">
                  Espelhar
                </legend>
                <label className="flex items-center gap-2 cursor-pointer">
                  <svg viewBox="0 0 24 18" className="w-5 h-4 shrink-0" aria-hidden="true">
                    <line x1="12" y1="1" x2="12" y2="17" stroke="currentColor" strokeWidth="1.3" />
                    <rect x="3" y="3" width="5" height="12" fill="none" stroke="currentColor" strokeWidth="1.2" />
                    <rect x="16" y="3" width="5" height="12" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={cfg.mirrorHorizontal}
                    onChange={(e) => updateCfg('mirrorHorizontal', e.target.checked)}
                  />
                  <span>Horizontal</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <svg viewBox="0 0 24 18" className="w-5 h-4 shrink-0" aria-hidden="true">
                    <line x1="2" y1="9" x2="22" y2="9" stroke="currentColor" strokeWidth="1.3" />
                    <rect x="5" y="2" width="14" height="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
                    <rect x="5" y="12" width="14" height="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={cfg.mirrorVertical}
                    onChange={(e) => updateCfg('mirrorVertical', e.target.checked)}
                  />
                  <span>Vertical</span>
                </label>
              </fieldset>
            </div>

            {/* Right Column */}
            <div className="space-y-2.5 flex flex-col">
              <fieldset className="border border-slate-300 dark:border-slate-700 rounded-sm p-2.5 pt-1.5 space-y-1.5">
                <legend className="px-1 text-[11px] text-slate-700 dark:text-slate-300">
                  Tipo de cilindro
                </legend>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="cylinderType"
                    disabled={!canEdit}
                    checked={cfg.cylinderType === 'single_extend'}
                    onChange={() =>
                      setCfg((prev) => ({
                        ...prev,
                        cylinderType: 'single_extend',
                        springReturn: true,
                      }))
                    }
                  />
                  <span>Simples ação (Avançando)</span>
                </label>
                <label
                  className={`flex items-center gap-2 pl-5 ${
                    cfg.cylinderType !== 'single_extend' ? 'opacity-50' : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!canEdit || cfg.cylinderType !== 'single_extend'}
                    checked={cfg.cylinderType === 'single_extend' && cfg.springReturn}
                    onChange={(e) => updateCfg('springReturn', e.target.checked)}
                  />
                  <span>Mola de retorno</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                  <input
                    type="radio"
                    name="cylinderType"
                    disabled={!canEdit}
                    checked={cfg.cylinderType === 'single_retract'}
                    onChange={() =>
                      setCfg((prev) => ({
                        ...prev,
                        cylinderType: 'single_retract',
                        springReturn: true,
                      }))
                    }
                  />
                  <span>Simples ação (Recuando)</span>
                </label>
                <label
                  className={`flex items-center gap-2 pl-5 ${
                    cfg.cylinderType !== 'single_retract' ? 'opacity-50' : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!canEdit || cfg.cylinderType !== 'single_retract'}
                    checked={cfg.cylinderType === 'single_retract' && cfg.springReturn}
                    onChange={(e) => updateCfg('springReturn', e.target.checked)}
                  />
                  <span>Mola de retorno</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                  <input
                    type="radio"
                    name="cylinderType"
                    disabled={!canEdit}
                    checked={cfg.cylinderType === 'double'}
                    onChange={() =>
                      setCfg((prev) => ({
                        ...prev,
                        cylinderType: 'double',
                        springReturn: false,
                      }))
                    }
                  />
                  <span>Dupla ação</span>
                </label>
              </fieldset>

              <fieldset className="border border-slate-300 dark:border-slate-700 rounded-sm p-2.5 pt-1.5 space-y-1.5">
                <legend className="px-1 text-[11px] text-slate-700 dark:text-slate-300">
                  Propriedades
                </legend>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={cfg.cushioning}
                    onChange={(e) => updateCfg('cushioning', e.target.checked)}
                  />
                  <span>Amortecimento</span>
                </label>
                <label
                  className={`flex items-center gap-2 pl-5 ${
                    !cfg.cushioning ? 'opacity-50' : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!canEdit || !cfg.cushioning}
                    checked={cfg.cushioning && cfg.cushioningAdjustable}
                    onChange={(e) => updateCfg('cushioningAdjustable', e.target.checked)}
                  />
                  <span>ajustável</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={cfg.sensing}
                    onChange={(e) => updateCfg('sensing', e.target.checked)}
                  />
                  <span>Detecção</span>
                </label>
                <div className="flex items-center gap-2 pl-5">
                  <span className={!cfg.sensing ? 'opacity-50' : ''}>Marca</span>
                  <input
                    type="text"
                    disabled={!canEdit || !cfg.sensing}
                    value={cfg.sensingMark}
                    onChange={(e) => updateCfg('sensingMark', e.target.value)}
                    className="flex-1 min-w-0 px-2 py-0.5 border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 disabled:opacity-50 text-xs"
                  />
                </div>
              </fieldset>

              {/* Dynamic ISO Schematic Preview Box */}
              <div className="flex-1 min-h-[78px] border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 flex items-center justify-center p-2">
                <svg viewBox="-90 -36 180 72" className="w-44 h-16">
                  <g
                    transform={`scale(${cfg.mirrorHorizontal ? -1 : 1}, ${
                      cfg.mirrorVertical ? -1 : 1
                    })`}
                    stroke={isDark ? '#E2E8F0' : '#0F172A'}
                    fill="none"
                    strokeWidth="1.6"
                  >
                    <rect x="-52" y="-16" width="84" height="32" />
                    <line x1="-26" y1="-16" x2="-26" y2="16" strokeWidth="2.4" />
                    {cfg.sensing && (
                      <rect x="-24" y="-14" width="5" height="5" fill="#0284C7" stroke="none" />
                    )}
                    {cfg.cushioning && (
                      <>
                        <rect x="-32" y="-7" width="4" height="14" fill="currentColor" opacity="0.3" />
                        <rect x="-22" y="-7" width="4" height="14" fill="currentColor" opacity="0.3" />
                        {cfg.cushioningAdjustable && (
                          <>
                            <line x1="-38" y1="18" x2="-16" y2="-22" strokeWidth="1.2" />
                            <polygon points="-16,-22 -21,-17 -15,-15" fill="currentColor" stroke="none" />
                          </>
                        )}
                      </>
                    )}
                    {(cfg.springReturn || cfg.cylinderType !== 'double') && (
                      <polyline
                        points="-18,0 -11,-9 -4,9 3,-9 10,9 17,-9 24,0"
                        strokeWidth="1.3"
                      />
                    )}
                    {cfg.rodType !== 'rodless' && (
                      <>
                        <rect x="-22" y="-4" width="90" height="8" fill={isDark ? '#1E293B' : '#FFFFFF'} />
                        {cfg.rodType === 'double' && (
                          <rect x="-22" y="-10" width="90" height="4" fill={isDark ? '#1E293B' : '#FFFFFF'} />
                        )}
                        {cfg.throughRod && (
                          <rect x="-74" y="-4" width="48" height="8" fill={isDark ? '#1E293B' : '#FFFFFF'} />
                        )}
                      </>
                    )}
                    <line x1="-44" y1="16" x2="-44" y2="26" />
                    {cfg.cylinderType === 'double' && <line x1="24" y1="16" x2="24" y2="26" />}
                  </g>
                </svg>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'params' && (
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_92px_1fr] items-center gap-x-2.5 gap-y-2">
              <label htmlFor="cyl-stroke" className="text-right text-slate-700 dark:text-slate-300">
                Curso máximo do êmbolo
              </label>
              <input
                id="cyl-stroke"
                type="number"
                min={1}
                max={5000}
                disabled={!canEdit}
                value={strokeMm}
                onChange={(e) => setStrokeMm(Math.max(1, Number(e.target.value)))}
                className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 text-right font-mono"
              />
              <span className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-slate-50 dark:bg-slate-800 text-[11px]">
                mm (1..5000)
              </span>

              <label htmlFor="cyl-pos" className="text-right text-slate-700 dark:text-slate-300">
                Posição do pistão
              </label>
              <input
                id="cyl-pos"
                type="number"
                min={0}
                max={strokeMm}
                disabled={!canEdit}
                value={cfg.initialPosMm}
                onChange={(e) =>
                  updateCfg('initialPosMm', Math.max(0, Math.min(strokeMm, Number(e.target.value))))
                }
                className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 text-right font-mono"
              />
              <span className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-slate-50 dark:bg-slate-800 text-[11px]">
                mm (0..{strokeMm})
              </span>

              <label htmlFor="cyl-bore" className="text-right text-slate-700 dark:text-slate-300">
                Diâmetro do êmbolo
              </label>
              <input
                id="cyl-bore"
                type="number"
                min={1}
                max={1000}
                disabled={!canEdit}
                value={boreMm}
                onChange={(e) => setBoreMm(Math.max(1, Number(e.target.value)))}
                className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 text-right font-mono"
              />
              <span className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-slate-50 dark:bg-slate-800 text-[11px]">
                mm (1..1000)
              </span>

              <label htmlFor="cyl-rod" className="text-right text-slate-700 dark:text-slate-300">
                Diâmetro da haste
              </label>
              <input
                id="cyl-rod"
                type="number"
                min={0}
                max={1000}
                disabled={!canEdit || cfg.rodType === 'rodless'}
                value={cfg.rodType === 'rodless' ? 0 : rodMm}
                onChange={(e) => setRodMm(Math.max(0, Number(e.target.value)))}
                className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 text-right font-mono disabled:opacity-50"
              />
              <span className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-slate-50 dark:bg-slate-800 text-[11px]">
                mm (0..1000)
              </span>

              <label htmlFor="cyl-angle" className="text-right text-slate-700 dark:text-slate-300">
                Ângulo de montagem
              </label>
              <input
                id="cyl-angle"
                type="number"
                min={0}
                max={360}
                disabled={!canEdit}
                value={cfg.mountingAngleDeg}
                onChange={(e) =>
                  updateCfg('mountingAngleDeg', Math.max(0, Math.min(360, Number(e.target.value))))
                }
                className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 text-right font-mono"
              />
              <span className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-slate-50 dark:bg-slate-800 text-[11px]">
                Graus angulares (Deg) (0..360)
              </span>

              <label htmlFor="cyl-leak" className="text-right text-slate-700 dark:text-slate-300">
                Vazamentos internos
              </label>
              <input
                id="cyl-leak"
                type="number"
                min={0}
                max={100}
                step={0.1}
                disabled={!canEdit}
                value={cfg.internalLeakage}
                onChange={(e) =>
                  updateCfg('internalLeakage', Math.max(0, Math.min(100, Number(e.target.value))))
                }
                className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 text-right font-mono"
              />
              <span className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-slate-50 dark:bg-slate-800 text-[11px]">
                l/(min*MPa) (0..100)
              </span>
            </div>

            <fieldset className="border border-slate-300 dark:border-slate-700 rounded-sm p-2.5 pt-1.5">
              <legend className="px-1 text-[11px] text-slate-700 dark:text-slate-300">
                Parâmetros calculados
              </legend>
              <div className="grid grid-cols-[1fr_92px_120px] items-center gap-x-2.5 gap-y-2">
                <span className="text-right text-slate-700 dark:text-slate-300">
                  Área do pistão
                </span>
                <input
                  type="text"
                  readOnly
                  value={pistonAreaDisplay}
                  className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-slate-50 dark:bg-slate-900 text-right font-mono"
                />
                <select
                  aria-label="Unidade de área do pistão"
                  value={cfg.areaUnit}
                  onChange={(e) => updateCfg('areaUnit', e.target.value as 'qcm' | 'qmm')}
                  className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 text-[11px]"
                >
                  <option value="qcm">qcm (cm²)</option>
                  <option value="qmm">mm²</option>
                </select>

                <span className="text-right text-slate-700 dark:text-slate-300">
                  Área anular
                </span>
                <input
                  type="text"
                  readOnly
                  value={annularAreaDisplay}
                  className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-slate-50 dark:bg-slate-900 text-right font-mono"
                />
                <select
                  aria-label="Unidade de área anular"
                  value={cfg.areaUnit}
                  onChange={(e) => updateCfg('areaUnit', e.target.value as 'qcm' | 'qmm')}
                  className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 text-[11px]"
                >
                  <option value="qcm">qcm (cm²)</option>
                  <option value="qmm">mm²</option>
                </select>
              </div>
            </fieldset>

            <fieldset className="border border-slate-300 dark:border-slate-700 rounded-sm p-2.5 pt-1.5 space-y-1">
              <legend className="px-1 text-[11px] text-slate-700 dark:text-slate-300">
                Mostrar valores
              </legend>
              <div className="pl-20 space-y-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={cfg.showVelocity}
                    onChange={(e) => updateCfg('showVelocity', e.target.checked)}
                  />
                  <span>Velocidade [m/s]</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={cfg.showForce}
                    onChange={(e) => updateCfg('showForce', e.target.checked)}
                  />
                  <span>Força [N]</span>
                </label>
              </div>
            </fieldset>
          </div>
        )}

        {activeTab === 'load' && (
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_92px_1fr] items-center gap-2.5">
              <label htmlFor="cyl-mass" className="text-right text-slate-700 dark:text-slate-300">
                Massa em movimento
              </label>
              <input
                id="cyl-mass"
                type="number"
                min={0}
                max={10000}
                disabled={!canEdit}
                value={cfg.movingMassKg}
                onChange={(e) =>
                  updateCfg('movingMassKg', Math.max(0, Math.min(10000, Number(e.target.value))))
                }
                className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 text-right font-mono"
              />
              <span className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-slate-50 dark:bg-slate-800 text-[11px]">
                kg (0..10000)
              </span>
            </div>

            <fieldset className="border border-slate-300 dark:border-slate-700 rounded-sm p-2.5 pt-1.5 space-y-2">
              <legend className="px-1 text-[11px] text-slate-700 dark:text-slate-300">
                Atrito
              </legend>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="frictionMode"
                  disabled={!canEdit}
                  checked={cfg.frictionMode === 'material'}
                  onChange={() => handleSelectMaterial(cfg.frictionMaterial)}
                />
                <span>Selecionar material</span>
              </label>

              <div
                className={`pl-16 space-y-1 ${
                  cfg.frictionMode !== 'material' ? 'opacity-50' : ''
                }`}
              >
                {(Object.keys(FRICTION_MATERIALS) as FrictionMaterialId[]).map((matId) => (
                  <label key={matId} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="frictionMaterial"
                      disabled={!canEdit || cfg.frictionMode !== 'material'}
                      checked={cfg.frictionMaterial === matId}
                      onChange={() => handleSelectMaterial(matId)}
                    />
                    <span>{FRICTION_MATERIALS[matId].label}</span>
                  </label>
                ))}
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="radio"
                  name="frictionMode"
                  disabled={!canEdit}
                  checked={cfg.frictionMode === 'manual'}
                  onChange={() => updateCfg('frictionMode', 'manual')}
                />
                <span>Inserir manualmente</span>
              </label>

              <div
                className={`grid grid-cols-[1fr_92px_50px] items-center gap-2 pl-6 ${
                  cfg.frictionMode !== 'manual' ? 'opacity-50' : ''
                }`}
              >
                <label htmlFor="cyl-fstatic" className="text-right">
                  Coeficiente de atrito estático
                </label>
                <input
                  id="cyl-fstatic"
                  type="number"
                  min={0}
                  max={2}
                  step={0.01}
                  disabled={!canEdit || cfg.frictionMode !== 'manual'}
                  value={cfg.staticFriction}
                  onChange={(e) =>
                    updateCfg('staticFriction', Math.max(0, Math.min(2, Number(e.target.value))))
                  }
                  className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 text-right font-mono"
                />
                <span className="text-[11px] text-slate-500">(0..2)</span>

                <label htmlFor="cyl-fdyn" className="text-right">
                  Coeficiente de atrito dinâmico
                </label>
                <input
                  id="cyl-fdyn"
                  type="number"
                  min={0}
                  max={2}
                  step={0.01}
                  disabled={!canEdit || cfg.frictionMode !== 'manual'}
                  value={cfg.dynamicFriction}
                  onChange={(e) =>
                    updateCfg('dynamicFriction', Math.max(0, Math.min(2, Number(e.target.value))))
                  }
                  className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 text-right font-mono"
                />
                <span className="text-[11px] text-slate-500">(0..2)</span>
              </div>
            </fieldset>

            <fieldset className="border border-slate-300 dark:border-slate-700 rounded-sm p-2.5 pt-1.5">
              <legend className="px-1 text-[11px] text-slate-700 dark:text-slate-300">Nota</legend>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                O cálculo da força de atrito também depende do ângulo de montagem do cilindro (ver
                &quot;Parâmetros&quot;).
              </p>
            </fieldset>
          </div>
        )}

        {activeTab === 'force' && (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="forceMode"
                  disabled={!canEdit}
                  checked={cfg.forceMode === 'constant'}
                  onChange={() => updateCfg('forceMode', 'constant')}
                />
                <span>Força constante</span>
              </label>
              <input
                type="number"
                aria-label="Valor da força constante"
                min={-1000000}
                max={1000000}
                disabled={!canEdit || cfg.forceMode !== 'constant'}
                value={loadN}
                onChange={(e) => setLoadN(Number(e.target.value))}
                className="w-24 px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 text-right font-mono disabled:opacity-50"
              />
              <span className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-slate-50 dark:bg-slate-800 text-[11px]">
                N (-1000000..1000000)
              </span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="forceMode"
                disabled={!canEdit}
                checked={cfg.forceMode === 'variable'}
                onChange={() => updateCfg('forceMode', 'variable')}
              />
              <span>Força variável (clique no gráfico para adicionar pontos)</span>
            </label>

            <div className="grid grid-cols-[1fr_76px] gap-2.5 items-stretch">
              <div className="border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 p-1.5">
                <svg
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  onClick={handleChartClick}
                  className={`w-full h-44 ${
                    cfg.forceMode === 'variable' ? 'cursor-crosshair' : 'cursor-default'
                  }`}
                >
                  {/* Grid lines */}
                  {Array.from({ length: 11 }, (_, i) => {
                    const y = padT + (i / 10) * plotH;
                    const x = padL + (i / 10) * plotW;
                    const yVal = Math.round(rangeN - (i / 10) * 2 * rangeN);
                    const xVal = Math.round((i / 10) * strokeMm);
                    return (
                      <g key={i}>
                        <line
                          x1={padL}
                          y1={y}
                          x2={chartW - padR}
                          y2={y}
                          stroke={i === 5 ? '#64748B' : isDark ? '#1E293B' : '#CBD5E1'}
                          strokeWidth={i === 5 ? 1.2 : 0.7}
                        />
                        <line
                          x1={x}
                          y1={padT}
                          x2={x}
                          y2={chartH - padB}
                          stroke={isDark ? '#1E293B' : '#CBD5E1'}
                          strokeWidth={0.7}
                        />
                        {i % 2 === 0 && (
                          <text
                            x={padL - 4}
                            y={y + 3}
                            textAnchor="end"
                            fontSize={8}
                            fill={isDark ? '#94A3B8' : '#334155'}
                          >
                            {yVal}
                          </text>
                        )}
                        <text
                          x={x}
                          y={chartH - padB + 11}
                          textAnchor="middle"
                          fontSize={7.5}
                          fill={isDark ? '#94A3B8' : '#334155'}
                        >
                          {xVal}
                        </text>
                      </g>
                    );
                  })}

                  <rect
                    x={padL}
                    y={padT}
                    width={plotW}
                    height={plotH}
                    fill="none"
                    stroke={isDark ? '#475569' : '#64748B'}
                    strokeWidth={1.4}
                  />

                  {/* Polyline curve */}
                  {displayedPoints.length >= 2 && (
                    <polyline
                      fill="none"
                      stroke="#0284C7"
                      strokeWidth={2}
                      points={displayedPoints
                        .map((pt) => `${toChartX(pt.posMm)},${toChartY(pt.forceN)}`)
                        .join(' ')}
                    />
                  )}

                  {/* Vertex Markers */}
                  {displayedPoints.map((pt, idx) => {
                    const cx = toChartX(pt.posMm);
                    const cy = toChartY(pt.forceN);
                    const isSel = cfg.forceMode === 'variable' && idx === selectedPointIdx;
                    return (
                      <polygon
                        key={idx}
                        points={`${cx},${cy - 4} ${cx + 4},${cy} ${cx},${cy + 4} ${cx - 4},${cy}`}
                        fill={isSel ? '#0284C7' : isDark ? '#E2E8F0' : '#0F172A'}
                        stroke="#FFFFFF"
                        strokeWidth={0.8}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setSelectedPointIdx(idx);
                        }}
                      />
                    );
                  })}

                  <text
                    x={padL + plotW / 2}
                    y={chartH - 3}
                    textAnchor="middle"
                    fontSize={8.5}
                    fill={isDark ? '#CBD5E1' : '#0F172A'}
                  >
                    Posição do pistão [mm]
                  </text>
                  <text
                    x={10}
                    y={padT + plotH / 2}
                    textAnchor="middle"
                    fontSize={8.5}
                    fill={isDark ? '#CBD5E1' : '#0F172A'}
                    transform={`rotate(-90, 10, ${padT + plotH / 2})`}
                  >
                    Força [N]
                  </text>
                </svg>
              </div>

              {/* Right Rango Slider */}
              <fieldset className="border border-slate-300 dark:border-slate-700 rounded-sm p-2 pt-1 flex flex-col items-center justify-between">
                <legend className="px-1 text-[10px] text-slate-700 dark:text-slate-300">
                  Faixa
                </legend>
                <input
                  type="range"
                  aria-label="Faixa do gráfico de força"
                  min={100}
                  max={10000}
                  step={100}
                  value={cfg.forceChartRangeN}
                  onChange={(e) => updateCfg('forceChartRangeN', Number(e.target.value))}
                  style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                  className="h-32 accent-sky-600 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-slate-500">±{rangeN}N</span>
              </fieldset>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <span className={cfg.forceMode !== 'variable' ? 'opacity-50' : ''}>
                  Posição do pistão
                </span>
                <input
                  type="number"
                  disabled={!canEdit || cfg.forceMode !== 'variable' || !selectedPt}
                  value={selectedPt?.posMm ?? ''}
                  onChange={(e) => {
                    if (!selectedPt) return;
                    const next = [...cfg.forceProfile];
                    next[selectedPointIdx] = {
                      ...selectedPt,
                      posMm: Math.max(0, Math.min(strokeMm, Number(e.target.value))),
                    };
                    updateCfg('forceProfile', next);
                  }}
                  className="w-16 px-1.5 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 font-mono disabled:opacity-50"
                />
                <span className="text-[11px] text-slate-500">mm</span>
                <span className={cfg.forceMode !== 'variable' ? 'opacity-50 ml-1' : 'ml-1'}>
                  Força
                </span>
                <input
                  type="number"
                  disabled={!canEdit || cfg.forceMode !== 'variable' || !selectedPt}
                  value={selectedPt?.forceN ?? ''}
                  onChange={(e) => {
                    if (!selectedPt) return;
                    const next = [...cfg.forceProfile];
                    next[selectedPointIdx] = { ...selectedPt, forceN: Number(e.target.value) };
                    updateCfg('forceProfile', next);
                  }}
                  className="w-16 px-1.5 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 font-mono disabled:opacity-50"
                />
                <span className="text-[11px] text-slate-500">N</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={
                    !canEdit || cfg.forceMode !== 'variable' || cfg.forceProfile.length <= 2
                  }
                  onClick={() => {
                    const next = cfg.forceProfile.filter((_, i) => i !== selectedPointIdx);
                    updateCfg('forceProfile', next);
                    setSelectedPointIdx(0);
                  }}
                  className="px-2.5 py-1 rounded-sm border border-slate-300 dark:border-slate-700 bg-[#E5E5E5] dark:bg-slate-800 disabled:opacity-45 hover:bg-slate-200 text-[11px]"
                >
                  Excluir
                </button>
                <button
                  type="button"
                  disabled={!canEdit || cfg.forceMode !== 'variable'}
                  onClick={() => {
                    updateCfg('forceProfile', [
                      { posMm: 0, forceN: 0 },
                      { posMm: strokeMm, forceN: 0 },
                    ]);
                    setSelectedPointIdx(0);
                  }}
                  className="px-2.5 py-1 rounded-sm border border-slate-300 dark:border-slate-700 bg-[#E5E5E5] dark:bg-slate-800 disabled:opacity-45 hover:bg-slate-200 text-[11px]"
                >
                  Limpar tudo
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'labels' && (
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_80px_80px_115px] gap-2 text-center text-[11px] font-medium text-slate-700 dark:text-slate-300">
              <div className="text-left">Marca</div>
              <div>Início</div>
              <div>Fim</div>
              <div />
            </div>

            <div className="space-y-1.5">
              {cfg.actuationLabels.map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_80px_80px_115px] items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-sm p-1 bg-slate-50/50 dark:bg-slate-900/50"
                >
                  <input
                    type="text"
                    placeholder={idx === 0 ? 'ex: 1S1' : ''}
                    disabled={!canEdit}
                    value={row.mark}
                    onChange={(e) => {
                      const next = [...cfg.actuationLabels];
                      next[idx] = { ...row, mark: e.target.value };
                      updateCfg('actuationLabels', next);
                    }}
                    className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-950 text-xs"
                  />
                  <input
                    type="number"
                    min={0}
                    max={strokeMm}
                    disabled={!canEdit}
                    value={row.startMm}
                    onChange={(e) => {
                      const next = [...cfg.actuationLabels];
                      next[idx] = { ...row, startMm: e.target.value };
                      updateCfg('actuationLabels', next);
                    }}
                    className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-950 text-right font-mono text-xs"
                  />
                  <input
                    type="number"
                    min={0}
                    max={strokeMm}
                    disabled={!canEdit}
                    value={row.endMm}
                    onChange={(e) => {
                      const next = [...cfg.actuationLabels];
                      next[idx] = { ...row, endMm: e.target.value };
                      updateCfg('actuationLabels', next);
                    }}
                    className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-950 text-right font-mono text-xs"
                  />
                  <span className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-sm bg-slate-100 dark:bg-slate-800 text-[11px] font-mono truncate">
                    mm (0..{strokeMm})
                  </span>
                </div>
              ))}
            </div>

            <fieldset className="border border-slate-300 dark:border-slate-700 rounded-sm p-2.5 pt-1.5">
              <legend className="px-1 text-[11px] text-slate-700 dark:text-slate-300">
                Componentes correspondentes
              </legend>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-14 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col items-center justify-center rounded-sm">
                  <svg viewBox="0 0 60 36" className="w-14 h-9" stroke="currentColor" fill="none" strokeWidth="1.3">
                    <line x1="12" y1="6" x2="12" y2="14" />
                    <line x1="12" y1="14" x2="7" y2="26" />
                    <line x1="12" y1="26" x2="12" y2="32" />
                    <line x1="30" y1="6" x2="30" y2="14" />
                    <line x1="30" y1="14" x2="35" y2="26" />
                    <line x1="30" y1="26" x2="30" y2="32" />
                    <line x1="48" y1="6" x2="48" y2="14" />
                    <line x1="48" y1="14" x2="42" y2="26" />
                    <line x1="48" y1="26" x2="48" y2="32" />
                  </svg>
                </div>
                <div className="h-14 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col items-center justify-center rounded-sm">
                  <svg viewBox="0 0 60 36" className="w-14 h-9" stroke="currentColor" fill="none" strokeWidth="1.3">
                    <rect x="16" y="4" width="28" height="28" />
                    <polygon points="30,7 34,11 30,15 26,11" />
                    <line x1="20" y1="24" x2="38" y2="24" />
                    <line x1="20" y1="24" x2="35" y2="19" />
                  </svg>
                </div>
                <div className="h-14 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col items-center justify-center rounded-sm">
                  <svg viewBox="0 0 60 36" className="w-14 h-9" stroke="currentColor" fill="none" strokeWidth="1.3">
                    <rect x="16" y="10" width="28" height="16" />
                    <rect x="8" y="14" width="8" height="8" rx="3" />
                  </svg>
                </div>
              </div>
            </fieldset>
          </div>
        )}

        {showHelp && (
          <div className="p-2.5 rounded-sm border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 text-[11px] text-slate-700 dark:text-sky-200 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <span>{HELP_TEXT[activeTab]}</span>
          </div>
        )}
      </div>

      {/* Classic Windows OK / Cancelar / Ajuda Footer */}
      <div className="px-3 py-2 bg-[#F0F0F0] dark:bg-slate-900 border-t border-slate-300 dark:border-slate-700 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canEdit}
          className="min-w-[76px] px-3 py-1 rounded-sm border-2 border-sky-600 bg-[#E5E5E5] dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-xs font-medium disabled:opacity-50"
        >
          OK
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-w-[76px] px-3 py-1 rounded-sm border border-slate-400 dark:border-slate-600 bg-[#E5E5E5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          className="min-w-[76px] px-3 py-1 rounded-sm border border-slate-400 dark:border-slate-600 bg-[#E5E5E5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs"
        >
          Ajuda
        </button>
      </div>
    </div>
  );
};
