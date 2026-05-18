import { useProfileActions, useProfileData } from "@/state";

export function useRenderModes() {
  const renderNodes = useProfileData((s) => s.renderNodes);
  const renderFloorSlabs = useProfileData((s) => s.renderFloorSlabs);
  const renderXCrossSectionSlabs = useProfileData((s) => s.renderXCrossSectionSlabs);
  const renderYCrossSectionSlabs = useProfileData((s) => s.renderYCrossSectionSlabs);
  const showCornersOnly = useProfileData((s) => s.showCornersOnly);
  const renderVerticalConnections = useProfileData((s) => s.renderVerticalConnections);
  const renderHorizontalConnections = useProfileData((s) => s.renderHorizontalConnections);

  const {
    setRenderNodes,
    setRenderFloorSlabs,
    setRenderXCrossSectionSlabs,
    setRenderYCrossSectionSlabs,
    setShowCornersOnly,
    setRenderVerticalConnections,
    setRenderHorizontalConnections,
  } = useProfileActions();

  return {
    renderNodes,
    setRenderNodes,
    renderFloorSlabs,
    setRenderFloorSlabs,
    renderXCrossSectionSlabs,
    setRenderXCrossSectionSlabs,
    renderYCrossSectionSlabs,
    setRenderYCrossSectionSlabs,
    showCornersOnly,
    setShowCornersOnly,
    renderVerticalConnections,
    setRenderVerticalConnections,
    renderHorizontalConnections,
    setRenderHorizontalConnections,
  };
}
