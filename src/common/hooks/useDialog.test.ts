/**
 * useDialog.ts のユニットテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { useDialog } from './useDialog.js';

describe('useDialog', () => {
  describe('ESCキー処理', () => {
    it('ESCキーを押すとonCloseが呼ばれる', () => {
      const onClose = vi.fn();
      renderHook(() => useDialog({ isOpen: true, onClose }));

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('isOpenがfalseの場合、ESCキーを押してもonCloseは呼ばれない', () => {
      const onClose = vi.fn();
      renderHook(() => useDialog({ isOpen: false, onClose }));

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('ダイアログが閉じられたらイベントリスナーが解除される', () => {
      const onClose = vi.fn();
      const { rerender } = renderHook(
        ({ isOpen }) => useDialog({ isOpen, onClose }),
        { initialProps: { isOpen: true } }
      );

      // ダイアログを閉じる
      rerender({ isOpen: false });

      // ESCキーを押しても反応しない
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Enterキー処理', () => {
    it('EnterキーでonEnterが呼ばれる', () => {
      const onClose = vi.fn();
      const onEnter = vi.fn();
      renderHook(() => useDialog({ isOpen: true, onClose, onEnter }));

      fireEvent.keyDown(document, { key: 'Enter' });

      expect(onEnter).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('onEnterが未定義の場合、Enterキーを押しても何も起きない', () => {
      const onClose = vi.fn();
      renderHook(() => useDialog({ isOpen: true, onClose }));

      fireEvent.keyDown(document, { key: 'Enter' });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('オーバーレイクリック', () => {
    it('オーバーレイをクリックするとonCloseが呼ばれる', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => useDialog({ isOpen: true, onClose }));

      // e.target と e.currentTarget が同じ場合（オーバーレイ直接クリック）
      const mockEvent = {
        target: 'overlay',
        currentTarget: 'overlay',
      } as unknown as React.MouseEvent;

      result.current.handleOverlayClick(mockEvent);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('ダイアログ内部をクリックしてもonCloseは呼ばれない', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => useDialog({ isOpen: true, onClose }));

      // e.target と e.currentTarget が異なる場合（ダイアログ内部クリック）
      const mockEvent = {
        target: 'dialogContent',
        currentTarget: 'overlay',
      } as unknown as React.MouseEvent;

      result.current.handleOverlayClick(mockEvent);

      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
