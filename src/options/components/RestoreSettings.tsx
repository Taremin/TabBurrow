/**
 * TabBurrow - タブ復元設定コンポーネント
 */

import { useTranslation } from '../../common/i18nContext.js';
import type { RestoreMode } from '../../settings.js';

interface RestoreSettingsProps {
  mode: RestoreMode;
  intervalMs: number;
  savedMode: RestoreMode;
  savedIntervalMs: number;
  onModeChange: (value: RestoreMode) => void;
  onIntervalChange: (value: number) => void;
}

export function RestoreSettings({
  mode,
  intervalMs,
  savedMode,
  savedIntervalMs,
  onModeChange,
  onIntervalChange,
}: RestoreSettingsProps) {
  const { t } = useTranslation();

  const modeOptions: { value: RestoreMode; labelKey: string }[] = [
    { value: 'normal', labelKey: 'settings.restore.normal' },
    { value: 'lazy', labelKey: 'settings.restore.lazy' },
    { value: 'immediate', labelKey: 'settings.restore.immediate' },
  ];

  return (
    <>
      <div className="form-group">
        <label className="form-label">{t('settings.restore.modeLabel')}</label>
        <div className={`restore-mode-options ${mode !== savedMode ? 'modified' : ''}`}>
          {modeOptions.map(option => (
            <label key={option.value} className="form-radio-label">
              <input
                type="radio"
                name="restoreMode"
                value={option.value}
                className="form-radio"
                checked={mode === option.value}
                onChange={() => onModeChange(option.value)}
              />
              <span className="radio-custom"></span>
              <span>{t(option.labelKey)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="restoreIntervalMs" className="form-label">
          {t('settings.restore.intervalLabel')}
        </label>
        <div className="input-group">
          <input
            type="number"
            id="restoreIntervalMs"
            className={`form-input ${intervalMs !== savedIntervalMs ? 'modified' : ''}`}
            min={0}
            max={1000}
            step={10}
            value={intervalMs}
            onChange={(e) => onIntervalChange(parseInt(e.target.value, 10) || 0)}
          />
          <span className="input-suffix">{t('settings.restore.intervalMs')}</span>
        </div>
        <div className="form-hint">{t('settings.restore.intervalHint')}</div>
      </div>
    </>
  );
}
