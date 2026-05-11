import { Point, PointMaterial, Points } from "@react-three/drei";

export function SelectedNodesRenderer() {
  return (
    <Points frustumCulled={false}>
      <PointMaterial
        transparent
        vertexColors
        size={8}
        sizeAttenuation={true}
        depthTest={true}
        depthWrite={true}
        opacity={1}
      />
      {selectedNodesData.map(({ nodeId, position, color }) => (
        <Point key={nodeId} position={position} color={color}></Point>
      ))}
    </Points>
  );
}
