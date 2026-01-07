/**
 * TabBurrow - スクリーンショット設定コンポーネント
 */

import { useTranslation } from '../../common/i18nContext.js';

interface ScreenshotSettingsProps {
  enabled: boolean;
  intervalMinutes: number;
  savedEnabled: boolean;
  savedIntervalMinutes: number;
  onEnabledChange: (value: boolean) => void;
  onIntervalMinutesChange: (value: number) => void;
}

export function ScreenshotSettings({
  enabled,
  intervalMinutes,
  savedEnabled,
  savedIntervalMinutes,
  onEnabledChange,
  onIntervalMinutesChange,
}: ScreenshotSettingsProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* 有効/無効チェックボックス */}
      <div className="form-group">
        <label className={`form-checkbox-label ${enabled !== savedEnabled ? 'modified' : ''}`}>
          <input
            type="checkbox"
            id="screenshotEnabled"
            className="form-checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
          />
          <span className="checkbox-custom"></span>
          <span>{t('settings.screenshot.enableLabel')}</span>
        </label>
      </div>

      {/* 詳細設定 */}
      <div className={`form-group screenshot-settings ${enabled ? 'enabled' : ''}`}>
        <label htmlFor="screenshotUpdateInterval" className="form-label">
          {t('settings.screenshot.intervalLabel')}
        </label>
        <div className="input-group">
          <input
            type="number"
            id="screenshotUpdateInterval"
            className={`form-input ${intervalMinutes !== savedIntervalMinutes ? 'modified' : ''}`}
            min={1}
            max={60}
            step={1}
            value={intervalMinutes}
            onChange={(e) => onIntervalMinutesChange(parseInt(e.target.value, 10) || 5)}
          />
          <span className="input-suffix">min</span>
        </div>
        <div className="form-hint">{t('settings.screenshot.intervalHint')}</div>
      </div>
    </>
  );
}
