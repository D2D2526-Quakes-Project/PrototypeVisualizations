import type { SerializedDockview } from "dockview";
import { type StateCreator } from "zustand";
import type { AppState } from ".";
import type { Metric, ThresholdKey } from "@/features/metrics/metrics";

export type ThresholdState = Record<ThresholdKey, number>;

export interface ProfileData {
  profileId: string;

  // Playback
  frameIndex: number;

  // View Mode
  renderNodes: boolean;
  renderFloorSlabs: boolean;
  renderXCrossSectionSlabs: boolean;
  renderYCrossSectionSlabs: boolean;
  showCornersOnly: boolean;
  visualInterpolationEnabled: boolean;
  renderVerticalConnections: boolean;
  renderHorizontalConnections: boolean;

  // Thresholds
  _thresholds: ThresholdState;

  // Color
  _currentMetric: Metric;
  _thresholdHighlighting: boolean;

  // Floor Visibility
  hiddenFloors: string[];

  // Node Visibility
  hiddenNodeIds: number[];

  openedNodePanelIds: number[];

  // Dockview Layout
  dockviewLayout: SerializedDockview | null;

  // Per-panel state
  panelStates: Partial<Record<string, SavedPanelState>>;

  // Node Panel Graph Visibility
  nodePanelGraphVisibility: Record<string, boolean>;

  // Node Display
  nodeScale: number;
  nodeOpacity: number;
  belowThresholdNodeScale: number;
  belowThresholdNodeOpacity: number;
  floorOpacity: number;
  hingeNodeScale: number;
  belowThresholdHingeScale: number;
  connectionLineWidth: number;
  connectionLineOpacity: number;
}

export interface ProfileState {
  // Profiles
  profiles: Record<string, Record<string, ProfileData>>;
  activeProfileIds: Record<string, string>;

  profileActions: {
    setActiveProfile: (profId: string) => void;

    // Playback
    setFrameIndex: (frame: number) => void;

    // View Mode
    setRenderNodes: (value: boolean) => void;
    setRenderFloorSlabs: (value: boolean) => void;
    setRenderXCrossSectionSlabs: (value: boolean) => void;
    setRenderYCrossSectionSlabs: (value: boolean) => void;
    setShowCornersOnly: (value: boolean) => void;
    setVisualInterpolationEnabled: (value: boolean) => void;
    setRenderVerticalConnections: (value: boolean) => void;
    setRenderHorizontalConnections: (value: boolean) => void;

    // Thresholds
    setThreshold: (type: ThresholdKey, value: number) => void;
    resetThresholds: () => void;

    // Color
    _setCurrentMetric: (metric: Metric) => void;
    _setThresholdHighlighting: (enabled: boolean) => void;

    // Floor Visibility
    setHiddenFloors: (floors: string[]) => void;
    toggleFloor: (storyId: string) => void;
    showFloors: (storyOrder: string[]) => void;
    hideFloors: (storyOrder: string[]) => void;

    // Node Visibility
    hideNodes: (nodes: number[]) => void;
    showNodes: (nodes: number[]) => void;
    setHiddenNodeIds: (nodes: number[]) => void;
    showAllNodes: () => void;

    addOpenedNodePanel: (nodeId: number) => void;
    removeOpenedNodePanel: (nodeId: number) => void;

    // Dockview Layout
    setDockviewLayout: (layout: SerializedDockview) => void;

    // Per-panel state
    setPanelState: (panelId: string, panelType: string, panelState: unknown) => void;
    removePanelState: (panelId: string) => void;
    setPanelStates: (panelStates: Record<string, SavedPanelState>) => void;

    // Node Panel Graph Visibility
    toggleNodePanelGraph: (graphKey: string) => void;

    // Node Display
    setNodeScale: (scale: number) => void;
    setNodeOpacity: (opacity: number) => void;
    setBelowThresholdNodeScale: (scale: number) => void;
    setBelowThresholdNodeOpacity: (opacity: number) => void;
    setHingeNodeScale: (scale: number) => void;
    setBelowThresholdHingeScale: (scale: number) => void;
    setFloorOpacity: (opacity: number) => void;
    setConnectionLineWidth: (width: number) => void;
    setConnectionLineOpacity: (opacity: number) => void;
  };
}

