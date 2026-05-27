import { useProfileActions, useProfileData } from "@/state";
import { useCallback, useEffect, useMemo, useState } from "react";
import { registerPanelFlush, setPanelSaving, unregisterPanelFlush } from "./panelSavingStore";
import type { PanelType } from "./MagicPanel";
import { useDebouncedCallback } from "@/lib/utils";

type SetterName<K extends string> = `set${Capitalize<K>}`;

type DynamicSetters<T> = {
  [K in Extract<keyof T, string> as SetterName<K>]: (value: T[K] | ((prev: T[K]) => T[K])) => void;
};

export type UsePanelStateReturn<T> = T &
  DynamicSetters<T> & {
    state: T;
    setState: (nextState: Partial<T> | ((prev: T) => Partial<T>)) => void;
    isSaving: boolean;
  };

function isUpdater<V>(value: V | ((prev: V) => V)): value is (prev: V) => V {
  return typeof value === "function";
}

export function usePanelState<T extends Record<keyof T, unknown>>(params: {
  panelId: string;
  panelType: PanelType;
  defaultState: T;
}): UsePanelStateReturn<T> {
  const { panelId, panelType, defaultState } = params;

  const { setPanelState: setGlobalPanelState } = useProfileActions();
  const savedPanelState = useProfileData((store) => store.panelStates[panelId]);

  const {
    call: debouncedSave,
    flush: flushSave,
    isPending: isSaving,
  } = useDebouncedCallback((id: string, type: string, state: unknown) => {
    setPanelSaving(id, false);
    setGlobalPanelState(id, type, state);
  }, 1000);

  useEffect(() => {
    registerPanelFlush(panelId, flushSave);
    return () => unregisterPanelFlush(panelId);
  }, [panelId, flushSave]);

  const [localState, setLocalState] = useState<T>(() => {
    if (savedPanelState?.type !== panelType) {
      return defaultState;
    }
    return { ...defaultState, ...(savedPanelState.state as Partial<T>) };
  });

  const saveWithTracking = useCallback(
    (id: string, type: string, state: unknown) => {
      setPanelSaving(id, true);
      debouncedSave(id, type, state);
    },
    [debouncedSave]
  );

  const setState = useCallback(
    (updater: Partial<T> | ((prev: T) => Partial<T>)) => {
      setLocalState((prev) => {
        const updates = typeof updater === "function" ? updater(prev) : updater;
        const nextState = { ...prev, ...updates };
        saveWithTracking(panelId, panelType, nextState);
        return nextState;
      });
    },
    [panelId, panelType, saveWithTracking]
  );

  // Generate the setters
  const dynamicSetters = useMemo(() => {
    const generatedSetters = {} as DynamicSetters<T>;

    const keys = Object.keys(defaultState) as Array<Extract<keyof T, string>>;

    for (const key of keys) {
      const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
      const setterName = `set${capitalizedKey}` as SetterName<typeof key>;

      generatedSetters[setterName] = ((valueOrUpdater: T[typeof key] | ((prev: T[typeof key]) => T[typeof key])) => {
        setLocalState((prev) => {
          const newValue = isUpdater(valueOrUpdater) ? valueOrUpdater(prev[key]) : valueOrUpdater;

          const nextState = { ...prev, [key]: newValue };
          saveWithTracking(panelId, panelType, nextState);
          return nextState;
        });
      }) as DynamicSetters<T>[SetterName<typeof key>];
    }

    return generatedSetters;
  }, [defaultState, saveWithTracking, panelId, panelType]);

  return {
    ...localState,
    ...dynamicSetters,
    state: localState,
    setState,
    isSaving,
  };
}
