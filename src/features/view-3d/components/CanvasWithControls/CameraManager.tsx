import { useLayoutEffect, useRef } from "react";

import { OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";

import { useViewStore } from "@/state";
import type { OrthographicCamera as OrthographicCameraImpl, PerspectiveCamera as PerspectiveCameraImpl } from "three";
import { useCamera } from "../../contexts/CameraContext";

export function CameraManager() {
  return (
    <>
      <Cams />
      <CameraControls />
    </>
  );
}

function Cams() {
  const { orbitControlsRef } = useCamera();
  const orthographic = useViewStore((s) => s.orthographic);
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

  return (
    <>
      <PerspectiveCamera ref={persRef} makeDefault={!orthographic} fov={fov} up={[0, 0, 1]} />
      <OrthographicCamera ref={orthoRef} makeDefault={orthographic} up={[0, 0, 1]} />
    </>
  );
}

function CameraControls() {
  const { orbitControlsRef } = useCamera();
  const autoRotate = useViewStore((s) => s.autoRotate);
  // const camera = useThree((state) => state.camera)
  // const gl = useThree((state) => state.gl)

  return <OrbitControls ref={orbitControlsRef} enableDamping={false} autoRotate={autoRotate} />;
}
