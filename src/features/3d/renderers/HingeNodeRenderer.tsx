export function HingeNodesRenderer() {
  return (
    <instancedMesh
      key={`hinge-nodes-${interactiveSceneKey}`}
      ref={hingeNodesMeshRef}
      args={[undefined, undefined, hingeNodeGeometry.count]}
      frustumCulled={false}>
      <coneGeometry args={[16, 30, 4]}>
        <instancedBufferAttribute
          attach="attributes-color"
          args={[new Float32Array(hingeNodeGeometry.count * 3).fill(1), 3]}
          usage={THREE.DynamicDrawUsage}
        />
      </coneGeometry>
      <meshBasicMaterial fog={false} vertexColors transparent />
    </instancedMesh>
  );
}
