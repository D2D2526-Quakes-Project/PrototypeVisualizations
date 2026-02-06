import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { DockviewApi } from "dockview";

export interface NodeSelectionContextType {
  selectedNode: number | null;
  // We store the API here so the 3D scene can call it
  setDockviewApi: (api: DockviewApi) => void;
  selectNode: (nodeId: number) => void;
  deselectNode: () => void;
}

const NodeSelectionContext = createContext<NodeSelectionContextType | undefined>(undefined);

export function useNodeSelection() {
  const context = useContext(NodeSelectionContext);
  if (!context) {
    throw new Error("useNodeSelection must be used within NodeSelectionProvider");
  }
  return context;
}

export function NodeSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [api, setApi] = useState<DockviewApi | null>(null);

  const setDockviewApi = useCallback((dockviewApi: DockviewApi) => {
    setApi(dockviewApi);
  }, []);

  const selectNode = useCallback(
    (nodeId: number) => {
      if (!api) return;

      setSelectedNode(nodeId);

      const panelId = `node-panel-${nodeId}`;
      const existingPanel = api.getPanel(panelId);

      if (existingPanel) {
        // If it exists, just bring it to the front
        existingPanel.focus();
        return;
      }

      // Create the panel as a floating group initially
      api.addPanel({
        id: panelId,
        component: "nodePanel", // We will register this in the next step
        tabComponent: "nodeTab",
        title: `Node ${nodeId}`,
        params: { nodeId }, // Pass the nodeId to the component
        maximumWidth: 300,
        position: { direction: "right" },
      });
    },
    [api],
  );

  const deselectNode = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <NodeSelectionContext.Provider
      value={{
        selectedNode,
        setDockviewApi,
        selectNode,
        deselectNode,
      }}>
      {children}
    </NodeSelectionContext.Provider>
  );
}
