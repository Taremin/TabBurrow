/**
 * useClickOutside.ts のユニットテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { useRef, type RefObject } from 'react';
import { useClickOutside } from './useClickOutside.js';

// requestAnimationFrameのモック（即時実行）
beforeEach(() => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useClickOutside', () => {
  // テスト用DOM要素
  let container: HTMLDivElement;
  let targetElement: HTMLDivElement;
  let outsideElement: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    targetElement = document.createElement('div');
    targetElement.setAttribute('data-testid', 'target');
    outsideElement = document.createElement('div');
    outsideElement.setAttribute('data-testid', 'outside');
    
    container.appendChild(targetElement);
    container.appendChild(outsideElement);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('外部をクリックするとhandlerが呼ばれる', () => {
    const handler = vi.fn();
    
    // refを直接作成してテスト
    const ref = { current: targetElement } as RefObject<HTMLDivElement>;
    renderHook(() => useClickOutside(ref, handler));

    // 外部要素をクリック
    fireEvent.mouseDown(outsideElement);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('内部をクリックしてもhandlerは呼ばれない', () => {
    const handler = vi.fn();
    
    const ref = { current: targetElement } as RefObject<HTMLDivElement>;
    renderHook(() => useClickOutside(ref, handler));

    // ターゲット要素をクリック
    fireEvent.mouseDown(targetElement);

    expect(handler).not.toHaveBeenCalled();
  });

  it('enabled=falseの場合、handlerは呼ばれない', () => {
    const handler = vi.fn();
    
    const ref = { current: targetElement } as RefObject<HTMLDivElement>;
    renderHook(() => useClickOutside(ref, handler, false));

    // 外部要素をクリック
    fireEvent.mouseDown(outsideElement);

    expect(handler).not.toHaveBeenCalled();
  });

  it('enabledがtrueに変わると検出が有効になる', () => {
    const handler = vi.fn();
    
    const ref = { current: targetElement } as RefObject<HTMLDivElement>;
    const { rerender } = renderHook(
      ({ enabled }) => useClickOutside(ref, handler, enabled),
      { initialProps: { enabled: false } }
    );

    // 無効時: 外部クリックしても呼ばれない
    fireEvent.mouseDown(outsideElement);
    expect(handler).not.toHaveBeenCalled();

    // 有効に切り替え
    rerender({ enabled: true });

    // 有効時: 外部クリックで呼ばれる
    fireEvent.mouseDown(outsideElement);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('refがnullの場合は何もしない', () => {
    const handler = vi.fn();
    
    const ref = { current: null } as RefObject<HTMLDivElement>;
    renderHook(() => useClickOutside(ref, handler));

    // どこをクリックしてもエラーにならない
    fireEvent.mouseDown(outsideElement);
    expect(handler).not.toHaveBeenCalled();
  });
});
