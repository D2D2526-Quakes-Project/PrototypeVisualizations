import { UNIT_SCALE } from "@/lib/utils";
import { useMetrics } from "../metrics/useMetrics";
import { SceneInvalidators } from "./lib/SceneInvaidators";
import { useRenderModes } from "./lib/useRenderModes";
import { XCrossSectionSlabsRenderer, YCrossSectionSlabsRenderer } from "./renderers/CrossSectionSlabsRenderer";
import { FloorSlabsRenderer } from "./renderers/FloorSlabsRenderer";
import { FloorSliceRangeSliders } from "./renderers/FloorSliceRangeSliders";
import { FloorTickMarks } from "./renderers/FloorTickMarks";
import { HingeNodesRenderer } from "./renderers/HingeNodeRenderer";
import { HorizontalConnectionsRenderer } from "./renderers/HorizontalConnectionsRenderer";
import { NodesRenderer } from "./renderers/NodesRenderer";
import { OpenPanelCrossSectionsRenderer } from "./renderers/OpenPanelCrossSectionsRenderer";
import { OpenPanelFloorsRenderer } from "./renderers/OpenPanelFloorsRenderer";
import { OpenPanelNodesRenderer } from "./renderers/OpenPanelNodesRenderer";
import { VerticalConnectionsRenderer } from "./renderers/VerticalConnectionsRenderer";
import { BrbLinesRenderer } from "./renderers/BrbLinesRenderer";

export function BuildingScene() {
  const { isCurrentMetricHinge: renderHingeNodes, isCurrentMetricBrb: renderBrbLines } = useMetrics();
  const {
    renderNodes,
    renderFloorSlabs,
    renderXCrossSectionSlabs,
    renderYCrossSectionSlabs,
    renderVerticalConnections,
    renderHorizontalConnections,
  } = useRenderModes();

  return (
    <>
      <SceneInvalidators />
      <ambientLight intensity={2} />
      <hemisphereLight intensity={0.5} groundColor="#ffffff" position={[0, 0, 100]} />

      <group scale={UNIT_SCALE}>
        {renderFloorSlabs && <FloorSlabsRenderer />}
        {renderXCrossSectionSlabs && <XCrossSectionSlabsRenderer />}
        {renderYCrossSectionSlabs && <YCrossSectionSlabsRenderer />}
        {renderVerticalConnections && <VerticalConnectionsRenderer />}
        {renderHorizontalConnections && <HorizontalConnectionsRenderer />}
        {renderNodes && <NodesRenderer />}
        {renderHingeNodes && <HingeNodesRenderer />}
        {renderBrbLines && <BrbLinesRenderer />}
        <OpenPanelNodesRenderer />
        <OpenPanelFloorsRenderer />
        <OpenPanelCrossSectionsRenderer />
      </group>

      {/* <gridHelper rotation={[Math.PI / 2, 0, 0]} args={[200, 1, colorTheme.grid, colorTheme.grid]} /> */}

      <FloorTickMarks />
      {/* <FloorDirectionLabels /> */}

      <FloorSliceRangeSliders />
    </>
  );
}
