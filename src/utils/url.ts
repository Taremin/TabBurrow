/**
 * TabBurrow - URL関連ユーティリティ
 * URL操作の共通関数
 */

import type { UrlNormalizationRule } from '../settings';

/**
 * URLからドメイン（ホスト名）を抽出する
 * @param url - 対象のURL文字列
 * @returns ドメイン名。無効なURLの場合は 'unknown'
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * URL正規化ルールを適用して正規化されたURLを返す
 * @param url - 元のURL
 * @param rules - 適用するルールの配列
 * @returns 正規化されたURL
 */
export function applyUrlNormalization(url: string, rules: UrlNormalizationRule[]): string {
  let normalized = url;

  for (const rule of rules) {
    if (!rule.enabled) continue;

    try {
      const regex = new RegExp(rule.pattern);
      if (regex.test(url)) {
        // マッチした場合、置換を適用して終了（最初の有効なルールのみ適用）
        normalized = url.replace(regex, rule.replacement);
        break;
      }
    } catch (e) {
      console.error(`URL正規化ルールの適用に失敗しました (${rule.name}):`, e);
    }
  }

  return normalized;
}

/**
 * 複数のURLから共通の正規表現パターンを提案する
 * 例:
 * https://ncode.syosetu.com/n123/1/
 * https://ncode.syosetu.com/n123/2/
 * -> ^https://ncode\.syosetu\.com/n123/\d+/$
 */
export function generateRegexFromUrls(urls: string[]): { pattern: string; replacement: string } {
  if (urls.length === 0) return { pattern: '', replacement: '' };
  if (urls.length === 1) {
    // 1つの場合は数字部分を \d+ に置き換えるだけの単純な提案
    const pattern = '^' + escapeRegExp(urls[0]).replace(/\d+/g, '\\d+') + '$';
    return { pattern, replacement: urls[0].replace(/\d+/g, 'TOKEN').replace(/TOKEN/g, '???') }; // 置換後はユーザーに任せる
  }

  // 共通の接頭辞を探す
  let commonPrefix = urls[0];
  for (let i = 1; i < urls.length; i++) {
    let j = 0;
    while (j < commonPrefix.length && j < urls[i].length && commonPrefix[j] === urls[i][j]) {
      j++;
    }
    commonPrefix = commonPrefix.substring(0, j);
  }

  // 共通の接尾辞を探す
  let commonSuffix = urls[0].substring(commonPrefix.length);
  for (let i = 1; i < urls.length; i++) {
    const remaining = urls[i].substring(commonPrefix.length);
    let j = 0;
    while (j < commonSuffix.length && j < remaining.length && 
           commonSuffix[commonSuffix.length - 1 - j] === remaining[remaining.length - 1 - j]) {
      j++;
    }
    commonSuffix = commonSuffix.substring(commonSuffix.length - j);
  }

  // 間の部分をキャプチャグループにする
  // 可変部分が数字のみの場合は \d+ にする
  const escapedPrefix = escapeRegExp(commonPrefix);
  const escapedSuffix = escapeRegExp(commonSuffix);
  
  // 置換後の提案: 可変部分を除去した形式
  const replacement = commonPrefix + commonSuffix;
  
  // 可変部分のパターン（とりあえず何でもマッチする形式）
  const pattern = `^${escapedPrefix}([^/]+)${escapedSuffix}$`;
  
  // 最後に可変部分をより具体的に（数字のみなら \d+）
  const midParts = urls.map(u => u.substring(commonPrefix.length, u.length - commonSuffix.length));
  const isAllDigits = midParts.every(p => /^\d+$/.test(p));
  
  if (isAllDigits) {
    let finalReplacement = commonPrefix + commonSuffix;
    // スラッシュが重複する場合は調整 (ex: .../ + / -> .../)
    if (commonPrefix.endsWith('/') && commonSuffix.startsWith('/')) {
      finalReplacement = commonPrefix + commonSuffix.substring(1);
    }
    return {
      pattern: `^${escapedPrefix}\\d+${escapedSuffix}$`,
      replacement: finalReplacement
    };
  }

  let finalReplacement = commonPrefix + '$1' + commonSuffix;
  return {
    pattern,
    replacement: finalReplacement
  };
}

/**
 * 正規表現の特殊文字をエスケープ
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
