import { createContext, useCallback, useContext, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";

export interface CameraContextType {
  orbitControlsRef: React.RefObject<OrbitControlsImpl | null>;
  focusOnPosition: (position: [number, number, number]) => void;
  setEnablePan: (enabled: boolean) => void;
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

  return (
    <CameraContext.Provider value={{ orbitControlsRef, focusOnPosition, setEnablePan }}>
      {children}
    </CameraContext.Provider>
  );
}
