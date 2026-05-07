import { CanvasWithControls } from "@/features/canvas/CanvasWithControls";
import { SceneTooltip } from "@/features/3d/components/SceneContextMenu";
import { BuildingScene } from "@/features/3d/scenes/BuildingScene";
import type { IDockviewPanelProps } from "dockview";
import { CameraProvider } from "../3d/contexts/CameraContext";

export const MainCanvasPanel = (props: IDockviewPanelProps) => {
  const panelId = props.api?.id ?? "main-canvas";

  return (
    <div className="relative h-full w-full">
      <SceneTooltip>
        <CameraProvider>
          <CanvasWithControls showPlaybackControls panelId={panelId}>
            <BuildingScene panelId={panelId} />
          </CanvasWithControls>
        </CameraProvider>
      </SceneTooltip>
    </div>
  );
};
