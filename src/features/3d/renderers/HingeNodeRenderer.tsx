import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useNodePositions } from "../contexts/useNodePositions";
import { useFrame } from "@react-three/fiber";
import { useMetrics } from "@/features/metrics/useMetrics";
import { useNodeRendering } from "../contexts/useNodeRendering";
import { UNIT_SCALE } from "@/lib/utils";

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export function HingeNodesRenderer() {
  const { animationData } = useAnimationData();

  const { visibleNodes, getNodeVisualPosition } = useNodePositions();
  const { getNodeColorForCurrentMetric } = useMetrics();
  const { nodeScale, hingeNodeScale, belowThresholdHingeScale } = useNodeRendering();

  const hingeNodesMeshRef = useRef<THREE.InstancedMesh>(null);

  const visibleNodesWithHinges = useMemo(() => {
    if (!animationData.hingeData || !animationData.beamData) return [];
    if (visibleNodes.length === 0) return [];

    const visibleNodeSet = new Set(visibleNodes);
    const visibleNodesWithHinges = [];
    for (let i = 0; i < animationData.hingeData.count; i++) {
      const row = animationData.hingeData.getRow(i);
      const beamIndex = row.beamIndex;

      const beam = animationData.beamData.getRow(beamIndex);
      const iNode = beam.iNodeIndex;
      const jNode = beam.jNodeIndex;

      if (visibleNodeSet.has(iNode) && visibleNodeSet.has(jNode)) {
        const iNodePosFloat = getNodeVisualPosition(iNode, 0);
        const jNodePosFloat = getNodeVisualPosition(jNode, 0);

        const iNodePos = [iNodePosFloat[0], iNodePosFloat[1], iNodePosFloat[2]];
        const jNodePos = [jNodePosFloat[0], jNodePosFloat[1], jNodePosFloat[2]];

        const normal = [jNodePos[0] - iNodePos[0], jNodePos[1] - iNodePos[1], jNodePos[2] - iNodePos[2]];
        const normalLength = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
        normal[0] /= normalLength;
        normal[1] /= normalLength;
        normal[2] /= normalLength;

        if (row.endMask & 0b01) {
          visibleNodesWithHinges.push({ hingeIdx: i, endCap: 1, pos: iNodePos, normal: jNodePos });
        }
        if (row.endMask & 0b10) {
          visibleNodesWithHinges.push({
            hingeIdx: i,
            endCap: 2,
            pos: jNodePos,
            normal: [-normal[0], -normal[1], -normal[2]],
          });
        }
      }
    }

    return visibleNodesWithHinges;
  }, [animationData.hingeData, animationData.beamData, visibleNodes, getNodeVisualPosition]);

  useFrame(() => {
    if (!hingeNodesMeshRef.current) return;

    const geometry = hingeNodesMeshRef.current.geometry;
    const colorAttr = geometry.attributes.color;
    if (!colorAttr) return;

    for (let i = 0; i < visibleNodesWithHinges.length; i += 1) {
      const { hingeIdx, endCap, pos, normal } = visibleNodesWithHinges[i];
      const nudge = Math.max(nodeScale / UNIT_SCALE, hingeNodeScale / UNIT_SCALE / 5);
      const nudgedPos = [pos[0] + normal[0] * nudge, pos[1] + normal[1] * nudge, pos[2] + normal[2] * nudge];

      const { passesThreshold, color } = getNodeColorForCurrentMetric(endCap, hingeIdx);

      const effectiveScale = passesThreshold ? hingeNodeScale : hingeNodeScale * belowThresholdHingeScale;
      tempObject.scale.set(effectiveScale, effectiveScale, effectiveScale);
      tempObject.rotation.set(0, 0, Math.atan2(normal[1], normal[0]) - Math.PI / 2);
      tempObject.position.set(nudgedPos[0], nudgedPos[1], nudgedPos[2]);
      tempObject.updateMatrix();
      hingeNodesMeshRef.current.setMatrixAt(i, tempObject.matrix);

      tempColor.setRGB(color.r, color.g, color.b);
      tempColor.toArray(colorAttr.array, i * 3);
    }
    hingeNodesMeshRef.current.instanceMatrix.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={hingeNodesMeshRef}
      args={[undefined, undefined, visibleNodesWithHinges.length]}
      frustumCulled={false}>
      <coneGeometry args={[16, 30, 4]}>
        <instancedBufferAttribute
          attach="attributes-color"
          args={[new Float32Array(visibleNodesWithHinges.length * 3).fill(1), 3]}
          usage={THREE.DynamicDrawUsage}
        />
      </coneGeometry>
      <meshBasicMaterial fog={false} vertexColors transparent />
    </instancedMesh>
  );
}
