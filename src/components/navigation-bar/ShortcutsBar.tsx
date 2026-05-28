import {
  ArrowDownUp,
  ArrowLeftRight,
  BoxSelect,
  CameraIcon,
  ChevronFirst,
  CircleDashed,
  Keyboard,
  MousePointer2,
  Palette,
  Play,
  MousePointerClick,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { MetricColorsBar } from "./MetricColorsBar";

type Shortcut = {
  icon: React.ReactNode;
  label: string;
  description?: string;
  key: string;
};

type Section = {
  label: string;
  shortcuts: Shortcut[];
  mouseShortcuts?: Shortcut[];
};

const shortcuts: Section[] = [
  {
    label: "General",
    shortcuts: [
      {
        icon: <MousePointerClick size={14} />,
        label: "Open node",
        description: "Inspect the clicked node",
        key: "Click",
      },
      {
        icon: <MousePointer2 size={14} />,
        label: "Orbit",
        description: "Rotate the 3-D view",
        key: "L-Drag",
      },
      {
        icon: <CircleDashed size={14} />,
        label: "Pan",
        description: "Translate the camera",
        key: "R-Drag",
      },
      {
        icon: <ArrowDownUp size={14} />,
        label: "Zoom",
        description: "Scroll to zoom in/out",
        key: "Wheel",
      },
    ],
  },
  {
    label: "Box Selection",
    shortcuts: [
      {
        icon: <BoxSelect size={14} />,
        label: "Finish selection",
        description: "Release drag to confirm",
        key: "Release",
      },
      {
        icon: <X size={14} />,
        label: "Cancel",
        description: "Release Ctrl during drag to discard",
        key: "Ctrl↑",
      },
    ],
    mouseShortcuts: [
      {
        icon: <MousePointer2 size={14} />,
        label: "Draw selection",
        description: "Drag to define region",
        key: "Drag",
      },
    ],
  },
  {
    label: "Selection Active",
    shortcuts: [
      {
        icon: <BoxSelect size={14} />,
        label: "Replace selection",
        description: "Draw a new box to replace",
        key: "Ctrl+Drag",
      },
      {
        icon: <X size={14} />,
        label: "Clear selection",
        description: "Deselect all nodes",
        key: "X",
      },
    ],
  },
  {
    label: "Playback Mode",
    shortcuts: [
      {
        icon: <Play size={14} />,
        label: "Play / Pause",
        description: "Start or stop playback",
        key: "Space",
      },
      {
        icon: <ArrowLeftRight size={14} />,
        label: "Step frame",
        description: "Advance or rewind one step",
        key: "← / →",
      },
      {
        icon: <ChevronFirst size={14} />,
        label: "Big step",
        description: "Jump 100 frames forward or back",
        key: "⇧+← / →",
      },
      {
        icon: <ChevronFirst size={14} />,
        label: "Jump to ends",
        description: "Go to first or last frame",
        key: "Ctrl+← / →",
      },
    ],
  },
  {
    label: "Navigation",
    shortcuts: [
      {
        icon: <ZoomIn size={14} />,
        label: "Zoom in",
        description: "Zoom in on active canvas",
        key: "+ / =",
      },
      {
        icon: <ZoomOut size={14} />,
        label: "Zoom out",
        description: "Zoom out on active canvas",
        key: "-",
      },
      {
        icon: <Keyboard size={14} />,
        label: "Toggle view panel",
        description: "Open or close the view controls",
        key: "M",
      },
      {
        icon: <CameraIcon size={14} />,
        label: "Toggle orthographic",
        description: "Switch between 3-D and flat view",
        key: "O",
      },
      {
        icon: <Keyboard size={14} />,
        label: "Help / shortcuts",
        description: "Open this shortcut reference",
        key: "Ctrl+/",
      },
    ],
  },
];

function ShortcutRow({ shortcut, index }: { shortcut: Shortcut; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, delay: index * 0.04 }}
      className="hover:bg-border/60 flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors">
      {/* Icon */}
      <span className="border-border bg-background text-muted-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-md border shadow-sm">
        {shortcut.icon}
      </span>

      {/* Label + description */}
      <span className="min-w-0 flex-1">
        <span className="text-foreground block truncate text-xs leading-tight font-medium">{shortcut.label}</span>
        {shortcut.description && (
          <span className="text-muted-foreground block truncate text-[10px] leading-tight">{shortcut.description}</span>
        )}
      </span>

      {/* Key badge */}
      <kbd className="border-border bg-muted text-muted-foreground ml-auto shrink-0 rounded-md border px-2 py-1 font-mono text-[10px] leading-none font-medium shadow-sm">
        {shortcut.key}
      </kbd>
    </motion.div>
  );
}

function SectionHeader({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 pt-0.5 pb-1">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">{label}</span>
    </div>
  );
}

export function ShortcutsBar() {
  return (
    <div className="border-border bg-muted flex h-full w-full flex-col overflow-hidden border-t">
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {shortcuts.map((section) => (
              <div key={section.label}>
                <SectionHeader label={section.label} />
                <div className="flex flex-col gap-0.5">
                  {[...section.shortcuts, ...(section.mouseShortcuts ?? [])].map((s, i) => (
                    <ShortcutRow key={`${section.label}-${i}`} shortcut={s} index={i} />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        <div className="h-8" />
        <SectionHeader icon={<Palette size={11} />} label="Thresholds & Colors" />
        <MetricColorsBar />
      </div>
    </div>
  );
}
