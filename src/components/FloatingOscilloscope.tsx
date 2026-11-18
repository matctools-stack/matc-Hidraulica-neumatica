import React, { useEffect, useRef, useState } from 'react';
import { Activity, Download, GripHorizontal, Minus, Square, X } from 'lucide-react';
import type { FluidMedium, TelemetryPoint } from '../types/circuit';

interface FloatingOscilloscopeProps {
  open: boolean;
  history: TelemetryPoint[];
  fluid: FluidMedium;
  isDark: boolean;
  onClose: () => void;
  onExportCsv: () => void;
}

export const FloatingOscilloscope: React.FC<FloatingOscilloscopeProps> = ({
  open,
  history,
  fluid,
  isDark,
  onClose,
  onExportCsv,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return { x: 12, y: 12 };
    }
    return { x: 24, y: 24 };
  });

  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Clamp window position inside workspace bounds on resize
  useEffect(() => {
    const clampToParent = () => {
      const el = panelRef.current;
      const parent = el?.parentElement;
      if (!el || !parent) return;
      const maxX = Math.max(8, parent.clientWidth - el.offsetWidth - 8);
      const maxY = Math.max(8, parent.clientHeight - el.offsetHeight - 8);
      setPos((p) => ({
        x: Math.min(Math.max(8, p.x), maxX),
        y: Math.min(Math.max(8, p.y), maxY),
      }));
    };
    window.addEventListener('resize', clampToParent);
    return () => window.removeEventListener('resize', clampToParent);
  }, [open, minimized]);

  if (!open) return null;

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

  const width = 460;
  const height = 132;
  const padX = 8;
  const padY = 10;
  const maxP = fluid === 'hydraulic' ? 160 : 12;
  const maxQ = fluid === 'hydraulic' ? 40 : 200;

  const buildPath = (getter: (pt: TelemetryPoint) => number, maxVal: number) => {
    if (history.length < 2) return '';
    return history
      .map((pt, idx) => {
        const x = padX + (idx / (history.length - 1)) * (width - padX * 2);
        const norm = Math.min(1, Math.max(0, getter(pt) / maxVal));
        const y = height - padY - norm * (height - padY * 2);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const last = history[history.length - 1] ?? {
    t: 0,
    pressureBar: 0,
    flowLpm: 0,
    extensionPct: 0,
  };

  return (
    <section
      ref={panelRef}
      data-testid="floating-oscilloscope"
      aria-label="Osciloscópio Flutuante"
      style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
      className="absolute top-0 left-0 z-30 w-[calc(100%-24px)] sm:w-[480px] rounded border border-slate-400 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden"
    >
      {/* Draggable MDI Title Bar */}
      <div
        data-testid="oscilloscope-drag-handle"
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        className="h-8 px-2.5 bg-gradient-to-b from-[#DCE6F2] to-[#C2D4EA] dark:from-slate-800 dark:to-slate-800 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between gap-2 cursor-move select-none touch-none"
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white min-w-0">
          <GripHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <Activity className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="truncate">Osciloscópio — Diagrama de Estado</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            aria-label={minimized ? 'Restaurar osciloscópio' : 'Minimizar osciloscópio'}
            onClick={() => setMinimized((v) => !v)}
            className="p-1 rounded hover:bg-white/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
          >
            {minimized ? <Square className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          </button>
          <button
            type="button"
            aria-label="Fechar osciloscópio"
            onClick={onClose}
            className="p-1 rounded hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-3 font-mono">
              <span className="text-red-600 dark:text-red-400 font-medium">
                P: {last.pressureBar.toFixed(1)} bar
              </span>
              <span className="text-sky-600 dark:text-sky-400 font-medium">
                Q: {last.flowLpm.toFixed(1)} L/min
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Curso: {last.extensionPct.toFixed(0)}%
              </span>
            </div>
            <button
              type="button"
              onClick={onExportCsv}
              className="flex items-center gap-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Download className="w-3 h-3" />
              CSV
            </button>
          </div>

          <div className="relative w-full h-32 rounded border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {history.length < 2 && (
              <div className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-500 dark:text-slate-400 pointer-events-none px-4 text-center">
                Arraste esta janela para qualquer posição da área de trabalho. Inicie a simulação para plotar.
              </div>
            )}
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
              {[0.25, 0.5, 0.75].map((r) => (
                <line
                  key={r}
                  x1={0}
                  y1={height * r}
                  x2={width}
                  y2={height * r}
                  stroke={isDark ? '#1E293B' : '#E2E8F0'}
                  strokeWidth={1}
                />
              ))}
              {history.length >= 2 && (
                <>
                  <path
                    d={buildPath((p) => p.pressureBar, maxP)}
                    fill="none"
                    stroke="#DC2626"
                    strokeWidth={2}
                  />
                  <path
                    d={buildPath((p) => p.flowLpm, maxQ)}
                    fill="none"
                    stroke="#0284C7"
                    strokeWidth={1.8}
                  />
                  <path
                    d={buildPath((p) => p.extensionPct, 100)}
                    fill="none"
                    stroke="#059669"
                    strokeWidth={1.8}
                    strokeDasharray="4 2"
                  />
                </>
              )}
            </svg>
          </div>
        </div>
      )}
    </section>
  );
};
