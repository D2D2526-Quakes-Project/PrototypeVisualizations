import { BuildingScene } from "@/features/3d/BuildingScene";
import { CanvasWithControls } from "@/features/canvas/CanvasWithControls";
import type { IDockviewPanelProps } from "dockview-react";
import { CanvasPanelProvider } from "../3d/contexts/CanvasContext";
import { SceneTooltip } from "../3d/SceneTooltip";
import { CameraManager } from "../canvas/CameraManager";
import { BoxSelectionOverlay } from "../canvas/components/BoxSelection";
import { OrientationArrows } from "../canvas/components/OrientationArrows";
import { KeyboardZoomHandler } from "../canvas/KeyboardZoomHandler";
import { useExportRenderMode } from "../export/renderMode";
import { SmallPlaybackControls } from "../playback/PlaybackControls";
import type { MagicPanelParams } from "../dockview/MagicPanel";
import { useState } from "react";

export const MainCanvasPanel = (props: IDockviewPanelProps<MagicPanelParams>) => {
  const panelId = props.api.id;
  const exportRenderMode = useExportRenderMode();
  const isActive = props.api.isActive;
  const isPrimary = props.params.isPrimary ?? false;

  const [isHoveringPanel, setIsHoveringPanel] = useState(false);

  return (
    <div
      className="relative h-full w-full"
      onMouseEnter={() => setIsHoveringPanel(true)}
      onMouseLeave={() => setIsHoveringPanel(false)}>
      <SceneTooltip>
        <CanvasPanelProvider panelId={panelId} isHoveringPanel={isHoveringPanel}>
          <KeyboardZoomHandler isActive={isActive} />
          <CanvasWithControls>
            <CameraManager />
            <OrientationArrows />
            <BuildingScene />
          </CanvasWithControls>
          <BoxSelectionOverlay />
          {(isPrimary || exportRenderMode.showTransientUi) && (
            <div className="absolute bottom-2 left-2 z-50">
              <SmallPlaybackControls />
            </div>
          )}
        </CanvasPanelProvider>
      </SceneTooltip>
    </div>
  );
};
