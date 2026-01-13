/**
 * TabBurrow - 型定義
 */

// ソート関連の型はsettings.tsからre-export
export type { GroupSortType, ItemSortType, CustomSortKeyOrder } from '../settings';

// ストレージの型をre-export
export type { GroupType, SavedTab, CustomGroupMeta } from '../storage';

// SavedTabをインポート（interface内で使用するため）
import type { SavedTab } from '../storage';

// グループの型（汎用）
export interface TabGroup {
  name: string;           // グループ名（ドメイン名またはカスタムグループ名）
  groupType: 'domain' | 'custom';
  tabs: SavedTab[];
}

// 後方互換性のためDomainGroupも維持
export interface DomainGroup {
  domain: string;
  tabs: SavedTab[];
}

// 日時フィルターの型
export interface DateRangeFilter {
  startDate: string | null; // YYYY-MM-DD形式、nullはフィルターなし
  endDate: string | null;   // YYYY-MM-DD形式、nullはフィルターなし
}

// 表示モード・表示密度はsettings.tsからre-export（一元管理）
export type { ViewMode, DisplayDensity } from '../settings';

// グループごとのフィルタ状態（正規表現パターン）
export interface GroupFilter {
  [groupName: string]: string;
}

// 検索オプション（エディタ風トグルボタン用）
export interface SearchOptions {
  caseSensitive: boolean;  // [Aa] 大文字/小文字を区別
  wholeWord: boolean;      // [ab] 単語単位で検索
  useRegex: boolean;       // [.*] 正規表現モード
}

// 検索オプションのデフォルト値
export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  caseSensitive: false,
  wholeWord: false,
  useRegex: false,
};
