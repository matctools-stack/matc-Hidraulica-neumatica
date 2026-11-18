import React, { useRef, useState } from 'react';
import {
  COMPONENT_CATALOG,
  findPipeSnapForComponent,
  getEffectivePortOffset,
  getEffectiveValveConfig,
  getPipePolylinePoints,
  getValveActuationBehavior,
  hasConfiguredActuatorSide,
  isDetentManualActuation,
  isDirectionalValveType,
  isInteractiveToggleType,
  isLatchingSwitchType,
  isMomentarySwitchType,
  isThreePositionValveType,
  moveOrthogonalPipeSegment,
  projectPointOntoPipePolyline,
} from '../engine/fluidSolver';
import {
  DEFAULT_APP_OPTIONS,
  getGridStepPx,
  type AppOptions,
} from '../engine/appOptions';
import { selectElementsInRect } from '../engine/circuitHistory';
import type {
  CircuitNode,
  FluidMedium,
  PipeConnection,
  PipeWaypoint,
  SimulationState,
} from '../types/circuit';
import type { PaletteItemPayload } from './ComponentPalette';
import { SchematicNodeSvg } from './SchematicNodeSvg';

interface CircuitCanvasProps {
  nodes: CircuitNode[];
  pipes: PipeConnection[];
  simState: SimulationState;
  fluid: FluidMedium;
  selectedNodeIds: string[];
  selectedPipeIds: string[];
  areaSelectMode?: boolean;
  panMode?: boolean;
  canEdit: boolean;
  isDark: boolean;
  zoom: number;
  snapToGrid: boolean;
  gridOptions?: AppOptions['grid'];
  lineColors?: AppOptions['simulation']['lineColors'];
  showComponentLegends?: boolean;
  fitSignal: number;
  onZoomChange: (zoom: number) => void;
  onSelectionChange: (nodeIds: string[], pipeIds: string[]) => void;
  onAreaSelectComplete?: () => void;
  onMoveNodes: (moves: Array<{ id: string; x: number; y: number }>) => void;
  onUpdatePipeWaypoints: (pipeId: string, waypoints: PipeWaypoint[]) => void;
  onToggleValve: (id: string, sideHint?: 'left' | 'right' | 'cycle') => void;
  onPressMomentaryActuator?: (id: string, sideHint?: 'left' | 'right' | 'cycle') => void;
  onReleaseMomentaryActuator?: (id: string, sideHint?: 'left' | 'right' | 'cycle') => void;
  onBlockedSwitchAttempt?: (id: string) => void;
  onOpenMechanicalConnection?: (
    nodeId: string,
    side: 'left' | 'right',
    anchorPos?: { x: number; y: number }
  ) => void;
  onSnapNodeToPipe?: (nodeId: string) => void;
  onDoubleClickNode: (id: string, sideHint?: 'left' | 'right') => void;
  onDoubleClickPort?: (nodeId: string, portId: string) => void;
  onConnectPorts: (fromNodeId: string, fromPortId: string, toNodeId: string, toPortId: string) => void;
  onConnectPortToPipe?: (
    fromNodeId: string,
    fromPortId: string,
    pipeId: string,
    x: number,
    y: number
  ) => void;
  onDropCatalogItem: (payload: PaletteItemPayload, x: number, y: number) => void;
  onStartNodeDrag?: (nodeId: string) => void;
  onShiftDuplicateNode?: (nodeId: string) => string | null;
  onStartPipeSegmentDrag?: (pipeId: string) => void;
  onContextMenuNode?: (nodeId: string, clientX: number, clientY: number) => void;
  onContextMenuCanvas?: (clientX: number, clientY: number, worldX: number, worldY: number) => void;
}

interface PendingWire {
  nodeId: string;
  portId: string;
  x: number;
  y: number;
}

type MarqueePhase = 'dragging_first' | 'awaiting_second' | 'dragging_second';

interface MarqueeState {
  phase: MarqueePhase;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  downClientX: number;
  downClientY: number;
}

function getPressureStrokeColor(
  pressureBar: number,
  fluid: FluidMedium,
  isDark: boolean,
  isElectricalPipe: boolean,
  isDigitalPipe: boolean,
  lineColors: AppOptions['simulation']['lineColors']
): string {
  if (isDigitalPipe) {
    return pressureBar > 2.5 ? lineColors.digitalHi : lineColors.digitalLo;
  }
  if (isElectricalPipe) {
    return pressureBar >= 12
      ? lineColors.currentTransmitter
      : isDark
        ? '#475569'
        : '#334155';
  }
  const highThreshold = fluid === 'hydraulic' ? 75 : 5;
  const medThreshold = fluid === 'hydraulic' ? 20 : 1.8;
  if (pressureBar >= highThreshold) return lineColors.currentTransmitter || '#DC2626';
  if (pressureBar >= medThreshold) return lineColors.pressureTransmitter || '#D97706';
  if (pressureBar > 0.3) return lineColors.vaporPressure || '#0284C7';
  return isDark ? '#64748B' : lineColors.noPressure || '#334155';
}

