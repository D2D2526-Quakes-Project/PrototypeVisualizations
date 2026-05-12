import {
  ArrowDownUp,
  ArrowLeftRight,
  BoxSelect,
  CameraIcon,
  ChevronFirst,
  CircleDashed,
  Keyboard,
  MousePointer2,
  Play,
  MousePointerClick,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

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
      className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-neutral-200/60">
      {/* Icon */}
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 shadow-sm">
        {shortcut.icon}
      </span>

      {/* Label + description */}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs leading-tight font-medium text-neutral-700">{shortcut.label}</span>
        {shortcut.description && (
          <span className="block truncate text-[10px] leading-tight text-neutral-400">{shortcut.description}</span>
        )}
      </span>

      {/* Key badge */}
      <kbd className="ml-auto shrink-0 rounded-md border border-neutral-300 bg-neutral-100 px-2 py-1 font-mono text-[10px] leading-none font-medium text-neutral-600 shadow-sm shadow-neutral-300">
        {shortcut.key}
      </kbd>
    </motion.div>
  );
}

function SectionHeader({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 pt-0.5 pb-1">
      {icon && <span className="text-neutral-400">{icon}</span>}
      <span className="text-[10px] font-semibold tracking-widest text-neutral-400 uppercase">{label}</span>
    </div>
  );
}

export function ShortcutsBar() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden border-t border-neutral-200 bg-neutral-50">
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
      </div>
    </div>
  );
}
