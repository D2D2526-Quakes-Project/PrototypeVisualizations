// @refresh reset
/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { usePanelState, type UsePanelStateReturn } from "../hooks/usePanelState";

export interface CanvasPanelState {
  orthographic: boolean;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  cameraZoom: number | undefined;
  expansionEnabled: boolean;
  displacementEnabled: boolean;
  xExpansion: number;
  yExpansion: number;
  zExpansion: number;
  xzDisplacementScale: number;
  zDisplacementScale: number;
  sliceEnabled: boolean;
  sliceXRange: [number, number];
  sliceYRange: [number, number];
  sliceZRange: [number, number];
}

const DEFAULT_CANVAS_PANEL_STATE: CanvasPanelState = {
  orthographic: false,
  cameraPosition: [0, 0, 0],
  cameraTarget: [0, 0, 0],
  cameraZoom: 50,
  expansionEnabled: false,
  displacementEnabled: false,
  xExpansion: 0,
  yExpansion: 0,
  zExpansion: 1,
  xzDisplacementScale: 1,
  zDisplacementScale: 1,
  sliceEnabled: false,
  sliceXRange: [-100, 100],
  sliceYRange: [-100, 100],
  sliceZRange: [0, 100],
};

export interface CameraContextType extends UsePanelStateReturn<CanvasPanelState> {
  orbitControlsRef: React.RefObject<OrbitControlsImpl | null>;

  focusOnPosition: (position: [number, number, number]) => void;
  setEnablePan: (enabled: boolean) => void;
  setSliceRanges: (x: [number, number], y: [number, number], z: [number, number]) => void;
  resetExpandedScale: () => void;
  resetDisplacementScale: () => void;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export function useCamera() {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error("useCamera must be within CameraProvider");
  }
  return context;
}

export function CameraProvider({ children, panelId }: { children: ReactNode; panelId: string }) {
  const panelState = usePanelState({
    panelId,
    panelType: "canvas",
    defaultState: DEFAULT_CANVAS_PANEL_STATE,
  });

  const orbitControlsRef = useRef<OrbitControlsImpl>(null);

  const setSliceRanges = useCallback(
    (x: [number, number], y: [number, number], z: [number, number]) => {
      panelState.setSliceXRange(x);
      panelState.setSliceYRange(y);
      panelState.setSliceZRange(z);
    },
    [panelState]
  );

  const resetExpandedScale = useCallback(() => {
    panelState.setExpansionEnabled(DEFAULT_CANVAS_PANEL_STATE.expansionEnabled);
    panelState.setXExpansion(DEFAULT_CANVAS_PANEL_STATE.xExpansion);
    panelState.setYExpansion(DEFAULT_CANVAS_PANEL_STATE.yExpansion);
    panelState.setZExpansion(DEFAULT_CANVAS_PANEL_STATE.zExpansion);
  }, [panelState]);

  const resetDisplacementScale = useCallback(() => {
    panelState.setDisplacementEnabled(DEFAULT_CANVAS_PANEL_STATE.displacementEnabled);
    panelState.setXzDisplacementScale(DEFAULT_CANVAS_PANEL_STATE.xzDisplacementScale);
    panelState.setZDisplacementScale(DEFAULT_CANVAS_PANEL_STATE.zDisplacementScale);
  }, [panelState]);

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
    <CameraContext.Provider
      value={{
        orbitControlsRef,
        focusOnPosition,
        setEnablePan,
        setSliceRanges,
        resetExpandedScale,
        resetDisplacementScale,
        ...panelState,
      }}>
      {children}
    </CameraContext.Provider>
  );
}
