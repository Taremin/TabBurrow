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
export const DB_VERSION = 4;

/** タブストア名 */
export const TABS_STORE_NAME = 'tabs';

/** カスタムグループストア名 */
export const CUSTOM_GROUPS_STORE_NAME = 'customGroups';

/** バックアップストア名 */
export const BACKUPS_STORE_NAME = 'backups';

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
  title: string;        // ページタイトル
  displayName?: string; // ユーザー設定の表示名（未設定時はtitleを使用）
  domain: string;       // ドメイン（後方互換性のため保持）
  group: string;        // グループ名（ドメインまたはカスタムグループ名）
  groupType: GroupType; // グループタイプ
  customGroups?: string[]; // カスタムグループ名の配列
  favIconUrl: string;   // ファビコンURL
  screenshot: Blob;     // 512x512スクリーンショット (JPEG)
  lastAccessed: number; // 最終アクセス日時（タブから取得）
  savedAt: number;      // 保存日時（タイムスタンプ）
}

/**
 * カスタムグループのメタデータ
 */
export interface CustomGroupMeta {
  name: string;       // グループ名（主キー）
  createdAt: number;  // 作成日時
  updatedAt: number;  // 更新日時
}

/**
 * バックアップ用タブデータ
 * SavedTabと同じ構造だが、バックアップ専用として明示
 */
export interface BackupTab {
  id: string;
  url: string;
  title: string;
  displayName?: string; // ユーザー設定の表示名
  domain: string;
  group: string;
  groupType: GroupType;
  favIconUrl: string;
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
 * テスト用のタブデータを作成するヘルパー
 * SavedTab型に準拠したデータを生成
 */
export function createTabData(overrides: {
  url: string;
  title: string;
  displayName?: string;
  domain?: string;
  group?: string;
  groupType?: GroupType;
  favIconUrl?: string;
  screenshot?: Blob;
  lastAccessed?: number;
  savedAt?: number;
}): SavedTab {
  const domain = overrides.domain || extractDomain(overrides.url);
  
  return {
    id: generateId(),
    url: overrides.url,
    title: overrides.title,
    displayName: overrides.displayName,
    domain: domain,
    group: overrides.group || domain,
    groupType: overrides.groupType || 'domain',
    favIconUrl: overrides.favIconUrl || '',
    screenshot: overrides.screenshot || new Blob([]),
    lastAccessed: overrides.lastAccessed || Date.now(),
    savedAt: overrides.savedAt || Date.now(),
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
