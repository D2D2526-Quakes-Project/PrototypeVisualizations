import { useMemo } from "react";

import { useViewStore } from "@/state";

interface BoxSelectionOverlayProps {
  panelId: string;
}

export function BoxSelectionOverlay({ panelId }: BoxSelectionOverlayProps) {
  const boxSelection = useViewStore((s) => s.boxSelection);
  const boxSelectionPanelId = useViewStore((s) => s.boxSelectionPanelId);
  const isBoxSelecting = useViewStore((s) => s.isBoxSelecting);

  const showBoxSelectionOverlay = isBoxSelecting && boxSelectionPanelId === panelId;

  const boxStyle = useMemo(() => {
    if (!boxSelection) return null;

    return {
      left: `${Math.min(boxSelection.start.x, boxSelection.end.x) * 100}%`,
      top: `${Math.min(boxSelection.start.y, boxSelection.end.y) * 100}%`,
      width: `${Math.abs(boxSelection.end.x - boxSelection.start.x) * 100}%`,
      height: `${Math.abs(boxSelection.end.y - boxSelection.start.y) * 100}%`,
    };
  }, [boxSelection]);

  if (!showBoxSelectionOverlay || !boxStyle) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute border-2 border-dashed border-blue-500 bg-blue-500/20" style={boxStyle} />
    </div>
  );
}
