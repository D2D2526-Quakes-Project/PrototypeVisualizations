import { DockviewWrapper } from "@/components/dockviewWrapper";
import { MagicPanel, MagicPanelTab } from "@/components/MagicPanel";
import { NodePanel, NodeTab } from "@/components/NodePanel";
import { SlicePanel } from "@/components/SlicePanel";
import { CameraProvider } from "@/contexts/CameraContext";
import { NodeSelectionProvider, useNodeSelection } from "@/contexts/NodeSelectionContext";
import { useSliceSelection, ThresholdProvider, FloorVisibilityProvider } from "@/contexts/visualization";
import { DockviewApi, type DockviewReadyEvent } from "dockview";
import { useState } from "react";

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
  const [, setDockApi] = useState<DockviewApi | null>(null);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ThresholdProvider>
        <FloorVisibilityProvider>
          <NodeSelectionProvider>
            <CameraProvider>
              <DockviewContainer setDockApi={setDockApi} />
            </CameraProvider>
          </NodeSelectionProvider>
        </FloorVisibilityProvider>
      </ThresholdProvider>
    </div>
  );
}

// Internal wrapper to access the NodeSelectionContext
function DockviewContainer({ setDockApi }: { setDockApi: (api: DockviewApi) => void }) {
  const { setDockviewApi } = useNodeSelection();
  const { setDockviewApi: setSliceDockviewApi } = useSliceSelection();

  const handleDockviewReady = (event: DockviewReadyEvent) => {
    setDockviewApi(event.api);
    setSliceDockviewApi(event.api);
    setDockApi(event.api);
    createDefaultLayout(event.api);
  };

  const createDefaultLayout = (api: DockviewApi) => {
    // Main 3D View
    api.addPanel({
      id: "main-canvas",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "3D View",
      params: { panelType: "Main Canvas" },
    });

    // Timeline at the bottom
    const timelinePanel = api.addPanel({
      id: "timeline",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "Timeline",
      position: { direction: "below" },
      params: { panelType: "Timeline" },
    });

    // Chart to the right of the timeline
    api.addPanel({
      id: "chart",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "Interstory Drift",
      position: { referencePanel: timelinePanel, direction: "right" },
      params: { panelType: "Interstory Drift Chart" },
    });
  };

  return (
    <DockviewWrapper
      components={components}
      tabComponents={tabComponents}
      onReady={handleDockviewReady}
      className="flex-1"
      singleTabMode="fullwidth"
    />
  );
}
