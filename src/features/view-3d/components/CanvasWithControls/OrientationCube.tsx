import { GizmoHelper, GizmoViewcube } from "@react-three/drei";
import { Vector3 } from "three";

import { useCamera } from "@/features/view-3d/contexts/CameraContext";

const ORIENTATION_CUBE_FACES = ["+X", "-X", "+Z", "-Z", "+Y", "-Y"];
const DEFAULT_CAMERA_TARGET = new Vector3(0, 0, 0);

export function OrientationCube() {
  const { orbitControlsRef } = useCamera();

  return (
    <GizmoHelper
      alignment="top-left"
      margin={[64, 56]}
      onTarget={() => orbitControlsRef.current?.target.clone() ?? DEFAULT_CAMERA_TARGET}
      onUpdate={() => orbitControlsRef.current?.update()}>
      <GizmoViewcube
        faces={ORIENTATION_CUBE_FACES}
        color="#f5f3ee"
        hoverColor="#d7c8a4"
        strokeColor="#6d5f45"
        textColor="#2f2618"
      />
    </GizmoHelper>
  );
}
