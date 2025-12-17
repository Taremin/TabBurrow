/**
 * TabBurrow - リンクチェッカー
 * 保存されたタブのURLに対してHEADリクエストを送信し、リンク切れを検出
 */

import { getAllTabs } from '../storage.js';
import { getSettings, type LinkCheckAction, type LinkCheckRule } from '../settings.js';
import type { SavedTab } from '../dbSchema.js';

// ======================
// インターフェース定義
// ======================

/** リンクチェックリクエスト */
export interface LinkCheckRequest {
  checkId: string;  // UIから送信されるチェックID
  tabIds: string[];  // チェック対象のタブID（空なら全件）
  excludeTabIds?: string[];  // 除外するタブID（再開時に既にチェック済みのタブを除外）
}

/** リンクチェック進捗 */
export interface LinkCheckProgress {
  total: number;
  checked: number;
  alive: number;
  dead: number;
  warning: number;
}

/** リンクチェック結果 */
export interface LinkCheckResult {
  tabId: string;
  url: string;
  title: string;
  domain: string;
  statusCode: number | null;
  error?: string;
  action: LinkCheckAction;
}

/** 単一URLチェック結果 */
interface SingleUrlCheckResult {
  statusCode: number | null;
  error?: string;
}

// ======================
// ドメイン別キュー管理
// ======================

/**
 * ドメイン別のリクエスト状態を管理するクラス
 * 同一ドメインへの同時リクエスト制限とディレイを実現
 */
class DomainQueue {
  private lastRequestTime: Map<string, number> = new Map();
  private activeRequests: Map<string, number> = new Map();
  private maxConcurrencyPerDomain: number;
  private delayMs: number;

  constructor(maxConcurrencyPerDomain: number, delayMs: number) {
    this.maxConcurrencyPerDomain = maxConcurrencyPerDomain;
    this.delayMs = delayMs;
  }

  /**
   * 指定ドメインへのリクエストが可能かどうか
   */
  canRequest(domain: string): boolean {
    const active = this.activeRequests.get(domain) || 0;
    if (active >= this.maxConcurrencyPerDomain) {
      return false;
    }

    const lastTime = this.lastRequestTime.get(domain) || 0;
    const elapsed = Date.now() - lastTime;
    return elapsed >= this.delayMs;
  }

  /**
   * リクエスト開始を記録
   */
  recordStart(domain: string): void {
    const active = this.activeRequests.get(domain) || 0;
    this.activeRequests.set(domain, active + 1);
    this.lastRequestTime.set(domain, Date.now());
  }

  /**
   * リクエスト完了を記録
   */
  recordComplete(domain: string): void {
    const active = this.activeRequests.get(domain) || 1;
    this.activeRequests.set(domain, Math.max(0, active - 1));
  }

  /**
   * 次にリクエスト可能になるまでの待機時間（ms）
   */
  getWaitTime(domain: string): number {
    const lastTime = this.lastRequestTime.get(domain) || 0;
    const elapsed = Date.now() - lastTime;
    return Math.max(0, this.delayMs - elapsed);
  }
}

// ======================
// キャンセル管理
// ======================

let currentCheckAbortController: AbortController | null = null;

/**
 * 現在実行中のリンクチェックをキャンセル
 */
export function cancelLinkCheck(): void {
  if (currentCheckAbortController) {
    currentCheckAbortController.abort();
    currentCheckAbortController = null;
  }
}

/**
 * リンクチェックが実行中かどうか
 */
export function isLinkCheckRunning(): boolean {
  return currentCheckAbortController !== null;
}

// ======================
// メイン処理
// ======================

/**
 * リンクチェック結果とチェックIDを含む戻り値
 */
export interface LinkCheckResponse {
  checkId: string;
  results: LinkCheckResult[];
}

/**
 * リンクチェックを実行
 * @param request チェック対象のタブID（空なら全件）、チェックIDを含む
 * @param onProgress 進捗コールバック（チェックID、進捗、現時点での結果を受け取る）
 * @returns チェック結果とチェックIDを含むレスポンス
 */
