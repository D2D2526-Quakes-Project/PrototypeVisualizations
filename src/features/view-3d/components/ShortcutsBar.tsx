/**
 * ShortcutsBar — contextual, icon-driven shortcut hints.
 *
 * Drop this in place of the static shortcuts <div> inside CanvasWithControls.
 * Pass the relevant state as props so the bar knows which shortcuts to surface.
 *
 * Usage:
 *   <ShortcutsBar
 *     isBoxSelecting={!!boxSelection}
 *     hasSelection={selectedNodeIds.size > 0}
 *     showPlayback={showPlaybackControls}
 *   />
 */

import {
  ArrowLeftRight,
  ArrowUpDown,
  BoxSelect,
  CameraIcon,
  ChevronFirst,
  Keyboard,
  MousePointer2,
  MoveHorizontal,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Shortcut = {
  icon: React.ReactNode;
  label: string;
  key: string; // keyboard hint shown on the right
};

// ─── Context map (no conditional sprawl) ─────────────────────────────────────
// Each entry is a "mode" with its own set of shortcuts.
// Priority: first matching mode wins, so order matters.

type Mode = {
  id: string;
  active: (ctx: ShortcutContext) => boolean;
  shortcuts: Shortcut[];
};

const MODES: Mode[] = [
  {
    id: "box-selecting",
    active: (ctx) => ctx.isBoxSelecting,
    shortcuts: [
      { icon: <BoxSelect size={11} />, label: "Finish box", key: "release" },
      { icon: <X size={11} />, label: "Cancel", key: "Esc" },
    ],
  },
  {
    id: "has-selection",
    active: (ctx) => ctx.hasSelection && !ctx.isBoxSelecting,
    shortcuts: [
      { icon: <BoxSelect size={11} />, label: "Replace selection", key: "Ctrl+drag" },
      { icon: <BoxSelect size={11} />, label: "Add to selection", key: "Shift+Ctrl+drag" },
      { icon: <X size={11} />, label: "Clear", key: "X" },
    ],
  },
  {
    id: "playback",
    active: (ctx) => !!ctx.showPlayback,
    shortcuts: [
      { icon: <ArrowLeftRight size={11} />, label: "Step", key: "←/→" },
      { icon: <MoveHorizontal size={11} />, label: "Skip 100", key: "Shift+←/→" },
      { icon: <ChevronFirst size={11} />, label: "Start/End", key: "Ctrl+←/→" },
      { icon: <BoxSelect size={11} />, label: "Box select", key: "Ctrl+drag" },
    ],
  },
  {
    id: "default",
    active: () => true,
    shortcuts: [
      { icon: <MousePointer2 size={11} />, label: "Orbit", key: "drag" },
      { icon: <ArrowUpDown size={11} />, label: "Zoom", key: "scroll" },
      { icon: <BoxSelect size={11} />, label: "Box select", key: "Ctrl+drag" },
      { icon: <Keyboard size={11} />, label: "Menu", key: "M" },
      { icon: <CameraIcon size={11} />, label: "Camera", key: "O" },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

type ShortcutContext = {
  isBoxSelecting: boolean;
  hasSelection: boolean;
  showPlayback: boolean;
};

export function ShortcutsBar(ctx: ShortcutContext) {
  const activeMode = MODES.find((m) => m.active(ctx))!;

  return (
    <div className="absolute bottom-2 left-2 z-50 pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeMode.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 border border-neutral-200">
          {/* Static icon anchor */}
          <Keyboard size={11} className=" shrink-0 mr-0.5" />

          {activeMode.shortcuts.map((s, i) => (
            <span key={i} className="flex items-center gap-0.5">
              {/* divider */}
              {i > 0 && <span className="w-px h-3 bg-neutral-200 mx-0.5" />}

              {/* icon */}
              <span className="">{s.icon}</span>

              {/* label */}
              <span className="text-[10px] text-neutral-400 leading-none">{s.label}</span>

              {/* key badge */}
              <kbd className="text-[9px] leading-none  bg-neutral-200 rounded px-1 py-0.5 font-mono border border-neutral-300">
                {s.key}
              </kbd>
            </span>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
