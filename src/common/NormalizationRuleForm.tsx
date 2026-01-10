import { memo, ReactNode } from 'react';
import { Activity, ArrowDown, HelpCircle } from 'lucide-react';
import { useTranslation } from './i18nContext';

/** プレビュー結果の型 */
export interface NormalizationPreviewResult {
  original: string;
  normalized: string;
}

interface NormalizationRuleFormProps {
  /** ルール名 */
  name: string;
  onNameChange: (value: string) => void;
  /** 正規表現パターン */
  pattern: string;
  onPatternChange: (value: string) => void;
  /** 置換後の文字列 */
  replacement: string;
  onReplacementChange: (value: string) => void;
  /** 既存データに適用するか */
  applyToExisting: boolean;
  onApplyToExistingChange: (value: boolean) => void;
  /** プレビュー結果（表示する場合） */
  previewResults?: NormalizationPreviewResult[];
  /** 追加のコンテンツ（フォーム下部） */
  additionalContent?: ReactNode;
}

/**
 * 正規化ルールのフォーム部分（共通コンポーネント）
 * タブ管理画面・設定画面のダイアログで共有
 */
export const NormalizationRuleForm = memo(function NormalizationRuleForm({
  name,
  onNameChange,
  pattern,
  onPatternChange,
  replacement,
  onReplacementChange,
  applyToExisting,
  onApplyToExistingChange,
  previewResults,
  additionalContent,
}: NormalizationRuleFormProps) {
  const { t } = useTranslation();

  return (
    <div className="dialog-form">
      <div className="form-group">
        <label className="form-label">{t('settings.urlNormalization.dialog.name')}</label>
        <input
          type="text"
          className="form-input"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          autoFocus
          placeholder="e.g. My Custom Rule"
          data-testid="rule-name-input"
        />
      </div>

      <div className="form-group">
        <label className="form-label">{t('settings.urlNormalization.dialog.pattern')}</label>
        <input
          type="text"
          className="form-input"
          value={pattern}
          onChange={(e) => onPatternChange(e.target.value)}
          placeholder="^https://example\\.com/..."
          data-testid="rule-pattern-input"
        />
      </div>

      <div className="form-group">
        <label className="form-label">{t('settings.urlNormalization.dialog.replacement')}</label>
        <input
          type="text"
          className="form-input"
          value={replacement}
          onChange={(e) => onReplacementChange(e.target.value)}
          placeholder="https://example.com/..."
          data-testid="rule-replacement-input"
        />
      </div>

      {previewResults && previewResults.length > 0 && (
        <div className="preview-section">
          <div className="preview-title-row">
            <HelpCircle size={14} />
            <h4>{t('settings.urlNormalization.simulatorTitle')}</h4>
          </div>
          <div className="preview-list">
            {previewResults.map((res, i) => (
              <div key={i} className="preview-item">
                <div className="preview-original-text" title={res.original}>{res.original}</div>
                <div className="preview-arrow"><ArrowDown size={12} /></div>
                <div className="preview-normalized-text" title={res.normalized}>{res.normalized}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {additionalContent}

      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="form-checkbox-label">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={applyToExisting}
            onChange={(e) => onApplyToExistingChange(e.target.checked)}
            data-testid="apply-to-existing-checkbox"
          />
          <span className="checkbox-custom"></span>
          <span>{t('settings.urlNormalization.dialog.applyToExisting')}</span>
        </label>
      </div>
    </div>
  );
});

/** ダイアログヘッダー用のアイコン */
export const NormalizationRuleIcon = () => <Activity className="alert-icon-info" />;
