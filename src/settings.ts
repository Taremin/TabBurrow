/**
 * TabBurrow - 設定ストレージ層
 * Browser Storage APIを使用して設定を永続化
 */

import browser from './browserApi.js';
import type { LocaleSetting } from './i18n.js';
import type { ThemeSetting } from './theme.js';


// タブ復元モードの型定義
// normal: 通常読み込み, lazy: 読み込み後にdiscard, immediate: 即時discard
export type RestoreMode = 'normal' | 'lazy' | 'immediate';

// ソート順の型定義
export type GroupSortType = 'count-desc' | 'count-asc' | 'domain-asc' | 'domain-desc' | 'updated-desc' | 'updated-asc';
export type ItemSortType = 'saved-desc' | 'saved-asc' | 'title-asc' | 'title-desc' | 'accessed-desc' | 'accessed-asc';

// ルールの対象タイプ
// domain: ドメイン名のみ, url: パス含むURL, fullUrl: クエリパラメータ含む完全URL, title: ページタイトル
export type RuleTargetType = 'domain' | 'url' | 'fullUrl' | 'title';

// ルールの動作タイプ
// exclude: 除外, saveToGroup: グループに収納, saveOnly: DBに保存/更新するがタブは閉じない
// close: 保存せずに閉じる, pin: タブをピン留めする
export type RuleActionType = 'exclude' | 'saveToGroup' | 'saveOnly' | 'close' | 'pin';

// ルール評価順序
export type RuleOrderType = 'asc' | 'desc';

// 固定タブのアクション
// skip: 何もしない, suspend: サスペンドする
export type PinnedTabAction = 'skip' | 'suspend';

// バックアップ間隔プリセット
// off: 無効, 1h/6h/12h/24h: プリセット, custom: カスタム
export type BackupIntervalPreset = 'off' | '1h' | '6h' | '12h' | '24h' | 'custom';

// 表示モードの型定義（タブ管理画面用）
// grouped: グループ表示, flat: フラット表示
export type ViewMode = 'grouped' | 'flat';

// 表示密度の型定義（タブ管理画面用）
// normal: 通常表示, compact: コンパクト表示
export type DisplayDensity = 'normal' | 'compact';

// ピン留めドメイングループ
export interface PinnedDomainGroup {
  domain: string;   // ドメイン名
  color?: string;   // グループ色（HEX形式）
}

// 自動収納ルール
export interface AutoCloseRule {
  id: string;              // ユニークID
  enabled: boolean;        // ルールの有効/無効
  name: string;            // ルール名（ユーザー識別用）
  targetType: RuleTargetType;  // マッチ対象
  pattern: string;         // 正規表現パターン
  action: RuleActionType;  // 動作
  targetGroup?: string;    // action='saveToGroup'の場合のグループ名
}

// ======================
// リンクチェック関連の型定義
// ======================

// リンクチェック結果のアクション
// alive: 正常, dead: リンク切れ, warning: 警告（一時的エラーの可能性）, ignore: 無視
export type LinkCheckAction = 'alive' | 'dead' | 'warning' | 'ignore';

// ステータスコード条件の型
// 具体的なコード: "404", "503" または 範囲: "2xx", "4xx", "5xx"
// 特殊条件: "timeout", "network-error"
export type StatusCodeCondition = string;

// リンクチェックルール
export interface LinkCheckRule {
  id: string;
  enabled: boolean;
  name: string;
  condition: StatusCodeCondition; // "404", "4xx", "timeout" など
  action: LinkCheckAction;
}

// デフォルトのリンクチェックルール
export const DEFAULT_LINK_CHECK_RULES: LinkCheckRule[] = [
  { id: 'default-2xx', enabled: true, name: '2xx 成功', condition: '2xx', action: 'alive' },
  { id: 'default-3xx', enabled: true, name: '3xx リダイレクト', condition: '3xx', action: 'alive' },
  { id: 'default-404', enabled: true, name: '404 Not Found', condition: '404', action: 'dead' },
  { id: 'default-410', enabled: true, name: '410 Gone', condition: '410', action: 'dead' },
  { id: 'default-429', enabled: true, name: '429 Too Many Requests', condition: '429', action: 'warning' },
  { id: 'default-4xx', enabled: true, name: '4xx クライアントエラー', condition: '4xx', action: 'warning' },
  { id: 'default-5xx', enabled: true, name: '5xx サーバーエラー', condition: '5xx', action: 'warning' },
  { id: 'default-timeout', enabled: true, name: 'タイムアウト', condition: 'timeout', action: 'warning' },
  { id: 'default-network-error', enabled: true, name: 'ネットワークエラー', condition: 'network-error', action: 'dead' },
];

