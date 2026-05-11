import { Home } from "lucide-react";
import { VIEW_PRESET_OPTIONS, type ViewPresetMode } from "../viewPresets";
import { Button } from "@/components/ui/button";

interface ViewsPanelProps {
  resetView: (view: ViewPresetMode) => void;
  resetHomeView: () => void;
}

export function ViewsPanel({ resetView, resetHomeView }: ViewsPanelProps) {
  return (
    <div className="grid w-full grid-cols-4 gap-px">
      {VIEW_PRESET_OPTIONS.map(({ view, label }) => (
        <Button key={view} size="xs" variant={"outline"} onClick={() => resetView(view)}>
          {label}
        </Button>
      ))}
      <Button size="xs" variant={"outline"} className="col-span-2" onClick={resetHomeView}>
        <Home size={12} />
        Home View
      </Button>
    </div>
  );
}
