/**
 * TabBurrow - 検索・フィルタリングフック
 */

import { useState, useCallback, useEffect } from 'react';
import { searchTabs } from '../../storage';
import type { SavedTab, SearchOptions, DateRangeFilter } from '../types';
import { DEFAULT_SEARCH_OPTIONS } from '../types';

export function useSearch(allTabs: SavedTab[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOptions, setSearchOptions] = useState<SearchOptions>(DEFAULT_SEARCH_OPTIONS);
  const [dateRange, setDateRange] = useState<DateRangeFilter>({ startDate: null, endDate: null });
  const [filteredTabs, setFilteredTabs] = useState<SavedTab[]>([]);
  const [regexError, setRegexError] = useState<string | null>(null);

  // 日時フィルタリング関数
  const applyDateFilter = useCallback((tabs: SavedTab[]) => {
    if (!dateRange.startDate && !dateRange.endDate) {
      return tabs;
    }

    return tabs.filter((tab) => {
      const savedDate = new Date(tab.savedAt);
      const year = savedDate.getFullYear();
      const month = String(savedDate.getMonth() + 1).padStart(2, '0');
      const day = String(savedDate.getDate()).padStart(2, '0');
      const savedDateStr = `${year}-${month}-${day}`;

      if (dateRange.startDate && savedDateStr < dateRange.startDate) {
        return false;
      }
      if (dateRange.endDate && savedDateStr > dateRange.endDate) {
        return false;
      }
      return true;
    });
  }, [dateRange]);

  // 検索とフィルタ適用
  const applyFilters = useCallback(async () => {
    let results = allTabs;

    // 検索クエリがある場合
    if (searchQuery.trim()) {
      try {
        results = await searchTabs(searchQuery, searchOptions);
        
        // 正規表現エラーチェック
        if (searchOptions.useRegex && results.length === 0) {
          try {
            new RegExp(searchQuery);
            setRegexError(null);
          } catch {
            setRegexError(searchQuery);
            setFilteredTabs([]);
            return;
          }
        } else {
          setRegexError(null);
        }
      } catch (error) {
        console.error('検索エラー:', error);
      }
    } else {
      setRegexError(null);
    }

    // 日時フィルタ適用
    results = applyDateFilter(results);

    setFilteredTabs(results);
  }, [allTabs, searchQuery, searchOptions, applyDateFilter]);

  // 検索実行ハンドラ
  const handleSearch = useCallback((query: string, options?: SearchOptions) => {
    setSearchQuery(query);
    if (options) {
      setSearchOptions(options);
    }
  }, []);

  // 依存関係が変わったらフィルタ再適用
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // allTabsが変わったら再適用（applyFiltersに含まれているが明示的に再実行）

  return {
    searchQuery,
    setSearchQuery, // 互換性のため
    searchOptions,
    setSearchOptions: handleSearch, // handleSearch経由で更新
    onSearchOptionsChange: setSearchOptions, // 直接更新用
    dateRange,
    setDateRange,
    filteredTabs,
    regexError,
    handleSearch,
  };
}
