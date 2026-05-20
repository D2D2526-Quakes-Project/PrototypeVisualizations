import { useEffect, useLayoutEffect, useRef } from "react";

import { OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";

import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { UNIT_SCALE } from "@/lib/utils";

import type { OrthographicCamera as OrthographicCameraImpl, PerspectiveCamera as PerspectiveCameraImpl } from "three";
import { useCanvasState } from "../3d/contexts/CanvasContext";

export function CameraManager() {
  return (
    <>
      <Cams />
      <CameraControls />
    </>
  );
}

function Cams() {
  const { orbitControlsRef, orthographic, cameraPosition, cameraTarget, cameraZoom } = useCanvasState();
  const fov = 50;

  const persRef = useRef<PerspectiveCameraImpl>(null);
  const orthoRef = useRef<OrthographicCameraImpl>(null);
  const pixelsFromCenterToTop = useThree((state) => state.size.height / 2);

  const prevOrthographic = useRef(orthographic);

  useLayoutEffect(() => {
    const fovFactor = Math.tan(((fov / 2) * Math.PI) / 180) / pixelsFromCenterToTop;
    const persDistanceToOrthoZoom = (distance: number) => 1 / fovFactor / distance;
    const orthoZoomToPersDistance = (zoom: number) => 1 / zoom / fovFactor;
    if (!persRef.current || !orthoRef.current || !persRef.current.position) return;

    if (prevOrthographic.current === orthographic) return;
    prevOrthographic.current = orthographic;

    const savedTarget = orbitControlsRef.current?.target.clone();
    setTimeout(() => {
      if (!persRef.current || !orthoRef.current || !persRef.current.position) return;

      if (!orthographic) {
        persRef.current.position.copy(orthoRef.current.position.clone());
        const distance = orthoZoomToPersDistance(orthoRef.current.zoom);
        persRef.current.position.setLength(distance);
      } else {
        orthoRef.current.position.copy(persRef.current.position.clone());
        orthoRef.current.zoom = persDistanceToOrthoZoom(orthoRef.current.position.length());
        orthoRef.current.updateProjectionMatrix();
      }

      if (savedTarget && orbitControlsRef.current) {
        orbitControlsRef.current.target.copy(savedTarget);
        orbitControlsRef.current.update();
      }
    });
  }, [orthographic, pixelsFromCenterToTop, orbitControlsRef]);

  useEffect(() => {
    const controls = orbitControlsRef.current;
    const perspectiveCamera = persRef.current;
    const orthographicCamera = orthoRef.current;
    if (!controls || !perspectiveCamera || !orthographicCamera) return;

    const activeCamera = orthographic ? orthographicCamera : perspectiveCamera;
    activeCamera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
    controls.target.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);

    if (orthographic && cameraZoom !== undefined) {
      orthographicCamera.zoom = cameraZoom;
      orthographicCamera.updateProjectionMatrix();
    }

    controls.update();
  }, [cameraPosition, cameraTarget, cameraZoom, orthographic, orbitControlsRef]);

  return (
    <>
      <PerspectiveCamera ref={persRef} makeDefault={!orthographic} fov={fov} up={[0, 0, 1]} />
      <OrthographicCamera ref={orthoRef} makeDefault={orthographic} up={[0, 0, 1]} />
    </>
  );
}

function CameraControls() {
  const { orbitControlsRef, setCameraPosition, setCameraTarget, setCameraZoom, spin } = useCanvasState();

  const { animationData } = useAnimationData();
  const cameraDistance = animationData.precomputed.boundingBox.radius * 2.5 * UNIT_SCALE;
  const buildingVerticalCenter =
    (animationData.precomputed.boundingBox.center[2] - animationData.precomputed.boundingBox.min[2]) * UNIT_SCALE;

  useEffect(() => {
    if (!orbitControlsRef?.current) return;
    const controls = orbitControlsRef.current;
    const camera = controls.object;
    controls.target.set(0, 0, buildingVerticalCenter);
    camera.position.set(-cameraDistance, -cameraDistance, buildingVerticalCenter + cameraDistance);
    controls.update();
  }, [buildingVerticalCenter, cameraDistance, orbitControlsRef]);

  useEffect(() => {
    const controls = orbitControlsRef.current;
    if (!controls) return;

    const syncCameraState = () => {
      const camera = controls.object;
      setCameraPosition([camera.position.x, camera.position.y, camera.position.z]);
      setCameraTarget([controls.target.x, controls.target.y, controls.target.z]);
      setCameraZoom("zoom" in camera && typeof camera.zoom === "number" ? camera.zoom : undefined);
    };

    syncCameraState();
    // controls.addEventListener("change", syncCameraState);
    controls.addEventListener("end", syncCameraState);

    return () => {
      // controls.removeEventListener("change", syncCameraState);
      controls.removeEventListener("end", syncCameraState);
    };
  }, [orbitControlsRef, setCameraPosition, setCameraTarget, setCameraZoom]);

  return <OrbitControls ref={orbitControlsRef} enableDamping={false} autoRotate={spin} />;
}
