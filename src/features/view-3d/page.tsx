import { DockviewWrapper } from "@/features/view-3d/components/dockviewWrapper";
import { MagicPanel, MagicPanelHeaderActions, MagicPanelTab } from "@/features/view-3d/components/MagicPanel";
import { NodePanel, NodeTab } from "@/features/view-3d/components/NodePanel";
import { SlicePanel } from "@/features/view-3d/components/SlicePanel";
import { NodeSelectionProvider, useNodeSelection } from "@/features/view-3d/contexts/NodeSelectionContext";
import { useSliceSelection } from "@/features/view-3d/contexts/visualization";
import { useAutoSave } from "@/features/view-3d/hooks/useAutoSave";
import {
  loadFromLocalStorage,
  getStateFromCurrentUrl,
  saveUrlState,
  getDefaultAppState,
  type AppState,
} from "@/features/view-3d/lib/statePersistence";
import type { Metric } from "@/lib/metrics";
import { useViewStoreRaw } from "@/state";
import { type DockviewApi, type DockviewReadyEvent, type SerializedDockview } from "dockview";
import { useCallback, useEffect, useState, useRef } from "react";

const components = {
  nodePanel: NodePanel,
  magicPanel: MagicPanel,
  slicePanel: SlicePanel,
};

const tabComponents = {
  nodeTab: NodeTab,
  magicPanelTab: MagicPanelTab,
};

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
    <div className="flex flex-col flex-1 min-h-0">
      <NodeSelectionProvider>
        {isReady && initialState && <DockviewContainer initialState={initialState} />}
      </NodeSelectionProvider>
    </div>
  );
}

function DockviewContainer({ initialState }: { initialState: AppState }) {
  const { setDockviewApi } = useNodeSelection();
  const { setDockviewApi: setSliceDockviewApi } = useSliceSelection();
  const store = useViewStoreRaw();
  const hasAppliedInitialStateRef = useRef(false);
  const hasReassertedCriticalStateRef = useRef(false);

  useAutoSave();

  useEffect(() => {
    if (hasAppliedInitialStateRef.current) return;
    hasAppliedInitialStateRef.current = true;

    const s = store.getState();
    s.setFrameIndex(initialState.frameIndex);
    s.setColorMetric(initialState.currentMetric);
    s.setThresholdHighlighting(initialState.thresholdHighlighting);

    (Object.entries(initialState.thresholds) as Array<[Metric, number]>).forEach(([key, value]) => {
      s.setThreshold(key, value);
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

    if (initialState.layout) {
      s.setDockviewLayout(initialState.layout);
    }

    s.setPanelStates(initialState.panelStates ?? {});
  }, [store, initialState]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (hasReassertedCriticalStateRef.current) return;
      hasReassertedCriticalStateRef.current = true;

      const s = store.getState();
      s.setFrameIndex(initialState.frameIndex);
      s.setPanelStates({ ...(initialState.panelStates ?? {}) });

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
      setSliceDockviewApi(event.api);
    },
    [setDockviewApi, setSliceDockviewApi],
  );

  const handleLayoutChange = useCallback(
    (layout: SerializedDockview) => {
      store.getState().setDockviewLayout(layout);
    },
    [store],
  );

  const createDefaultLayout = useCallback((api: DockviewApi) => {
    const mainCanvas = api.addPanel({
      id: "main-canvas",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "3D View",
      params: { panelType: "Main Canvas" },
      initialWidth: 1200,
      initialHeight: 760,
    });

    const timelinePanel = api.addPanel({
      id: "timeline",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "Timeline",
      position: { referencePanel: mainCanvas, direction: "below" },
      params: { panelType: "Timeline" },
      initialHeight: 280,
    });

    const interstoryDriftPanel = api.addPanel({
      id: "interstory-drift-chart",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "Interstory Drift",
      position: { referencePanel: timelinePanel, direction: "right" },
      params: { panelType: "Interstory Drift Chart" },
      initialWidth: 560,
    });

    api.addPanel({
      id: "floor-displacement",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "Floor Displacement",
      position: { referencePanel: interstoryDriftPanel },
      params: { panelType: "Floor Displacement" },
      inactive: true,
    });

    api.addPanel({
      id: "story-drift-heatmap",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "Story Drift Heatmap",
      position: { referencePanel: mainCanvas, direction: "right" },
      params: { panelType: "Story Drift Heatmap" },
      initialWidth: 460,
    });

    const reviewPanel = api.addPanel({
      id: "damage-threshold",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "ISD Threshold",
      position: { referencePanel: "story-drift-heatmap", direction: "below" },
      params: { panelType: "Damage Threshold" },
      initialHeight: 260,
    });

    api.addPanel({
      id: "statistics",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "Statistics",
      position: { referencePanel: reviewPanel },
      params: { panelType: "Statistics" },
      inactive: true,
    });

    api.addPanel({
      id: "peak-response-time",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "Peak Response Time",
      position: { referencePanel: reviewPanel },
      params: { panelType: "Peak Response Time" },
      inactive: true,
    });

    api.addPanel({
      id: "hinge-hotspots",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "Hinge Hotspots",
      position: { referencePanel: reviewPanel },
      params: { panelType: "Hinge Hotspots" },
      inactive: true,
    });

    api.addPanel({
      id: "peak-values",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "Peak Values",
      position: { referencePanel: reviewPanel },
      params: { panelType: "Peak Values" },
      inactive: true,
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
