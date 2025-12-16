/**
 * TabBurrow - ソート順設定コンポーネント
 */

import { useTranslation } from '../../common/i18nContext.js';
import type { GroupSortType, ItemSortType } from '../../settings.js';

interface SortSettingsProps {
  groupSort: GroupSortType;
  itemSort: ItemSortType;
  savedGroupSort: GroupSortType;
  savedItemSort: ItemSortType;
  onGroupSortChange: (value: GroupSortType) => void;
  onItemSortChange: (value: ItemSortType) => void;
}

export function SortSettings({
  groupSort,
  itemSort,
  savedGroupSort,
  savedItemSort,
  onGroupSortChange,
  onItemSortChange,
}: SortSettingsProps) {
  const { t } = useTranslation();

  const groupSortOptions: { value: GroupSortType; labelKey: string }[] = [
    { value: 'count-desc', labelKey: 'settings.sort.countDesc' },
    { value: 'count-asc', labelKey: 'settings.sort.countAsc' },
    { value: 'domain-asc', labelKey: 'settings.sort.domainAsc' },
    { value: 'domain-desc', labelKey: 'settings.sort.domainDesc' },
    { value: 'updated-desc', labelKey: 'settings.sort.updatedDesc' },
    { value: 'updated-asc', labelKey: 'settings.sort.updatedAsc' },
  ];

  const itemSortOptions: { value: ItemSortType; labelKey: string }[] = [
    { value: 'saved-desc', labelKey: 'settings.sort.savedDesc' },
    { value: 'saved-asc', labelKey: 'settings.sort.savedAsc' },
    { value: 'title-asc', labelKey: 'settings.sort.titleAsc' },
    { value: 'title-desc', labelKey: 'settings.sort.titleDesc' },
    { value: 'accessed-desc', labelKey: 'settings.sort.accessedDesc' },
    { value: 'accessed-asc', labelKey: 'settings.sort.accessedAsc' },
  ];

  return (
    <>
      <div className="form-group">
        <label htmlFor="groupSort" className="form-label">
          {t('settings.sort.groupLabel')}
        </label>
        <select
          id="groupSort"
          className={`form-select ${groupSort !== savedGroupSort ? 'modified' : ''}`}
          value={groupSort}
          onChange={(e) => onGroupSortChange(e.target.value as GroupSortType)}
        >
          {groupSortOptions.map(option => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="itemSort" className="form-label">
          {t('settings.sort.itemLabel')}
        </label>
        <select
          id="itemSort"
          className={`form-select ${itemSort !== savedItemSort ? 'modified' : ''}`}
          value={itemSort}
          onChange={(e) => onItemSortChange(e.target.value as ItemSortType)}
        >
          {itemSortOptions.map(option => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
