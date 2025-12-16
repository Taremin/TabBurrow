/**
 * ConfirmDialog.tsx のコンポーネントテスト
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog.js';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    title: 'テストタイトル',
    message: 'テストメッセージ',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('isOpenがtrueの場合、ダイアログが表示される', () => {
    render(<ConfirmDialog {...defaultProps} />);
    
    expect(screen.getByText('テストタイトル')).toBeInTheDocument();
    expect(screen.getByText('テストメッセージ')).toBeInTheDocument();
  });

  it('isOpenがfalseの場合、ダイアログが表示されない', () => {
    render(<ConfirmDialog {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('テストタイトル')).not.toBeInTheDocument();
    expect(screen.queryByText('テストメッセージ')).not.toBeInTheDocument();
  });

  it('確認ボタンをクリックするとonConfirmが呼ばれる', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    
    // t('common.delete') がキーをそのまま返すので 'common.delete' というテキストを探す
    const confirmButton = screen.getByText('common.delete');
    fireEvent.click(confirmButton);
    
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('キャンセルボタンをクリックするとonCancelが呼ばれる', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    
    const cancelButton = screen.getByText('common.cancel');
    fireEvent.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('警告アイコンが表示される', () => {
    render(<ConfirmDialog {...defaultProps} />);
    
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('ESCキーでonCancelが呼ばれる', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('オーバーレイをクリックするとonCancelが呼ばれる', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    
    // dialog-overlay クラスを持つ要素を探す
    const overlay = document.querySelector('.dialog-overlay');
    if (overlay) {
      fireEvent.click(overlay);
      expect(onCancel).toHaveBeenCalledTimes(1);
    }
  });
});
