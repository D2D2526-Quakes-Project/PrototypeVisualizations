import { DockviewWrapper } from "@/features/view-3d/components/dockviewWrapper";
import { CrossSectionPanel, CrossSectionTab } from "@/features/view-3d/components/CrossSectionPanel";
import { FloorPanel, FloorTab } from "@/features/view-3d/components/FloorPanel";
import {
  MagicPanel,
  MagicPanelHeaderActions,
  MagicPanelTab,
  type MagicPanelParams,
} from "@/features/view-3d/components/MagicPanel";
import { NodePanel, NodeTab } from "@/features/view-3d/components/NodePanel";
import { NodeSelectionProvider, useNodeSelection } from "@/features/view-3d/contexts/NodeSelectionContext";
import { useAutoSave } from "@/features/view-3d/hooks/useAutoSave";
import {
  getDefaultAppState,
  getStateFromCurrentUrl,
  loadFromLocalStorage,
  saveUrlState,
  type AppState,
  type PanelState,
} from "@/features/view-3d/lib/statePersistence";
import { THRESHOLD_CONFIGS, type Metric, type MetricPaletteKey, type ThresholdKey } from "@/lib/metrics";
import { useViewStoreRaw } from "@/state";
import { type DockviewApi, type DockviewReadyEvent, type SerializedDockview } from "dockview";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { useCrossSectionSelection } from "./contexts/visualization/CrossSectionSelectionContext";

const components = {
  nodePanel: NodePanel,
  magicPanel: MagicPanel,
  floorPanel: FloorPanel,
  crossSectionPanel: CrossSectionPanel,
};

const tabComponents = {
  nodeTab: NodeTab,
  floorTab: FloorTab,
  magicPanelTab: MagicPanelTab,
  crossSectionTab: CrossSectionTab,
};

function sanitizePanelStates(initialPanelStates: AppState["panelStates"]): Record<string, PanelState> {
  return Object.fromEntries(
    Object.entries(initialPanelStates ?? {}).filter((entry): entry is [string, PanelState] => Boolean(entry[1]))
  ) as Record<string, PanelState>;
}

export function View3d() {
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState<AppState | null>(null);

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    void (async () => {
      const urlState = await getStateFromCurrentUrl();
      const savedState = loadFromLocalStorage();
      const stateToRestore = urlState ?? savedState;

      if (stateToRestore) {
        requestAnimationFrame(() => {
          if (new URLSearchParams(window.location.search).get("debugState") === "1") {
            console.debug("[restore] loaded initial state", {
              source: urlState ? "url" : "localStorage",
              frameIndex: stateToRestore.frameIndex,
              panelStateKeys: Object.keys(stateToRestore.panelStates ?? {}),
            });
          }
          setInitialState(stateToRestore);

          if (urlState) {
            saveUrlState(stateToRestore);
          }
        });
      } else {
        requestAnimationFrame(() => {
          setInitialState(getDefaultAppState());
        });
      }

      requestAnimationFrame(() => {
        setIsReady(true);
      });
    })();
  }, []);

  return (
    isReady && initialState ? <View3dWorkspace initialState={initialState} /> : <div className="flex min-h-0 flex-1 flex-col" />
  );
}

export const View3dWorkspace = forwardRef<
  HTMLDivElement,
  { initialState: AppState; autoSave?: boolean; className?: string }
>(function View3dWorkspace({ initialState, autoSave = true, className }, ref) {
  return (
    <div ref={ref} className={className ?? "flex min-h-0 flex-1 flex-col"}>
      <NodeSelectionProvider>
        <DockviewContainer initialState={initialState} autoSave={autoSave} />
      </NodeSelectionProvider>
    </div>
  );
});

