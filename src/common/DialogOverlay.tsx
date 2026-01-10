/**
 * TabBurrow - ダイアログオーバーレイ共通コンポーネント
 * createPortalとオーバーレイ処理を共通化し、portal使い忘れを防止する
 */

import { memo, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDialog } from './hooks/useDialog';

interface DialogOverlayProps {
  /** ダイアログが開いているかどうか */
  isOpen: boolean;
  /** ダイアログを閉じる処理 */
  onClose: () => void;
  /** Enterキーを押したときの処理（オプション） */
  onEnter?: () => void;
  /** ダイアログの内容（.dialog要素を含む） */
  children: ReactNode;
  /** 追加のクラス名 */
  className?: string;
}

/**
 * ダイアログオーバーレイコンポーネント
 * 
 * 使用例:
 * ```tsx
 * <DialogOverlay isOpen={isOpen} onClose={handleClose}>
 *   <div className="dialog">
 *     <h3>タイトル</h3>
 *     <p>内容</p>
 *   </div>
 * </DialogOverlay>
 * ```
 */
export const DialogOverlay = memo(function DialogOverlay({
  isOpen,
  onClose,
  onEnter,
  children,
  className,
}: DialogOverlayProps) {
  const { handleOverlayMouseDown, handleOverlayClick } = useDialog({ isOpen, onClose, onEnter });

  if (!isOpen) return null;

  const overlayClassName = className 
    ? `dialog-overlay ${className}` 
    : 'dialog-overlay';

  return createPortal(
    <div 
      className={overlayClassName}
      style={{ display: 'flex' }}
      onMouseDown={handleOverlayMouseDown}
      onClick={handleOverlayClick}
    >
      {children}
    </div>,
    document.body
  );
});

