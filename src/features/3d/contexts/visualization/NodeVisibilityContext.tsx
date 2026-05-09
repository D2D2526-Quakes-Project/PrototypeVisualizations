import { useLiveStore, useProfileStore } from "@/state";
import type { BoxSelection } from "@/state/liveState";
import { useCallback, useMemo, type RefObject } from "react";
import * as THREE from "three";

// export function useNodeVisibility() {
//   const selectedNodeIdsArray = useLiveStore((s) => s.selectedNodeIds);
//   const hiddenNodeIdsArray = useProfileStore((s) => s.hiddenNodeIds);
//   const boxSelection = useLiveStore((s) => s.boxSelection);
//   const boxSelectionPanelId = useLiveStore((s) => s.boxSelectionPanelId);
//   const isBoxSelecting = useLiveStore((s) => s.isBoxSelecting);
//   const hoveredNodeId = useLiveStore((s) => s.hoveredNodeId);
//   // const hideSelectedNodes = useProfileStore((s) => s.hideSelectedNodes);
//   const setSelectedNodesStore = useLiveStore((s) => s.setSelectedNodes);
//   const setHiddenNodeIdsStore = useProfileStore((s) => s.setHiddenNodeIds);
//   const removeSelectedNodeStore = useLiveStore((s) => s.removeSelectedNode);
//   const addSelectedNodesStore = useLiveStore((s) => s.addSelectedNodes);
//   const hideNodesStore = useProfileStore((s) => s.hideNodes);
//   const showNodesStore = useProfileStore((s) => s.showNodes);
//   const showAllNodesStore = useProfileStore((s) => s.showAllNodes);
//   // const setHideSelectedNodesStore = useProfileStore((s) => s.setHideSelectedNodes);
//   // const toggleHideSelectedNodesStore = useProfileStore((s) => s.toggleHideSelectedNodes);
//   const clearSelectionStore = useLiveStore((s) => s.clearSelection);
//   const startBoxSelectionStore = useLiveStore((s) => s.startBoxSelection);
//   const updateBoxSelectionStore = useLiveStore((s) => s.updateBoxSelection);
//   const endBoxSelectionStore = useLiveStore((s) => s.endBoxSelection);
//   const setHoveredNodeIdStore = useLiveStore((s) => s.setHoveredNodeId);

//   const selectedNodeIds = useMemo(() => new Set(selectedNodeIdsArray), [selectedNodeIdsArray]);
//   const hiddenNodeIds = useMemo(() => new Set(hiddenNodeIdsArray), [hiddenNodeIdsArray]);

//   const setSelectedNodes = useCallback(
//     (nodes: number[]) => {
//       setSelectedNodesStore(nodes);
//     },
//     [setSelectedNodesStore]
//   );

//   const addSelectedNodes = useCallback(
//     (nodes: number[]) => {
//       addSelectedNodesStore(nodes);
//     },
//     [addSelectedNodesStore]
//   );

//   const setHiddenNodeIds = useCallback(
//     (nodes: number[]) => {
//       setHiddenNodeIdsStore(nodes);
//     },
//     [setHiddenNodeIdsStore]
//   );

//   const hideNodes = useCallback(
//     (nodes: number[]) => {
//       hideNodesStore(nodes);
//     },
//     [hideNodesStore]
//   );

//   const showNodes = useCallback(
//     (nodes: number[]) => {
//       showNodesStore(nodes);
//     },
//     [showNodesStore]
//   );

//   const showAllNodes = useCallback(() => {
//     showAllNodesStore();
//   }, [showAllNodesStore]);

//   const removeSelectedNode = useCallback(
//     (nodeId: number) => {
//       removeSelectedNodeStore(nodeId);
//     },
//     [removeSelectedNodeStore]
//   );

//   const setHideSelectedNodes = useCallback(
//     (hide: boolean) => {
//       if (hide) {
//         hideNodes(Array.from(selectedNodeIds));
//       } else {
//         showNodes(Array.from(selectedNodeIds));
//       }
//     },
//     [hideNodes, selectedNodeIds, showNodes]
//   );

//   const toggleHideSelectedNodes = useCallback(() => {
//     toggleHideSelectedNodesStore();
//   }, [toggleHideSelectedNodesStore]);

//   const clearSelection = useCallback(() => {
//     clearSelectionStore();
//   }, [clearSelectionStore]);

//   const startBoxSelection = useCallback(
//     (start: { x: number; y: number }, panelId?: string) => {
//       startBoxSelectionStore(start, panelId);
//     },
//     [startBoxSelectionStore]
//   );

//   const updateBoxSelection = useCallback(
//     (end: { x: number; y: number }, panelId?: string) => {
//       updateBoxSelectionStore(end, panelId);
//     },
//     [updateBoxSelectionStore]
//   );

//   const endBoxSelection = useCallback(
//     (panelId?: string) => {
//       endBoxSelectionStore(panelId);
//     },
//     [endBoxSelectionStore]
//   );

//   const cancelBoxSelection = useCallback(() => {
//     endBoxSelectionStore();
//   }, [endBoxSelectionStore]);

//   const setHoveredNodeId = useCallback(
//     (nodeId: number | null) => {
//       setHoveredNodeIdStore(nodeId);
//     },
//     [setHoveredNodeIdStore]
//   );

//   return {
//     selectedNodeIds,
//     hiddenNodeIds,
//     boxSelection,
//     boxSelectionPanelId,
//     isBoxSelecting,
//     hoveredNodeId,
//     hideSelectedNodes,
//     setSelectedNodes,
//     setHiddenNodeIds,
//     addSelectedNodes,
//     removeSelectedNode,
//     hideNodes,
//     showNodes,
//     showAllNodes,
//     setHideSelectedNodes,
//     toggleHideSelectedNodes,
//     clearSelection,
//     startBoxSelection,
//     updateBoxSelection,
//     endBoxSelection,
//     cancelBoxSelection,
//     setHoveredNodeId,
//   };
// }

export function performBoxSelection(
  camera: THREE.Camera,
  meshRef: RefObject<THREE.InstancedMesh | null>,
  box: BoxSelection,
  visibleNodes: number[]
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
