/**
 * TabBurrow - エクスポート/インポート機能
 * タブデータと設定のバックアップ・復元
 */

import { getAllTabs, saveTabs, deleteAllTabs, type SavedTab } from './storage.js';
import { getSettings, saveSettings, type Settings } from './settings.js';
import { extractDomain } from './utils/url.js';

// エクスポートデータのバージョン
const EXPORT_VERSION = 1;

// インポートモードの型定義
export type ImportMode = 'merge' | 'overwrite';

// タブエクスポートデータの型定義
export interface TabExportData {
  version: number;
  exportedAt: string;
  tabs: Array<{
    id: string;
    url: string;
    title: string;
    displayName?: string;
    domain: string;
    customGroups?: string[];
    favIconUrl: string;
    screenshot: string; // Base64
    lastAccessed: number;
    savedAt: number;
  }>;
}

// 設定エクスポートデータの型定義
export interface SettingsExportData {
  version: number;
  exportedAt: string;
  settings: Settings;
}

/**
 * BlobをBase64文字列に変換
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // data:image/jpeg;base64, プレフィックスを含む
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Base64文字列をBlobに変換
 */
function base64ToBlob(base64: string): Blob {
  // data:image/jpeg;base64,... 形式を解析
  const matches = base64.match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    // Base64データがない場合は空のBlobを返す
    return new Blob();
  }

  const mimeType = matches[1];
  const data = matches[2];
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  
  return new Blob([array], { type: mimeType });
}

/**
 * 全タブデータをエクスポート
 */
export async function exportTabs(): Promise<TabExportData> {
  const tabs = await getAllTabs();
  
  const exportTabs = await Promise.all(
    tabs.map(async (tab) => ({
      id: tab.id,
      url: tab.url,
      title: tab.title,
      displayName: tab.displayName,
      domain: tab.domain,
      customGroups: tab.customGroups,
      favIconUrl: tab.favIconUrl,
      screenshot: tab.screenshot ? await blobToBase64(tab.screenshot) : '',
      lastAccessed: tab.lastAccessed,
      savedAt: tab.savedAt,
    }))
  );

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    tabs: exportTabs,
  };
}

/**
 * タブデータをインポート
 * @param data エクスポートデータ
 * @param mode 'merge' = 既存データとマージ（重複URLはスキップ）, 'overwrite' = 全上書き
 */
export async function importTabs(
  data: TabExportData,
  mode: ImportMode = 'merge'
): Promise<{ imported: number; skipped: number }> {
  if (!data.version || !data.tabs || !Array.isArray(data.tabs)) {
    throw new Error('無効なエクスポートデータ形式です');
  }

  // 上書きモードの場合は既存データを削除
  if (mode === 'overwrite') {
    await deleteAllTabs();
  }

  // 既存タブのURLセットを取得
  const existingTabs = mode === 'merge' ? await getAllTabs() : [];
  const existingUrls = new Set(existingTabs.map(t => t.url));

  // 新規タブのみをインポート（マージモードでは既存URLはスキップ）
  const newTabs: SavedTab[] = [];
  let skipped = 0;

  for (const tab of data.tabs) {
    if (existingUrls.has(tab.url)) {
      skipped++;
      continue;
    }

    newTabs.push({
      id: crypto.randomUUID(), // 新しいIDを生成
      url: tab.url,
      title: tab.title,
      displayName: tab.displayName,
      domain: tab.domain,
      group: tab.domain, // インポート時はドメインをグループとして使用
      groupType: 'domain' as const,
      customGroups: tab.customGroups,
      favIconUrl: tab.favIconUrl,
      screenshot: base64ToBlob(tab.screenshot),
      lastAccessed: tab.lastAccessed,
      savedAt: tab.savedAt,
    });
  }

  if (newTabs.length > 0) {
    await saveTabs(newTabs);
  }

  return {
    imported: newTabs.length,
    skipped,
  };
}

/**
 * 設定をエクスポート
 */
export async function exportSettings(): Promise<SettingsExportData> {
  const settings = await getSettings();
  
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
  };
}

/**
 * 設定をインポート
 */
export async function importSettings(data: SettingsExportData): Promise<void> {
  if (!data.version || !data.settings) {
    throw new Error('無効な設定エクスポートデータ形式です');
  }

  await saveSettings(data.settings);
}

/**
 * データをJSONファイルとしてダウンロード
 */
export function downloadAsFile(data: object, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * ファイル選択ダイアログを開いてJSONを読み込む
 */
export function selectAndReadJsonFile<T>(): Promise<T> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('ファイルが選択されませんでした'));
        return;
      }

      try {
        const text = await file.text();
        const data = JSON.parse(text) as T;
        resolve(data);
      } catch (error) {
        reject(new Error('JSONファイルの解析に失敗しました'));
      }
    };

    input.oncancel = () => {
      reject(new Error('ファイル選択がキャンセルされました'));
    };

    input.click();
  });
}

