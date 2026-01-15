// 既存の型定義をインポート
import 'webextension-polyfill';

declare module 'webextension-polyfill' {
  namespace Tabs {
    interface Tab {
      /** Vivaldi独自の拡張データ（JSON文字列） */
      vivExtData?: string;
    }

    interface CreateCreatePropertiesType {
      /** Vivaldi独自の拡張データ（JSON文字列） */
      vivExtData?: string;
    }

    interface UpdateUpdatePropertiesType {
      /** Vivaldi独自の拡張データ（JSON文字列） */
      vivExtData?: string;
    }

    /** Tab Groups API (Manifest V3 / Chrome) */
    function group(options: {
      tabIds: number[];
      groupId?: number;
    }): Promise<number>;
    
    function ungroup(tabIds: number | number[]): Promise<void>;
  }

  namespace TabGroups {
    interface TabGroup {
      id: number;
      collapsed: boolean;
      color: string;
      title?: string;
      windowId: number;
    }

    function get(groupId: number): Promise<TabGroup>;
    function query(queryInfo: {
      collapsed?: boolean;
      color?: string;
      title?: string;
      windowId?: number;
    }): Promise<TabGroup[]>;
    function update(
      groupId: number,
      updateProperties: {
        collapsed?: boolean;
        color?: string;
        title?: string;
      }
    ): Promise<TabGroup>;
    function move(
      groupId: number,
      moveProperties: {
        index: number;
        windowId?: number;
      }
    ): Promise<TabGroup>;
  }

  interface Browser {
    tabGroups: typeof TabGroups;
    
    /** 内部的にポリフィルで使用する元の関数 */
    _originalTabsGroup?: typeof Tabs.group;
    _originalTabGroupsUpdate?: typeof TabGroups.update;
  }
}
