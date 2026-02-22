import { createContext, useContext, useRef, useCallback, type ReactNode } from "react";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import type { CameraState } from "@/lib/statePersistence";

export interface CameraContextType {
  orbitControlsRef: React.RefObject<OrbitControlsImpl | null>;
  focusOnPosition: (position: [number, number, number]) => void;
  setEnablePan: (enabled: boolean) => void;
  getCameraState: () => CameraState;
  setCameraFromState: (state: CameraState) => void;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export function useCamera() {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error("useCamera must be within CameraProvider");
  }
  return context;
}

export function CameraProvider({ children }: { children: ReactNode }) {
  const orbitControlsRef = useRef<OrbitControlsImpl>(null);

  const focusOnPosition = useCallback((position: [number, number, number]) => {
    const controls = orbitControlsRef.current;
    if (!controls) return;

    const camera = controls.object;
    const currentTarget = controls.target;
    
    const offset = new THREE.Vector3(
      position[0] - currentTarget.x,
      position[1] - currentTarget.y,
      position[2] - currentTarget.z
    );
    
    camera.position.add(offset);
    controls.target.set(position[0], position[1], position[2]);
    controls.update();
  }, []);

  const setEnablePan = useCallback((enabled: boolean) => {
    const controls = orbitControlsRef.current;
    if (!controls) return;
    controls.enablePan = enabled;
  }, []);

  const getCameraState = useCallback((): CameraState => {
    const controls = orbitControlsRef.current;
    if (!controls) {
      return { isOrthographic: false, position: [0, 0, 0], target: [0, 0, 0], zoom: 50 };
    }

    const camera = controls.object as THREE.Camera;
    const isOrthographic = "isOrthographicCamera" in camera && camera.isOrthographicCamera === true;
    return {
      isOrthographic,
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
      zoom: isOrthographic ? (camera as THREE.OrthographicCamera).zoom : undefined,
    };
  }, []);

  const setCameraFromState = useCallback((state: CameraState) => {
    const controls = orbitControlsRef.current;
    if (!controls) return;

    const camera = controls.object;
    camera.position.set(state.position[0], state.position[1], state.position[2]);
    if (
      "isOrthographicCamera" in camera &&
      camera.isOrthographicCamera === true &&
      typeof state.zoom === "number"
    ) {
      (camera as THREE.OrthographicCamera).zoom = state.zoom;
      (camera as THREE.OrthographicCamera).updateProjectionMatrix();
    }
    controls.target.set(state.target[0], state.target[1], state.target[2]);
    controls.update();
  }, []);

  return (
    <CameraContext.Provider value={{ orbitControlsRef, focusOnPosition, setEnablePan, getCameraState, setCameraFromState }}>
      {children}
    </CameraContext.Provider>
  );
}
