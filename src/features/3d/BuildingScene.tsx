import { UNIT_SCALE } from "@/lib/utils";
import { useGlobalStore, useProfileStore } from "@/state";
import { useMemo } from "react";
import { useAnimationData } from "../animation-data/useAnimationData";
import { useMetrics } from "../metrics/useMetrics";
import { FloorDirectionLabels } from "./renderers/FloorDirectionLabels";
import { FloorTickMarks } from "./renderers/FloorTickMarks";
import { HingeNodesRenderer } from "./renderers/HingeNodeRenderer";
import { NodesRenderer } from "./renderers/NodesRenderer";

export function BuildingScene() {
  const { animationData } = useAnimationData();

  const renderNodes = useProfileStore((s) => s.renderNodes);
  const { isCurrentMetricHinge: renderHingeNodes } = useMetrics();
  const renderFloorSlabs = useProfileStore((s) => s.renderFloorSlabs);
  const renderXCrossSectionSlabs = useProfileStore((s) => s.renderXCrossSectionSlabs);
  const renderYCrossSectionSlabs = useProfileStore((s) => s.renderYCrossSectionSlabs);
  const renderVerticalConnections = useProfileStore((s) => s.renderVerticalConnections);
  const renderHorizontalConnections = useProfileStore((s) => s.renderHorizontalConnections);

  const colorTheme = useGlobalStore((s) => s.colorTheme);

  const offsets = useMemo(
    () => ({
      x: -animationData.precomputed.boundingBox.center[0],
      y: -animationData.precomputed.boundingBox.center[1],
      z: -animationData.precomputed.boundingBox.min[2],
    }),
    [animationData.precomputed.boundingBox]
  );

  return (
    <>
      {/* <BoxSelectionHandler   /> */}
      <ambientLight intensity={2} />
      <hemisphereLight intensity={0.5} groundColor="#1a1a1a" position={[0, 0, 100]} />

      <group scale={UNIT_SCALE}>
        <group position={[offsets.x, offsets.y, offsets.z]}>
          {/* {renderFloorSlabs && <FloorSlabsRenderer />} */}
          {/* {renderXCrossSectionSlabs && <XCrossSectionSlabsRenderer />} */}
          {/* {renderYCrossSectionSlabs && <YCrossSectionSlabsRenderer />} */}
          {/* {renderVerticalConnections && <VerticalConnectionsRenderer />} */}
          {/* {renderHorizontalConnections && <HorizontalConnectionsRenderer />} */}
          {renderNodes && <NodesRenderer />}
          {renderHingeNodes && <HingeNodesRenderer />}
        </group>
      </group>

      <gridHelper rotation={[Math.PI / 2, 0, 0]} args={[200, 1, colorTheme.grid, colorTheme.grid]} />

      <FloorTickMarks />
      <FloorDirectionLabels />
    </>
  );
}
