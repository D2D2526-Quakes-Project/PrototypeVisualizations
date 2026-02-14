import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { DockviewApi } from "dockview";

export interface NodeSelectionContextType {
  selectedNodes: number[];
  // We store the API here so the 3D scene can call it
  setDockviewApi: (api: DockviewApi) => void;
  selectNode: (nodeId: number) => void;
  deselectNode: (nodeId: number) => void;
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
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const [api, setApi] = useState<DockviewApi | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const setDockviewApi = useCallback((dockviewApi: DockviewApi) => {
    setApi(dockviewApi);
    
    // Subscribe to panel close events to keep selection in sync
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    
    const disposable = dockviewApi.onDidRemovePanel((panel) => {
      if (panel.id.startsWith('node-panel-')) {
        const nodeId = parseInt(panel.id.replace('node-panel-', ''));
        setSelectedNodes(prev => prev.filter(id => id !== nodeId));
      }
    });
    
    unsubscribeRef.current = () => disposable.dispose();
  }, []);

  const selectNode = useCallback(
    (nodeId: number) => {
      if (!api) return;

      setSelectedNodes(prev => {
        if (prev.includes(nodeId)) return prev;
        return [...prev, nodeId];
      });

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
        component: "nodePanel",
        tabComponent: "nodeTab",
        title: `Node ${nodeId}`,
        params: { nodeId },
        maximumWidth: 300,
        position: { direction: "right" },
      });
    },
    [api],
  );

  const deselectNode = useCallback((nodeId: number) => {
    setSelectedNodes(prev => prev.filter(id => id !== nodeId));
    
    // Also close the panel if it exists
    if (api) {
      const panelId = `node-panel-${nodeId}`;
      const panel = api.getPanel(panelId);
      if (panel) {
        panel.api.close();
      }
    }
  }, [api]);

  return (
    <NodeSelectionContext.Provider
      value={{
        selectedNodes,
        setDockviewApi,
        selectNode,
        deselectNode,
      }}>
      {children}
    </NodeSelectionContext.Provider>
  );
}
