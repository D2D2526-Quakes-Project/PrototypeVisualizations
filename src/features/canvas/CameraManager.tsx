import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";

import { OrthographicCamera as OrthographicCameraImpl, PerspectiveCamera as PerspectiveCameraImpl } from "three";
import { useCanvasState } from "../3d/contexts/CanvasContext";

export function CameraManager() {
  const pendingCameraCommandRef = useRef(false);

  return (
    <>
      <Cams pendingCameraCommandRef={pendingCameraCommandRef} />
      <CameraControls pendingCameraCommandRef={pendingCameraCommandRef} />
    </>
  );
}

function Cams({ pendingCameraCommandRef }: { pendingCameraCommandRef: RefObject<boolean> }) {
  const { orbitControlsRef, orthographic } = useCanvasState();
  const fov = 50;

  const persRef = useRef<PerspectiveCameraImpl>(null);
  const orthoRef = useRef<OrthographicCameraImpl>(null);
  const pixelsFromCenterToTop = useThree((state) => state.size.height / 2);
  const prevOrthographic = useRef(orthographic);

  useLayoutEffect(() => {
    const fovFactor = Math.tan(((fov / 2) * Math.PI) / 180) / pixelsFromCenterToTop;
    const persDistanceToOrthoZoom = (distance: number) => 1 / fovFactor / distance;
    const orthoZoomToPersDistance = (zoom: number) => 1 / zoom / fovFactor;

    if (!persRef.current || !orthoRef.current) return;
    if (prevOrthographic.current === orthographic) return;
    prevOrthographic.current = orthographic;

    const controls = orbitControlsRef.current;
    const savedTarget = controls?.target.clone();

    setTimeout(() => {
      if (!persRef.current || !orthoRef.current) return;

      if (!orthographic) {
        // Switching pers -> ortho was already active, now going back to pers
        const currentZoom = orthoRef.current.zoom;
        const distance = orthoZoomToPersDistance(currentZoom);
        // Copy direction from ortho position, set distance
        const dir = orthoRef.current.position.clone().normalize();
        persRef.current.position.copy(dir.multiplyScalar(distance));
      } else {
        // Switching pers -> ortho
        const livePosition = controls?.object.position;
        if (livePosition) {
          orthoRef.current.position.copy(livePosition);
          const liveDistance = livePosition.length();
          orthoRef.current.zoom = persDistanceToOrthoZoom(liveDistance);
        } else {
          orthoRef.current.position.copy(persRef.current.position);
          orthoRef.current.zoom = persDistanceToOrthoZoom(persRef.current.position.length());
        }
        orthoRef.current.updateProjectionMatrix();
      }

      if (savedTarget && controls) {
        controls.target.copy(savedTarget);
        pendingCameraCommandRef.current = true;
        controls.update();
      }
    });
  }, [orthographic, pixelsFromCenterToTop, orbitControlsRef, pendingCameraCommandRef]);

  const { state: panelState } = useCanvasState();
  const initPos = panelState.cameraPosition;
  const initZoom = panelState.cameraZoom;

  return (
    <>
      <PerspectiveCamera ref={persRef} makeDefault={!orthographic} fov={fov} up={[0, 0, 1]} position={initPos} />
      <OrthographicCamera ref={orthoRef} makeDefault={orthographic} up={[0, 0, 1]} position={initPos} zoom={initZoom} />
    </>
  );
}

function CameraControls({ pendingCameraCommandRef }: { pendingCameraCommandRef: RefObject<boolean> }) {
  const {
    orbitControlsRef,
    setCameraPosition,
    setCameraTarget,
    setCameraZoom,
    spin,
    state: panelState,
    orthographic,
  } = useCanvasState();

  const initialCameraState = useRef({
    position: panelState.cameraPosition,
    target: panelState.cameraTarget,
    zoom: panelState.cameraZoom,
  });

  const settersRef = useRef({ setCameraPosition, setCameraTarget, setCameraZoom });
  useEffect(() => {
    settersRef.current = { setCameraPosition, setCameraTarget, setCameraZoom };
  });

  const initialStateApplied = useRef(false);
  const saveDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    const controls = orbitControlsRef.current;
    if (!controls || initialStateApplied.current) return;

    const camera = controls.object;
    const { position, target, zoom } = initialCameraState.current;

    camera.position.set(position[0], position[1], position[2]);
    controls.target.set(target[0], target[1], target[2]);

    if (camera instanceof OrthographicCameraImpl && zoom !== undefined) {
      camera.zoom = zoom;
    }

    camera.updateProjectionMatrix();
    pendingCameraCommandRef.current = true;
    controls.update();
    initialStateApplied.current = true;
  }, [orthographic, orbitControlsRef, pendingCameraCommandRef]);

  // External command effect: resetView / resetHomeView / focusOnPosition
  useEffect(() => {
    const controls = orbitControlsRef.current;
    if (!controls || !initialStateApplied.current) return;

    const cameraPosition = panelState.cameraPosition;
    const cameraTarget = panelState.cameraTarget;
    const cameraZoom = panelState.cameraZoom;
    const camera = controls.object;

    if (saveDebounceTimer.current) {
      clearTimeout(saveDebounceTimer.current);
      saveDebounceTimer.current = null;
    }

    camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
    controls.target.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);

    if (camera instanceof OrthographicCameraImpl && cameraZoom !== undefined) {
      camera.zoom = cameraZoom;
    }

    camera.updateProjectionMatrix();
    pendingCameraCommandRef.current = true;
    controls.update();
  }, [
    panelState.cameraPosition,
    panelState.cameraTarget,
    panelState.cameraZoom,
    orthographic,
    orbitControlsRef,
    pendingCameraCommandRef,
  ]);

  const handleChange = useCallback(() => {
    if (pendingCameraCommandRef.current) {
      pendingCameraCommandRef.current = false;
      return;
    }

    const controls = orbitControlsRef.current;
    if (!controls) return;

    const camera = controls.object;

    if (saveDebounceTimer.current) clearTimeout(saveDebounceTimer.current);
    saveDebounceTimer.current = setTimeout(() => {
      const position: [number, number, number] = [camera.position.x, camera.position.y, camera.position.z];
      const target: [number, number, number] = [controls.target.x, controls.target.y, controls.target.z];
      let zoom: number | undefined = undefined;

      if (camera instanceof OrthographicCameraImpl) {
        zoom = camera.zoom;
      }

      settersRef.current.setCameraPosition(position);
      settersRef.current.setCameraTarget(target);
      settersRef.current.setCameraZoom(zoom);
    }, 300);
  }, [orbitControlsRef, pendingCameraCommandRef]);

  const initTarget = panelState.cameraTarget;

  return (
    <OrbitControls
      ref={orbitControlsRef}
      enableDamping={false}
      autoRotate={spin}
      onChange={handleChange}
      target={initTarget}
    />
  );
}
