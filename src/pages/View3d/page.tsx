import { CanvasWithControls } from "@/components/CanvasWithControls";
import { DockviewWrapper } from "@/components/dockviewWrapper";
import { useNodeSelection } from "@/contexts/NodeSelectionContext";
import { PlaybackControls } from "@/components/playback/PlaybackControls";
import { Timeline } from "@/components/Timeline";
import {
  DockviewApi,
  type IDockviewPanelProps,
  type DockviewReadyEvent,
  type IDockviewPanelHeaderProps,
} from "dockview";
import { BuildingScene } from "./BuildingScene";
import { InterstoryDriftChart } from "./InterstoryDriftChart";
import { PlaybackProvider } from "@/components/playback/PlaybackContext";
import { NodeSelectionProvider } from "@/contexts/NodeSelectionContext";
import { NodePanel, NodeTab } from "@/components/NodePanel"; // Import your new panel

// --- Panel Definitions ---

const MainCanvasPanel = (_props: IDockviewPanelProps) => (
  <div className="relative w-full h-full">
    <CanvasWithControls>
      <BuildingScene />
    </CanvasWithControls>
    <div className="absolute bottom-0 left-0 right-0 flex justify-between w-full border-t-2 border-neutral-300 bg-neutral-200/80 backdrop-blur-sm p-2">
      <PlaybackControls />
    </div>
  </div>
);

const TimelinePanel = (props: IDockviewPanelProps) => <Timeline {...props} />;
const ChartPanel = (_props: IDockviewPanelProps) => <InterstoryDriftChart />;

// --- Components Map ---
const components = {
  mainCanvas: MainCanvasPanel,
  timeline: TimelinePanel,
  chart: ChartPanel,
  nodePanel: NodePanel, // Register the node panel
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
      component: "mainCanvas",
      title: "3D View",
    });

    // Timeline at the bottom
    const timelinePanel = api.addPanel({
      id: "timeline",
      component: "timeline",
      title: "Timeline",
      position: { direction: "below" },
    });

    // Chart to the right of the timeline
    api.addPanel({
      id: "chart",
      component: "chart",
      title: "Interstory Drift",
      position: { referencePanel: timelinePanel, direction: "right" },
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
