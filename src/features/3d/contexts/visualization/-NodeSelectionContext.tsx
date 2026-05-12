// import type { DockviewApi } from "dockview";
// import { useCallback, useEffect } from "react";

// export interface NodeSelectionContextType {
//   selectedNodes: number[];
//   setDockviewApi: (api: DockviewApi) => void;
//   selectNode: (nodeId: number) => void;
//   deselectNode: (nodeId: number) => void;
// }

// const NODE_PANEL_PREFIX = "node-panel-";

// let dockviewApiRef: DockviewApi | null = null;
// let disposePanelSubscription: (() => void) | null = null;

// function getNodeIdFromPanelId(panelId: string): number | null {
//   if (!panelId.startsWith(NODE_PANEL_PREFIX)) return null;
//   const parsed = Number(panelId.replace(NODE_PANEL_PREFIX, ""));
//   return Number.isFinite(parsed) ? parsed : null;
// }

// export function useNodeSelection(): NodeSelectionContextType {
//   const store = useViewStoreRaw();
//   const selectedNodes = useViewStore((s) => s.openedNodePanelIds);

//   const setDockviewApi = useCallback(
//     (api: DockviewApi) => {
//       dockviewApiRef = api;

//       if (disposePanelSubscription) {
//         disposePanelSubscription();
//       }

//       const disposable = api.onDidRemovePanel((panel) => {
//         const nodeId = getNodeIdFromPanelId(panel.id);
//         if (nodeId === null) return;
//         store.getState().removeSelectedNode(nodeId);
//         store.getState().removeOpenedNodePanel(nodeId);
//       });

//       disposePanelSubscription = () => disposable.dispose();
//     },
//     [store]
//   );

//   const selectNode = useCallback(
//     (nodeId: number) => {
//       if (!dockviewApiRef) {
//         return;
//       }

//       const panelId = `${NODE_PANEL_PREFIX}${nodeId}`;
//       const existingPanel = dockviewApiRef.getPanel(panelId);
//       if (existingPanel) {
//         store.getState().addOpenedNodePanel(nodeId);
//         existingPanel.focus();
//         return;
//       }

//       dockviewApiRef.addPanel({
//         id: panelId,
//         component: "nodePanel",
//         tabComponent: "nodeTab",
//         title: `Node ${nodeId}`,
//         params: { nodeId },
//         maximumWidth: 300,
//         position: { direction: "right" },
//       });
//       store.getState().addOpenedNodePanel(nodeId);
//     },
//     [store]
//   );

//   const deselectNode = useCallback(
//     (nodeId: number) => {
//       store.getState().removeSelectedNode(nodeId);
//       store.getState().removeOpenedNodePanel(nodeId);

//       if (!dockviewApiRef) {
//         return;
//       }

//       const panel = dockviewApiRef.getPanel(`${NODE_PANEL_PREFIX}${nodeId}`);
//       if (panel) {
//         panel.api.close();
//       }
//     },
//     [store]
//   );

//   return {
//     selectedNodes,
//     setDockviewApi,
//     selectNode,
//     deselectNode,
//   };
// }

// export function NodeSelectionProvider({ children }: { children: React.ReactNode }) {
//   useEffect(() => {
//     return () => {
//       if (disposePanelSubscription) {
//         disposePanelSubscription();
//         disposePanelSubscription = null;
//       }
//       dockviewApiRef = null;
//     };
//   }, []);

//   return <>{children}</>;
// }
