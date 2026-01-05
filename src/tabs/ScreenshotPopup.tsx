/**
 * TabBurrow - スクリーンショットポップアップコンポーネント
 * タブカードのホバー時に表示されるスクリーンショットプレビュー
 */

import { useRef, useEffect, useState, memo } from 'react';
import { createPortal } from 'react-dom';

interface ScreenshotPopupProps {
  isVisible: boolean;
  isCompact: boolean;
  screenshotUrl: string | null;
  tab: {
    title: string;
    displayName?: string;
    url: string;
  };
  /** マウス位置（コンパクト表示時のポップアップ配置に使用） */
  mousePos: { x: number; y: number };
  /** 通常表示時のアンカー要素の位置 */
  anchorRect?: DOMRect | null;
  /** ポップアップを閉じる際のコールバック */
  onClose?: () => void;
}

/**
 * スクリーンショットポップアップコンポーネント
 * - 通常表示時: 要素の右側に固定表示
 * - コンパクト表示時: マウス位置に追従
 */
export const ScreenshotPopup = memo(function ScreenshotPopup({
  isVisible,
  isCompact,
  screenshotUrl,
  tab,
  mousePos,
  anchorRect,
}: ScreenshotPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupPosition, setPopupPosition] = useState({ left: -9999, top: -9999 });

  // ポップアップ位置計算（コンパクト表示時）
  useEffect(() => {
    if (!isCompact || !isVisible || !popupRef.current) return;

    const rect = popupRef.current.getBoundingClientRect();
    const popupWidth = rect.width;
    const popupHeight = rect.height;
    const cursorOffset = 16;

    // 右側に収まるかチェック
    const canFitRight = mousePos.x + cursorOffset + popupWidth <= window.innerWidth;

    let left: number;
    let top = mousePos.y + cursorOffset;

    if (canFitRight) {
      left = mousePos.x + cursorOffset;
    } else {
      left = mousePos.x - popupWidth - cursorOffset;
    }

    // 画面端の調整
    if (left < 12) {
      left = 12;
    }
    if (top + popupHeight > window.innerHeight) {
      top = window.innerHeight - popupHeight - 12;
    }
    if (top < 12) {
      top = 12;
    }

    setPopupPosition({ left, top });
  }, [isCompact, isVisible, mousePos.x, mousePos.y]);

  // ポップアップ位置計算（通常表示時）
  useEffect(() => {
    if (isCompact || !isVisible || !anchorRect) return;

    const popupWidth = 400 + 16; // 予測値
    const popupHeight = 300 + 16;
    let left = anchorRect.right + 12;
    let top = anchorRect.top;

    // 右側に収まらない場合は左側に表示
    if (left + popupWidth > window.innerWidth) {
      left = anchorRect.left - popupWidth - 12;
    }
    // 左端に収まらない場合は画面左端に配置
    if (left < 12) {
      left = 12;
    }
    if (top + popupHeight > window.innerHeight) {
      top = window.innerHeight - popupHeight - 12;
    }
    if (top < 12) {
      top = 12;
    }

    setPopupPosition({ left, top });
  }, [isCompact, isVisible, anchorRect]);

  if (!isVisible) return null;

  return createPortal(
    <div
      ref={popupRef}
      className={`screenshot-popup ${isCompact ? 'compact-popup' : ''}`}
      style={{
        display: 'block',
        position: 'fixed',
        left: popupPosition.left,
        top: popupPosition.top,
      }}
    >
      {screenshotUrl && (
        <img src={screenshotUrl} alt="Screenshot" />
      )}
      {isCompact && (
        <div className="popup-info">
          <div className="popup-title">{tab.displayName || tab.title}</div>
          {tab.displayName && (
            <div className="popup-original-title">{tab.title}</div>
          )}
          <div className="popup-url">{tab.url}</div>
        </div>
      )}
    </div>,
    document.body
  );
});
