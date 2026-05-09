import { usePlayback } from "@/features/playback/usePlayback";
import { formatValue, getMetricConfig } from "@/lib/metrics";
import { useAnimationData } from "@/lib/animation-data/useAnimationData";

import * as React from "react";
import { useColor } from "../contexts/visualization/ColorContext";

export function SceneTooltip({ children }: { children: React.ReactNode }) {
  const { frameIndex } = usePlayback();
  const { animationData } = useAnimationData();
  const { currentMetric } = useColor();
  // const { hoveredCrossSection } = useCrossSectionSelection();
  // const hoveredNodeId = useViewStore((s) => s.hoveredNodeId);
  // const hoveredNodeScreenPos = useViewStore((s) => s.hoveredNodeScreenPos);

  // const renderContent = () => {
  //   const metricConfig = getMetricConfig(currentMetric);

  //   if (hoveredNodeId !== null) {
  //     const value = metricConfig.getValue(animationData, frameIndex, hoveredNodeId);

  //     return (
  //       <div className="flex flex-col gap-1">
  //         <div className="font-semibold">Node #{hoveredNodeId}</div>
  //         {value !== undefined && (
  //           <div>{`${metricConfig.label}: ${formatValue(value, 2)} ${metricConfig.unit.abbr}`}</div>
  //         )}
  //         <div className="text-muted-foreground">Click to open panel</div>
  //       </div>
  //     );
  //   }

  //   if (hoveredCrossSection && hoveredCrossSection.storyId) {
  //     return (
  //       <div className="flex flex-col gap-1">
  //         <div className="font-semibold">Floor {hoveredCrossSection.storyId}</div>
  //         <div className="text-muted-foreground">Click to open panel</div>
  //       </div>
  //     );
  //   }

  //   return null;
  // };

  // const content = renderContent();
  // const isOpen = content !== null;

  // const position = hoveredNodeScreenPos ?? hoveredCrossSection?.screenPos ?? null;

  // return (
  //   <div className="relative h-full w-full">
  //     {children}
  //     {isOpen && position && (
  //       <div
  //         className="bg-popover text-popover-foreground pointer-events-none absolute z-50 rounded-md border px-3 py-1.5 text-xs shadow-md"
  //         style={{
  //           left: position.x + 16,
  //           top: position.y + 16,
  //         }}>
  //         {content}
  //       </div>
  //     )}
  //   </div>
  // );
  return null;
}
