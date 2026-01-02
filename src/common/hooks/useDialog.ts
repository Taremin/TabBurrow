/**
 * TabBurrow - ダイアログ共通フック
 * ESCキー処理とオーバーレイクリック処理を共通化
 */

import { useEffect, useCallback, useRef } from 'react';

interface UseDialogOptions {
  /** ダイアログが開いているかどうか */
  isOpen: boolean;
  /** ダイアログを閉じる処理 */
  onClose: () => void;
  /** Enterキーを押したときの処理（オプション） */
  onEnter?: () => void;
}

interface UseDialogResult {
  /** オーバーレイでのマウスダウン時のハンドラ */
  handleOverlayMouseDown: (e: React.MouseEvent) => void;
  /** オーバーレイクリック時のハンドラ */
  handleOverlayClick: (e: React.MouseEvent) => void;
}

/**
 * ダイアログの共通動作を管理するフック
 * - ESCキーでダイアログを閉じる
 * - オーバーレイクリックでダイアログを閉じる（mousedownもオーバーレイ上で開始された場合のみ）
 * - Enterキーでオプションの処理を実行
 */
export function useDialog({
  isOpen,
  onClose,
  onEnter,
}: UseDialogOptions): UseDialogResult {
  // mousedownがオーバーレイ上で開始されたかを追跡
  // テキスト選択のためにダイアログ内でmousedownしてオーバーレイ上でmouseupした場合に
  // ダイアログが閉じるのを防ぐため
  const mouseDownOnOverlayRef = useRef(false);

  // ESCキーとEnterキーの処理
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && onEnter) {
        onEnter();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onEnter]);

  // オーバーレイでマウスダウンした場合にフラグを立てる
  const handleOverlayMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        mouseDownOnOverlayRef.current = true;
      }
    },
    []
  );

  // オーバーレイクリックで閉じる（mousedownもオーバーレイ上だった場合のみ）
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && mouseDownOnOverlayRef.current) {
        onClose();
      }
      // クリック後はフラグをリセット
      mouseDownOnOverlayRef.current = false;
    },
    [onClose]
  );

  return { handleOverlayMouseDown, handleOverlayClick };
}
