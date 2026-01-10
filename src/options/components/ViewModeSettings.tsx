/**
 * TabBurrow - デフォルト表示モード設定コンポーネント
 */

import { useTranslation } from '../../common/i18nContext';
import type { ViewMode, DisplayDensity } from '../../settings';

interface ViewModeSettingsProps {
  viewMode: ViewMode;
  displayDensity: DisplayDensity;
  maximizeWidth: boolean;
  savedViewMode: ViewMode;
  savedDisplayDensity: DisplayDensity;
  savedMaximizeWidth: boolean;
  onViewModeChange: (value: ViewMode) => void;
  onDisplayDensityChange: (value: DisplayDensity) => void;
  onMaximizeWidthChange: (value: boolean) => void;
}

export function ViewModeSettings({
  viewMode,
  displayDensity,
  maximizeWidth,
  savedViewMode,
  savedDisplayDensity,
  savedMaximizeWidth,
  onViewModeChange,
  onDisplayDensityChange,
  onMaximizeWidthChange,
}: ViewModeSettingsProps) {
  const { t } = useTranslation();
  const isViewModeModified = viewMode !== savedViewMode;
  const isDensityModified = displayDensity !== savedDisplayDensity;
  const isMaximizeWidthModified = maximizeWidth !== savedMaximizeWidth;

  const viewModeOptions: { value: ViewMode; labelKey: string }[] = [
    { value: 'grouped', labelKey: 'tabManager.viewMode.grouped' },
    { value: 'flat', labelKey: 'tabManager.viewMode.flat' },
  ];

  const densityOptions: { value: DisplayDensity; labelKey: string }[] = [
    { value: 'normal', labelKey: 'tabManager.viewMode.normal' },
    { value: 'compact', labelKey: 'tabManager.viewMode.compact' },
  ];

  return (
    <>
      {/* グループ化モード */}
      <div className="form-group">
        <label className="form-label">{t('settings.viewMode.groupModeLabel')}</label>
        <div className={`theme-options ${isViewModeModified ? 'modified' : ''}`}>
          {viewModeOptions.map(option => (
            <label key={option.value} className="form-radio-label">
              <input
                type="radio"
                name="defaultViewMode"
                value={option.value}
                className="form-radio"
                checked={viewMode === option.value}
                onChange={() => onViewModeChange(option.value)}
              />
              <span className="radio-custom"></span>
              <span>{t(option.labelKey)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 表示密度 */}
      <div className="form-group">
        <label className="form-label">{t('settings.viewMode.densityLabel')}</label>
        <div className={`theme-options ${isDensityModified ? 'modified' : ''}`}>
          {densityOptions.map(option => (
            <label key={option.value} className="form-radio-label">
              <input
                type="radio"
                name="defaultDisplayDensity"
                value={option.value}
                className="form-radio"
                checked={displayDensity === option.value}
                onChange={() => onDisplayDensityChange(option.value)}
              />
              <span className="radio-custom"></span>
              <span>{t(option.labelKey)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 横幅最大化 */}
      <div className="form-group">
        <label className={`form-checkbox-label ${isMaximizeWidthModified ? 'modified' : ''}`}>
          <input
            type="checkbox"
            className="form-checkbox"
            data-testid="maximize-width-checkbox"
            checked={maximizeWidth}
            onChange={(e) => onMaximizeWidthChange(e.target.checked)}
          />
          <span className="checkbox-custom"></span>
          <span>{t('settings.viewMode.maximizeWidthLabel')}</span>
        </label>
      </div>
    </>
  );
}
