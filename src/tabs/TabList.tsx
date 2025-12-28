/**
 * TabBurrow - 仮想スクロールタブリストコンポーネント
 * react-virtuosoのGroupedVirtuosoを使用
 */

import { useMemo, useCallback, useRef } from 'react';
import { GroupedVirtuoso, Virtuoso, GroupedVirtuosoHandle } from 'react-virtuoso';
import type { SavedTab, GroupSortType, ItemSortType, TabGroup, CustomGroupMeta, ViewMode, DisplayDensity, GroupFilter } from './types';
import { TabCard } from './TabCard';
import { GroupHeader } from './GroupHeader';

interface TabListProps {
  tabs: SavedTab[];
  customGroups: CustomGroupMeta[];
  viewMode: ViewMode;
  displayDensity: DisplayDensity;
  groupSort: GroupSortType;
  itemSort: ItemSortType;
  onDeleteTab: (id: string) => void;
  onDeleteGroup: (groupName: string, groupType: 'domain' | 'custom') => void;
  onOpenGroup: (groupName: string) => void;
  onOpenGroupAsTabGroup?: (groupName: string) => void;
  onOpenTab: (url: string) => void;
  onMiddleClickTab?: (url: string) => void; // ホイールクリックでタブを開く
  onRenameGroup?: (oldName: string, newName: string) => void;
  onRequestRename?: (currentName: string, groupType: 'domain' | 'custom') => void;
  domainGroupAliases?: Record<string, string>;
  onMoveToGroup: (tabId: string, groupName: string) => void;
  onRemoveFromGroup: (tabId: string, groupName?: string) => void;
  onRequestMoveToNewGroup: (tabId: string) => void; // 新規グループ作成して移動
  onRenameTab?: (tabId: string) => void; // タブの表示名変更
  // 選択モード関連
  isSelectionMode: boolean;
  selectedTabIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onSelectGroup: (tabIds: string[]) => void;
  onDeselectGroup: (tabIds: string[]) => void;
  // グループ内フィルタ
  groupFilters: GroupFilter;
  onGroupFilterChange: (groupName: string, pattern: string) => void;
  // 折りたたみ状態
  collapsedGroups: Record<string, boolean>;
  onToggleCollapse: (groupName: string) => void;
  // 新規設定
  showGroupedTabsInDomainGroups?: boolean;
}

/**
 * タブをグループ別に分類（カスタムグループ + ドメイングループ）
 */
function groupTabs(tabs: SavedTab[], showGroupedTabsInDomainGroups: boolean = false): { customGroups: Map<string, SavedTab[]>; domainGroups: Map<string, SavedTab[]> } {
  const customGroups = new Map<string, SavedTab[]>();
  const domainGroups = new Map<string, SavedTab[]>();
  
  for (const tab of tabs) {
    let hasCustomGroup = false;
    
    // 複数カスタムグループに対応
    if (tab.customGroups && tab.customGroups.length > 0) {
      for (const groupName of tab.customGroups) {
        const existing = customGroups.get(groupName) || [];
        existing.push(tab);
        customGroups.set(groupName, existing);
        hasCustomGroup = true;
      }
    } else if (tab.groupType === 'custom' && tab.group) {
      // 後方互換性：customGroupsがないがgroupTypeがcustomの場合
      const existing = customGroups.get(tab.group) || [];
      existing.push(tab);
      customGroups.set(tab.group, existing);
      hasCustomGroup = true;
    }
    
    // ドメイングループへの追加条件：
    // 1. カスタムグループに所属していない
    // 2. あるいは、「カスタムグループ所属タブもドメイングループに表示」が有効
    if (!hasCustomGroup || showGroupedTabsInDomainGroups) {
      const groupKey = (tab.groupType === 'domain' ? tab.group : null) || tab.domain;
      const existing = domainGroups.get(groupKey) || [];
      existing.push(tab);
      domainGroups.set(groupKey, existing);
    }
  }
  
  return { customGroups, domainGroups };
}

/**
 * グループ内のタブをソート
 */
function sortTabsInGroup(tabs: SavedTab[], sortType: ItemSortType): SavedTab[] {
  const sorted = [...tabs];
  
  switch (sortType) {
    case 'saved-desc':
      sorted.sort((a, b) => b.savedAt - a.savedAt);
      break;
    case 'saved-asc':
      sorted.sort((a, b) => a.savedAt - b.savedAt);
      break;
    case 'title-asc':
      sorted.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
      break;
    case 'title-desc':
      sorted.sort((a, b) => b.title.localeCompare(a.title, 'ja'));
      break;
    case 'accessed-desc':
      sorted.sort((a, b) => b.lastAccessed - a.lastAccessed);
      break;
    case 'accessed-asc':
      sorted.sort((a, b) => a.lastAccessed - b.lastAccessed);
      break;
  }
  
  return sorted;
}

/**
 * グループをソート
 */
