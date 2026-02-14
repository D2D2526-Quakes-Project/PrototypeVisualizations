import { CanvasWithControls } from "@/components/CanvasWithControls";
import type { IDockviewPanelProps } from "dockview";
import { BuildingScene } from "./BuildingScene";

export const MainCanvasPanel = (_props: IDockviewPanelProps) => (
  <div className="relative w-full h-full">
    <CanvasWithControls showPlaybackControls>
      <BuildingScene />
    </CanvasWithControls>
  </div>
);
