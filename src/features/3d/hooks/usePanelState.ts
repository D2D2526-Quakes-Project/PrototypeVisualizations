import { useMemo } from "react";

export function usePanelState<T>(params: {
  panelId: string | undefined;
  fallbackPanelId: string;
  panelType: string;
  defaultState: T;
}): {
  panelId: string;
  state: T;
  setState: (nextState: T) => void;
} {
  const { panelId: maybePanelId, fallbackPanelId, panelType, defaultState } = params;
  const panelId = maybePanelId ?? fallbackPanelId;
  const setPanelState = useViewStore((store) => store.setPanelState);
  const savedPanelState = useViewStore((store) => store.panelStates[panelId]);

  const state = useMemo(() => {
    if (savedPanelState?.type !== panelType) {
      return defaultState;
    }
    return savedPanelState.state as T;
  }, [defaultState, panelType, savedPanelState]);

  return {
    panelId,
    state,
    setState: (nextState) => setPanelState(panelId, panelType, nextState),
  };
}
