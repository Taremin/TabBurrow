/**
 * LinkCheckRuleDialog.tsx のコンポーネントテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LinkCheckRuleDialog } from './LinkCheckRuleDialog.js';
import type { LinkCheckRule } from '../../settings.js';

describe('LinkCheckRuleDialog', () => {
  const defaultProps = {
    isOpen: true,
    editingRule: null as LinkCheckRule | null,
    onSave: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('表示制御', () => {
    it('isOpenがtrueの場合、ダイアログが表示される', () => {
      render(<LinkCheckRuleDialog {...defaultProps} />);
      
      // ダイアログタイトルが表示される（t関数がキーを返すため）
      expect(screen.getByText('linkCheck.settings.addRule')).toBeInTheDocument();
    });

    it('isOpenがfalseの場合、ダイアログが表示されない', () => {
      render(<LinkCheckRuleDialog {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('linkCheck.settings.addRule')).not.toBeInTheDocument();
    });

    it('新規追加時は「ルール追加」タイトルが表示される', () => {
      render(<LinkCheckRuleDialog {...defaultProps} editingRule={null} />);
      
      expect(screen.getByText('linkCheck.settings.addRule')).toBeInTheDocument();
    });

    it('編集時は「ルール編集」タイトルが表示される', () => {
      const editingRule: LinkCheckRule = {
        id: 'test-id',
        enabled: true,
        name: 'テストルール',
        condition: '404',
        action: 'dead',
      };
      render(<LinkCheckRuleDialog {...defaultProps} editingRule={editingRule} />);
      
      expect(screen.getByText('linkCheck.settings.editRule')).toBeInTheDocument();
    });
  });

  describe('フォーム入力', () => {
    it('ルール名を入力できる', () => {
      render(<LinkCheckRuleDialog {...defaultProps} />);
      
      const nameInput = screen.getByLabelText('linkCheck.settings.dialog.name');
      fireEvent.change(nameInput, { target: { value: 'カスタムルール' } });
      
      expect(nameInput).toHaveValue('カスタムルール');
    });

    it('条件を入力できる', () => {
      render(<LinkCheckRuleDialog {...defaultProps} />);
      
      const conditionInput = screen.getByLabelText('linkCheck.settings.dialog.conditionLabel');
      fireEvent.change(conditionInput, { target: { value: '404' } });
      
      expect(conditionInput).toHaveValue('404');
    });

    it('アクションを選択できる', () => {
      render(<LinkCheckRuleDialog {...defaultProps} />);
      
      const actionSelect = screen.getByLabelText('linkCheck.settings.dialog.actionLabel');
      fireEvent.change(actionSelect, { target: { value: 'dead' } });
      
      expect(actionSelect).toHaveValue('dead');
    });

    it('編集時に既存の値が初期表示される', () => {
      const editingRule: LinkCheckRule = {
        id: 'test-id',
        enabled: true,
        name: '404エラー',
        condition: '404',
        action: 'dead',
      };
      render(<LinkCheckRuleDialog {...defaultProps} editingRule={editingRule} />);
      
      const nameInput = screen.getByLabelText('linkCheck.settings.dialog.name');
      const conditionInput = screen.getByLabelText('linkCheck.settings.dialog.conditionLabel');
      const actionSelect = screen.getByLabelText('linkCheck.settings.dialog.actionLabel');
      
      expect(nameInput).toHaveValue('404エラー');
      expect(conditionInput).toHaveValue('404');
      expect(actionSelect).toHaveValue('dead');
    });
  });

  describe('バリデーション', () => {
    it('条件が空の場合、エラーが表示され保存されない', () => {
      const onSave = vi.fn();
      render(<LinkCheckRuleDialog {...defaultProps} onSave={onSave} />);
      
      const saveButton = screen.getByText('linkCheck.settings.dialog.save');
      fireEvent.click(saveButton);
      
      // エラーメッセージが表示される
      expect(screen.getByText('linkCheck.settings.dialog.conditionRequired')).toBeInTheDocument();
      // onSaveは呼ばれない
      expect(onSave).not.toHaveBeenCalled();
    });

    it('条件を入力するとエラーがクリアされる', () => {
      render(<LinkCheckRuleDialog {...defaultProps} />);
      
      // まず空で保存を試行
      const saveButton = screen.getByText('linkCheck.settings.dialog.save');
      fireEvent.click(saveButton);
      
      expect(screen.getByText('linkCheck.settings.dialog.conditionRequired')).toBeInTheDocument();
      
      // 条件を入力
      const conditionInput = screen.getByLabelText('linkCheck.settings.dialog.conditionLabel');
      fireEvent.change(conditionInput, { target: { value: '404' } });
      
      // エラーがクリアされる
      expect(screen.queryByText('linkCheck.settings.dialog.conditionRequired')).not.toBeInTheDocument();
    });
  });

  describe('保存処理', () => {
    it('条件を入力して保存するとonSaveが呼ばれる', () => {
      const onSave = vi.fn();
      const onClose = vi.fn();
      render(<LinkCheckRuleDialog {...defaultProps} onSave={onSave} onClose={onClose} />);
      
      // 条件を入力
      const conditionInput = screen.getByLabelText('linkCheck.settings.dialog.conditionLabel');
      fireEvent.change(conditionInput, { target: { value: '404' } });
      
      // 保存
      const saveButton = screen.getByText('linkCheck.settings.dialog.save');
      fireEvent.click(saveButton);
      
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        condition: '404',
        action: 'warning', // デフォルト値
        enabled: true,
      }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('ルール名が空の場合、条件がルール名として使用される', () => {
      const onSave = vi.fn();
      render(<LinkCheckRuleDialog {...defaultProps} onSave={onSave} />);
      
      const conditionInput = screen.getByLabelText('linkCheck.settings.dialog.conditionLabel');
      fireEvent.change(conditionInput, { target: { value: '5xx' } });
      
      const saveButton = screen.getByText('linkCheck.settings.dialog.save');
      fireEvent.click(saveButton);
      
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        name: '5xx',
        condition: '5xx',
      }));
    });

    it('編集時は既存のIDとenabledを維持する', () => {
      const onSave = vi.fn();
      const editingRule: LinkCheckRule = {
        id: 'existing-id',
        enabled: false, // 無効化されている
        name: '古い名前',
        condition: '404',
        action: 'dead',
      };
      render(<LinkCheckRuleDialog {...defaultProps} editingRule={editingRule} onSave={onSave} />);
      
      // 条件を変更
      const conditionInput = screen.getByLabelText('linkCheck.settings.dialog.conditionLabel');
      fireEvent.change(conditionInput, { target: { value: '500' } });
      
      const saveButton = screen.getByText('linkCheck.settings.dialog.save');
      fireEvent.click(saveButton);
      
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        id: 'existing-id',
        enabled: false,
        condition: '500',
      }));
    });
  });

  describe('キャンセル処理', () => {
    it('キャンセルボタンをクリックするとonCloseが呼ばれる', () => {
      const onClose = vi.fn();
      render(<LinkCheckRuleDialog {...defaultProps} onClose={onClose} />);
      
      const cancelButton = screen.getByText('linkCheck.settings.dialog.cancel');
      fireEvent.click(cancelButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('オーバーレイをクリックするとonCloseが呼ばれる', () => {
      const onClose = vi.fn();
      render(<LinkCheckRuleDialog {...defaultProps} onClose={onClose} />);
      
      const overlay = document.querySelector('.dialog-overlay');
      if (overlay) {
        fireEvent.mouseDown(overlay);
        fireEvent.click(overlay);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });
  });
});
