import { CanvasWithControls } from "@/features/canvas/CanvasWithControls";
import { BuildingScene } from "@/features/canvas/BuildingScene";
import type { IDockviewPanelProps } from "dockview";
import { CameraProvider } from "../3d/contexts/CanvasContext";
import { SceneTooltip } from "../3d/components/SceneTooltip";

export const MainCanvasPanel = (props: IDockviewPanelProps) => {
  const panelId = props.api.id;

  return (
    <div className="relative h-full w-full">
      <SceneTooltip>
        <CameraProvider panelId={panelId}>
          <CanvasWithControls showPlaybackControls panelId={panelId}>
            <BuildingScene panelId={panelId} />
          </CanvasWithControls>
        </CameraProvider>
      </SceneTooltip>
    </div>
  );
};
