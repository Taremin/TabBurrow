/**
 * CustomGroupSettings.tsx のコンポーネントテスト
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CustomGroupSettings } from './CustomGroupSettings.js';
import * as storage from '../../storage.js';
import type { CustomGroupMeta, SavedTab } from '../../storage.js';

// storage モジュールをモック
vi.mock('../../storage.js', () => ({
  getAllCustomGroups: vi.fn(),
  getAllTabs: vi.fn(),
  createCustomGroup: vi.fn(),
  renameCustomGroup: vi.fn(),
  deleteCustomGroup: vi.fn(),
}));

// i18nContextをモック
vi.mock('../../common/i18nContext.js', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'settings.customGroups.empty': 'カスタムグループはありません',
        'settings.customGroups.tabCount': `${params?.count || 0} タブ`,
        'settings.customGroups.addGroup': '新規グループを作成',
        'settings.customGroups.editGroup': 'グループ名を編集',
        'settings.customGroups.deleteGroup': 'グループを削除',
        'settings.customGroups.createDialogTitle': '新規グループ名を入力',
        'settings.customGroups.renameDialogTitle': 'グループ名を入力',
        'settings.customGroups.deleteConfirmTitle': 'グループを削除',
        'settings.customGroups.deleteConfirmMessage': `「${params?.name || ''}」を削除しますか？`,
        'settings.customGroups.duplicateError': '同じ名前のグループが既に存在します',
        'settings.customGroups.emptyNameError': 'グループ名を入力してください',
        'common.delete': '削除',
        'common.cancel': 'キャンセル',
        'dialog.ok': 'OK',
        'dialog.promptPlaceholder': '入力してください',
      };
      return translations[key] || key;
    },
  }),
}));

describe('CustomGroupSettings', () => {
  const mockGroups: CustomGroupMeta[] = [
    { name: '仕事用', createdAt: 1000, updatedAt: 1000 },
    { name: '参考資料', createdAt: 2000, updatedAt: 2000 },
  ];

  const mockTabs: SavedTab[] = [
    { id: '1', url: 'https://example.com', title: 'Example', domain: 'example.com', group: '仕事用', groupType: 'custom', favIconUrl: '', screenshot: new Blob(), lastAccessed: 0, savedAt: 0 },
    { id: '2', url: 'https://test.com', title: 'Test', domain: 'test.com', group: '仕事用', groupType: 'custom', favIconUrl: '', screenshot: new Blob(), lastAccessed: 0, savedAt: 0 },
    { id: '3', url: 'https://ref.com', title: 'Ref', domain: 'ref.com', group: '参考資料', groupType: 'custom', favIconUrl: '', screenshot: new Blob(), lastAccessed: 0, savedAt: 0 },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('グループがない場合は空メッセージが表示される', async () => {
    vi.mocked(storage.getAllCustomGroups).mockResolvedValue([]);
    vi.mocked(storage.getAllTabs).mockResolvedValue([]);

    render(<CustomGroupSettings />);

    await waitFor(() => {
      expect(screen.getByText('カスタムグループはありません')).toBeInTheDocument();
    });
  });

  it('グループ一覧が表示される', async () => {
    vi.mocked(storage.getAllCustomGroups).mockResolvedValue(mockGroups);
    vi.mocked(storage.getAllTabs).mockResolvedValue(mockTabs);

    render(<CustomGroupSettings />);

    await waitFor(() => {
      expect(screen.getByText('仕事用')).toBeInTheDocument();
      expect(screen.getByText('参考資料')).toBeInTheDocument();
    });
  });

  it('各グループのタブ数が表示される', async () => {
    vi.mocked(storage.getAllCustomGroups).mockResolvedValue(mockGroups);
    vi.mocked(storage.getAllTabs).mockResolvedValue(mockTabs);

    render(<CustomGroupSettings />);

    await waitFor(() => {
      // 仕事用: 2タブ、参考資料: 1タブ
      expect(screen.getByText('(2 タブ)')).toBeInTheDocument();
      expect(screen.getByText('(1 タブ)')).toBeInTheDocument();
    });
  });

  it('新規グループ作成ボタンが表示される', async () => {
    vi.mocked(storage.getAllCustomGroups).mockResolvedValue([]);
    vi.mocked(storage.getAllTabs).mockResolvedValue([]);

    render(<CustomGroupSettings />);

    await waitFor(() => {
      expect(screen.getByText('新規グループを作成')).toBeInTheDocument();
    });
  });

  it('編集ボタンが各グループに表示される', async () => {
    vi.mocked(storage.getAllCustomGroups).mockResolvedValue(mockGroups);
    vi.mocked(storage.getAllTabs).mockResolvedValue(mockTabs);

    render(<CustomGroupSettings />);

    await waitFor(() => {
      const editButtons = screen.getAllByTitle('グループ名を編集');
      expect(editButtons).toHaveLength(2);
    });
  });

  it('削除ボタンが各グループに表示される', async () => {
    vi.mocked(storage.getAllCustomGroups).mockResolvedValue(mockGroups);
    vi.mocked(storage.getAllTabs).mockResolvedValue(mockTabs);

    render(<CustomGroupSettings />);

    await waitFor(() => {
      const deleteButtons = screen.getAllByTitle('グループを削除');
      expect(deleteButtons).toHaveLength(2);
    });
  });

  it('新規グループ作成ボタンをクリックするとダイアログが開く', async () => {
    vi.mocked(storage.getAllCustomGroups).mockResolvedValue([]);
    vi.mocked(storage.getAllTabs).mockResolvedValue([]);

    render(<CustomGroupSettings />);

    await waitFor(() => {
      expect(screen.getByText('新規グループを作成')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('新規グループを作成'));

    await waitFor(() => {
      expect(screen.getByText('新規グループ名を入力')).toBeInTheDocument();
    });
  });

  it('編集ボタンをクリックするとダイアログが開く', async () => {
    vi.mocked(storage.getAllCustomGroups).mockResolvedValue(mockGroups);
    vi.mocked(storage.getAllTabs).mockResolvedValue(mockTabs);

    render(<CustomGroupSettings />);

    await waitFor(() => {
      expect(screen.getByText('仕事用')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('グループ名を編集');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('グループ名を入力')).toBeInTheDocument();
    });
  });

  it('削除ボタンをクリックすると確認ダイアログが開く', async () => {
    vi.mocked(storage.getAllCustomGroups).mockResolvedValue(mockGroups);
    vi.mocked(storage.getAllTabs).mockResolvedValue(mockTabs);

    render(<CustomGroupSettings />);

    await waitFor(() => {
      expect(screen.getByText('仕事用')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('グループを削除');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('グループを削除')).toBeInTheDocument();
      expect(screen.getByText('「仕事用」を削除しますか？')).toBeInTheDocument();
    });
  });
});
