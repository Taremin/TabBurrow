/**
 * TabBurrow - 言語設定コンポーネント
 */

import { useTranslation } from '../../common/i18nContext';
import type { LocaleSetting } from '../../i18n';

interface LanguageSettingsProps {
  value: LocaleSetting;
  savedValue: LocaleSetting;
  onChange: (value: LocaleSetting) => void;
}

export function LanguageSettings({ value, savedValue, onChange }: LanguageSettingsProps) {
  const { t } = useTranslation();
  const isModified = value !== savedValue;

  const options: { value: LocaleSetting; label: string }[] = [
    { value: 'auto', label: t('settings.language.auto') },
    { value: 'ja', label: '日本語' },
    { value: 'en', label: 'English' },
  ];

  return (
    <div className="form-group">
      <label className="form-label">{t('settings.language.label')}</label>
      <div className={`locale-options ${isModified ? 'modified' : ''}`}>
        {options.map(option => (
          <label key={option.value} className="form-radio-label">
            <input
              type="radio"
              name="locale"
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
