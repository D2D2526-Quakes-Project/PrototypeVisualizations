import { UNIT_SCALE } from "@/lib/utils";
import { useGlobalStore } from "@/state";
import { useMetrics } from "../metrics/useMetrics";
import { useRenderModes } from "./lib/useRenderModes";
import { XCrossSectionSlabsRenderer, YCrossSectionSlabsRenderer } from "./renderers/CrossSectionSlabsRenderer";
import { FloorDirectionLabels } from "./renderers/FloorDirectionLabels";
import { FloorSlabsRenderer } from "./renderers/FloorSlabsRenderer";
import { FloorTickMarks } from "./renderers/FloorTickMarks";
import { HingeNodesRenderer } from "./renderers/HingeNodeRenderer";
import { HorizontalConnectionsRenderer } from "./renderers/HorizontalConnectionsRenderer";
import { NodesRenderer } from "./renderers/NodesRenderer";
import { OpenPanelCrossSectionsRenderer } from "./renderers/OpenPanelCrossSectionsRenderer";
import { OpenPanelFloorsRenderer } from "./renderers/OpenPanelFloorsRenderer";
import { OpenPanelNodesRenderer } from "./renderers/OpenPanelNodesRenderer";
import { VerticalConnectionsRenderer } from "./renderers/VerticalConnectionsRenderer";
import { SceneInvalidators } from "./lib/SceneInvaidators";

export function BuildingScene() {
  const { isCurrentMetricHinge: renderHingeNodes } = useMetrics();
  const {
    renderNodes,
    renderFloorSlabs,
    renderXCrossSectionSlabs,
    renderYCrossSectionSlabs,
    renderVerticalConnections,
    renderHorizontalConnections,
  } = useRenderModes();
  const colorTheme = useGlobalStore((s) => s.colorTheme);

  return (
    <>
      <SceneInvalidators />
      <ambientLight intensity={2} />
      <hemisphereLight intensity={0.5} groundColor="#1a1a1a" position={[0, 0, 100]} />

      <group scale={UNIT_SCALE}>
        {renderFloorSlabs && <FloorSlabsRenderer />}
        {renderXCrossSectionSlabs && <XCrossSectionSlabsRenderer />}
        {renderYCrossSectionSlabs && <YCrossSectionSlabsRenderer />}
        {renderVerticalConnections && <VerticalConnectionsRenderer />}
        {renderHorizontalConnections && <HorizontalConnectionsRenderer />}
        {renderNodes && <NodesRenderer />}
        {renderHingeNodes && <HingeNodesRenderer />}
        <OpenPanelNodesRenderer />
        <OpenPanelFloorsRenderer />
        <OpenPanelCrossSectionsRenderer />
      </group>

      <gridHelper rotation={[Math.PI / 2, 0, 0]} args={[200, 1, colorTheme.grid, colorTheme.grid]} />

      <FloorTickMarks />
      <FloorDirectionLabels />
    </>
  );
}
