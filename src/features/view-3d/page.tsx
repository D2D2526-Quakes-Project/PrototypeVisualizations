import { CrossSectionPanel, CrossSectionTab } from "@/features/view-3d/components/CrossSectionPanel";
import { DockviewWrapper } from "@/features/view-3d/components/dockviewWrapper";
import { FloorPanel, FloorTab } from "@/features/view-3d/components/FloorPanel";
import {
  MagicPanel,
  MagicPanelHeaderActions,
  MagicPanelTab,
  type MagicPanelParams,
} from "@/features/view-3d/components/MagicPanel";
import { NodePanel, NodeTab } from "@/features/view-3d/components/NodePanel";
import { NodeSelectionProvider, useNodeSelection } from "@/features/view-3d/contexts/NodeSelectionContext";
import {
  APPLY_WORKSPACE_STATE_EVENT,
  getDefaultWorkspaceState,
  getStateFromCurrentUrl,
  loadAppPreferences,
  loadFromLocalStorage,
  saveUrlState,
  type DataSelection,
  type WorkspaceState,
} from "@/features/view-3d/lib/statePersistence";
import { THRESHOLD_CONFIGS, type Metric, type MetricPaletteKey, type ThresholdKey } from "@/lib/metrics";
import { useAnimationData } from "@/lib/useAnimationData";
import { type DockviewApi, type DockviewReadyEvent, type SerializedDockview } from "dockview";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { useCrossSectionSelection } from "./contexts/visualization/CrossSectionSelectionContext";
import type { SavedPanelState } from "@/state/profileState";
import type { useViewStoreRaw } from "@/state/ViewProvider";

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

function sanitizePanelStates(initialPanelStates: WorkspaceState["panelStates"]): Record<string, SavedPanelState> {
  return Object.fromEntries(
    Object.entries(initialPanelStates ?? {}).filter((entry): entry is [string, SavedPanelState] => Boolean(entry[1]))
  ) as Record<string, SavedPanelState>;
}

function applyStateToStore(store: ReturnType<typeof useViewStoreRaw>, stateToApply: WorkspaceState) {
  const state = store.getState();
  state.setFrameIndex(stateToApply.frameIndex);
  state.setColorMetric(stateToApply.currentMetric);
  (Object.keys(state.metricPaletteOverrides) as Metric[]).forEach((metric) => {
    if (!(metric in (stateToApply.metricPaletteOverrides ?? {}))) {
      state.setMetricPalette(metric, null);
    }
  });
  (Object.entries(stateToApply.metricPaletteOverrides ?? {}) as Array<[Metric, MetricPaletteKey]>).forEach(
    ([metric, palette]) => {
      state.setMetricPalette(metric, palette);
    }
  );
  state.setThresholdHighlighting(stateToApply.thresholdHighlighting);

  (Object.entries(stateToApply.thresholds) as Array<[ThresholdKey, number]>).forEach(([key, value]) => {
    if (key in THRESHOLD_CONFIGS) {
      state.setThreshold(key, value);
    }
  });

  state.setVisibleFloors(stateToApply.visibleFloors);
  state.clearSelection();
  state.setSelectedNodes(stateToApply.selectedNodeIds);
  state.setHiddenNodeIds(stateToApply.hiddenNodeIds ?? []);
  state.setHideSelectedNodes(stateToApply.hideSelectedNodes ?? false);
  state.setColorTheme(stateToApply.colorTheme);
  state.setRenderNodes(stateToApply.renderNodes);
  state.setRenderFloorSlabs(stateToApply.renderFloorSlabs);
  state.setRenderXCrossSectionSlabs(stateToApply.renderXCrossSectionSlabs);
  state.setRenderYCrossSectionSlabs(stateToApply.renderYCrossSectionSlabs);
  state.setShowCornersOnly(stateToApply.showCornersOnly);
  state.setVisualInterpolationEnabled(stateToApply.visualInterpolationEnabled);
  state.setRenderVerticalConnections(stateToApply.renderVerticalConnections);
  state.setRenderHorizontalConnections(stateToApply.renderHorizontalConnections);
  if (stateToApply.layout) {
    state.setDockviewLayout(stateToApply.layout);
  }
  state.setPanelStates(sanitizePanelStates(stateToApply.panelStates));
}

