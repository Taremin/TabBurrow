/**
 * Vitestテストセットアップファイル
 * webextension-polyfill (browser API)のモックを提供
 */
import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Browser Storage API モック
const mockStorage = {
  local: {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
  },
};

// Browser Runtime API モック
const mockRuntime = {
  lastError: null,
  sendMessage: vi.fn().mockResolvedValue(undefined),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  getURL: vi.fn((path: string) => `moz-extension://mock-id/${path}`),
  getManifest: vi.fn(() => ({ version: '1.0.0' })),
};

// Browser Tabs API モック
const mockTabs = {
  create: vi.fn().mockResolvedValue({ id: 1 }),
  query: vi.fn().mockResolvedValue([]),
  remove: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  discard: vi.fn().mockResolvedValue(undefined),
  onUpdated: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  onActivated: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  onRemoved: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  onCreated: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  onReplaced: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  captureVisibleTab: vi.fn().mockResolvedValue('data:image/jpeg;base64,'),
};

// Browser Alarms API モック
const mockAlarms = {
  create: vi.fn(),
  clear: vi.fn().mockResolvedValue(true),
  onAlarm: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
};

// Browser Context Menus API モック
const mockContextMenus = {
  create: vi.fn(),
  remove: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  onClicked: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
};

// Browser Action API モック
const mockAction = {
  onClicked: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
};

// Browser Windows API モック
const mockWindows = {
  update: vi.fn().mockResolvedValue(undefined),
};

// Browser Scripting API モック
const mockScripting = {
  executeScript: vi.fn().mockResolvedValue([{ result: null }]),
};

// webextension-polyfillをモック
vi.mock('webextension-polyfill', () => ({
  default: {
    storage: mockStorage,
    runtime: mockRuntime,
    tabs: mockTabs,
    alarms: mockAlarms,
    contextMenus: mockContextMenus,
    action: mockAction,
    windows: mockWindows,
    scripting: mockScripting,
  },
}));

// グローバルchromeオブジェクトもモック（互換性のため）
Object.defineProperty(globalThis, 'chrome', {
  value: {
    storage: mockStorage,
    runtime: mockRuntime,
    tabs: mockTabs,
    alarms: mockAlarms,
    contextMenus: mockContextMenus,
    action: mockAction,
    windows: mockWindows,
    scripting: mockScripting,
  },
  writable: true,
});

// useTranslation フックのモック
vi.mock('../common/i18nContext.js', () => ({
  useTranslation: () => ({
    locale: 'ja',
    t: (key: string) => key, // キーをそのまま返す
  }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));

