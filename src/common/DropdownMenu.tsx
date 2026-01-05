/**
 * TabBurrow - 汎用ドロップダウンメニューコンポーネント
 * 外部クリックで閉じる機能とPortalを使用したbody直下レンダリングをサポート
 */

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useClickOutside } from './hooks/useClickOutside.js';

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
  
  // メニュー位置
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  
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
  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current || !menuRef.current) return;
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let top = 0;
    let left = 0;
    
    // 垂直位置
    if (position.startsWith('top')) {
      top = triggerRect.top - menuRect.height - 4;
      // 画面上部に収まらない場合は下に表示
      if (top < 8) {
        top = triggerRect.bottom + 4;
      }
    } else {
      top = triggerRect.bottom + 4;
      // 画面下部に収まらない場合は上に表示
      if (top + menuRect.height > viewportHeight - 8) {
        top = triggerRect.top - menuRect.height - 4;
      }
    }
    
    // 水平位置
    if (position.endsWith('right')) {
      left = triggerRect.right - menuRect.width;
      // 画面左端に収まらない場合は右寄せ
      if (left < 8) {
        left = triggerRect.left;
      }
    } else {
      left = triggerRect.left;
      // 画面右端に収まらない場合は左寄せ
      if (left + menuRect.width > viewportWidth - 8) {
        left = triggerRect.right - menuRect.width;
      }
    }
    
    // 最終調整
    top = Math.max(8, Math.min(top, viewportHeight - menuRect.height - 8));
    left = Math.max(8, Math.min(left, viewportWidth - menuRect.width - 8));
    
    setMenuPosition({ top, left });
  }, [position]);
  
  // メニューが開いた時に位置を計算
  useEffect(() => {
    if (isOpen) {
      // 次のフレームで位置を計算（メニューがレンダリングされた後）
      requestAnimationFrame(updateMenuPosition);
    }
  }, [isOpen, updateMenuPosition]);
  
  // ウィンドウリサイズ時に位置を再計算
  useEffect(() => {
    if (!isOpen) return;
    
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen, updateMenuPosition]);
  
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