export function View3d() {
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState<WorkspaceState | null>(null);
  const store = useViewStoreRaw();

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    void (async () => {
      const urlState = await getStateFromCurrentUrl();
      const savedState = loadFromLocalStorage();
      const stateToRestore = urlState ?? savedState;
      const preferences = loadAppPreferences();

      store.getState().setShowHiddenMetrics(preferences.showHiddenMetrics);

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
          setInitialState(getDefaultWorkspaceState());
        });
      }

      requestAnimationFrame(() => {
        setIsReady(true);
      });
    })();
  }, [store]);

  return isReady && initialState ? (
    <View3dWorkspace initialState={initialState} />
  ) : (
    <div className="flex min-h-0 flex-1 flex-col" />
  );
}

export const View3dWorkspace = forwardRef<HTMLDivElement, { initialState: WorkspaceState; className?: string }>(
  function View3dWorkspace({ initialState, className }, ref) {
    return (
      <div ref={ref} className={className ?? "flex min-h-0 flex-1 flex-col"}>
        <NodeSelectionProvider>
          <DockviewContainer initialState={initialState} />
        </NodeSelectionProvider>
      </div>
    );
  }
);

function DockviewContainer({ initialState }: { initialState: WorkspaceState; autoSave?: boolean }) {
  const { setDockviewApi } = useNodeSelection();
  const { setDockviewApi: setCrossSectionDockviewApi } = useCrossSectionSelection();
  const { currentBuilding, currentSimulation, optionalLoadOptions } = useAnimationData();
  const store = useViewStoreRaw();
  const hasAppliedInitialStateRef = useRef(false);
  const hasReassertedCriticalStateRef = useRef(false);
  const dockviewApiRef = useRef<DockviewApi | null>(null);
  const previousBuildingRef = useRef<string | null>(initialState.dataSelection?.building ?? null);

  useEffect(() => {
    if (hasAppliedInitialStateRef.current) return;
    hasAppliedInitialStateRef.current = true;
    applyStateToStore(store, initialState);
  }, [store, initialState]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (hasReassertedCriticalStateRef.current) return;
      hasReassertedCriticalStateRef.current = true;
      applyStateToStore(store, initialState);

      if (new URLSearchParams(window.location.search).get("debugState") === "1") {
        console.debug("[restore] reasserted critical state", {
          frameIndex: initialState.frameIndex,
          panelStateKeys: Object.keys(initialState.panelStates ?? {}),
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [store, initialState]);

  const initialLayout = initialState.layout ?? getDefaultWorkspaceState().layout;

  const applyWorkspaceToDockview = useCallback(
    (nextState: WorkspaceState) => {
      applyStateToStore(store, nextState);
      const api = dockviewApiRef.current;
      if (!api) return;

      const nextLayout = nextState.layout ?? getDefaultWorkspaceState().layout;
      if (nextLayout) {
        try {
          api.fromJSON(nextLayout);
        } catch (error) {
          console.warn("Failed to load persisted layout for workspace switch:", error);
        }
      }
    },
    [store]
  );

  const handleDockviewReady = useCallback(
    (event: DockviewReadyEvent) => {
      dockviewApiRef.current = event.api;
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

  useEffect(() => {
    const handleApplyWorkspace = (event: Event) => {
      const customEvent = event as CustomEvent<WorkspaceState>;
      if (!customEvent.detail) return;
      applyWorkspaceToDockview(customEvent.detail);
    };

    window.addEventListener(APPLY_WORKSPACE_STATE_EVENT, handleApplyWorkspace);
    return () => window.removeEventListener(APPLY_WORKSPACE_STATE_EVENT, handleApplyWorkspace);
  }, [applyWorkspaceToDockview]);

  useEffect(() => {
    if (!currentBuilding || !currentSimulation) return;

    const currentSelection: DataSelection = {
      building: currentBuilding.folder,
      simulation: currentSimulation.folder,
      optionalLoads: optionalLoadOptions,
    };

    const previousBuilding = previousBuildingRef.current;
    previousBuildingRef.current = currentBuilding.folder;

    if (!previousBuilding || previousBuilding === currentBuilding.folder) {
      return;
    }

    const nextState = loadFromLocalStorage(currentSelection);
    if (nextState) {
      applyWorkspaceToDockview(nextState);
    }
  }, [applyWorkspaceToDockview, currentBuilding, currentSimulation, optionalLoadOptions]);

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
