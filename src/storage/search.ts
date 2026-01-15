/**
 * storage/search.ts - 検索ロジック
 */

import { type SavedTab } from '../dbSchema';
import { getAllTabs } from './tabs';

/**
 * URL/タイトルで検索（オプション付き）
 */
export async function searchTabs(
  query: string,
  options?: {
    caseSensitive?: boolean;
    wholeWord?: boolean;
    useRegex?: boolean;
  }
): Promise<SavedTab[]> {
  const allTabs = await getAllTabs();
  
  if (!query.trim()) {
    return allTabs;
  }
  
  const caseSensitive = options?.caseSensitive ?? false;
  const wholeWord = options?.wholeWord ?? false;
  const useRegex = options?.useRegex ?? false;
  
  const matchFn = createMatchFunction(query, { caseSensitive, wholeWord, useRegex });
  
  if (!matchFn) {
    return [];
  }
  
  return allTabs.filter(tab => 
    matchFn(tab.url) || matchFn(tab.title) || (tab.displayName && matchFn(tab.displayName))
  );
}

/**
 * 検索マッチ関数を生成
 */
function createMatchFunction(
  query: string,
  options: { caseSensitive: boolean; wholeWord: boolean; useRegex: boolean }
): ((text: string) => boolean) | null {
  const { caseSensitive, wholeWord, useRegex } = options;
  
  if (useRegex) {
    try {
      let pattern = query;
      if (wholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      const flags = caseSensitive ? '' : 'i';
      const regex = new RegExp(pattern, flags);
      return (text: string) => regex.test(text);
    } catch {
      return null;
    }
  } else {
    if (wholeWord) {
      try {
        const escapedQuery = escapeRegExp(query);
        const pattern = `\\b${escapedQuery}\\b`;
        const flags = caseSensitive ? '' : 'i';
        const regex = new RegExp(pattern, flags);
        return (text: string) => regex.test(text);
      } catch {
        return null;
      }
    } else {
      if (caseSensitive) {
        return (text: string) => text.includes(query);
      } else {
        const lowerQuery = query.toLowerCase();
        return (text: string) => text.toLowerCase().includes(lowerQuery);
      }
    }
  }
}

/**
 * 正規表現の特殊文字をエスケープ
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
