import React, { useState, useEffect } from "react";
import { Share2, Copy, Save, FolderOpen, Trash2, ChevronDown } from "lucide-react";
import {
  copyShareableUrlToClipboard,
  deleteNamedPreset,
  getDefaultAppState,
  loadNamedPresets,
  saveNamedPreset,
  saveToLocalStorage,
  type AppState,
} from "../lib/statePersistence";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useViewStoreRaw } from "@/stores";

interface ShareButtonProps {
  className?: string;
}

export function ShareButton({ className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [presets, setPresets] = useState<{ name: string; createdAt: number }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const store = useViewStoreRaw();

  useEffect(() => {
    const loadedPresets = loadNamedPresets();
    const presetData = loadedPresets.map((p) => ({ name: p.name, createdAt: p.createdAt }));
    requestAnimationFrame(() => {
      setPresets(presetData);
    });
  }, [isOpen]);

  const getCurrentState = (): AppState => {
    const state = store.getState();
    
    return {
      version: 1,
      timestamp: Date.now(),
      frameIndex: state.frameIndex,
      currentMetric: state.currentMetric,
      thresholdHighlighting: state.thresholdHighlighting,
      thresholds: state.thresholds,
      visibleFloors: state.visibleFloors,
      selectedNodeIds: state.selectedNodeIds,
      hideSelectedNodes: state.hideSelectedNodes,
      explodedView: state.explodedView,
      sliceEnabled: state.sliceEnabled,
      xRange: state.xRange,
      yRange: state.yRange,
      zRange: state.zRange,
      camera: state.cameraState,
      backgroundColor: state.backgroundColor,
      layout: state.dockviewLayout ?? getDefaultAppState().layout,
      panelStates: state.panelStates,
    };
  };

  const handleCopyShortLink = async () => {
    const state = getCurrentState();
    const success = await copyShareableUrlToClipboard(state, false);

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyFullLink = async () => {
    const state = getCurrentState();
    const success = await copyShareableUrlToClipboard(state, true);

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSavePreset = () => {
    const name = prompt("Enter a name for this preset:");
    if (name) {
      const state = getCurrentState();
      saveNamedPreset(name, state);
      setSavedMessage(`Saved "${name}"`);
      setTimeout(() => setSavedMessage(""), 2000);
      const loadedPresets = loadNamedPresets();
      setPresets(loadedPresets.map((p) => ({ name: p.name, createdAt: p.createdAt })));
    }
  };

  const handleLoadPreset = (name: string) => {
    const preset = loadNamedPresets().find((p) => p.name === name);
    if (preset) {
      saveToLocalStorage(preset.state);
      window.location.reload();
    }
  };

  const handleDeletePreset = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete preset "${name}"?`)) {
      deleteNamedPreset(name);
      const loadedPresets = loadNamedPresets();
      setPresets(loadedPresets.map((p) => ({ name: p.name, createdAt: p.createdAt })));
    }
  };

  const handleResetToDefaults = () => {
    if (confirm("Reset all settings to defaults? This cannot be undone.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button title="Share / Save" variant={"secondary"} size="sm" className={className}>
          <Share2 size={16} />
          <span className="ml-1">Share</span>
          <ChevronDown size={14} className="ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="end">
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold text-neutral-500 px-2 py-1">Share Link</div>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={handleCopyShortLink}>
            <Copy size={14} className="mr-2" />
            Copy Short Link
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={handleCopyFullLink}>
            <Copy size={14} className="mr-2" />
            Copy Full Link
          </Button>

          <div className="border-t border-neutral-200 my-1" />

          <div className="text-xs font-semibold text-neutral-500 px-2 py-1">Presets</div>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={handleSavePreset}>
            <Save size={14} className="mr-2" />
            Save Current State
          </Button>

          {presets.length > 0 ? (
            <>
              <div className="border-t border-neutral-200 my-1" />
              {presets.map((preset) => (
                <div
                  key={preset.name}
                  className="flex items-center justify-between px-2 py-1 hover:bg-neutral-100 rounded cursor-pointer"
                  onClick={() => handleLoadPreset(preset.name)}>
                  <div className="flex items-center">
                    <FolderOpen size={14} className="mr-2 text-neutral-500" />
                    <span className="text-sm">{preset.name}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeletePreset(preset.name, e)}
                    className="p-1 hover:bg-neutral-200 rounded">
                    <Trash2 size={12} className="text-neutral-400 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </>
          ) : null}

          <div className="border-t border-neutral-200 my-1" />

          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleResetToDefaults}>
            <Trash2 size={14} className="mr-2" />
            Reset to Defaults
          </Button>

          {savedMessage && (
            <div className="text-xs text-green-600 px-2 py-1">{savedMessage}</div>
          )}

          {copied && (
            <div className="text-xs text-green-600 px-2 py-1">Link copied to clipboard!</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