type AddParameter<T, P> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (buildingId: P, ...args: A) => R : T[K];
};

export type ProfileStateSetters = {
  [K in keyof ProfileState]: K extends "profileActions" ? AddParameter<ProfileState[K], string> : ProfileState[K];
};

export type ProfileStateAPI = ProfileData & ProfileState["profileActions"];

export const createProfileSlice: StateCreator<AppState, [["zustand/immer", never]], [], ProfileStateSetters> = (
  set
) => {
  const mutateProfile = <Args extends Array<unknown>>(recipe: (profile: ProfileData, ...args: Args) => void) => {
    return (buildingId: string, ...args: Args) =>
      set((state) => {
        const profId = state.activeProfileIds[buildingId];
        if (!profId) return;
        const profile = state.profiles[buildingId]?.[profId];
        if (!profile) return;

        recipe(profile, ...args);
      });
  };

  return {
    // Profiles
    profiles: {},
    activeProfileIds: {},

    profileActions: {
      setActiveProfile: (buildingId, profId) =>
        set((state) => {
          state.activeProfileIds[buildingId] = profId;
        }),

      // Playback - defaults
      setFrameIndex: mutateProfile((profile, frameIndex) => {
        profile.frameIndex = frameIndex;
      }),

      // View Mode
      setRenderNodes: mutateProfile((profile, renderNodes) => {
        profile.renderNodes = renderNodes;
      }),
      setRenderFloorSlabs: mutateProfile((profile, renderFloorSlabs) => {
        profile.renderFloorSlabs = renderFloorSlabs;
      }),
      setRenderXCrossSectionSlabs: mutateProfile((profile, renderXCrossSectionSlabs) => {
        profile.renderXCrossSectionSlabs = renderXCrossSectionSlabs;
      }),
      setRenderYCrossSectionSlabs: mutateProfile((profile, renderYCrossSectionSlabs) => {
        profile.renderYCrossSectionSlabs = renderYCrossSectionSlabs;
      }),
      setShowCornersOnly: mutateProfile((profile, showCornersOnly) => {
        profile.showCornersOnly = showCornersOnly;
      }),
      setVisualInterpolationEnabled: mutateProfile((profile, visualInterpolationEnabled) => {
        profile.visualInterpolationEnabled = visualInterpolationEnabled;
      }),
      setRenderVerticalConnections: mutateProfile((profile, renderVerticalConnections) => {
        profile.renderVerticalConnections = renderVerticalConnections;
      }),
      setRenderHorizontalConnections: mutateProfile((profile, renderHorizontalConnections) => {
        profile.renderHorizontalConnections = renderHorizontalConnections;
      }),

      // Thresholds
      setThreshold: mutateProfile((profile, type, value) => {
        profile._thresholds = {
          ...profile._thresholds,
          [type]: value,
        };
      }),
      resetThresholds: mutateProfile(
        (profile) =>
          (profile._thresholds = {
            ...DEFAULT_THRESHOLDS,
          })
      ),

      // Color
      _setCurrentMetric: mutateProfile((profile, currentMetric) => {
        profile._currentMetric = currentMetric;
      }),

      _setThresholdHighlighting: mutateProfile((profile, thresholdHighlighting) => {
        profile._thresholdHighlighting = thresholdHighlighting;
      }),

      // Floor Visibility
      setHiddenFloors: mutateProfile((profile, hiddenFloors) => {
        profile.hiddenFloors = hiddenFloors;
      }),
      toggleFloor: mutateProfile((profile, storyId) => {
        const floors = new Set(profile.hiddenFloors);
        if (floors.has(storyId)) {
          floors.delete(storyId);
        } else {
          floors.add(storyId);
        }
        profile.hiddenFloors = Array.from(floors);
      }),
      showFloors: mutateProfile((profile, storyOrder) => {
        profile.hiddenFloors = profile.hiddenFloors.filter((id) => !storyOrder.includes(id));
      }),
      hideFloors: mutateProfile((profile, storyOrder) => {
        profile.hiddenFloors = [...new Set([...profile.hiddenFloors, ...storyOrder])];
      }),

      // Node Visibility / Selection
      setHiddenNodeIds: mutateProfile((profile, hiddenNodeIds) => {
        profile.hiddenNodeIds = hiddenNodeIds;
      }),
      hideNodes: mutateProfile((profile, nodes) => {
        profile.hiddenNodeIds = [...new Set([...profile.hiddenNodeIds, ...nodes])];
      }),
      showNodes: mutateProfile((profile, nodes) => {
        const nodesToShow = new Set(nodes);

        profile.hiddenNodeIds = profile.hiddenNodeIds.filter((id) => !nodesToShow.has(id));
      }),
      showAllNodes: mutateProfile((profile) => {
        profile.hiddenNodeIds = [];
      }),
      addOpenedNodePanel: mutateProfile((profile, nodeId) => {
        profile.openedNodePanelIds = [...new Set([...profile.openedNodePanelIds, nodeId])];
      }),
      removeOpenedNodePanel: mutateProfile((profile, nodeId) => {
        profile.openedNodePanelIds = profile.openedNodePanelIds.filter((id) => id !== nodeId);
      }),

      // Dockview Layout
      setDockviewLayout: mutateProfile((profile, dockviewLayout) => {
        profile.dockviewLayout = dockviewLayout;
      }),

      setPanelState: mutateProfile((profile, panelId, panelType, panelState) => {
        profile.panelStates = {
          ...profile.panelStates,
          [panelId]: {
            panelId,
            type: panelType,
            state: panelState,
          },
        };
      }),
      removePanelState: mutateProfile((profile, panelId) => {
        const { [panelId]: _removed, ...rest } = profile.panelStates;
        profile.panelStates = rest;
      }),
      setPanelStates: mutateProfile((profile, panelStates) => {
        profile.panelStates = panelStates;
      }),

      toggleNodePanelGraph: mutateProfile((profile, graphKey) => {
        profile.nodePanelGraphVisibility = {
          ...profile.nodePanelGraphVisibility,
          [graphKey]: !profile.nodePanelGraphVisibility[graphKey],
        };
      }),

      setNodeScale: mutateProfile((profile, nodeScale) => {
        profile.nodeScale = nodeScale;
      }),
      setNodeOpacity: mutateProfile((profile, nodeOpacity) => {
        profile.nodeOpacity = nodeOpacity;
      }),
      setBelowThresholdNodeScale: mutateProfile((profile, belowThresholdNodeScale) => {
        profile.belowThresholdNodeScale = belowThresholdNodeScale;
      }),
      setBelowThresholdNodeOpacity: mutateProfile((profile, belowThresholdNodeOpacity) => {
        profile.belowThresholdNodeOpacity = belowThresholdNodeOpacity;
      }),
      setHingeNodeScale: mutateProfile((profile, hingeNodeScale) => {
        profile.hingeNodeScale = hingeNodeScale;
      }),
      setBelowThresholdHingeScale: mutateProfile((profile, belowThresholdHingeScale) => {
        profile.belowThresholdHingeScale = belowThresholdHingeScale;
      }),
      setFloorOpacity: mutateProfile((profile, floorOpacity) => {
        profile.floorOpacity = floorOpacity;
      }),
      setConnectionLineWidth: mutateProfile((profile, connectionLineWidth) => {
        profile.connectionLineWidth = connectionLineWidth;
      }),
      setConnectionLineOpacity: mutateProfile((profile, connectionLineOpacity) => {
        profile.connectionLineOpacity = connectionLineOpacity;
      }),
    },
  };
};

export const DEFAULT_THRESHOLDS: ThresholdState = {
  displacement: 30,
  velocity: 10,
  acceleration: 10,
  rotation: 0.01,
  rotationVelocity: 0.1,
  rotationAcceleration: 0.5,
  interstoryDrift: 2,
  hingeRotation: 0.06,
  shear: 1000,
  inf: 0,
};

export interface SavedPanelState<TState = unknown> {
  panelId: string;
  type: string;
  state: TState;
}
