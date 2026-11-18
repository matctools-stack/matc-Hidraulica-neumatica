import type { CircuitNode, CircuitProject, FluidMedium, PipeConnection } from '../types/circuit';

export interface HistorySnapshot {
  nodes: CircuitNode[];
  pipes: PipeConnection[];
  fluid: FluidMedium;
}

export function cloneNodeDeep(node: CircuitNode): CircuitNode {
  return JSON.parse(JSON.stringify(node)) as CircuitNode;
}

export function cloneSnapshot(
  project: Pick<CircuitProject, 'nodes' | 'pipes' | 'fluid'>
): HistorySnapshot {
  return {
    nodes: JSON.parse(JSON.stringify(project.nodes)) as CircuitNode[],
    pipes: JSON.parse(JSON.stringify(project.pipes)) as PipeConnection[],
    fluid: project.fluid,
  };
}

export function pushHistory(
  undoStack: HistorySnapshot[],
  current: Pick<CircuitProject, 'nodes' | 'pipes' | 'fluid'>,
  maxEntries = 50
): HistorySnapshot[] {
  const next = [...undoStack, cloneSnapshot(current)];
  return next.length > maxEntries ? next.slice(next.length - maxEntries) : next;
}

export function stepUndo(
  undoStack: HistorySnapshot[],
  redoStack: HistorySnapshot[],
  current: Pick<CircuitProject, 'nodes' | 'pipes' | 'fluid'>,
  maxEntries = 50
): {
  nextCurrent: HistorySnapshot;
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];
} | null {
  if (undoStack.length === 0) return null;
  const previous = undoStack[undoStack.length - 1];
  const nextUndo = undoStack.slice(0, -1);
  const nextRedo = [...redoStack, cloneSnapshot(current)];
  return {
    nextCurrent: cloneSnapshot(previous),
    undoStack: nextUndo,
    redoStack: nextRedo.length > maxEntries ? nextRedo.slice(nextRedo.length - maxEntries) : nextRedo,
  };
}

export function stepRedo(
  undoStack: HistorySnapshot[],
  redoStack: HistorySnapshot[],
  current: Pick<CircuitProject, 'nodes' | 'pipes' | 'fluid'>,
  maxEntries = 50
): {
  nextCurrent: HistorySnapshot;
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];
} | null {
  if (redoStack.length === 0) return null;
  const restored = redoStack[redoStack.length - 1];
  const nextRedo = redoStack.slice(0, -1);
  const nextUndo = [...undoStack, cloneSnapshot(current)];
  return {
    nextCurrent: cloneSnapshot(restored),
    undoStack: nextUndo.length > maxEntries ? nextUndo.slice(nextUndo.length - maxEntries) : nextUndo,
    redoStack: nextRedo,
  };
}

export function buildDuplicateLabel(sourceLabel: string, existingNodes: CircuitNode[]): string {
  const base = sourceLabel.replace(/\s*\(Cópia(?:\s+\d+)?\)$/i, '').trim() || sourceLabel;
  const existingLabels = new Set(existingNodes.map((n) => n.label));
  const firstCandidate = `${base} (Cópia)`;
  if (!existingLabels.has(firstCandidate)) return firstCandidate;
  let index = 2;
  while (existingLabels.has(`${base} (Cópia ${index})`)) {
    index += 1;
  }
  return `${base} (Cópia ${index})`;
}

export function cloneNodeForPlacement(
  source: CircuitNode,
  existingNodes: CircuitNode[],
  x: number,
  y: number,
  newId?: string
): CircuitNode {
  const cloned = cloneNodeDeep(source);
  cloned.id = newId ?? `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  cloned.x = Math.round(x);
  cloned.y = Math.round(y);
  cloned.label = buildDuplicateLabel(source.label, existingNodes);
  return cloned;
}

export interface SelectionRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function selectElementsInRect(
  nodes: CircuitNode[],
  pipes: PipeConnection[],
  rect: SelectionRect,
  catalog: Record<string, { width: number; height: number }>
): { nodeIds: string[]; pipeIds: string[] } {
  const minX = Math.min(rect.x1, rect.x2);
  const maxX = Math.max(rect.x1, rect.x2);
  const minY = Math.min(rect.y1, rect.y2);
  const maxY = Math.max(rect.y1, rect.y2);

  const nodeIds: string[] = [];
  const nodeMap = new Map<string, CircuitNode>();

  for (const node of nodes) {
    nodeMap.set(node.id, node);
    const spec = catalog[node.type] ?? { width: 56, height: 56 };
    const isRotated = node.rotation === 90 || node.rotation === 270;
    const halfW = (isRotated ? spec.height : spec.width) / 2;
    const halfH = (isRotated ? spec.width : spec.height) / 2;

    const intersects =
      node.x + halfW >= minX &&
      node.x - halfW <= maxX &&
      node.y + halfH >= minY &&
      node.y - halfH <= maxY;

    if (intersects) {
      nodeIds.push(node.id);
    }
  }

  const selectedSet = new Set(nodeIds);
  const pipeIds: string[] = [];
  for (const pipe of pipes) {
    if (selectedSet.has(pipe.fromNodeId) && selectedSet.has(pipe.toNodeId)) {
      pipeIds.push(pipe.id);
      continue;
    }
    const fromN = nodeMap.get(pipe.fromNodeId);
    const toN = nodeMap.get(pipe.toNodeId);
    if (fromN && toN) {
      const pMinX = Math.min(fromN.x, toN.x);
      const pMaxX = Math.max(fromN.x, toN.x);
      const pMinY = Math.min(fromN.y, toN.y);
      const pMaxY = Math.max(fromN.y, toN.y);
      if (pMaxX >= minX && pMinX <= maxX && pMaxY >= minY && pMinY <= maxY) {
        if (selectedSet.has(pipe.fromNodeId) || selectedSet.has(pipe.toNodeId)) {
          pipeIds.push(pipe.id);
        }
      }
    }
  }

  return { nodeIds, pipeIds };
}

export function buildMultiPasteBundle(
  sourceNodes: CircuitNode[],
  sourcePipes: PipeConnection[],
  existingNodes: CircuitNode[],
  offsetX: number,
  offsetY: number
): { nodes: CircuitNode[]; pipes: PipeConnection[] } {
  const idMap = new Map<string, string>();
  const runningExisting = [...existingNodes];
  const newNodes: CircuitNode[] = [];

  for (let i = 0; i < sourceNodes.length; i += 1) {
    const src = sourceNodes[i];
    const newId = `n_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;
    idMap.set(src.id, newId);
    const placed = cloneNodeForPlacement(
      src,
      runningExisting,
      src.x + offsetX,
      src.y + offsetY,
      newId
    );
    runningExisting.push(placed);
    newNodes.push(placed);
  }

  const newPipes: PipeConnection[] = [];
  for (let i = 0; i < sourcePipes.length; i += 1) {
    const sp = sourcePipes[i];
    const mappedFrom = idMap.get(sp.fromNodeId);
    const mappedTo = idMap.get(sp.toNodeId);
    if (!mappedFrom || !mappedTo) continue;
    newPipes.push({
      id: `pipe_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      fromNodeId: mappedFrom,
      fromPortId: sp.fromPortId,
      toNodeId: mappedTo,
      toPortId: sp.toPortId,
      waypoints: sp.waypoints?.map((wp) => ({
        x: Math.round(wp.x + offsetX),
        y: Math.round(wp.y + offsetY),
      })),
    });
  }

  return { nodes: newNodes, pipes: newPipes };
}

