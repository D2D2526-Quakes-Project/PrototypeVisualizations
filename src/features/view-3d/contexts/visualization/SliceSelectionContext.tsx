import { useAnimationData } from "@/lib/useAnimationData";
import { useViewStore, useViewStoreRaw, type SliceSelectionState } from "@/state";
import type { DockviewApi } from "dockview";
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";

export type SliceType = "floor";

export interface Slice extends SliceSelectionState {
  type: SliceType;
}

interface SliceDockContextType {
  openSlicePanel: (storyId: string) => void;
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
  openSlicePanel: (storyId: string) => void;
}

const SliceSelectionContext = createContext<SliceSelectionContextType | undefined>(undefined);

let dockviewApiRef: DockviewApi | null = null;
let disposePanelSubscription: (() => void) | null = null;

export function useSliceSelection() {
  const context = useContext(SliceSelectionContext);
  if (!context) {
    throw new Error("useSliceSelection must be used within SliceSelectionProvider");
  }
  return context;
}

export function SliceSelectionProvider({ children }: { children: ReactNode }) {
  const { animationData } = useAnimationData();
  const store = useViewStoreRaw();

  const selectedSlice = useViewStore((s) => s.selectedSlice);
  const hoveredSlice = useViewStore((s) => s.hoveredSlice);
  const sliceEnabled = useViewStore((s) => s.sliceEnabled);
  const setSliceEnabled = useViewStore((s) => s.setSliceEnabled);
  const xRange = useViewStore((s) => s.xRange);
  const yRange = useViewStore((s) => s.yRange);
  const zRange = useViewStore((s) => s.zRange);
  const setXRange = useViewStore((s) => s.setXRange);
  const setYRange = useViewStore((s) => s.setYRange);
  const setZRange = useViewStore((s) => s.setZRange);
  const selectSliceStore = useViewStore((s) => s.selectSlice);
  const deselectSliceStore = useViewStore((s) => s.deselectSlice);
  const setHoveredSliceStore = useViewStore((s) => s.setHoveredSlice);

  useEffect(() => {
    if (!animationData?.precomputed?.boundingBox) return;

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
  }, [animationData, setXRange, setYRange, setZRange]);

  const setDockviewApi = useCallback(
    (api: DockviewApi) => {
      dockviewApiRef = api;

      if (disposePanelSubscription) {
        disposePanelSubscription();
      }

      const disposable = api.onDidRemovePanel((panel) => {
        if (panel.id.startsWith("slice-panel-")) {
          store.getState().deselectSlice();
        }
      });

      disposePanelSubscription = () => disposable.dispose();
    },
    [store]
  );

  const openSlicePanel = useCallback((storyId: string) => {
    if (!dockviewApiRef) return;

    const panelId = `slice-panel-${storyId}`;
    const existingPanel = dockviewApiRef.getPanel(panelId);

    if (existingPanel) {
      existingPanel.focus();
      return;
    }

    dockviewApiRef.addPanel({
      id: panelId,
      component: "floorPanel",
      tabComponent: "floorTab",
      title: `Floor ${storyId}`,
      params: { storyId },
      maximumWidth: 300,
      position: { direction: "right" },
    });
  }, []);

  const selectSlice = useCallback(
    (slice: Slice) => {
      selectSliceStore(slice);
      if (slice.type === "floor" && slice.storyId) {
        openSlicePanel(slice.storyId);
      }
    },
    [openSlicePanel, selectSliceStore]
  );

  const deselectSlice = useCallback(() => {
    deselectSliceStore();
  }, [deselectSliceStore]);

  const setHovered = useCallback(
    (slice: Slice | null) => {
      setHoveredSliceStore(slice);
    },
    [setHoveredSliceStore]
  );

  const toggleSliceEnabled = useCallback(() => {
    setSliceEnabled(!sliceEnabled);
  }, [sliceEnabled, setSliceEnabled]);

  const value = useMemo<SliceSelectionContextType>(
    () => ({
      selectedSlice: selectedSlice as Slice | null,
      hoveredSlice: hoveredSlice as Slice | null,
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
    }),
    [
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
    ]
  );

  useEffect(() => {
    return () => {
      if (disposePanelSubscription) {
        disposePanelSubscription();
        disposePanelSubscription = null;
      }
      dockviewApiRef = null;
    };
  }, []);

  return <SliceSelectionContext.Provider value={value}>{children}</SliceSelectionContext.Provider>;
}
