import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface FloatingPanel {
  id: string;
  nodeId: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
  zIndex: number;
}

export interface NodeSelectionContextType {
  selectedNode: number | null;
  floatingPanels: FloatingPanel[];
  selectNode: (nodeId: number, screenPosition: { x: number; y: number }) => void;
  deselectNode: () => void;
  addFloatingPanel: (nodeId: number, position: { x: number; y: number }) => void;
  removeFloatingPanel: (panelId: string) => void;
  updatePanelPosition: (panelId: string, position: { x: number; y: number }) => void;
  togglePanelMinimized: (panelId: string) => void;
  bringToFront: (panelId: string) => void;
}

const NodeSelectionContext = createContext<NodeSelectionContextType | undefined>(undefined);

export function useNodeSelection() {
  const context = useContext(NodeSelectionContext);
  if (!context) {
    throw new Error("useNodeSelection must be used within NodeSelectionProvider");
  }
  return context;
}

interface NodeSelectionProviderProps {
  children: ReactNode;
}

export function NodeSelectionProvider({ children }: NodeSelectionProviderProps) {
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [floatingPanels, setFloatingPanels] = useState<FloatingPanel[]>([]);
  const [nextZIndex, setNextZIndex] = useState(1000);

  const selectNode = useCallback((nodeId: number, screenPosition: { x: number; y: number }) => {
    setSelectedNode(nodeId);
    // Automatically create a floating panel when a node is selected
    addFloatingPanel(nodeId, screenPosition);
  }, []);

  const deselectNode = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const addFloatingPanel = useCallback((nodeId: number, position: { x: number; y: number }) => {
    const panelId = `panel-${nodeId}-${Date.now()}`;
    const newPanel: FloatingPanel = {
      id: panelId,
      nodeId,
      position: {
        x: Math.max(0, Math.min(position.x - 150, window.innerWidth - 320)),
        y: Math.max(0, Math.min(position.y - 100, window.innerHeight - 250))
      },
      size: { width: 300, height: 200 },
      isMinimized: false,
      zIndex: nextZIndex
    };

    setFloatingPanels(prev => [...prev, newPanel]);
    setNextZIndex(prev => prev + 1);
  }, [nextZIndex]);

  const removeFloatingPanel = useCallback((panelId: string) => {
    setFloatingPanels(prev => prev.filter(panel => panel.id !== panelId));
  }, []);

  const updatePanelPosition = useCallback((panelId: string, position: { x: number; y: number }) => {
    setFloatingPanels(prev => 
      prev.map(panel => 
        panel.id === panelId 
          ? { ...panel, position }
          : panel
      )
    );
  }, []);

  const togglePanelMinimized = useCallback((panelId: string) => {
    setFloatingPanels(prev => 
      prev.map(panel => 
        panel.id === panelId 
          ? { ...panel, isMinimized: !panel.isMinimized }
          : panel
      )
    );
  }, []);

  const bringToFront = useCallback((panelId: string) => {
    setFloatingPanels(prev => {
      const maxZIndex = Math.max(...prev.map(p => p.zIndex));
      return prev.map(panel => 
        panel.id === panelId 
          ? { ...panel, zIndex: maxZIndex + 1 }
          : panel
      );
    });
    setNextZIndex(prev => prev + 1);
  }, []);

  const value: NodeSelectionContextType = {
    selectedNode,
    floatingPanels,
    selectNode,
    deselectNode,
    addFloatingPanel,
    removeFloatingPanel,
    updatePanelPosition,
    togglePanelMinimized,
    bringToFront
  };

  return (
    <NodeSelectionContext.Provider value={value}>
      {children}
    </NodeSelectionContext.Provider>
  );
}