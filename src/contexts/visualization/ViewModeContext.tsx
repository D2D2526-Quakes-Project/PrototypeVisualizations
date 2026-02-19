import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { AnimationMetadata, IndexAccessor } from "@/lib/types";

export type ViewMode = "all-nodes" | "floor-slabs" | "exterior-only" | "corners-only" | "vertical-connections" | "threshold";

interface ViewModeContextType {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  getVisibleNodes: (
    nodeCount: number,
    metadata: AnimationMetadata,
    initialPositions?: IndexAccessor,
    xRange?: [number, number],
    yRange?: [number, number],
    zRange?: [number, number],
    sliceEnabled?: boolean,
  ) => number[];
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error("useViewMode must be used within ViewModeProvider");
  }
  return context;
}

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ViewMode>("all-nodes");

  const getVisibleNodes = useCallback((
    nodeCount: number,
    metadata: AnimationMetadata,
    initialPositions?: IndexAccessor,
    xRange?: [number, number],
    yRange?: [number, number],
    zRange?: [number, number],
    sliceEnabled?: boolean,
  ): number[] => {
    let nodes: number[];

    switch (mode) {
      case "all-nodes":
      case "exterior-only":
      case "vertical-connections":
      case "threshold":
        nodes = Array.from({ length: nodeCount }, (_, i) => i);
        break;

      case "floor-slabs":
        nodes = Object.values(metadata.stories).flat();
        break;

      case "corners-only":
        nodes = Object.values(metadata.corners).flat();
        break;

      default:
        nodes = Array.from({ length: nodeCount }, (_, i) => i);
    }

    if (sliceEnabled && initialPositions) {
      nodes = nodes.filter((nodeId) => {
        const pos = initialPositions.at(nodeId);
        if (!pos) return false;
        const [x, y, z] = pos;

        return (
          x >= (xRange?.[0] ?? -1000) &&
          x <= (xRange?.[1] ?? 1000) &&
          y >= (yRange?.[0] ?? -1000) &&
          y <= (yRange?.[1] ?? 1000) &&
          z >= (zRange?.[0] ?? 0) &&
          z <= (zRange?.[1] ?? 1000)
        );
      });
    }

    return nodes;
  }, [mode]);

  const value: ViewModeContextType = {
    mode,
    setMode,
    getVisibleNodes,
  };

  return <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>;
}
