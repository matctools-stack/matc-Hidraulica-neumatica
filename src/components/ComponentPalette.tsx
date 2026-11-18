import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FolderOpen, Search } from 'lucide-react';
import {
  COMPONENT_CATALOG,
  createDefaultCylinderConfig,
  createDefaultValveConfig,
} from '../engine/fluidSolver';
import type {
  CircuitProject,
  ComponentParams,
  ComponentType,
  CylinderConfig,
  FluidMedium,
  ValveConfig,
} from '../types/circuit';
import { ComponentSymbolThumb } from './ComponentSymbolThumb';

export interface PaletteItemPayload {
  type: ComponentType;
  label?: string;
  defaultParams?: Partial<ComponentParams>;
}

interface ComponentPaletteProps {
  canEdit: boolean;
  fluid: FluidMedium;
  projects: CircuitProject[];
  activeProjectId: string;
  isDark: boolean;
  onAddComponent: (payload: PaletteItemPayload) => void;
  onSelectProject: (project: CircuitProject) => void;
}

interface PaletteCardDef {
  id: string;
  type: ComponentType;
  shortName: string;
  title: string;
  defaultParams?: Partial<ComponentParams>;
  valveConfig?: ValveConfig;
  cylinderConfig?: Partial<CylinderConfig>;
}

function makeMechPreset(
  id: string,
  type: ComponentType,
  shortName: string,
  title: string,
  manual: '' | 'button' | 'lever' | 'pedal' | 'detent_lever',
  mechanical: '' | 'plunger' | 'roller' | 'idle_roller',
  chambers?: ValveConfig['chambers']
): PaletteCardDef {
  const cfg = createDefaultValveConfig(type);
  cfg.leftActuation = {
    springReturn: false,
    piloted: false,
    externalFeed: false,
    manual,
    mechanical,
    electrical: '',
  };
  cfg.rightActuation = {
    springReturn: true,
    piloted: false,
    externalFeed: false,
    manual: '',
    mechanical: '',
    electrical: '',
  };
  if (chambers) cfg.chambers = chambers;
  return {
    id,
    type,
    shortName,
    title,
    valveConfig: cfg,
    defaultParams: { actuation: 'manual', valveConfig: cfg },
  };
}

function makeSolenoidPreset(
  id: string,
  type: ComponentType,
  shortName: string,
  title: string,
  doubleSolenoid: boolean,
  chambers?: ValveConfig['chambers']
): PaletteCardDef {
  const cfg = createDefaultValveConfig(type);
  cfg.leftActuation = {
    springReturn: false,
    piloted: false,
    externalFeed: false,
    manual: '',
    mechanical: '',
    electrical: 'solenoid',
  };
  cfg.rightActuation = {
    springReturn: !doubleSolenoid,
    piloted: false,
    externalFeed: false,
    manual: '',
    mechanical: '',
    electrical: doubleSolenoid ? 'solenoid' : '',
  };
  if (chambers) cfg.chambers = chambers;
  return {
    id,
    type,
    shortName,
    title,
    valveConfig: cfg,
    defaultParams: { actuation: 'solenoid', valveConfig: cfg },
  };
}

function makeCylinderCard(
  id: string,
  type: 'cylinder_single' | 'cylinder_double',
  shortName: string,
  title: string,
  overrides: Partial<CylinderConfig>
): PaletteCardDef {
  const fullCfg: CylinderConfig = {
    ...createDefaultCylinderConfig(type),
    ...overrides,
  };
  return {
    id,
    type,
    shortName,
    title,
    cylinderConfig: fullCfg,
    defaultParams: { cylinderConfig: fullCfg },
  };
}

const SOURCES_TYPES: ComponentType[] = [
  'power_unit_simple',
  'pump',
  'pump_variable',
  'tank',
  'power_unit',
  'pump_amplifier',
  'pump_prop',
  'accumulator_simple',
  'accumulator',
  'accumulator_unit',
  'flexible_hose',
  'filter',
  'cooler',
  'heater',
  'compressor',
  'regulator',
];

