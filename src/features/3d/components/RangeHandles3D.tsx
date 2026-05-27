import { getResizeCursor } from "@/lib/utils";
import { invalidate, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useCanvasState } from "../contexts/CanvasContext";

export function RangeHandles3D({
  min = 0,
  max = 100,
  value = [20, 80],
  onChange,
  width = 10,
  scale = 5,
  handleOffset = 0,
  handleColor = "#ffffff",
  borderColor = "#ccc",
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: {
  min?: number;
  max?: number;
  value?: [number, number];
  onChange?: (value: [number, number]) => void;
  width?: number;
  scale?: number;
  handleOffset?: number;
  activeColor?: string;
  handleColor?: string;
  borderColor?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const { camera } = useThree();
  const { orbitControlsRef } = useCanvasState();

  const rootRef = useRef<THREE.Group>(null);
  const sliderGroupRef = useRef<THREE.Group>(null);
  const lowHandleRef = useRef<THREE.Mesh>(null);
  const highHandleRef = useRef<THREE.Mesh>(null);

  const localValue = useRef(value);
  const [dragState, setDragState] = useState<null | {
    type: "low" | "high";
    pointerId: number;
    offset: number;
  }>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (orbitControlsRef.current) orbitControlsRef.current.enabled = !dragState;
  }, [dragState, orbitControlsRef]);

  useEffect(() => {
    if (!dragState) localValue.current = value;
  }, [value, dragState]);

  useEffect(() => {
    if (dragState) document.body.style.cursor = "grabbing";
    else if (hovered) document.body.style.cursor = "pointer";
    else document.body.style.cursor = "auto";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered, dragState]);

  useEffect(() => {
    invalidate();
  }, [value]);

  const valToX = (val: number) => ((val - min) / (max - min)) * width - width / 2;
  const xToVal = (x: number) => {
    const clampedX = Math.max(-width / 2, Math.min(width / 2, x));
    return ((clampedX + width / 2) / width) * (max - min) + min;
  };

  const mathPlane = useMemo(() => new THREE.Plane(), []);
  const intersectionPoint = useMemo(() => new THREE.Vector3(), []);

  const activeTrackRadius = 0.16;
  const handleRadius = 0.4;

  const getScreenAngle = useCallback(() => {
    if (!sliderGroupRef.current) return 0;
    const worldStart = sliderGroupRef.current.localToWorld(new THREE.Vector3(-1, 0, 0));
    const worldEnd = sliderGroupRef.current.localToWorld(new THREE.Vector3(1, 0, 0));

    const startNDC = worldStart.clone().project(camera);
    const endNDC = worldEnd.clone().project(camera);

    const dx = endNDC.x - startNDC.x;
    const dy = endNDC.y - startNDC.y;

    return Math.atan2(dy, dx);
  }, [sliderGroupRef, camera]);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = getResizeCursor(getScreenAngle());
    return () => void (document.body.style.cursor = "auto");
  }, [hovered, getScreenAngle]);

  useFrame(({ camera, raycaster, pointer }) => {
    if (!rootRef.current || !sliderGroupRef.current) return;

    // if (camera instanceof PerspectiveCameraImpl) {
    //   const dist = camera.position.distanceTo(rootRef.current.position);
    //   rootRef.current.scale.setScalar(dist * sizeFactor);
    // } else if (camera instanceof OrthographicCameraImpl) {
    //   rootRef.current.scale.setScalar(sizeFactor / camera.zoom);
    // }

    const lowX = valToX(localValue.current[0]);
    const highX = valToX(localValue.current[1]);

    const localCamPos = sliderGroupRef.current.worldToLocal(camera.position.clone());
    const outwardDir = new THREE.Vector3(0, localCamPos.y, localCamPos.z);

    if (outwardDir.lengthSq() < 0.001) outwardDir.set(0, 1, 0);
    else outwardDir.normalize();

    const handleOffsetDist = activeTrackRadius + 0.02;

    const screenAngle = getScreenAngle();

    if (lowHandleRef.current) {
      lowHandleRef.current.position.set(
        lowX - handleOffset,
        outwardDir.y * handleOffsetDist,
        outwardDir.z * handleOffsetDist
      );
      const parentWorldQuat = new THREE.Quaternion();
      sliderGroupRef.current.getWorldQuaternion(parentWorldQuat);

      lowHandleRef.current.quaternion.copy(parentWorldQuat.invert()).multiply(camera.quaternion);

      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);

      const localForward = new THREE.Vector3()
        .copy(forward)
        .transformDirection(sliderGroupRef.current.matrixWorld.clone().invert());

      lowHandleRef.current.position.addScaledVector(localForward, 0.1);
      lowHandleRef.current.rotation.z = screenAngle;
    }
    if (highHandleRef.current) {
      highHandleRef.current.position.set(
        highX + handleOffset,
        outwardDir.y * handleOffsetDist,
        outwardDir.z * handleOffsetDist
      );
      const parentWorldQuat = new THREE.Quaternion();
      sliderGroupRef.current.getWorldQuaternion(parentWorldQuat);

      highHandleRef.current.quaternion.copy(parentWorldQuat.invert()).multiply(camera.quaternion);

      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);

      const localForward = new THREE.Vector3()
        .copy(forward)
        .transformDirection(sliderGroupRef.current.matrixWorld.clone().invert());

      highHandleRef.current.position.addScaledVector(localForward, 0.1);
      highHandleRef.current.rotation.z = screenAngle;
    }

    if (dragState) {
      const sliderMatrix = sliderGroupRef.current.matrixWorld;
      const sliderPos = new THREE.Vector3();
      sliderGroupRef.current.getWorldPosition(sliderPos);

      const trackDir = new THREE.Vector3(1, 0, 0).transformDirection(sliderMatrix).normalize();
      const camDir = new THREE.Vector3().subVectors(camera.position, sliderPos).normalize();

      const cross1 = new THREE.Vector3().crossVectors(trackDir, camDir);
      const planeNormal = new THREE.Vector3().crossVectors(cross1, trackDir).normalize();

      if (planeNormal.lengthSq() < 0.001) {
        planeNormal.copy(camera.getWorldDirection(new THREE.Vector3()).negate());
      }

      mathPlane.setFromNormalAndCoplanarPoint(planeNormal, sliderPos);
      raycaster.setFromCamera(pointer, camera);
      raycaster.ray.intersectPlane(mathPlane, intersectionPoint);

      if (intersectionPoint) {
        const localPoint = sliderGroupRef.current.worldToLocal(intersectionPoint.clone());
        const newVal = xToVal(localPoint.x) + (dragState.offset || 0);

        const newArray: [number, number] = [...localValue.current];
        if (dragState.type === "low") {
          newArray[0] = Math.min(newVal, localValue.current[1]);
        } else {
          newArray[1] = Math.max(newVal, localValue.current[0]);
        }

        localValue.current = newArray;
        if (onChange) onChange(newArray);
      }
    }
  });

  type PointerCapturer = {
    hasPointerCapture: (pointerId: number) => boolean;
    setPointerCapture: (pointerId: number) => void;
    releasePointerCapture: (pointerId: number) => void;
  };

  const handlePointerDown = (type: "low" | "high") => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!e.target) return;
    const target = e.target as unknown as PointerCapturer;
    target.setPointerCapture(e.pointerId);
    if (!sliderGroupRef.current) return;

    const localClick = sliderGroupRef.current.worldToLocal(e.point.clone());
    const clickVal = xToVal(localClick.x);
    const currentVal = type === "low" ? localValue.current[0] : localValue.current[1];

    setDragState({
      type,
      pointerId: e.pointerId,
      offset: currentVal - clickVal,
    });
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!e.target) return;
    const target = e.target as unknown as PointerCapturer;
    if (target.hasPointerCapture(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
    }
    setDragState(null);
  };

  return (
    <group position={position} rotation={rotation} ref={rootRef} scale={scale}>
      <group
        ref={sliderGroupRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onPointerMove={(e) => dragState && e.stopPropagation()}>
        {/* Low Handle */}
        <mesh ref={lowHandleRef} renderOrder={1} onPointerDown={handlePointerDown("low")} onPointerUp={handlePointerUp}>
          <Handle radius={handleRadius} color={handleColor} borderColor={borderColor} />
        </mesh>
        {/* High Handle */}
        <mesh
          ref={highHandleRef}
          renderOrder={1}
          onPointerDown={handlePointerDown("high")}
          onPointerUp={handlePointerUp}>
          <Handle radius={handleRadius} color={handleColor} borderColor={borderColor} />
        </mesh>
      </group>
    </group>
  );
}

function Handle({ radius, color, borderColor }: { radius: number; color: string; borderColor: string }) {
  return (
    <>
      <mesh renderOrder={0}>
        <circleGeometry args={[radius + 0.07, 64]} />
        <meshBasicMaterial color={borderColor} toneMapped={false} transparent opacity={0.75} />
      </mesh>

      <mesh renderOrder={1}>
        <circleGeometry args={[radius, 64]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.75} />
      </mesh>
    </>
  );
}
