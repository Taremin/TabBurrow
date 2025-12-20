/**
 * TabBurrow - 外部クリック検出フック
 * 指定要素の外側をクリックした時にハンドラを呼び出す
 */

import { useEffect, type RefObject } from 'react';

/**
 * 要素の外側クリックを検出するフック
 * @param ref 対象要素のref
 * @param handler 外部クリック時に呼び出されるハンドラ
 * @param enabled フックの有効/無効（デフォルト: true）
 */
export function useClickOutside(
  ref: RefObject<HTMLElement>,
  handler: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (e: MouseEvent) => {
      // refの要素外でのクリックを検出
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler();
      }
    };

    // 次のフレームでイベントリスナーを登録
    // （クリックでメニューを開いた直後に閉じてしまうのを防ぐ）
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleClickOutside);
    });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, handler, enabled]);
}
