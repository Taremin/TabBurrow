/**
 * カラーセクションコンポーネント
 */

import { useTranslation } from '../../common/i18nContext.js';
import { ColorInput } from './ColorInput.js';
import type { ThemeColors } from '../../customTheme.js';

interface ColorSectionProps {
  title: string;
  colors: ThemeColors;
  colorKeys: (keyof ThemeColors)[];
  labels: Record<keyof ThemeColors, { key: string; default: string }>;
  onChange: (key: keyof ThemeColors, value: string) => void;
}

// テキスト入力が必要なキー
const TEXT_INPUT_KEYS: (keyof ThemeColors)[] = ['fontFamily', 'fontSizeBase', 'fontSizeSmall', 'shadowSm', 'shadowMd', 'shadowLg'];

export function ColorSection({ title, colors, colorKeys, labels, onChange }: ColorSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="color-section">
      <h3 className="color-section-title">{title}</h3>
      <div className="color-grid">
        {colorKeys.map(key => {
          const isTextInput = TEXT_INPUT_KEYS.includes(key);
          const label = t(labels[key].key, { defaultValue: labels[key].default });
          
          return (
            <ColorInput
              key={key}
              label={label}
              value={colors[key]}
              onChange={(value: string) => onChange(key, value)}
              isTextOnly={isTextInput}
            />
          );
        })}
      </div>
    </section>
  );
}
