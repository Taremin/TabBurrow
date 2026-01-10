/**
 * storage.ts のユニットテスト
 * fake-indexeddbを使用してIndexedDB操作をテスト
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  saveTabs,
  getAllTabs,
  searchTabs,
  deleteTab,
  deleteAllTabs,
  deleteTabsByGroup,
  getTabCount,
  createCustomGroup,
  getAllCustomGroups,
  renameCustomGroup,
  deleteCustomGroup,
  assignTabToCustomGroup,
  removeTabFromCustomGroup,
  saveTabsForCustomGroup,
  resetDBInstance,
  type SavedTab,
} from './storage.js';

// テスト用のモックタブを作成
function createMockTab(overrides: Partial<SavedTab> = {}): SavedTab {
  const id = crypto.randomUUID();
  const url = overrides.url || `https://example.com/${id}`;
  return {
    id,
    url,
    title: 'Test Page',
    domain: 'example.com',
    group: 'example.com',
    groupType: 'domain',
    favIconUrl: 'https://example.com/favicon.ico',
    screenshot: new Blob(['test'], { type: 'image/jpeg' }),
    lastAccessed: Date.now(),
    savedAt: Date.now(),
    canonicalUrl: url, // canonicalUrlを追加
    ...overrides,
  };
}

describe('storage', () => {
  // 各テスト前にDBをリセットしてクリア
  beforeEach(async () => {
    // DBインスタンスをリセット
    resetDBInstance();
    
    // IndexedDBを削除
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('TabBurrowDB');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });

  describe('saveTabs / getAllTabs', () => {
    it('タブを保存して取得できる', async () => {
      const tab = createMockTab();
      await saveTabs([tab]);
      
      const tabs = await getAllTabs();
      expect(tabs).toHaveLength(1);
      expect(tabs[0].url).toBe(tab.url);
      expect(tabs[0].title).toBe(tab.title);
    });

    it('複数タブを保存できる', async () => {
      const tabs = [
        createMockTab({ url: 'https://example.com/1' }),
        createMockTab({ url: 'https://example.com/2' }),
        createMockTab({ url: 'https://example.com/3' }),
      ];
      await saveTabs(tabs);
      
      const result = await getAllTabs();
      expect(result).toHaveLength(3);
    });

    it('同じURLのタブは上書きされる', async () => {
      const url = 'https://example.com/same';
      const tab1 = createMockTab({ url, title: 'First Title' });
      await saveTabs([tab1]);
      
      const tab2 = createMockTab({ url, title: 'Updated Title' });
      await saveTabs([tab2]);
      
      const tabs = await getAllTabs();
      expect(tabs).toHaveLength(1);
      expect(tabs[0].title).toBe('Updated Title');
    });
  });

  describe('searchTabs', () => {
    beforeEach(async () => {
      await saveTabs([
        createMockTab({ url: 'https://github.com/user/repo', title: 'GitHub Repository' }),
        createMockTab({ url: 'https://google.com/search', title: 'Google Search' }),
        createMockTab({ url: 'https://example.com/test', title: 'Example Test' }),
      ]);
    });

    it('URLで検索できる', async () => {
      const results = await searchTabs('github');
      expect(results).toHaveLength(1);
      expect(results[0].url).toContain('github');
    });

    it('タイトルで検索できる', async () => {
      const results = await searchTabs('Google');
      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('Google');
    });

    it('部分一致で検索できる', async () => {
      const results = await searchTabs('example');
      expect(results).toHaveLength(1);
    });

    it('マッチしない場合は空配列を返す', async () => {
      const results = await searchTabs('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('deleteTab', () => {
    it('指定IDのタブを削除できる', async () => {
      const tab = createMockTab();
      await saveTabs([tab]);
      
      await deleteTab(tab.id);
      
      const tabs = await getAllTabs();
      expect(tabs).toHaveLength(0);
    });
  });

  describe('deleteAllTabs', () => {
    it('全タブを削除できる', async () => {
      await saveTabs([
        createMockTab(),
        createMockTab(),
        createMockTab(),
      ]);
      
      await deleteAllTabs();
      
      const tabs = await getAllTabs();
      expect(tabs).toHaveLength(0);
    });
  });

  describe('deleteTabsByGroup', () => {
    it('指定グループのタブを削除できる', async () => {
      await saveTabs([
        createMockTab({ group: 'group-a', domain: 'a.com' }),
        createMockTab({ group: 'group-a', domain: 'a.com' }),
        createMockTab({ group: 'group-b', domain: 'b.com' }),
      ]);
      
      await deleteTabsByGroup('group-a');
      
      const tabs = await getAllTabs();
      expect(tabs).toHaveLength(1);
      expect(tabs[0].group).toBe('group-b');
    });
  });

  describe('getTabCount', () => {
    it('タブ数を取得できる', async () => {
      expect(await getTabCount()).toBe(0);
      
      await saveTabs([createMockTab(), createMockTab()]);
      
      expect(await getTabCount()).toBe(2);
    });
  });

  describe('カスタムグループ', () => {
    describe('createCustomGroup / getAllCustomGroups', () => {
      it('カスタムグループを作成して取得できる', async () => {
        await createCustomGroup('My Group');
        
        const groups = await getAllCustomGroups();
        expect(groups).toHaveLength(1);
        expect(groups[0].name).toBe('My Group');
      });

      it('複数のカスタムグループを作成できる', async () => {
        await createCustomGroup('Group A');
        await createCustomGroup('Group B');
        
        const groups = await getAllCustomGroups();
        expect(groups).toHaveLength(2);
      });
    });

    describe('renameCustomGroup', () => {
      it('グループ名を変更できる', async () => {
        await createCustomGroup('Old Name');
        await renameCustomGroup('Old Name', 'New Name');
        
        const groups = await getAllCustomGroups();
        expect(groups).toHaveLength(1);
        expect(groups[0].name).toBe('New Name');
      });

      it('グループ名変更時にタブのグループも更新される', async () => {
        await createCustomGroup('Old Name');
        await saveTabs([
          createMockTab({ group: 'Old Name', groupType: 'custom' }),
        ]);
        
        await renameCustomGroup('Old Name', 'New Name');
        
        const tabs = await getAllTabs();
        expect(tabs[0].group).toBe('New Name');
      });
    });

    describe('deleteCustomGroup', () => {
      it('グループを削除するとタブはドメイングループに戻る', async () => {
        await createCustomGroup('Test Group');
        await saveTabs([
          createMockTab({ 
            group: 'Test Group', 
            groupType: 'custom',
            domain: 'example.com' 
          }),
        ]);
        
        await deleteCustomGroup('Test Group');
        
        const groups = await getAllCustomGroups();
        expect(groups).toHaveLength(0);
        
        const tabs = await getAllTabs();
        expect(tabs[0].group).toBe('example.com');
        expect(tabs[0].groupType).toBe('domain');
      });
    });

    describe('assignTabToCustomGroup', () => {
      it('タブをカスタムグループに割り当てられる', async () => {
        await createCustomGroup('My Group');
        const tab = createMockTab();
        await saveTabs([tab]);
        
        await assignTabToCustomGroup(tab.id, 'My Group');
        
        const tabs = await getAllTabs();
        expect(tabs[0].group).toBe('My Group');
        expect(tabs[0].groupType).toBe('custom');
      });
    });

    describe('removeTabFromCustomGroup', () => {
      it('タブをドメイングループに戻せる', async () => {
        const tab = createMockTab({ 
          group: 'Custom', 
          groupType: 'custom',
          domain: 'example.com' 
        });
        await saveTabs([tab]);
        
        await removeTabFromCustomGroup(tab.id);
        
        const tabs = await getAllTabs();
        expect(tabs[0].group).toBe('example.com');
        expect(tabs[0].groupType).toBe('domain');
      });
    });
  });

  describe('saveTabsForCustomGroup', () => {
    it('カスタムグループにタブを保存する', async () => {
      const tab = createMockTab({ 
        group: 'My Custom Group', 
        groupType: 'custom',
        customGroups: ['My Custom Group'],
      });
      
      await saveTabsForCustomGroup([tab]);
      
      const tabs = await getAllTabs();
      expect(tabs).toHaveLength(1);
      expect(tabs[0].group).toBe('My Custom Group');
      expect(tabs[0].groupType).toBe('custom');
      expect(tabs[0].customGroups).toContain('My Custom Group');
    });

    it('既存タブのcustomGroupsにマージする（group/groupTypeは維持）', async () => {
      const url = 'https://example.com/test';
      await saveTabs([createMockTab({ 
        url, 
        group: 'example.com', 
        groupType: 'domain',
        customGroups: ['Group A'],
      })]);
      
      await saveTabsForCustomGroup([
        createMockTab({ url, group: 'New Group', groupType: 'custom', customGroups: ['Group B'] }),
      ]);
      
      const tabs = await getAllTabs();
      expect(tabs).toHaveLength(1);
      // group/groupTypeは既存の値を維持
      expect(tabs[0].group).toBe('example.com');
      expect(tabs[0].groupType).toBe('domain');
      // customGroupsはマージされる
      expect(tabs[0].customGroups).toContain('Group A');
      expect(tabs[0].customGroups).toContain('Group B');
    });
  });
});
