interface ViewsPanelProps {
  resetView: (
    view: "top" | "bottom" | "left" | "right" | "front" | "back" | "frontRight" | "frontLeft" | "backRight" | "backLeft"
  ) => void;
}

const viewButtons: {
  view: "top" | "bottom" | "left" | "right" | "front" | "back" | "frontRight" | "frontLeft" | "backRight" | "backLeft";
  label: string;
}[] = [
  { view: "front", label: "+Y" },
  { view: "right", label: "+X" },
  { view: "back", label: "-Y" },
  { view: "left", label: "-X" },
  { view: "top", label: "Top" },
  { view: "bottom", label: "Bottom" },
  { view: "frontRight", label: "NE" },
  { view: "frontLeft", label: "NW" },
  { view: "backRight", label: "SE" },
  { view: "backLeft", label: "SW" },
];

export function ViewsPanel({ resetView }: ViewsPanelProps) {
  return (
    <div className="mb-2 grid w-full grid-cols-3 gap-1">
      {viewButtons.map(({ view, label }) => (
        <button
          key={view}
          onClick={() => resetView(view)}
          className="w-full rounded border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-xs transition-colors hover:bg-neutral-200">
          {label}
        </button>
      ))}
    </div>
  );
}
