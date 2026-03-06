import { useEffect, useMemo, useRef } from "react";

import { OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";

import { useCamera } from "@/features/view-3d/contexts/CameraContext";
import { useAnimationData } from "@/lib/useAnimationData";
import { UNIT_SCALE } from "@/lib/utils";

import type { OrthographicCamera as OrthographicCameraImpl, PerspectiveCamera as PerspectiveCameraImpl } from "three";

interface CameraManagerProps {
  isOrthographic: boolean;
  enableSmoothing: boolean;
  enablePan: boolean;
}

export function CameraManager({ isOrthographic, enableSmoothing, enablePan }: CameraManagerProps) {
  const { orbitControlsRef } = useCamera();
  const perspectiveCamRef = useRef<PerspectiveCameraImpl>(null);
  const orthoCamRef = useRef<OrthographicCameraImpl>(null);
  const { animationData } = useAnimationData();

  const buildingVerticalCenter =
    (animationData.precomputed.boundingBox.center[2] - animationData.precomputed.boundingBox.min[2]) * UNIT_SCALE;
  const cameraDistance = animationData.precomputed.boundingBox.radius * UNIT_SCALE;
  const previousIsOrthographicRef = useRef(isOrthographic);

  const stableTarget = useMemo(() => new Vector3(0, 0, buildingVerticalCenter), [buildingVerticalCenter]);

  useEffect(() => {
    const controls = orbitControlsRef.current;
    if (controls) {
      controls.enablePan = enablePan;
    }
  }, [enablePan, orbitControlsRef]);

  useEffect(() => {
    const perspective = perspectiveCamRef.current;
    const ortho = orthoCamRef.current;
    const controls = orbitControlsRef.current;

    if (!perspective || !ortho || !controls) return;
    const wasOrthographic = previousIsOrthographicRef.current;
    previousIsOrthographicRef.current = isOrthographic;
    if (wasOrthographic === isOrthographic) return;

    const savedTarget = controls.target.clone();

    if (isOrthographic) {
      const distanceToTarget = Math.max(controls.object.position.distanceTo(savedTarget), 1e-6);
      ortho.position.copy(perspective.position);
      ortho.zoom = (cameraDistance / distanceToTarget) * 8;
      ortho.updateProjectionMatrix();
    } else {
      perspective.position.copy(ortho.position);
    }

    controls.target.copy(savedTarget);
    controls.update();
  }, [isOrthographic, cameraDistance, orbitControlsRef]);

  useFrame(() => {
    const controls = orbitControlsRef.current;
    if (controls) {
      stableTarget.copy(controls.target);
    }
  });

  return (
    <>
      <PerspectiveCamera
        ref={perspectiveCamRef}
        makeDefault={!isOrthographic}
        position={[-cameraDistance, -cameraDistance, buildingVerticalCenter + cameraDistance]}
        fov={75}
        up={[0, 0, 1]}
      />
      <OrthographicCamera
        ref={orthoCamRef}
        makeDefault={isOrthographic}
        position={[-cameraDistance, -cameraDistance, buildingVerticalCenter + cameraDistance]}
        zoom={50}
        up={[0, 0, 1]}
      />
      <OrbitControls ref={orbitControlsRef} enableDamping={enableSmoothing} target={stableTarget} />
    </>
  );
}
