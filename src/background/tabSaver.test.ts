/**
 * tabSaver.ts のユニットテスト
 * 純粋関数をテスト（Chrome API依存部分は除外）
 * 注: extractDomainのテストはsrc/utils/url.test.tsに移動済み
 */
import { describe, it, expect } from 'vitest';
import { createSavedTab } from './tabSaver';

// テスト用のモックタブを作成するヘルパー関数
function createMockTab(overrides: Partial<chrome.tabs.Tab> = {}): chrome.tabs.Tab {
  return {
    id: 1,
    index: 0,
    windowId: 1,
    highlighted: false,
    active: false,
    pinned: false,
    incognito: false,
    selected: false,
    discarded: false,
    autoDiscardable: true,
    groupId: -1,
    url: 'https://example.com',
    ...overrides,
  } as chrome.tabs.Tab;
}

describe('tabSaver', () => {

  describe('createSavedTab', () => {
    it('タブ情報からSavedTabオブジェクトを作成する', () => {
      const mockTab = createMockTab({
        url: 'https://example.com/page',
        title: 'Example Page',
        favIconUrl: 'https://example.com/favicon.ico',
        lastAccessed: 1000000000000,
      });
      const mockScreenshot = new Blob(['test'], { type: 'image/jpeg' });
      const savedAt = 1000000001000;

      const result = createSavedTab(mockTab, mockScreenshot, savedAt, mockTab.url!);

      expect(result.url).toBe('https://example.com/page');
      expect(result.title).toBe('Example Page');
      expect(result.domain).toBe('example.com');
      expect(result.group).toBe('example.com');
      expect(result.groupType).toBe('domain');
      expect(result.faviconUrl).toBe('https://example.com/favicon.ico');
      expect(result.screenshot).toBe(mockScreenshot);
      expect(result.lastAccessed).toBe(1000000000000);
      expect(result.savedAt).toBe(savedAt);
      expect(result.id).toBeDefined();
      expect(result.canonicalUrl).toBe(mockTab.url);
    });

    it('タイトルがない場合は"Untitled"を使用する', () => {
      const mockTab = createMockTab({
        url: 'https://example.com',
        // title is undefined
      });
      const mockScreenshot = new Blob([], { type: 'image/jpeg' });
      
      const result = createSavedTab(mockTab, mockScreenshot, Date.now(), mockTab.url!);
      
      expect(result.title).toBe('Untitled');
    });

    it('favIconUrlがない場合は空文字を使用する', () => {
      const mockTab = createMockTab({
        url: 'https://example.com',
        title: 'Test',
        // favIconUrl is undefined
      });
      const mockScreenshot = new Blob([], { type: 'image/jpeg' });
      
      const result = createSavedTab(mockTab, mockScreenshot, Date.now(), mockTab.url!);
      
      expect(result.faviconUrl).toBe('');
    });

    it('lastAccessedがない場合はsavedAtを使用する', () => {
      const mockTab = createMockTab({
        url: 'https://example.com',
        title: 'Test',
        // lastAccessed is undefined
      });
      const mockScreenshot = new Blob([], { type: 'image/jpeg' });
      const savedAt = 1234567890000;
      
      const result = createSavedTab(mockTab, mockScreenshot, savedAt, mockTab.url!);
      
      expect(result.lastAccessed).toBe(savedAt);
    });
  });
});
