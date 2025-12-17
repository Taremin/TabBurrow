/**
 * GroupHeader.tsx のコンポーネントテスト
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupHeader } from './GroupHeader.js';

describe('GroupHeader', () => {
  const defaultProps = {
    name: 'example.com',
    groupType: 'domain' as const,
    tabCount: 5,
    onDeleteGroup: vi.fn(),
    onOpenGroup: vi.fn(),
  };

  it('グループ名とタブ数を表示する', () => {
    render(<GroupHeader {...defaultProps} />);
    
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('(5)')).toBeInTheDocument();
  });

  it('ドメイングループにはフォルダアイコンが表示される', () => {
    render(<GroupHeader {...defaultProps} groupType="domain" />);
    
    expect(screen.getByText('📁')).toBeInTheDocument();
  });

  it('カスタムグループにはピンアイコンが表示される', () => {
    render(<GroupHeader {...defaultProps} groupType="custom" />);
    
    expect(screen.getByText('📌')).toBeInTheDocument();
  });

  it('ドメイングループにはdomain-groupクラスが適用される', () => {
    render(<GroupHeader {...defaultProps} groupType="domain" />);
    
    const header = document.querySelector('.group-header');
    expect(header).toHaveClass('domain-group');
    expect(header).not.toHaveClass('custom-group');
  });

  it('カスタムグループにはcustom-groupクラスが適用される', () => {
    render(<GroupHeader {...defaultProps} groupType="custom" />);
    
    const header = document.querySelector('.group-header');
    expect(header).toHaveClass('custom-group');
    expect(header).not.toHaveClass('domain-group');
  });

  it('開くボタンをクリックするとonOpenGroupが呼ばれる', () => {
    const onOpenGroup = vi.fn();
    render(<GroupHeader {...defaultProps} onOpenGroup={onOpenGroup} />);
    
    // t() がキーを返すので 'tabManager.group.openButton'
    const openButton = screen.getByText('tabManager.group.openButton');
    fireEvent.click(openButton);
    
    expect(onOpenGroup).toHaveBeenCalledWith('example.com');
  });

  it('削除ボタンをクリックするとonDeleteGroupが呼ばれる', () => {
    const onDeleteGroup = vi.fn();
    render(<GroupHeader {...defaultProps} onDeleteGroup={onDeleteGroup} />);
    
    const deleteButton = screen.getByText('tabManager.group.deleteButton');
    fireEvent.click(deleteButton);
    
    expect(onDeleteGroup).toHaveBeenCalledWith('example.com', 'domain');
  });

  it('カスタムグループでonRenameGroupがあると編集ボタンが表示される', () => {
    const onRenameGroup = vi.fn();
    render(
      <GroupHeader 
        {...defaultProps} 
        groupType="custom" 
        onRenameGroup={onRenameGroup} 
      />
    );
    
    expect(screen.getByText('✏️')).toBeInTheDocument();
  });

  it('ドメイングループでは編集ボタンが表示されない', () => {
    const onRenameGroup = vi.fn();
    render(
      <GroupHeader 
        {...defaultProps} 
        groupType="domain" 
        onRenameGroup={onRenameGroup} 
      />
    );
    
    expect(screen.queryByText('✏️')).not.toBeInTheDocument();
  });
});

describe('GroupHeader - 選択モード', () => {
  const defaultProps = {
    name: 'example.com',
    groupType: 'domain' as const,
    tabCount: 5,
    onDeleteGroup: vi.fn(),
    onOpenGroup: vi.fn(),
  };

  it('選択モード時にチェックボックスが表示される', () => {
    render(
      <GroupHeader
        {...defaultProps}
        isSelectionMode={true}
        groupTabIds={['tab1', 'tab2']}
        selectedTabIds={new Set<string>()}
        onSelectGroup={vi.fn()}
        onDeselectGroup={vi.fn()}
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('非選択モード時にチェックボックスが表示されない', () => {
    render(
      <GroupHeader
        {...defaultProps}
        isSelectionMode={false}
      />
    );
    
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('全タブ選択時にチェックボックスがチェック状態', () => {
    render(
      <GroupHeader
        {...defaultProps}
        isSelectionMode={true}
        groupTabIds={['tab1', 'tab2']}
        selectedTabIds={new Set(['tab1', 'tab2'])}
        onSelectGroup={vi.fn()}
        onDeselectGroup={vi.fn()}
      />
    );
    
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(checkbox.indeterminate).toBe(false);
  });

  it('部分選択時にチェックボックスがindeterminate状態', () => {
    render(
      <GroupHeader
        {...defaultProps}
        isSelectionMode={true}
        groupTabIds={['tab1', 'tab2', 'tab3']}
        selectedTabIds={new Set(['tab1'])}
        onSelectGroup={vi.fn()}
        onDeselectGroup={vi.fn()}
      />
    );
    
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.indeterminate).toBe(true);
  });

  it('チェックボックスクリックでonSelectGroupが呼ばれる（未選択→全選択）', () => {
    const onSelectGroup = vi.fn();
    render(
      <GroupHeader
        {...defaultProps}
        isSelectionMode={true}
        groupTabIds={['tab1', 'tab2']}
        selectedTabIds={new Set<string>()}
        onSelectGroup={onSelectGroup}
        onDeselectGroup={vi.fn()}
      />
    );
    
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onSelectGroup).toHaveBeenCalledWith(['tab1', 'tab2']);
  });

  it('チェックボックスクリックでonDeselectGroupが呼ばれる（全選択→解除）', () => {
    const onDeselectGroup = vi.fn();
    render(
      <GroupHeader
        {...defaultProps}
        isSelectionMode={true}
        groupTabIds={['tab1', 'tab2']}
        selectedTabIds={new Set(['tab1', 'tab2'])}
        onSelectGroup={vi.fn()}
        onDeselectGroup={onDeselectGroup}
      />
    );
    
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onDeselectGroup).toHaveBeenCalledWith(['tab1', 'tab2']);
  });

  it('部分選択時のチェックボックスクリックでonDeselectGroupが呼ばれる', () => {
    const onDeselectGroup = vi.fn();
    render(
      <GroupHeader
        {...defaultProps}
        isSelectionMode={true}
        groupTabIds={['tab1', 'tab2', 'tab3']}
        selectedTabIds={new Set(['tab1', 'tab2'])}
        onSelectGroup={vi.fn()}
        onDeselectGroup={onDeselectGroup}
      />
    );
    
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onDeselectGroup).toHaveBeenCalledWith(['tab1', 'tab2', 'tab3']);
  });

  it('groupTabIdsが空の場合、チェックボックスは表示されない', () => {
    render(
      <GroupHeader
        {...defaultProps}
        isSelectionMode={true}
        groupTabIds={[]}
        selectedTabIds={new Set<string>()}
        onSelectGroup={vi.fn()}
        onDeselectGroup={vi.fn()}
      />
    );
    
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});

describe('GroupHeader - タブグループとして開く', () => {
  const defaultProps = {
    name: 'example.com',
    groupType: 'domain' as const,
    tabCount: 5,
    onDeleteGroup: vi.fn(),
    onOpenGroup: vi.fn(),
  };

  it('onOpenGroupAsTabGroupがあるとボタンが表示される', () => {
    const onOpenGroupAsTabGroup = vi.fn();
    render(
      <GroupHeader
        {...defaultProps}
        onOpenGroupAsTabGroup={onOpenGroupAsTabGroup}
      />
    );
    
    // 翻訳キーが返される（テスト環境ではt()はキーをそのまま返す）
    expect(screen.getByText('tabManager.group.openAsTabGroupButton')).toBeInTheDocument();
  });

  it('onOpenGroupAsTabGroupがない場合はボタンが表示されない', () => {
    render(<GroupHeader {...defaultProps} />);
    
    expect(screen.queryByText('tabManager.group.openAsTabGroupButton')).not.toBeInTheDocument();
  });

  it('ボタンをクリックするとonOpenGroupAsTabGroupが呼ばれる', () => {
    const onOpenGroupAsTabGroup = vi.fn();
    render(
      <GroupHeader
        {...defaultProps}
        onOpenGroupAsTabGroup={onOpenGroupAsTabGroup}
      />
    );
    
    const button = screen.getByText('tabManager.group.openAsTabGroupButton');
    fireEvent.click(button);
    
    expect(onOpenGroupAsTabGroup).toHaveBeenCalledWith('example.com');
  });
});
