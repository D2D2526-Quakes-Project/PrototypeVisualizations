import { CanvasWithControls } from "@/components/CanvasWithControls";
import { CameraProvider } from "@/contexts/CameraContext";
import type { IDockviewPanelProps } from "dockview";
import { BuildingScene } from "./BuildingScene";

export const MainCanvasPanel = (props: IDockviewPanelProps) => {
  const panelId = props.api?.id ?? "main-canvas";
  
  return (
    <CameraProvider>
      <div className="relative w-full h-full">
        <CanvasWithControls showPlaybackControls panelId={panelId}>
          <BuildingScene />
        </CanvasWithControls>
      </div>
    </CameraProvider>
  );
};
