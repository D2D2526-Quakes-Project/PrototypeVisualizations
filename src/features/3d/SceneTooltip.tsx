import { usePlayback } from "@/features/playback/usePlayback";

import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useMetrics } from "@/features/metrics/useMetrics";
import { formatNumber } from "@/lib/utils";
import * as React from "react";
import { useHover } from "./lib/useHover";

export function SceneTooltip({ children }: { children: React.ReactNode }) {
  const { frameIndex } = usePlayback();
  const { animationData } = useAnimationData();
  const { currentMetricConfig } = useMetrics();
  const { hoveredItem } = useHover();

  const tooltipContent = () => {
    if (!hoveredItem) return null;
    if (!hoveredItem.screenPos) return null;

    if (hoveredItem.type === "node") {
      const nodeId = hoveredItem.nodeId;
      const value = currentMetricConfig.getValue(animationData, frameIndex, nodeId);

      return (
        <div className="flex flex-col gap-1">
          <div className="font-semibold">Node #{nodeId}</div>
          {value !== undefined && (
            <div>{`${currentMetricConfig.label}: ${formatNumber(value, 2)} ${currentMetricConfig.unit.abbr}`}</div>
          )}
          <div className="text-muted-foreground">Click to open panel</div>
        </div>
      );
    }

    if (hoveredItem.type === "crossSection") {
      const crossSectionId = hoveredItem.crossSectionId;
      return (
        <div className="flex flex-col gap-1">
          <div className="font-semibold">Cross Section {crossSectionId}</div>
          <div className="text-muted-foreground">Click to open panel</div>
        </div>
      );
    }

    if (hoveredItem.type === "floor") {
      const storyId = hoveredItem.storyId;
      const storyElevation = animationData.precomputed.storyElevations[storyId];
      return (
        <div className="flex flex-col gap-1">
          <div className="font-semibold">Floor {storyId}</div>
          <div className="text-muted-foreground">Elevation: {formatNumber(storyElevation / 12, 2)} ft</div>
          <div className="text-muted-foreground">Click to open panel</div>
        </div>
      );
    }

    return null;
  };

  const content = tooltipContent();
  const position = hoveredItem?.screenPos ?? null;

  return (
    <div className="relative h-full w-full">
      {children}
      {content && position && (
        <div
          className="bg-popover text-popover-foreground pointer-events-none absolute z-50 rounded-md border px-3 py-1.5 text-xs shadow-md"
          style={{
            left: position.x + 16,
            top: position.y + 16,
          }}>
          {content}
        </div>
      )}
    </div>
  );
}
