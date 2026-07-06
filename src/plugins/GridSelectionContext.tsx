import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface GridSelectionValue {
  /** Key of the currently selected column, or `null` when none is selected. */
  selectedColumnKey: string | null;
  /** Select a column (or pass `null` to clear the selection). */
  selectColumn: (key: string | null) => void;
}

const GridSelectionContext = createContext<GridSelectionValue>({
  selectedColumnKey: null,
  selectColumn: () => {},
});

/**
 * Shares the "selected column" between the overlay (which sets it on an
 * edge-click and pins its controls) and the toolbar (whose color pickers
 * retarget to the selected column). Provided once, inside the editor.
 */
export function GridSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedColumnKey, setSelectedColumnKey] = useState<string | null>(null);
  const value = useMemo(
    () => ({ selectedColumnKey, selectColumn: setSelectedColumnKey }),
    [selectedColumnKey],
  );
  return (
    <GridSelectionContext.Provider value={value}>
      {children}
    </GridSelectionContext.Provider>
  );
}

export function useGridSelection(): GridSelectionValue {
  return useContext(GridSelectionContext);
}
