import { createContext, useContext, useSyncExternalStore, useMemo, type ReactNode } from "react";
import { createViewStore, type ViewStore, type ViewState } from "./viewStore";

const ViewStoreContext = createContext<ViewStore | null>(null);

export function ViewProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => createViewStore(), []);
  
  return <ViewStoreContext.Provider value={store}>{children}</ViewStoreContext.Provider>;
}

export function useViewStore<T>(selector: (state: ViewState) => T): T {
  const store = useContext(ViewStoreContext);
  if (!store) {
    throw new Error("useViewStore must be used within ViewProvider");
  }
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}

export function useViewStoreRaw(): ViewStore {
  const store = useContext(ViewStoreContext);
  if (!store) {
    throw new Error("useViewStoreRaw must be used within ViewProvider");
  }
  return store;
}

export { ViewStoreContext };
export type { ViewState };