function sortGroups(
  grouped: Map<string, SavedTab[]>,
  sortType: GroupSortType
): [string, SavedTab[]][] {
  const entries = [...grouped.entries()];
  
  switch (sortType) {
    case 'count-desc':
      entries.sort((a, b) => b[1].length - a[1].length);
      break;
    case 'count-asc':
      entries.sort((a, b) => a[1].length - b[1].length);
      break;
    case 'domain-asc':
      entries.sort((a, b) => a[0].localeCompare(b[0], 'ja'));
      break;
    case 'domain-desc':
      entries.sort((a, b) => b[0].localeCompare(a[0], 'ja'));
      break;
    case 'updated-desc':
      entries.sort((a, b) => {
        const latestA = Math.max(...a[1].map(t => t.savedAt));
        const latestB = Math.max(...b[1].map(t => t.savedAt));
        return latestB - latestA;
      });
      break;
    case 'updated-asc':
      entries.sort((a, b) => {
        const latestA = Math.max(...a[1].map(t => t.savedAt));
        const latestB = Math.max(...b[1].map(t => t.savedAt));
        return latestA - latestB;
      });
      break;
  }
  
  return entries;
}

/**
 * 正規表現でタブをフィルタ
 */
function filterTabsByRegex(tabs: SavedTab[], pattern: string): SavedTab[] {
  if (!pattern.trim()) return tabs;
  
  try {
    const regex = new RegExp(pattern, 'i');
    return tabs.filter(tab => 
      regex.test(tab.title) || regex.test(tab.url)
    );
  } catch {
    // 無効な正規表現の場合はフィルタなし
    return tabs;
  }
}

/**
 * 仮想スクロールタブリスト
 * - カスタムグループを上部に表示
 * - ドメイングループを下部に表示
 */
