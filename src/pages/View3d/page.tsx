import { CanvasWithControls } from "@/components/CanvasWithControls";
import { DockviewWrapper } from "@/components/dockviewWrapper";
import { PlaybackControls } from "@/components/playback/PlaybackControls";
import { Timeline } from "@/components/Timeline";
import {
  getLayoutFromCurrentUrl,
  loadLayoutFromLocalStorage,
  removeLayoutFromUrl,
  saveLayoutToLocalStorage,
} from "@/lib/layoutPersistence";
import { type DockviewApi, type DockviewReadyEvent, type IDockviewPanelProps, type SerializedDockview } from "dockview";
import { useRef, useState } from "react";
import { BuildingScene } from "./BuildingScene";
import { InterstoryDriftChart } from "./InterstoryDriftChart";
import { PlaybackProvider } from "@/components/playback/PlaybackContext";

// Define panel components
const MainCanvasPanel = (props: IDockviewPanelProps) => (
  <div className="relative w-full h-full">
    <CanvasWithControls>
      <BuildingScene />
    </CanvasWithControls>

    <div className="absolute bottom-0 left-0 right-0 flex justify-between w-full border-t-2 border-neutral-300 bg-neutral-200/80 backdrop-blur-sm p-2">
      <PlaybackControls />
      <div className="flex items-center gap-2">
        <label className="flex gap-2 whitespace-nowrap">
          <input
            type="range"
            min="0"
            max={1}
            step={0.0001}
            // value={props.params.scale}
            // onChange={props.params.handleScaleChange}
            className="w-full"
          />
          {/* Scale: {props.params.scale.toFixed(2)} */}
        </label>
        <label className="flex gap-2 whitespace-nowrap">
          <input
            type="range"
            min="0"
            max={20}
            step={0.1}
            // value={props.params.displacementScale}
            // onChange={props.params.handleDisplacementScaleChange}
            className="w-full"
          />
          {/* XZ: {props.params.displacementScale.toFixed(2)} */}
        </label>
      </div>
    </div>
  </div>
);
const TimelinePanle = (props: IDockviewPanelProps) => <Timeline {...props} />;

const ChartPlanel = (props: IDockviewPanelProps) => <InterstoryDriftChart {...props} />;

export function View3d() {
  // /**
  //  * Displacement scales
  //  */
  // const [scale, setScale] = useState(1);
  // const [displacementScale, setDisplacementScale] = useState(1);

  // /**
  //  * Dockview state
  //  */
  // const dockviewApi = useRef<DockviewApi | null>(null);
  // const [currentLayout, setCurrentLayout] = useState<any>(null);

  // function handleScaleChange(e: React.ChangeEvent<HTMLInputElement>) {
  //   setScale(parseFloat(e.target.value));
  // }

  // function handleDisplacementScaleChange(e: React.ChangeEvent<HTMLInputElement>) {
  //   setDisplacementScale(parseFloat(e.target.value));
  // }

  const components = {
    mainCanvas: MainCanvasPanel,
    timeline: TimelinePanle,
    chart: ChartPlanel,
  };

  // const handleDockviewReady = (event: DockviewReadyEvent) => {
  //   const api = event.api;
  //   // dockviewApi.current = api;

  //   // Check for layout in URL first and remove it
  //   const urlLayout = getLayoutFromCurrentUrl();
  //   if (urlLayout) {
  //     removeLayoutFromUrl();
  //     // setCurrentLayout(urlLayout);
  //   }

  //   // Setup layout change listener (will also be handled by DockviewWrapper)
  //   api.onDidLayoutChange(() => {
  //     const layout = api.toJSON();
  //     // setCurrentLayout(layout);
  //   });

  //   createDefaultLayout(api);
  // };

  const createDefaultLayout = (api: DockviewApi) => {
    // Create default layout similar to the original resizable panels
    const mainPanel = api.addPanel({
      id: "main-canvas",
      component: "mainCanvas",
      title: "3D View",
    });

    const timelinePanel = api.addPanel({
      id: "timeline",
      component: "timeline",
      title: "Timeline",
      position: { direction: "below" },
    });

    api.addPanel({
      id: "chart",
      component: "chart",
      title: "Interstory Drift",
      position: { referencePanel: timelinePanel, direction: "right" },
    });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PlaybackProvider>
        <DockviewWrapper
          components={components}
          // onReady={handleDockviewReady}
          // initialLayout={getLayoutFromCurrentUrl() || loadLayoutFromLocalStorage() || undefined}
          // onLayoutChange={(layout: SerializedDockview) => {
          //   // setCurrentLayout(layout);
          //   saveLayoutToLocalStorage(layout);
          // }}
          createDefaultLayout={createDefaultLayout}
          className="flex-1"
        />
      </PlaybackProvider>
    </div>
  );
}
