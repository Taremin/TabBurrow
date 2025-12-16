/**
 * TabBurrow - 型定義
 */

// ソート関連の型はsettings.tsからre-export
export type { GroupSortType, ItemSortType } from '../settings.js';

// ストレージの型をre-export
export type { GroupType, SavedTab, CustomGroupMeta } from '../storage.js';

// SavedTabをインポート（interface内で使用するため）
import type { SavedTab } from '../storage.js';

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

// 表示モードの型
// grouped: グループ表示（デフォルト）, flat: フラット表示
export type ViewMode = 'grouped' | 'flat';

// グループごとのフィルタ状態（正規表現パターン）
export interface GroupFilter {
  [groupName: string]: string;
}
