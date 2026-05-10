import { debounce } from "@/lib/utils";
import { useProfileStore } from "@/state";
import { useMemo, useState, useCallback } from "react";

type SetterName<K extends string> = `set${Capitalize<K>}`;

type DynamicSetters<T> = {
  [K in Extract<keyof T, string> as SetterName<K>]: (value: T[K] | ((prev: T[K]) => T[K])) => void;
};

// 3. Combined Return Type
export type UsePanelStateReturn<T> = T &
  DynamicSetters<T> & {
    state: T;
    setState: (nextState: Partial<T> | ((prev: T) => Partial<T>)) => void;
  };

// 4. Custom Type Guard: Safely narrows function updaters vs literal values
function isUpdater<V>(value: V | ((prev: V) => V)): value is (prev: V) => V {
  return typeof value === "function";
}

export function usePanelState<T extends Record<keyof T, unknown>>(params: {
  panelId: string;
  panelType: string;
  defaultState: T;
}): UsePanelStateReturn<T> {
  const { panelId, panelType, defaultState } = params;

  const setGlobalPanelState = useProfileStore((store) => store.setPanelState);
  const savedPanelState = useProfileStore((store) => store.panelStates[panelId]);

  const debouncedSave = useMemo(
    () => debounce((id: string, type: string, state: unknown) => setGlobalPanelState(id, type, state), 1000),
    [setGlobalPanelState]
  );

  const [localState, setLocalState] = useState<T>(() => {
    if (savedPanelState?.type !== panelType) {
      return defaultState;
    }
    // Safely cast to Partial<T> rather than 'any' or 'T' for a safer spread
    return { ...defaultState, ...(savedPanelState.state as Partial<T>) };
  });

  const setState = useCallback(
    (updater: Partial<T> | ((prev: T) => Partial<T>)) => {
      setLocalState((prev) => {
        // Utilizing our custom type guard here!
        const updates = typeof updater === "function" ? updater(prev) : updater;
        const nextState = { ...prev, ...updates };
        debouncedSave(panelId, panelType, nextState);
        return nextState;
      });
    },
    [panelId, panelType, debouncedSave]
  );

  // Generate the setters strictly
  const dynamicSetters = useMemo(() => {
    const generatedSetters = {} as DynamicSetters<T>;

    // Strictly type the keys of our object
    const keys = Object.keys(defaultState) as Array<Extract<keyof T, string>>;

    for (const key of keys) {
      const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
      const setterName = `set${capitalizedKey}` as SetterName<typeof key>;

      // Strictly typed setter implementation
      generatedSetters[setterName] = ((valueOrUpdater: T[typeof key] | ((prev: T[typeof key]) => T[typeof key])) => {
        setLocalState((prev) => {
          // The type guard completely removes the need for 'any' casting here
          const newValue = isUpdater(valueOrUpdater) ? valueOrUpdater(prev[key]) : valueOrUpdater;

          const nextState = { ...prev, [key]: newValue };
          debouncedSave(panelId, panelType, nextState);
          return nextState;
        });
      }) as DynamicSetters<T>[SetterName<typeof key>];
    }

    return generatedSetters;
  }, [defaultState, debouncedSave, panelId, panelType]);

  // Combine cleanly instead of modifying an existing object
  return {
    ...localState,
    ...dynamicSetters,
    state: localState,
    setState,
  };
}
