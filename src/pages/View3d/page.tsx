import { DockviewWrapper } from "@/components/dockviewWrapper";
import { MagicPanel, MagicPanelTab } from "@/components/MagicPanel";
import { NodePanel, NodeTab } from "@/components/NodePanel";
import { SlicePanel } from "@/components/SlicePanel";
import { CameraProvider } from "@/contexts/CameraContext";
import { NodeSelectionProvider, useNodeSelection } from "@/contexts/NodeSelectionContext";
import { useSliceSelection, ThresholdProvider, FloorVisibilityProvider } from "@/contexts/visualization";
import {
  getLayoutFromCurrentUrl,
  loadLayoutFromLocalStorage,
  saveLayoutToLocalStorage,
} from "@/lib/layoutPersistence";
import { useViewStoreRaw } from "@/stores";
import { type DockviewApi, type DockviewReadyEvent, type SerializedDockview } from "dockview";
import { useCallback } from "react";

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
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ThresholdProvider>
        <FloorVisibilityProvider>
          <NodeSelectionProvider>
            <CameraProvider>
              <DockviewContainer />
            </CameraProvider>
          </NodeSelectionProvider>
        </FloorVisibilityProvider>
      </ThresholdProvider>
    </div>
  );
}

function DockviewContainer() {
  const { setDockviewApi } = useNodeSelection();
  const { setDockviewApi: setSliceDockviewApi } = useSliceSelection();
  const store = useViewStoreRaw();

  const initialLayout = getLayoutFromCurrentUrl() ?? loadLayoutFromLocalStorage();

  const handleDockviewReady = (event: DockviewReadyEvent) => {
    setDockviewApi(event.api);
    setSliceDockviewApi(event.api);
  };

  const handleLayoutChange = useCallback(
    (layout: SerializedDockview) => {
      store.getState().setDockviewLayout(layout);
      saveLayoutToLocalStorage(layout);
    },
    [store]
  );

  const createDefaultLayout = useCallback((api: DockviewApi) => {
    api.addPanel({
      id: "main-canvas",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "3D View",
      params: { panelType: "Main Canvas" },
    });

    api.addPanel({
      id: "damage-threshold",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "Damage Threshold",
      position: { referencePanel: "main-canvas", direction: "right" },
      params: { panelType: "Damage Threshold" },
    });

    const timelinePanel = api.addPanel({
      id: "timeline",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "Timeline",
      position: { direction: "below" },
      params: { panelType: "Timeline" },
    });

    api.addPanel({
      id: "chart",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "Interstory Drift",
      position: { referencePanel: timelinePanel, direction: "right" },
      params: { panelType: "Interstory Drift Chart" },
    });
  }, []);

  return (
    <DockviewWrapper
      components={components}
      tabComponents={tabComponents}
      onReady={handleDockviewReady}
      onLayoutChange={handleLayoutChange}
      initialLayout={initialLayout ?? undefined}
      createDefaultLayout={createDefaultLayout}
      className="flex-1"
      singleTabMode="fullwidth"
    />
  );
}
