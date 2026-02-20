import { createContext, useContext, useCallback, useMemo, type ReactNode, type RefObject } from "react";
import { useViewStore } from "@/stores";
import * as THREE from "three";
import type { BoxSelection as StoreBoxSelection } from "@/stores/viewStore";

interface NodeVisibilityContextType {
  selectedNodeIds: Set<number>;
  boxSelection: StoreBoxSelection | null;
  isBoxSelecting: boolean;
  setSelectedNodes: (nodes: number[]) => void;
  addSelectedNodes: (nodes: number[]) => void;
  clearSelection: () => void;
  startBoxSelection: (start: { x: number; y: number }) => void;
  updateBoxSelection: (end: { x: number; y: number }) => void;
  endBoxSelection: () => void;
  cancelBoxSelection: () => void;
}

const NodeVisibilityContext = createContext<NodeVisibilityContextType | undefined>(undefined);

export function useNodeVisibility() {
  const context = useContext(NodeVisibilityContext);
  if (!context) {
    throw new Error("useNodeVisibility must be used within NodeVisibilityProvider");
  }
  return context;
}

export function NodeVisibilityProvider({ children }: { children: ReactNode }) {
  const selectedNodeIdsArray = useViewStore((s) => s.selectedNodeIds);
  const boxSelection = useViewStore((s) => s.boxSelection);
  const isBoxSelecting = useViewStore((s) => s.isBoxSelecting);
  const setSelectedNodesStore = useViewStore((s) => s.setSelectedNodes);
  const addSelectedNodesStore = useViewStore((s) => s.addSelectedNodes);
  const clearSelectionStore = useViewStore((s) => s.clearSelection);
  const startBoxSelectionStore = useViewStore((s) => s.startBoxSelection);
  const updateBoxSelectionStore = useViewStore((s) => s.updateBoxSelection);
  const endBoxSelectionStore = useViewStore((s) => s.endBoxSelection);

  const selectedNodeIds = useMemo(() => new Set(selectedNodeIdsArray), [selectedNodeIdsArray]);

  const setSelectedNodes = useCallback((nodes: number[]) => {
    setSelectedNodesStore(nodes);
  }, [setSelectedNodesStore]);

  const addSelectedNodes = useCallback((nodes: number[]) => {
    addSelectedNodesStore(nodes);
  }, [addSelectedNodesStore]);

  const clearSelection = useCallback(() => {
    clearSelectionStore();
  }, [clearSelectionStore]);

  const startBoxSelection = useCallback((start: { x: number; y: number }) => {
    startBoxSelectionStore(start);
  }, [startBoxSelectionStore]);

  const updateBoxSelection = useCallback((end: { x: number; y: number }) => {
    updateBoxSelectionStore(end);
  }, [updateBoxSelectionStore]);

  const endBoxSelection = useCallback(() => {
    endBoxSelectionStore();
  }, [endBoxSelectionStore]);

  const cancelBoxSelection = useCallback(() => {
    // Cancel is same as end for now
    endBoxSelectionStore();
  }, [endBoxSelectionStore]);

  const value = useMemo((): NodeVisibilityContextType => ({
    selectedNodeIds,
    boxSelection,
    isBoxSelecting,
    setSelectedNodes,
    addSelectedNodes,
    clearSelection,
    startBoxSelection,
    updateBoxSelection,
    endBoxSelection,
    cancelBoxSelection,
  }), [selectedNodeIds, boxSelection, isBoxSelecting, setSelectedNodes, addSelectedNodes, clearSelection, startBoxSelection, updateBoxSelection, endBoxSelection, cancelBoxSelection]);

  return <NodeVisibilityContext.Provider value={value}>{children}</NodeVisibilityContext.Provider>;
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

    // Convert from NDC to screen space (0-1)
    const screenX = (worldPos.x + 1) / 2;
    const screenY = 1 - (worldPos.y + 1) / 2;

    if (screenX >= minX && screenX <= maxX && screenY >= minY && screenY <= maxY) {
      selectedNodes.push(nodeId);
    }
  }

  return selectedNodes;
}
