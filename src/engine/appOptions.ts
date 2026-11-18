export type SimSpeedMode = 'realtime' | 'continuous' | 'slow_motion';
export type OpcDdeMode = 'none' | 'easyport' | 'opc' | 'dde';
export type GridWidthMode = 'coarse' | 'medium' | 'fine';
export type GridStyleMode = 'dot' | 'cross' | 'line';
export type TerminalOptimizeMode = 'clear' | 'reduce';
export type TerminalWiringMode = 'logical' | 'bridges';
export type TerminalNamingMode = 'x_dash' | 'prefix_x';

export interface AppOptions {
  simulation: {
    lineColors: {
      noPressure: string;
      pressureTransmitter: string;
      vaporPressure: string;
      currentTransmitter: string;
      digitalLo: string;
      digitalHi: string;
    };
    speedMode: SimSpeedMode;
    slowMotionFactor: number;
    showLabelCase: boolean;
    caseSensitiveLabels: boolean;
    digitalOpenInputsHi: boolean;
    digitalOpenInputsWarning: boolean;
    ambientTempC: number;
  };
  opcDde: {
    mode: OpcDdeMode;
    easyPortBufferEvents: boolean;
    easyPortSyncIO: boolean;
    opcBufferEvents: boolean;
    ddeServer: string;
    ddeTopic: string;
    ddeFpcAddressing: boolean;
  };
  sound: {
    switchSound: boolean;
    relaySound: boolean;
    valveSound: boolean;
    cylinderSound: boolean;
    buzzerSound: boolean;
  };
  didactic: {
    animationSpeed: number; // 1..5
    presentationMode: 'manual' | 'auto';
    autoDelaySeconds: number;
    infiniteRepeat: boolean;
  };
  grid: {
    width: GridWidthMode;
    style: GridStyleMode;
    showGrid: boolean;
  };
  terminalDiagram: {
    optimize: TerminalOptimizeMode;
    wiring: TerminalWiringMode;
    naming: TerminalNamingMode;
  };
  protectTextComponents: boolean;
  showComponentLegends: boolean;
  createBackups: boolean;
  saveConfigOnExit: boolean;
}

export const DEFAULT_APP_OPTIONS: AppOptions = {
  simulation: {
    lineColors: {
      noPressure: '#808000',
      pressureTransmitter: '#800000',
      vaporPressure: '#FF00FF',
      currentTransmitter: '#FF0000',
      digitalLo: '#008080',
      digitalHi: '#00FF00',
    },
    speedMode: 'realtime',
    slowMotionFactor: 1,
    showLabelCase: false,
    caseSensitiveLabels: false,
    digitalOpenInputsHi: true,
    digitalOpenInputsWarning: true,
    ambientTempC: 25,
  },
  opcDde: {
    mode: 'easyport',
    easyPortBufferEvents: true,
    easyPortSyncIO: false,
    opcBufferEvents: true,
    ddeServer: 'FLSIMH',
    ddeTopic: 'IOPanel',
    ddeFpcAddressing: false,
  },
  sound: {
    switchSound: true,
    relaySound: true,
    valveSound: true,
    cylinderSound: true,
    buzzerSound: false,
  },
  didactic: {
    animationSpeed: 3,
    presentationMode: 'manual',
    autoDelaySeconds: 1,
    infiniteRepeat: false,
  },
  grid: {
    width: 'medium',
    style: 'line',
    showGrid: true,
  },
  terminalDiagram: {
    optimize: 'clear',
    wiring: 'logical',
    naming: 'x_dash',
  },
  protectTextComponents: false,
  showComponentLegends: true,
  createBackups: true,
  saveConfigOnExit: false,
};

export const APP_OPTIONS_STORAGE_KEY = 'fcs_options';

