import type { Size } from "@react-three/fiber";
import { createContext, useContext, useState, useCallback, type ReactNode, type RefObject } from "react";
import * as THREE from "three";

interface BoxSelection {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

interface NodeVisibilityContextType {
  selectedNodeIds: Set<number>;
  boxSelection: BoxSelection | null;
  isBoxSelecting: boolean;
  setSelectedNodes: (nodes: Set<number>) => void;
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
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<number>>(new Set());
  const [boxSelection, setBoxSelection] = useState<BoxSelection | null>(null);
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);

  const setSelectedNodes = useCallback((nodes: Set<number>) => {
    setSelectedNodeIds(nodes);
  }, []);

  const addSelectedNodes = useCallback((nodes: number[]) => {
    setSelectedNodeIds((prev) => {
      const next = new Set(prev);
      nodes.forEach((n) => next.add(n));
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNodeIds(new Set());
    setBoxSelection(null);
    setIsBoxSelecting(false);
  }, []);

  const startBoxSelection = useCallback((start: { x: number; y: number }) => {
    setBoxSelection({ start, end: start });
    setIsBoxSelecting(true);
  }, []);

  const updateBoxSelection = useCallback((end: { x: number; y: number }) => {
    setBoxSelection((prev) => (prev ? { ...prev, end } : null));
  }, []);

  const endBoxSelection = useCallback(() => {
    setIsBoxSelecting(false);
    setBoxSelection(null);
  }, []);

  const cancelBoxSelection = useCallback(() => {
    setBoxSelection(null);
    setIsBoxSelecting(false);
  }, []);

  const value: NodeVisibilityContextType = {
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
  };

  return <NodeVisibilityContext.Provider value={value}>{children}</NodeVisibilityContext.Provider>;
}

export function performBoxSelection(
  camera: THREE.Camera,
  meshRef: RefObject<THREE.InstancedMesh | null>,
  box: BoxSelection,
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
