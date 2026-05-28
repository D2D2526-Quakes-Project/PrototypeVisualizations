// @refresh reset
/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { usePanelState, type UsePanelStateReturn } from "../../dockview/usePanelState";
import type { ViewPresetMode } from "@/features/canvas/viewPresets";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { UNIT_SCALE } from "@/lib/utils";

export interface CanvasPanelState {
  orthographic: boolean;
  spin: boolean;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  cameraZoom: number | undefined;
  expansionEnabled: boolean;
  xExpansion: number;
  yExpansion: number;
  zExpansion: number;
  displacementEnabled: boolean;
  xyDisplacementScale: number;
  zDisplacementScale: number;
  sliceEnabled: boolean;
  sliceXRange: [number, number];
  sliceYRange: [number, number];
  sliceZRange: [number, number];
}

const DEFAULT_CANVAS_PANEL_STATE: CanvasPanelState = {
  orthographic: false,
  spin: false,
  cameraPosition: [100, 100, 100],
  cameraTarget: [0, 0, 0],
  cameraZoom: undefined,
  expansionEnabled: false,
  xExpansion: 1,
  yExpansion: 0,
  zExpansion: 0,
  displacementEnabled: false,
  xyDisplacementScale: 1,
  zDisplacementScale: 1,
  sliceEnabled: false,
  sliceXRange: [-100, 100],
  sliceYRange: [-100, 100],
  sliceZRange: [0, 100],
};

export interface BoxSelection {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export interface CameraContextType extends UsePanelStateReturn<CanvasPanelState> {
  orbitControlsRef: React.RefObject<OrbitControlsImpl | null>;
  panelId: string;
  isViewControlsExpanded: boolean;
  setIsViewControlsExpanded: (expanded: boolean) => void;

  isHoveringPanel: boolean;
  isPrimaryPanel: boolean;

  setPanEnabled: (enabled: boolean) => void;
  nodeInteractionEnabled: boolean;
  setNodeInteractionEnabled: (enabled: boolean) => void;

  startBoxSelection: (start: { x: number; y: number }) => void;
  updateBoxSelection: (end: { x: number; y: number }) => void;
  endBoxSelection: () => void;
  boxSelection: BoxSelection | null;

  focusOnPosition: (position: [number, number, number]) => void;
  setSliceRanges: (x: [number, number], y: [number, number], z: [number, number]) => void;
  resetExpandedScale: () => void;
  resetDisplacementScale: () => void;
  resetView: (viewType: ViewPresetMode) => void;
  resetHomeView: () => void;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export function useCanvasState(dummy: boolean = false) {
  const context = useContext(CameraContext);
  if (!context) {
    if (dummy) return { ...DEFAULT_CANVAS_PANEL_STATE, panelId: "", nodeInteractionEnabled: true } as CameraContextType;
    throw new Error("useCanvasState must be within CanvasProvider");
  }
  return context;
}

export function CanvasPanelProvider({
  children,
  panelId,
  isHoveringPanel,
  isPrimaryPanel,
}: {
  children: ReactNode;
  panelId: string;
  isHoveringPanel: boolean;
  isPrimaryPanel: boolean;
}) {
  const { animationData } = useAnimationData();
  const boundingBox = animationData.precomputed.boundingBox;
  const buildingVerticalCenter = (boundingBox.center[2] - boundingBox.min[2]) * UNIT_SCALE;
  const defaultState: CanvasPanelState = {
    ...DEFAULT_CANVAS_PANEL_STATE,
    cameraTarget: [0, 0, buildingVerticalCenter],
    sliceXRange: [boundingBox.min[0], boundingBox.max[0]],
    sliceYRange: [boundingBox.min[1], boundingBox.max[1]],
    sliceZRange: [boundingBox.min[2], boundingBox.max[2]],
  };
  const panelState = usePanelState({
    panelId,
    panelType: "Main Canvas",
    defaultState,
  });
  const [nodeInteractionEnabled, setNodeInteractionEnabled] = useState(true);
  const [isViewControlsExpanded, setIsViewControlsExpanded] = useState(false);
  const orbitControlsRef = useRef<OrbitControlsImpl>(null);

  const [boxSelection, setBoxSelection] = useState<BoxSelection | null>(null);

  const setSliceRanges = useCallback(
    (x: [number, number], y: [number, number], z: [number, number]) => {
      panelState.setSliceXRange(x);
      panelState.setSliceYRange(y);
      panelState.setSliceZRange(z);
    },
    [panelState]
  );

  const resetExpandedScale = useCallback(() => {
    // panelState.setExpansionEnabled(DEFAULT_CANVAS_PANEL_STATE.expansionEnabled);
    panelState.setXExpansion(DEFAULT_CANVAS_PANEL_STATE.xExpansion);
    panelState.setYExpansion(DEFAULT_CANVAS_PANEL_STATE.yExpansion);
    panelState.setZExpansion(DEFAULT_CANVAS_PANEL_STATE.zExpansion);
  }, [panelState]);

  const resetDisplacementScale = useCallback(() => {
    // panelState.setDisplacementEnabled(DEFAULT_CANVAS_PANEL_STATE.displacementEnabled);
    panelState.setXyDisplacementScale(DEFAULT_CANVAS_PANEL_STATE.xyDisplacementScale);
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

  const setPanEnabled = useCallback((enabled: boolean) => {
    const controls = orbitControlsRef.current;
    if (!controls) return;
    controls.enablePan = enabled;
  }, []);

  // Camera controls

  const cameraDistance = animationData.precomputed.boundingBox.radius * 2.5 * UNIT_SCALE;

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
    const pos: [number, number, number] = [-cameraDistance, -cameraDistance, buildingVerticalCenter + cameraDistance];
    const tgt: [number, number, number] = [0, 0, buildingVerticalCenter];

    panelState.setCameraTarget(tgt);
    panelState.setCameraPosition(pos);
    if (!panelState.orthographic) {
      const dx = pos[0] - tgt[0];
      const dy = pos[1] - tgt[1];
      const dz = pos[2] - tgt[2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      panelState.setCameraZoom(distance);
    } else {
      panelState.setCameraZoom(undefined);
    }
  }, [buildingVerticalCenter, cameraDistance, panelState]);

  const startBoxSelection = useCallback(
    (start: { x: number; y: number }) => {
      setBoxSelection({ start, end: start });
      setNodeInteractionEnabled(false);
    },
    [setBoxSelection, setNodeInteractionEnabled]
  );

  const updateBoxSelection = useCallback(
    (end: { x: number; y: number }) => {
      setBoxSelection((current) => ({ ...current!, end }));
    },
    [setBoxSelection]
  );

  const endBoxSelection = useCallback(() => {
    setBoxSelection(null);
    setNodeInteractionEnabled(true);
  }, [setBoxSelection, setNodeInteractionEnabled]);

  return (
    <CameraContext.Provider
      value={{
        isViewControlsExpanded,
        setIsViewControlsExpanded,
        orbitControlsRef,
        focusOnPosition,
        setPanEnabled,
        nodeInteractionEnabled,
        setNodeInteractionEnabled,
        boxSelection,
        startBoxSelection,
        updateBoxSelection,
        endBoxSelection,
        setSliceRanges,
        resetExpandedScale,
        resetDisplacementScale,
        resetView,
        resetHomeView,
        panelId,
        isHoveringPanel,
        isPrimaryPanel,
        ...panelState,
      }}>
      {children}
    </CameraContext.Provider>
  );
}
