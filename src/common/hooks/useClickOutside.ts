/**
 * TabBurrow - 外部クリック検出フック
 * 指定要素の外側をクリックした時にハンドラを呼び出す
 */

import { useEffect, type RefObject } from 'react';

/**
 * 要素の外側クリックを検出するフック
 * @param refs 対象要素のref（単一または配列）
 * @param handler 外部クリック時に呼び出されるハンドラ
 * @param enabled フックの有効/無効（デフォルト: true）
 */
export function useClickOutside(
  refs: RefObject<HTMLElement> | RefObject<HTMLElement>[],
  handler: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (e: MouseEvent) => {
      // 配列に正規化
      const refArray = Array.isArray(refs) ? refs : [refs];
      
      // 有効なrefが1つもない場合は何もしない
      const hasValidRef = refArray.some(ref => ref.current !== null);
      if (!hasValidRef) return;
      
      // いずれかの要素内のクリックは無視
      const isInsideAnyRef = refArray.some(
        ref => ref.current?.contains(e.target as Node)
      );
      
      if (!isInsideAnyRef) {
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
  }, [refs, handler, enabled]);
}
