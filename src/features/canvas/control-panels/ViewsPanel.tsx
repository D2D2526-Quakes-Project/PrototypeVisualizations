import { Home } from "lucide-react";
import { VIEW_PRESET_OPTIONS, type ViewPresetMode } from "../viewPresets";

interface ViewsPanelProps {
  resetView: (view: ViewPresetMode) => void;
  resetHomeView: () => void;
}

export function ViewsPanel({ resetView, resetHomeView }: ViewsPanelProps) {
  return (
    <div className="mb-2 grid w-full grid-cols-4 gap-1">
      {VIEW_PRESET_OPTIONS.map(({ view, label }) => (
        <button
          key={view}
          onClick={() => resetView(view)}
          className="w-full rounded border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-xs transition-colors hover:bg-neutral-200">
          {label}
        </button>
      ))}
      <button
        onClick={resetHomeView}
        className="col-span-2 inline-flex w-full items-center justify-center gap-1 rounded border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-xs transition-colors hover:bg-neutral-200">
        <Home size={12} />
        Home View
      </button>
    </div>
  );
}
