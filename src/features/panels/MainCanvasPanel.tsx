import { BuildingScene } from "@/features/3d/BuildingScene";
import { CanvasWithControls } from "@/features/canvas/CanvasWithControls";
import type { IDockviewPanelProps } from "dockview-react";
import { useState } from "react";
import { CanvasPanelProvider } from "../3d/contexts/CanvasContext";
import { SceneTooltip } from "../3d/SceneTooltip";
import { CameraManager } from "../canvas/CameraManager";
import { BoxSelectionOverlay } from "../canvas/components/BoxSelection";
import { OrientationArrows } from "../canvas/components/OrientationArrows";
import { KeyboardZoomHandler } from "../canvas/KeyboardZoomHandler";
import type { MagicPanelParams } from "../dockview/MagicPanel";
import { useExportVideo } from "../export/ExportProvider";
import { SmallPlaybackControls } from "../playback/PlaybackControls";
import { ViewSettingsOverlay } from "../canvas/components/ViewSettingsOverlay";
import { CurrentThresholdSlider } from "../canvas/components/CurrentThresholdSlider";
import { CanvasMetricSelector } from "../canvas/components/CanvasMetricSelector";
import { useMetrics } from "@/features/metrics/useMetrics";
import { QuickControls } from "../canvas/components/QuickControls";

export const MainCanvasPanel = (props: IDockviewPanelProps<MagicPanelParams>) => {
  const panelId = props.api.id;
  const exportRenderMode = useExportVideo();
  const isActive = props.api.isActive;
  const isPrimary = props.params.isPrimary ?? false;
  const { isCurrentMetricStatic } = useMetrics();

  const [isHoveringPanel, setIsHoveringPanel] = useState(false);

  return (
    <div
      className="relative h-full w-full"
      onMouseEnter={() => setIsHoveringPanel(true)}
      onMouseLeave={() => setIsHoveringPanel(false)}>
      <SceneTooltip>
        <CanvasPanelProvider panelId={panelId} isHoveringPanel={isHoveringPanel} isPrimaryPanel={isPrimary}>
          <KeyboardZoomHandler isActive={isActive} />
          <CanvasWithControls
            overlays={
              <>
                <div className="pointer-events-none absolute right-1 bottom-1 z-1 flex flex-col items-end gap-1">
                  <ViewSettingsOverlay />
                  {isPrimary && exportRenderMode.showTransientUi && <CurrentThresholdSlider />}
                  {isPrimary && <CanvasMetricSelector />}
                </div>

                {isPrimary && exportRenderMode.showTransientUi && !isCurrentMetricStatic && (
                  <div className="absolute bottom-1 left-1 z-50">
                    <SmallPlaybackControls />
                  </div>
                )}
                {exportRenderMode.showTransientUi && <QuickControls />}
                {exportRenderMode.showTransientUi && <BoxSelectionOverlay />}
              </>
            }>
            <CameraManager />
            <OrientationArrows />
            <BuildingScene />
          </CanvasWithControls>
        </CanvasPanelProvider>
      </SceneTooltip>
    </div>
  );
};