// 設定の型定義
export interface Settings {
  autoCloseEnabled: boolean;     // 自動収納有効/無効
  autoCloseSeconds: number;      // 自動収納までの秒数
  autoCloseRules: AutoCloseRule[];  // 自動収納ルール
  autoCloseRuleOrder: RuleOrderType;  // ルール評価順序
  locale: LocaleSetting;         // 言語設定（'ja' | 'en' | 'auto'）
  theme: ThemeSetting;           // テーマ設定（'system' | 'dark' | 'light'）

  groupSort: GroupSortType;      // グループソート順
  itemSort: ItemSortType;        // アイテムソート順
  restoreMode: RestoreMode;      // タブ復元モード
  restoreIntervalMs: number;     // タブ復元時のインターバル（ミリ秒）

  // リンクチェック設定
  linkCheckRules: LinkCheckRule[];           // リンクチェックルール
  linkCheckTimeoutMs: number;                // タイムアウト（ミリ秒）
  linkCheckConcurrency: number;              // グローバル同時リクエスト数
  linkCheckDomainConcurrency: number;        // ドメイン別同時リクエスト数
  linkCheckDomainDelayMs: number;            // 同一ドメイン間ディレイ（ミリ秒）
  linkCheckUseGetFallback: boolean;          // HEADで失敗した場合にGETで再試行するか

  // アイコンクリック設定
  iconClickApplyRules: boolean;              // 自動収納ルールを適用するか
  iconClickPinnedAction: PinnedTabAction;    // 固定タブの扱い

  // バックアップ設定
  autoBackupEnabled: boolean;                // 自動バックアップ有効/無効
  autoBackupIntervalPreset: BackupIntervalPreset;  // プリセット選択
  autoBackupIntervalMinutes: number;         // カスタム間隔（分）

  // デフォルト表示モード設定
  defaultViewMode: ViewMode;                 // デフォルトのグループ化モード
  defaultDisplayDensity: DisplayDensity;     // デフォルトの表示密度
  showGroupedTabsInDomainGroups: boolean;    // カスタムグループに所属するタブをドメイングループにも表示するか
  autoBackupKeepCount: number;               // 保持する世代数（0=無効、-1=無制限）
  domainGroupAliases: Record<string, string>; // ドメイングループの表示名エイリアス
  pinnedDomainGroups: PinnedDomainGroup[];     // ピン留めされたドメイングループ（順序付き）
}

// デフォルト設定
const DEFAULT_SETTINGS: Settings = {
  autoCloseEnabled: false,
  autoCloseSeconds: 1800, // 30分
  autoCloseRules: [],
  autoCloseRuleOrder: 'asc',
  locale: 'auto',
  theme: 'system',

  groupSort: 'count-desc', // タブ数（多い順）
  itemSort: 'saved-desc',  // 保存日時（新しい順）
  restoreMode: 'lazy',     // デフォルトは遅延サスペンド
  restoreIntervalMs: 100,  // 100ms間隔

  // リンクチェック設定
  linkCheckRules: DEFAULT_LINK_CHECK_RULES,
  linkCheckTimeoutMs: 10000,         // 10秒
  linkCheckConcurrency: 5,           // 5並列
  linkCheckDomainConcurrency: 1,     // ドメインあたり1並列
  linkCheckDomainDelayMs: 100,       // 100ms
  linkCheckUseGetFallback: true,     // デフォルトでGETフォールバックを有効にする

  // アイコンクリック設定
  iconClickApplyRules: true,         // デフォルトでルールを適用
  iconClickPinnedAction: 'skip',     // デフォルトは何もしない

  // バックアップ設定
  autoBackupEnabled: false,          // デフォルトは無効
  autoBackupIntervalPreset: '24h',   // デフォルトは24時間ごと
  autoBackupIntervalMinutes: 1440,   // 24時間 = 1440分

  // デフォルト表示モード設定
  defaultViewMode: 'grouped',        // デフォルトはグループ表示
  defaultDisplayDensity: 'normal',   // デフォルトは通常表示
  showGroupedTabsInDomainGroups: false,
  autoBackupKeepCount: 5,            // デフォルト5世代
  domainGroupAliases: {},            // エイリアスなし
  pinnedDomainGroups: [],            // ピン留めなし
};

