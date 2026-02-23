import { useEffect, useRef, useCallback } from "react";
import { useViewStoreRaw } from "@/state";
import {
  getDataSelectionFromCurrentUrl,
  saveToLocalStorage,
  type AppState,
} from "@/features/view-3d/lib/statePersistence";

const AUTO_SAVE_DEBOUNCE_MS = 2000;
const PLAYBACK_SAVE_DEBOUNCE_MS = 5000;

export function useAutoSave() {
  const store = useViewStoreRaw();
  const debounceTimerRef = useRef<number | null>(null);
  const lastSavedStateRef = useRef<string | null>(null);
  const isPlayingRef = useRef(false);

  const getCurrentState = useCallback((): AppState => {
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
      hiddenNodeIds: state.hiddenNodeIds,
      hideSelectedNodes: state.hideSelectedNodes,
      expandedScale: state.expandedScale,
      sliceEnabled: state.sliceEnabled,
      xRange: state.xRange,
      yRange: state.yRange,
      zRange: state.zRange,
      camera: state.cameraState,
      backgroundColor: state.backgroundColor,
      layout: state.dockviewLayout,
      panelStates: state.panelStates,
      dataSelection: getDataSelectionFromCurrentUrl() ?? undefined,
    };
  }, [store]);

  const performSave = useCallback(() => {
    const currentState = getCurrentState();
    const stateJson = JSON.stringify(currentState);

    if (stateJson !== lastSavedStateRef.current) {
      saveToLocalStorage(currentState);
      lastSavedStateRef.current = stateJson;
    }
  }, [getCurrentState]);

  const scheduleSave = useCallback((immediate = false) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (immediate) {
      performSave();
      return;
    }

    const debounceMs = isPlayingRef.current ? PLAYBACK_SAVE_DEBOUNCE_MS : AUTO_SAVE_DEBOUNCE_MS;
    debounceTimerRef.current = window.setTimeout(() => {
      performSave();
    }, debounceMs);
  }, [performSave]);

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    const stateFields = [
      "frameIndex",
      "currentMetric",
      "thresholdHighlighting",
      "thresholds",
      "visibleFloors",
      "selectedNodeIds",
      "hiddenNodeIds",
      "hideSelectedNodes",
      "expandedScale",
      "sliceEnabled",
      "xRange",
      "yRange",
      "zRange",
      "cameraState",
      "backgroundColor",
      "panelStates",
    ] as const;

    stateFields.forEach((field) => {
      const unsubscribe = store.subscribe(
        (state) => (state as unknown as Record<string, unknown>)[field],
        () => {
          if (field === "frameIndex" && !isPlayingRef.current) {
            scheduleSave(true);
            return;
          }
          scheduleSave();
        }
      );
      unsubscribers.push(unsubscribe);
    });

    const layoutUnsubscribe = store.subscribe(
      (state) => state.dockviewLayout,
      () => {
        scheduleSave();
      }
    );
    unsubscribers.push(layoutUnsubscribe);

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [store, scheduleSave]);

  useEffect(() => {
    const unsubscribe = store.subscribe(
      (state) => state.playing,
      (playing) => {
        isPlayingRef.current = playing;
        if (!playing) {
          scheduleSave(true);
        }
      }
    );

    return () => unsubscribe();
  }, [store, scheduleSave]);

  useEffect(() => {
    const flushSave = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      performSave();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushSave();
      }
    };

    window.addEventListener("beforeunload", flushSave);
    window.addEventListener("pagehide", flushSave);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", flushSave);
      window.removeEventListener("pagehide", flushSave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [performSave]);

  return { performSave };
}