const ACTUATOR_CARDS: PaletteCardDef[] = [
  {
    id: 'distance_rule',
    type: 'distance_rule',
    shortName: COMPONENT_CATALOG.distance_rule.shortName,
    title: COMPONENT_CATALOG.distance_rule.name,
  },
  makeCylinderCard(
    'cylinder_single',
    'cylinder_single',
    'Cilindro de ...',
    'Cilindro de Simples Ação',
    { cylinderType: 'single_extend', springReturn: true, cushioning: false, cushioningAdjustable: false }
  ),
  makeCylinderCard(
    'cylinder_double_plain',
    'cylinder_double',
    'Cilindro dobl...',
    'Cilindro de Dupla Ação',
    { cushioning: false, cushioningAdjustable: false, throughRod: false }
  ),
  makeCylinderCard(
    'cylinder_double_cushioned',
    'cylinder_double',
    'Cilindro de ...',
    'Cilindro de Dupla Ação com Amortecimento Ajustável',
    { cushioning: true, cushioningAdjustable: true, throughRod: false }
  ),
  makeCylinderCard(
    'cylinder_double_through',
    'cylinder_double',
    'Cilindro de ...',
    'Cilindro de Dupla Ação com Haste Passante e Amortecimento',
    { throughRod: true, cushioning: true, cushioningAdjustable: true }
  ),
  {
    id: 'motor',
    type: 'motor',
    shortName: COMPONENT_CATALOG.motor.shortName,
    title: COMPONENT_CATALOG.motor.name,
  },
  {
    id: 'rotary_actuator',
    type: 'rotary_actuator',
    shortName: COMPONENT_CATALOG.rotary_actuator.shortName,
    title: COMPONENT_CATALOG.rotary_actuator.name,
  },
];

const CONFIGURABLE_VALVES: ComponentType[] = [
  'valve_2_2',
  'valve_3_2',
  'valve_4_2',
  'valve_5_2',
  'valve_6_2',
  'valve_4_3',
  'valve_5_3',
];

const FLOW_SHUTOFF_VALVES: ComponentType[] = [
  'nozzle',
  'throttle',
  'orifice',
  'orifice_adjustable',
  'shutoff_valve',
  'check_throttle',
  'check_valve',
  'check_valve_spring',
  'pilot_check_valve',
  'pilot_check_spring',
  'pilot_check_close',
  'pilot_check_close_spring',
  'flow_control_2way',
  'flow_control_3way',
  'shuttle_valve',
  'two_pressure_valve',
  'flow_divider',
  'quick_exhaust',
];

const PRESSURE_VALVES: ComponentType[] = [
  'relief_valve',
  'relief_valve_piloted',
  'relief_valve_ext',
  'sequence_valve',
  'pressure_reducer_2',
  'pressure_reducer_3',
  'counterbalance_valve',
  'pressure_compensator',
  'pressure_compensator_b',
  'pressure_compensator_c',
  'pressure_compensator_d',
  'cartridge_valve_a',
  'cartridge_valve_b',
  'cartridge_valve_c',
];

const CONTINUOUS_VALVES: ComponentType[] = [
  'amp_prop_2ch',
  'prop_valve_4_3',
  'amp_prop_1ch',
  'prop_throttle_2_2',
  'prop_relief',
  'prop_relief_piloted',
  'prop_pressure_reducer',
  'prop_solenoid',
  'servo_valve_4_3',
];

const ELEC_ACTUATOR_TYPES: ComponentType[] = [
  'elec_solenoid_act',
  'elec_dc_motor',
  'elec_stepper_motor',
];

const ELEC_POWER_TYPES: ComponentType[] = [
  'elec_0v',
  'elec_24v',
  'elec_func_gen',
  'elec_setpoint_card',
];

const ELEC_SENSOR_TYPES: ComponentType[] = [
  'elec_pressure_switch',
  'elec_pressure_transducer',
  'elec_flow_transducer',
  'elec_ammeter',
  'elec_voltmeter',
  'elec_encoder',
  'elec_lamp',
  'elec_buzzer',
];

const ELEC_RELAY_TYPES: ComponentType[] = [
  'elec_relay',
  'elec_relay_ton',
  'elec_relay_toff',
  'elec_counter_relay',
  'elec_valve_solenoid',
  'elec_amp_1ch',
  'elec_amp_2ch',
  'elec_prop_solenoid',
  'elec_limiter',
];

const ELEC_SW_MANUAL_TYPES: ComponentType[] = [
  'elec_push_no',
  'elec_switch_no',
  'elec_push_nc',
  'elec_switch_nc',
  'elec_push_co',
  'elec_switch_co',
];

const ELEC_SW_COMMON_TYPES: ComponentType[] = [
  'elec_contact_no',
  'elec_contact_nc',
  'elec_contact_co',
];

