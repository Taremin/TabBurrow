/**
 * TabBurrow - ソート順設定コンポーネント
 */

import { useTranslation } from '../../common/i18nContext';
import type { GroupSortType, ItemSortType, CustomSortKeyOrder } from '../../settings';

interface SortSettingsProps {
  groupSort: GroupSortType;
  itemSort: ItemSortType;
  customSortKeyOrder: CustomSortKeyOrder;
  savedGroupSort: GroupSortType;
  savedItemSort: ItemSortType;
  savedCustomSortKeyOrder: CustomSortKeyOrder;
  onGroupSortChange: (value: GroupSortType) => void;
  onItemSortChange: (value: ItemSortType) => void;
  onCustomSortKeyOrderChange: (value: CustomSortKeyOrder) => void;
}

export function SortSettings({
  groupSort,
  itemSort,
  customSortKeyOrder,
  savedGroupSort,
  savedItemSort,
  savedCustomSortKeyOrder,
  onGroupSortChange,
  onItemSortChange,
  onCustomSortKeyOrderChange,
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

  const customSortKeyOrderOptions: { value: CustomSortKeyOrder; labelKey: string }[] = [
    { value: 'asc', labelKey: 'settings.sort.customSortKeyAsc' },
    { value: 'desc', labelKey: 'settings.sort.customSortKeyDesc' },
  ];

  return (
    <>
      <div className="form-group">
        <label htmlFor="groupSort" className="form-label">
          {t('settings.sort.groupLabel')}
        </label>
        <select
          id="groupSort"
          data-testid="global-group-sort-select"
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
          data-testid="global-item-sort-select"
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

      <div className="form-group">
        <label htmlFor="customSortKeyOrder" className="form-label">
          {t('settings.sort.customSortKeyOrder')}
        </label>
        <select
          id="customSortKeyOrder"
          data-testid="global-custom-sort-key-order-select"
          className={`form-select ${customSortKeyOrder !== savedCustomSortKeyOrder ? 'modified' : ''}`}
          value={customSortKeyOrder}
          onChange={(e) => onCustomSortKeyOrderChange(e.target.value as CustomSortKeyOrder)}
        >
          {customSortKeyOrderOptions.map(option => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
