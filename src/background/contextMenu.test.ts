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

// settings.jsのモック
vi.mock('../settings.js', () => ({
  getSettings: vi.fn().mockResolvedValue({
    autoCloseEnabled: true,
    autoCloseRules: [],
    autoCloseRuleOrder: 'asc',
  }),
  saveSettings: vi.fn().mockResolvedValue(undefined),
  escapeRegexPattern: (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  matchAutoCloseRule: vi.fn().mockReturnValue(null),
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

  describe('handleContextMenuClick - exclude-from-auto-close', () => {
    it('exclude-from-auto-closeメニューでpromptが表示される', async () => {
      const info: Menus.OnClickData = {
        menuItemId: 'exclude-from-auto-close',
        editable: false,
        modifiers: [],
      };
      const tab = createMockTab({ id: 1, url: 'https://example.com/path?query=1' });

      await handleContextMenuClick(info, tab);

      expect(browser.scripting.executeScript).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { tabId: 1 },
          args: expect.arrayContaining([
            expect.stringContaining('example\\.com'), // エスケープされたパターン
          ]),
        })
      );
    });

    it('拡張アイコン用のexclude-from-auto-closeメニューでも動作する', async () => {
      const info: Menus.OnClickData = {
        menuItemId: 'action-exclude-from-auto-close',
        editable: false,
        modifiers: [],
      };
      const tab = createMockTab({ id: 1, url: 'https://example.com/path' });

      await handleContextMenuClick(info, tab);

      expect(browser.scripting.executeScript).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { tabId: 1 },
        })
      );
    });

    it('promptでパターンが入力されたら設定にルールを追加する', async () => {
      const { getSettings, saveSettings } = await import('../settings.js');
      vi.mocked(browser.scripting.executeScript).mockResolvedValueOnce([{ result: 'example\\.com' }] as any);
      
      const info: Menus.OnClickData = {
        menuItemId: 'exclude-from-auto-close',
        editable: false,
        modifiers: [],
      };
      const tab = createMockTab({ id: 1, url: 'https://example.com/' });

      await handleContextMenuClick(info, tab);

      expect(getSettings).toHaveBeenCalled();
      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          autoCloseRules: expect.arrayContaining([
            expect.objectContaining({
              action: 'exclude',
              pattern: 'example\\.com',
              targetType: 'fullUrl',
            }),
          ]),
        })
      );
    });

    it('promptがキャンセルされた場合はルールを追加しない', async () => {
      const { saveSettings } = await import('../settings.js');
      vi.mocked(browser.scripting.executeScript).mockResolvedValueOnce([{ result: null }] as any);
      
      const info: Menus.OnClickData = {
        menuItemId: 'exclude-from-auto-close',
        editable: false,
        modifiers: [],
      };
      const tab = createMockTab({ id: 1, url: 'https://example.com/' });

      await handleContextMenuClick(info, tab);

      expect(saveSettings).not.toHaveBeenCalled();
    });
  });

  describe('handleContextMenuClick - create-group-from-url', () => {
    it('create-group-from-urlメニューでパターン入力promptが表示される', async () => {
      vi.mocked(browser.scripting.executeScript).mockResolvedValueOnce([{ result: null }] as any);
      
      const info: Menus.OnClickData = {
        menuItemId: 'create-group-from-url',
        editable: false,
        modifiers: [],
      };
      const tab = createMockTab({ id: 1, url: 'https://example.com/path?query=1' });

      await handleContextMenuClick(info, tab);

      expect(browser.scripting.executeScript).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { tabId: 1 },
          args: expect.arrayContaining([
            expect.stringContaining('example\\.com/path'), // エスケープされたパターン
          ]),
        })
      );
    });

    it('拡張アイコン用のcreate-group-from-urlメニューでも動作する', async () => {
      vi.mocked(browser.scripting.executeScript).mockResolvedValueOnce([{ result: null }] as any);
      
      const info: Menus.OnClickData = {
        menuItemId: 'action-create-group-from-url',
        editable: false,
        modifiers: [],
      };
      const tab = createMockTab({ id: 1, url: 'https://example.com/path' });

      await handleContextMenuClick(info, tab);

      expect(browser.scripting.executeScript).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { tabId: 1 },
        })
      );
    });

    it('パターンとグループ名が入力されたらsaveToGroupルールを追加する', async () => {
      const { getSettings, saveSettings } = await import('../settings.js');
      const { createCustomGroup, getAllCustomGroups } = await import('../storage.js');
      
      // 1回目: パターン入力 → 2回目: グループ名入力
      vi.mocked(browser.scripting.executeScript)
        .mockResolvedValueOnce([{ result: 'example\\.com/path' }] as any)
        .mockResolvedValueOnce([{ result: 'My Custom Group' }] as any);
      vi.mocked(getAllCustomGroups).mockResolvedValueOnce([]);
      
      const info: Menus.OnClickData = {
        menuItemId: 'create-group-from-url',
        editable: false,
        modifiers: [],
      };
      const tab = createMockTab({ id: 1, url: 'https://example.com/path' });

      await handleContextMenuClick(info, tab);

      expect(getSettings).toHaveBeenCalled();
      expect(createCustomGroup).toHaveBeenCalledWith('My Custom Group');
      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          autoCloseRules: expect.arrayContaining([
            expect.objectContaining({
              action: 'saveToGroup',
              pattern: 'example\\.com/path',
              targetType: 'fullUrl',
              targetGroup: 'My Custom Group',
            }),
          ]),
        })
      );
    });

    it('パターン入力がキャンセルされた場合はルールを追加しない', async () => {
      const { saveSettings } = await import('../settings.js');
      vi.mocked(browser.scripting.executeScript).mockResolvedValueOnce([{ result: null }] as any);
      
      const info: Menus.OnClickData = {
        menuItemId: 'create-group-from-url',
        editable: false,
        modifiers: [],
      };
      const tab = createMockTab({ id: 1, url: 'https://example.com/' });

      await handleContextMenuClick(info, tab);

      expect(saveSettings).not.toHaveBeenCalled();
    });

    it('グループ名入力がキャンセルされた場合はルールを追加しない', async () => {
      const { saveSettings } = await import('../settings.js');
      vi.mocked(browser.scripting.executeScript)
        .mockResolvedValueOnce([{ result: 'example\\.com' }] as any)
        .mockResolvedValueOnce([{ result: null }] as any);
      
      const info: Menus.OnClickData = {
        menuItemId: 'create-group-from-url',
        editable: false,
        modifiers: [],
      };
      const tab = createMockTab({ id: 1, url: 'https://example.com/' });

      await handleContextMenuClick(info, tab);

      expect(saveSettings).not.toHaveBeenCalled();
    });

    it('既存のカスタムグループがある場合は新規作成しない', async () => {
      const { createCustomGroup, getAllCustomGroups } = await import('../storage.js');
      
      vi.mocked(browser.scripting.executeScript)
        .mockResolvedValueOnce([{ result: 'example\\.com' }] as any)
        .mockResolvedValueOnce([{ result: 'Existing Group' }] as any);
      vi.mocked(getAllCustomGroups).mockResolvedValueOnce([{ name: 'Existing Group', createdAt: Date.now(), updatedAt: Date.now() }]);
      
      const info: Menus.OnClickData = {
        menuItemId: 'create-group-from-url',
        editable: false,
        modifiers: [],
      };
      const tab = createMockTab({ id: 1, url: 'https://example.com/' });

      await handleContextMenuClick(info, tab);

      expect(createCustomGroup).not.toHaveBeenCalled();
    });
  });

  describe('handleContextMenuClick - create-group-from-domain', () => {
    it('create-group-from-domainメニューでドメインのみがデフォルトパターンになる', async () => {
      vi.mocked(browser.scripting.executeScript).mockResolvedValueOnce([{ result: null }] as any);
      
      const info: Menus.OnClickData = {
        menuItemId: 'create-group-from-domain',
        editable: false,
        modifiers: [],
      };
      const tab = createMockTab({ id: 1, url: 'https://sub.example.com/path?query=1' });

      await handleContextMenuClick(info, tab);

      expect(browser.scripting.executeScript).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { tabId: 1 },
          args: expect.arrayContaining([
            'sub\\.example\\.com', // ドメインのみ（パスなし）
          ]),
        })
      );
    });

    it('拡張アイコン用のcreate-group-from-domainメニューでも動作する', async () => {
      vi.mocked(browser.scripting.executeScript).mockResolvedValueOnce([{ result: null }] as any);
      
      const info: Menus.OnClickData = {
        menuItemId: 'action-create-group-from-domain',
        editable: false,
        modifiers: [],
      };
      const tab = createMockTab({ id: 1, url: 'https://example.com/path' });

      await handleContextMenuClick(info, tab);

      expect(browser.scripting.executeScript).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { tabId: 1 },
        })
      );
    });

    it('ドメインからグループ作成でtargetTypeがdomainになる', async () => {
      const { saveSettings } = await import('../settings.js');
      const { getAllCustomGroups } = await import('../storage.js');
      
      vi.mocked(browser.scripting.executeScript)
        .mockResolvedValueOnce([{ result: 'example\\.com' }] as any)
        .mockResolvedValueOnce([{ result: 'Domain Group' }] as any);
      vi.mocked(getAllCustomGroups).mockResolvedValueOnce([]);
      
      const info: Menus.OnClickData = {
        menuItemId: 'create-group-from-domain',
        editable: false,
        modifiers: [],
      };
      const tab = createMockTab({ id: 1, url: 'https://example.com/path' });

      await handleContextMenuClick(info, tab);

      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          autoCloseRules: expect.arrayContaining([
            expect.objectContaining({
              action: 'saveToGroup',
              targetType: 'domain', // ドメイン指定
              targetGroup: 'Domain Group',
            }),
          ]),
        })
      );
    });
  });
});
