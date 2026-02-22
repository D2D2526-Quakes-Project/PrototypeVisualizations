import { useViewStore } from "@/state";
import * as THREE from "three";
import type { BoxSelection as StoreBoxSelection } from "@/state/viewStore";
import { useCallback, useMemo, type RefObject } from "react";

interface NodeVisibilityContextType {
  selectedNodeIds: Set<number>;
  boxSelection: StoreBoxSelection | null;
  boxSelectionPanelId: string | null;
  isBoxSelecting: boolean;
  hoveredNodeId: number | null;
  hideSelectedNodes: boolean;
  setSelectedNodes: (nodes: number[]) => void;
  addSelectedNodes: (nodes: number[]) => void;
  removeSelectedNode: (nodeId: number) => void;
  setHideSelectedNodes: (hide: boolean) => void;
  toggleHideSelectedNodes: () => void;
  clearSelection: () => void;
  startBoxSelection: (start: { x: number; y: number }, panelId?: string) => void;
  updateBoxSelection: (end: { x: number; y: number }, panelId?: string) => void;
  endBoxSelection: (panelId?: string) => void;
  cancelBoxSelection: () => void;
  setHoveredNodeId: (nodeId: number | null) => void;
}

export function NodeVisibilityProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useNodeVisibility(): NodeVisibilityContextType {
  const selectedNodeIdsArray = useViewStore((s) => s.selectedNodeIds);
  const boxSelection = useViewStore((s) => s.boxSelection);
  const boxSelectionPanelId = useViewStore((s) => s.boxSelectionPanelId);
  const isBoxSelecting = useViewStore((s) => s.isBoxSelecting);
  const hoveredNodeId = useViewStore((s) => s.hoveredNodeId);
  const hideSelectedNodes = useViewStore((s) => s.hideSelectedNodes);
  const setSelectedNodesStore = useViewStore((s) => s.setSelectedNodes);
  const removeSelectedNodeStore = useViewStore((s) => s.removeSelectedNode);
  const addSelectedNodesStore = useViewStore((s) => s.addSelectedNodes);
  const setHideSelectedNodesStore = useViewStore((s) => s.setHideSelectedNodes);
  const toggleHideSelectedNodesStore = useViewStore((s) => s.toggleHideSelectedNodes);
  const clearSelectionStore = useViewStore((s) => s.clearSelection);
  const startBoxSelectionStore = useViewStore((s) => s.startBoxSelection);
  const updateBoxSelectionStore = useViewStore((s) => s.updateBoxSelection);
  const endBoxSelectionStore = useViewStore((s) => s.endBoxSelection);
  const setHoveredNodeIdStore = useViewStore((s) => s.setHoveredNodeId);

  const selectedNodeIds = useMemo(() => new Set(selectedNodeIdsArray), [selectedNodeIdsArray]);

  const setSelectedNodes = useCallback(
    (nodes: number[]) => {
      setSelectedNodesStore(nodes);
    },
    [setSelectedNodesStore],
  );

  const addSelectedNodes = useCallback(
    (nodes: number[]) => {
      addSelectedNodesStore(nodes);
    },
    [addSelectedNodesStore],
  );

  const removeSelectedNode = useCallback(
    (nodeId: number) => {
      removeSelectedNodeStore(nodeId);
    },
    [removeSelectedNodeStore],
  );

  const setHideSelectedNodes = useCallback(
    (hide: boolean) => {
      setHideSelectedNodesStore(hide);
    },
    [setHideSelectedNodesStore],
  );

  const toggleHideSelectedNodes = useCallback(() => {
    toggleHideSelectedNodesStore();
  }, [toggleHideSelectedNodesStore]);

  const clearSelection = useCallback(() => {
    clearSelectionStore();
  }, [clearSelectionStore]);

  const startBoxSelection = useCallback(
    (start: { x: number; y: number }, panelId?: string) => {
      startBoxSelectionStore(start, panelId);
    },
    [startBoxSelectionStore],
  );

  const updateBoxSelection = useCallback(
    (end: { x: number; y: number }, panelId?: string) => {
      updateBoxSelectionStore(end, panelId);
    },
    [updateBoxSelectionStore],
  );

  const endBoxSelection = useCallback((panelId?: string) => {
    endBoxSelectionStore(panelId);
  }, [endBoxSelectionStore]);

  const cancelBoxSelection = useCallback(() => {
    endBoxSelectionStore();
  }, [endBoxSelectionStore]);

  const setHoveredNodeId = useCallback(
    (nodeId: number | null) => {
      setHoveredNodeIdStore(nodeId);
    },
    [setHoveredNodeIdStore],
  );

  return {
    selectedNodeIds,
    boxSelection,
    boxSelectionPanelId,
    isBoxSelecting,
    hoveredNodeId,
    hideSelectedNodes,
    setSelectedNodes,
    addSelectedNodes,
    removeSelectedNode,
    setHideSelectedNodes,
    toggleHideSelectedNodes,
    clearSelection,
    startBoxSelection,
    updateBoxSelection,
    endBoxSelection,
    cancelBoxSelection,
    setHoveredNodeId,
  };
}

export function performBoxSelection(
  camera: THREE.Camera,
  meshRef: RefObject<THREE.InstancedMesh | null>,
  box: StoreBoxSelection,
  visibleNodes: number[],
): number[] {
  const minX = Math.min(box.start.x, box.end.x);
  const maxX = Math.max(box.start.x, box.end.x);
  const minY = Math.min(box.start.y, box.end.y);
  const maxY = Math.max(box.start.y, box.end.y);

  const selectedNodes: number[] = [];
  const mesh = meshRef.current;
  if (!mesh) return selectedNodes;

  for (let i = 0; i < visibleNodes.length; i++) {
    const nodeId = visibleNodes[i];
    if (nodeId === undefined) continue;

    const matrix = new THREE.Matrix4();
    mesh.getMatrixAt(i, matrix);

    const worldPos = new THREE.Vector3().setFromMatrixPosition(matrix);
    worldPos.applyMatrix4(mesh.matrixWorld);
    worldPos.project(camera);

    const screenX = (worldPos.x + 1) / 2;
    const screenY = 1 - (worldPos.y + 1) / 2;

    if (screenX >= minX && screenX <= maxX && screenY >= minY && screenY <= maxY) {
      selectedNodes.push(nodeId);
    }
  }

  return selectedNodes;
}
