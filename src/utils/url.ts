/**
 * TabBurrow - URL関連ユーティリティ
 * URL操作の共通関数
 */

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
