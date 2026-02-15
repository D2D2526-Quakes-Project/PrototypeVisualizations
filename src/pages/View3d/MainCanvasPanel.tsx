import { CanvasWithControls } from "@/components/CanvasWithControls";
import type { IDockviewPanelProps } from "dockview";
import { BuildingScene } from "./BuildingScene";
import { useNodeVisibility } from "@/contexts/visualization";

export const MainCanvasPanel = (_props: IDockviewPanelProps) => {
  const { boxSelection } = useNodeVisibility();
  
  return (
    <div className="relative w-full h-full">
      <CanvasWithControls showPlaybackControls boxSelection={boxSelection}>
        <BuildingScene />
      </CanvasWithControls>
    </div>
  );
};
