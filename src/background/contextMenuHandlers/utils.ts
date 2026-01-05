/**
 * URLが保存対象かどうかを判定（http/https/fileのみ対象）
 */
export function isSaveableUrl(url: string): boolean {
  return /^(https?|file):\/\//i.test(url);
}