export const CircuitCanvas: React.FC<CircuitCanvasProps> = ({
  nodes,
  pipes,
  simState,
  fluid,
  selectedNodeIds,
  selectedPipeIds,
  areaSelectMode = false,
  panMode = false,
  canEdit,
  isDark,
  zoom,
  snapToGrid,
  gridOptions = DEFAULT_APP_OPTIONS.grid,
  lineColors = DEFAULT_APP_OPTIONS.simulation.lineColors,
  showComponentLegends = true,
  fitSignal,
  onZoomChange,
  onSelectionChange,
  onAreaSelectComplete,
  onMoveNodes,
  onUpdatePipeWaypoints,
  onToggleValve,
  onPressMomentaryActuator,
  onReleaseMomentaryActuator,
  onBlockedSwitchAttempt,
  onOpenMechanicalConnection,
  onSnapNodeToPipe,
  onDoubleClickNode,
  onDoubleClickPort,
  onConnectPorts,
  onConnectPortToPipe,
  onDropCatalogItem,
  onStartNodeDrag,
  onShiftDuplicateNode,
  onStartPipeSegmentDrag,
  onContextMenuNode,
  onContextMenuCanvas,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [pan, setPan] = useState({ x: 40, y: 20 });
  const [draggingNodes, setDraggingNodes] = useState<{
    anchorId: string;
    startWorldX: number;
    startWorldY: number;
    initialPositions: Array<{ id: string; x: number; y: number }>;
  } | null>(null);
  const [clickedNodeCandidate, setClickedNodeCandidate] = useState<{
    id: string;
    downClientX: number;
    downClientY: number;
    clickedLocalX: number;
    clickedActuationSide?: 'left' | 'right';
    openMechOnClick?: boolean;
  } | null>(null);
  const [draggingSegment, setDraggingSegment] = useState<{
    pipeId: string;
    fullPoints: PipeWaypoint[];
    segmentIndex: number;
    isHorizontal: boolean;
  } | null>(null);
  const [panning, setPanning] = useState<{
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
  } | null>(null);
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);
  const [pendingWire, setPendingWire] = useState<PendingWire | null>(null);
  const [hoveredPipeSnap, setHoveredPipeSnap] = useState<{
    pipeId: string;
    x: number;
    y: number;
  } | null>(null);
  const [hoveredInsertSnap, setHoveredInsertSnap] = useState<{
    pipeId: string;
    x: number;
    y: number;
    mode: 'tap' | 'inline';
  } | null>(null);
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const activeMomentaryRef = useRef<{
    nodeId: string;
    sideHint?: 'left' | 'right' | 'cycle';
  } | null>(null);
  const onReleaseMomentaryRef = useRef(onReleaseMomentaryActuator);
  onReleaseMomentaryRef.current = onReleaseMomentaryActuator;

  const releaseActiveMomentary = React.useCallback(() => {
    const current = activeMomentaryRef.current;
    if (!current) return;
    activeMomentaryRef.current = null;
    onReleaseMomentaryRef.current?.(current.nodeId, current.sideHint);
  }, []);

  const startMomentaryPress = React.useCallback(
    (nodeId: string, sideHint?: 'left' | 'right' | 'cycle') => {
      if (activeMomentaryRef.current) {
        releaseActiveMomentary();
      }
      activeMomentaryRef.current = { nodeId, sideHint };
      onPressMomentaryActuator?.(nodeId, sideHint);
    },
    [onPressMomentaryActuator, releaseActiveMomentary]
  );

  React.useEffect(() => {
    const handleGlobalRelease = () => {
      releaseActiveMomentary();
    };
    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('pointercancel', handleGlobalRelease);
    window.addEventListener('blur', handleGlobalRelease);
    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
      window.removeEventListener('blur', handleGlobalRelease);
    };
  }, [releaseActiveMomentary]);

  React.useEffect(() => {
    if (!simState.running) {
      releaseActiveMomentary();
    }
  }, [simState.running, releaseActiveMomentary]);

  React.useEffect(() => {
    if (!areaSelectMode) {
      setMarquee((curr) => (curr && curr.phase !== 'dragging_first' ? null : curr));
    }
  }, [areaSelectMode]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMarquee(null);
        setPendingWire(null);
        setHoveredPipeSnap(null);
        if (areaSelectMode) onAreaSelectComplete?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [areaSelectMode, onAreaSelectComplete]);

  const clientToWorld = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  };

  const gridStepPx = getGridStepPx(gridOptions.width);
  const snap = (val: number) =>
    snapToGrid ? Math.round(val / gridStepPx) * gridStepPx : Math.round(val);

  const fitView = React.useCallback(() => {
    if (nodes.length === 0) {
      onZoomChange(1);
      setPan({ x: 40, y: 20 });
      return;
    }
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs) - 110;
    const maxX = Math.max(...xs) + 110;
    const minY = Math.min(...ys) - 90;
    const maxY = Math.max(...ys) + 90;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const scale = Math.min(
      1.15,
      Math.max(0.4, Math.min(rect.width / (maxX - minX), rect.height / (maxY - minY)))
    );
    const rounded = Number(scale.toFixed(2));
    onZoomChange(rounded);
    setPan({
      x: (rect.width - (maxX + minX) * rounded) / 2,
      y: (rect.height - (maxY + minY) * rounded) / 2,
    });
  }, [nodes, onZoomChange]);

  const initialFitDone = useRef(false);
  React.useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (!initialFitDone.current) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 40 && rect.height > 40) {
          fitView();
          initialFitDone.current = true;
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitView]);

  React.useEffect(() => {
    if (fitSignal > 0) {
      fitView();
    }
  }, [fitSignal, fitView]);

  const startMiddlePan = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic events
    }
    setPanning({
      startX: e.clientX,
      startY: e.clientY,
      origPanX: pan.x,
      origPanY: pan.y,
    });
  };

  const commitMarqueeSelection = (rect: MarqueeState) => {
    const { nodeIds, pipeIds } = selectElementsInRect(nodes, pipes, rect, COMPONENT_CATALOG);
    onSelectionChange(nodeIds, pipeIds);
    setMarquee(null);
    if (areaSelectMode) {
      onAreaSelectComplete?.();
    }
  };

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button === 2) return;

    // Middle mouse button (scroll wheel click & hold) ALWAYS activates Pan anywhere on canvas
    if (e.button === 1) {
      startMiddlePan(e);
      return;
    }

    if (panMode && e.button === 0) {
      startMiddlePan(e);
      return;
    }

    const world = clientToWorld(e.clientX, e.clientY);

    // If waiting for 2nd point (or 2nd click + drag) in 2-point Area Selection:
    if (marquee?.phase === 'awaiting_second' && e.button === 0) {
      e.preventDefault();
      setMarquee({
        ...marquee,
        phase: 'dragging_second',
        x2: world.x,
        y2: world.y,
        downClientX: e.clientX,
        downClientY: e.clientY,
      });
      return;
    }

    const clickedEmpty =
      e.target === svgRef.current || (e.target as Element).getAttribute('data-bg') === '1';

    if (areaSelectMode && e.button === 0) {
      e.preventDefault();
      setPendingWire(null);
      setHoveredPipeSnap(null);
      setMarquee({
        phase: 'dragging_first',
        x1: world.x,
        y1: world.y,
        x2: world.x,
        y2: world.y,
        downClientX: e.clientX,
        downClientY: e.clientY,
      });
      return;
    }

    if (clickedEmpty && e.button === 0) {
      setPendingWire(null);
      setHoveredPipeSnap(null);
      setMarquee({
        phase: 'dragging_first',
        x1: world.x,
        y1: world.y,
        x2: world.x,
        y2: world.y,
        downClientX: e.clientX,
        downClientY: e.clientY,
      });
    }
  };

  const handleSvgContextMenu = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current || (e.target as Element).getAttribute('data-bg') === '1') {
      e.preventDefault();
      const world = clientToWorld(e.clientX, e.clientY);
      onContextMenuCanvas?.(e.clientX, e.clientY, snap(world.x), snap(world.y));
    }
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const world = clientToWorld(e.clientX, e.clientY);
    setCursorWorld(world);

    if (panning) {
      setPan({
        x: panning.origPanX + (e.clientX - panning.startX),
        y: panning.origPanY + (e.clientY - panning.startY),
      });
      return;
    }

    if (marquee) {
      setMarquee((prev) => (prev ? { ...prev, x2: world.x, y2: world.y } : null));
      return;
    }

    if (pendingWire && !draggingNodes && !draggingSegment) {
      let best: { pipeId: string; x: number; y: number; dist: number } | null = null;
      const threshold = 14 / zoom;
      for (const pipe of pipes) {
        const hit = projectPointOntoPipePolyline(pipe, nodes, world.x, world.y);
        if (!hit || hit.distance > threshold) continue;
        if (Math.hypot(hit.x - pendingWire.x, hit.y - pendingWire.y) < 6) continue;
        if (!best || hit.distance < best.dist) {
          best = { pipeId: pipe.id, x: hit.x, y: hit.y, dist: hit.distance };
        }
      }
      setHoveredPipeSnap(best ? { pipeId: best.pipeId, x: best.x, y: best.y } : null);
    } else if (hoveredPipeSnap) {
      setHoveredPipeSnap(null);
    }

    if (draggingNodes && canEdit) {
      const rawDx = world.x - draggingNodes.startWorldX;
      const rawDy = world.y - draggingNodes.startWorldY;
      const anchorInit = draggingNodes.initialPositions.find(
        (p) => p.id === draggingNodes.anchorId
      );
      if (!anchorInit) return;
      const snappedAnchorX = snap(anchorInit.x + rawDx);
      const snappedAnchorY = snap(anchorInit.y + rawDy);
      const dx = snappedAnchorX - anchorInit.x;
      const dy = snappedAnchorY - anchorInit.y;
      onMoveNodes(
        draggingNodes.initialPositions.map((p) => ({
          id: p.id,
          x: p.x + dx,
          y: p.y + dy,
        }))
      );

      // Live preview when dragging a single unconnected component onto a pipe
      if (draggingNodes.initialPositions.length === 1 && Math.hypot(dx, dy) > 4) {
        const draggedId = draggingNodes.initialPositions[0].id;
        const alreadyConnected = pipes.some(
          (p) => p.fromNodeId === draggedId || p.toNodeId === draggedId
        );
        const draggedNode = !alreadyConnected ? nodes.find((n) => n.id === draggedId) : null;
        if (draggedNode) {
          const movedCandidate = {
            ...draggedNode,
            x: anchorInit.x + dx,
            y: anchorInit.y + dy,
          };
          const pipeSnap = findPipeSnapForComponent(nodes, pipes, movedCandidate);
          setHoveredInsertSnap(
            pipeSnap
              ? {
                  pipeId: pipeSnap.pipeId,
                  x: pipeSnap.tapX,
                  y: pipeSnap.tapY,
                  mode: pipeSnap.mode,
                }
              : null
          );
        } else if (hoveredInsertSnap) {
          setHoveredInsertSnap(null);
        }
      } else if (hoveredInsertSnap) {
        setHoveredInsertSnap(null);
      }
    } else if (draggingSegment && canEdit) {
      const targetCoord = draggingSegment.isHorizontal ? snap(world.y) : snap(world.x);
      const nextWaypoints = moveOrthogonalPipeSegment(
        draggingSegment.fullPoints,
        draggingSegment.segmentIndex,
        targetCoord
      );
      onUpdatePipeWaypoints(draggingSegment.pipeId, nextWaypoints);
    }
  };

  const handleSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (panning) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }
      setPanning(null);
      setClickedNodeCandidate(null);
      return;
    }

    if (marquee) {
      const world = clientToWorld(e.clientX, e.clientY);
      const updated: MarqueeState = { ...marquee, x2: world.x, y2: world.y };
      const distPx = Math.hypot(e.clientX - marquee.downClientX, e.clientY - marquee.downClientY);

      if (marquee.phase === 'dragging_first') {
        if (distPx <= 6) {
          if (areaSelectMode) {
            // 1º clique concluído -> aguarda mover / 2º clique (ou 2º clique + arrastar)
            setMarquee({
              ...updated,
              phase: 'awaiting_second',
            });
          } else {
            // Clique simples fora de modo seleção limpa seleção
            onSelectionChange([], []);
            setMarquee(null);
          }
        } else {
          // Arraste direto de retângulo de seleção
          commitMarqueeSelection(updated);
        }
      } else if (marquee.phase === 'dragging_second') {
        // 2º clique (ou fim do arraste do 2º clique) conclui a seleção da área
        commitMarqueeSelection(updated);
      }
      setClickedNodeCandidate(null);
      return;
    }

    if (clickedNodeCandidate && e.button === 0) {
      const distPx = Math.hypot(
        e.clientX - clickedNodeCandidate.downClientX,
        e.clientY - clickedNodeCandidate.downClientY
      );
      if (distPx <= 4) {
        const clickedNode = nodes.find((n) => n.id === clickedNodeCandidate.id);
        if (clickedNode) {
          if (clickedNodeCandidate.openMechOnClick && onOpenMechanicalConnection) {
            onOpenMechanicalConnection(
              clickedNode.id,
              clickedNodeCandidate.clickedActuationSide ?? 'left',
              { x: e.clientX, y: e.clientY }
            );
          } else if (isInteractiveToggleType(clickedNode.type)) {
            if (simState.running && !isMomentarySwitchType(clickedNode.type)) {
              onToggleValve(clickedNode.id);
            }
          } else if (
            clickedNode.type === 'shutoff_valve' ||
            clickedNode.type === 'prop_throttle_2_2'
          ) {
            onToggleValve(clickedNode.id);
          } else if (isDirectionalValveType(clickedNode.type)) {
            const spec = COMPONENT_CATALOG[clickedNode.type];
            const vCfg = getEffectiveValveConfig(clickedNode);
            let side = clickedNodeCandidate.clickedActuationSide;
            if (!side && Math.abs(clickedNodeCandidate.clickedLocalX) > spec.width / 2 - 8) {
              const rawSide = clickedNodeCandidate.clickedLocalX < 0 ? 'left' : 'right';
              side = vCfg.mirrorHorizontal ? (rawSide === 'left' ? 'right' : 'left') : rawSide;
            }
            if (side) {
              const sideCfg = side === 'left' ? vCfg.leftActuation : vCfg.rightActuation;
              if (!simState.running && hasConfiguredActuatorSide(sideCfg) && onOpenMechanicalConnection) {
                onOpenMechanicalConnection(clickedNode.id, side, { x: e.clientX, y: e.clientY });
              } else {
                const behavior = getValveActuationBehavior(clickedNode, side);
                if (!behavior.isSpringReturn) {
                  onToggleValve(clickedNode.id, side);
                }
              }
            }
          }
        }
      }
      setClickedNodeCandidate(null);
    }

    if (
      draggingNodes &&
      canEdit &&
      onSnapNodeToPipe &&
      draggingNodes.initialPositions.length === 1
    ) {
      const draggedId = draggingNodes.initialPositions[0].id;
      const initPos = draggingNodes.initialPositions[0];
      const currentNode = nodes.find((n) => n.id === draggedId);
      const alreadyConnected = pipes.some(
        (p) => p.fromNodeId === draggedId || p.toNodeId === draggedId
      );
      if (
        currentNode &&
        !alreadyConnected &&
        Math.hypot(currentNode.x - initPos.x, currentNode.y - initPos.y) > 4
      ) {
        const snapHit = findPipeSnapForComponent(nodes, pipes, currentNode);
        if (snapHit) {
          onSnapNodeToPipe(draggedId);
        }
      }
    }

    setHoveredInsertSnap(null);
    setDraggingNodes(null);
    setDraggingSegment(null);
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    onZoomChange(Math.min(2.2, Math.max(0.4, Number((zoom * factor).toFixed(2)))));
  };

  const handlePortClick = (
    e: React.MouseEvent,
    nodeId: string,
    portId: string,
    wx: number,
    wy: number
  ) => {
    if (areaSelectMode || panMode) return;
    e.stopPropagation();
    if (!canEdit) return;
    if (!pendingWire) {
      setPendingWire({ nodeId, portId, x: wx, y: wy });
      setHoveredPipeSnap(null);
      return;
    }
    if (pendingWire.nodeId === nodeId && pendingWire.portId === portId) {
      setPendingWire(null);
      setHoveredPipeSnap(null);
      return;
    }
    if (pendingWire.nodeId !== nodeId) {
      onConnectPorts(pendingWire.nodeId, pendingWire.portId, nodeId, portId);
    }
    setPendingWire(null);
    setHoveredPipeSnap(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canEdit) return;
    const world = clientToWorld(e.clientX, e.clientY);
    let best: { pipeId: string; x: number; y: number; dist: number } | null = null;
    const threshold = 34 / zoom;
    for (const pipe of pipes) {
      const hit = projectPointOntoPipePolyline(pipe, nodes, world.x, world.y);
      if (!hit || hit.distance > threshold) continue;
      if (!best || hit.distance < best.dist) {
        best = { pipeId: pipe.id, x: hit.x, y: hit.y, dist: hit.distance };
      }
    }
    setHoveredInsertSnap(
      best ? { pipeId: best.pipeId, x: best.x, y: best.y, mode: 'tap' } : null
    );
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setHoveredInsertSnap(null);
    if (!canEdit) return;
    const rawPayload = e.dataTransfer.getData('application/fcs-component-payload');
    const world = clientToWorld(e.clientX, e.clientY);
    if (rawPayload) {
      try {
        const parsed = JSON.parse(rawPayload) as PaletteItemPayload;
        if (parsed.type && COMPONENT_CATALOG[parsed.type]) {
          onDropCatalogItem(parsed, snap(world.x), snap(world.y));
          return;
        }
      } catch {
        // Fallback below
      }
    }
    const type = e.dataTransfer.getData('application/fcs-component') as CircuitNode['type'];
    if (!type || !COMPONENT_CATALOG[type]) return;
    onDropCatalogItem({ type }, snap(world.x), snap(world.y));
  };

  const previewSelectionCount = marquee
    ? selectElementsInRect(nodes, pipes, marquee, COMPONENT_CATALOG).nodeIds.length
    : 0;

  return (
    <div
      data-testid="circuit-canvas-container"
      onDragOver={handleDragOver}
      onDragLeave={() => setHoveredInsertSnap(null)}
      onDrop={handleDrop}
      className="relative flex-1 h-full w-full overflow-hidden bg-white dark:bg-slate-950 select-none"
    >
      <svg
        ref={svgRef}
        data-testid="circuit-svg"
        onMouseDown={(e) => {
          if (e.button === 1) e.preventDefault();
        }}
        onAuxClick={(e) => {
          if (e.button === 1) e.preventDefault();
        }}
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        onContextMenu={handleSvgContextMenu}
        onWheel={handleWheel}
        className={`w-full h-full touch-none ${
          panning
            ? 'cursor-grabbing'
            : panMode
              ? 'cursor-grab'
              : areaSelectMode
                ? 'cursor-crosshair'
                : 'cursor-default'
        }`}
      >
        <defs>
          <pattern
            id="fcs-grid"
            width={gridStepPx * zoom}
            height={gridStepPx * zoom}
            patternUnits="userSpaceOnUse"
            x={pan.x % (gridStepPx * zoom)}
            y={pan.y % (gridStepPx * zoom)}
          >
            {gridOptions.showGrid && gridOptions.style === 'dot' && (
              <circle cx={1} cy={1} r={1} fill={isDark ? '#1E293B' : '#CBD5E1'} />
            )}
            {gridOptions.showGrid && gridOptions.style === 'cross' && (
              <path
                d="M 1 0 L 1 4 M 0 2 L 4 2"
                stroke={isDark ? '#1E293B' : '#CBD5E1'}
                strokeWidth={0.9}
              />
            )}
            {gridOptions.showGrid && gridOptions.style === 'line' && (
              <path
                d={`M ${gridStepPx * zoom} 0 L 0 0 0 ${gridStepPx * zoom}`}
                fill="none"
                stroke={isDark ? '#1E293B' : '#E2E8F0'}
                strokeWidth={0.8}
              />
            )}
          </pattern>
        </defs>

        <rect data-bg="1" width="100%" height="100%" fill="url(#fcs-grid)" />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {pipes.map((pipe) => {
            const pts = getPipePolylinePoints(pipe, nodes);
            if (pts.length < 2) return null;

            const d = pts
              .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
              .join(' ');

            const rtPipe = simState.pipes[pipe.id];
            const pressure = rtPipe?.pressureBar ?? 0;
            const flow = rtPipe?.flowLpm ?? 0;
            const fromNode = nodes.find((n) => n.id === pipe.fromNodeId);
            const toNode = nodes.find((n) => n.id === pipe.toNodeId);
            const fromCat = fromNode ? COMPONENT_CATALOG[fromNode.type]?.category : undefined;
            const toCat = toNode ? COMPONENT_CATALOG[toNode.type]?.category : undefined;
            const isDigitalPipe = fromCat === 'digital' || toCat === 'digital';
            const isElectricalPipe = fromCat === 'electrical' || toCat === 'electrical';
            const isSelected = selectedPipeIds.includes(pipe.id);
            const strokeColor = isSelected
              ? '#0EA5E9'
              : getPressureStrokeColor(pressure, fluid, isDark, isElectricalPipe, isDigitalPipe, lineColors);
            const hasActiveFlow = simState.running && Math.abs(flow) > 0.4;

            return (
              <g key={pipe.id} data-pipe-id={pipe.id}>
                <path
                  d={d}
                  data-testid={`pipe-path-${pipe.id}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 3.8 : 2.5}
                  strokeLinejoin="miter"
                  strokeLinecap="square"
                />
                {hasActiveFlow && (
                  <path
                    d={d}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeOpacity={0.75}
                    strokeWidth={1.8}
                    strokeDasharray="5 7"
                    className={flow >= 0 ? 'fluid-flow-line' : 'fluid-flow-line-reverse'}
                  />
                )}

                {pts.slice(0, -1).map((a, idx) => {
                  const b = pts[idx + 1];
                  const isHoriz = Math.abs(a.y - b.y) <= Math.abs(a.x - b.x);
                  const segLen = Math.hypot(b.x - a.x, b.y - a.y);
                  if (segLen < 2) return null;
                  const midX = (a.x + b.x) / 2;
                  const midY = (a.y + b.y) / 2;

                  return (
                    <g key={idx}>
                      <line
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke="transparent"
                        strokeWidth={13}
                        data-testid={`pipe-seg-${pipe.id}-${idx}`}
                        style={{
                          cursor:
                            areaSelectMode || panMode
                              ? 'inherit'
                              : pendingWire
                                ? 'crosshair'
                                : canEdit
                                  ? isHoriz
                                    ? 'ns-resize'
                                    : 'ew-resize'
                                  : 'pointer',
                        }}
                        onPointerDown={(e) => {
                          if (e.button === 1 || areaSelectMode || panMode) return;
                          e.stopPropagation();
                          if (pendingWire && canEdit && e.button === 0 && onConnectPortToPipe) {
                            const world = clientToWorld(e.clientX, e.clientY);
                            const hit = projectPointOntoPipePolyline(
                              pipe,
                              nodes,
                              world.x,
                              world.y
                            );
                            onConnectPortToPipe(
                              pendingWire.nodeId,
                              pendingWire.portId,
                              pipe.id,
                              hit ? hit.x : Math.round(world.x),
                              hit ? hit.y : Math.round(world.y)
                            );
                            setPendingWire(null);
                            setHoveredPipeSnap(null);
                            return;
                          }
                          onSelectionChange([], [pipe.id]);
                          if (e.button !== 0) return;
                          if (canEdit) {
                            onStartPipeSegmentDrag?.(pipe.id);
                            setDraggingSegment({
                              pipeId: pipe.id,
                              fullPoints: pts,
                              segmentIndex: idx,
                              isHorizontal: isHoriz,
                            });
                          }
                        }}
                      />
                      {isSelected && canEdit && segLen >= 16 && (
                        <rect
                          x={midX - 3.5}
                          y={midY - 3.5}
                          width={7}
                          height={7}
                          fill="#FFFFFF"
                          stroke="#0EA5E9"
                          strokeWidth={1.5}
                          className="pointer-events-none"
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {pendingWire && (() => {
            const target = hoveredPipeSnap ?? cursorWorld;
            return (
              <g className="pointer-events-none">
                <polyline
                  points={`${pendingWire.x},${pendingWire.y} ${pendingWire.x},${Math.round(
                    (pendingWire.y + target.y) / 2
                  )} ${target.x},${Math.round((pendingWire.y + target.y) / 2)} ${
                    target.x
                  },${target.y}`}
                  fill="none"
                  stroke="#0EA5E9"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
                {hoveredPipeSnap && (
                  <circle
                    cx={hoveredPipeSnap.x}
                    cy={hoveredPipeSnap.y}
                    r={5}
                    fill="#0284C7"
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                  />
                )}
              </g>
            );
          })()}

          {nodes.map((node) => {
            const spec = COMPONENT_CATALOG[node.type];
            const isSelected = selectedNodeIds.includes(node.id);
            const rt = simState.nodes[node.id];
            const isDirValve = isDirectionalValveType(node.type);
            const isShutoff =
              node.type === 'shutoff_valve' || node.type === 'prop_throttle_2_2';
            const isInteractiveSwitch = isInteractiveToggleType(node.type);
            const isThreePos = isThreePositionValveType(node.type);
            const isCompactJunction =
              node.type === 'tee' && Boolean(node.params.compactJunction);
            const isRotatedSideways = node.rotation === 90 || node.rotation === 270;
            const hasTopPorts = spec.ports.some(
              (pt) => getEffectivePortOffset(node, pt).dy < -4
            );
            const hasBottomPorts = spec.ports.some(
              (pt) => getEffectivePortOffset(node, pt).dy > 4
            );
            const labelX =
              node.type === 'tee' ? 0 : isRotatedSideways ? spec.height / 2 + 12 : 0;
            const labelY = isCompactJunction
              ? -12
              : node.type === 'tee'
                ? -14
                : isRotatedSideways
                  ? 4
                  : spec.height / 2 + (node.type === 'valve_6_2' ? 28 : hasBottomPorts ? 24 : 18);
            const labelAnchor = isRotatedSideways && node.type !== 'tee' ? 'start' : 'middle';
            const haloColor = isDark ? '#020617' : '#FFFFFF';
            const badgeTopY = -spec.height / 2 - (hasTopPorts ? 34 : 22);

            const resolvedPos = rt?.activeSpoolPos;
            const vCfg = isDirValve ? getEffectiveValveConfig(node) : null;
            const restPos = vCfg
              ? isThreePos
                ? Math.max(0, Math.min(2, vCfg.initialPosition ?? 1))
                : vCfg.initialPosition === 0
                  ? 0
                  : 1
              : 1;
            const currentValvePos =
              resolvedPos !== undefined
                ? resolvedPos
                : isThreePos
                  ? Math.max(0, Math.min(2, node.params.spoolPosition ?? restPos))
                  : node.params.spoolPosition !== undefined
                    ? node.params.spoolPosition === 0
                      ? 0
                      : 1
                    : node.params.active !== undefined
                      ? node.params.active
                        ? 0
                        : 1
                      : restPos;

            let valveBadgeText = 'ACIONAR';
            let valveBadgeActive = false;
            if (isThreePos && vCfg) {
              valveBadgeText =
                currentValvePos === 0 ? 'POS 1' : currentValvePos === 1 ? 'CENTRO' : 'POS 3';
              valveBadgeActive = currentValvePos !== restPos;
            } else if (isDirValve && vCfg) {
              valveBadgeActive = currentValvePos !== restPos;
              if (valveBadgeActive) {
                const activeSide =
                  currentValvePos === 0 ? vCfg.leftActuation : vCfg.rightActuation;
                valveBadgeText = isDetentManualActuation(activeSide.manual)
                  ? 'TRAVADA'
                  : 'ACIONADA';
              } else {
                valveBadgeText = 'ACIONAR';
              }
            } else if (isShutoff) {
              const open = node.params.active !== false;
              valveBadgeText = open ? 'ABERTA' : 'FECHADA';
              valveBadgeActive = open;
            } else if (isInteractiveSwitch) {
              const on = Boolean(node.params.active) || Boolean(rt?.isOpen);
              const isLatch = isLatchingSwitchType(node.type);
              valveBadgeText = on ? (isLatch ? 'TRAVADO' : 'ATIVO') : 'ATIVAR';
              valveBadgeActive = on;
            }

            return (
              <g
                key={node.id}
                data-testid={`canvas-node-${node.id}`}
                data-node-type={node.type}
                transform={`translate(${node.x}, ${node.y})`}
                onPointerDown={(e) => {
                  if (e.button === 1 || areaSelectMode || panMode) return;
                  e.stopPropagation();

                  const isPlainLeftClick = e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey;

                  let activeIds = selectedNodeIds;
                  let activePipeIds = selectedPipeIds;

                  if (e.ctrlKey || e.metaKey) {
                    activeIds = selectedNodeIds.includes(node.id)
                      ? selectedNodeIds.filter((id) => id !== node.id)
                      : [...selectedNodeIds, node.id];
                    onSelectionChange(activeIds, activePipeIds);
                    return;
                  }

                  if (!selectedNodeIds.includes(node.id)) {
                    activeIds = [node.id];
                    activePipeIds = [];
                    onSelectionChange(activeIds, activePipeIds);
                  }

                  const actuatorTriggerEl = (e.target as Element | null)?.closest?.(
                    '[data-actuator-trigger]'
                  );
                  const actuatorTriggerSide = actuatorTriggerEl?.getAttribute(
                    'data-actuator-trigger'
                  );

                  if (isPlainLeftClick && isInteractiveSwitch) {
                    if (simState.running) {
                      if (isMomentarySwitchType(node.type)) {
                        startMomentaryPress(node.id);
                      } else {
                        setClickedNodeCandidate({
                          id: node.id,
                          downClientX: e.clientX,
                          downClientY: e.clientY,
                          clickedLocalX: 0,
                        });
                      }
                      return;
                    }
                    // Fora da simulação: clicar no acionador abre Conexão (mecânica);
                    // clicar no corpo apenas seleciona/arrasta (interruptor não aciona fora da simulação)
                    if (actuatorTriggerSide) {
                      setClickedNodeCandidate({
                        id: node.id,
                        downClientX: e.clientX,
                        downClientY: e.clientY,
                        clickedLocalX: 0,
                        clickedActuationSide: actuatorTriggerSide === 'right' ? 'right' : 'left',
                        openMechOnClick: true,
                      });
                    }
                  } else if (isPlainLeftClick && isDirValve && vCfg) {
                    const worldClick = clientToWorld(e.clientX, e.clientY);
                    const sideEl = (e.target as Element | null)?.closest?.('[data-valve-side]');
                    const sideAttr = sideEl?.getAttribute('data-valve-side');
                    const explicitSide: 'left' | 'right' | undefined =
                      sideAttr === 'left' || sideAttr === 'right' ? sideAttr : undefined;
                    const explicitConfigured =
                      sideEl?.getAttribute('data-actuator-configured') === 'true';
                    const localX = worldClick.x - node.x;
                    let detectedSide = explicitSide;
                    if (!detectedSide && Math.abs(localX) > spec.width / 2 - 8) {
                      const rawSide = localX < 0 ? 'left' : 'right';
                      detectedSide = vCfg.mirrorHorizontal
                        ? rawSide === 'left'
                          ? 'right'
                          : 'left'
                        : rawSide;
                    }
                    if (detectedSide) {
                      const sideCfg =
                        detectedSide === 'left' ? vCfg.leftActuation : vCfg.rightActuation;
                      const isConfiguredActuator =
                        explicitConfigured || hasConfiguredActuatorSide(sideCfg);

                      if (simState.running && sideCfg.manual) {
                        const behavior = getValveActuationBehavior(node, detectedSide);
                        if (behavior.isSpringReturn) {
                          startMomentaryPress(node.id, detectedSide);
                          return;
                        }
                        setClickedNodeCandidate({
                          id: node.id,
                          downClientX: e.clientX,
                          downClientY: e.clientY,
                          clickedLocalX: localX,
                          clickedActuationSide: detectedSide,
                        });
                        if (explicitSide) {
                          return;
                        }
                      } else if (isConfiguredActuator) {
                        // Clique no acionador configurado abre o menu flutuante Conexão (mecânica)
                        setClickedNodeCandidate({
                          id: node.id,
                          downClientX: e.clientX,
                          downClientY: e.clientY,
                          clickedLocalX: localX,
                          clickedActuationSide: detectedSide,
                          openMechOnClick: true,
                        });
                      }
                    }
                  } else if (isPlainLeftClick && actuatorTriggerSide) {
                    setClickedNodeCandidate({
                      id: node.id,
                      downClientX: e.clientX,
                      downClientY: e.clientY,
                      clickedLocalX: 0,
                      clickedActuationSide: actuatorTriggerSide === 'right' ? 'right' : 'left',
                      openMechOnClick: true,
                    });
                  } else if (isPlainLeftClick && isShutoff) {
                    setClickedNodeCandidate({
                      id: node.id,
                      downClientX: e.clientX,
                      downClientY: e.clientY,
                      clickedLocalX: 0,
                    });
                  }

                  if (e.button !== 0 || !canEdit) return;
                  const world = clientToWorld(e.clientX, e.clientY);

                  if (e.shiftKey && onShiftDuplicateNode && activeIds.length === 1) {
                    const dupId = onShiftDuplicateNode(node.id);
                    if (dupId) {
                      setDraggingNodes({
                        anchorId: dupId,
                        startWorldX: world.x,
                        startWorldY: world.y,
                        initialPositions: [{ id: dupId, x: node.x, y: node.y }],
                      });
                      return;
                    }
                  }

                  onStartNodeDrag?.(node.id);
                  const initialPositions = nodes
                    .filter((n) => activeIds.includes(n.id))
                    .map((n) => ({ id: n.id, x: n.x, y: n.y }));

                  setDraggingNodes({
                    anchorId: node.id,
                    startWorldX: world.x,
                    startWorldY: world.y,
                    initialPositions,
                  });
                }}
                onContextMenu={(e) => {
                  if (areaSelectMode || panMode) return;
                  e.preventDefault();
                  e.stopPropagation();
                  if (!selectedNodeIds.includes(node.id)) {
                    onSelectionChange([node.id], []);
                  }
                  onContextMenuNode?.(node.id, e.clientX, e.clientY);
                }}
                onDoubleClick={(e) => {
                  if (areaSelectMode || panMode) return;
                  e.stopPropagation();
                  onSelectionChange([node.id], []);
                  const sideAttr = (e.target as Element | null)
                    ?.closest?.('[data-valve-side]')
                    ?.getAttribute('data-valve-side');
                  const sideHint =
                    sideAttr === 'left' || sideAttr === 'right' ? sideAttr : undefined;
                  onDoubleClickNode(node.id, sideHint);
                }}
                className={
                  areaSelectMode || panMode
                    ? 'cursor-inherit'
                    : isInteractiveSwitch
                      ? simState.running
                        ? 'cursor-pointer'
                        : 'cursor-grab active:cursor-grabbing'
                      : 'cursor-grab active:cursor-grabbing'
                }
              >
                {isSelected && (() => {
                  let selShiftX = 0;
                  if (isDirValve) {
                    const cw =
                      node.type === 'valve_2_2' ? 36 : node.type === 'valve_6_2' ? 54 : 44;
                    const pos =
                      resolvedPos !== undefined
                        ? resolvedPos
                        : isThreePos
                          ? Math.max(0, Math.min(2, node.params.spoolPosition ?? 1))
                          : node.params.active
                            ? 0
                            : 1;
                    selShiftX = isThreePos ? (1 - pos) * cw : pos === 0 ? cw / 2 : -cw / 2;
                  }
                  const leftBound = isCompactJunction
                    ? -10
                    : Math.min(-spec.width / 2 - (isDirValve ? 24 : 8), -spec.width / 2 - (isDirValve ? 24 : 8) + selShiftX);
                  const rightBound = isCompactJunction
                    ? 10
                    : Math.max(spec.width / 2 + (isDirValve ? 24 : 8), spec.width / 2 + (isDirValve ? 24 : 8) + selShiftX);
                  return (
                    <rect
                      x={leftBound}
                      y={isCompactJunction ? -10 : -spec.height / 2 - 8}
                      width={rightBound - leftBound}
                      height={isCompactJunction ? 20 : spec.height + 16}
                      rx={isCompactJunction ? 10 : 6}
                      fill="none"
                      stroke="#0EA5E9"
                      strokeWidth={1.6}
                      strokeDasharray="4 3"
                    />
                  );
                })()}

                <g transform={`rotate(${node.rotation})`}>
                  <rect
                    x={-spec.width / 2}
                    y={-spec.height / 2}
                    width={spec.width}
                    height={spec.height}
                    fill="transparent"
                  />
                  <SchematicNodeSvg
                    node={node}
                    runtime={rt}
                    fluid={fluid}
                    isDark={isDark}
                  />
                </g>

                {showComponentLegends && node.type !== 'other_text' && !isCompactJunction && (
                  <text
                    data-testid={`node-legend-${node.id}`}
                    x={labelX}
                    y={labelY}
                    textAnchor={labelAnchor}
                    fontSize={11}
                    fontWeight={500}
                    fill={isDark ? '#CBD5E1' : '#334155'}
                    paintOrder="stroke"
                    stroke={haloColor}
                    strokeWidth={4}
                  >
                    {node.label}
                  </text>
                )}

                {(isDirValve || isShutoff || isInteractiveSwitch) && (() => {
                  const isSwitchDisabled = isInteractiveSwitch && !simState.running;
                  return (
                    <g
                      data-testid={`toggle-badge-${node.id}`}
                      onPointerDown={(e) => {
                        if (e.button !== 0 || areaSelectMode || panMode) return;
                        e.stopPropagation();
                        if (isInteractiveSwitch) {
                          if (!simState.running) {
                            onBlockedSwitchAttempt?.(node.id);
                            return;
                          }
                          if (isMomentarySwitchType(node.type)) {
                            startMomentaryPress(node.id);
                          } else {
                            onToggleValve(node.id);
                          }
                          return;
                        }
                        if (isDirValve) {
                          const behavior = getValveActuationBehavior(node);
                          if (behavior.isSpringReturn) {
                            startMomentaryPress(node.id, behavior.effectiveSide);
                          } else {
                            onToggleValve(node.id, behavior.effectiveSide);
                          }
                          return;
                        }
                        onToggleValve(node.id);
                      }}
                      onClick={(e) => {
                        if (areaSelectMode || panMode) return;
                        e.stopPropagation();
                      }}
                      opacity={isSwitchDisabled ? 0.45 : 1}
                      className={isSwitchDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                    >
                      {isSwitchDisabled && (
                        <title>Inicie a simulação para acionar este interruptor</title>
                      )}
                      <rect
                        x={-28}
                        y={badgeTopY}
                        width={56}
                        height={16}
                        rx={3}
                        fill={valveBadgeActive ? '#0284C7' : isDark ? '#1E293B' : '#E2E8F0'}
                      />
                      <text
                        x={0}
                        y={badgeTopY + 11}
                        textAnchor="middle"
                        fontSize={9}
                        fontWeight={600}
                        fill={valveBadgeActive ? '#FFFFFF' : isDark ? '#E2E8F0' : '#334155'}
                      >
                        {valveBadgeText}
                      </text>
                    </g>
                  );
                })()}

                {spec.ports.map((port) => {
                  if (isCompactJunction && port.id !== 'p1') return null;

                  const rot = getEffectivePortOffset(node, port);
                  const isWiringSource =
                    pendingWire?.nodeId === node.id && pendingWire?.portId === port.id;
                  const portCfg = node.params.portConfigs?.[port.id];
                  const portLabel = portCfg?.designation || port.label;
                  const portPBar = rt?.portPressures?.[port.id] ?? 0;
                  const portFlow = rt?.portFlows?.[port.id] ?? 0;
                  const isElecCat =
                    spec.category === 'electrical' ||
                    spec.category === 'digital' ||
                    spec.category === 'easyport';
                  const telemetryParts: string[] = [];
                  if (portCfg?.showPressure) {
                    telemetryParts.push(
                      isElecCat ? `${portPBar.toFixed(1)} V` : `${(portPBar / 10).toFixed(2)} MPa`
                    );
                  }
                  if (portCfg?.showFlow) {
                    telemetryParts.push(
                      isElecCat ? `${portFlow.toFixed(2)} A` : `${portFlow.toFixed(1)} l/min`
                    );
                  }

                  if (isCompactJunction) {
                    return (
                      <g
                        key={port.id}
                        data-testid={`port-${node.id}-${port.id}`}
                        transform="translate(0, 0)"
                        onClick={(e) => handlePortClick(e, node.id, port.id, node.x, node.y)}
                        className="cursor-pointer"
                      >
                        <circle r={8} fill="transparent" />
                        {isWiringSource && (
                          <circle
                            r={6}
                            fill="none"
                            stroke="#0EA5E9"
                            strokeWidth={2}
                          />
                        )}
                      </g>
                    );
                  }

                  let lx = 0;
                  let ly = -8;
                  let lAnchor: 'start' | 'middle' | 'end' = 'middle';
                  if (rot.dy < -Math.abs(rot.dx)) {
                    // Top port: offset left/right of stem outside body; middle port centered above
                    const hasCloseTopSibling = spec.ports.some((pt) => {
                      if (pt.id === port.id) return false;
                      const other = getEffectivePortOffset(node, pt);
                      return Math.abs(other.dy - rot.dy) < 4 && Math.abs(other.dx - rot.dx) <= 22;
                    });
                    if (Math.abs(rot.dx) <= 1 && hasCloseTopSibling) {
                      lx = 0;
                      lAnchor = 'middle';
                      ly = -9;
                    } else if (rot.dx < -1) {
                      lx = -6;
                      lAnchor = 'end';
                      ly = -6;
                    } else if (rot.dx > 1) {
                      lx = 6;
                      lAnchor = 'start';
                      ly = -6;
                    } else {
                      lx = 6;
                      lAnchor = 'start';
                      ly = -6;
                    }
                  } else if (rot.dy > Math.abs(rot.dx)) {
                    // Bottom port: beside connector circle (P left, T right) matching FluidSIM; middle port below
                    const hasCloseSibling = spec.ports.some((pt) => {
                      if (pt.id === port.id) return false;
                      const other = getEffectivePortOffset(node, pt);
                      return Math.abs(other.dy - rot.dy) < 4 && Math.abs(other.dx - rot.dx) <= 22;
                    });
                    if (Math.abs(rot.dx) <= 1 && hasCloseSibling) {
                      lx = 0;
                      lAnchor = 'middle';
                      ly = 14;
                    } else if (rot.dx < -1) {
                      lx = -6;
                      lAnchor = 'end';
                      ly = 4;
                    } else if (rot.dx > 1) {
                      lx = 6;
                      lAnchor = 'start';
                      ly = 4;
                    } else {
                      lx = 6;
                      lAnchor = 'start';
                      ly = 12;
                    }
                  } else if (rot.dx < 0) {
                    lx = -7;
                    ly = -7;
                    lAnchor = 'end';
                  } else {
                    lx = 7;
                    ly = -7;
                    lAnchor = 'start';
                  }

                  return (
                    <g
                      key={port.id}
                      data-testid={`port-${node.id}-${port.id}`}
                      transform={`translate(${rot.dx}, ${rot.dy})`}
                      onClick={(e) =>
                        handlePortClick(e, node.id, port.id, node.x + rot.dx, node.y + rot.dy)
                      }
                      onDoubleClick={(e) => {
                        if (areaSelectMode || panMode) return;
                        e.stopPropagation();
                        setPendingWire(null);
                        setHoveredPipeSnap(null);
                        onDoubleClickPort?.(node.id, port.id);
                      }}
                      className="cursor-pointer"
                    >
                      <circle r={9} fill="transparent" />
                      <circle
                        r={isWiringSource ? 6 : 4.2}
                        fill={
                          portCfg?.blindPlug
                            ? '#EF4444'
                            : isWiringSource
                              ? '#0EA5E9'
                              : isDark
                                ? '#0F172A'
                                : '#FFFFFF'
                        }
                        stroke={
                          portCfg?.blindPlug
                            ? '#991B1B'
                            : isWiringSource
                              ? '#FFFFFF'
                              : '#0284C7'
                        }
                        strokeWidth={1.8}
                      />
                      {portCfg?.blindPlug && (
                        <>
                          <line x1={-6} y1={-6} x2={6} y2={6} stroke="#FFFFFF" strokeWidth={1.4} />
                          <line x1={6} y1={-6} x2={-6} y2={6} stroke="#FFFFFF" strokeWidth={1.4} />
                        </>
                      )}
                      <text
                        x={lx}
                        y={ly}
                        textAnchor={lAnchor}
                        fontSize={9}
                        fontWeight={600}
                        paintOrder="stroke"
                        stroke={haloColor}
                        strokeWidth={3}
                        className="font-mono pointer-events-none"
                        fill={isDark ? '#94A3B8' : '#475569'}
                      >
                        {portLabel}
                      </text>
                      {telemetryParts.length > 0 && (
                        <text
                          x={8}
                          y={-12}
                          textAnchor="start"
                          fontSize={8.5}
                          fontWeight={600}
                          paintOrder="stroke"
                          stroke={haloColor}
                          strokeWidth={3.5}
                          className="font-mono pointer-events-none"
                          fill="#0284C7"
                        >
                          {telemetryParts.join(' · ')}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Live Pipe Insertion Snap Dot Preview */}
          {hoveredInsertSnap && !pendingWire && (
            <g data-testid="pipe-insert-snap-preview" className="pointer-events-none">
              <circle
                cx={hoveredInsertSnap.x}
                cy={hoveredInsertSnap.y}
                r={10 / zoom}
                fill="rgba(2, 132, 199, 0.2)"
                stroke="#0284C7"
                strokeWidth={1.6 / zoom}
                strokeDasharray={`${3 / zoom} ${2 / zoom}`}
              />
              <circle
                cx={hoveredInsertSnap.x}
                cy={hoveredInsertSnap.y}
                r={4 / zoom}
                fill="#0284C7"
                stroke="#FFFFFF"
                strokeWidth={1.2 / zoom}
              />
            </g>
          )}

          {/* Area / Two-Point Selection Marquee */}
          {marquee && (
            <g data-testid="selection-marquee" className="pointer-events-none">
              <rect
                x={Math.min(marquee.x1, marquee.x2)}
                y={Math.min(marquee.y1, marquee.y2)}
                width={Math.max(1, Math.abs(marquee.x2 - marquee.x1))}
                height={Math.max(1, Math.abs(marquee.y2 - marquee.y1))}
                fill="rgba(14, 165, 233, 0.12)"
                stroke="#0284C7"
                strokeWidth={1.6 / zoom}
                strokeDasharray={`${5 / zoom} ${3 / zoom}`}
              />
              <circle
                cx={marquee.x1}
                cy={marquee.y1}
                r={4 / zoom}
                fill="#0284C7"
                stroke="#FFFFFF"
                strokeWidth={1.2 / zoom}
              />
              <circle
                cx={marquee.x2}
                cy={marquee.y2}
                r={3.5 / zoom}
                fill="#0EA5E9"
                stroke="#FFFFFF"
                strokeWidth={1 / zoom}
              />
            </g>
          )}
        </g>
      </svg>

      {hoveredInsertSnap && !pendingWire && (
        <div className="absolute bottom-3 left-3 bg-sky-600 text-white text-xs font-medium px-3 py-1.5 rounded shadow-sm pointer-events-none">
          {hoveredInsertSnap.mode === 'inline'
            ? 'Solte para inserir o componente no meio da tubulação'
            : 'Solte para criar conexão (derivação) no meio da tubulação'}
        </div>
      )}

      {pendingWire && (
        <div className="absolute bottom-3 left-3 bg-sky-600 text-white text-xs font-medium px-3 py-1.5 rounded shadow-sm pointer-events-none">
          {hoveredPipeSnap
            ? 'Clique na linha destacada para criar ponto de derivação conectado'
            : 'Clique na porta de destino ou sobre uma linha existente para conectar'}
        </div>
      )}

      {(areaSelectMode || marquee) && !pendingWire && (
        <div
          data-testid="area-select-hint"
          className="absolute bottom-3 left-3 bg-slate-900/90 dark:bg-slate-800 text-white text-xs font-medium px-3 py-1.5 rounded shadow-sm pointer-events-none"
        >
          {marquee?.phase === 'awaiting_second'
            ? `1º ponto marcado — mova e dê o 2º clique (ou arraste) para marcar a área (${previewSelectionCount} ${previewSelectionCount === 1 ? 'item' : 'itens'})`
            : marquee?.phase === 'dragging_second'
              ? `Marcando área de seleção (${previewSelectionCount} ${previewSelectionCount === 1 ? 'item' : 'itens'}) — solte para selecionar`
              : 'Seleção por Área: dê o 1º clique no ponto inicial e depois arraste no 2º ponto (Esc cancela)'}
        </div>
      )}
    </div>
  );
};

