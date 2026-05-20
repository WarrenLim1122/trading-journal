import { useCallback, useState, useMemo } from "react";

/**
 * Generic bulk-selection hook for any list of `{ id: string }` items.
 *
 * - `isAllSelected` is true iff every currently-visible item is selected.
 * - `toggleAll` selects all visible items, or clears the selection if every
 *   visible item is already selected.
 * - `exit()` also clears the current selection.
 * - `clearOnFilterChange()` is an explicit reset hook for callers to invoke
 *   when their filter/sort state changes and the visible set shifts.
 */
export function useBulkSelect<T extends { id: string }>(items: T[]) {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedCount = selectedIds.size;
  const isAllSelected = useMemo(
    () => items.length > 0 && items.every((it) => selectedIds.has(it.id)),
    [items, selectedIds]
  );

  const enter = useCallback(() => setIsSelectMode(true), []);
  const exit = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, []);
  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (items.length > 0 && items.every((it) => prev.has(it.id))) {
        return new Set();
      }
      return new Set(items.map((it) => it.id));
    });
  }, [items]);
  const clearOnFilterChange = useCallback(() => setSelectedIds(new Set()), []);

  return {
    isSelectMode,
    selectedIds,
    selectedCount,
    isAllSelected,
    enter,
    exit,
    toggle,
    toggleAll,
    clearOnFilterChange,
  };
}
