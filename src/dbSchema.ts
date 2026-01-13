/**
 * TabBurrow - IndexedDBスキーマ定義
 * 本体とテストの両方から参照される共通定義
 */

// ======================
// 定数定義
// ======================

/** データベース名 */
export const DB_NAME = 'TabBurrowDB';

/** データベースバージョン */
export const DB_VERSION = 8;

/** タブストア名 */
export const TABS_STORE_NAME = 'tabs';

/** カスタムグループストア名 */
export const CUSTOM_GROUPS_STORE_NAME = 'customGroups';

/** バックアップストア名 */
export const BACKUPS_STORE_NAME = 'backups';

/** ゴミ箱ストア名 */
export const TRASH_STORE_NAME = 'trash';

// ======================
// 型定義
// ======================

/** グループタイプ */
export type GroupType = 'domain' | 'custom';

/**
 * 保存するタブの型定義
 */
export interface SavedTab {
  id: string;           // ユニークID (crypto.randomUUID())
  url: string;          // タブのURL
  canonicalUrl: string; // 正規化されたURL（同一性判定に使用）
  title: string;        // ページタイトル
  displayName?: string; // ユーザー設定の表示名（未設定時はtitleを使用）
  domain: string;       // ドメイン（後方互換性のため保持）
  group: string;        // グループ名（ドメインまたはカスタムグループ名）
  groupType: GroupType; // グループタイプ
  customGroups?: string[]; // カスタムグループ名の配列
  faviconUrl: string;   // ファビコンURL (小文字のfaviconUrlに修正されている可能性があるが既存に合わせる)
  screenshot: Blob;     // 512x512スクリーンショット (JPEG)
  lastAccessed: number; // 最終アクセス日時（タブから取得）
  savedAt: number;      // 保存日時（タイムスタンプ）
  sortKey?: string;     // 手動ソート用のキー
}

/**
 * カスタムグループのメタデータ
 */
export interface CustomGroupMeta {
  name: string;       // グループ名（主キー）
  createdAt: number;  // 作成日時
  updatedAt: number;  // 更新日時
  sortOrder: number;  // 表示順序（昇順で表示）
  color?: string;     // グループ色（HEX形式、例: "#3b82f6"）
  itemSort?: string;  // グループ個別のアイテムソート順 (ItemSortType)
  customSortKeyOrder?: string; // カスタムソートキーの並び順 ('asc' | 'desc')
}

/**
 * バックアップ用タブデータ
 * SavedTabと同じ構造だが、バックアップ専用として明示
 */
export interface BackupTab {
  id: string;
  url: string;
  canonicalUrl: string;
  title: string;
  displayName?: string; // ユーザー設定の表示名
  domain: string;
  group: string;
  groupType: GroupType;
  customGroups?: string[];
  faviconUrl: string;
  screenshot: Blob;     // Blobのまま保存
  lastAccessed: number;
  savedAt: number;
}

/**
 * バックアップレコード
 */
export interface BackupRecord {
  id: string;                       // "backup-{timestamp}"
  createdAt: number;                // バックアップ作成日時
  version: number;                  // スキーマバージョン（復元時の互換性用）
  tabCount: number;                 // タブ数（一覧表示用）
  customGroups: CustomGroupMeta[];  // カスタムグループも含める
  tabs: BackupTab[];
}

/**
 * ゴミ箱内のタブ（削除されたタブ）
 */
export interface TrashedTab extends SavedTab {
  trashedAt: number;        // ゴミ箱に入れた日時
  originalGroup: string;    // 元のグループ名（復元時に使用）
  originalGroupType: GroupType;
  originalCustomGroups?: string[];
}

// ======================
// インデックス定義
// ======================

/**
 * タブストアのインデックス定義
 * バージョン1で作成されるインデックス
 */
export const TABS_INDEXES_V1 = [
  { name: 'domain', keyPath: 'domain', unique: false },
  { name: 'savedAt', keyPath: 'savedAt', unique: false },
  { name: 'url', keyPath: 'url', unique: false },
  { name: 'title', keyPath: 'title', unique: false },
] as const;

/**
 * タブストアのインデックス定義
 * バージョン2で追加されるインデックス
 */
export const TABS_INDEXES_V2 = [
  { name: 'group', keyPath: 'group', unique: false },
  { name: 'groupType', keyPath: 'groupType', unique: false },
] as const;

/**
 * カスタムグループストアのインデックス定義
 */
export const CUSTOM_GROUPS_INDEXES = [
  { name: 'createdAt', keyPath: 'createdAt', unique: false },
] as const;

/**
 * バックアップストアのインデックス定義
 */
export const BACKUPS_INDEXES = [
  { name: 'createdAt', keyPath: 'createdAt', unique: false },
] as const;

/**
 * ゴミ箱ストアのインデックス定義
 */
export const TRASH_INDEXES = [
  { name: 'trashedAt', keyPath: 'trashedAt', unique: false },
  { name: 'domain', keyPath: 'domain', unique: false },
] as const;

/**
 * テスト用のタブデータを作成するヘルパー
 * SavedTab型に準拠したデータを生成
 */
export function createTabData(overrides: {
  url: string;
  canonicalUrl?: string;
  title: string;
  displayName?: string;
  domain?: string;
  group?: string;
  groupType?: GroupType;
  faviconUrl?: string;
  screenshot?: Blob;
  lastAccessed?: number;
  savedAt?: number;
  customGroups?: string[];
}): SavedTab {
  const domain = overrides.domain || extractDomain(overrides.url);
  const canonicalUrl = overrides.canonicalUrl || overrides.url;
  
  return {
    id: generateId(),
    url: overrides.url,
    canonicalUrl: canonicalUrl,
    title: overrides.title,
    displayName: overrides.displayName,
    domain: domain,
    group: overrides.group || domain,
    groupType: overrides.groupType || 'domain',
    faviconUrl: overrides.faviconUrl || '',
    screenshot: overrides.screenshot || new Blob([]),
    lastAccessed: overrides.lastAccessed || Date.now(),
    savedAt: overrides.savedAt || Date.now(),
    customGroups: overrides.customGroups || [],
  };
}

/**
 * URLからドメインを抽出
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * ユニークIDを生成
 */
function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2);
}
