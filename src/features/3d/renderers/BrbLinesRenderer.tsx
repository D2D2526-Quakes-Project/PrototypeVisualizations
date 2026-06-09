import { Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import { Color, Vector3 } from "three";

import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useMetrics } from "@/features/metrics/useMetrics";
import { usePlayback } from "@/features/playback/usePlayback";
import { useNodePositions } from "../contexts/useNodePositions";
import { useHover } from "../lib/useHover";
import { useCanvasState } from "../contexts/CanvasContext";

export function BrbLinesRenderer() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { getNodeVisualPosition, visibleNodes } = useNodePositions();
  const { getNodeValueForCurrentMetric, getValueColorForCurrentMetric } = useMetrics();
  const { setHoveredBrb } = useHover();
  const { panelId } = useCanvasState();

  const brbSegments = useMemo(() => {
    if (!animationData.brbData || !animationData.beamData) return [];

    const visibleNodeSet = new Set(visibleNodes);
    const segments: Array<{
      brbIdx: number;
      points: [Vector3, Vector3];
      color: Color;
    }> = [];

    for (let brbIdx = 0; brbIdx < animationData.brbData.count; brbIdx += 1) {
      const brbRow = animationData.brbData.getRow(brbIdx);
      const beamRow = animationData.beamData.getRow(brbRow.beamIndex);
      if (!visibleNodeSet.has(beamRow.iNodeIndex) || !visibleNodeSet.has(beamRow.jNodeIndex)) continue;

      const iPos = getNodeVisualPosition(beamRow.iNodeIndex, frameIndex);
      const jPos = getNodeVisualPosition(beamRow.jNodeIndex, frameIndex);
      const value = getNodeValueForCurrentMetric(brbIdx, 1);
      const { color } = getValueColorForCurrentMetric(value);

      segments.push({
        brbIdx,
        points: [new Vector3(iPos[0], iPos[1], iPos[2]), new Vector3(jPos[0], jPos[1], jPos[2])],
        color: color,
      });
    }

    return segments;
  }, [
    animationData.brbData,
    animationData.beamData,
    visibleNodes,
    getNodeVisualPosition,
    frameIndex,
    getNodeValueForCurrentMetric,
    getValueColorForCurrentMetric,
  ]);

  if (!animationData.brbData || !animationData.beamData) return null;

  return (
    <>
      {brbSegments.map((segment) => (
        <Line
          key={segment.brbIdx}
          points={segment.points}
          color={segment.color}
          lineWidth={6}
          fog={false}
          onPointerMove={(event: ThreeEvent<PointerEvent>) => {
            event.stopPropagation();
            setHoveredBrb({
              type: "brb",
              brbIdx: segment.brbIdx,
              screenPos: { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY },
              source: panelId,
            });
          }}
          onPointerOut={(event) => {
            event.stopPropagation();
            setHoveredBrb(null);
          }}
        />
      ))}
    </>
  );
}
