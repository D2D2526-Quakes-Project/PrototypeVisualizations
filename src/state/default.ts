import { DEFAULT_THRESHOLDS, type ProfileData } from "./profileState";

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
    renderVerticalConnections: false,
    renderHorizontalConnections: false,
    _thresholds: { ...DEFAULT_THRESHOLDS },
    _currentMetric: "interstoryDrift",
    _thresholdHighlighting: true,
    _hiddenFloors: defaultHiddenFloors ?? [],
    _hiddenNodeIds: [],

    openedNodePanelIds: [],
    dockviewLayout: null,
    panelStates: {},
    nodePanelGraphVisibility: { dispx: true, dispy: true, drift: true },

    nodeScale: 1,
    nodeOpacity: 1,
    hingeNodeScale: 1,
    belowThresholdNodeScale: 0.5,
    belowThresholdNodeOpacity: 0.3,
    belowThresholdHingeScale: 0.5,
    floorOpacity: 1,
    connectionLineWidth: 1,
    connectionLineOpacity: 1,
    ...overrides,
  };
}

// function getDamageScreeningProfileData(buildingId: string): ProfileData {
//   return getDefaultProfileData({
//     profileId: SYSTEM_PROFILE_DAMAGE_SCREENING_ID,
//     currentMetric: "rotationZ",
//     thresholds: { ...DEFAULT_THRESHOLDS, rotation: 0.008, interstoryDrift: 0.35 },
//   });
// }

export const DEFAULT_PROFILE = "default";

export function createDefaultProfiles(defaultHiddenFloors?: string[]): Record<string, ProfileData> {
  const defaultProfile = getDefaultProfileData({ profileId: "default" }, defaultHiddenFloors);

  return {
    ["default"]: defaultProfile,
    // ["displacement"]: getFloorTorsionProfileData(buildingId),
    // ["story-drifts"]: getDriftAnalysisProfileData(buildingId),
    // ["hinges"]: getAccelerationReviewProfileData(buildingId),
  };
}