export async function checkLinks(
  request: LinkCheckRequest,
  onProgress: (checkId: string, progress: LinkCheckProgress, results: LinkCheckResult[]) => void
): Promise<LinkCheckResponse> {
  // 既存のチェックをキャンセル
  cancelLinkCheck();
  
  // UIから送信されたチェックIDを使用
  const checkId = request.checkId;
  
  // 新しいAbortControllerを作成
  currentCheckAbortController = new AbortController();
  const signal = currentCheckAbortController.signal;

  try {
    // 設定を取得
    const settings = await getSettings();
    
    // チェック対象のタブを取得
    let tabs: SavedTab[];
    if (request.tabIds.length > 0) {
      const allTabs = await getAllTabs();
      tabs = allTabs.filter(tab => request.tabIds.includes(tab.id));
    } else {
      tabs = await getAllTabs();
    }

    // 除外対象のタブを除外（再開時に既にチェック済みのタブを除外）
    if (request.excludeTabIds && request.excludeTabIds.length > 0) {
      const excludeSet = new Set(request.excludeTabIds);
      tabs = tabs.filter(tab => !excludeSet.has(tab.id));
    }

    if (tabs.length === 0) {
      return { checkId, results: [] };
    }

    // 進捗を初期化
    const progress: LinkCheckProgress = {
      total: tabs.length,
      checked: 0,
      alive: 0,
      dead: 0,
      warning: 0,
    };

    // 結果を格納する配列
    const results: LinkCheckResult[] = [];
    
    onProgress(checkId, { ...progress }, [...results]);

    // ドメイン別にグループ化
    const tabsByDomain = groupTabsByDomain(tabs);
    
    // ラウンドロビン順序に並び替え
    const orderedTabs = createRoundRobinOrder(tabsByDomain);
    
    // ドメインキュー管理を初期化
    const domainQueue = new DomainQueue(
      settings.linkCheckDomainConcurrency,
      settings.linkCheckDomainDelayMs
    );
    
    // 並列処理用のプロミス管理
    const pendingPromises: Map<string, Promise<void>> = new Map();
    // 処理待ちタブのインデックスを管理（スキップされたタブを含む）
    const pendingTabIndices: Set<number> = new Set();
    for (let i = 0; i < orderedTabs.length; i++) {
      pendingTabIndices.add(i);
    }

    // 全タブの処理が完了するまでループ
    while (pendingTabIndices.size > 0 || pendingPromises.size > 0) {
      // キャンセルチェック
      if (signal.aborted) {
        throw new Error('Link check cancelled');
      }

      // 新しいリクエストを開始できる場合
      let startedAny = false;
      for (const tabIndex of pendingTabIndices) {
        if (pendingPromises.size >= settings.linkCheckConcurrency) {
          break;
        }

        const tab = orderedTabs[tabIndex];
        const domain = extractDomain(tab.url);

        // ドメイン別の制限をチェック
        if (!domainQueue.canRequest(domain)) {
          // このドメインはまだリクエストできない、次のタブを試す
          continue;
        }

        // リクエストを開始
        domainQueue.recordStart(domain);
        pendingTabIndices.delete(tabIndex);
        startedAny = true;

        const promise = (async () => {
          try {
            const result = await checkSingleUrl(
              tab.url,
              settings.linkCheckTimeoutMs,
              signal
            );
            
            const action = determineAction(
              result.statusCode,
              result.error,
              settings.linkCheckRules
            );

            const checkResult: LinkCheckResult = {
              tabId: tab.id,
              url: tab.url,
              title: tab.title,
              domain: domain,
              statusCode: result.statusCode,
              error: result.error,
              action: action,
            };

            results.push(checkResult);

            // 進捗を更新
            progress.checked++;
            switch (action) {
              case 'alive':
                progress.alive++;
                break;
              case 'dead':
                progress.dead++;
                break;
              case 'warning':
                progress.warning++;
                break;
              // 'ignore'は何もカウントしない
            }
            onProgress(checkId, { ...progress }, [...results]);
          } finally {
            domainQueue.recordComplete(domain);
            pendingPromises.delete(tab.id);
          }
        })();

        pendingPromises.set(tab.id, promise);
      }

      // 少なくとも1つのプロミスが完了するのを待つ
      if (pendingPromises.size > 0) {
        await Promise.race(pendingPromises.values());
      } else if (pendingTabIndices.size > 0) {
        // 全てのドメインが待機中の場合、少し待機
        await sleep(50);
      }
    }

    return { checkId, results };
  } finally {
    currentCheckAbortController = null;
  }
}

