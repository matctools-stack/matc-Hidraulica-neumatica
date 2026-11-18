import React, { useEffect, useRef, useState } from 'react';
import {
  Copy,
  GripHorizontal,
  RotateCw,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from 'lucide-react';
import {
  COMPONENT_CATALOG,
  getEffectiveValveConfig,
  getValveActuationBehavior,
  hasConfiguredActuatorSide,
  isDirectionalValveType,
  isFeedDialogComponent,
  isInteractiveToggleType,
  isLatchingSwitchType,
  isMomentarySwitchType,
  isPropertyDialogComponent,
} from '../engine/fluidSolver';
import type {
  CircuitNode,
  ComponentParams,
  FluidMedium,
  PipeConnection,
  SimulationState,
} from '../types/circuit';
import { ComponentSymbolThumb } from './ComponentSymbolThumb';

interface FloatingInspectorProps {
  open: boolean;
  selectedNode: CircuitNode | null;
  selectedPipe: PipeConnection | null;
  simState: SimulationState;
  fluid: FluidMedium;
  canEdit: boolean;
  isDark?: boolean;
  onClose: () => void;
  onOpenCylinderConfig?: (nodeId: string) => void;
  onOpenValveConfig?: (nodeId: string) => void;
  onOpenMechanicalConnection?: (nodeId: string, side: 'left' | 'right') => void;
  onOpenPropertyConfig?: (nodeId: string) => void;
  onOpenPortConfig?: (nodeId: string, portId: string) => void;
  onUpdateParams: (nodeId: string, params: Partial<ComponentParams>) => void;
  onToggleValve?: (nodeId: string, sideHint?: 'left' | 'right' | 'cycle') => void;
  onPressMomentaryActuator?: (nodeId: string, sideHint?: 'left' | 'right' | 'cycle') => void;
  onReleaseMomentaryActuator?: (nodeId: string, sideHint?: 'left' | 'right' | 'cycle') => void;
  onUpdateLabel: (nodeId: string, label: string) => void;
  onRotateNode: (nodeId: string) => void;
  onCopyNode?: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeletePipe: (pipeId: string) => void;
}

export const FloatingInspector: React.FC<FloatingInspectorProps> = ({
  open,
  selectedNode,
  selectedPipe,
  simState,
  fluid,
  canEdit,
  isDark = false,
  onClose,
  onOpenCylinderConfig,
  onOpenValveConfig,
  onOpenMechanicalConnection,
  onOpenPropertyConfig,
  onOpenPortConfig,
  onUpdateParams,
  onToggleValve,
  onPressMomentaryActuator,
  onReleaseMomentaryActuator,
  onUpdateLabel,
  onRotateNode,
  onCopyNode,
  onDeleteNode,
  onDeletePipe,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return { x: Math.max(24, Math.min(640, window.innerWidth - 700)), y: 20 };
    }
    return { x: 12, y: 48 };
  });

  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Clamp inspector position inside parent workspace whenever opened or resized
  useEffect(() => {
    if (!open) return;
    const clampToParent = () => {
      const el = panelRef.current;
      const parent = el?.parentElement;
      if (!el || !parent) return;
      const maxX = Math.max(8, parent.clientWidth - el.offsetWidth - 8);
      const maxY = Math.max(8, parent.clientHeight - el.offsetHeight - 8);
      setPos((curr) => ({
        x: Math.min(Math.max(8, curr.x), maxX),
        y: Math.min(Math.max(8, curr.y), maxY),
      }));
    };
    const raf = requestAnimationFrame(clampToParent);
    window.addEventListener('resize', clampToParent);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', clampToParent);
    };
  }, [open, selectedNode?.id]);

  if (!open) return null;

  const maxBar = fluid === 'hydraulic' ? 250 : 16;

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
    const parent = el?.parentElement;
    const nextX = dragRef.current.origX + (e.clientX - dragRef.current.startX);
    const nextY = dragRef.current.origY + (e.clientY - dragRef.current.startY);
    const maxX = parent && el ? Math.max(8, parent.clientWidth - el.offsetWidth - 8) : nextX;
    const maxY = parent && el ? Math.max(8, parent.clientHeight - el.offsetHeight - 8) : nextY;
    setPos({
      x: Math.min(Math.max(8, nextX), maxX),
      y: Math.min(Math.max(8, nextY), maxY),
    });
  };

  const handleHeaderPointerUp = () => {
    dragRef.current = null;
  };

  const nodeRt = selectedNode ? simState.nodes[selectedNode.id] : undefined;

  return (
    <aside
      ref={panelRef}
      data-testid="floating-inspector"
      aria-label="Propriedades e Telemetria"
      style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
      className="absolute top-0 left-0 z-30 w-[calc(100%-24px)] sm:w-80 max-h-[82vh] rounded border border-slate-400 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl flex flex-col overflow-hidden"
    >
      <div
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        className="h-8 shrink-0 px-2.5 bg-gradient-to-b from-[#DCE6F2] to-[#C2D4EA] dark:from-slate-800 dark:to-slate-800 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between gap-2 cursor-move select-none touch-none"
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white min-w-0">
          <GripHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <Sliders className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="truncate">Propriedades e Telemetria</span>
        </div>
        <button
          type="button"
          aria-label="Fechar propriedades"
          onClick={onClose}
          className="p-1 rounded hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-200 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] text-slate-500">Pressão Máx.</div>
            <div className="text-sm font-mono font-semibold">
              {simState.maxSystemPressureBar.toFixed(1)} bar
            </div>
          </div>
          <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] text-slate-500">Vazão Total</div>
            <div className="text-sm font-mono font-semibold">
              {simState.totalFlowLpm.toFixed(1)} L/min
            </div>
          </div>
        </div>

        {selectedPipe && !selectedNode && (
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Tubulação Selecionada</span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onDeletePipe(selectedPipe.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-red-50 dark:bg-red-950/50 text-red-600 text-xs font-medium"
                >
                  <Trash2 className="w-3 h-3" /> Remover
                </button>
              )}
            </div>
            <div className="text-xs font-mono space-y-1 text-slate-600 dark:text-slate-300">
              <div>Pressão: {(simState.pipes[selectedPipe.id]?.pressureBar ?? 0).toFixed(2)} bar</div>
              <div>Vazão: {(simState.pipes[selectedPipe.id]?.flowLpm ?? 0).toFixed(2)} L/min</div>
            </div>
          </div>
        )}

        {selectedNode ? (
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-12 h-10 shrink-0 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                  <ComponentSymbolThumb
                    type={selectedNode.type}
                    isDark={isDark}
                    valveConfig={selectedNode.params.valveConfig}
                    cylinderConfig={selectedNode.params.cylinderConfig}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-sky-600 dark:text-sky-400 truncate">
                    {COMPONENT_CATALOG[selectedNode.type].name}
                  </div>
                  <div className="text-sm font-semibold truncate">{selectedNode.label}</div>
                  <div className="text-[10px] font-mono text-slate-500">
                    Rot: {selectedNode.rotation}° · Vazão: {(nodeRt?.flowLpm ?? 0).toFixed(1)} L/min
                  </div>
                </div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  {onCopyNode && (
                    <button
                      type="button"
                      title="Copiar (Ctrl+C)"
                      aria-label="Copiar componente"
                      onClick={() => onCopyNode(selectedNode.id)}
                      className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Rotacionar 90°"
                    aria-label="Rotacionar componente 90 graus"
                    onClick={() => onRotateNode(selectedNode.id)}
                    className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Excluir (Delete)"
                    aria-label="Excluir componente"
                    onClick={() => onDeleteNode(selectedNode.id)}
                    className="p-1.5 rounded border border-red-200 dark:border-red-900/60 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="flt-label" className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                Denominação / Tag
              </label>
              <input
                id="flt-label"
                type="text"
                disabled={!canEdit}
                value={selectedNode.label}
                onChange={(e) => onUpdateLabel(selectedNode.id, e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
            </div>

            {(selectedNode.type === 'pump' ||
              selectedNode.type === 'pump_variable' ||
              selectedNode.type === 'pump_prop' ||
              selectedNode.type === 'power_unit' ||
              selectedNode.type === 'power_unit_simple' ||
              selectedNode.type === 'compressor' ||
              selectedNode.type === 'regulator' ||
              selectedNode.type === 'prop_pressure_reducer' ||
              selectedNode.type === 'pressure_reducer_2' ||
              selectedNode.type === 'pressure_reducer_3') && (
              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span>Pressão Nominal</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        aria-label="Pressão Alvo Numérica"
                        disabled={!canEdit}
                        min={1}
                        max={maxBar}
                        value={selectedNode.params.targetPressure ?? 10}
                        onChange={(e) =>
                          onUpdateParams(selectedNode.id, {
                            targetPressure: Math.max(1, Math.min(maxBar, Number(e.target.value) || 1)),
                          })
                        }
                        className="w-16 px-1.5 py-0.5 text-right font-mono text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                      <span className="text-[11px] font-mono text-slate-500">bar</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    aria-label="Pressão Alvo"
                    disabled={!canEdit}
                    min={1}
                    max={maxBar}
                    value={selectedNode.params.targetPressure ?? 10}
                    onChange={(e) =>
                      onUpdateParams(selectedNode.id, { targetPressure: Number(e.target.value) })
                    }
                    className="w-full accent-sky-600"
                  />
                </div>
                {selectedNode.type !== 'regulator' &&
                  selectedNode.type !== 'prop_pressure_reducer' &&
                  selectedNode.type !== 'pressure_reducer_2' &&
                  selectedNode.type !== 'pressure_reducer_3' && (
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span>Vazão Máxima</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          aria-label="Vazão Máxima Numérica"
                          disabled={!canEdit}
                          min={2}
                          max={fluid === 'hydraulic' ? 120 : 400}
                          value={selectedNode.params.maxFlow ?? 24}
                          onChange={(e) =>
                            onUpdateParams(selectedNode.id, {
                              maxFlow: Math.max(2, Number(e.target.value) || 2),
                            })
                          }
                          className="w-16 px-1.5 py-0.5 text-right font-mono text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                        />
                        <span className="text-[11px] font-mono text-slate-500">L/m</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      aria-label="Vazão Máxima"
                      disabled={!canEdit}
                      min={4}
                      max={fluid === 'hydraulic' ? 80 : 300}
                      step={2}
                      value={selectedNode.params.maxFlow ?? 24}
                      onChange={(e) =>
                        onUpdateParams(selectedNode.id, { maxFlow: Number(e.target.value) })
                      }
                      className="w-full accent-sky-600"
                    />
                  </div>
                )}
              </div>
            )}

            {isDirectionalValveType(selectedNode.type) && (() => {
              const behavior = getValveActuationBehavior(selectedNode);
              const currentPos =
                nodeRt?.activeSpoolPos !== undefined
                  ? nodeRt.activeSpoolPos
                  : behavior.isThreePos
                    ? Math.max(0, Math.min(2, selectedNode.params.spoolPosition ?? behavior.restPos))
                    : selectedNode.params.spoolPosition !== undefined
                      ? selectedNode.params.spoolPosition === 0
                        ? 0
                        : 1
                      : selectedNode.params.active !== undefined
                        ? selectedNode.params.active
                          ? 0
                          : 1
                        : behavior.restPos;
              const isActuated = currentPos !== behavior.restPos;
              return (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="min-w-0">
                    <div className="text-xs font-medium">
                      {behavior.isThreePos
                        ? `Posição ${currentPos + 1}`
                        : isActuated
                          ? behavior.isDetent
                            ? 'Travada (1)'
                            : 'Acionada (1)'
                          : 'Repouso (0)'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {behavior.isDetent
                        ? 'Botoeira/acionador com trava'
                        : behavior.isSpringReturn
                          ? 'Retorno por mola (segure)'
                          : 'Biestável (sem mola)'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      if (behavior.isSpringReturn) {
                        onPressMomentaryActuator?.(selectedNode.id, behavior.effectiveSide);
                      }
                    }}
                    onPointerUp={() => {
                      if (behavior.isSpringReturn) {
                        onReleaseMomentaryActuator?.(selectedNode.id, behavior.effectiveSide);
                      }
                    }}
                    onPointerLeave={() => {
                      if (behavior.isSpringReturn && isActuated) {
                        onReleaseMomentaryActuator?.(selectedNode.id, behavior.effectiveSide);
                      }
                    }}
                    onPointerCancel={() => {
                      if (behavior.isSpringReturn) {
                        onReleaseMomentaryActuator?.(selectedNode.id, behavior.effectiveSide);
                      }
                    }}
                    onClick={() => {
                      if (behavior.isSpringReturn) return;
                      if (onToggleValve) {
                        onToggleValve(selectedNode.id, behavior.effectiveSide);
                      } else if (behavior.isThreePos) {
                        const nextPos = ((selectedNode.params.spoolPosition ?? 1) + 1) % 3;
                        onUpdateParams(selectedNode.id, {
                          spoolPosition: nextPos,
                          active: nextPos === 0,
                        });
                      } else {
                        onUpdateParams(selectedNode.id, { active: !selectedNode.params.active });
                      }
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium shrink-0 ${
                      isActuated
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  >
                    {isActuated ? (
                      <ToggleRight className="w-4 h-4" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                    {behavior.isSpringReturn
                      ? isActuated
                        ? 'Pressionada'
                        : 'Segurar'
                      : behavior.isDetent
                        ? isActuated
                          ? 'Destravar'
                          : 'Travar'
                        : 'Alternar'}
                  </button>
                </div>
                {onOpenValveConfig && !isPropertyDialogComponent(selectedNode.type) && (
                  <button
                    type="button"
                    onClick={() => onOpenValveConfig(selectedNode.id)}
                    className="w-full py-1.5 px-2.5 rounded border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-xs font-medium hover:bg-sky-100"
                  >
                    Configurar válvula completa...
                  </button>
                )}
                {onOpenMechanicalConnection &&
                  (() => {
                    const vCfg = getEffectiveValveConfig(selectedNode);
                    const hasLeft = hasConfiguredActuatorSide(vCfg.leftActuation);
                    const hasRight = hasConfiguredActuatorSide(vCfg.rightActuation);
                    if (!hasLeft && !hasRight) return null;
                    return (
                      <div className="flex flex-col gap-1.5">
                        {hasLeft && (
                          <button
                            type="button"
                            onClick={() => onOpenMechanicalConnection(selectedNode.id, 'left')}
                            className="w-full py-1.5 px-2.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Conexão (mecânica) — Esquerda...
                          </button>
                        )}
                        {hasRight && (
                          <button
                            type="button"
                            onClick={() => onOpenMechanicalConnection(selectedNode.id, 'right')}
                            className="w-full py-1.5 px-2.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Conexão (mecânica) — Direita...
                          </button>
                        )}
                      </div>
                    );
                  })()}
              </div>
              );
            })()}

            {(selectedNode.type === 'shutoff_valve' ||
              selectedNode.type === 'prop_throttle_2_2') && (
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-medium">
                  Estado: {selectedNode.params.active !== false ? 'Aberta' : 'Fechada'}
                </span>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() =>
                    onUpdateParams(selectedNode.id, {
                      active: selectedNode.params.active === false,
                    })
                  }
                  className={`px-2.5 py-1 rounded text-xs font-medium ${
                    selectedNode.params.active !== false
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                >
                  {selectedNode.params.active !== false ? 'Fechar' : 'Abrir'}
                </button>
              </div>
            )}

            {isInteractiveToggleType(selectedNode.type) && (() => {
              const isMomentary = isMomentarySwitchType(selectedNode.type);
              const isLatch = isLatchingSwitchType(selectedNode.type);
              const isOn = Boolean(selectedNode.params.active);
              return (
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium">
                        Estado: {isOn ? (isLatch ? 'Travado (1)' : 'Ativado (1)') : 'Repouso (0)'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {!simState.running
                          ? 'Inicie a simulação para acionar'
                          : isMomentary
                            ? 'Retorno por mola (segure)'
                            : isLatch
                              ? 'Com trava (permanece pressionado)'
                              : 'Acionamento em simulação'}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!simState.running}
                      title={!simState.running ? 'Inicie a simulação para acionar este interruptor' : undefined}
                      onPointerDown={(e) => {
                        if (!simState.running || e.button !== 0) return;
                        if (isMomentary) {
                          onPressMomentaryActuator?.(selectedNode.id);
                        }
                      }}
                      onPointerUp={() => {
                        if (isMomentary) {
                          onReleaseMomentaryActuator?.(selectedNode.id);
                        }
                      }}
                      onPointerLeave={() => {
                        if (isMomentary && isOn) {
                          onReleaseMomentaryActuator?.(selectedNode.id);
                        }
                      }}
                      onPointerCancel={() => {
                        if (isMomentary) {
                          onReleaseMomentaryActuator?.(selectedNode.id);
                        }
                      }}
                      onClick={() => {
                        if (!simState.running || isMomentary) return;
                        if (onToggleValve) {
                          onToggleValve(selectedNode.id);
                        } else {
                          onUpdateParams(selectedNode.id, { active: !selectedNode.params.active });
                        }
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-medium shrink-0 disabled:opacity-45 disabled:cursor-not-allowed ${
                        isOn
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    >
                      {isMomentary
                        ? isOn
                          ? 'Pressionado'
                          : 'Segurar'
                        : isOn
                          ? 'Desativar'
                          : 'Acionar'}
                    </button>
                  </div>
                </div>
              );
            })()}

            {(selectedNode.type === 'throttle' ||
              selectedNode.type === 'check_throttle' ||
              selectedNode.type === 'orifice' ||
              selectedNode.type === 'orifice_adjustable' ||
              selectedNode.type === 'nozzle' ||
              selectedNode.type === 'flow_control_2way' ||
              selectedNode.type === 'flow_control_3way' ||
              selectedNode.type === 'prop_throttle_2_2' ||
              selectedNode.type === 'pump_variable' ||
              selectedNode.type === 'pump_prop' ||
              selectedNode.type === 'amp_prop_1ch' ||
              selectedNode.type === 'amp_prop_2ch' ||
              selectedNode.type === 'prop_solenoid' ||
              selectedNode.type === 'elec_amp_1ch' ||
              selectedNode.type === 'elec_amp_2ch' ||
              selectedNode.type === 'elec_prop_solenoid' ||
              selectedNode.type === 'elec_func_gen' ||
              selectedNode.type === 'elec_setpoint_card' ||
              selectedNode.type === 'other_bar_chart') && (
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium">Grau de abertura</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      aria-label="Abertura do Orifício (%)"
                      disabled={!canEdit}
                      min={1}
                      max={100}
                      step={1}
                      value={selectedNode.params.opening ?? 65}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                        onUpdateParams(selectedNode.id, { opening: val });
                      }}
                      className="w-14 px-1.5 py-0.5 text-right font-mono text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <span className="text-[11px] font-mono text-slate-500">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  aria-label="Abertura do Orifício"
                  disabled={!canEdit}
                  min={2}
                  max={100}
                  step={1}
                  value={selectedNode.params.opening ?? 65}
                  onChange={(e) =>
                    onUpdateParams(selectedNode.id, { opening: Number(e.target.value) })
                  }
                  className="w-full accent-sky-600"
                />
                <div className="grid grid-cols-4 gap-1">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => onUpdateParams(selectedNode.id, { opening: pct })}
                      className={`py-0.5 rounded text-[10px] font-mono border transition-colors ${
                        (selectedNode.params.opening ?? 65) === pct
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:bg-sky-50'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(selectedNode.type === 'relief_valve' ||
              selectedNode.type === 'relief_valve_piloted' ||
              selectedNode.type === 'relief_valve_ext' ||
              selectedNode.type === 'prop_relief' ||
              selectedNode.type === 'prop_relief_piloted' ||
              selectedNode.type === 'sequence_valve' ||
              selectedNode.type === 'counterbalance_valve' ||
              selectedNode.type === 'pressure_compensator_b' ||
              selectedNode.type === 'pressure_compensator_c' ||
              selectedNode.type === 'pressure_compensator_d' ||
              selectedNode.type === 'cartridge_valve_a' ||
              selectedNode.type === 'cartridge_valve_b' ||
              selectedNode.type === 'cartridge_valve_c' ||
              selectedNode.type === 'pressure_switch' ||
              selectedNode.type === 'pressure_sensor_elec' ||
              selectedNode.type === 'pressure_indicator' ||
              selectedNode.type === 'elec_pressure_switch' ||
              selectedNode.type === 'elec_pressure_transducer' ||
              selectedNode.type === 'pilot_check_valve' ||
              selectedNode.type === 'pilot_check_spring' ||
              selectedNode.type === 'pilot_check_close' ||
              selectedNode.type === 'pilot_check_close_spring' ||
              selectedNode.type === 'check_valve' ||
              selectedNode.type === 'check_valve_spring' ||
              selectedNode.type === 'accumulator_simple' ||
              selectedNode.type === 'accumulator' ||
              selectedNode.type === 'accumulator_unit') && (
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span>
                    {selectedNode.type === 'pressure_switch' ||
                    selectedNode.type === 'pressure_sensor_elec' ||
                    selectedNode.type === 'elec_pressure_switch' ||
                    selectedNode.type === 'elec_pressure_transducer'
                      ? 'Pressão Comutação'
                      : selectedNode.type === 'accumulator' ||
                          selectedNode.type === 'accumulator_simple'
                        ? 'Pré-carga Gás'
                        : 'Pressão Abertura'}
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      aria-label="Pressão de Abertura Numérica"
                      disabled={!canEdit}
                      min={0.2}
                      max={maxBar}
                      step={selectedNode.type === 'check_valve' ? 0.2 : 1}
                      value={selectedNode.params.crackingPressure ?? 50}
                      onChange={(e) =>
                        onUpdateParams(selectedNode.id, {
                          crackingPressure: Math.max(0.2, Math.min(maxBar, Number(e.target.value) || 0.2)),
                        })
                      }
                      className="w-14 px-1.5 py-0.5 text-right font-mono text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                    <span className="text-[11px] font-mono text-slate-500">bar</span>
                  </div>
                </div>
                <input
                  type="range"
                  aria-label="Pressão de Abertura"
                  disabled={!canEdit}
                  min={selectedNode.type === 'check_valve' ? 0.2 : 5}
                  max={selectedNode.type === 'check_valve' ? 5 : maxBar}
                  step={selectedNode.type === 'check_valve' ? 0.2 : 5}
                  value={selectedNode.params.crackingPressure ?? 50}
                  onChange={(e) =>
                    onUpdateParams(selectedNode.id, { crackingPressure: Number(e.target.value) })
                  }
                  className="w-full accent-sky-600"
                />
              </div>
            )}

            {(selectedNode.type === 'motor' || selectedNode.type === 'tachometer_sensor') && (
              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Deslocamento Volumétrico</span>
                    <span className="font-mono">{selectedNode.params.displacementCc ?? 32} cm³/rot</span>
                  </div>
                  <input
                    type="range"
                    aria-label="Deslocamento Volumétrico"
                    disabled={!canEdit}
                    min={5}
                    max={120}
                    step={1}
                    value={selectedNode.params.displacementCc ?? 32}
                    onChange={(e) =>
                      onUpdateParams(selectedNode.id, { displacementCc: Number(e.target.value) })
                    }
                    className="w-full accent-sky-600"
                  />
                </div>
                {selectedNode.type === 'motor' && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Torque de Carga</span>
                      <span className="font-mono">{selectedNode.params.loadNm ?? 15} Nm</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Torque de Carga"
                      disabled={!canEdit}
                      min={0}
                      max={150}
                      step={5}
                      value={selectedNode.params.loadNm ?? 15}
                      onChange={(e) =>
                        onUpdateParams(selectedNode.id, { loadNm: Number(e.target.value) })
                      }
                      className="w-full accent-sky-600"
                    />
                  </div>
                )}
              </div>
            )}

            {(selectedNode.type === 'rotary_actuator' || selectedNode.type === 'distance_rule') && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>{selectedNode.type === 'rotary_actuator' ? 'Ângulo Máximo' : 'Curso da Régua'}</span>
                  <span className="font-mono">
                    {selectedNode.params.strokeMm ?? 200}{' '}
                    {selectedNode.type === 'rotary_actuator' ? '°' : 'mm'}
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Curso"
                  disabled={!canEdit}
                  min={selectedNode.type === 'rotary_actuator' ? 30 : 50}
                  max={selectedNode.type === 'rotary_actuator' ? 360 : 1000}
                  step={10}
                  value={selectedNode.params.strokeMm ?? 200}
                  onChange={(e) =>
                    onUpdateParams(selectedNode.id, { strokeMm: Number(e.target.value) })
                  }
                  className="w-full accent-sky-600"
                />
              </div>
            )}

            {(selectedNode.type === 'cylinder_single' ||
              selectedNode.type === 'cylinder_double') && (
              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Diâmetro Êmbolo</span>
                    <span className="font-mono">{selectedNode.params.boreMm ?? 50} mm</span>
                  </div>
                  <input
                    type="range"
                    aria-label="Diâmetro do Êmbolo"
                    disabled={!canEdit}
                    min={20}
                    max={120}
                    step={5}
                    value={selectedNode.params.boreMm ?? 50}
                    onChange={(e) =>
                      onUpdateParams(selectedNode.id, { boreMm: Number(e.target.value) })
                    }
                    className="w-full accent-sky-600"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Carga Mecânica</span>
                    <span className="font-mono">{selectedNode.params.loadN ?? 800} N</span>
                  </div>
                  <input
                    type="range"
                    aria-label="Carga Mecânica"
                    disabled={!canEdit}
                    min={0}
                    max={6000}
                    step={100}
                    value={selectedNode.params.loadN ?? 800}
                    onChange={(e) =>
                      onUpdateParams(selectedNode.id, { loadN: Number(e.target.value) })
                    }
                    className="w-full accent-sky-600"
                  />
                </div>
                {onOpenCylinderConfig && (
                  <button
                    type="button"
                    onClick={() => onOpenCylinderConfig(selectedNode.id)}
                    className="w-full py-1.5 px-2.5 rounded border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-xs font-medium hover:bg-sky-100"
                  >
                    Configurar cilindro completo...
                  </button>
                )}
              </div>
            )}

            {(isFeedDialogComponent(selectedNode.type) ||
              isPropertyDialogComponent(selectedNode.type)) &&
              onOpenPropertyConfig && (
                <button
                  type="button"
                  onClick={() => onOpenPropertyConfig(selectedNode.id)}
                  className="w-full py-1.5 px-2.5 rounded border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-xs font-medium hover:bg-sky-100"
                >
                  Configurar propriedades completas...
                </button>
              )}

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs font-mono">
              {COMPONENT_CATALOG[selectedNode.type].ports.map((port) => {
                const pVal = nodeRt?.portPressures?.[port.id] ?? 0;
                const cfg = selectedNode.params.portConfigs?.[port.id];
                const portName = cfg?.designation || port.label;
                return (
                  <div key={port.id} className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 truncate">
                      Conexão {portName}:
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span>{pVal.toFixed(2)} bar</span>
                      {onOpenPortConfig && (
                        <button
                          type="button"
                          onClick={() => onOpenPortConfig(selectedNode.id, port.id)}
                          className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-slate-800 font-sans text-[10.5px] text-sky-700 dark:text-sky-300"
                        >
                          Config...
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          !selectedPipe && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clique em um componente ou tubulação no diagrama para editar parâmetros.
            </p>
          )
        )}
      </div>
    </aside>
  );
};
