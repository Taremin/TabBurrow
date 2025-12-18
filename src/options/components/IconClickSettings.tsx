/**
 * TabBurrow - アイコンクリック設定コンポーネント
 */

import { useTranslation } from '../../common/i18nContext.js';
import type { PinnedTabAction } from '../../settings.js';

interface IconClickSettingsProps {
  applyRules: boolean;
  pinnedAction: PinnedTabAction;
  savedApplyRules: boolean;
  savedPinnedAction: PinnedTabAction;
  onApplyRulesChange: (value: boolean) => void;
  onPinnedActionChange: (value: PinnedTabAction) => void;
}

export function IconClickSettings({
  applyRules,
  pinnedAction,
  savedApplyRules,
  savedPinnedAction,
  onApplyRulesChange,
  onPinnedActionChange,
}: IconClickSettingsProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* 自動クローズルールを適用するチェックボックス */}
      <div className="form-group">
        <label className={`form-checkbox-label ${applyRules !== savedApplyRules ? 'modified' : ''}`}>
          <input
            type="checkbox"
            id="iconClickApplyRules"
            className="form-checkbox"
            checked={applyRules}
            onChange={(e) => onApplyRulesChange(e.target.checked)}
          />
          <span className="checkbox-custom"></span>
          <span>{t('settings.iconClick.applyRules')}</span>
        </label>
        <div className="form-hint">{t('settings.iconClick.applyRulesHint')}</div>
      </div>

      {/* 固定タブの扱い */}
      <div className="form-group">
        <label className="form-label">{t('settings.iconClick.pinnedTabs.label')}</label>
        <div className="radio-group">
          <label className={`form-radio-label ${pinnedAction !== savedPinnedAction ? 'modified' : ''}`}>
            <input
              type="radio"
              name="pinnedAction"
              value="skip"
              className="form-radio"
              checked={pinnedAction === 'skip'}
              onChange={() => onPinnedActionChange('skip')}
            />
            <span className="radio-custom"></span>
            <span>{t('settings.iconClick.pinnedTabs.skip')}</span>
          </label>
          <label className={`form-radio-label ${pinnedAction !== savedPinnedAction ? 'modified' : ''}`}>
            <input
              type="radio"
              name="pinnedAction"
              value="suspend"
              className="form-radio"
              checked={pinnedAction === 'suspend'}
              onChange={() => onPinnedActionChange('suspend')}
            />
            <span className="radio-custom"></span>
            <span>{t('settings.iconClick.pinnedTabs.suspend')}</span>
          </label>
        </div>
        <div className="form-hint">{t('settings.iconClick.pinnedTabsHint')}</div>
      </div>
    </>
  );
}
