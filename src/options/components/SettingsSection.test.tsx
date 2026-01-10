/**
 * SettingsSection.tsx のコンポーネントテスト
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsSection } from './SettingsSection';

describe('SettingsSection', () => {
  const defaultProps = {
    icon: '⚙️',
    title: 'テストタイトル',
    description: 'これは説明文です',
    children: <div data-testid="content">子要素のコンテンツ</div>,
  };

  it('アイコンが表示される', () => {
    render(<SettingsSection {...defaultProps} />);
    
    expect(screen.getByText('⚙️')).toBeInTheDocument();
  });

  it('タイトルが表示される', () => {
    render(<SettingsSection {...defaultProps} />);
    
    expect(screen.getByText('テストタイトル')).toBeInTheDocument();
  });

  it('説明文が表示される', () => {
    render(<SettingsSection {...defaultProps} />);
    
    expect(screen.getByText('これは説明文です')).toBeInTheDocument();
  });

  it('子要素がレンダリングされる', () => {
    render(<SettingsSection {...defaultProps} />);
    
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByText('子要素のコンテンツ')).toBeInTheDocument();
  });

  it('settings-sectionクラスが適用される', () => {
    render(<SettingsSection {...defaultProps} />);
    
    const section = document.querySelector('.settings-section');
    expect(section).toBeInTheDocument();
  });

  it('section-iconクラスを持つ要素がアイコンを含む', () => {
    render(<SettingsSection {...defaultProps} />);
    
    const iconElement = document.querySelector('.section-icon');
    expect(iconElement).toBeInTheDocument();
    expect(iconElement?.textContent).toBe('⚙️');
  });
});
