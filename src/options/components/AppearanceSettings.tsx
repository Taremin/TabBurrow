/**
 * TabBurrow - 外観設定コンポーネント
 */

import { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { useTranslation } from '../../common/i18nContext.js';
import { isCustomTheme, createCustomThemeSetting, type ThemeSetting } from '../../theme.js';
import { getCustomThemes, type CustomTheme } from '../../customTheme.js';

interface AppearanceSettingsProps {
  value: ThemeSetting;
  savedValue: ThemeSetting;
  onChange: (value: ThemeSetting) => void;
}

export function AppearanceSettings({ value, savedValue, onChange }: AppearanceSettingsProps) {
  const { t } = useTranslation();
  const isModified = value !== savedValue;
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);

  // カスタムテーマをロード
  useEffect(() => {
    getCustomThemes().then(setCustomThemes);
  }, []);

  // プリセットテーマ
  const presetOptions: { value: ThemeSetting; label: string }[] = [
    { value: 'system', label: t('settings.appearance.system') },
    { value: 'dark', label: t('settings.appearance.dark') },
    { value: 'light', label: t('settings.appearance.light') },
  ];

  // カスタムテーマをオプションに変換
  const customOptions: { value: ThemeSetting; label: string }[] = customThemes.map(theme => ({
    value: createCustomThemeSetting(theme.id),
    label: theme.name,
  }));

  const allOptions = [...presetOptions, ...customOptions];

  return (
    <div className="form-group">
      <div className="form-label-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <label className="form-label" style={{ marginBottom: 0 }}>{t('settings.appearance.label')}</label>
        <a 
          href="theme-editor.html" 
          className="btn btn-secondary btn-small"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
        >
          <Palette size={14} />
          <span>{t('settings.appearance.editThemes', { defaultValue: 'テーマを編集' })}</span>
        </a>
      </div>
      <div className={`theme-options ${isModified ? 'modified' : ''}`}>
        {allOptions.map(option => (
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
            <span>
              {option.label}
              {isCustomTheme(option.value) && (
                <span style={{ marginLeft: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ({t('settings.appearance.custom', { defaultValue: 'カスタム' })})
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
      {customThemes.length === 0 && (
        <p className="form-hint">
          {t('settings.appearance.noCustomThemes', { defaultValue: 'カスタムテーマがありません。「テーマを編集」から作成できます。' })}
        </p>
      )}
    </div>
  );
}
