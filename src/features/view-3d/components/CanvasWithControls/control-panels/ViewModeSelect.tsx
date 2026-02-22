import type { ViewMode } from "@/features/view-3d/contexts/visualization/ViewModeContext";

interface ViewModeSelectProps {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
}

const viewModes: { value: ViewMode; label: string }[] = [
  { value: "all-nodes", label: "All Nodes" },
  { value: "floor-slabs", label: "Floor Slabs" },
  { value: "corners-only", label: "Corners Only" },
  { value: "vertical-connections", label: "Vertical Connections" },
  { value: "threshold", label: "Damage Threshold" },
];

export function ViewModeSelect({ mode, setMode }: ViewModeSelectProps) {
  return (
    <select
      value={mode}
      onChange={(e) => setMode(e.target.value as ViewMode)}
      className="w-full text-xs px-2 py-1 bg-neutral-100 border border-neutral-300 rounded hover:bg-neutral-200 transition-colors cursor-pointer">
      {viewModes.map(({ value, label }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
