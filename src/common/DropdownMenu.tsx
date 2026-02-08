/**
 * TabBurrow - 汎用ドロップダウンメニューコンポーネント
 * 外部クリックで閉じる機能とPortalを使用したbody直下レンダリングをサポート
 */

import { useState, useRef, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useClickOutside } from './hooks/useClickOutside';
import { usePopupPosition } from './hooks/usePopupPosition';

export type DropdownPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

interface DropdownMenuProps {
  /** トリガーとなるボタンなどのReact要素を返すrender prop */
  trigger: (props: { onClick: () => void; ref: React.RefObject<HTMLButtonElement> }) => ReactNode;
  /** メニューの中身 */
  children: ReactNode;
  /** メニューの表示位置（デフォルト: bottom-left） */
  position?: DropdownPosition;
  /** 追加のクラス名 */
  className?: string;
  /** メニューが開いているかどうか（制御コンポーネントとして使う場合） */
  isOpen?: boolean;
  /** メニューを閉じる時のコールバック（制御コンポーネントとして使う場合） */
  onClose?: () => void;
}

/**
 * 汎用ドロップダウンメニューコンポーネント
 * 
 * 使用例（非制御）:
 * ```tsx
 * <DropdownMenu
 *   trigger={({ onClick, ref }) => (
 *     <button ref={ref} onClick={onClick}>メニュー</button>
 *   )}
 * >
 *   <div className="menu-item">項目1</div>
 *   <div className="menu-item">項目2</div>
 * </DropdownMenu>
 * ```
 * 
 * 使用例（制御）:
 * ```tsx
 * <DropdownMenu
 *   trigger={({ onClick, ref }) => (
 *     <button ref={ref} onClick={onClick}>メニュー</button>
 *   )}
 *   isOpen={menuOpen}
 *   onClose={() => setMenuOpen(false)}
 * >
 *   ...
 * </DropdownMenu>
 * ```
 */
export function DropdownMenu({
  trigger,
  children,
  position = 'bottom-left',
  className = '',
  isOpen: controlledIsOpen,
  onClose,
}: DropdownMenuProps) {
  // 非制御モードの状態
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // 制御/非制御の判定
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
  
  // refs
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // メニューを閉じる
  const closeMenu = useCallback(() => {
    if (isControlled) {
      onClose?.();
    } else {
      setInternalIsOpen(false);
    }
  }, [isControlled, onClose]);
  
  // トリガークリックハンドラ
  const handleTriggerClick = useCallback(() => {
    if (isControlled) {
      if (isOpen) {
        onClose?.();
      } else {
        // 制御コンポーネントの場合、開く処理は親に委譲
        // ただし、非制御的にtoggleしたい場合のためにサポート
      }
    } else {
      setInternalIsOpen(prev => !prev);
    }
  }, [isControlled, isOpen, onClose]);
  
  // 外部クリックで閉じる
  useClickOutside(menuRef, closeMenu, isOpen);
  
  // メニュー位置を計算
  const menuPosition = usePopupPosition({
    anchorRef: triggerRef,
    popupRef: menuRef,
    isOpen,
    position,
  });
  
  return (
    <>
      {/* トリガー */}
      {trigger({ onClick: handleTriggerClick, ref: triggerRef })}
      
      {/* メニュー（Portal経由でbody直下にレンダリング） */}
      {isOpen && createPortal(
        <div
          ref={menuRef}
          className={`dropdown-menu ${className}`}
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            zIndex: 1000,
          }}
          // 親要素のイベントを遮断
          onMouseDown={(e) => e.stopPropagation()}
          onDragStart={(e) => e.stopPropagation()}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
}