const ELEC_SW_PROX_TYPES: ComponentType[] = [
  'elec_prox_cap',
  'elec_prox_ind',
  'elec_prox_mag',
  'elec_prox_opt',
];

const ELEC_REGULATOR_TYPES: ComponentType[] = [
  'elec_comparator',
  'elec_pid',
  'elec_z_ctrl',
];

const ELEC_LADDER_TYPES: ComponentType[] = [
  'ladder_0v',
  'ladder_24v',
  'ladder_push_no',
  'ladder_push_nc',
  'ladder_push_co',
  'ladder_contact_no',
  'ladder_contact_nc',
  'ladder_solenoid',
  'ladder_relay',
  'ladder_relay_sr',
  'ladder_relay_sa',
  'ladder_lamp',
];

const DIGITAL_TYPES: ComponentType[] = [
  'dig_mod_16',
  'dig_mod_io',
  'dig_lo',
  'dig_hi',
  'dig_in',
  'dig_out',
  'dig_mem',
  'dig_and',
  'dig_or',
  'dig_not',
  'dig_and_edge',
  'dig_nand',
  'dig_nand_edge',
  'dig_nor',
  'dig_xor',
  'dig_rs',
  'dig_pulse_gen',
  'dig_freq_gen',
  'dig_pulse_relay',
  'dig_ton',
  'dig_toff',
  'dig_tonoff',
  'dig_ton_mem',
  'dig_wipe_up',
  'dig_wipe_down',
  'dig_counter',
  'dig_schmitt',
  'dig_timer',
];

const EASYPORT_TYPES: ComponentType[] = [
  'ep_analog_in',
  'ep_analog_out',
  'ep_multipol',
  'ep_universal_io',
  'ep_port_in',
  'ep_port_out',
];

const GRAFCET_TYPES: ComponentType[] = [
  'grafcet_step',
  'grafcet_trans',
  'grafcet_action',
  'grafcet_sync',
  'grafcet_partial',
  'grafcet_io',
];

const OTHER_TYPES: ComponentType[] = [
  'other_state_chart',
  'other_func_chart',
  'other_bar_chart',
  'other_parts_list',
  'other_text',
  'other_circle',
  'other_ellipse',
  'other_square',
  'other_rect',
];

const INSTRUMENT_TYPES: ComponentType[] = [
  'pressure_gauge',
  'diff_pressure_gauge',
  'pressure_indicator',
  'flow_meter',
  'flow_meter_analog',
  'flow_sensor_elec',
  'pressure_switch',
  'pressure_sensor_elec',
  'tachometer_sensor',
  'tee',
];

const FREQUENT_MECH_PRESETS: PaletteCardDef[] = [
  makeMechPreset('mech_32_roller', 'valve_3_2', '3/2 Rolete', 'Válvula 3/2 acionada por rolete e retorno por mola', '', 'roller'),
  makeMechPreset('mech_32_button', 'valve_3_2', '3/2 Botão', 'Válvula 3/2 acionada por botão e retorno por mola', 'button', ''),
  makeMechPreset('mech_42_roller', 'valve_4_2', '4/2 Rolete', 'Válvula 4/2 acionada por rolete e retorno por mola', '', 'roller'),
  makeMechPreset('mech_42_lever', 'valve_4_2', '4/2 Alavanca', 'Válvula 4/2 acionada por alavanca com trava', 'detent_lever', ''),
  makeMechPreset('mech_43_lever', 'valve_4_3', '4/3 Alavanca', 'Válvula 4/3 alavanca centro fechado', 'lever', '', ['crossed', 'closed', 'parallel', '']),
  makeMechPreset('mech_52_roller', 'valve_5_2', '5/2 Rolete', 'Válvula 5/2 acionada por rolete e retorno por mola', '', 'roller'),
];