// ======================
// ヘルパー関数
// ======================

/**
 * タブをドメイン別にグループ化
 */
function groupTabsByDomain(tabs: SavedTab[]): Map<string, SavedTab[]> {
  const result = new Map<string, SavedTab[]>();
  
  for (const tab of tabs) {
    const domain = extractDomain(tab.url);
    const existing = result.get(domain) || [];
    existing.push(tab);
    result.set(domain, existing);
  }
  
  return result;
}

/**
 * ラウンドロビン順序に並び替え
 * 各ドメインから1つずつ順番に取り出す
 */
function createRoundRobinOrder(tabsByDomain: Map<string, SavedTab[]>): SavedTab[] {
  const result: SavedTab[] = [];
  const domains = Array.from(tabsByDomain.keys());
  const indices = new Map<string, number>();
  
  // 各ドメインのインデックスを初期化
  for (const domain of domains) {
    indices.set(domain, 0);
  }
  
  // 全タブを処理するまでループ
  let hasMore = true;
  while (hasMore) {
    hasMore = false;
    for (const domain of domains) {
      const tabs = tabsByDomain.get(domain)!;
      const index = indices.get(domain)!;
      
      if (index < tabs.length) {
        result.push(tabs[index]);
        indices.set(domain, index + 1);
        hasMore = true;
      }
    }
  }
  
  return result;
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
 * 単一URLのチェック
 */
async function checkSingleUrl(
  url: string,
  timeoutMs: number,
  signal: AbortSignal
): Promise<SingleUrlCheckResult> {
  try {
    // タイムアウト用のAbortController
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
    
    // シグナルを結合
    const combinedSignal = signal.aborted 
      ? signal 
      : timeoutController.signal;

    // 親シグナルがabortされたら子もabort
    const abortHandler = () => timeoutController.abort();
    signal.addEventListener('abort', abortHandler);

    try {
      // HEADリクエストを送信
      const response = await fetch(url, {
        method: 'HEAD',
        signal: combinedSignal,
        redirect: 'follow',
      });
      
      clearTimeout(timeoutId);
      return { statusCode: response.status };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (timeoutController.signal.aborted && !signal.aborted) {
        return { statusCode: null, error: 'timeout' };
      }
      
      // ネットワークエラーの判定
      if (error instanceof TypeError) {
        return { statusCode: null, error: 'network-error' };
      }
      
      return { statusCode: null, error: String(error) };
    } finally {
      signal.removeEventListener('abort', abortHandler);
    }
  } catch (error) {
    return { statusCode: null, error: String(error) };
  }
}

/**
 * ステータスコードからアクションを決定
 * 個別指定（404等）は範囲指定（4xx等）より優先
 */
function determineAction(
  statusCode: number | null,
  error: string | undefined,
  rules: LinkCheckRule[]
): LinkCheckAction {
  // 有効なルールのみフィルタ
  const enabledRules = rules.filter(r => r.enabled);
  
  // エラーの場合
  if (error) {
    // 特殊条件にマッチするか確認（個別指定）
    const exactMatch = enabledRules.find(r => r.condition === error);
    if (exactMatch) {
      return exactMatch.action;
    }
    
    // デフォルト: ネットワークエラーはdead、それ以外はwarning
    return error === 'network-error' ? 'dead' : 'warning';
  }
  
  if (statusCode === null) {
    return 'warning';
  }
  
  // ステータスコードの文字列表現
  const codeStr = statusCode.toString();
  const rangeStr = `${Math.floor(statusCode / 100)}xx`;
  
  // 個別指定を優先して検索
  const exactMatch = enabledRules.find(r => r.condition === codeStr);
  if (exactMatch) {
    return exactMatch.action;
  }
  
  // 範囲指定を検索
  const rangeMatch = enabledRules.find(r => r.condition === rangeStr);
  if (rangeMatch) {
    return rangeMatch.action;
  }
  
  // デフォルト: 2xx/3xxはalive、それ以外はwarning
  if (statusCode >= 200 && statusCode < 400) {
    return 'alive';
  }
  return 'warning';
}

/**
 * 指定ミリ秒待機
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
