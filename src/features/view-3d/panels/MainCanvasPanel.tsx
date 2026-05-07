import { CanvasWithControls } from "@/features/view-3d/components/CanvasWithControls";
import { SceneTooltip } from "@/features/view-3d/components/SceneContextMenu";
import { BuildingScene } from "@/features/view-3d/scenes/BuildingScene";
import type { IDockviewPanelProps } from "dockview";
import { CameraProvider } from "../contexts/CameraContext";

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
