import { UNIT_SCALE } from "@/lib/utils";
import { useGlobalStore, useProfileStore } from "@/state";
import { useMetrics } from "../metrics/useMetrics";
import { FloorDirectionLabels } from "./renderers/FloorDirectionLabels";
import { FloorTickMarks } from "./renderers/FloorTickMarks";
import { HingeNodesRenderer } from "./renderers/HingeNodeRenderer";
import { NodesRenderer } from "./renderers/NodesRenderer";
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { FloorSlabsRenderer } from "./renderers/FloorSlabsRenderer";

export function BuildingScene() {
  const { invalidate } = useThree();

  const renderNodes = useProfileStore((s) => s.renderNodes);
  const { isCurrentMetricHinge: renderHingeNodes } = useMetrics();
  const renderFloorSlabs = useProfileStore((s) => s.renderFloorSlabs);
  const renderXCrossSectionSlabs = useProfileStore((s) => s.renderXCrossSectionSlabs);
  const renderYCrossSectionSlabs = useProfileStore((s) => s.renderYCrossSectionSlabs);
  const renderVerticalConnections = useProfileStore((s) => s.renderVerticalConnections);
  const renderHorizontalConnections = useProfileStore((s) => s.renderHorizontalConnections);

  useEffect(() => {
    invalidate();
  }, [
    invalidate,
    renderNodes,
    renderHingeNodes,
    renderFloorSlabs,
    renderXCrossSectionSlabs,
    renderYCrossSectionSlabs,
    renderVerticalConnections,
    renderHorizontalConnections,
  ]);

  const colorTheme = useGlobalStore((s) => s.colorTheme);

  return (
    <>
      {/* <BoxSelectionHandler   /> */}
      <ambientLight intensity={2} />
      <hemisphereLight intensity={0.5} groundColor="#1a1a1a" position={[0, 0, 100]} />

      <group scale={UNIT_SCALE}>
        {renderFloorSlabs && <FloorSlabsRenderer />}
        {/* {renderXCrossSectionSlabs && <XCrossSectionSlabsRenderer />} */}
        {/* {renderYCrossSectionSlabs && <YCrossSectionSlabsRenderer />} */}
        {/* {renderVerticalConnections && <VerticalConnectionsRenderer />} */}
        {/* {renderHorizontalConnections && <HorizontalConnectionsRenderer />} */}
        {renderNodes && <NodesRenderer />}
        {renderHingeNodes && <HingeNodesRenderer />}
      </group>

      <gridHelper rotation={[Math.PI / 2, 0, 0]} args={[200, 1, colorTheme.grid, colorTheme.grid]} />

      <FloorTickMarks />
      <FloorDirectionLabels />
    </>
  );
}
