export function useNodeInteractionMode() {
  const renderNodes = useViewStore((s) => s.renderNodes);
  const showCornersOnly = useViewStore((s) => s.showCornersOnly);
  return renderNodes || showCornersOnly;
}

export function useSlabInteractionMode() {
  const renderFloorSlabs = useViewStore((s) => s.renderFloorSlabs);
  const renderXCrossSectionSlabs = useViewStore((s) => s.renderXCrossSectionSlabs);
  const renderYCrossSectionSlabs = useViewStore((s) => s.renderYCrossSectionSlabs);
  return renderFloorSlabs || renderXCrossSectionSlabs || renderYCrossSectionSlabs;
}
