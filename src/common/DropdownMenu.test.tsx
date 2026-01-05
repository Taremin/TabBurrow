/**
 * DropdownMenu.tsx のユニットテスト
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DropdownMenu } from './DropdownMenu';

describe('DropdownMenu', () => {
  describe('非制御モード', () => {
    it('トリガーをクリックするとメニューが開く', async () => {
      render(
        <DropdownMenu
          trigger={({ onClick, ref }) => (
            <button ref={ref} onClick={onClick} data-testid="trigger">
              トリガー
            </button>
          )}
        >
          <div data-testid="menu-content">メニュー内容</div>
        </DropdownMenu>
      );

      // 最初はメニューが非表示
      expect(screen.queryByTestId('menu-content')).not.toBeInTheDocument();

      // トリガーをクリック
      await act(async () => {
        fireEvent.click(screen.getByTestId('trigger'));
      });

      // メニューが表示される
      expect(screen.getByTestId('menu-content')).toBeInTheDocument();
    });

    it('再度トリガーをクリックするとメニューが閉じる', async () => {
      render(
        <DropdownMenu
          trigger={({ onClick, ref }) => (
            <button ref={ref} onClick={onClick} data-testid="trigger">
              トリガー
            </button>
          )}
        >
          <div data-testid="menu-content">メニュー内容</div>
        </DropdownMenu>
      );

      // メニューを開く
      await act(async () => {
        fireEvent.click(screen.getByTestId('trigger'));
      });
      expect(screen.getByTestId('menu-content')).toBeInTheDocument();

      // 再度クリックして閉じる
      await act(async () => {
        fireEvent.click(screen.getByTestId('trigger'));
      });
      expect(screen.queryByTestId('menu-content')).not.toBeInTheDocument();
    });
  });

  describe('制御モード', () => {
    it('isOpenがtrueの時にメニューが表示される', () => {
      render(
        <DropdownMenu
          trigger={({ onClick, ref }) => (
            <button ref={ref} onClick={onClick} data-testid="trigger">
              トリガー
            </button>
          )}
          isOpen={true}
          onClose={() => {}}
        >
          <div data-testid="menu-content">メニュー内容</div>
        </DropdownMenu>
      );

      expect(screen.getByTestId('menu-content')).toBeInTheDocument();
    });

    it('isOpenがfalseの時にメニューが非表示', () => {
      render(
        <DropdownMenu
          trigger={({ onClick, ref }) => (
            <button ref={ref} onClick={onClick} data-testid="trigger">
              トリガー
            </button>
          )}
          isOpen={false}
          onClose={() => {}}
        >
          <div data-testid="menu-content">メニュー内容</div>
        </DropdownMenu>
      );

      expect(screen.queryByTestId('menu-content')).not.toBeInTheDocument();
    });
  });

  describe('スタイル', () => {
    it('classNameが適用される', async () => {
      render(
        <DropdownMenu
          trigger={({ onClick, ref }) => (
            <button ref={ref} onClick={onClick} data-testid="trigger">
              トリガー
            </button>
          )}
          className="custom-class"
        >
          <div data-testid="menu-content">メニュー内容</div>
        </DropdownMenu>
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('trigger'));
      });
      
      const menu = screen.getByTestId('menu-content').parentElement;
      expect(menu).toHaveClass('dropdown-menu', 'custom-class');
    });

    it('メニューはPortalでbody直下にレンダリングされる', async () => {
      render(
        <div data-testid="parent">
          <DropdownMenu
            trigger={({ onClick, ref }) => (
              <button ref={ref} onClick={onClick} data-testid="trigger">
                トリガー
              </button>
            )}
          >
            <div data-testid="menu-content">メニュー内容</div>
          </DropdownMenu>
        </div>
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('trigger'));
      });
      
      const menu = screen.getByTestId('menu-content').parentElement;
      // Portalによりbody直下にレンダリングされる
      expect(menu?.parentElement).toBe(document.body);
    });
  });
});
