import { useProfileStore } from "@/state";

export function useRenderModes() {
  const renderNodes = useProfileStore((s) => s.renderNodes);
  const setRenderNodes = useProfileStore((s) => s.setRenderNodes);
  const renderFloorSlabs = useProfileStore((s) => s.renderFloorSlabs);
  const setRenderFloorSlabs = useProfileStore((s) => s.setRenderFloorSlabs);
  const renderXCrossSectionSlabs = useProfileStore((s) => s.renderXCrossSectionSlabs);
  const setRenderXCrossSectionSlabs = useProfileStore((s) => s.setRenderXCrossSectionSlabs);
  const renderYCrossSectionSlabs = useProfileStore((s) => s.renderYCrossSectionSlabs);
  const setRenderYCrossSectionSlabs = useProfileStore((s) => s.setRenderYCrossSectionSlabs);
  const showCornersOnly = useProfileStore((s) => s.showCornersOnly);
  const setShowCornersOnly = useProfileStore((s) => s.setShowCornersOnly);
  const renderVerticalConnections = useProfileStore((s) => s.renderVerticalConnections);
  const setRenderVerticalConnections = useProfileStore((s) => s.setRenderVerticalConnections);
  const renderHorizontalConnections = useProfileStore((s) => s.renderHorizontalConnections);
  const setRenderHorizontalConnections = useProfileStore((s) => s.setRenderHorizontalConnections);

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
