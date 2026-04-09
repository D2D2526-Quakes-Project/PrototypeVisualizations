import type { ViewMode } from "@/features/view-3d/contexts/visualization/ViewModeContext";

interface ViewModeSelectProps {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  cornersOnly: boolean;
  setCornersOnly: (value: boolean) => void;
}

const viewModes: { value: ViewMode; label: string }[] = [
  { value: "all-nodes", label: "All Nodes" },
  { value: "floor-slabs", label: "Floor Slabs" },
];

export function ViewModeSelect({ mode, setMode, cornersOnly, setCornersOnly }: ViewModeSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as ViewMode)}
        className="w-full cursor-pointer rounded border border-neutral-300 bg-neutral-100 px-2 py-1 text-xs transition-colors hover:bg-neutral-200">
        {viewModes.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <label className="flex cursor-pointer items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={cornersOnly}
          onChange={(e) => setCornersOnly(e.target.checked)}
          className="cursor-pointer"
        />
        Corners Only
      </label>
    </div>
  );
}
