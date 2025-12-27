/**
 * TabBurrow - 選択モードフック
 */

import { useState, useCallback } from 'react';

export function useSelection() {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTabIds, setSelectedTabIds] = useState<Set<string>>(new Set());

  // モード切替
  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => {
      if (prev) {
        // 終了時にクリア
        setSelectedTabIds(new Set());
      }
      return !prev;
    });
  }, []);

  // 個別選択トグル
  const toggleSelection = useCallback((id: string) => {
    setSelectedTabIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 全選択・全解除（対象IDリストを受け取る）
  const selectAll = useCallback((ids: string[]) => {
    setSelectedTabIds(new Set(ids));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedTabIds(new Set());
  }, []);

  // 部分追加・削除
  const addSelection = useCallback((ids: string[]) => {
    setSelectedTabIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  }, []);

  const removeSelection = useCallback((ids: string[]) => {
    setSelectedTabIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTabIds(new Set());
    setIsSelectionMode(false);
  }, []);

  return {
    isSelectionMode,
    setIsSelectionMode,
    selectedTabIds,
    setSelectedTabIds,
    toggleSelectionMode,
    toggleSelection,
    selectAll,
    deselectAll,
    addSelection,
    removeSelection,
    clearSelection
  };
}