/**
 * タブエクスポートのファイル名を生成
 */
export function generateTabsExportFilename(): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `tabburrow-tabs-${date}.json`;
}

/**
 * 設定エクスポートのファイル名を生成
 */
export function generateSettingsExportFilename(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `tabburrow-settings-${date}.json`;
}

// ======================
// 複数フォーマット対応
// ======================

/**
 * エクスポートフォーマットの型定義
 */
export type ExportFormat = 'json' | 'urlList' | 'markdown';



/**
 * タブデータをURLリスト形式にフォーマット
 * 1行1URL形式（OneTab互換）
 */
export function formatAsUrlList(data: TabExportData): string {
  return data.tabs.map(tab => tab.url).join('\n');
}

/**
 * タブデータをMarkdown形式にフォーマット
 * - [タイトル](URL) 形式
 */
export function formatAsMarkdown(data: TabExportData): string {
  return data.tabs
    .map(tab => `- [${tab.title || tab.url}](${tab.url})`)
    .join('\n');
}

/**
 * タブデータを指定フォーマットでフォーマット
 */
export function formatTabsData(data: TabExportData, format: ExportFormat): string {
  switch (format) {
    case 'urlList':
      return formatAsUrlList(data);
    case 'markdown':
      return formatAsMarkdown(data);
    case 'json':
    default:
      return JSON.stringify(data, null, 2);
  }
}

/**
 * URLリスト形式のテキストをパース
 * 1行1URL形式を想定
 */
export function parseUrlList(text: string): Array<{ url: string; title: string }> {
  const lines = text.trim().split('\n');
  const results: Array<{ url: string; title: string }> = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // OneTab形式: "URL | タイトル" もサポート
    const pipeIndex = trimmedLine.indexOf(' | ');
    if (pipeIndex > 0) {
      const url = trimmedLine.substring(0, pipeIndex).trim();
      const title = trimmedLine.substring(pipeIndex + 3).trim();
      if (isValidUrl(url)) {
        results.push({ url, title });
      }
    } else if (isValidUrl(trimmedLine)) {
      // 単純なURL
      results.push({ url: trimmedLine, title: trimmedLine });
    }
  }

  return results;
}

/**
 * Markdown形式のテキストをパース
 * - [タイトル](URL) 形式を想定
 */
export function parseMarkdown(text: string): Array<{ url: string; title: string }> {
  const results: Array<{ url: string; title: string }> = [];
  
  // Markdownリンク形式: [タイトル](URL) をマッチ
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    const title = match[1] || match[2];
    const url = match[2];
    if (isValidUrl(url)) {
      results.push({ url, title });
    }
  }

  return results;
}

/**
 * URLが有効かどうかをチェック
 */
function isValidUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * テキストのフォーマットを自動判定
 */
export function detectTextFormat(text: string): 'json' | 'markdown' | 'urlList' {
  const trimmed = text.trim();
  
  // JSONか判定
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // JSONではない
    }
  }
  
  // Markdownリンクが含まれるか判定
  if (/\[([^\]]*)\]\(([^)]+)\)/.test(trimmed)) {
    return 'markdown';
  }
  
  // その他はURLリストとして扱う
  return 'urlList';
}

/**
 * テキストからタブデータをインポート（URLリストまたはMarkdown形式）
 */
export async function importTabsFromText(
  text: string,
  mode: ImportMode = 'merge'
): Promise<{ imported: number; skipped: number }> {
  const format = detectTextFormat(text);
  
  // JSONの場合は既存のimportTabsを使用
  if (format === 'json') {
    const data = JSON.parse(text) as TabExportData;
    return importTabs(data, mode);
  }

  // URLリストまたはMarkdownをパース
  const parsed = format === 'markdown' 
    ? parseMarkdown(text) 
    : parseUrlList(text);

  if (parsed.length === 0) {
    throw new Error('有効なURLが見つかりませんでした');
  }

  // 上書きモードの場合は既存データを削除
  if (mode === 'overwrite') {
    await deleteAllTabs();
  }

  // 既存タブのURLセットを取得
  const existingTabs = mode === 'merge' ? await getAllTabs() : [];
  const existingUrls = new Set(existingTabs.map(t => t.url));

  // 新規タブを作成
  const newTabs: SavedTab[] = [];
  let skipped = 0;
  const now = Date.now();

  for (const item of parsed) {
    if (existingUrls.has(item.url)) {
      skipped++;
      continue;
    }

    const domain = extractDomain(item.url);
    newTabs.push({
      id: crypto.randomUUID(),
      url: item.url,
      title: item.title,
      domain,
      group: domain,
      groupType: 'domain',
      favIconUrl: '',
      screenshot: new Blob(),
      lastAccessed: now,
      savedAt: now,
    });
  }

  if (newTabs.length > 0) {
    await saveTabs(newTabs);
  }

  return {
    imported: newTabs.length,
    skipped,
  };
}
