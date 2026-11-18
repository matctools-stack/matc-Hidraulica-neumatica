import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BoxSelect,
  Check,
  ClipboardPaste,
  Copy,
  FilePlus2,
  FolderOpen,
  Grid,
  Hand,
  Layers,
  Lock,
  Maximize2,
  Moon,
  Pause,
  Play,
  Plug,
  RotateCcw,
  RotateCw,
  Save,
  Scissors,
  SkipForward,
  Sliders,
  Square,
  StepForward,
  Sun,
  Trash2,
  Volume2,
  VolumeX,
  WifiOff,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { PRESET_PROJECTS } from './data/presets';
import {
  COMPONENT_CATALOG,
  createInitialSimulationState,
  getEffectiveValveConfig,
  getPipePolylinePoints,
  getValveActuationBehavior,
  hasConfiguredActuatorSide,
  insertComponentIntoPipe,
  isActuatorMarkComponent,
  isDirectionalValveType,
  isFeedDialogComponent,
  isInteractiveToggleType,
  isMomentarySwitchType,
  isPropertyDialogComponent,
  isThreePositionValveType,
  splitPipeWithJunction,
  stepFluidSimulation,
} from './engine/fluidSolver';
import {
  buildMultiPasteBundle,
  cloneNodeDeep,
  cloneNodeForPlacement,
  pushHistory,
  stepRedo,
  stepUndo,
  type HistorySnapshot,
} from './engine/circuitHistory';
import {
  getSimulationSpeedMultiplier,
  isAnySoundEnabled,
  loadAppOptions,
  playComponentSound,
  saveAppOptions,
  type AppOptions,
} from './engine/appOptions';
import {
  buildPreviewShareSession,
  extractPreviewParamsFromUrl,
  getRolePermissions,
  validatePreviewShareCode,
} from './security/offlineAuth';
import {
  appendAuditLog,
  clearAdminApiToken,
  ensureLocalDatabaseSeeded,
  isElectronRuntime,
  isPreviewShareCodeRevoked,
  listProjects,
  removeProject,
  saveAutosaveDraft,
  saveProject,
  saveStoredSession,
} from './storage/localDb';
import { useOnlineStatus } from './hooks/usePWAInstall';
import type {
  AuthSession,
  CircuitNode,
  CircuitProject,
  ComponentParams,
  ComponentType,
  FluidMedium,
  PipeConnection,
  PipeWaypoint,
  PortConfig,
  SimulationState,
  TelemetryPoint,
} from './types/circuit';
import { OfflineLockScreen } from './components/OfflineLockScreen';
import { ComponentPalette, type PaletteItemPayload } from './components/ComponentPalette';
import { CircuitCanvas } from './components/CircuitCanvas';
import { FloatingOscilloscope } from './components/FloatingOscilloscope';
import { FloatingInspector } from './components/FloatingInspector';
import { CylinderConfigDialog } from './components/CylinderConfigDialog';
import { ValveConfigDialog } from './components/ValveConfigDialog';
import { FeedConfigDialog } from './components/FeedConfigDialog';
import { ComponentPropertyDialog } from './components/ComponentPropertyDialog';
import { PortConfigDialog } from './components/PortConfigDialog';
import { MechanicalConnectionDialog } from './components/MechanicalConnectionDialog';
import { ProjectsModal } from './components/ProjectsModal';
import { AccessControlModal } from './components/AccessControlModal';
import { DesktopPackageModal } from './components/DesktopPackageModal';
import { PreviewShareModal } from './components/PreviewShareModal';
import { OptionsDialogs, type ActiveOptionsDialog } from './components/OptionsDialogs';
import { DidacticManualModal } from './components/DidacticManualModal';

const APP_REVISION = '2026.11.16-r8';

const isFileProtocol =
  typeof window !== 'undefined' && window.location?.protocol === 'file:';
const APP_LOGO_SRC = isFileProtocol ? './app-logo.png' : '/app-logo.png';
const INTRO_VIDEO_SRC = isFileProtocol
  ? './assets/aistudio/Anima__o_Furtiva_e_C_digo_Sem_Marca_D__gua__online-video-cutter.com__3e160f10.mp4'
  : '/assets/aistudio/Anima__o_Furtiva_e_C_digo_Sem_Marca_D__gua__online-video-cutter.com__3e160f10.mp4';

function createInitialBlankProject(
  fluid: CircuitProject['fluid'] = 'hydraulic',
  owner?: Pick<AuthSession, 'userId' | 'displayName'>
): CircuitProject {
  const now = new Date().toISOString();
  return {
    id: `proj_blank_${Date.now()}`,
    name: 'Novo Diagrama Sem Título',
    description: 'Folha em branco pronta para montagem do circuito.',
    fluid,
    nodes: [],
    pipes: [],
    authorId: owner?.userId ?? 'local',
    authorName: owner?.displayName ?? 'Estação Local',
    createdAt: now,
    updatedAt: now,
  };
}

const FluidUndoIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
    <path
      d="M 14.5 15.2 A 6.2 6.2 0 1 0 4.5 10.5"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
    />
    <polygon points="4.5,14.4 1.7,9.2 7.3,9.6" fill="currentColor" />
  </svg>
);

const FluidRedoIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
    <path
      d="M 5.5 15.2 A 6.2 6.2 0 1 1 15.5 10.5"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
    />
    <polygon points="15.5,14.4 18.3,9.2 12.7,9.6" fill="currentColor" />
  </svg>
);

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('fcs_theme') === 'dark';
    } catch {
      return false;
    }
  });

  const initialPreviewBootstrap = useMemo(() => {
    const { code: rawCode, label, skipIntro } = extractPreviewParamsFromUrl();
    if (!rawCode) {
      return { session: null as AuthSession | null, code: '', error: null as string | null, skipIntro };
    }
    const validation = validatePreviewShareCode(rawCode);
    if (!validation.valid) {
      return { session: null as AuthSession | null, code: rawCode.toUpperCase(), error: validation.message, skipIntro: true };
    }
    if (isPreviewShareCodeRevoked(validation.code)) {
      return {
        session: null as AuthSession | null,
        code: validation.code,
        error: 'Este link do Preview foi revogado pelo Administrador.',
        skipIntro: true,
      };
    }
    return {
      session: buildPreviewShareSession({
        code: validation.code,
        accessLevel: validation.accessLevel,
        label,
        expiresAt: validation.expiresAt,
      }),
      code: validation.code,
      error: null as string | null,
      skipIntro,
    };
  }, []);

  const [showIntroVideo, setShowIntroVideo] = useState<boolean>(() => !initialPreviewBootstrap.skipIntro);
  const [introMuted, setIntroMuted] = useState<boolean>(true);
  const [introVideoError, setIntroVideoError] = useState<boolean>(false);

  const [session, setSession] = useState<AuthSession | null>(() => {
    saveStoredSession(null);
    return initialPreviewBootstrap.session;
  });

  useEffect(() => {
    if (initialPreviewBootstrap.session?.isPreviewShare && initialPreviewBootstrap.code) {
      void appendAuditLog({
        userId: initialPreviewBootstrap.session.userId,
        username: initialPreviewBootstrap.session.username,
        action: 'PREVIEW_ACCESS_GRANTED',
        detail: `Acesso ao Preview via link (${initialPreviewBootstrap.code} · ${
          initialPreviewBootstrap.session.previewAccessLevel === 'full'
            ? 'Simulador Completo'
            : 'Somente Simulação'
        }).`,
      });
    }
  }, [initialPreviewBootstrap]);

  const [projects, setProjects] = useState<CircuitProject[]>(PRESET_PROJECTS);
  const [activeProject, setActiveProject] = useState<CircuitProject>(() =>
    createInitialBlankProject('hydraulic')
  );

  const [simState, setSimState] = useState<SimulationState>(() =>
    createInitialSimulationState(
      activeProject.nodes,
      activeProject.pipes,
      activeProject.fluid,
      false
    )
  );
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedPipeIds, setSelectedPipeIds] = useState<string[]>([]);
  const [areaSelectMode, setAreaSelectMode] = useState<boolean>(false);
  const [panMode, setPanMode] = useState<boolean>(false);

  // Classic MDI Floating Windows & View States (Oscilloscope only loads on button click)
  const [showOscilloscope, setShowOscilloscope] = useState<boolean>(false);
  const [showInspector, setShowInspector] = useState<boolean>(false);
  const [configCylinderNodeId, setConfigCylinderNodeId] = useState<string | null>(null);
  const [configValveNodeId, setConfigValveNodeId] = useState<string | null>(null);
  const [configFeedNodeId, setConfigFeedNodeId] = useState<string | null>(null);
  const [configPropertyNodeId, setConfigPropertyNodeId] = useState<string | null>(null);
  const [configPortTarget, setConfigPortTarget] = useState<{
    nodeId: string;
    portId: string;
  } | null>(null);
  const [configMechTarget, setConfigMechTarget] = useState<{
    nodeId: string;
    side: 'left' | 'right';
    markOverride?: string;
    anchorPos?: { x: number; y: number };
    onDraftApply?: (mark: string) => void;
  } | null>(null);
  const [appOptions, setAppOptions] = useState<AppOptions>(() => loadAppOptions());
  const [showLibrary, setShowLibrary] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(() => loadAppOptions().grid.showGrid);
  const [fitSignal, setFitSignal] = useState<number>(0);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showDesktopModal, setShowDesktopModal] = useState(false);
  const [showPreviewShareModal, setShowPreviewShareModal] = useState(false);
  const [activeOptionsDialog, setActiveOptionsDialog] = useState<ActiveOptionsDialog>(null);
  const [showDidacticManual, setShowDidacticManual] = useState(false);
  const [didacticManualTopic, setDidacticManualTopic] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'diagram' | 'library'>('diagram');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const simSpeedFactor = getSimulationSpeedMultiplier(appOptions.simulation);
  const soundEnabled = isAnySoundEnabled(appOptions.sound);

  useEffect(() => {
    if (appOptions.saveConfigOnExit) {
      saveAppOptions(appOptions);
    }
  }, [appOptions]);

  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);
  const [clipboardBundle, setClipboardBundle] = useState<{
    nodes: CircuitNode[];
    pipes: PipeConnection[];
  } | null>(null);
  const pasteCountRef = useRef(0);
  const lastParamHistoryRef = useRef(0);
  const [contextMenu, setContextMenu] = useState<{
    clientX: number;
    clientY: number;
    nodeId: string | null;
    worldX?: number;
    worldY?: number;
  } | null>(null);

  const isOnline = useOnlineStatus();

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('fcs_theme', isDark ? 'dark' : 'light');
    } catch {
      // Ignore
    }
  }, [isDark]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureLocalDatabaseSeeded();
      const loaded = await listProjects();
      if (!cancelled && loaded.length > 0) {
        setProjects(loaded);
      }

      // Automatic startup update check for PWA / web & desktop adjustments
      try {
        const prevRev = localStorage.getItem('fcs_app_revision');
        if (prevRev && prevRev !== APP_REVISION) {
          localStorage.setItem('fcs_app_revision', APP_REVISION);
          if (!cancelled) {
            showNotice(`Atualização automática aplicada (${APP_REVISION}).`);
          }
        } else if (!prevRev) {
          localStorage.setItem('fcs_app_revision', APP_REVISION);
        }

        if (import.meta.env.PROD && 'serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.update();
          }
        }
      } catch {
        // Ignore offline/storage restriction errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!cancelled && reg) {
          await reg.update();
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      } catch {
        // Ignore transient network errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOnline]);

  useEffect(() => {
    saveAutosaveDraft(activeProject);
  }, [activeProject]);

  const projectRef = useRef(activeProject);
  projectRef.current = activeProject;
  const simRunningRef = useRef(simState.running);
  simRunningRef.current = simState.running;
  const heldMomentaryRef = useRef<Map<string, 'left' | 'right' | 'cycle' | undefined>>(new Map());

  useEffect(() => {
    if (!simState.running) return;
    const timer = window.setInterval(() => {
      setSimState((prev) => {
        if (!prev.running) return prev;
        const proj = projectRef.current;
        const next = stepFluidSimulation(
          { ...prev, fluid: proj.fluid },
          proj.nodes,
          proj.pipes,
          (1 / 30) * simSpeedFactor
        );
        const firstCyl = proj.nodes.find(
          (n) => n.type === 'cylinder_double' || n.type === 'cylinder_single'
        );
        const extPct = firstCyl ? (next.nodes[firstCyl.id]?.pistonPos ?? 0) * 100 : 0;

        setTelemetry((hist) => {
          const updated = [
            ...hist,
            {
              t: next.timeSec,
              pressureBar: next.maxSystemPressureBar,
              flowLpm: next.totalFlowLpm,
              extensionPct: extPct,
            },
          ];
          return updated.length > 140 ? updated.slice(updated.length - 140) : updated;
        });

        return next;
      });
    }, 33);
    return () => window.clearInterval(timer);
  }, [simState.running, simSpeedFactor]);

  const showNotice = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  const shortcutRef = useRef<{
    locked: boolean;
    canEdit: boolean;
    hasNodeSelection: boolean;
    hasAnySelection: boolean;
    hasClipboard: boolean;
    onLock: () => void;
    onDeleteSelection: () => void;
    onCopySelection: () => void;
    onCutSelection: () => void;
    onPasteBundle: () => void;
    onSelectAll: () => void;
    onUndo: () => void;
    onRedo: () => void;
  }>({
    locked: false,
    canEdit: false,
    hasNodeSelection: false,
    hasAnySelection: false,
    hasClipboard: false,
    onLock: () => {},
    onDeleteSelection: () => {},
    onCopySelection: () => {},
    onCutSelection: () => {},
    onPasteBundle: () => {},
    onSelectAll: () => {},
    onUndo: () => {},
    onRedo: () => {},
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        shortcutRef.current.onLock();
        return;
      }
      if (shortcutRef.current.locked) return;

      if (e.key === 'Escape') {
        setContextMenu(null);
        setOpenMenu(null);
        setAreaSelectMode(false);
        setPanMode(false);
        return;
      }

      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName?.toUpperCase() ?? '';
      if (
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        target?.isContentEditable
      ) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!shortcutRef.current.canEdit) return;
        if (shortcutRef.current.hasAnySelection) {
          e.preventDefault();
          shortcutRef.current.onDeleteSelection();
        }
        return;
      }

      if (ctrl && key === 'a') {
        e.preventDefault();
        shortcutRef.current.onSelectAll();
      } else if (ctrl && key === 'c' && shortcutRef.current.hasNodeSelection) {
        e.preventDefault();
        shortcutRef.current.onCopySelection();
      } else if (ctrl && key === 'x' && shortcutRef.current.hasNodeSelection && shortcutRef.current.canEdit) {
        e.preventDefault();
        shortcutRef.current.onCutSelection();
      } else if (ctrl && key === 'v' && shortcutRef.current.hasClipboard && shortcutRef.current.canEdit) {
        e.preventDefault();
        shortcutRef.current.onPasteBundle();
      } else if (ctrl && !e.shiftKey && key === 'z' && shortcutRef.current.canEdit) {
        e.preventDefault();
        shortcutRef.current.onUndo();
      } else if (
        ctrl &&
        (key === 'y' || (e.shiftKey && key === 'z')) &&
        shortcutRef.current.canEdit
      ) {
        e.preventDefault();
        shortcutRef.current.onRedo();
      }
    };
    const onWindowClick = () => {
      setOpenMenu(null);
      setContextMenu(null);
      setShowPreviewShareModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('click', onWindowClick);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('click', onWindowClick);
    };
  }, []);

  const handleAuthenticated = (newSession: AuthSession) => {
    saveStoredSession(null);
    const blank = createInitialBlankProject('hydraulic', newSession);
    setActiveProject(blank);
    setSelectedNodeIds([]);
    setSelectedPipeIds([]);
    setTelemetry([]);
    setSimState(createInitialSimulationState([], [], blank.fluid, false));
    setSession(newSession);
  };

  const handleLockWorkstation = async () => {
    if (session) {
      await appendAuditLog({
        userId: session.userId,
        username: session.username,
        action: 'WORKSTATION_LOCKED',
        detail: 'Estação bloqueada manualmente pelo operador.',
      });
    }
    if (session?.isPreviewShare) {
      try {
        window.history.replaceState(null, '', window.location.pathname || '/');
      } catch {
        // Ignore history restrictions in sandboxed frames
      }
    }
    setSimState((s) => ({ ...s, running: false }));
    setShowPreviewShareModal(false);
    clearAdminApiToken();
    saveStoredSession(null);
    setSession(null);
  };

  const selectedNode = useMemo(
    () =>
      selectedNodeIds.length === 1
        ? activeProject.nodes.find((n) => n.id === selectedNodeIds[0]) ?? null
        : null,
    [activeProject.nodes, selectedNodeIds]
  );

  const selectedPipe = useMemo(
    () =>
      selectedNodeIds.length === 0 && selectedPipeIds.length === 1
        ? activeProject.pipes.find((p) => p.id === selectedPipeIds[0]) ?? null
        : null,
    [activeProject.pipes, selectedNodeIds.length, selectedPipeIds]
  );

  const configCylinderNode = useMemo(
    () => activeProject.nodes.find((n) => n.id === configCylinderNodeId) ?? null,
    [activeProject.nodes, configCylinderNodeId]
  );

  const configValveNode = useMemo(
    () => activeProject.nodes.find((n) => n.id === configValveNodeId) ?? null,
    [activeProject.nodes, configValveNodeId]
  );

  const configFeedNode = useMemo(
    () => activeProject.nodes.find((n) => n.id === configFeedNodeId) ?? null,
    [activeProject.nodes, configFeedNodeId]
  );

  const configPropertyNode = useMemo(
    () => activeProject.nodes.find((n) => n.id === configPropertyNodeId) ?? null,
    [activeProject.nodes, configPropertyNodeId]
  );

  const configPortInfo = useMemo(() => {
    if (!configPortTarget) return { node: null, port: null };
    const node = activeProject.nodes.find((n) => n.id === configPortTarget.nodeId) ?? null;
    if (!node) return { node: null, port: null };
    const port =
      COMPONENT_CATALOG[node.type].ports.find((p) => p.id === configPortTarget.portId) ?? null;
    return { node, port };
  }, [activeProject.nodes, configPortTarget]);

  const configMechNode = useMemo(
    () =>
      configMechTarget
        ? activeProject.nodes.find((n) => n.id === configMechTarget.nodeId) ?? null
        : null,
    [activeProject.nodes, configMechTarget]
  );

  const availableMechanicalMarks = useMemo(() => {
    const marks = new Set<string>();
    for (const n of activeProject.nodes) {
      const labels = n.params.cylinderConfig?.actuationLabels;
      if (labels) {
        for (const row of labels) {
          const mk = row.mark.trim();
          if (mk) marks.add(mk);
        }
      }
      const sm = n.params.sensingMark?.trim();
      if (sm) marks.add(sm);
      const sm2 = n.params.secondaryMark?.trim();
      if (sm2) marks.add(sm2);
      const lm = n.params.valveConfig?.leftActuation?.mark?.trim();
      if (lm) marks.add(lm);
      const rm = n.params.valveConfig?.rightActuation?.mark?.trim();
      if (rm) marks.add(rm);
    }
    return Array.from(marks).sort();
  }, [activeProject.nodes]);

  if (showIntroVideo) {
    return (
      <div
        data-testid="intro-video-splash"
        className="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none"
      >
        <div className="w-full max-w-4xl flex flex-col items-center gap-4">
          <div className="w-full flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <img
                src={APP_LOGO_SRC}
                alt="Fluid Circuit Studio"
                className="w-8 h-8 rounded shadow-sm bg-white p-0.5 object-contain"
              />
              <div>
                <h1 className="text-sm sm:text-base font-semibold tracking-tight text-white">
                  Fluid Circuit Studio
                </h1>
                <p className="text-[11px] text-slate-400">
                  Apresentação inicial · Hidráulica, Pneumática &amp; Eletro-Automação
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIntroMuted((m) => !m)}
                aria-label={introMuted ? 'Ativar som' : 'Silenciar som'}
                className="h-8 px-3 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                {introMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{introMuted ? 'Ativar som' : 'Silenciar'}</span>
              </button>
              <button
                type="button"
                data-testid="skip-intro-btn"
                aria-label="Pular apresentação"
                onClick={() => setShowIntroVideo(false)}
                className="h-8 px-3.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Pular apresentação</span>
              </button>
            </div>
          </div>

          <div className="w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex items-center justify-center min-h-[260px]">
            {introVideoError ? (
              <div className="w-full py-12 px-6 flex flex-col items-center justify-center text-center gap-4 bg-gradient-to-b from-slate-900 to-slate-950">
                <img
                  src={APP_LOGO_SRC}
                  alt="Matc-Fluid · Fluid Circuit Studio"
                  className="w-28 h-28 rounded-2xl shadow-xl border border-sky-500/30 object-contain bg-slate-900"
                />
                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight text-white">
                    Fluid Circuit Studio
                  </h2>
                  <p className="text-xs text-slate-300 max-w-md">
                    Simulador de circuitos hidráulicos, pneumáticos e eletro-automação em tempo real.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIntroVideo(false)}
                  className="mt-1 h-9 px-5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg transition-colors"
                >
                  Entrar no Simulador
                </button>
              </div>
            ) : (
              <video
                data-testid="intro-video-player"
                src={INTRO_VIDEO_SRC}
                poster={APP_LOGO_SRC}
                autoPlay
                muted={introMuted}
                playsInline
                controls
                onEnded={() => setShowIntroVideo(false)}
                onError={() => setIntroVideoError(true)}
                className="w-full max-h-[76vh] object-contain bg-black"
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <OfflineLockScreen
        onAuthenticated={handleAuthenticated}
        isDark={isDark}
        onToggleTheme={() => setIsDark((v) => !v)}
        initialError={initialPreviewBootstrap.error}
      />
    );
  }

  const perms = getRolePermissions(session.role, session);

  const recordHistory = (source?: CircuitProject) => {
    const target = source ?? projectRef.current;
    setUndoStack((prev) => pushHistory(prev, target));
    setRedoStack([]);
  };

  const applyUndo = () => {
    if (!perms.canEditCircuit) return;
    const res = stepUndo(undoStack, redoStack, projectRef.current);
    if (!res) return;
    setUndoStack(res.undoStack);
    setRedoStack(res.redoStack);
    setActiveProject((prev) => ({
      ...prev,
      nodes: res.nextCurrent.nodes,
      pipes: res.nextCurrent.pipes,
      fluid: res.nextCurrent.fluid,
    }));
    const validNodes = new Set(res.nextCurrent.nodes.map((n) => n.id));
    const validPipes = new Set(res.nextCurrent.pipes.map((p) => p.id));
    setSelectedNodeIds((ids) => ids.filter((id) => validNodes.has(id)));
    setSelectedPipeIds((ids) => ids.filter((id) => validPipes.has(id)));
    if (!simState.running) {
      setSimState(
        createInitialSimulationState(
          res.nextCurrent.nodes,
          res.nextCurrent.pipes,
          res.nextCurrent.fluid,
          false
        )
      );
    }
    showNotice('Ação desfeita (Ctrl+Z).');
  };

  const applyRedo = () => {
    if (!perms.canEditCircuit) return;
    const res = stepRedo(undoStack, redoStack, projectRef.current);
    if (!res) return;
    setUndoStack(res.undoStack);
    setRedoStack(res.redoStack);
    setActiveProject((prev) => ({
      ...prev,
      nodes: res.nextCurrent.nodes,
      pipes: res.nextCurrent.pipes,
      fluid: res.nextCurrent.fluid,
    }));
    const validNodes = new Set(res.nextCurrent.nodes.map((n) => n.id));
    const validPipes = new Set(res.nextCurrent.pipes.map((p) => p.id));
    setSelectedNodeIds((ids) => ids.filter((id) => validNodes.has(id)));
    setSelectedPipeIds((ids) => ids.filter((id) => validPipes.has(id)));
    if (!simState.running) {
      setSimState(
        createInitialSimulationState(
          res.nextCurrent.nodes,
          res.nextCurrent.pipes,
          res.nextCurrent.fluid,
          false
        )
      );
    }
    showNotice('Ação refeita (Ctrl+Y).');
  };

  const handleNewBlankCircuit = () => {
    if (!perms.canEditCircuit) return;
    recordHistory();
    const blank: CircuitProject = {
      id: `proj_${Date.now()}`,
      name: 'Novo Diagrama Sem Título',
      description: 'Circuito criado na área de trabalho.',
      fluid: activeProject.fluid,
      nodes: [],
      pipes: [],
      authorId: session.userId,
      authorName: session.displayName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setActiveProject(blank);
    setSelectedNodeIds([]);
    setSelectedPipeIds([]);
    setTelemetry([]);
    setSimState(createInitialSimulationState([], [], blank.fluid, false));
    showNotice('Novo diagrama em branco criado.');
  };

  const clearNodeSignalSpool = (prev: SimulationState, nodeId: string): SimulationState => {
    const rt = prev.nodes[nodeId];
    if (!rt || rt.signalSpoolPos === undefined) return prev;
    return {
      ...prev,
      nodes: {
        ...prev.nodes,
        [nodeId]: { ...rt, signalSpoolPos: undefined },
      },
    };
  };

  const releaseAllHeldMomentaryActuators = (): CircuitNode[] => {
    const proj = projectRef.current;
    if (heldMomentaryRef.current.size === 0) return proj.nodes;
    const heldEntries = Array.from(heldMomentaryRef.current.entries());
    heldMomentaryRef.current.clear();
    let changed = false;
    const updatedNodes = proj.nodes.map((n) => {
      const heldEntry = heldEntries.find(([id]) => id === n.id);
      if (!heldEntry) return n;
      const [, sideHint] = heldEntry;
      if (isInteractiveToggleType(n.type) && isMomentarySwitchType(n.type)) {
        if (!n.params.active) return n;
        changed = true;
        return { ...n, params: { ...n.params, active: false } };
      }
      if (isDirectionalValveType(n.type)) {
        const behavior = getValveActuationBehavior(n, sideHint);
        if (!behavior.isSpringReturn) return n;
        changed = true;
        return {
          ...n,
          params: {
            ...n.params,
            spoolPosition: behavior.restPos,
            active: behavior.restPos === 0,
          },
        };
      }
      return n;
    });
    if (changed) {
      projectRef.current = { ...proj, nodes: updatedNodes };
      setActiveProject((prev) => ({ ...prev, nodes: updatedNodes }));
    }
    return updatedNodes;
  };

  const handleToggleSimulation = (forceRun?: boolean) => {
    const nextRunning = typeof forceRun === 'boolean' ? forceRun : !simRunningRef.current;
    const hadHeld = !nextRunning && heldMomentaryRef.current.size > 0;
    const nodesForSim = hadHeld ? releaseAllHeldMomentaryActuators() : projectRef.current.nodes;
    simRunningRef.current = nextRunning;
    setSimState((prev) => {
      if (hadHeld) {
        return stepFluidSimulation(
          { ...prev, running: false, fluid: activeProject.fluid },
          nodesForSim,
          projectRef.current.pipes,
          1 / 60
        );
      }
      return {
        ...prev,
        running: nextRunning,
        fluid: activeProject.fluid,
      };
    });
  };

  const handleResetSimulation = () => {
    const nodesForReset = releaseAllHeldMomentaryActuators();
    simRunningRef.current = false;
    setSimState(
      createInitialSimulationState(
        nodesForReset,
        projectRef.current.pipes,
        activeProject.fluid,
        false
      )
    );
    setTelemetry([]);
  };

  const handleStepSimulation = () => {
    setSimState((prev) => {
      const next = stepFluidSimulation(
        { ...prev, running: false, fluid: activeProject.fluid },
        activeProject.nodes,
        activeProject.pipes,
        1 / 15
      );
      const firstCyl = activeProject.nodes.find(
        (n) => n.type === 'cylinder_double' || n.type === 'cylinder_single'
      );
      const extPct = firstCyl ? (next.nodes[firstCyl.id]?.pistonPos ?? 0) * 100 : 0;
      setTelemetry((hist) => {
        const updated = [
          ...hist,
          {
            t: next.timeSec,
            pressureBar: next.maxSystemPressureBar,
            flowLpm: next.totalFlowLpm,
            extensionPct: extPct,
          },
        ];
        return updated.length > 140 ? updated.slice(updated.length - 140) : updated;
      });
      return next;
    });
  };

  const handleChangeFluid = (fluid: FluidMedium) => {
    if (!perms.canEditCircuit || fluid === activeProject.fluid) return;
    recordHistory();
    setActiveProject((prev) => ({ ...prev, fluid }));
    setSimState((prev) => ({ ...prev, fluid }));
  };

  const handleAddComponent = (
    itemOrType: PaletteItemPayload | ComponentType,
    x?: number,
    y?: number
  ) => {
    if (!perms.canEditCircuit) return;
    const payload: PaletteItemPayload =
      typeof itemOrType === 'string' ? { type: itemOrType } : itemOrType;
    const spec = COMPONENT_CATALOG[payload.type];
    const proj = projectRef.current;
    const count = proj.nodes.filter((n) => n.type === payload.type).length + 1;

    // If inserted from palette click while a single pipe is selected, place at that pipe's midpoint
    const preferredPipeId =
      x === undefined && y === undefined && selectedPipeIds.length === 1
        ? selectedPipeIds[0]
        : undefined;
    let spawnX = x ?? 260 + (proj.nodes.length % 5) * 60;
    let spawnY = y ?? 220 + (proj.nodes.length % 4) * 50;

    if (preferredPipeId) {
      const selPipe = proj.pipes.find((p) => p.id === preferredPipeId);
      if (selPipe) {
        const pts = getPipePolylinePoints(selPipe, proj.nodes);
        if (pts.length >= 2) {
          const midIdx = Math.floor((pts.length - 1) / 2);
          spawnX = Math.round((pts[midIdx].x + pts[midIdx + 1].x) / 2);
          spawnY = Math.round((pts[midIdx].y + pts[midIdx + 1].y) / 2);
        }
      }
    }

    const newNode: CircuitNode = {
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      type: payload.type,
      label: `${payload.label ?? spec.shortName} ${count}`,
      x: spawnX,
      y: spawnY,
      rotation: 0,
      params: { ...spec.defaultParams, ...(payload.defaultParams ?? {}) },
    };

    const nodesWithNew = [...proj.nodes, newNode];
    const shouldTryPipeInsert =
      (x !== undefined && y !== undefined) || Boolean(preferredPipeId);
    const insertResult = shouldTryPipeInsert
      ? insertComponentIntoPipe(nodesWithNew, proj.pipes, newNode.id, {
          preferredPipeId,
        })
      : {
          nodes: nodesWithNew,
          pipes: proj.pipes,
          connected: false,
          mode: null,
          junctionNodeId: null,
        };

    recordHistory();
    projectRef.current = {
      ...proj,
      nodes: insertResult.nodes,
      pipes: insertResult.pipes,
    };
    setActiveProject((prev) => ({
      ...prev,
      nodes: insertResult.nodes,
      pipes: insertResult.pipes,
    }));
    setSelectedNodeIds([newNode.id]);
    setSelectedPipeIds([]);
    setAreaSelectMode(false);
    setMobileView('diagram');

    if (insertResult.connected) {
      showNotice(
        insertResult.mode === 'inline'
          ? `"${newNode.label}" inserido e conectado no meio da tubulação.`
          : `"${newNode.label}" conectado por derivação no meio da tubulação.`
      );
    }
  };

  const handleSnapNodeToPipe = (nodeId: string) => {
    if (!perms.canEditCircuit) return;
    const proj = projectRef.current;
    const targetNode = proj.nodes.find((n) => n.id === nodeId);
    if (!targetNode) return;
    const alreadyConnected = proj.pipes.some(
      (p) => p.fromNodeId === nodeId || p.toNodeId === nodeId
    );
    if (alreadyConnected) return;

    const insertResult = insertComponentIntoPipe(proj.nodes, proj.pipes, nodeId);
    if (!insertResult.connected) return;

    projectRef.current = {
      ...proj,
      nodes: insertResult.nodes,
      pipes: insertResult.pipes,
    };
    setActiveProject((prev) => ({
      ...prev,
      nodes: insertResult.nodes,
      pipes: insertResult.pipes,
    }));
    showNotice(
      insertResult.mode === 'inline'
        ? `"${targetNode.label}" conectado no meio da tubulação.`
        : `"${targetNode.label}" conectado por derivação no meio da tubulação.`
    );
  };

  const handleMoveNodes = (moves: Array<{ id: string; x: number; y: number }>) => {
    if (moves.length === 0) return;
    const moveMap = new Map(moves.map((m) => [m.id, m]));
    const updatedNodes = projectRef.current.nodes.map((n) => {
      const target = moveMap.get(n.id);
      return target ? { ...n, x: target.x, y: target.y } : n;
    });
    projectRef.current = { ...projectRef.current, nodes: updatedNodes };
    setActiveProject((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => {
        const target = moveMap.get(n.id);
        return target ? { ...n, x: target.x, y: target.y } : n;
      }),
    }));
  };

  const handleUpdatePipeWaypoints = (pipeId: string, waypoints: PipeWaypoint[]) => {
    if (!perms.canEditCircuit) return;
    setActiveProject((prev) => ({
      ...prev,
      pipes: prev.pipes.map((p) => (p.id === pipeId ? { ...p, waypoints } : p)),
    }));
  };

  const handlePressMomentaryActuator = (id: string, sideHint?: 'left' | 'right' | 'cycle') => {
    const proj = projectRef.current;
    const target = proj.nodes.find((n) => n.id === id);
    if (!target) return;

    if (isInteractiveToggleType(target.type)) {
      if (!simRunningRef.current) {
        showNotice('Inicie a simulação para acionar os interruptores.');
        return;
      }
      if (target.params.active) return;
      playComponentSound('switch', appOptions.sound);
      heldMomentaryRef.current.set(id, sideHint);
      const updatedNodes = proj.nodes.map((n) =>
        n.id === id ? { ...n, params: { ...n.params, active: true } } : n
      );
      projectRef.current = { ...proj, nodes: updatedNodes };
      setActiveProject((prev) => ({ ...prev, nodes: updatedNodes }));
      setSimState((prev) =>
        stepFluidSimulation({ ...prev, fluid: proj.fluid }, updatedNodes, proj.pipes, 1 / 60)
      );
      return;
    }

    if (isDirectionalValveType(target.type)) {
      const behavior = getValveActuationBehavior(target, sideHint);
      playComponentSound('valve', appOptions.sound);
      heldMomentaryRef.current.set(id, sideHint);
      const updatedNodes = proj.nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              params: {
                ...n.params,
                spoolPosition: behavior.pressPos,
                active: behavior.pressPos === 0,
              },
            }
          : n
      );
      projectRef.current = { ...proj, nodes: updatedNodes };
      setActiveProject((prev) => ({ ...prev, nodes: updatedNodes }));
      setSimState((prev) =>
        stepFluidSimulation(
          { ...clearNodeSignalSpool(prev, id), fluid: proj.fluid },
          updatedNodes,
          proj.pipes,
          1 / 60
        )
      );
    }
  };

  const handleReleaseMomentaryActuator = (id: string, sideHint?: 'left' | 'right' | 'cycle') => {
    heldMomentaryRef.current.delete(id);
    const proj = projectRef.current;
    const target = proj.nodes.find((n) => n.id === id);
    if (!target) return;

    if (isInteractiveToggleType(target.type) && isMomentarySwitchType(target.type)) {
      if (!target.params.active) return;
      const updatedNodes = proj.nodes.map((n) =>
        n.id === id ? { ...n, params: { ...n.params, active: false } } : n
      );
      projectRef.current = { ...proj, nodes: updatedNodes };
      setActiveProject((prev) => ({ ...prev, nodes: updatedNodes }));
      setSimState((prev) =>
        stepFluidSimulation({ ...prev, fluid: proj.fluid }, updatedNodes, proj.pipes, 1 / 60)
      );
      return;
    }

    if (isDirectionalValveType(target.type)) {
      const behavior = getValveActuationBehavior(target, sideHint);
      if (!behavior.isSpringReturn) return;
      const updatedNodes = proj.nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              params: {
                ...n.params,
                spoolPosition: behavior.restPos,
                active: behavior.restPos === 0,
              },
            }
          : n
      );
      projectRef.current = { ...proj, nodes: updatedNodes };
      setActiveProject((prev) => ({ ...prev, nodes: updatedNodes }));
      setSimState((prev) =>
        stepFluidSimulation(
          { ...clearNodeSignalSpool(prev, id), fluid: proj.fluid },
          updatedNodes,
          proj.pipes,
          1 / 60
        )
      );
    }
  };

  const handleToggleValve = (id: string, sideHint?: 'left' | 'right' | 'cycle') => {
    const proj = projectRef.current;
    const toggledTarget = proj.nodes.find((n) => n.id === id);
    if (!toggledTarget) return;

    if (isInteractiveToggleType(toggledTarget.type) && !simRunningRef.current) {
      showNotice('Inicie a simulação para acionar os interruptores.');
      return;
    }

    recordHistory();
    if (isDirectionalValveType(toggledTarget.type) || toggledTarget.type === 'shutoff_valve') {
      playComponentSound('valve', appOptions.sound);
    } else {
      playComponentSound('switch', appOptions.sound);
    }

    const updatedNodes = proj.nodes.map((n) => {
      if (n.id !== id) return n;
      if (isDirectionalValveType(n.type)) {
        const behavior = getValveActuationBehavior(n, sideHint);
        const isThree = isThreePositionValveType(n.type);
        const currPos = isThree
          ? (n.params.spoolPosition ?? behavior.restPos)
          : n.params.spoolPosition !== undefined
            ? n.params.spoolPosition === 0
              ? 0
              : 1
            : n.params.active
              ? 0
              : 1;

        let nextPos: number;
        if (isThree) {
          nextPos =
            sideHint === 'left'
              ? currPos === 0
                ? behavior.restPos
                : 0
              : sideHint === 'right'
                ? currPos === 2
                  ? behavior.restPos
                  : 2
                : (currPos + 1) % 3;
        } else if (behavior.isDetent) {
          // Botoeira / acionador com trava: permanece pressionado até clicar novamente para destravar
          nextPos = currPos === behavior.pressPos ? behavior.restPos : behavior.pressPos;
        } else if (sideHint === 'left' || sideHint === 'right') {
          const vCfg = getEffectiveValveConfig(n);
          const oppositeSide = sideHint === 'left' ? vCfg.rightActuation : vCfg.leftActuation;
          const oppositeHasOp = Boolean(
            oppositeSide.manual ||
              oppositeSide.mechanical ||
              oppositeSide.electrical ||
              oppositeSide.piloted
          );
          nextPos = oppositeHasOp ? behavior.pressPos : currPos === 0 ? 1 : 0;
        } else {
          nextPos = currPos === 0 ? 1 : 0;
        }

        return {
          ...n,
          params: { ...n.params, spoolPosition: nextPos, active: nextPos === 0 },
        };
      }
      return {
        ...n,
        params: {
          ...n.params,
          active: n.type === 'shutoff_valve' ? n.params.active === false : !n.params.active,
        },
      };
    });

    projectRef.current = { ...proj, nodes: updatedNodes };
    setActiveProject((prev) => ({
      ...prev,
      nodes: updatedNodes,
    }));

    setSimState((prev) =>
      stepFluidSimulation(
        { ...clearNodeSignalSpool(prev, id), fluid: proj.fluid },
        updatedNodes,
        proj.pipes,
        1 / 60
      )
    );
  };

  const handleConnectPorts = (
    fromNodeId: string,
    fromPortId: string,
    toNodeId: string,
    toPortId: string
  ) => {
    if (!perms.canEditCircuit) return;
    const exists = activeProject.pipes.some(
      (p) =>
        (p.fromNodeId === fromNodeId &&
          p.fromPortId === fromPortId &&
          p.toNodeId === toNodeId &&
          p.toPortId === toPortId) ||
        (p.fromNodeId === toNodeId &&
          p.fromPortId === toPortId &&
          p.toNodeId === fromNodeId &&
          p.toPortId === fromPortId)
    );
    if (exists) return;
    const newPipe: PipeConnection = {
      id: `pipe_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      fromNodeId,
      fromPortId,
      toNodeId,
      toPortId,
    };
    recordHistory();
    setActiveProject((prev) => ({
      ...prev,
      pipes: [...prev.pipes, newPipe],
    }));
  };

  const handleConnectPortToPipe = (
    fromNodeId: string,
    fromPortId: string,
    targetPipeId: string,
    tapX: number,
    tapY: number
  ) => {
    if (!perms.canEditCircuit) return;
    const result = splitPipeWithJunction(
      projectRef.current.nodes,
      projectRef.current.pipes,
      fromNodeId,
      fromPortId,
      targetPipeId,
      tapX,
      tapY
    );
    if (!result.junctionNodeId) return;
    recordHistory();
    setActiveProject((prev) => ({
      ...prev,
      nodes: result.nodes,
      pipes: result.pipes,
    }));
    showNotice('Derivação conectada na tubulação.');
  };

  const handleUpdateParams = (nodeId: string, params: Partial<ComponentParams>) => {
    if (!perms.canEditCircuit) return;
    const now = Date.now();
    if (now - lastParamHistoryRef.current > 600) {
      recordHistory();
    }
    lastParamHistoryRef.current = now;
    setActiveProject((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId ? { ...n, params: { ...n.params, ...params } } : n
      ),
    }));
  };

  const handleUpdateLabel = (nodeId: string, label: string) => {
    if (!perms.canEditCircuit) return;
    const now = Date.now();
    if (now - lastParamHistoryRef.current > 600) {
      recordHistory();
    }
    lastParamHistoryRef.current = now;
    setActiveProject((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, label } : n)),
    }));
  };

  const handleDoubleClickNode = (nodeId: string, sideHint?: 'left' | 'right') => {
    const target = activeProject.nodes.find((n) => n.id === nodeId);
    if (!target) return;
    if (target.type === 'tank') {
      // Tanque não possui janela de propriedades no FluidSIM
      return;
    }
    if (target.type === 'cylinder_single' || target.type === 'cylinder_double') {
      setConfigCylinderNodeId(nodeId);
    } else if (isPropertyDialogComponent(target.type)) {
      setConfigPropertyNodeId(nodeId);
    } else if (isDirectionalValveType(target.type)) {
      if (sideHint) {
        const vCfg = getEffectiveValveConfig(target);
        const sideCfg = sideHint === 'left' ? vCfg.leftActuation : vCfg.rightActuation;
        if (hasConfiguredActuatorSide(sideCfg)) {
          setConfigMechTarget({ nodeId, side: sideHint });
          return;
        }
      }
      setConfigValveNodeId(nodeId);
    } else if (isFeedDialogComponent(target.type)) {
      setConfigFeedNodeId(nodeId);
    } else {
      setShowInspector(true);
    }
  };

  const handleDoubleClickPort = (nodeId: string, portId: string) => {
    setConfigPortTarget({ nodeId, portId });
  };

  const handleApplyFeedConfig = (nodeId: string, params: Partial<ComponentParams>) => {
    if (!perms.canEditCircuit) return;
    recordHistory();
    setActiveProject((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId ? { ...n, params: { ...n.params, ...params } } : n
      ),
    }));
    showNotice('Propriedades aplicadas com sucesso.');
  };

  const handleApplyPropertyConfig = (nodeId: string, params: Partial<ComponentParams>) => {
    if (!perms.canEditCircuit) return;
    recordHistory();
    setActiveProject((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId ? { ...n, params: { ...n.params, ...params } } : n
      ),
    }));
    if (params.rotaryInitialPos !== undefined) {
      const nextPos = params.rotaryInitialPos === 'right' ? 1 : 0;
      setSimState((prev) => {
        if (prev.running) return prev;
        const rt = prev.nodes[nodeId] ?? {
          id: nodeId,
          portPressures: {},
          flowLpm: 0,
          pistonPos: nextPos,
          velocityMs: 0,
          forceN: 0,
          rpm: 0,
          chamberAPressure: 0,
          chamberBPressure: 0,
          spoolPos: 0,
          isOpen: false,
          electrified: false,
          coilEnergized: false,
        };
        return {
          ...prev,
          nodes: {
            ...prev.nodes,
            [nodeId]: { ...rt, pistonPos: nextPos },
          },
        };
      });
    }
    showNotice('Propriedades aplicadas com sucesso.');
  };

  const handleApplyPortConfig = (nodeId: string, portId: string, portConfig: PortConfig) => {
    if (!perms.canEditCircuit) return;
    recordHistory();
    setActiveProject((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              params: {
                ...n.params,
                portConfigs: {
                  ...(n.params.portConfigs ?? {}),
                  [portId]: portConfig,
                },
              },
            }
          : n
      ),
    }));
    showNotice('Propriedades da conexão atualizadas.');
  };

  const handleApplyValveConfig = (
    nodeId: string,
    label: string,
    params: Partial<ComponentParams>
  ) => {
    if (!perms.canEditCircuit) return;
    recordHistory();
    setActiveProject((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId ? { ...n, label, params: { ...n.params, ...params } } : n
      ),
    }));
    showNotice(`Configurações aplicadas à válvula "${label}".`);
  };

  const handleApplyMechanicalConnection = (
    nodeId: string,
    side: 'left' | 'right',
    mark: string
  ) => {
    if (!perms.canEditCircuit) return;
    const cleanMark = mark.trim();
    if (configMechTarget?.onDraftApply) {
      configMechTarget.onDraftApply(cleanMark);
      showNotice(
        cleanMark
          ? `Marca "${cleanMark}" vinculada ao acionador (${side === 'left' ? 'Esquerda' : 'Direita'}).`
          : 'Vínculo de marca removido do acionador.'
      );
      return;
    }
    recordHistory();
    setActiveProject((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => {
        if (n.id !== nodeId) return n;
        if (isDirectionalValveType(n.type)) {
          const baseCfg = getEffectiveValveConfig(n);
          const sideKey = side === 'left' ? 'leftActuation' : 'rightActuation';
          return {
            ...n,
            params: {
              ...n.params,
              valveConfig: {
                ...baseCfg,
                [sideKey]: {
                  ...baseCfg[sideKey],
                  mark: cleanMark,
                },
              },
              ...(side === 'left'
                ? { sensingMark: cleanMark || undefined }
                : { secondaryMark: cleanMark || undefined }),
            },
          };
        }
        return {
          ...n,
          params: {
            ...n.params,
            ...(side === 'left'
              ? { sensingMark: cleanMark || undefined }
              : { secondaryMark: cleanMark || undefined }),
          },
        };
      }),
    }));
    showNotice(
      cleanMark
        ? `Conexão mecânica vinculada à marca "${cleanMark}".`
        : 'Conexão mecânica desvinculada.'
    );
  };

  const handleApplyCylinderConfig = (
    nodeId: string,
    nextType: 'cylinder_single' | 'cylinder_double',
    label: string,
    params: Partial<ComponentParams>
  ) => {
    if (!perms.canEditCircuit) return;
    recordHistory();
    setActiveProject((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              type: nextType,
              label,
              params: { ...n.params, ...params },
            }
          : n
      ),
      pipes:
        nextType === 'cylinder_single'
          ? prev.pipes.filter(
              (p) =>
                !(
                  (p.fromNodeId === nodeId && p.fromPortId === 'B') ||
                  (p.toNodeId === nodeId && p.toPortId === 'B')
                )
            )
          : prev.pipes,
    }));

    const stroke = Math.max(1, params.strokeMm ?? 200);
    const initMm = params.cylinderConfig?.initialPosMm ?? 0;
    const normPos = Number(Math.min(1, Math.max(0, initMm / stroke)).toFixed(4));
    setSimState((prev) => {
      if (prev.running) return prev;
      const nodeRt = prev.nodes[nodeId];
      if (!nodeRt) return prev;
      return {
        ...prev,
        nodes: {
          ...prev.nodes,
          [nodeId]: {
            ...nodeRt,
            pistonPos: normPos,
          },
        },
      };
    });
    showNotice(`Configurações aplicadas ao cilindro "${label}".`);
  };

  const handleRotateNode = (nodeId: string) => {
    if (!perms.canEditCircuit) return;
    recordHistory();
    setActiveProject((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, rotation: ((n.rotation + 90) % 360) as 0 | 90 | 180 | 270 }
          : n
      ),
    }));
  };

  const handleRotateSelection = () => {
    if (!perms.canEditCircuit || selectedNodeIds.length === 0) return;
    const targetSet = new Set(selectedNodeIds);
    recordHistory();
    setActiveProject((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        targetSet.has(n.id)
          ? { ...n, rotation: ((n.rotation + 90) % 360) as 0 | 90 | 180 | 270 }
          : n
      ),
    }));
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!perms.canEditCircuit) return;
    recordHistory();
    setActiveProject((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
      pipes: prev.pipes.filter((p) => p.fromNodeId !== nodeId && p.toNodeId !== nodeId),
    }));
    setSelectedNodeIds((ids) => ids.filter((id) => id !== nodeId));
  };

  const handleDeletePipe = (pipeId: string) => {
    if (!perms.canEditCircuit) return;
    recordHistory();
    setActiveProject((prev) => ({
      ...prev,
      pipes: prev.pipes.filter((p) => p.id !== pipeId),
    }));
    setSelectedPipeIds((ids) => ids.filter((id) => id !== pipeId));
  };

  const handleDeleteSelection = () => {
    if (!perms.canEditCircuit) return;
    if (selectedNodeIds.length === 0 && selectedPipeIds.length === 0) return;
    const nodeSet = new Set(selectedNodeIds);
    const pipeSet = new Set(selectedPipeIds);
    recordHistory();
    setActiveProject((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => !nodeSet.has(n.id)),
      pipes: prev.pipes.filter(
        (p) => !pipeSet.has(p.id) && !nodeSet.has(p.fromNodeId) && !nodeSet.has(p.toNodeId)
      ),
    }));
    setSelectedNodeIds([]);
    setSelectedPipeIds([]);
    showNotice('Seleção removida.');
  };

  const handleCopyNode = (nodeId: string) => {
    const target = projectRef.current.nodes.find((n) => n.id === nodeId);
    if (!target) return;
    setClipboardBundle({ nodes: [cloneNodeDeep(target)], pipes: [] });
    pasteCountRef.current = 0;
    showNotice(`"${target.label}" copiado (Ctrl+C).`);
  };

  const handleCopySelection = (explicitNodeIds?: string[]) => {
    const ids = explicitNodeIds ?? selectedNodeIds;
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const targetNodes = projectRef.current.nodes.filter((n) => idSet.has(n.id));
    if (targetNodes.length === 0) return;
    const internalPipes = projectRef.current.pipes
      .filter((p) => idSet.has(p.fromNodeId) && idSet.has(p.toNodeId))
      .map((p) => ({
        ...p,
        waypoints: p.waypoints ? p.waypoints.map((wp) => ({ ...wp })) : undefined,
      }));
    setClipboardBundle({
      nodes: targetNodes.map(cloneNodeDeep),
      pipes: internalPipes,
    });
    pasteCountRef.current = 0;
    showNotice(
      targetNodes.length === 1
        ? `"${targetNodes[0].label}" copiado (Ctrl+C).`
        : `${targetNodes.length} componentes copiados (Ctrl+C).`
    );
  };

  const handleCutNode = (nodeId: string) => {
    if (!perms.canEditCircuit) return;
    const target = projectRef.current.nodes.find((n) => n.id === nodeId);
    if (!target) return;
    setClipboardBundle({ nodes: [cloneNodeDeep(target)], pipes: [] });
    pasteCountRef.current = 0;
    recordHistory();
    setActiveProject((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
      pipes: prev.pipes.filter((p) => p.fromNodeId !== nodeId && p.toNodeId !== nodeId),
    }));
    setSelectedNodeIds((ids) => ids.filter((id) => id !== nodeId));
    showNotice(`"${target.label}" recortado (Ctrl+X).`);
  };

  const handleCutSelection = (explicitNodeIds?: string[]) => {
    if (!perms.canEditCircuit) return;
    const ids = explicitNodeIds ?? selectedNodeIds;
    if (ids.length === 0) return;
    handleCopySelection(ids);
    const idSet = new Set(ids);
    recordHistory();
    setActiveProject((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => !idSet.has(n.id)),
      pipes: prev.pipes.filter((p) => !idSet.has(p.fromNodeId) && !idSet.has(p.toNodeId)),
    }));
    setSelectedNodeIds([]);
    setSelectedPipeIds([]);
    showNotice(`${ids.length} item(ns) recortado(s) (Ctrl+X).`);
  };

  const handlePasteBundle = (atWorldPos?: { x: number; y: number }) => {
    if (!perms.canEditCircuit || !clipboardBundle || clipboardBundle.nodes.length === 0) return;
    pasteCountRef.current += 1;
    const stepOffset = pasteCountRef.current * 30;
    const anchor = clipboardBundle.nodes[0];
    const offsetX = atWorldPos ? atWorldPos.x - anchor.x : stepOffset;
    const offsetY = atWorldPos ? atWorldPos.y - anchor.y : stepOffset;

    const bundle = buildMultiPasteBundle(
      clipboardBundle.nodes,
      clipboardBundle.pipes,
      projectRef.current.nodes,
      offsetX,
      offsetY
    );
    recordHistory();
    setActiveProject((prev) => ({
      ...prev,
      nodes: [...prev.nodes, ...bundle.nodes],
      pipes: [...prev.pipes, ...bundle.pipes],
    }));
    setSelectedNodeIds(bundle.nodes.map((n) => n.id));
    setSelectedPipeIds(bundle.pipes.map((p) => p.id));
    showNotice(
      bundle.nodes.length === 1
        ? `"${bundle.nodes[0].label}" colado (Ctrl+V).`
        : `${bundle.nodes.length} componentes colados (Ctrl+V).`
    );
  };

  const handleSelectAll = () => {
    setSelectedNodeIds(projectRef.current.nodes.map((n) => n.id));
    setSelectedPipeIds(projectRef.current.pipes.map((p) => p.id));
    setAreaSelectMode(false);
    showNotice(`Todo o projeto selecionado (${projectRef.current.nodes.length} nós).`);
  };

  const handleShiftDuplicateNode = (nodeId: string): string | null => {
    if (!perms.canEditCircuit) return null;
    const src = projectRef.current.nodes.find((n) => n.id === nodeId);
    if (!src) return null;
    const dup = cloneNodeForPlacement(src, projectRef.current.nodes, src.x, src.y);
    recordHistory();
    setActiveProject((prev) => ({
      ...prev,
      nodes: [...prev.nodes, dup],
    }));
    setSelectedNodeIds([dup.id]);
    setSelectedPipeIds([]);
    return dup.id;
  };

  shortcutRef.current = {
    locked: !session || showIntroVideo,
    canEdit: perms.canEditCircuit,
    hasNodeSelection: selectedNodeIds.length > 0,
    hasAnySelection: selectedNodeIds.length > 0 || selectedPipeIds.length > 0,
    hasClipboard: Boolean(clipboardBundle && clipboardBundle.nodes.length > 0),
    onLock: handleLockWorkstation,
    onDeleteSelection: handleDeleteSelection,
    onCopySelection: () => handleCopySelection(),
    onCutSelection: () => handleCutSelection(),
    onPasteBundle: () => handlePasteBundle(),
    onSelectAll: handleSelectAll,
    onUndo: applyUndo,
    onRedo: applyRedo,
  };

  const handleQuickSave = async () => {
    if (!perms.canSaveProjects) {
      showNotice('Seu perfil Operador possui permissão somente para simulação.');
      return;
    }
    const targetProject: CircuitProject = activeProject.isPreset
      ? {
          ...activeProject,
          id: `proj_${Date.now()}`,
          name: `${activeProject.name} - Local`,
          isPreset: false,
          authorId: session.userId,
          authorName: session.displayName,
          createdAt: new Date().toISOString(),
        }
      : {
          ...activeProject,
          authorId: session.userId,
          authorName: session.displayName,
        };

    const saved = await saveProject(targetProject);
    setActiveProject(saved);
    setProjects(await listProjects());
    await appendAuditLog({
      userId: session.userId,
      username: session.username,
      action: 'PROJECT_SAVED',
      detail: `Projeto "${saved.name}" salvo localmente.`,
    });
    showNotice(`Projeto "${saved.name}" salvo no cofre local.`);
  };

  const handleSaveAsNew = async (name: string, description: string) => {
    const newProj: CircuitProject = {
      ...activeProject,
      id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name,
      description,
      isPreset: false,
      authorId: session.userId,
      authorName: session.displayName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const saved = await saveProject(newProj);
    setActiveProject(saved);
    setProjects(await listProjects());
    await appendAuditLog({
      userId: session.userId,
      username: session.username,
      action: 'PROJECT_SAVED',
      detail: `Novo projeto "${saved.name}" criado localmente.`,
    });
    showNotice(`Salvo como "${saved.name}".`);
  };

  const handleLoadProject = (proj: CircuitProject) => {
    setActiveProject(proj);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedNodeIds([]);
    setSelectedPipeIds([]);
    setTelemetry([]);
    setSimState(createInitialSimulationState(proj.nodes, proj.pipes, proj.fluid, false));
    setFitSignal((s) => s + 1);
    showNotice(`Circuito "${proj.name}" carregado.`);
  };

  const handleDeleteProject = async (id: string) => {
    await removeProject(id);
    setProjects(await listProjects());
    await appendAuditLog({
      userId: session.userId,
      username: session.username,
      action: 'PROJECT_DELETED',
      detail: `Projeto ${id} removido do IndexedDB.`,
    });
    showNotice('Projeto removido do banco local.');
  };

  const handleExportProject = async (proj: CircuitProject) => {
    const content = JSON.stringify(proj, null, 2);
    const filename = `${proj.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.fcproj`;
    if (window.fluidDesktop?.exportProjectFile) {
      await window.fluidDesktop.exportProjectFile(filename, content);
    } else {
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
    await appendAuditLog({
      userId: session.userId,
      username: session.username,
      action: 'PROJECT_EXPORTED',
      detail: `Arquivo ${filename} exportado.`,
    });
  };

  const handleImportProject = async (imported: CircuitProject) => {
    const normalized: CircuitProject = {
      ...imported,
      id: `proj_${Date.now()}`,
      isPreset: false,
      authorId: session.userId,
      authorName: session.displayName,
      updatedAt: new Date().toISOString(),
    };
    const saved = await saveProject(normalized);
    setProjects(await listProjects());
    handleLoadProject(saved);
    await appendAuditLog({
      userId: session.userId,
      username: session.username,
      action: 'PROJECT_IMPORTED',
      detail: `Projeto "${saved.name}" importado localmente.`,
    });
  };

  const handleExportCsv = () => {
    const header = 'tempo_s,pressao_bar,vazao_lpm,extensao_pct\n';
    const rows = telemetry
      .map(
        (pt) =>
          `${pt.t.toFixed(3)},${pt.pressureBar.toFixed(2)},${pt.flowLpm.toFixed(2)},${pt.extensionPct.toFixed(1)}`
      )
      .join('\n');
    const content = header + rows;
    if (window.fluidDesktop?.exportProjectFile) {
      window.fluidDesktop.exportProjectFile('telemetria_fluido.csv', content);
    } else {
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'telemetria_fluido.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const mdiDocumentPath = `Fluid Circuit Studio\\Diagramas\\${activeProject.name.replace(/\s+/g, '_')}.fcproj`;

  return (
    <div
      data-state={simState.running ? 'simulating' : 'idle'}
      className="h-screen w-screen overflow-hidden flex flex-col bg-[#F0F4F8] dark:bg-slate-950 text-slate-900 dark:text-slate-100"
    >
      {/* Row 1: Classic Desktop Window Title & Menu Bar */}
      <header className="relative z-50 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="h-7 px-3 flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <img
              src={APP_LOGO_SRC}
              alt="Logo Fluid Circuit Studio"
              className="w-4 h-4 rounded-sm object-cover shrink-0 border border-slate-300 dark:border-slate-700"
            />
            <span className="font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
              Fluid Circuit Studio
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="hidden sm:inline whitespace-nowrap">
              {isElectronRuntime() ? 'Desktop Nativo (.exe)' : 'Web / PWA Offline'} · {session.displayName}
            </span>
          </div>
        </div>

        {/* Classic Menu Bar (Arquivo, Edição, Executar, Biblioteca, Ver, Opções, Projetos, Configurações, App .EXE) */}
        <nav
          aria-label="Menu do Aplicativo"
          onClick={(e) => e.stopPropagation()}
          className="min-h-7 px-2 py-0.5 flex flex-wrap items-center gap-1 text-xs text-slate-700 dark:text-slate-200 relative overflow-visible"
        >
          {/* Arquivo */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu((m) => (m === 'arquivo' ? null : 'arquivo'))}
              className="px-2 py-0.5 rounded hover:bg-sky-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              Arquivo
            </button>
            {openMenu === 'arquivo' && (
              <div className="absolute left-0 top-full mt-0.5 w-48 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-lg rounded py-1 z-[120]">
                <button
                  type="button"
                  onClick={() => {
                    handleNewBlankCircuit();
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  Novo Diagrama
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProjectsModal(true);
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  Abrir Projeto Local...
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleQuickSave();
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  Salvar Circuito
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExportProject(activeProject);
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  Exportar .fcproj
                </button>
              </div>
            )}
          </div>

          {/* Edição */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu((m) => (m === 'edicao' ? null : 'edicao'))}
              className="px-2 py-0.5 rounded hover:bg-sky-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              Edição
            </button>
            {openMenu === 'edicao' && (
              <div className="absolute left-0 top-full mt-0.5 w-60 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-lg rounded py-1 z-[120]">
                <button
                  type="button"
                  disabled={undoStack.length === 0 || !perms.canEditCircuit}
                  onClick={() => {
                    applyUndo();
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-sky-50 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  <span>Desfazer</span>
                  <span className="text-[10px] font-mono text-slate-400">Ctrl+Z</span>
                </button>
                <button
                  type="button"
                  disabled={redoStack.length === 0 || !perms.canEditCircuit}
                  onClick={() => {
                    applyRedo();
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-sky-50 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  <span>Refazer</span>
                  <span className="text-[10px] font-mono text-slate-400">Ctrl+Y</span>
                </button>
                <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
                <button
                  type="button"
                  onClick={() => {
                    setAreaSelectMode((v) => !v);
                    setPanMode(false);
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  <span>Seleção por Área (2 pontos)</span>
                  <span className="text-[10px] font-mono text-sky-600">{areaSelectMode ? 'Ativo' : ''}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSelectAll();
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  <span>Selecionar Tudo</span>
                  <span className="text-[10px] font-mono text-slate-400">Ctrl+A</span>
                </button>
                <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
                <button
                  type="button"
                  disabled={selectedNodeIds.length === 0 || !perms.canEditCircuit}
                  onClick={() => {
                    handleCutSelection();
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-sky-50 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  <span>Recortar</span>
                  <span className="text-[10px] font-mono text-slate-400">Ctrl+X</span>
                </button>
                <button
                  type="button"
                  disabled={selectedNodeIds.length === 0}
                  onClick={() => {
                    handleCopySelection();
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-sky-50 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  <span>Copiar</span>
                  <span className="text-[10px] font-mono text-slate-400">Ctrl+C</span>
                </button>
                <button
                  type="button"
                  disabled={!clipboardBundle || clipboardBundle.nodes.length === 0 || !perms.canEditCircuit}
                  onClick={() => {
                    handlePasteBundle();
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-sky-50 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  <span>Colar</span>
                  <span className="text-[10px] font-mono text-slate-400">Ctrl+V</span>
                </button>
                <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
                <button
                  type="button"
                  disabled={selectedNodeIds.length === 0 || !perms.canEditCircuit}
                  onClick={() => {
                    handleRotateSelection();
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-sky-50 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  Girar 90°
                </button>
                <button
                  type="button"
                  disabled={(selectedNodeIds.length === 0 && selectedPipeIds.length === 0) || !perms.canEditCircuit}
                  onClick={() => {
                    handleDeleteSelection();
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40"
                >
                  <span>Excluir</span>
                  <span className="text-[10px] font-mono">Del</span>
                </button>
                <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
                <button
                  type="button"
                  onClick={() => {
                    setShowInspector((v) => !v);
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  Propriedades e Telemetria
                </button>
                <button
                  type="button"
                  data-testid="menu-toggle-component-legends"
                  onClick={() => {
                    setAppOptions((prev) => {
                      const next: AppOptions = {
                        ...prev,
                        showComponentLegends: !prev.showComponentLegends,
                      };
                      saveAppOptions(next);
                      return next;
                    });
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  <span>Desabilitar legendas dos componentes</span>
                  <span className="w-4 flex justify-end text-sky-600">
                    {!appOptions.showComponentLegends && <Check className="w-3.5 h-3.5" />}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Executar */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu((m) => (m === 'executar' ? null : 'executar'))}
              className="px-2 py-0.5 rounded hover:bg-sky-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              Executar
            </button>
            {openMenu === 'executar' && (
              <div className="absolute left-0 top-full mt-0.5 w-44 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-lg rounded py-1 z-[120]">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleSimulation(true);
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  Iniciar Simulação
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleToggleSimulation(false);
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  Pausar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleStepSimulation();
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  Passo Único
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleResetSimulation();
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  Zerar / Parar
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowLibrary((v) => !v)}
            className="px-2 py-0.5 rounded hover:bg-sky-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            Biblioteca
          </button>

          <button
            type="button"
            onClick={() => setShowOscilloscope((v) => !v)}
            className="px-2 py-0.5 rounded hover:bg-sky-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            Ver
          </button>

          {/* Opções (FluidSIM style dropdown) */}
          <div className="relative">
            <button
              type="button"
              data-testid="menu-opcoes"
              onClick={() => setOpenMenu((m) => (m === 'opcoes' ? null : 'opcoes'))}
              className={`px-2 py-0.5 rounded hover:bg-sky-50 dark:hover:bg-slate-800 whitespace-nowrap ${
                openMenu === 'opcoes' ? 'bg-sky-100 dark:bg-slate-800 text-sky-700 dark:text-sky-300' : ''
              }`}
            >
              Opções
            </button>
            {openMenu === 'opcoes' && (
              <div
                data-testid="dropdown-opcoes"
                className="absolute left-0 top-full mt-0.5 w-72 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-xl rounded py-1 z-[120]"
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveOptionsDialog('simulation');
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left pl-8 hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  Simulação...
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveOptionsDialog('opc_dde');
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left pl-8 hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  Conexão de OPC/DDE...
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveOptionsDialog('sound');
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  <span className="w-4 flex items-center justify-center text-sky-600">
                    {soundEnabled && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <span>Som...</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveOptionsDialog('didactic');
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left pl-8 hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  Didática...
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveOptionsDialog('grid');
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  <span className="w-4 flex items-center justify-center text-sky-600">
                    {appOptions.grid.showGrid && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <span>Grade...</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveOptionsDialog('terminal');
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left pl-8 hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  Diagrama de atribuição de terminais...
                </button>
                <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
                <button
                  type="button"
                  onClick={() => {
                    setAppOptions((prev) => ({
                      ...prev,
                      protectTextComponents: !prev.protectTextComponents,
                    }));
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  <span className="w-4 flex items-center justify-center text-sky-600">
                    {appOptions.protectTextComponents && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <span>Proteger componentes de texto</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAppOptions((prev) => ({
                      ...prev,
                      createBackups: !prev.createBackups,
                    }));
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  <span className="w-4 flex items-center justify-center text-sky-600">
                    {appOptions.createBackups && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <span>Criar cópias de segurança</span>
                </button>
                <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
                <button
                  type="button"
                  onClick={() => {
                    saveAppOptions(appOptions);
                    showNotice('Configuração atual salva com sucesso.');
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left pl-8 hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  Salvar configuração atual
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAppOptions((prev) => ({
                      ...prev,
                      saveConfigOnExit: !prev.saveConfigOnExit,
                    }));
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-sky-50 dark:hover:bg-slate-800"
                >
                  <span className="w-4 flex items-center justify-center text-sky-600">
                    {appOptions.saveConfigOnExit && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <span>Salvar configuração ao sair</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            data-testid="menu-didatico"
            onClick={() => {
              setDidacticManualTopic('overview');
              setShowDidacticManual(true);
              setOpenMenu(null);
            }}
            className="px-2 py-0.5 rounded hover:bg-sky-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            Didático
          </button>

          <button
            type="button"
            onClick={() => setShowProjectsModal(true)}
            className="px-2 py-0.5 rounded hover:bg-sky-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            Projetos
          </button>

          {session.role === 'admin' && !session.isPreviewShare && perms.canAccessCreationTools && (
            <button
              type="button"
              data-testid="btn-open-preview-share"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(null);
                setShowPreviewShareModal((v) => !v);
              }}
              className="px-2 py-0.5 rounded hover:bg-sky-50 dark:hover:bg-slate-800 whitespace-nowrap font-medium text-emerald-700 dark:text-emerald-400"
            >
              Compartilhar
            </button>
          )}

          {session.role === 'admin' && !session.isPreviewShare && perms.canManageUsers && perms.canAccessCreationTools && (
            <button
              type="button"
              onClick={() => setShowAccessModal(true)}
              className="px-2 py-0.5 rounded hover:bg-sky-50 dark:hover:bg-slate-800 whitespace-nowrap font-medium text-sky-700 dark:text-sky-400"
            >
              Configurações
            </button>
          )}

          {session.role === 'admin' && !session.isPreviewShare && perms.canAccessCreationTools && !isElectronRuntime() && (
            <button
              type="button"
              onClick={() => setShowDesktopModal(true)}
              className="px-2 py-0.5 rounded hover:bg-sky-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              App .EXE
            </button>
          )}
        </nav>
      </header>

      {/* Row 2: Classic Desktop Icon Toolbar */}
      <div
        role="toolbar"
        aria-label="Barra de Ferramentas"
        data-testid="main-toolbar"
        className="shrink-0 bg-[#F5F7FA] dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 px-2 py-1 flex items-center justify-between gap-1.5 overflow-x-auto"
      >
        <div className="flex items-center gap-0.5 shrink-0">
          {/* File Actions */}
          <button
            type="button"
            title="Novo diagrama"
            aria-label="Novo diagrama"
            onClick={handleNewBlankCircuit}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <FilePlus2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Abrir projetos locais"
            aria-label="Abrir projetos locais"
            onClick={() => setShowProjectsModal(true)}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Salvar circuito"
            aria-label="Salvar circuito"
            onClick={handleQuickSave}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <Save className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Undo & Redo (FluidSIM classic curved arrows) */}
          <button
            type="button"
            data-testid="btn-undo"
            title="Desfazer (Ctrl+Z)"
            aria-label="Desfazer"
            disabled={undoStack.length === 0 || !perms.canEditCircuit}
            onClick={applyUndo}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-35 text-slate-700 dark:text-slate-200"
          >
            <FluidUndoIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            data-testid="btn-redo"
            title="Refazer (Ctrl+Y)"
            aria-label="Refazer"
            disabled={redoStack.length === 0 || !perms.canEditCircuit}
            onClick={applyRedo}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-35 text-slate-700 dark:text-slate-200"
          >
            <FluidRedoIcon className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Cut, Copy, Paste */}
          <button
            type="button"
            data-testid="btn-cut"
            title="Recortar (Ctrl+X)"
            aria-label="Recortar selecionado"
            disabled={selectedNodeIds.length === 0 || !perms.canEditCircuit}
            onClick={() => handleCutSelection()}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-35 text-slate-700 dark:text-slate-200"
          >
            <Scissors className="w-4 h-4" />
          </button>
          <button
            type="button"
            data-testid="btn-copy"
            title="Copiar (Ctrl+C)"
            aria-label="Copiar selecionado"
            disabled={selectedNodeIds.length === 0}
            onClick={() => handleCopySelection()}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-35 text-slate-700 dark:text-slate-200"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            data-testid="btn-paste"
            title="Colar (Ctrl+V)"
            aria-label="Colar componente"
            disabled={!clipboardBundle || clipboardBundle.nodes.length === 0 || !perms.canEditCircuit}
            onClick={() => handlePasteBundle()}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-35 text-slate-700 dark:text-slate-200"
          >
            <ClipboardPaste className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Edit, Area Selection, Pan & Grid */}
          <button
            type="button"
            title="Rotacionar componente selecionado"
            aria-label="Rotacionar selecionado"
            disabled={selectedNodeIds.length === 0 || !perms.canEditCircuit}
            onClick={handleRotateSelection}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-35 text-slate-700 dark:text-slate-200"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Excluir selecionado"
            aria-label="Excluir selecionado"
            disabled={(selectedNodeIds.length === 0 && selectedPipeIds.length === 0) || !perms.canEditCircuit}
            onClick={handleDeleteSelection}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-35 text-slate-700 dark:text-slate-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Grade magnética"
            aria-label="Alternar grade magnética"
            onClick={() => {
              const nextShow = !appOptions.grid.showGrid;
              setSnapToGrid(nextShow);
              setAppOptions((prev) => ({
                ...prev,
                grid: { ...prev.grid, showGrid: nextShow },
              }));
            }}
            className={`p-1.5 rounded transition-colors ${
              appOptions.grid.showGrid
                ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            type="button"
            data-testid="btn-area-select"
            title="Seleção por área (1º clique + 2º clique arrastando)"
            aria-label="Seleção por área"
            onClick={() => {
              setAreaSelectMode((v) => !v);
              setPanMode(false);
            }}
            className={`p-1.5 rounded transition-colors ${
              areaSelectMode
                ? 'bg-sky-600 text-white shadow-sm'
                : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <BoxSelect className="w-4 h-4" />
          </button>
          <button
            type="button"
            data-testid="btn-pan-mode"
            title="Mover folha / Pan (ou segure o botão do scroll do mouse)"
            aria-label="Ferramenta Pan"
            onClick={() => {
              setPanMode((v) => !v);
              setAreaSelectMode(false);
            }}
            className={`p-1.5 rounded transition-colors ${
              panMode
                ? 'bg-sky-600 text-white shadow-sm'
                : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Hand className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Zoom Group */}
          <button
            type="button"
            title="Zoom 100%"
            aria-label="Zoom 1:1"
            onClick={() => setZoom(1)}
            className="px-1.5 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-200"
          >
            1:1
          </button>
          <button
            type="button"
            title="Ajustar circuito à tela"
            aria-label="Ajustar circuito à tela"
            onClick={() => setFitSignal((s) => s + 1)}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Aumentar zoom"
            aria-label="Aumentar zoom"
            onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Reduzir zoom"
            aria-label="Reduzir zoom"
            onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Simulation Controls (Stop, Play, Pause, Step) */}
          <button
            type="button"
            title="Parar / Zerar simulação"
            aria-label="Parar simulação"
            onClick={handleResetSimulation}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
          <button
            type="button"
            title="Iniciar simulação"
            aria-label="Iniciar Simulação"
            onClick={() => handleToggleSimulation(true)}
            className={`p-1.5 rounded transition-colors ${
              simState.running
                ? 'bg-emerald-600 text-white'
                : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-400'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
          </button>
          <button
            type="button"
            title="Pausar simulação"
            aria-label="Pausar Simulação"
            onClick={() => handleToggleSimulation(false)}
            disabled={!simState.running}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-35 text-slate-700 dark:text-slate-200"
          >
            <Pause className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Avançar um passo"
            aria-label="Passo"
            disabled={simState.running}
            onClick={handleStepSimulation}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-35 text-slate-700 dark:text-slate-200"
          >
            <StepForward className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Reiniciar"
            aria-label="Reiniciar"
            onClick={handleResetSimulation}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Dedicated Oscilloscope & Properties Floating Window Buttons */}
          <button
            type="button"
            onClick={() => setShowOscilloscope((v) => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              showOscilloscope
                ? 'bg-sky-600 text-white shadow-sm'
                : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Osciloscópio</span>
          </button>

          <button
            type="button"
            onClick={() => setShowInspector((v) => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              showInspector
                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Propriedades</span>
          </button>
        </div>

        {/* Right Side Toolbar: Fluid Mode, Theme & Lock */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center p-0.5 rounded bg-slate-200/80 dark:bg-slate-800">
            <button
              type="button"
              disabled={!perms.canEditCircuit}
              onClick={() => handleChangeFluid('hydraulic')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${
                activeProject.fluid === 'hydraulic'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Hidráulica
            </button>
            <button
              type="button"
              disabled={!perms.canEditCircuit}
              onClick={() => handleChangeFluid('pneumatic')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${
                activeProject.fluid === 'pneumatic'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Pneumática
            </button>
          </div>

          <button
            type="button"
            aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            onClick={() => setIsDark((v) => !v)}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleLockWorkstation}
            className="flex items-center gap-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium hover:bg-slate-100 whitespace-nowrap"
          >
            <Lock className="w-3 h-3" />
            <span className="hidden sm:inline">Bloquear</span>
          </button>
        </div>
      </div>

      {/* Mobile View Switcher (< 1024px) */}
      <div className="lg:hidden shrink-0 border-b border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setMobileView('diagram')}
          className={`flex-1 py-1 rounded text-xs font-medium ${
            mobileView === 'diagram'
              ? 'bg-sky-600 text-white'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          Diagrama
        </button>
        <button
          type="button"
          onClick={() => setMobileView('library')}
          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-xs font-medium ${
            mobileView === 'library'
              ? 'bg-sky-600 text-white'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Biblioteca
        </button>
      </div>

      {/* Main MDI Two-Pane Desktop Area */}
      <div className="flex-1 min-h-0 p-1.5 flex gap-1.5 bg-[#D4DCE6] dark:bg-slate-950 overflow-hidden">
        {/* Left MDI Window: Hierarchical Library */}
        {showLibrary && (
          <div
            className={`${
              mobileView === 'library' ? 'flex w-full' : 'hidden'
            } lg:flex lg:w-auto min-h-0`}
          >
            <ComponentPalette
              canEdit={perms.canEditCircuit}
              fluid={activeProject.fluid}
              projects={projects}
              activeProjectId={activeProject.id}
              isDark={isDark}
              onAddComponent={(payload) => handleAddComponent(payload)}
              onSelectProject={handleLoadProject}
            />
          </div>
        )}

        {/* Right MDI Document Window: White Circuit Sheet + Floating Windows */}
        <main
          className={`${
            mobileView === 'diagram' ? 'flex' : 'hidden'
          } lg:flex flex-1 min-w-0 min-h-0 flex-col border border-slate-400 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-sm shadow-sm overflow-hidden`}
        >
          {/* Classic MDI Document Title Bar */}
          <div className="h-7 shrink-0 px-2.5 bg-gradient-to-b from-[#DCE6F2] to-[#C2D4EA] dark:from-slate-800 dark:to-slate-800 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between gap-3 text-xs font-medium text-slate-800 dark:text-slate-100 select-none">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={APP_LOGO_SRC}
                alt=""
                className="w-3.5 h-3.5 rounded-sm object-cover shrink-0"
              />
              <span className="truncate font-mono text-[11px]">{mdiDocumentPath}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-300 shrink-0">
              <span>{Math.round(zoom * 100)}%</span>
            </div>
          </div>

          {/* Interactive Circuit Workspace + Floating Draggable Windows */}
          <div className="relative flex-1 min-h-0 flex overflow-hidden">
            <CircuitCanvas
              nodes={activeProject.nodes}
              pipes={activeProject.pipes}
              simState={simState}
              fluid={activeProject.fluid}
              selectedNodeIds={selectedNodeIds}
              selectedPipeIds={selectedPipeIds}
              areaSelectMode={areaSelectMode}
              panMode={panMode}
              canEdit={perms.canEditCircuit}
              isDark={isDark}
              zoom={zoom}
              snapToGrid={snapToGrid}
              gridOptions={appOptions.grid}
              lineColors={appOptions.simulation.lineColors}
              showComponentLegends={appOptions.showComponentLegends}
              fitSignal={fitSignal}
              onZoomChange={setZoom}
              onSelectionChange={(nodeIds, pipeIds) => {
                setSelectedNodeIds(nodeIds);
                setSelectedPipeIds(pipeIds);
              }}
              onAreaSelectComplete={() => setAreaSelectMode(false)}
              onMoveNodes={handleMoveNodes}
              onUpdatePipeWaypoints={handleUpdatePipeWaypoints}
              onToggleValve={handleToggleValve}
              onPressMomentaryActuator={handlePressMomentaryActuator}
              onReleaseMomentaryActuator={handleReleaseMomentaryActuator}
              onBlockedSwitchAttempt={() =>
                showNotice('Inicie a simulação para acionar os interruptores.')
              }
              onOpenMechanicalConnection={(nodeId, side, anchorPos) =>
                setConfigMechTarget({ nodeId, side, anchorPos })
              }
              onSnapNodeToPipe={handleSnapNodeToPipe}
              onDoubleClickNode={handleDoubleClickNode}
              onDoubleClickPort={handleDoubleClickPort}
              onConnectPorts={handleConnectPorts}
              onConnectPortToPipe={handleConnectPortToPipe}
              onDropCatalogItem={handleAddComponent}
              onStartNodeDrag={() => recordHistory()}
              onShiftDuplicateNode={handleShiftDuplicateNode}
              onStartPipeSegmentDrag={() => recordHistory()}
              onContextMenuNode={(nodeId, clientX, clientY) =>
                setContextMenu({ clientX, clientY, nodeId })
              }
              onContextMenuCanvas={(clientX, clientY, worldX, worldY) =>
                setContextMenu({ clientX, clientY, nodeId: null, worldX, worldY })
              }
            />

            {/* Floating Draggable Oscilloscope Window — only mounts when Osciloscópio button is clicked */}
            {showOscilloscope && (
              <FloatingOscilloscope
                open={showOscilloscope}
                history={telemetry}
                fluid={activeProject.fluid}
                isDark={isDark}
                onClose={() => setShowOscilloscope(false)}
                onExportCsv={handleExportCsv}
              />
            )}

            {/* Floating Draggable Properties & Telemetry Window */}
            <FloatingInspector
              open={showInspector}
              selectedNode={selectedNode}
              selectedPipe={selectedPipe}
              simState={simState}
              fluid={activeProject.fluid}
              canEdit={perms.canEditCircuit}
              isDark={isDark}
              onClose={() => setShowInspector(false)}
              onOpenCylinderConfig={(nodeId) => setConfigCylinderNodeId(nodeId)}
              onOpenValveConfig={(nodeId) => setConfigValveNodeId(nodeId)}
              onOpenMechanicalConnection={(nodeId, side) =>
                setConfigMechTarget({ nodeId, side })
              }
              onOpenPropertyConfig={(nodeId) => handleDoubleClickNode(nodeId)}
              onOpenPortConfig={(nodeId, portId) => handleDoubleClickPort(nodeId, portId)}
              onUpdateParams={handleUpdateParams}
              onToggleValve={handleToggleValve}
              onPressMomentaryActuator={handlePressMomentaryActuator}
              onReleaseMomentaryActuator={handleReleaseMomentaryActuator}
              onUpdateLabel={handleUpdateLabel}
              onRotateNode={handleRotateNode}
              onCopyNode={handleCopyNode}
              onDeleteNode={handleDeleteNode}
              onDeletePipe={handleDeletePipe}
            />

            {/* Floating Draggable Cylinder Configuration Dialog */}
            <CylinderConfigDialog
              node={configCylinderNode}
              canEdit={perms.canEditCircuit}
              isDark={isDark}
              onClose={() => setConfigCylinderNodeId(null)}
              onApply={handleApplyCylinderConfig}
            />

            {/* Floating Draggable Valve Configuration Dialog */}
            <ValveConfigDialog
              node={configValveNode}
              canEdit={perms.canEditCircuit}
              isDark={isDark}
              onClose={() => setConfigValveNodeId(null)}
              onApply={handleApplyValveConfig}
              onOpenMechanicalConnection={(side, currentMark, applyMarkToDraft) => {
                if (!configValveNode) return;
                setConfigMechTarget({
                  nodeId: configValveNode.id,
                  side,
                  markOverride: currentMark,
                  onDraftApply: applyMarkToDraft,
                });
              }}
            />

            {/* Floating Draggable Feed / Source / Pump / Filter / Accumulator Dialog */}
            <FeedConfigDialog
              node={configFeedNode}
              canEdit={perms.canEditCircuit}
              isDark={isDark}
              onClose={() => setConfigFeedNodeId(null)}
              onApply={handleApplyFeedConfig}
            />

            {/* Floating Draggable Component Property Dialog (FluidSIM Elements) */}
            <ComponentPropertyDialog
              node={configPropertyNode}
              canEdit={perms.canEditCircuit}
              isDark={isDark}
              onClose={() => setConfigPropertyNodeId(null)}
              onApply={handleApplyPropertyConfig}
              onResetAccumulatedFlow={(nodeId) => {
                setActiveProject((prev) => ({
                  ...prev,
                  nodes: prev.nodes.map((n) =>
                    n.id === nodeId
                      ? {
                          ...n,
                          params: {
                            ...n.params,
                            accumulatedVolumeResetSeq: (n.params.accumulatedVolumeResetSeq ?? 0) + 1,
                          },
                        }
                      : n
                  ),
                }));
                setSimState((prev) => {
                  const rt = prev.nodes[nodeId];
                  if (!rt) return prev;
                  return {
                    ...prev,
                    nodes: {
                      ...prev.nodes,
                      [nodeId]: { ...rt, accumulatedVolumeL: 0 },
                    },
                  };
                });
                showNotice('Totalizador de vazão restabelecido (0.00 l).');
              }}
            />

            {/* Floating Draggable Hydraulic/Pneumatic Port Connection Dialog */}
            <PortConfigDialog
              node={configPortInfo.node}
              port={configPortInfo.port}
              fluid={activeProject.fluid}
              canEdit={perms.canEditCircuit}
              isDark={isDark}
              onClose={() => setConfigPortTarget(null)}
              onApply={handleApplyPortConfig}
            />

            {/* Floating Draggable Mechanical Connection Dialog (Régua de distância / Marca) */}
            <MechanicalConnectionDialog
              target={
                configMechTarget
                  ? { nodeId: configMechTarget.nodeId, side: configMechTarget.side }
                  : null
              }
              node={configMechNode}
              fluid={activeProject.fluid}
              canEdit={perms.canEditCircuit}
              isDark={isDark}
              initialMarkOverride={configMechTarget?.markOverride}
              anchorPos={configMechTarget?.anchorPos}
              availableMarks={availableMechanicalMarks}
              onClose={() => setConfigMechTarget(null)}
              onApply={handleApplyMechanicalConnection}
            />
          </div>
        </main>
      </div>

      {/* Classic Desktop Bottom Status Bar */}
      <footer className="h-6 shrink-0 border-t border-slate-300 dark:border-slate-800 bg-[#F0F4F8] dark:bg-slate-900 px-3 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-3 truncate">
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {simState.running ? 'Simulação em execução' : 'Modo de edição'}
          </span>
          <span>·</span>
          <span className="font-mono">
            {simState.maxSystemPressureBar.toFixed(1)} bar | {simState.totalFlowLpm.toFixed(1)} L/min |{' '}
            {simState.powerKw.toFixed(2)} kW
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!isOnline && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
              <WifiOff className="w-3 h-3" /> Offline
            </span>
          )}
          <span className="hidden sm:inline">
            {session.isPreviewShare
              ? `Preview: ${session.displayName}`
              : `${session.username} (${session.role})`}{' '}
            · {activeProject.nodes.length} nós
          </span>
        </div>
      </footer>

      {contextMenu && (
        <div
          data-testid="canvas-context-menu"
          role="menu"
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            left: Math.min(contextMenu.clientX, window.innerWidth - 220),
            top: Math.min(contextMenu.clientY, Math.max(8, window.innerHeight - 360)),
          }}
          className="fixed z-50 w-52 max-h-[82vh] overflow-y-auto rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1 text-xs text-slate-800 dark:text-slate-100 select-none"
        >
          {contextMenu.nodeId ? (
            <>
              <button
                type="button"
                role="menuitem"
                disabled={!perms.canEditCircuit}
                onClick={() => {
                  if (selectedNodeIds.includes(contextMenu.nodeId!) && selectedNodeIds.length > 1) {
                    handleRotateSelection();
                  } else {
                    handleRotateNode(contextMenu.nodeId!);
                  }
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-sky-50 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                  Girar 90°
                </span>
              </button>
              <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
              <button
                type="button"
                role="menuitem"
                disabled={!perms.canEditCircuit}
                onClick={() => {
                  if (selectedNodeIds.includes(contextMenu.nodeId!) && selectedNodeIds.length > 1) {
                    handleCutSelection();
                  } else {
                    handleCutNode(contextMenu.nodeId!);
                  }
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-sky-50 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <Scissors className="w-3.5 h-3.5 text-slate-500" />
                  Recortar
                </span>
                <span className="text-[10px] font-mono text-slate-400">Ctrl+X</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (selectedNodeIds.includes(contextMenu.nodeId!) && selectedNodeIds.length > 1) {
                    handleCopySelection();
                  } else {
                    handleCopyNode(contextMenu.nodeId!);
                  }
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-sky-50 dark:hover:bg-slate-800"
              >
                <span className="flex items-center gap-2">
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  Copiar
                </span>
                <span className="text-[10px] font-mono text-slate-400">Ctrl+C</span>
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={!clipboardBundle || clipboardBundle.nodes.length === 0 || !perms.canEditCircuit}
                onClick={() => {
                  handlePasteBundle();
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-sky-50 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <ClipboardPaste className="w-3.5 h-3.5 text-slate-500" />
                  Colar
                </span>
                <span className="text-[10px] font-mono text-slate-400">Ctrl+V</span>
              </button>
              {(() => {
                const ctxNode = activeProject.nodes.find((n) => n.id === contextMenu.nodeId);
                if (!ctxNode || ctxNode.type === 'tank') return null;
                const vCfg = isDirectionalValveType(ctxNode.type)
                  ? getEffectiveValveConfig(ctxNode)
                  : null;
                return (
                  <>
                    <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        handleDoubleClickNode(contextMenu.nodeId!);
                        setContextMenu(null);
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-sky-50 dark:hover:bg-slate-800"
                    >
                      <Sliders className="w-3.5 h-3.5 text-slate-500" />
                      Propriedades...
                    </button>
                    {vCfg && hasConfiguredActuatorSide(vCfg.leftActuation) && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setConfigMechTarget({
                            nodeId: ctxNode.id,
                            side: 'left',
                            anchorPos: { x: contextMenu.clientX, y: contextMenu.clientY },
                          });
                          setContextMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-sky-50 dark:hover:bg-slate-800"
                      >
                        <Plug className="w-3.5 h-3.5 text-slate-500" />
                        Conexão (mecânica) — Esq...
                      </button>
                    )}
                    {vCfg && hasConfiguredActuatorSide(vCfg.rightActuation) && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setConfigMechTarget({
                            nodeId: ctxNode.id,
                            side: 'right',
                            anchorPos: { x: contextMenu.clientX, y: contextMenu.clientY },
                          });
                          setContextMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-sky-50 dark:hover:bg-slate-800"
                      >
                        <Plug className="w-3.5 h-3.5 text-slate-500" />
                        Conexão (mecânica) — Dir...
                      </button>
                    )}
                    {!vCfg && isActuatorMarkComponent(ctxNode.type) && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setConfigMechTarget({
                            nodeId: ctxNode.id,
                            side: 'left',
                            anchorPos: { x: contextMenu.clientX, y: contextMenu.clientY },
                          });
                          setContextMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-sky-50 dark:hover:bg-slate-800"
                      >
                        <Plug className="w-3.5 h-3.5 text-slate-500" />
                        Conexão (mecânica)...
                      </button>
                    )}
                  </>
                );
              })()}
              {(() => {
                const ctxNode = activeProject.nodes.find((n) => n.id === contextMenu.nodeId);
                const ctxPorts = ctxNode ? COMPONENT_CATALOG[ctxNode.type].ports : [];
                if (!ctxNode || ctxPorts.length === 0) return null;
                return (
                  <>
                    <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Conexões do componente
                    </div>
                    {ctxPorts.map((port) => (
                      <button
                        key={port.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          handleDoubleClickPort(ctxNode.id, port.id);
                          setContextMenu(null);
                        }}
                        className="w-full px-3 py-1 text-left flex items-center justify-between hover:bg-sky-50 dark:hover:bg-slate-800"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <Plug className="w-3 h-3 text-slate-500 shrink-0" />
                          Conexão {port.label || port.id}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">...</span>
                      </button>
                    ))}
                  </>
                );
              })()}
              <button
                type="button"
                role="menuitem"
                disabled={!perms.canEditCircuit}
                onClick={() => {
                  if (selectedNodeIds.includes(contextMenu.nodeId!) && selectedNodeIds.length > 1) {
                    handleDeleteSelection();
                  } else {
                    handleDeleteNode(contextMenu.nodeId!);
                  }
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </span>
                <span className="text-[10px] font-mono">Del</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAreaSelectMode(true);
                  setPanMode(false);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-sky-50 dark:hover:bg-slate-800"
              >
                <BoxSelect className="w-3.5 h-3.5 text-slate-500" />
                Seleção por Área
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  handleSelectAll();
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-sky-50 dark:hover:bg-slate-800"
              >
                <span>Selecionar Tudo</span>
                <span className="text-[10px] font-mono text-slate-400">Ctrl+A</span>
              </button>
              <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
              <button
                type="button"
                role="menuitem"
                disabled={!clipboardBundle || clipboardBundle.nodes.length === 0 || !perms.canEditCircuit}
                onClick={() => {
                  handlePasteBundle(
                    contextMenu.worldX !== undefined && contextMenu.worldY !== undefined
                      ? { x: contextMenu.worldX, y: contextMenu.worldY }
                      : undefined
                  );
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-sky-50 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <ClipboardPaste className="w-3.5 h-3.5 text-slate-500" />
                  Colar aqui
                </span>
                <span className="text-[10px] font-mono text-slate-400">Ctrl+V</span>
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={undoStack.length === 0 || !perms.canEditCircuit}
                onClick={() => {
                  applyUndo();
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-sky-50 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <FluidUndoIcon className="w-3.5 h-3.5 text-slate-500" />
                  Desfazer
                </span>
                <span className="text-[10px] font-mono text-slate-400">Ctrl+Z</span>
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={redoStack.length === 0 || !perms.canEditCircuit}
                onClick={() => {
                  applyRedo();
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-sky-50 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <FluidRedoIcon className="w-3.5 h-3.5 text-slate-500" />
                  Refazer
                </span>
                <span className="text-[10px] font-mono text-slate-400">Ctrl+Y</span>
              </button>
            </>
          )}
        </div>
      )}

      {toastMsg && (
        <div
          role="status"
          className="fixed bottom-8 right-4 z-50 px-3.5 py-2 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium shadow-lg"
        >
          {toastMsg}
        </div>
      )}

      <ProjectsModal
        open={showProjectsModal}
        projects={projects}
        activeProject={activeProject}
        canSave={perms.canSaveProjects}
        canDelete={perms.canDeleteProjects}
        onClose={() => setShowProjectsModal(false)}
        onLoadProject={handleLoadProject}
        onSaveAsNew={handleSaveAsNew}
        onDeleteProject={handleDeleteProject}
        onExportProject={handleExportProject}
        onImportProject={handleImportProject}
      />

      <AccessControlModal
        open={showAccessModal && session.role === 'admin' && !session.isPreviewShare && perms.canAccessCreationTools}
        session={session}
        onClose={() => setShowAccessModal(false)}
        onOpenPreviewShare={() => setShowPreviewShareModal(true)}
        onSessionUpdated={(updatedUser) => {
          setSession((curr) =>
            curr
              ? {
                  ...curr,
                  userId: updatedUser.id,
                  username: updatedUser.username,
                  displayName: updatedUser.displayName,
                  role: updatedUser.role,
                }
              : curr
          );
        }}
        onLicenseUpdated={(tier) => setSession((s) => (s ? { ...s, licenseTier: tier } : s))}
      />

      <PreviewShareModal
        open={showPreviewShareModal && session.role === 'admin' && !session.isPreviewShare && perms.canAccessCreationTools}
        session={session}
        onClose={() => setShowPreviewShareModal(false)}
      />

      <DesktopPackageModal
        open={showDesktopModal && session.role === 'admin' && !session.isPreviewShare && perms.canAccessCreationTools}
        onClose={() => setShowDesktopModal(false)}
      />

      <OptionsDialogs
        activeDialog={activeOptionsDialog}
        options={appOptions}
        nodes={activeProject.nodes}
        simState={simState}
        onClose={() => setActiveOptionsDialog(null)}
        onApply={(next) => {
          setAppOptions(next);
          setSnapToGrid(next.grid.showGrid);
          saveAppOptions(next);
          showNotice('Configurações aplicadas.');
        }}
        onOpenHelp={(topic) => {
          setDidacticManualTopic(topic);
          setShowDidacticManual(true);
        }}
      />

      <DidacticManualModal
        open={showDidacticManual}
        initialTopic={didacticManualTopic}
        onClose={() => setShowDidacticManual(false)}
      />
    </div>
  );
}
