import { useState, useCallback, useEffect, RefObject } from 'react';

export type PopupPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'auto';

interface UsePopupPositionOptions {
  /** アンカーとなる要素。指定されている場合は要素の位置を基準にする */
  anchorRef?: RefObject<HTMLElement | null>;
  /** ポップアップ自体。高さを計算するために必要 */
  popupRef: RefObject<HTMLElement | null>;
  /** マウス位置を基準にする場合 */
  mousePos?: { x: number; y: number } | null;
  /** 表示中かどうか */
  isOpen: boolean;
  /** 表示位置の優先順位 */
  position?: PopupPosition;
  /** アンカーからのオフセット */
  offset?: number;
  /** 画面端からの最小マージン */
  margin?: number;
}

/**
 * ポップアップの表示位置を計算し、ビューポート内に収まるように調整するカスタムフック
 */
export function usePopupPosition({
  anchorRef,
  popupRef,
  mousePos,
  isOpen,
  position = 'bottom-left',
  offset = 4,
  margin = 8,
}: UsePopupPositionOptions) {
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!isOpen || !popupRef.current) return;

    const popupRect = popupRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let targetX = 0;
    let targetY = 0;
    let anchorWidth = 0;
    let anchorHeight = 0;

    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      targetX = rect.left;
      targetY = rect.bottom;
      anchorWidth = rect.width;
    } else if (mousePos) {
      targetX = mousePos.x;
      targetY = mousePos.y;
      // マウス追従時はtargetX, targetY自体がアンカー点
    } else {
      return;
    }

    let top = 0;
    let left = 0;

    // 垂直方向のリポジショニング
    if (position === 'top-left' || position === 'top-right') {
      top = (anchorRef?.current ? anchorRef.current.getBoundingClientRect().top : targetY) - popupRect.height - offset;
      if (top < margin) {
        top = (anchorRef?.current ? anchorRef.current.getBoundingClientRect().bottom : targetY) + offset;
      }
    } else {
      // デフォルト: 下方向
      top = targetY + offset;
      if (top + popupRect.height > viewportHeight - margin) {
        top = (anchorRef?.current ? anchorRef.current.getBoundingClientRect().top : targetY) - popupRect.height - offset;
      }
    }

    // 水平方向のリポジショニング
    if (position === 'bottom-right' || position === 'top-right') {
      left = targetX + anchorWidth - popupRect.width;
      if (left < margin) {
        left = targetX;
      }
    } else {
      // デフォルト: 左寄せ（アンカーの左端に合わせる）
      left = targetX;
      if (left + popupRect.width > viewportWidth - margin) {
        left = targetX + anchorWidth - popupRect.width;
      }
    }

    // 最終的な画面端のクランプ
    top = Math.max(margin, Math.min(top, viewportHeight - popupRect.height - margin));
    left = Math.max(margin, Math.min(left, viewportWidth - popupRect.width - margin));

    setCoords({ top, left });
  }, [isOpen, anchorRef, popupRef, mousePos, position, offset, margin]);

  useEffect(() => {
    if (isOpen) {
      // レンダリング直後は要素のサイズが取れない場合があるため、次のフレームで実行
      requestAnimationFrame(updatePosition);
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  return coords;
}