const STORAGE_KEY = 'settings';

/**
 * デフォルト設定を取得
 */
export function getDefaultSettings(): Settings {
  return { ...DEFAULT_SETTINGS };
}

/**
 * 現在の設定を取得
 */
export async function getSettings(): Promise<Settings> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  if (result[STORAGE_KEY]) {
    // 保存された設定とデフォルト設定をマージ（新しい設定項目に対応）
    return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
  } else {
    return getDefaultSettings();
  }
}

/**
 * 設定を保存
 */
export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: settings });
}

/**
 * 設定変更をBackground Scriptに通知
 */
export function notifySettingsChanged(): void {
  browser.runtime.sendMessage({ type: 'settings-changed' }).catch(() => {
    // Background Scriptが応答しない場合は無視
  });
}

/**
 * タブ情報（ルールマッチング用）
 */
export interface TabInfo {
  url: string;
  title?: string;
}

/**
 * タブに対してマッチする自動収納ルールを検索
 * @param tab タブ情報（url, title）
 * @param rules ルールリスト
 * @param order 評価順序（'asc': 上から, 'desc': 下から）
 * @returns マッチしたルール、またはnull
 */
export function matchAutoCloseRule(
  tab: TabInfo,
  rules: AutoCloseRule[],
  order: RuleOrderType
): AutoCloseRule | null {
  if (!rules || rules.length === 0) {
    return null;
  }

  // 評価順序に応じてルールを並び替え
  const orderedRules = order === 'desc' ? [...rules].reverse() : rules;

  for (const rule of orderedRules) {
    if (!rule.enabled) {
      continue;
    }

    try {
      const regex = new RegExp(rule.pattern, 'i');
      const targetValue = getTargetValue(tab, rule.targetType);
      
      if (targetValue && regex.test(targetValue)) {
        return rule;
      }
    } catch {
      // 無効な正規表現は無視
      console.warn(`無効な正規表現パターン: ${rule.pattern}`);
    }
  }

  return null;
}

/**
 * ルールの対象タイプに応じてマッチング対象の値を取得
 */
function getTargetValue(tab: TabInfo, targetType: RuleTargetType): string | null {
  try {
    const urlObj = new URL(tab.url);
    
    switch (targetType) {
      case 'domain':
        return urlObj.hostname;
      case 'url':
        // パス含むURL（クエリパラメータ除く）
        return urlObj.origin + urlObj.pathname;
      case 'fullUrl':
        // クエリパラメータ含む完全URL
        return tab.url;
      case 'title':
        return tab.title || null;
      default:
        return null;
    }
  } catch {
    // 無効なURLの場合
    if (targetType === 'title') {
      return tab.title || null;
    }
    return null;
  }
}

/**
 * ドメイン名を正規表現用にエスケープ
 * 例: "github.com" -> "github\\.com"
 */
export function escapeRegexPattern(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 新しいルールを作成
 */
export function createAutoCloseRule(
  name: string,
  targetType: RuleTargetType,
  pattern: string,
  action: RuleActionType,
  targetGroup?: string
): AutoCloseRule {
  return {
    id: crypto.randomUUID(),
    enabled: true,
    name,
    targetType,
    pattern,
    action,
    targetGroup,
  };
}

/**
 * バックアップ間隔プリセットを分に変換
 */
export function getBackupIntervalMinutes(settings: Settings): number {
  switch (settings.autoBackupIntervalPreset) {
    case 'off': return 0;
    case '1h': return 60;
    case '6h': return 360;
    case '12h': return 720;
    case '24h': return 1440;
    case 'custom': return settings.autoBackupIntervalMinutes;
    default: return 1440; // デフォルトは24時間
  }
}
