import { CanvasWithControls } from "@/features/canvas/CanvasWithControls";
import { BuildingScene } from "@/features/3d/BuildingScene";
import type { IDockviewPanelProps } from "dockview";
import { CameraProvider } from "../3d/contexts/CanvasContext";
import { SceneTooltip } from "../3d/components/SceneTooltip";
import { OrientationCube } from "../canvas/components/OrientationCube";
import { CameraManager } from "../canvas/CameraManager";
import { BoxSelectionOverlay } from "../canvas/components/BoxSelectionOverlay";
import { SmallPlaybackControls } from "../playback/PlaybackControls";
import { useExportRenderMode } from "../export/renderMode";

export const MainCanvasPanel = (props: IDockviewPanelProps) => {
  const panelId = props.api.id;
  const exportRenderMode = useExportRenderMode();

  return (
    <div className="relative h-full w-full">
      <SceneTooltip>
        <CameraProvider panelId={panelId}>
          <CanvasWithControls>
            <CameraManager />
            <OrientationCube />
            <BuildingScene panelId={panelId} />
          </CanvasWithControls>
          <BoxSelectionOverlay panelId={panelId} />
          {exportRenderMode.showTransientUi && (
            <div className="absolute bottom-2 left-2 z-50">
              <SmallPlaybackControls />
            </div>
          )}
        </CameraProvider>
      </SceneTooltip>
    </div>
  );
};
