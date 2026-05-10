import { NodeSelectionProvider } from "@/features/3d/contexts/NodeSelectionContext";
import { DockviewWrapper } from "@/features/dockview/dockviewWrapper";
import {
  MagicPanel,
  MagicPanelHeaderActions,
  MagicPanelTab,
  type MagicPanelParams,
} from "@/features/dockview/MagicPanel";
// import { CrossSectionPanel, CrossSectionTab } from "@/features/panels/CrossSectionPanel";
// import { FloorPanel, FloorTab } from "@/features/panels/FloorPanel";
// import { NodePanel, NodeTab } from "@/features/panels/NodePanel";
import { debounce } from "@/lib/utils";
import { useProfileStore } from "@/state";
import { type DockviewApi, type SerializedDockview } from "dockview";
import { useCallback, useMemo } from "react";

const components = {
  // nodePanel: NodePanel,
  magicPanel: MagicPanel,
  // floorPanel: FloorPanel,
  // crossSectionPanel: CrossSectionPanel,
};

const tabComponents = {
  // nodeTab: NodeTab,
  // floorTab: FloorTab,
  magicPanelTab: MagicPanelTab,
  // crossSectionTab: CrossSectionTab,
};

// function sanitizePanelStates(initialPanelStates: WorkspaceState["panelStates"]): Record<string, SavedPanelState> {
//   return Object.fromEntries(
//     Object.entries(initialPanelStates ?? {}).filter((entry): entry is [string, SavedPanelState] => Boolean(entry[1]))
//   ) as Record<string, SavedPanelState>;
// }

// function applyStateToStore(store: ReturnType<typeof useViewStoreRaw>, stateToApply: WorkspaceState) {
//   const state = store.getState();
//   state.setFrameIndex(stateToApply.frameIndex);
//   state.setColorMetric(stateToApply.currentMetric);
//   (Object.keys(state.metricPaletteOverrides) as Metric[]).forEach((metric) => {
//     if (!(metric in (stateToApply.metricPaletteOverrides ?? {}))) {
//       state.setMetricPalette(metric, null);
//     }
//   });
//   (Object.entries(stateToApply.metricPaletteOverrides ?? {}) as Array<[Metric, MetricPaletteKey]>).forEach(
//     ([metric, palette]) => {
//       state.setMetricPalette(metric, palette);
//     }
//   );
//   state.setThresholdHighlighting(stateToApply.thresholdHighlighting);

//   (Object.entries(stateToApply.thresholds) as Array<[ThresholdKey, number]>).forEach(([key, value]) => {
//     if (key in THRESHOLD_CONFIGS) {
//       state.setThreshold(key, value);
//     }
//   });

//   state.setVisibleFloors(stateToApply.visibleFloors);
//   state.clearSelection();
//   state.setSelectedNodes(stateToApply.selectedNodeIds);
//   state.setHiddenNodeIds(stateToApply.hiddenNodeIds ?? []);
//   state.setHideSelectedNodes(stateToApply.hideSelectedNodes ?? false);
//   state.setColorTheme(stateToApply.colorTheme);
//   state.setRenderNodes(stateToApply.renderNodes);
//   state.setRenderFloorSlabs(stateToApply.renderFloorSlabs);
//   state.setRenderXCrossSectionSlabs(stateToApply.renderXCrossSectionSlabs);
//   state.setRenderYCrossSectionSlabs(stateToApply.renderYCrossSectionSlabs);
//   state.setShowCornersOnly(stateToApply.showCornersOnly);
//   state.setVisualInterpolationEnabled(stateToApply.visualInterpolationEnabled);
//   state.setRenderVerticalConnections(stateToApply.renderVerticalConnections);
//   state.setRenderHorizontalConnections(stateToApply.renderHorizontalConnections);
//   if (stateToApply.layout) {
//     state.setDockviewLayout(stateToApply.layout);
//   }
//   state.setPanelStates(sanitizePanelStates(stateToApply.panelStates));
// }

export function App() {
  return (
    <div className={"flex min-h-0 flex-1 flex-col"}>
      <NodeSelectionProvider>
        <DockviewContainer />
      </NodeSelectionProvider>
    </div>
  );
}

function DockviewContainer() {
  const profileId = useProfileStore((state) => state.profileId);
  const dockviewLayout = useProfileStore((state) => state.dockviewLayout);
  const setDockviewLayout = useProfileStore((state) => state.setDockviewLayout);

  const debouncedSave = useMemo(
    () => debounce((layout: SerializedDockview) => setDockviewLayout(layout), 1000),
    [setDockviewLayout]
  );

  const handleLayoutChange = useCallback(
    (layout: SerializedDockview) => {
      debouncedSave(layout);
    },
    [debouncedSave]
  );

  const createDefaultLayout = useCallback((api: DockviewApi) => {
    // const mainCanvas = api.addPanel<MagicPanelParams>({
    //   id: "main-canvas",
    //   component: "magicPanel",
    //   tabComponent: "magicPanelTab",
    //   params: { panelType: "Main Canvas" },
    //   initialHeight: 760,
    // });

    api.addPanel<MagicPanelParams>({
      id: "timeline",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      // position: { referencePanel: mainCanvas, direction: "below" },
      params: { panelType: "Timeline" },
      initialHeight: 200,
    });

    // const interstoryDriftPanel = api.addPanel<MagicPanelParams>({
    //   id: "corner-metric-chart",
    //   component: "magicPanel",
    //   tabComponent: "magicPanelTab",
    //   position: { referencePanel: mainCanvas, direction: "right" },
    //   params: { panelType: "Corner Metric Chart" },
    //   initialWidth: 560,
    // });

    // api.addPanel<MagicPanelParams>({
    //   id: "floor-displacement",
    //   component: "magicPanel",
    //   tabComponent: "magicPanelTab",
    //   position: { referencePanel: interstoryDriftPanel, direction: "within" },
    //   params: { panelType: "Floor Average Metric" },
    // });
  }, []);

  return (
    <DockviewWrapper
      key={profileId}
      components={components}
      tabComponents={tabComponents}
      rightHeaderActionsComponent={MagicPanelHeaderActions}
      onLayoutChange={handleLayoutChange}
      initialLayout={dockviewLayout ?? undefined}
      createDefaultLayout={createDefaultLayout}
      className="flex-1"
      singleTabMode="fullwidth"
    />
  );
}
