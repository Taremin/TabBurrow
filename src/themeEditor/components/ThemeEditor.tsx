/**
 * テーマエディタ本体コンポーネント
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from '../../common/i18nContext';
import { applyThemeColors, type CustomTheme, type ThemeColors } from '../../customTheme';
import { ColorSection } from './ColorSection';
import { ThemePreview } from './ThemePreview';

interface ThemeEditorProps {
  theme: CustomTheme;
  onUpdate: (theme: CustomTheme) => void;
}

// カラー設定のカテゴリ定義
const COLOR_CATEGORIES = [
  {
    key: 'background',
    titleKey: 'themeEditor.category.background',
    defaultTitle: '背景色',
    colors: ['bgPrimary', 'bgSecondary', 'bgTertiary'] as (keyof ThemeColors)[],
  },
  {
    key: 'text',
    titleKey: 'themeEditor.category.text',
    defaultTitle: 'テキスト色',
    colors: ['textPrimary', 'textSecondary', 'textMuted'] as (keyof ThemeColors)[],
  },
  {
    key: 'border',
    titleKey: 'themeEditor.category.border',
    defaultTitle: 'ボーダー',
    colors: ['borderColor', 'domainGroupBorder'] as (keyof ThemeColors)[],
  },
  {
    key: 'accent',
    titleKey: 'themeEditor.category.accent',
    defaultTitle: 'アクセント',
    colors: ['accentColor', 'accentHover', 'accentLight', 'accentSubtleSolid'] as (keyof ThemeColors)[],
  },
  {
    key: 'status',
    titleKey: 'themeEditor.category.status',
    defaultTitle: 'ステータス色',
    colors: [
      'dangerColor', 'dangerHover', 'dangerLight',
      'successColor', 'successLight',
      'warningColor', 'warningLight',
    ] as (keyof ThemeColors)[],
  },
  {
    key: 'shadow',
    titleKey: 'themeEditor.category.shadow',
    defaultTitle: 'シャドウ',
    colors: ['shadowSm', 'shadowMd', 'shadowLg'] as (keyof ThemeColors)[],
  },
  {
    key: 'font',
    titleKey: 'themeEditor.category.font',
    defaultTitle: 'フォント',
    colors: ['fontFamily', 'fontSizeBase', 'fontSizeSmall'] as (keyof ThemeColors)[],
  },
];

// カラーキーのラベル
const COLOR_LABELS: Record<keyof ThemeColors, { key: string; default: string }> = {
  bgPrimary: { key: 'themeEditor.color.bgPrimary', default: 'メイン背景' },
  bgSecondary: { key: 'themeEditor.color.bgSecondary', default: 'セカンダリ背景' },
  bgTertiary: { key: 'themeEditor.color.bgTertiary', default: 'ターシャリ背景' },
  textPrimary: { key: 'themeEditor.color.textPrimary', default: 'メインテキスト' },
  textSecondary: { key: 'themeEditor.color.textSecondary', default: 'サブテキスト' },
  textMuted: { key: 'themeEditor.color.textMuted', default: '薄いテキスト' },
  borderColor: { key: 'themeEditor.color.borderColor', default: 'ボーダー' },
  domainGroupBorder: { key: 'themeEditor.color.domainGroupBorder', default: 'ドメイングループボーダー' },
  accentColor: { key: 'themeEditor.color.accentColor', default: 'アクセント' },
  accentHover: { key: 'themeEditor.color.accentHover', default: 'ホバー' },
  accentLight: { key: 'themeEditor.color.accentLight', default: '薄いアクセント' },
  accentSubtleSolid: { key: 'themeEditor.color.accentSubtleSolid', default: '微細アクセント' },
  dangerColor: { key: 'themeEditor.color.dangerColor', default: '危険' },
  dangerHover: { key: 'themeEditor.color.dangerHover', default: '危険ホバー' },
  dangerLight: { key: 'themeEditor.color.dangerLight', default: '薄い危険色' },
  successColor: { key: 'themeEditor.color.successColor', default: '成功' },
  successLight: { key: 'themeEditor.color.successLight', default: '薄い成功色' },
  warningColor: { key: 'themeEditor.color.warningColor', default: '警告' },
  warningLight: { key: 'themeEditor.color.warningLight', default: '薄い警告色' },
  shadowSm: { key: 'themeEditor.color.shadowSm', default: '小シャドウ' },
  shadowMd: { key: 'themeEditor.color.shadowMd', default: '中シャドウ' },
  shadowLg: { key: 'themeEditor.color.shadowLg', default: '大シャドウ' },
  fontFamily: { key: 'themeEditor.color.fontFamily', default: 'フォントファミリー' },
  fontSizeBase: { key: 'themeEditor.color.fontSizeBase', default: '基本フォントサイズ' },
  fontSizeSmall: { key: 'themeEditor.color.fontSizeSmall', default: '小フォントサイズ' },
};

export function ThemeEditor({ theme, onUpdate }: ThemeEditorProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(theme.name);
  const [colors, setColors] = useState<ThemeColors>({ ...theme.colors });
  const [hasChanges, setHasChanges] = useState(false);

  // テーマが変わったらリセット
  useEffect(() => {
    setName(theme.name);
    setColors({ ...theme.colors });
    setHasChanges(false);
  }, [theme.id, theme.name, theme.colors]);

  // 色の変更をプレビュー
  useEffect(() => {
    applyThemeColors(colors);
  }, [colors]);

  // 名前変更
  const handleNameChange = useCallback((newName: string) => {
    setName(newName);
    setHasChanges(true);
  }, []);

  // 色変更
  const handleColorChange = useCallback((key: keyof ThemeColors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  // 保存
  const handleSave = useCallback(() => {
    onUpdate({
      ...theme,
      name,
      colors,
    });
    setHasChanges(false);
  }, [theme, name, colors, onUpdate]);

  return (
    <>
      {/* エディタヘッダー */}
      <div className="editor-header">
        <input
          type="text"
          className="theme-name-input"
          value={name}
          onChange={e => handleNameChange(e.target.value)}
          placeholder={t('themeEditor.themeNamePlaceholder', { defaultValue: 'テーマ名を入力' })}
        />
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!hasChanges}
        >
          {t('common.save')}
        </button>
      </div>

      {/* カラーセクション */}
      <div className="color-sections">
        {COLOR_CATEGORIES.map(category => (
          <ColorSection
            key={category.key}
            title={t(category.titleKey, { defaultValue: category.defaultTitle })}
            colors={colors}
            colorKeys={category.colors}
            labels={COLOR_LABELS}
            onChange={handleColorChange}
          />
        ))}
      </div>

      {/* タブ画面プレビュー */}
      <ThemePreview />
    </>
  );
}

