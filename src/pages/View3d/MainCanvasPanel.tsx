import { CanvasWithControls } from "@/components/CanvasWithControls";
import type { IDockviewPanelProps } from "dockview";
import { BuildingScene } from "./BuildingScene";
import { PlaybackControls } from "@/components/playback/PlaybackControls";

export const MainCanvasPanel = (_props: IDockviewPanelProps) => (
  <div className="relative w-full h-full">
    <CanvasWithControls>
      <BuildingScene />
    </CanvasWithControls>
    <div className="absolute bottom-0 left-0 right-0 flex justify-between w-full border-t-2 border-neutral-300 bg-neutral-200/80 backdrop-blur-sm p-2">
      <PlaybackControls />
    </div>
  </div>
);
