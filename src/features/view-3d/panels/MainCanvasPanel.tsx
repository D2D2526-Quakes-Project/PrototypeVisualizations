import { CanvasWithControls } from "@/features/view-3d/components/CanvasWithControls";
import { CameraProvider } from "@/features/view-3d/contexts/CameraContext";
import { BuildingScene } from "@/features/view-3d/scenes/BuildingScene";
import { SceneTooltip } from "@/features/view-3d/components/SceneContextMenu";
import type { IDockviewPanelProps } from "dockview";

export const MainCanvasPanel = (props: IDockviewPanelProps) => {
  const panelId = props.api?.id ?? "main-canvas";

  return (
    <CameraProvider>
      <div className="relative h-full w-full">
        <SceneTooltip>
          <CanvasWithControls showPlaybackControls panelId={panelId}>
            <BuildingScene panelId={panelId} />
          </CanvasWithControls>
        </SceneTooltip>
      </div>
    </CameraProvider>
  );
};