export function mergeAppOptions(raw: unknown): AppOptions {
  const base = DEFAULT_APP_OPTIONS;
  if (!raw || typeof raw !== 'object') {
    return structuredClone(base);
  }
  const obj = raw as Record<string, unknown>;
  const sim = (obj.simulation as Record<string, unknown> | undefined) ?? {};
  const colors = (sim.lineColors as Record<string, unknown> | undefined) ?? {};
  const opc = (obj.opcDde as Record<string, unknown> | undefined) ?? {};
  const snd = (obj.sound as Record<string, unknown> | undefined) ?? {};
  const did = (obj.didactic as Record<string, unknown> | undefined) ?? {};
  const grd = (obj.grid as Record<string, unknown> | undefined) ?? {};
  const trm = (obj.terminalDiagram as Record<string, unknown> | undefined) ?? {};

  const legacySpeed = typeof obj.simSpeedFactor === 'number' ? obj.simSpeedFactor : undefined;
  let speedMode: SimSpeedMode =
    sim.speedMode === 'realtime' || sim.speedMode === 'continuous' || sim.speedMode === 'slow_motion'
      ? sim.speedMode
      : base.simulation.speedMode;
  let slowMotionFactor =
    typeof sim.slowMotionFactor === 'number' && Number.isFinite(sim.slowMotionFactor)
      ? Math.min(100, Math.max(1, Math.round(sim.slowMotionFactor)))
      : base.simulation.slowMotionFactor;

  if (!sim.speedMode && typeof legacySpeed === 'number') {
    if (legacySpeed < 0.99) {
      speedMode = 'slow_motion';
      slowMotionFactor = Math.max(1, Math.round(1 / Math.max(0.05, legacySpeed)));
    } else if (legacySpeed > 1.01) {
      speedMode = 'continuous';
    }
  }

  return {
    simulation: {
      lineColors: {
        noPressure:
          typeof colors.noPressure === 'string' ? colors.noPressure : base.simulation.lineColors.noPressure,
        pressureTransmitter:
          typeof colors.pressureTransmitter === 'string'
            ? colors.pressureTransmitter
            : base.simulation.lineColors.pressureTransmitter,
        vaporPressure:
          typeof colors.vaporPressure === 'string'
            ? colors.vaporPressure
            : base.simulation.lineColors.vaporPressure,
        currentTransmitter:
          typeof colors.currentTransmitter === 'string'
            ? colors.currentTransmitter
            : base.simulation.lineColors.currentTransmitter,
        digitalLo:
          typeof colors.digitalLo === 'string' ? colors.digitalLo : base.simulation.lineColors.digitalLo,
        digitalHi:
          typeof colors.digitalHi === 'string' ? colors.digitalHi : base.simulation.lineColors.digitalHi,
      },
      speedMode,
      slowMotionFactor,
      showLabelCase:
        typeof sim.showLabelCase === 'boolean' ? sim.showLabelCase : base.simulation.showLabelCase,
      caseSensitiveLabels:
        typeof sim.caseSensitiveLabels === 'boolean'
          ? sim.caseSensitiveLabels
          : base.simulation.caseSensitiveLabels,
      digitalOpenInputsHi:
        typeof sim.digitalOpenInputsHi === 'boolean'
          ? sim.digitalOpenInputsHi
          : base.simulation.digitalOpenInputsHi,
      digitalOpenInputsWarning:
        typeof sim.digitalOpenInputsWarning === 'boolean'
          ? sim.digitalOpenInputsWarning
          : base.simulation.digitalOpenInputsWarning,
      ambientTempC:
        typeof sim.ambientTempC === 'number'
          ? sim.ambientTempC
          : typeof obj.ambientTempC === 'number'
            ? obj.ambientTempC
            : base.simulation.ambientTempC,
    },
    opcDde: {
      mode:
        opc.mode === 'none' || opc.mode === 'easyport' || opc.mode === 'opc' || opc.mode === 'dde'
          ? opc.mode
          : base.opcDde.mode,
      easyPortBufferEvents:
        typeof opc.easyPortBufferEvents === 'boolean'
          ? opc.easyPortBufferEvents
          : base.opcDde.easyPortBufferEvents,
      easyPortSyncIO:
        typeof opc.easyPortSyncIO === 'boolean' ? opc.easyPortSyncIO : base.opcDde.easyPortSyncIO,
      opcBufferEvents:
        typeof opc.opcBufferEvents === 'boolean' ? opc.opcBufferEvents : base.opcDde.opcBufferEvents,
      ddeServer: typeof opc.ddeServer === 'string' ? opc.ddeServer : base.opcDde.ddeServer,
      ddeTopic: typeof opc.ddeTopic === 'string' ? opc.ddeTopic : base.opcDde.ddeTopic,
      ddeFpcAddressing:
        typeof opc.ddeFpcAddressing === 'boolean'
          ? opc.ddeFpcAddressing
          : base.opcDde.ddeFpcAddressing,
    },
    sound: {
      switchSound:
        typeof snd.switchSound === 'boolean'
          ? snd.switchSound
          : typeof obj.soundEnabled === 'boolean'
            ? obj.soundEnabled
            : base.sound.switchSound,
      relaySound:
        typeof snd.relaySound === 'boolean'
          ? snd.relaySound
          : typeof obj.soundEnabled === 'boolean'
            ? obj.soundEnabled
            : base.sound.relaySound,
      valveSound:
        typeof snd.valveSound === 'boolean'
          ? snd.valveSound
          : typeof obj.soundEnabled === 'boolean'
            ? obj.soundEnabled
            : base.sound.valveSound,
      cylinderSound:
        typeof snd.cylinderSound === 'boolean'
          ? snd.cylinderSound
          : typeof obj.soundEnabled === 'boolean'
            ? obj.soundEnabled
            : base.sound.cylinderSound,
      buzzerSound:
        typeof snd.buzzerSound === 'boolean' ? snd.buzzerSound : base.sound.buzzerSound,
    },
    didactic: {
      animationSpeed:
        typeof did.animationSpeed === 'number'
          ? Math.min(5, Math.max(1, Math.round(did.animationSpeed)))
          : base.didactic.animationSpeed,
      presentationMode:
        did.presentationMode === 'manual' || did.presentationMode === 'auto'
          ? did.presentationMode
          : base.didactic.presentationMode,
      autoDelaySeconds:
        typeof did.autoDelaySeconds === 'number' && did.autoDelaySeconds >= 1
          ? Math.round(did.autoDelaySeconds)
          : base.didactic.autoDelaySeconds,
      infiniteRepeat:
        typeof did.infiniteRepeat === 'boolean' ? did.infiniteRepeat : base.didactic.infiniteRepeat,
    },
    grid: {
      width:
        grd.width === 'coarse' || grd.width === 'medium' || grd.width === 'fine'
          ? grd.width
          : base.grid.width,
      style:
        grd.style === 'dot' || grd.style === 'cross' || grd.style === 'line'
          ? grd.style
          : base.grid.style,
      showGrid:
        typeof grd.showGrid === 'boolean'
          ? grd.showGrid
          : typeof obj.snapToGrid === 'boolean'
            ? obj.snapToGrid
            : base.grid.showGrid,
    },
    terminalDiagram: {
      optimize:
        trm.optimize === 'clear' || trm.optimize === 'reduce'
          ? trm.optimize
          : base.terminalDiagram.optimize,
      wiring:
        trm.wiring === 'logical' || trm.wiring === 'bridges'
          ? trm.wiring
          : base.terminalDiagram.wiring,
      naming:
        trm.naming === 'x_dash' || trm.naming === 'prefix_x'
          ? trm.naming
          : base.terminalDiagram.naming,
    },
    protectTextComponents:
      typeof obj.protectTextComponents === 'boolean'
        ? obj.protectTextComponents
        : base.protectTextComponents,
    showComponentLegends:
      typeof obj.showComponentLegends === 'boolean'
        ? obj.showComponentLegends
        : base.showComponentLegends,
    createBackups:
      typeof obj.createBackups === 'boolean' ? obj.createBackups : base.createBackups,
    saveConfigOnExit:
      typeof obj.saveConfigOnExit === 'boolean' ? obj.saveConfigOnExit : base.saveConfigOnExit,
  };
}

