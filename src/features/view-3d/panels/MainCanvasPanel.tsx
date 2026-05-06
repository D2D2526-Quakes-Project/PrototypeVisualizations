import { CanvasWithControls } from "@/features/view-3d/components/CanvasWithControls";
import { SceneTooltip } from "@/features/view-3d/components/SceneContextMenu";
import { BuildingScene } from "@/features/view-3d/scenes/BuildingScene";
import type { IDockviewPanelProps } from "dockview";

export const MainCanvasPanel = (props: IDockviewPanelProps) => {
  const panelId = props.api?.id ?? "main-canvas";

  return (
    <div className="relative h-full w-full">
      <SceneTooltip>
        <CanvasWithControls showPlaybackControls panelId={panelId}>
          <BuildingScene panelId={panelId} />
        </CanvasWithControls>
      </SceneTooltip>
    </div>
  );
};