export function TabList({
  tabs,
  customGroups,
  viewMode,
  displayDensity,
  groupSort,
  itemSort,
  onDeleteTab,
  onDeleteGroup,
  onOpenGroup,
  onOpenGroupAsTabGroup,
  onOpenTab,
  onMiddleClickTab,
  onRenameGroup,
  onRequestRename,
  onMoveToGroup,
  onRemoveFromGroup,
  onRequestMoveToNewGroup,
  onRenameTab,
  isSelectionMode,
  selectedTabIds,
  onToggleSelection,
  onSelectGroup,
  onDeselectGroup,
  groupFilters,
  onGroupFilterChange,
  collapsedGroups,
  onToggleCollapse,
  domainGroupAliases = {},
  showGroupedTabsInDomainGroups = false,
}: TabListProps) {
  const isCompact = displayDensity === 'compact';
  const virtuosoRef = useRef<GroupedVirtuosoHandle>(null);

  // グループ化とソート（フィルタ適用）
  const { groups, groupCounts, flatTabs } = useMemo(() => {
    const { customGroups: cGroups, domainGroups } = groupTabs(tabs, showGroupedTabsInDomainGroups);
    
    // カスタムグループをソート
    const sortedCustomGroups = sortGroups(cGroups, groupSort);
    // ドメイングループをソート
    const sortedDomainGroups = sortGroups(domainGroups, groupSort);
    
    const groups: TabGroup[] = [];
    const groupCounts: number[] = [];
    const flatTabs: { tab: SavedTab; groupName: string; groupType: 'domain' | 'custom' }[] = [];
    
    // カスタムグループを先に追加
    for (const [name, groupTabList] of sortedCustomGroups) {
      const sortedTabs = sortTabsInGroup(groupTabList, itemSort);
      // グループフィルタを適用
      const filteredTabs = filterTabsByRegex(sortedTabs, groupFilters[name] || '');
      const isCollapsed = collapsedGroups[name] || false;
      groups.push({ name, groupType: 'custom', tabs: filteredTabs });
      // 折りたたまれている場合はタブ数を0として扱う（表示しない）
      groupCounts.push(isCollapsed ? 0 : filteredTabs.length);
      if (!isCollapsed) {
        flatTabs.push(...filteredTabs.map(tab => ({ tab, groupName: name, groupType: 'custom' as const })));
      }
    }
    
    // ドメイングループを追加
    for (const [name, groupTabList] of sortedDomainGroups) {
      const sortedTabs = sortTabsInGroup(groupTabList, itemSort);
      // グループフィルタを適用
      const filteredTabs = filterTabsByRegex(sortedTabs, groupFilters[name] || '');
      const isCollapsed = collapsedGroups[name] || false;
      groups.push({ name, groupType: 'domain', tabs: filteredTabs });
      // 折りたたまれている場合はタブ数を0として扱う（表示しない）
      groupCounts.push(isCollapsed ? 0 : filteredTabs.length);
      if (!isCollapsed) {
        flatTabs.push(...filteredTabs.map(tab => ({ tab, groupName: name, groupType: 'domain' as const })));
      }
    }
    
    return { groups, groupCounts, flatTabs };
  }, [tabs, groupSort, itemSort, groupFilters, collapsedGroups, showGroupedTabsInDomainGroups]);

  // グループヘッダーのレンダリング
  const groupContent = useCallback((index: number) => {
    const group = groups[index];
    const groupTabIds = group.tabs.map(t => t.id);
    const isCollapsed = collapsedGroups[group.name] || false;
    return (
      <GroupHeader
        name={group.name}
        groupType={group.groupType}
        tabCount={group.tabs.length}
        onDeleteGroup={onDeleteGroup}
        onOpenGroup={onOpenGroup}
        onOpenGroupAsTabGroup={onOpenGroupAsTabGroup}
        onRequestRename={onRequestRename}
        filterPattern={groupFilters[group.name] || ''}
        onFilterChange={(pattern: string) => onGroupFilterChange(group.name, pattern)}
        isSelectionMode={isSelectionMode}
        groupTabIds={groupTabIds}
        selectedTabIds={selectedTabIds}
        onSelectGroup={onSelectGroup}
        onDeselectGroup={onDeselectGroup}
        isCompact={isCompact}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        displayName={group.groupType === 'domain' ? domainGroupAliases[group.name] : undefined}
      />
    );
  }, [groups, onDeleteGroup, onOpenGroup, onOpenGroupAsTabGroup, onRenameGroup, onRequestRename, groupFilters, onGroupFilterChange, isSelectionMode, selectedTabIds, onSelectGroup, onDeselectGroup, isCompact, collapsedGroups, onToggleCollapse, domainGroupAliases]);

  // グループへのナビゲーションハンドラ（タグクリック時）
  const handleNavigateToGroup = useCallback((groupName: string) => {
    const groupIndex = groups.findIndex(g => g.name === groupName);
    if (groupIndex !== -1 && virtuosoRef.current) {
      // 折りたたまれている場合は展開
      if (collapsedGroups[groupName]) {
        onToggleCollapse(groupName);
      }
      // グループヘッダーへスクロール
      virtuosoRef.current.scrollToIndex({
        index: groupIndex,
        behavior: 'smooth',
        align: 'start',
      });
    }
  }, [groups, collapsedGroups, onToggleCollapse]);

  const itemContent = useCallback((index: number) => {
    const { tab, groupName, groupType } = flatTabs[index];
    return (
      <TabCard
        key={`${groupName}-${tab.id}`} // 同じタブが複数グループに表示されるためキーを変更
        tab={tab}
        customGroups={customGroups}
        currentGroupName={groupName}
        currentGroupType={groupType}
        onDelete={onDeleteTab}
        onOpen={onOpenTab}
        onMiddleClick={onMiddleClickTab}
        onMoveToGroup={onMoveToGroup}
        onRemoveFromGroup={onRemoveFromGroup}
        onRequestMoveToNewGroup={onRequestMoveToNewGroup}
        onRenameTab={onRenameTab}
        isSelectionMode={isSelectionMode}
        isSelected={selectedTabIds.has(tab.id)}
        onToggleSelection={onToggleSelection}
        isCompact={isCompact}
        onNavigateToGroup={handleNavigateToGroup}
      />
    );
  }, [flatTabs, customGroups, onDeleteTab, onOpenTab, onMiddleClickTab, onMoveToGroup, onRemoveFromGroup, onRequestMoveToNewGroup, onRenameTab, isSelectionMode, selectedTabIds, onToggleSelection, isCompact, handleNavigateToGroup]);

  if (tabs.length === 0) {
    return null;
  }

  // フラット表示用のソート済みタブリスト
  const sortedFlatTabs = useMemo(() => {
    return sortTabsInGroup([...tabs], itemSort);
  }, [tabs, itemSort]);

  // フラット表示用のアイテムレンダリング
  const flatItemContent = useCallback((index: number) => {
    const tab = sortedFlatTabs[index];
    return (
      <TabCard
        key={tab.id}
        tab={tab}
        customGroups={customGroups}
        onDelete={onDeleteTab}
        onOpen={onOpenTab}
        onMiddleClick={onMiddleClickTab}
        onMoveToGroup={onMoveToGroup}
        onRemoveFromGroup={onRemoveFromGroup}
        onRequestMoveToNewGroup={onRequestMoveToNewGroup}
        onRenameTab={onRenameTab}
        isSelectionMode={isSelectionMode}
        isSelected={selectedTabIds.has(tab.id)}
        onToggleSelection={onToggleSelection}
        isCompact={isCompact}
      />
    );
  }, [sortedFlatTabs, customGroups, onDeleteTab, onOpenTab, onMiddleClickTab, onMoveToGroup, onRemoveFromGroup, onRequestMoveToNewGroup, onRenameTab, isSelectionMode, selectedTabIds, onToggleSelection, isCompact]);

  return (
    <div className="tab-groups" style={{ height: 'calc(100vh - 180px)' }}>
      {viewMode === 'flat' ? (
        <Virtuoso
          key="flat-view"
          totalCount={sortedFlatTabs.length}
          itemContent={flatItemContent}
          style={{ height: '100%' }}
          overscan={200}
        />
      ) : (
        <GroupedVirtuoso
          ref={virtuosoRef}
          key="grouped-view"
          groupCounts={groupCounts}
          groupContent={groupContent}
          itemContent={itemContent}
          style={{ height: '100%' }}
          overscan={200}
        />
      )}
    </div>
  );
}