function DockviewContainer({ initialState, autoSave = true }: { initialState: AppState; autoSave?: boolean }) {
  const { setDockviewApi } = useNodeSelection();
  const { setDockviewApi: setCrossSectionDockviewApi } = useCrossSectionSelection();
  const store = useViewStoreRaw();
  const hasAppliedInitialStateRef = useRef(false);
  const hasReassertedCriticalStateRef = useRef(false);

  useAutoSave(autoSave);

  useEffect(() => {
    if (hasAppliedInitialStateRef.current) return;
    hasAppliedInitialStateRef.current = true;

    const s = store.getState();
    s.setFrameIndex(initialState.frameIndex);
    s.setColorMetric(initialState.currentMetric);
    (Object.entries(initialState.metricPaletteOverrides ?? {}) as Array<[Metric, MetricPaletteKey]>).forEach(
      ([metric, palette]) => {
        s.setMetricPalette(metric, palette);
      }
    );
    s.setThresholdHighlighting(initialState.thresholdHighlighting);

    (Object.entries(initialState.thresholds) as Array<[ThresholdKey, number]>).forEach(([key, value]) => {
      if (key in THRESHOLD_CONFIGS) {
        s.setThreshold(key, value);
      }
    });

    s.setVisibleFloors(initialState.visibleFloors);
    s.setSelectedNodes(initialState.selectedNodeIds);
    s.setHiddenNodeIds(initialState.hiddenNodeIds ?? []);
    s.setHideSelectedNodes(initialState.hideSelectedNodes ?? false);

    s.setExpandedScale(initialState.expandedScale);

    s.setSliceEnabled(initialState.sliceEnabled);
    s.setSliceRanges(initialState.xRange, initialState.yRange, initialState.zRange);

    if (initialState.camera) {
      s.setCameraState(initialState.camera);
    }

    s.setBackgroundColor(initialState.backgroundColor);

    if (initialState.renderNodes !== undefined) s.setRenderNodes(initialState.renderNodes);
    if (initialState.renderFloorSlabs !== undefined) s.setRenderFloorSlabs(initialState.renderFloorSlabs);
    if (initialState.renderXCrossSectionSlabs !== undefined)
      s.setRenderXCrossSectionSlabs(initialState.renderXCrossSectionSlabs);
    if (initialState.renderYCrossSectionSlabs !== undefined)
      s.setRenderYCrossSectionSlabs(initialState.renderYCrossSectionSlabs);
    if (initialState.showCornersOnly !== undefined) s.setShowCornersOnly(initialState.showCornersOnly);
    if (initialState.renderVerticalConnections !== undefined)
      s.setRenderVerticalConnections(initialState.renderVerticalConnections);
    if (initialState.renderHorizontalConnections !== undefined)
      s.setRenderHorizontalConnections(initialState.renderHorizontalConnections);

    if (initialState.layout) {
      s.setDockviewLayout(initialState.layout);
    }

    s.setPanelStates(sanitizePanelStates(initialState.panelStates));
  }, [store, initialState]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (hasReassertedCriticalStateRef.current) return;
      hasReassertedCriticalStateRef.current = true;

      const s = store.getState();
      s.setFrameIndex(initialState.frameIndex);
      s.setPanelStates(sanitizePanelStates(initialState.panelStates));

      if (new URLSearchParams(window.location.search).get("debugState") === "1") {
        console.debug("[restore] reasserted critical state", {
          frameIndex: initialState.frameIndex,
          panelStateKeys: Object.keys(initialState.panelStates ?? {}),
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [store, initialState]);

  const initialLayout = initialState.layout ?? getDefaultAppState().layout;

  const handleDockviewReady = useCallback(
    (event: DockviewReadyEvent) => {
      setDockviewApi(event.api);
      setCrossSectionDockviewApi(event.api);
    },
    [setDockviewApi, setCrossSectionDockviewApi]
  );

  const handleLayoutChange = useCallback(
    (layout: SerializedDockview) => {
      store.getState().setDockviewLayout(layout);
    },
    [store]
  );

  const createDefaultLayout = useCallback((api: DockviewApi) => {
    const mainCanvas = api.addPanel<MagicPanelParams>({
      id: "main-canvas",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      params: { panelType: "Main Canvas" },
      initialHeight: 760,
    });

    api.addPanel<MagicPanelParams>({
      id: "timeline",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      position: { referencePanel: mainCanvas, direction: "below" },
      params: { panelType: "Timeline" },
      initialHeight: 200,
    });

    const interstoryDriftPanel = api.addPanel<MagicPanelParams>({
      id: "corner-metric-chart",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      position: { referencePanel: mainCanvas, direction: "right" },
      params: { panelType: "Corner Metric Chart" },
      initialWidth: 560,
    });

    api.addPanel<MagicPanelParams>({
      id: "floor-displacement",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      position: { referencePanel: interstoryDriftPanel, direction: "within" },
      params: { panelType: "Floor Average Metric" },
    });
  }, []);

  return (
    <DockviewWrapper
      components={components}
      tabComponents={tabComponents}
      rightHeaderActionsComponent={MagicPanelHeaderActions}
      onReady={handleDockviewReady}
      onLayoutChange={handleLayoutChange}
      initialLayout={initialLayout ?? undefined}
      createDefaultLayout={createDefaultLayout}
      className="flex-1"
      singleTabMode="fullwidth"
    />
  );
}
