import { createContext, useContext, useRef, useCallback, type ReactNode } from "react";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

export interface CameraContextType {
  orbitControlsRef: React.RefObject<OrbitControlsImpl | null>;
  focusOnPosition: (position: [number, number, number]) => void;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export function useCamera() {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error("useCamera must be used within CameraProvider");
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
    
    // Calculate the offset from current target to new target
    const offset = new THREE.Vector3(
      position[0] - currentTarget.x,
      position[1] - currentTarget.y,
      position[2] - currentTarget.z
    );
    
    // Move camera by the same offset to maintain the same view angle
    camera.position.add(offset);
    
    // Set new target
    controls.target.set(position[0], position[1], position[2]);
    controls.update();
  }, []);

  return (
    <CameraContext.Provider value={{ orbitControlsRef, focusOnPosition }}>
      {children}
    </CameraContext.Provider>
  );
}
