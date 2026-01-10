/**
 * TabBurrow - アイコンクリック設定コンポーネント
 */

import { useTranslation } from '../../common/i18nContext';
import type { PinnedTabAction } from '../../settings';

interface IconClickSettingsProps {
  applyRules: boolean;
  pinnedAction: PinnedTabAction;
  pinTabManager: boolean;
  savedApplyRules: boolean;
  savedPinnedAction: PinnedTabAction;
  savedPinTabManager: boolean;
  onApplyRulesChange: (value: boolean) => void;
  onPinnedActionChange: (value: PinnedTabAction) => void;
  onPinTabManagerChange: (value: boolean) => void;
}

export function IconClickSettings({
  applyRules,
  pinnedAction,
  pinTabManager,
  savedApplyRules,
  savedPinnedAction,
  savedPinTabManager,
  onApplyRulesChange,
  onPinnedActionChange,
  onPinTabManagerChange,
}: IconClickSettingsProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* 自動収納ルールを適用するチェックボックス */}
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
        <div className="form-hint">{t('settings.iconClick.applyRulesDescription')}</div>
      </div>

      {/* タブ管理画面を固定タブとして開くチェックボックス */}
      <div className="form-group">
        <label className={`form-checkbox-label ${pinTabManager !== savedPinTabManager ? 'modified' : ''}`}>
          <input
            type="checkbox"
            id="pinTabManager"
            className="form-checkbox"
            checked={pinTabManager}
            onChange={(e) => onPinTabManagerChange(e.target.checked)}
          />
          <span className="checkbox-custom"></span>
          <span>{t('settings.iconClick.pinTabManager')}</span>
        </label>
        <div className="form-hint">{t('settings.iconClick.pinTabManagerDescription')}</div>
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
