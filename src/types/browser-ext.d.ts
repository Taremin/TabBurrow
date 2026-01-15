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
    interface TabsGroupApi {
      (options: {
        tabIds: number[];
        groupId?: number;
      }): Promise<number>;
    }
  }

  namespace TabGroups {
    interface TabGroup {
      id: number;
      collapsed: boolean;
      color: string;
      title?: string;
      windowId: number;
    }

    type TabGroupsUpdateApi = typeof Browser.TabGroups.update
    /*
    interface TabGroupsUpdateApi {
      (
        groupId: number,
        updateProperties: {
          collapsed?: boolean;
          color?: string;
          title?: string;
        }
      ): Promise<TabGroup>;
    }
    */
  }

  interface Browser {
    /** webextension-polyfill に欠けている、または環境によって存在しない可能性があるAPI */
    tabs: {
      group?: Tabs.TabsGroupApi;
    } & typeof Tabs;

    tabGroups?: {
      update?: TabGroups.TabGroupsUpdateApi;
    } & typeof TabGroups;
    
    /** 内部的にポリフィルで使用する元の関数 */
    _originalTabsGroup?: Tabs.TabsGroupApi;
    _originalTabGroupsUpdate?: TabGroups.TabGroupsUpdateApi;
  }
}
