import { DockviewWrapper } from "@/components/dockviewWrapper";
import { MagicPanel, MagicPanelTab } from "@/components/MagicPanel";
import { NodePanel, NodeTab } from "@/components/NodePanel"; // Import your new panel
import { PlaybackProvider } from "@/components/playback/PlaybackContext";
import { NodeSelectionProvider, useNodeSelection } from "@/contexts/NodeSelectionContext";
import { DockviewApi, type DockviewReadyEvent, type IDockviewPanelHeaderProps } from "dockview";

// --- Components Map ---
const components = {
  nodePanel: NodePanel, // Register the node panel
  magicPanel: MagicPanel,
};

const tabComponents = {
  default: (props: IDockviewPanelHeaderProps<{ title: string }>) => {
    return (
      <div className="my-custom-tab">
        <span>{props.params.title}</span>
        <span style={{ flexGrow: 1 }} />

        <span className="my-custom-tab-icon material-symbols-outlined">minimize</span>
        <span className="my-custom-tab-icon material-symbols-outlined">maximize</span>
        <span className="my-custom-tab-icon material-symbols-outlined">close</span>
      </div>
    );
  },
  nodeTab: NodeTab,
  magicPanelTab: MagicPanelTab,
};

export function View3d() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PlaybackProvider>
        <NodeSelectionProvider>
          <DockviewContainer />
        </NodeSelectionProvider>
      </PlaybackProvider>
    </div>
  );
}

// Internal wrapper to access the NodeSelectionContext
function DockviewContainer() {
  const { setDockviewApi } = useNodeSelection();

  const handleDockviewReady = (event: DockviewReadyEvent) => {
    // 1. Give the API to our context so the 3D scene can use it
    setDockviewApi(event.api);

    // 2. Create the default layout
    createDefaultLayout(event.api);
  };

  const createDefaultLayout = (api: DockviewApi) => {
    // Main 3D View
    api.addPanel({
      id: "main-canvas",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "3D View",
      params: { panelType: "MainCanvas" },
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
      title: "Interstory Drift",
      position: { referencePanel: timelinePanel, direction: "right" },
      params: { panelType: "InterstoryDriftChart" },
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
