import { BuildingScene } from "@/features/3d/BuildingScene";
import { CanvasWithControls } from "@/features/canvas/CanvasWithControls";
import type { IDockviewPanelProps } from "dockview-react";
import { CameraProvider } from "../3d/contexts/CanvasContext";
import { SceneTooltip } from "../3d/SceneTooltip";
import { CameraManager } from "../canvas/CameraManager";
import { BoxSelectionOverlay } from "../canvas/components/BoxSelection";
import { OrientationArrows } from "../canvas/components/OrientationArrows";
import { KeyboardZoomHandler } from "../canvas/KeyboardZoomHandler";
import { useExportRenderMode } from "../export/renderMode";
import { SmallPlaybackControls } from "../playback/PlaybackControls";

export const MainCanvasPanel = (props: IDockviewPanelProps) => {
  const panelId = props.api.id;
  const exportRenderMode = useExportRenderMode();
  const isActive = props.api.isActive;

  return (
    <div className="relative h-full w-full">
      <SceneTooltip>
        <CameraProvider panelId={panelId}>
          <KeyboardZoomHandler isActive={isActive} />
          <CanvasWithControls>
            <CameraManager />
            <OrientationArrows />
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
