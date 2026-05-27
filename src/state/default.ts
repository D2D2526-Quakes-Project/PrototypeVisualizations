import type { OptionalDatasetKey } from "@/features/animation-data/data-loading/loadingTypes";
import { DEFAULT_THRESHOLDS, type ProfileData, type SavedPanelState } from "./profileState";

export function getDefaultProfileData(
  overrides: Partial<ProfileData> & Required<Pick<ProfileData, "profileId">>,
  defaultHiddenFloors?: string[]
): ProfileData {
  return {
    frameIndex: 0,
    renderNodes: true,
    renderFloorSlabs: true,
    renderXCrossSectionSlabs: false,
    renderYCrossSectionSlabs: false,
    showCornersOnly: false,
    visualInterpolationEnabled: true,
    renderVerticalConnections: true,
    renderHorizontalConnections: false,
    coloredConnectionLines: false,
    _thresholds: { ...DEFAULT_THRESHOLDS },
    _currentMetric: "interstoryDrift",
    _thresholdHighlighting: true,
    _hiddenFloors: defaultHiddenFloors ?? [],
    _hiddenNodeIds: [],

    openedNodePanelIds: [],
    dockviewLayout: null,
    panelStates: {},
    nodePanelGraphVisibility: { dispx: true, dispy: true, drift: true },

    timeRange: null,

    nodeScale: 1,
    nodeOpacity: 1,
    hingeNodeScale: 1,
    belowThresholdNodeScale: 1,
    belowThresholdNodeOpacity: 0.3,
    belowThresholdHingeScale: 1,
    floorOpacity: 1,
    connectionLineWidth: 1,
    connectionLineOpacity: 1,
    ...overrides,
  };
}

export const BUILT_IN_PROFILES = ["default", "displacements", "hinges-preview", "shear", "story-drifts"] as const;

export type BuiltInProfileId = (typeof BUILT_IN_PROFILES)[number];

export const PROFILE_LABELS: Record<string, string> = {
  default: "Default",
  displacements: "Displacements",
  "hinges-preview": "Hinges Preview",
  shear: "Shear",
  "story-drifts": "Story Drifts",
};

export interface BuiltInProfileDefinition {
  profileId: string;
  label: string;
  requiredDatasets: OptionalDatasetKey[];
  getOverrides: (defaultHiddenFloors?: string[]) => Partial<ProfileData>;
  defaultPanelStates: Record<string, SavedPanelState>;
}

export const BUILT_IN_PROFILE_DEFINITIONS: BuiltInProfileDefinition[] = [
  {
    profileId: "default",
    label: "Default",
    requiredDatasets: [],
    getOverrides: () => ({}),
    defaultPanelStates: {},
  },
  {
    profileId: "displacements",
    label: "Displacements",
    requiredDatasets: [],
    getOverrides: () => ({
      _currentMetric: "displacementMag",
      nodeScale: 1.5,
      renderFloorSlabs: true,
      floorOpacity: 0.2,
      renderHorizontalConnections: true,
      renderVerticalConnections: true,
    }),
    defaultPanelStates: {
      "main-canvas-primary": {
        panelId: "main-canvas-primary",
        type: "Main Canvas",
        state: {
          orthographic: false,
          spin: false,
          cameraPosition: [0, 0, 200],
          cameraZoom: undefined,
        },
      },
      "main-canvas-secondary": {
        panelId: "main-canvas-secondary",
        type: "Main Canvas",
        state: {
          orthographic: false,
          spin: false,
          cameraPosition: [200, 0, 0],
          cameraZoom: undefined,
        },
      },
      "floor-displacement": {
        panelId: "floor-displacement",
        type: "Floor Average Metric",
        state: {
          selectedMetrics: ["displacementX", "displacementY"],
        },
      },
    },
  },
  {
    profileId: "hinges-preview",
    label: "Hinges Preview",
    requiredDatasets: ["hingeData"],
    getOverrides: () => ({
      _currentMetric: "hingeRotationAbs",
      renderNodes: true,
      nodeScale: 0.7,
      hingeNodeScale: 1.5,
      renderFloorSlabs: false,
      renderHorizontalConnections: false,
      renderVerticalConnections: false,
    }),
    defaultPanelStates: {
      "main-canvas-primary": {
        panelId: "main-canvas-primary",
        type: "Main Canvas",
        state: {
          orthographic: true,
          spin: true,
          cameraPosition: [-100, -100, 100],
          cameraZoom: undefined,
        },
      },
    },
  },
  {
    profileId: "shear",
    label: "Shear",
    requiredDatasets: ["shearData"],
    getOverrides: () => ({
      _currentMetric: "shearXAbs",
      renderNodes: false,
      renderFloorSlabs: true,
      floorOpacity: 1,
      renderHorizontalConnections: false,
      renderVerticalConnections: false,
    }),
    defaultPanelStates: {
      "main-canvas-primary": {
        panelId: "main-canvas-primary",
        type: "Main Canvas",
        state: {
          orthographic: false,
          spin: false,
          cameraPosition: [100, 100, 100],
          cameraZoom: undefined,
        },
      },
      "floor-average": {
        panelId: "floor-average",
        type: "Floor Average Metric",
        state: {
          selectedMetrics: ["shearXAbs", "shearYAbs"],
        },
      },
    },
  },
  {
    profileId: "story-drifts",
    label: "Story Drifts",
    requiredDatasets: [],
    getOverrides: () => ({
      _currentMetric: "interstoryDrift",
      renderNodes: true,
      renderFloorSlabs: true,
      floorOpacity: 0.7,
      renderHorizontalConnections: false,
      renderVerticalConnections: false,
    }),
    defaultPanelStates: {
      "main-canvas-primary": {
        panelId: "main-canvas-primary",
        type: "Main Canvas",
        state: {
          orthographic: false,
          spin: false,
          cameraPosition: [100, 100, 100],
          cameraZoom: undefined,
        },
      },
      "corner-metric-chart": {
        panelId: "corner-metric-chart",
        type: "Corner Metric Chart",
        state: {
          visibleCorners: ["NW", "NE", "SW", "SE"],
          metric: "interstoryDrift",
          displayMode: "bar",
        },
      },
    },
  },
];

export function getBuiltInProfileData(profileId: BuiltInProfileId, defaultHiddenFloors?: string[]): ProfileData {
  const def = BUILT_IN_PROFILE_DEFINITIONS.find((d) => d.profileId === profileId);
  const overrides = def ? def.getOverrides(defaultHiddenFloors) : {};
  const base = getDefaultProfileData({ profileId, ...overrides }, defaultHiddenFloors);
  if (def) {
    base.panelStates = { ...def.defaultPanelStates };
  }
  return base;
}

export const DEFAULT_PROFILE = "default";

export function createDefaultProfiles(defaultHiddenFloors?: string[]): Record<string, ProfileData> {
  return Object.fromEntries(
    BUILT_IN_PROFILES.map((profId) => [profId, getBuiltInProfileData(profId, defaultHiddenFloors)])
  );
}
