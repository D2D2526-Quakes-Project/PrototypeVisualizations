import { ShortcutsBar } from "@/features/view-3d/components/ShortcutsBar";
import { useViewStore } from "@/state";

interface SelectionShortcutsProps {
  showPlayback: boolean;
}

export function SelectionShortcuts({ showPlayback }: SelectionShortcutsProps) {
  const hasSelection = useViewStore((s) => s.selectedNodeIds.length > 0);
  const isBoxSelecting = useViewStore((s) => s.isBoxSelecting);
  const mode = useViewStore((s) => s.mode);

  return (
    <ShortcutsBar isBoxSelecting={isBoxSelecting} hasSelection={hasSelection} showPlayback={showPlayback} mode={mode} />
  );
}
