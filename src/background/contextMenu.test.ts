/**
 * contextMenu.ts のユニットテスト
 * コンテキストメニュー機能のテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import browser from '../browserApi.js';
import { handleContextMenuClick, isSaveableUrl } from './contextMenu.js';
import type { Menus, Tabs } from 'webextension-polyfill';

// browser APIのモック
vi.mock('../browserApi.js', () => ({
  default: {
    tabs: {
      query: vi.fn(),
      remove: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue({ id: 1 }),
      update: vi.fn().mockResolvedValue(undefined),
    },
    runtime: {
      sendMessage: vi.fn().mockResolvedValue(undefined),
      getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
    },
    windows: {
      update: vi.fn().mockResolvedValue(undefined),
    },
    contextMenus: {
      create: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
    scripting: {
      executeScript: vi.fn().mockResolvedValue([{ result: null }]),
    },
  },
}));

// storage.jsのモック
vi.mock('../storage.js', () => ({
  saveTabs: vi.fn().mockResolvedValue(undefined),
  saveTabsForCustomGroup: vi.fn().mockResolvedValue(undefined),
  getAllCustomGroups: vi.fn().mockResolvedValue([]),
  createCustomGroup: vi.fn().mockResolvedValue(undefined),
  findTabByUrl: vi.fn().mockResolvedValue(null),
  deleteTab: vi.fn().mockResolvedValue(undefined),
}));

// i18n.jsのモック
vi.mock('../i18n.js', () => ({
  t: (key: string) => key,
}));

// tabSaver.jsのモック
vi.mock('./tabSaver.js', () => ({
  extractDomain: (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  },
  openTabManagerPage: vi.fn().mockResolvedValue(undefined),
  getTabScreenshot: vi.fn().mockResolvedValue(new Blob([], { type: 'image/jpeg' })),
  saveAndCloseTabs: vi.fn().mockResolvedValue(undefined),
}));

// テスト用のモックタブを作成するヘルパー関数
function createMockTab(overrides: Partial<Tabs.Tab> = {}): Tabs.Tab {
  return {
    id: 1,
    index: 0,
    windowId: 1,
    highlighted: false,
    active: false,
    pinned: false,
    incognito: false,
    url: 'https://example.com',
    title: 'Example Page',
    ...overrides,
  } as Tabs.Tab;
}

describe('contextMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleContextMenuClick', () => {
    it('open-tab-managerメニューでタブ管理画面を開く', async () => {
      const { openTabManagerPage } = await import('./tabSaver.js');
      const info: Menus.OnClickData = {
        menuItemId: 'open-tab-manager',
        editable: false,
        modifiers: [],
      };

      await handleContextMenuClick(info);

      expect(openTabManagerPage).toHaveBeenCalled();
    });

    it('save-all-including-pinnedメニューですべてのタブを保存', async () => {
      const { saveAndCloseTabs } = await import('./tabSaver.js');
      const mockTabs = [
        createMockTab({ id: 1, url: 'https://example.com', pinned: false }),
        createMockTab({ id: 2, url: 'https://pinned.com', pinned: true }),
      ];
      
      vi.mocked(browser.tabs.query).mockResolvedValue(mockTabs);
      
      const info: Menus.OnClickData = {
        menuItemId: 'save-all-including-pinned',
        editable: false,
        modifiers: [],
      };
      const clickedTab = createMockTab({ windowId: 1 });

      await handleContextMenuClick(info, clickedTab);

      // saveAndCloseTabsが呼ばれたことを確認（固定タブも含む）
      expect(saveAndCloseTabs).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ url: 'https://example.com' }),
          expect.objectContaining({ url: 'https://pinned.com' }),
        ]),
        expect.objectContaining({
          activeTabWindowId: 1,
          openTabManager: true,
        })
      );
    });

    it('save-all-including-pinnedで特殊URLは除外される', async () => {
      const { saveAndCloseTabs } = await import('./tabSaver.js');
      const mockTabs = [
        createMockTab({ id: 1, url: 'https://example.com' }),
        createMockTab({ id: 2, url: 'chrome://extensions/' }),
        createMockTab({ id: 3, url: 'about:blank' }),
        createMockTab({ id: 4, url: 'file:///C:/test.html' }),
      ];
      
      vi.mocked(browser.tabs.query).mockResolvedValue(mockTabs);
      
      const info: Menus.OnClickData = {
        menuItemId: 'save-all-including-pinned',
        editable: false,
        modifiers: [],
      };

      await handleContextMenuClick(info, createMockTab());

      // http(s)://とfile://のみ保存されることを確認
      expect(saveAndCloseTabs).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ url: 'https://example.com' }),
          expect.objectContaining({ url: 'file:///C:/test.html' }),
        ]),
        expect.anything()
      );
      
      // chrome://やabout:は含まれない
      const callArgs = vi.mocked(saveAndCloseTabs).mock.calls[0][0];
      expect(callArgs).not.toContainEqual(
        expect.objectContaining({ url: 'chrome://extensions/' })
      );
      expect(callArgs).not.toContainEqual(
        expect.objectContaining({ url: 'about:blank' })
      );
    });

    it('保存対象のタブがない場合はsaveAndCloseTabsが呼ばれない', async () => {
      const { saveAndCloseTabs } = await import('./tabSaver.js');
      const mockTabs = [
        createMockTab({ id: 1, url: 'chrome://settings/' }),
        createMockTab({ id: 2, url: 'about:blank' }),
      ];
      
      vi.mocked(browser.tabs.query).mockResolvedValue(mockTabs);
      
      const info: Menus.OnClickData = {
        menuItemId: 'save-all-including-pinned',
        editable: false,
        modifiers: [],
      };

      await handleContextMenuClick(info, createMockTab());

      expect(saveAndCloseTabs).not.toHaveBeenCalled();
    });
  });

  describe('handleContextMenuClick - remove-and-close', () => {
    it('remove-and-closeメニューで管理対象タブを削除して閉じる', async () => {
      const { findTabByUrl, deleteTab } = await import('../storage.js');
      const savedTab = { id: 'saved-tab-id', url: 'https://example.com' };
      vi.mocked(findTabByUrl).mockResolvedValueOnce(savedTab as any);
      
      const info: Menus.OnClickData = {
        menuItemId: 'remove-and-close',
        editable: false,
        modifiers: [],
      };
      const tab = createMockTab({ id: 1, url: 'https://example.com' });

      await handleContextMenuClick(info, tab);

      expect(findTabByUrl).toHaveBeenCalledWith('https://example.com');
      expect(deleteTab).toHaveBeenCalledWith('saved-tab-id');
      expect(browser.tabs.remove).toHaveBeenCalledWith(1);
    });

    it('remove-and-closeで管理対象外のタブでもブラウザタブは閉じる', async () => {
      const { findTabByUrl, deleteTab } = await import('../storage.js');
      vi.mocked(findTabByUrl).mockResolvedValueOnce(null);
      
      const info: Menus.OnClickData = {
        menuItemId: 'remove-and-close',
        editable: false,
        modifiers: [],
      };
      const tab = createMockTab({ id: 1, url: 'https://example.com' });

      await handleContextMenuClick(info, tab);

      expect(findTabByUrl).toHaveBeenCalledWith('https://example.com');
      expect(deleteTab).not.toHaveBeenCalled();
      expect(browser.tabs.remove).toHaveBeenCalledWith(1);
    });

    it('拡張アイコン用のremove-and-closeメニューでも動作する', async () => {
      const { findTabByUrl, deleteTab } = await import('../storage.js');
      const savedTab = { id: 'saved-tab-id', url: 'https://example.com' };
      vi.mocked(findTabByUrl).mockResolvedValueOnce(savedTab as any);
      
      const info: Menus.OnClickData = {
        menuItemId: 'action-remove-and-close',
        editable: false,
        modifiers: [],
      };
      const tab = createMockTab({ id: 1, url: 'https://example.com' });

      await handleContextMenuClick(info, tab);

      expect(findTabByUrl).toHaveBeenCalledWith('https://example.com');
      expect(deleteTab).toHaveBeenCalledWith('saved-tab-id');
      expect(browser.tabs.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('handleContextMenuClick - open-tab-manager', () => {
      it('ページ用メニュー（tabburrow-open-manager）でもタブ管理画面が開く', async () => {
      const { openTabManagerPage } = await import('./tabSaver.js');
      
      const info: Menus.OnClickData = {
        menuItemId: 'tabburrow-open-manager',
        editable: false,
        modifiers: [],
      };
      
      await handleContextMenuClick(info);
      expect(openTabManagerPage).toHaveBeenCalled();
    });
  });

  describe('isSaveableUrl', () => {
    it('https URLは保存対象', () => {
      expect(isSaveableUrl('https://example.com')).toBe(true);
    });

    it('http URLは保存対象', () => {
      expect(isSaveableUrl('http://example.com')).toBe(true);
    });

    it('file URLは保存対象', () => {
      expect(isSaveableUrl('file:///C:/test.html')).toBe(true);
    });

    it('chrome URLは保存対象外', () => {
      expect(isSaveableUrl('chrome://extensions/')).toBe(false);
    });

    it('about URLは保存対象外', () => {
      expect(isSaveableUrl('about:blank')).toBe(false);
    });

    it('edge URLは保存対象外', () => {
      expect(isSaveableUrl('edge://settings/')).toBe(false);
    });
  });
});
