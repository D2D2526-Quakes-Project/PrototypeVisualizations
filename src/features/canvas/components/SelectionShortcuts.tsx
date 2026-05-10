import { ShortcutsBar } from "@/features/3d/components/ShortcutsBar";

interface SelectionShortcutsProps {
  showPlayback: boolean;
}

export function SelectionShortcuts({ showPlayback }: SelectionShortcutsProps) {
  const hasSelection = useViewStore((s) => s.selectedNodeIds.length > 0);
  const isBoxSelecting = useViewStore((s) => s.isBoxSelecting);
  const renderFloorSlabs = useViewStore((s) => s.renderFloorSlabs);
  const renderXCrossSectionSlabs = useViewStore((s) => s.renderXCrossSectionSlabs);
  const renderYCrossSectionSlabs = useViewStore((s) => s.renderYCrossSectionSlabs);

  const mode = renderFloorSlabs || renderXCrossSectionSlabs || renderYCrossSectionSlabs ? "floor-slabs" : "all-nodes";

  return (
    <ShortcutsBar isBoxSelecting={isBoxSelecting} hasSelection={hasSelection} showPlayback={showPlayback} mode={mode} />
  );
}