export function loadAppOptions(): AppOptions {
  try {
    const raw = localStorage.getItem(APP_OPTIONS_STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_APP_OPTIONS);
    return mergeAppOptions(JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULT_APP_OPTIONS);
  }
}

export function saveAppOptions(opts: AppOptions): void {
  try {
    localStorage.setItem(APP_OPTIONS_STORAGE_KEY, JSON.stringify(opts));
  } catch {
    // Ignore storage quota exceptions
  }
}

export function getGridStepPx(width: GridWidthMode): number {
  switch (width) {
    case 'coarse':
      return 30;
    case 'fine':
      return 10;
    case 'medium':
    default:
      return 20;
  }
}

export function getSimulationSpeedMultiplier(sim: AppOptions['simulation']): number {
  if (sim.speedMode === 'continuous') return 1.5;
  if (sim.speedMode === 'slow_motion') {
    return 1 / Math.max(1, Math.min(100, sim.slowMotionFactor || 1));
  }
  return 1;
}

export function isAnySoundEnabled(sound: AppOptions['sound']): boolean {
  return (
    sound.switchSound ||
    sound.relaySound ||
    sound.valveSound ||
    sound.cylinderSound ||
    sound.buzzerSound
  );
}

export function formatTerminalTag(
  groupIndex: number,
  pinIndex: number,
  naming: TerminalNamingMode
): string {
  const g = Math.max(1, groupIndex);
  const p = Math.max(1, pinIndex);
  return naming === 'prefix_x' ? `${g}X${p}` : `X${g}-${p}`;
}

let sharedAudioCtx: AudioContext | null = null;

export function playComponentSound(
  kind: 'switch' | 'relay' | 'valve' | 'cylinder' | 'buzzer',
  soundOpts: AppOptions['sound']
): void {
  const enabled =
    (kind === 'switch' && soundOpts.switchSound) ||
    (kind === 'relay' && soundOpts.relaySound) ||
    (kind === 'valve' && soundOpts.valveSound) ||
    (kind === 'cylinder' && soundOpts.cylinderSound) ||
    (kind === 'buzzer' && soundOpts.buzzerSound);
  if (!enabled || typeof window === 'undefined') return;

  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new Ctor();
    }
    const ctx = sharedAudioCtx;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    if (kind === 'switch') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.035);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.045);
    } else if (kind === 'relay') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(620, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (kind === 'valve') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.065);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.075);
    } else if (kind === 'cylinder') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch {
    // Ignore audio context restriction errors in headless browsers
  }
}
