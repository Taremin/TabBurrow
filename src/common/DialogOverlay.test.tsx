/**
 * TabBurrow - DialogOverlay コンポーネントのテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DialogOverlay } from './DialogOverlay';
import { I18nProvider } from './i18nContext';

// テスト用ラッパー
function renderWithI18n(ui: React.ReactElement) {
  return render(
    <I18nProvider>
      {ui}
    </I18nProvider>
  );
}

describe('DialogOverlay', () => {
  beforeEach(() => {
    // document.bodyをクリーンアップ
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('isOpen=falseの場合、何もレンダリングされない', () => {
    const onClose = vi.fn();
    renderWithI18n(
      <DialogOverlay isOpen={false} onClose={onClose}>
        <div data-testid="dialog-content">テスト</div>
      </DialogOverlay>
    );

    expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument();
  });

  it('isOpen=trueの場合、document.bodyにportalがレンダリングされる', () => {
    const onClose = vi.fn();
    renderWithI18n(
      <DialogOverlay isOpen={true} onClose={onClose}>
        <div data-testid="dialog-content">テスト</div>
      </DialogOverlay>
    );

    // ポータル経由でレンダリングされていることを確認
    expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
    // dialog-overlayクラスがあることを確認
    const overlay = document.querySelector('.dialog-overlay');
    expect(overlay).toBeInTheDocument();
  });

  it('オーバーレイクリックでonCloseが呼ばれる', () => {
    const onClose = vi.fn();
    renderWithI18n(
      <DialogOverlay isOpen={true} onClose={onClose}>
        <div data-testid="dialog-content">テスト</div>
      </DialogOverlay>
    );

    const overlay = document.querySelector('.dialog-overlay');
    expect(overlay).toBeInTheDocument();
    // mouseDown + click の組み合わせでダイアログが閉じる
    fireEvent.mouseDown(overlay!);
    fireEvent.click(overlay!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ダイアログ内クリックでonCloseが呼ばれない', () => {
    const onClose = vi.fn();
    renderWithI18n(
      <DialogOverlay isOpen={true} onClose={onClose}>
        <div data-testid="dialog-content" onClick={e => e.stopPropagation()}>テスト</div>
      </DialogOverlay>
    );

    const content = screen.getByTestId('dialog-content');
    fireEvent.click(content);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ダイアログ内でmousedownしてオーバーレイでclickしてもonCloseが呼ばれない（テキスト選択対応）', () => {
    const onClose = vi.fn();
    renderWithI18n(
      <DialogOverlay isOpen={true} onClose={onClose}>
        <div data-testid="dialog-content">テスト</div>
      </DialogOverlay>
    );

    const content = screen.getByTestId('dialog-content');
    const overlay = document.querySelector('.dialog-overlay');
    expect(overlay).toBeInTheDocument();

    // ダイアログ内でmousedownして、オーバーレイ上でmouseup（テキスト選択のシナリオ）
    fireEvent.mouseDown(content);
    fireEvent.click(overlay!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ESCキーでonCloseが呼ばれる', () => {
    const onClose = vi.fn();
    renderWithI18n(
      <DialogOverlay isOpen={true} onClose={onClose}>
        <div data-testid="dialog-content">テスト</div>
      </DialogOverlay>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('EnterキーでonEnterが呼ばれる（設定時のみ）', () => {
    const onClose = vi.fn();
    const onEnter = vi.fn();
    renderWithI18n(
      <DialogOverlay isOpen={true} onClose={onClose} onEnter={onEnter}>
        <div data-testid="dialog-content">テスト</div>
      </DialogOverlay>
    );

    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('onEnterが未設定の場合、Enterキーは何もしない', () => {
    const onClose = vi.fn();
    renderWithI18n(
      <DialogOverlay isOpen={true} onClose={onClose}>
        <div data-testid="dialog-content">テスト</div>
      </DialogOverlay>
    );

    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('追加のclassNameが適用される', () => {
    const onClose = vi.fn();
    renderWithI18n(
      <DialogOverlay isOpen={true} onClose={onClose} className="custom-class">
        <div data-testid="dialog-content">テスト</div>
      </DialogOverlay>
    );

    const overlay = document.querySelector('.dialog-overlay.custom-class');
    expect(overlay).toBeInTheDocument();
  });

  it('isOpenがtrueからfalseに変わるとレンダリングされなくなる', () => {
    const onClose = vi.fn();
    const { rerender } = renderWithI18n(
      <DialogOverlay isOpen={true} onClose={onClose}>
        <div data-testid="dialog-content">テスト</div>
      </DialogOverlay>
    );

    expect(screen.getByTestId('dialog-content')).toBeInTheDocument();

    rerender(
      <I18nProvider>
        <DialogOverlay isOpen={false} onClose={onClose}>
          <div data-testid="dialog-content">テスト</div>
        </DialogOverlay>
      </I18nProvider>
    );

    expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument();
  });
});
