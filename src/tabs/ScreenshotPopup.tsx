/**
 * TabBurrow - スクリーンショットポップアップコンポーネント
 * タブカードのホバー時に表示されるスクリーンショットプレビュー
 */

import { useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { usePopupPosition } from '../common/hooks/usePopupPosition';

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
  
  // ポップアップ位置計算を共通フックに委譲
  const popupPosition = usePopupPosition({
    popupRef,
    isOpen: isVisible,
    mousePos: isCompact ? mousePos : null,
    // anchorRectがある場合はその位置を基準にする（Refがない場合のフォールバック）
    // 本来はRefを渡すべきだが、既存構造を活かしつつ簡易化
    anchorRef: !isCompact && anchorRect ? { 
      current: { 
        getBoundingClientRect: () => anchorRect 
      } as HTMLElement 
    } : undefined,
    position: isCompact ? 'bottom-left' : 'bottom-right',
    offset: isCompact ? 16 : 12,
  });

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
      data-testid="screenshot-popup"
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
