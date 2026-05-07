import { usePanelState } from "@/features/view-3d/hooks/usePanelState";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";

export interface CanvasPanelState {
  camera: {
    isOrthographic: boolean;
    position: [number, number, number];
    target: [number, number, number];
    zoom?: number;
  };
  expandedScale: {
    expansionEnabled: boolean;
    displacementEnabled: boolean;
    xExpansion: number;
    yExpansion: number;
    zExpansion: number;
    xzDisplacementScale: number;
    zDisplacementScale: number;
  };
  sliceView: {
    sliceEnabled: boolean;
    xRange: [number, number];
    yRange: [number, number];
    zRange: [number, number];
  };
}

export const DEFAULT_CANVAS_PANEL_STATE: CanvasPanelState = {
  camera: {
    isOrthographic: false,
    position: [0, 0, 0],
    target: [0, 0, 0],
    zoom: 50,
  },
  expandedScale: {
    expansionEnabled: false,
    displacementEnabled: false,
    xExpansion: 0,
    yExpansion: 0,
    zExpansion: 1,
    xzDisplacementScale: 1,
    zDisplacementScale: 1,
  },
  sliceView: {
    sliceEnabled: false,
    xRange: [-100, 100],
    yRange: [-100, 100],
    zRange: [0, 100],
  },
};

export interface CameraContextType {
  orbitControlsRef: React.RefObject<OrbitControlsImpl | null>;
  focusOnPosition: (position: [number, number, number]) => void;
  setEnablePan: (enabled: boolean) => void;
  orthographic: boolean;
  setOrthographic: (orthographic: boolean) => void;
  expandedScale: {
    expansionEnabled: boolean;
    displacementEnabled: boolean;
    xExpansion: number;
    yExpansion: number;
    zExpansion: number;
    xzDisplacementScale: number;
    zDisplacementScale: number;
  };
  setExpandedScale: (scale: {
    expansionEnabled: boolean;
    displacementEnabled: boolean;
    xExpansion: number;
    yExpansion: number;
    zExpansion: number;
    xzDisplacementScale: number;
    zDisplacementScale: number;
  }) => void;
  toggleExpansion: () => void;
  toggleDisplacement: () => void;
  setExpansion: (axis: "x" | "y" | "z", factor: number) => void;
  setDisplacementScale: (axis: "xz" | "z", factor: number) => void;
  resetExpandedScale: () => void;
  sliceEnabled: boolean;
  setSliceEnabled: (enabled: boolean) => void;
  xRange: [number, number];
  yRange: [number, number];
  zRange: [number, number];
  setSliceRanges: (x: [number, number], y: [number, number], z: [number, number]) => void;
  setXRange: (range: [number, number]) => void;
  setYRange: (range: [number, number]) => void;
  setZRange: (range: [number, number]) => void;
  cameraState: {
    position: [number, number, number];
    target: [number, number, number];
    zoom?: number;
  };
  setCameraState: (state: {
    position: [number, number, number];
    target: [number, number, number];
    zoom?: number;
  }) => void;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export function useCamera(): CameraContextType {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error("useCamera must be within CameraProvider");
  }
  return context;
}

export function CameraProvider({ children, panelId = "main-canvas" }: { children: ReactNode; panelId?: string }) {
  const orbitControlsRef = useRef<OrbitControlsImpl>(null);

  const { state: savedCanvasState, setState: setSavedCanvasState } = usePanelState<CanvasPanelState>({
    panelId,
    fallbackPanelId: "main-canvas",
    panelType: "canvas",
    defaultState: DEFAULT_CANVAS_PANEL_STATE,
  });

  const [orthographic, setOrthographic] = useState(savedCanvasState.camera.isOrthographic);
  const [cameraState, setCameraState] = useState<{
    position: [number, number, number];
    target: [number, number, number];
    zoom?: number;
  }>({
    position: savedCanvasState.camera.position,
    target: savedCanvasState.camera.target,
    zoom: savedCanvasState.camera.zoom,
  });
  const [expandedScale, setExpandedScaleState] = useState(savedCanvasState.expandedScale);
  const [sliceEnabled, setSliceEnabled] = useState(savedCanvasState.sliceView.sliceEnabled);
  const [xRange, setXRange] = useState<[number, number]>(savedCanvasState.sliceView.xRange);
  const [yRange, setYRange] = useState<[number, number]>(savedCanvasState.sliceView.yRange);
  const [zRange, setZRange] = useState<[number, number]>(savedCanvasState.sliceView.zRange);

  const setSliceRanges = useCallback((x: [number, number], y: [number, number], z: [number, number]) => {
    setXRange(x);
    setYRange(y);
    setZRange(z);
  }, []);

  const setXRangeLocal = useCallback((range: [number, number]) => setXRange(range), []);
  const setYRangeLocal = useCallback((range: [number, number]) => setYRange(range), []);
  const setZRangeLocal = useCallback((range: [number, number]) => setZRange(range), []);

  const toggleExpansion = useCallback(() => {
    setExpandedScaleState((prev) => ({ ...prev, expansionEnabled: !prev.expansionEnabled }));
  }, []);
  const toggleDisplacement = useCallback(() => {
    setExpandedScaleState((prev) => ({ ...prev, displacementEnabled: !prev.displacementEnabled }));
  }, []);
  const setExpansion = useCallback((axis: "x" | "y" | "z", factor: number) => {
    setExpandedScaleState((prev) => ({ ...prev, [`${axis}Expansion`]: factor }));
  }, []);
  const setDisplacementScale = useCallback((axis: "xz" | "z", factor: number) => {
    setExpandedScaleState((prev) => ({
      ...prev,
      [axis === "xz" ? "xzDisplacementScale" : "zDisplacementScale"]: factor,
    }));
  }, []);
  const resetExpandedScale = useCallback(() => {
    setExpandedScaleState({
      expansionEnabled: false,
      displacementEnabled: false,
      xExpansion: 0,
      yExpansion: 0,
      zExpansion: 1,
      xzDisplacementScale: 1,
      zDisplacementScale: 1,
    });
  }, []);

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

  useEffect(() => {
    setSavedCanvasState({
      camera: {
        ...cameraState,
        isOrthographic: orthographic,
      },
      expandedScale,
      sliceView: {
        sliceEnabled,
        xRange,
        yRange,
        zRange,
      },
    });
  }, [cameraState, expandedScale, orthographic, sliceEnabled, xRange, yRange, zRange, setSavedCanvasState]);

  return (
    <CameraContext.Provider
      value={{
        orbitControlsRef,
        focusOnPosition,
        setEnablePan,
        orthographic,
        setOrthographic,
        expandedScale,
        setExpandedScale: setExpandedScaleState,
        toggleExpansion,
        toggleDisplacement,
        setExpansion,
        setDisplacementScale,
        resetExpandedScale,
        sliceEnabled,
        setSliceEnabled,
        xRange,
        yRange,
        zRange,
        setSliceRanges,
        setXRange: setXRangeLocal,
        setYRange: setYRangeLocal,
        setZRange: setZRangeLocal,
        cameraState,
        setCameraState,
      }}>
      {children}
    </CameraContext.Provider>
  );
}
