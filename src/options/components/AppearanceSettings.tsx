/**
 * TabBurrow - 外観設定コンポーネント
 */

import { useTranslation } from '../../common/i18nContext.js';
import type { ThemeSetting } from '../../theme.js';

interface AppearanceSettingsProps {
  value: ThemeSetting;
  savedValue: ThemeSetting;
  onChange: (value: ThemeSetting) => void;
}

export function AppearanceSettings({ value, savedValue, onChange }: AppearanceSettingsProps) {
  const { t } = useTranslation();
  const isModified = value !== savedValue;

  const options: { value: ThemeSetting; label: string }[] = [
    { value: 'system', label: t('settings.appearance.system') },
    { value: 'dark', label: t('settings.appearance.dark') },
    { value: 'light', label: t('settings.appearance.light') },
  ];

  return (
    <div className="form-group">
      <label className="form-label">{t('settings.appearance.label')}</label>
      <div className={`theme-options ${isModified ? 'modified' : ''}`}>
        {options.map(option => (
          <label key={option.value} className="form-radio-label">
            <input
              type="radio"
              name="theme"
              value={option.value}
              className="form-radio"
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="radio-custom"></span>
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
