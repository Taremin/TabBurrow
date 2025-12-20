/**
 * TabBurrow - ダイアログ共通フック
 * ESCキー処理とオーバーレイクリック処理を共通化
 */

import { useEffect, useCallback } from 'react';

interface UseDialogOptions {
  /** ダイアログが開いているかどうか */
  isOpen: boolean;
  /** ダイアログを閉じる処理 */
  onClose: () => void;
  /** Enterキーを押したときの処理（オプション） */
  onEnter?: () => void;
}

interface UseDialogResult {
  /** オーバーレイクリック時のハンドラ */
  handleOverlayClick: (e: React.MouseEvent) => void;
}

/**
 * ダイアログの共通動作を管理するフック
 * - ESCキーでダイアログを閉じる
 * - オーバーレイクリックでダイアログを閉じる
 * - Enterキーでオプションの処理を実行
 */
export function useDialog({
  isOpen,
  onClose,
  onEnter,
}: UseDialogOptions): UseDialogResult {
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

  // オーバーレイクリックで閉じる
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  return { handleOverlayClick };
}