const FREQUENT_ELEC_PRESETS: PaletteCardDef[] = [
  makeSolenoidPreset('elec_32_mono', 'valve_3_2', '3/2 Solenoide', 'Válvula 3/2 solenoide e retorno por mola', false),
  makeSolenoidPreset('elec_42_mono', 'valve_4_2', '4/2 Monoest.', 'Válvula 4/2 monoestável solenoide/mola', false),
  makeSolenoidPreset('elec_42_bi', 'valve_4_2', '4/2 Biestável', 'Válvula 4/2 duplo solenoide', true),
  makeSolenoidPreset('elec_43_closed', 'valve_4_3', '4/3 C. Fech.', 'Válvula 4/3 duplo solenoide centro fechado', true, ['crossed', 'closed', 'parallel', '']),
  makeSolenoidPreset('elec_43_abt', 'valve_4_3', '4/3 C. A/B→T', 'Válvula 4/3 duplo solenoide centro A/B para tanque', true, ['crossed', 'p_closed_ab_t', 'parallel', '']),
  makeSolenoidPreset('elec_52_bi', 'valve_5_2', '5/2 Duplo Sol.', 'Válvula 5/2 duplo solenoide', true),
];

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  canEdit,
  fluid,
  projects,
  activeProjectId,
  isDark,
  onAddComponent,
  onSelectProject,
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'documents'>('library');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    root: true,
    sources: true,
    actuators: true,
    valves: true,
    valves_cfg: false,
    valves_freq: false,
    valves_freq_mech: false,
    valves_freq_elec: true,
    valves_flow: true,
    valves_pressure: false,
    valves_cont: true,
    instruments: true,
    root_elec: false,
    elec_actuators: false,
    elec_power: false,
    elec_sensors: false,
    elec_relays: false,
    elec_switches: false,
    elec_sw_manual: false,
    elec_sw_common: false,
    elec_sw_prox: false,
    elec_regulator: false,
    elec_ladder: false,
    root_digital: false,
    root_easyport: false,
    root_grafcet: false,
    root_others: false,
  });

  const q = query.trim().toLowerCase();
  const matchesQuery = (textA: string, textB = '') =>
    !q || textA.toLowerCase().includes(q) || textB.toLowerCase().includes(q);

  const toggleGroup = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderCard = (card: PaletteCardDef) => (
    <button
      key={card.id}
      type="button"
      title={card.title}
      disabled={!canEdit}
      draggable={canEdit}
      data-testid={`palette-item-${card.id}`}
      onDragStart={(e) => {
        e.dataTransfer.setData('application/fcs-component', card.type);
        e.dataTransfer.setData(
          'application/fcs-component-payload',
          JSON.stringify({
            type: card.type,
            label: card.shortName,
            defaultParams: card.defaultParams,
          })
        );
      }}
      onClick={() =>
        onAddComponent({
          type: card.type,
          label: card.shortName,
          defaultParams: card.defaultParams,
        })
      }
      className="flex flex-col items-center justify-between p-1.5 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:border-sky-600 hover:bg-sky-50/70 dark:hover:bg-sky-950/50 disabled:opacity-50 transition-colors text-center"
    >
      <div className="h-9 flex items-center justify-center">
        <ComponentSymbolThumb
          type={card.type}
          isDark={isDark}
          valveConfig={card.valveConfig}
          cylinderConfig={card.cylinderConfig}
        />
      </div>
      <span className="w-full text-[10px] leading-tight text-slate-700 dark:text-slate-300 truncate mt-1">
        {card.shortName}
      </span>
    </button>
  );

  const renderCatalogCards = (types: ComponentType[]) => {
    const filtered = types
      .map((t) => COMPONENT_CATALOG[t])
      .filter((item) => item && matchesQuery(item.name, item.shortName));
    if (filtered.length === 0) return null;
    return (
      <div className="p-2 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-1.5 bg-white dark:bg-slate-900">
        {filtered.map((item) =>
          renderCard({
            id: item.type,
            type: item.type,
            shortName: item.shortName,
            title: item.name,
          })
        )}
      </div>
    );
  };

  const renderSubGroup = (
    groupKey: string,
    title: string,
    depth: 1 | 2,
    content: React.ReactNode
  ) => {
    if (!content) return null;
    const isOpen = Boolean(q) || Boolean(expanded[groupKey]);
    return (
      <div key={groupKey} className="border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => toggleGroup(groupKey)}
          style={{ paddingLeft: depth === 2 ? '26px' : '18px' }}
          className="w-full pr-2.5 py-1 bg-[#F3F6FA] dark:bg-slate-900/90 hover:bg-[#E7EEF7] dark:hover:bg-slate-800 flex items-center gap-1.5 text-[11px] font-medium text-slate-800 dark:text-slate-200 text-left"
        >
          {isOpen ? (
            <ChevronDown className="w-3 h-3 shrink-0 text-slate-600 dark:text-slate-400" />
          ) : (
            <ChevronRight className="w-3 h-3 shrink-0 text-slate-600 dark:text-slate-400" />
          )}
          <span className="truncate">{title}</span>
        </button>
        {isOpen && content}
      </div>
    );
  };

  const actuatorMatches = ACTUATOR_CARDS.filter((c) => matchesQuery(c.title, c.shortName));
  const mechMatches = FREQUENT_MECH_PRESETS.filter((c) => matchesQuery(c.title, c.shortName));
  const elecMatches = FREQUENT_ELEC_PRESETS.filter((c) => matchesQuery(c.title, c.shortName));

  return (
    <aside
      aria-label="Biblioteca de Componentes"
      className="w-full lg:w-80 shrink-0 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col overflow-hidden rounded-sm shadow-sm"
    >
      {/* Classic MDI Window Title Bar */}
      <div className="h-7 shrink-0 px-2.5 bg-gradient-to-b from-[#DCE6F2] to-[#C2D4EA] dark:from-slate-800 dark:to-slate-800 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between text-xs font-medium text-slate-800 dark:text-slate-100 select-none">
        <span className="truncate">Apresentação hierárquica — Biblioteca</span>
        <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">ISO 1219</span>
      </div>

      {/* Folder Tabs */}
      <div className="shrink-0 bg-slate-100 dark:bg-slate-950 border-b border-slate-300 dark:border-slate-800 px-2 pt-1.5 flex items-end gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={`px-3 py-1 text-xs rounded-t border border-b-0 transition-colors whitespace-nowrap ${
            activeTab === 'documents'
              ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-semibold text-slate-900 dark:text-white'
              : 'bg-slate-200/70 dark:bg-slate-800/70 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Meus projetos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('library')}
          className={`px-3 py-1 text-xs rounded-t border border-b-0 transition-colors whitespace-nowrap ${
            activeTab === 'library'
              ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-semibold text-slate-900 dark:text-white'
              : 'bg-slate-200/70 dark:bg-slate-800/70 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Biblioteca comum
        </button>
      </div>

      {activeTab === 'library' ? (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Filtrar componentes"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar símbolo ISO..."
                className="w-full pl-7 pr-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
            <button
              type="button"
              onClick={() => toggleGroup('root')}
              className="w-full px-2.5 py-1.5 bg-gradient-to-b from-[#E8EFF7] to-[#D4E1F0] dark:from-slate-800 dark:to-slate-800 border-b border-slate-300 dark:border-slate-700 flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 text-left"
            >
              {expanded.root ? (
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{fluid === 'hydraulic' ? 'Hidráulica' : 'Pneumática'}</span>
            </button>

            {(expanded.root || Boolean(q)) && (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {/* 1. Elementos de alimentação */}
                {(() => {
                  const cards = renderCatalogCards(SOURCES_TYPES);
                  if (!cards) return null;
                  const open = Boolean(q) || expanded.sources;
                  return (
                    <div>
                      <button
                        type="button"
                        onClick={() => toggleGroup('sources')}
                        className="w-full px-3 py-1.5 bg-gradient-to-b from-[#EEF3F9] to-[#DCE6F2] dark:from-slate-800/80 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 text-left"
                      >
                        {open ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">Elementos de alimentação</span>
                      </button>
                      {open && cards}
                    </div>
                  );
                })()}

                {/* 2. Atuadores */}
                {actuatorMatches.length > 0 && (() => {
                  const open = Boolean(q) || expanded.actuators;
                  return (
                    <div>
                      <button
                        type="button"
                        onClick={() => toggleGroup('actuators')}
                        className="w-full px-3 py-1.5 bg-gradient-to-b from-[#EEF3F9] to-[#DCE6F2] dark:from-slate-800/80 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 text-left"
                      >
                        {open ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">Atuadores</span>
                      </button>
                      {open && (
                        <div className="p-2 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-1.5 bg-white dark:bg-slate-900">
                          {actuatorMatches.map(renderCard)}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 3. Válvulas */}
                {(() => {
                  const cfgCards = renderCatalogCards(CONFIGURABLE_VALVES);
                  const flowCards = renderCatalogCards(FLOW_SHUTOFF_VALVES);
                  const pressCards = renderCatalogCards(PRESSURE_VALVES);
                  const contCards = renderCatalogCards(CONTINUOUS_VALVES);
                  const hasFreq = mechMatches.length > 0 || elecMatches.length > 0;
                  if (!cfgCards && !flowCards && !pressCards && !contCards && !hasFreq) return null;

                  const openValves = Boolean(q) || expanded.valves;
                  return (
                    <div>
                      <button
                        type="button"
                        onClick={() => toggleGroup('valves')}
                        className="w-full px-3 py-1.5 bg-gradient-to-b from-[#EEF3F9] to-[#DCE6F2] dark:from-slate-800/80 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 text-left"
                      >
                        {openValves ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">Válvulas</span>
                      </button>

                      {openValves && (
                        <div className="bg-white dark:bg-slate-900">
                          {renderSubGroup('valves_cfg', 'Válvulas de vias configuráveis', 1, cfgCards)}

                          {hasFreq &&
                            renderSubGroup(
                              'valves_freq',
                              'Válvulas de vias de uso frequente',
                              1,
                              <div>
                                {mechMatches.length > 0 &&
                                  renderSubGroup(
                                    'valves_freq_mech',
                                    'Acionado mecanicamente',
                                    2,
                                    <div className="p-2 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-1.5 bg-white dark:bg-slate-900">
                                      {mechMatches.map(renderCard)}
                                    </div>
                                  )}
                                {elecMatches.length > 0 &&
                                  renderSubGroup(
                                    'valves_freq_elec',
                                    'Acionado eletromagneticamente',
                                    2,
                                    <div className="p-2 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-1.5 bg-white dark:bg-slate-900">
                                      {elecMatches.map(renderCard)}
                                    </div>
                                  )}
                              </div>
                            )}

                          {renderSubGroup(
                            'valves_flow',
                            'Válvulas de fechamento e controle de vazão',
                            1,
                            flowCards
                          )}
                          {renderSubGroup('valves_pressure', 'Válvulas de pressão', 1, pressCards)}
                          {renderSubGroup('valves_cont', 'Válvulas contínuas', 1, contCards)}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 4. Sensores e instrumentos de medida */}
                {(() => {
                  const cards = renderCatalogCards(INSTRUMENT_TYPES);
                  if (!cards) return null;
                  const open = Boolean(q) || expanded.instruments;
                  return (
                    <div>
                      <button
                        type="button"
                        onClick={() => toggleGroup('instruments')}
                        className="w-full px-3 py-1.5 bg-gradient-to-b from-[#EEF3F9] to-[#DCE6F2] dark:from-slate-800/80 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 text-left"
                      >
                        {open ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">Sensores e instrumentos de medida</span>
                      </button>
                      {open && cards}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* === Componentes elétricos === */}
            {(() => {
              const actCards = renderCatalogCards(ELEC_ACTUATOR_TYPES);
              const powCards = renderCatalogCards(ELEC_POWER_TYPES);
              const sensCards = renderCatalogCards(ELEC_SENSOR_TYPES);
              const relCards = renderCatalogCards(ELEC_RELAY_TYPES);
              const swManCards = renderCatalogCards(ELEC_SW_MANUAL_TYPES);
              const swComCards = renderCatalogCards(ELEC_SW_COMMON_TYPES);
              const swProxCards = renderCatalogCards(ELEC_SW_PROX_TYPES);
              const regCards = renderCatalogCards(ELEC_REGULATOR_TYPES);
              const ladCards = renderCatalogCards(ELEC_LADDER_TYPES);
              const hasSw = Boolean(swManCards || swComCards || swProxCards);
              if (!actCards && !powCards && !sensCards && !relCards && !hasSw && !regCards && !ladCards) {
                return null;
              }
              const openElec = Boolean(q) || expanded.root_elec;
              return (
                <div>
                  <button
                    type="button"
                    data-testid="palette-folder-root_elec"
                    onClick={() => toggleGroup('root_elec')}
                    className="w-full px-2.5 py-1.5 bg-gradient-to-b from-[#E8EFF7] to-[#D4E1F0] dark:from-slate-800 dark:to-slate-800 border-t border-b border-slate-300 dark:border-slate-700 flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 text-left"
                  >
                    {openElec ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate">Componentes elétricos</span>
                  </button>
                  {openElec && (
                    <div className="bg-white dark:bg-slate-900">
                      {renderSubGroup('elec_actuators', 'Atuadores', 1, actCards)}
                      {renderSubGroup('elec_power', 'Alimentação de tensão', 1, powCards)}
                      {renderSubGroup('elec_sensors', 'Sensores e instrumentos de medida', 1, sensCards)}
                      {renderSubGroup('elec_relays', 'Relés', 1, relCards)}
                      {hasSw &&
                        renderSubGroup(
                          'elec_switches',
                          'Interruptores',
                          1,
                          <div>
                            {renderSubGroup('elec_sw_manual', 'Acionado manualmente', 2, swManCards)}
                            {renderSubGroup('elec_sw_common', 'Interruptores comuns', 2, swComCards)}
                            {renderSubGroup('elec_sw_prox', 'Interruptor de alimentação', 2, swProxCards)}
                          </div>
                        )}
                      {renderSubGroup('elec_regulator', 'Regulador', 1, regCards)}
                      {renderSubGroup('elec_ladder', 'Símbolos de diagrama de Ladder', 1, ladCards)}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* === Técnica Digital === */}
            {(() => {
              const cards = renderCatalogCards(DIGITAL_TYPES);
              if (!cards) return null;
              const open = Boolean(q) || expanded.root_digital;
              return (
                <div>
                  <button
                    type="button"
                    data-testid="palette-folder-root_digital"
                    onClick={() => toggleGroup('root_digital')}
                    className="w-full px-2.5 py-1.5 bg-gradient-to-b from-[#E8EFF7] to-[#D4E1F0] dark:from-slate-800 dark:to-slate-800 border-t border-b border-slate-300 dark:border-slate-700 flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 text-left"
                  >
                    {open ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate">Técnica Digital</span>
                  </button>
                  {open && cards}
                </div>
              );
            })()}

            {/* === EasyPort/OPC/DDE === */}
            {(() => {
              const cards = renderCatalogCards(EASYPORT_TYPES);
              if (!cards) return null;
              const open = Boolean(q) || expanded.root_easyport;
              return (
                <div>
                  <button
                    type="button"
                    data-testid="palette-folder-root_easyport"
                    onClick={() => toggleGroup('root_easyport')}
                    className="w-full px-2.5 py-1.5 bg-gradient-to-b from-[#E8EFF7] to-[#D4E1F0] dark:from-slate-800 dark:to-slate-800 border-t border-b border-slate-300 dark:border-slate-700 flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 text-left"
                  >
                    {open ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate">EasyPort/OPC/DDE</span>
                  </button>
                  {open && cards}
                </div>
              );
            })()}

            {/* === GRAFCET === */}
            {(() => {
              const cards = renderCatalogCards(GRAFCET_TYPES);
              if (!cards) return null;
              const open = Boolean(q) || expanded.root_grafcet;
              return (
                <div>
                  <button
                    type="button"
                    data-testid="palette-folder-root_grafcet"
                    onClick={() => toggleGroup('root_grafcet')}
                    className="w-full px-2.5 py-1.5 bg-gradient-to-b from-[#E8EFF7] to-[#D4E1F0] dark:from-slate-800 dark:to-slate-800 border-t border-b border-slate-300 dark:border-slate-700 flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 text-left"
                  >
                    {open ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate">GRAFCET</span>
                  </button>
                  {open && cards}
                </div>
              );
            })()}

            {/* === Outros === */}
            {(() => {
              const cards = renderCatalogCards(OTHER_TYPES);
              if (!cards) return null;
              const open = Boolean(q) || expanded.root_others;
              return (
                <div>
                  <button
                    type="button"
                    data-testid="palette-folder-root_others"
                    onClick={() => toggleGroup('root_others')}
                    className="w-full px-2.5 py-1.5 bg-gradient-to-b from-[#E8EFF7] to-[#D4E1F0] dark:from-slate-800 dark:to-slate-800 border-t border-b border-slate-300 dark:border-slate-700 flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 text-left"
                  >
                    {open ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate">Outros</span>
                  </button>
                  {open && cards}
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-white dark:bg-slate-900">
          {projects.map((proj) => {
            const isActive = proj.id === activeProjectId;
            return (
              <button
                key={proj.id}
                type="button"
                onClick={() => onSelectProject(proj)}
                className={`w-full text-left p-2 rounded border transition-colors flex items-start gap-2 ${
                  isActive
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-900 dark:text-white truncate">
                    {proj.name}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {proj.fluid === 'hydraulic' ? 'Hidráulica' : 'Pneumática'} · {proj.nodes.length} nós
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </aside>
  );
};
