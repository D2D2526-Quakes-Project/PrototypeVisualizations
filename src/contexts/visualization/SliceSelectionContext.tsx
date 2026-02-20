import { createContext, useContext, useState, useCallback, useRef, useMemo, type ReactNode } from "react";
import { DockviewApi } from "dockview";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { useViewStore } from "@/stores";

type SliceType = "floor";

export interface Slice {
  id: string;
  type: SliceType;
  value: string | number;
  nodeIds: number[];
  label: string;
  storyId?: string;
}

interface SliceDockContextType {
  openSlicePanel: (sliceId: string, storyId: string) => void;
}

export const SliceDockContext = createContext<SliceDockContextType | undefined>(undefined);

export function useSliceDock() {
  const context = useContext(SliceDockContext);
  if (!context) {
    throw new Error("useSliceDock must be used within SliceDockProvider");
  }
  return context;
}

interface SliceSelectionContextType {
  selectedSlice: Slice | null;
  hoveredSlice: Slice | null;
  sliceEnabled: boolean;
  xRange: [number, number];
  yRange: [number, number];
  zRange: [number, number];
  selectSlice: (slice: Slice) => void;
  deselectSlice: () => void;
  setHovered: (slice: Slice | null) => void;
  toggleSliceEnabled: () => void;
  setXRange: (range: [number, number]) => void;
  setYRange: (range: [number, number]) => void;
  setZRange: (range: [number, number]) => void;
  setDockviewApi: (api: DockviewApi) => void;
  openSlicePanel: (sliceId: string, storyId: string) => void;
}

const SliceSelectionContext = createContext<SliceSelectionContextType | undefined>(undefined);

export function useSliceSelection() {
  const context = useContext(SliceSelectionContext);
  if (!context) {
    throw new Error("useSliceSelection must be used within SliceSelectionProvider");
  }
  return context;
}

export function SliceSelectionProvider({ children }: { children: ReactNode }) {
  const { animationData } = useAnimationData();

  const [selectedSlice, setSelectedSlice] = useState<Slice | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<Slice | null>(null);
  
  const sliceEnabled = useViewStore((s) => s.sliceEnabled);
  const setSliceEnabled = useViewStore((s) => s.setSliceEnabled);
  const xRange = useViewStore((s) => s.xRange);
  const yRange = useViewStore((s) => s.yRange);
  const zRange = useViewStore((s) => s.zRange);
  const setXRange = useViewStore((s) => s.setXRange);
  const setYRange = useViewStore((s) => s.setYRange);
  const setZRange = useViewStore((s) => s.setZRange);

  // Initialize ranges from animation data
  const initRanges = useCallback(() => {
    if (animationData?.precomputed?.boundingBox) {
      setXRange([
        Math.floor(animationData.precomputed.boundingBox.min[0]),
        Math.ceil(animationData.precomputed.boundingBox.max[0]),
      ]);
      setYRange([
        Math.floor(animationData.precomputed.boundingBox.min[1]),
        Math.ceil(animationData.precomputed.boundingBox.max[1]),
      ]);
      setZRange([
        Math.floor(animationData.precomputed.boundingBox.min[2]),
        Math.ceil(animationData.precomputed.boundingBox.max[2]),
      ]);
    }
  }, [animationData, setXRange, setYRange, setZRange]);

  // Initialize once on mount
  useRef(() => {
    initRanges();
  });

  const [api, setApi] = useState<DockviewApi | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const setDockviewApi = useCallback((dockviewApi: DockviewApi) => {
    setApi(dockviewApi);

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const disposable = dockviewApi.onDidRemovePanel((panel) => {
      if (panel.id.startsWith("slice-panel-")) {
        setSelectedSlice(null);
      }
    });

    unsubscribeRef.current = () => disposable.dispose();
  }, []);

  const openSlicePanel = useCallback(
    (sliceId: string, storyId: string) => {
      if (!api) return;

      const panelId = `slice-panel-${sliceId}`;
      const existingPanel = api.getPanel(panelId);

      if (existingPanel) {
        existingPanel.focus();
        return;
      }

      api.addPanel({
        id: panelId,
        component: "slicePanel",
        title: `Floor ${storyId}`,
        params: { sliceId },
        maximumWidth: 300,
        position: { direction: "right" },
      });
    },
    [api],
  );

  const selectSlice = useCallback(
    (slice: Slice) => {
      setSelectedSlice(slice);
      if (slice.type === "floor" && slice.storyId) {
        openSlicePanel(slice.id, slice.storyId);
      }
    },
    [openSlicePanel],
  );

  const deselectSlice = useCallback(() => {
    setSelectedSlice(null);
  }, []);

  const setHovered = useCallback((slice: Slice | null) => {
    setHoveredSlice(slice);
  }, []);

  const toggleSliceEnabled = useCallback(() => {
    setSliceEnabled(!sliceEnabled);
  }, [sliceEnabled, setSliceEnabled]);

  const value = useMemo((): SliceSelectionContextType => ({
    selectedSlice,
    hoveredSlice,
    sliceEnabled,
    xRange,
    yRange,
    zRange,
    selectSlice,
    deselectSlice,
    setHovered,
    toggleSliceEnabled,
    setXRange,
    setYRange,
    setZRange,
    setDockviewApi,
    openSlicePanel,
  }), [selectedSlice, hoveredSlice, sliceEnabled, xRange, yRange, zRange, selectSlice, deselectSlice, setHovered, toggleSliceEnabled, setXRange, setYRange, setZRange, setDockviewApi, openSlicePanel]);

  return <SliceSelectionContext.Provider value={value}>{children}</SliceSelectionContext.Provider>;
}
