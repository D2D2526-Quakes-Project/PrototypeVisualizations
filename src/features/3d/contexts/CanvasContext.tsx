// @refresh reset
/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { usePanelState, type UsePanelStateReturn } from "../hooks/usePanelState";
import type { ViewPresetMode } from "@/features/canvas/viewPresets";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { UNIT_SCALE } from "@/lib/utils";

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
  resetView: (viewType: ViewPresetMode) => void;
  resetHomeView: () => void;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export function useCamera() {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error("useCamera must be within CanvasProvider");
  }
  return context;
}

export function CameraProvider({ children, panelId }: { children: ReactNode; panelId: string }) {
  const panelState = usePanelState({
    panelId,
    panelType: "canvas",
    defaultState: DEFAULT_CANVAS_PANEL_STATE,
  });
  const { animationData } = useAnimationData();

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

  // Camera controls

  const cameraDistance = animationData.precomputed.boundingBox.radius * 2.5 * UNIT_SCALE;
  const buildingVerticalCenter =
    (animationData.precomputed.boundingBox.center[2] - animationData.precomputed.boundingBox.min[2]) * UNIT_SCALE;

  const viewPositions = useMemo(
    () => ({
      top: [0, 0, cameraDistance],
      bottom: [0, 0, -cameraDistance],
      left: [-cameraDistance, 0, 0],
      right: [cameraDistance, 0, 0],
      front: [0, cameraDistance, 0],
      back: [0, -cameraDistance, 0],
      frontRight: [cameraDistance, cameraDistance, 0],
      frontLeft: [-cameraDistance, cameraDistance, 0],
      backRight: [cameraDistance, -cameraDistance, 0],
      backLeft: [-cameraDistance, -cameraDistance, 0],
    }),
    [cameraDistance]
  );

  const resetView = useCallback(
    (viewType: ViewPresetMode) => {
      const position = viewPositions[viewType];
      const target = panelState.cameraTarget;
      panelState.setCameraPosition([position[0] + target[0], position[1] + target[1], position[2] + target[2]]);
    },
    [panelState, viewPositions]
  );

  const resetHomeView = useCallback(() => {
    panelState.setCameraTarget([0, 0, buildingVerticalCenter]);
    panelState.setCameraPosition([-cameraDistance, -cameraDistance, buildingVerticalCenter + cameraDistance]);
  }, [buildingVerticalCenter, cameraDistance, panelState]);

  return (
    <CameraContext.Provider
      value={{
        orbitControlsRef,
        focusOnPosition,
        setEnablePan,
        setSliceRanges,
        resetExpandedScale,
        resetDisplacementScale,
        resetView,
        resetHomeView,
        ...panelState,
      }}>
      {children}
    </CameraContext.Provider>
  );
}
