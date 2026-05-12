import { CanvasWithControls } from "@/features/canvas/CanvasWithControls";
import { BuildingScene } from "@/features/3d/BuildingScene";
import type { IDockviewPanelProps } from "dockview";
import { CameraProvider } from "../3d/contexts/CanvasContext";
import { SceneTooltip } from "../3d/SceneTooltip";
import { OrientationCube } from "../canvas/components/OrientationCube";
import { CameraManager } from "../canvas/CameraManager";
import { SmallPlaybackControls } from "../playback/PlaybackControls";
import { useExportRenderMode } from "../export/renderMode";
import { BoxSelectionOverlay } from "../canvas/components/BoxSelection";

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
            <BuildingScene />
          </CanvasWithControls>
          <BoxSelectionOverlay />
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
