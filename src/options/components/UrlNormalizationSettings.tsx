/**
 * TabBurrow - URL正規化設定コンポーネント
 */

import { useState, useCallback, useMemo } from 'react';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { useTranslation } from '../../common/i18nContext';
import type { UrlNormalizationRule } from '../../settings';
import { applyUrlNormalization } from '../../utils/url';
import { UrlNormalizationRuleDialog } from './UrlNormalizationRuleDialog';
import { applyNormalizationToExisting, type NormalizationApplyResult } from '../../storage';
import { NormalizationResultDialog } from '../../common/NormalizationResultDialog';

interface UrlNormalizationSettingsProps {
  enabled: boolean;
  rules: UrlNormalizationRule[];
  savedEnabled: boolean;
  onEnabledChange: (value: boolean) => void;
  onRulesChange: (value: UrlNormalizationRule[]) => void;
}

export function UrlNormalizationSettings({
  enabled,
  rules,
  savedEnabled,
  onEnabledChange,
  onRulesChange,
}: UrlNormalizationSettingsProps) {
  const { t } = useTranslation();
  
  // ダイアログ状態
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<UrlNormalizationRule | null>(null);
  const [normalizationResult, setNormalizationResult] = useState<NormalizationApplyResult | null>(null);

  // シミュレータ状態
  const [testUrl, setTestUrl] = useState('');
  const normalizedTestUrl = useMemo(() => {
    if (!testUrl) return '';
    return applyUrlNormalization(testUrl, rules);
  }, [testUrl, rules]);

  // ルール追加ダイアログを開く
  const handleAddRule = useCallback(() => {
    setEditingRule(null);
    setIsDialogOpen(true);
  }, []);

  // ルール編集ダイアログを開く
  const handleEditRule = useCallback((ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      setEditingRule(rule);
      setIsDialogOpen(true);
    }
  }, [rules]);

  // ルールの有効/無効を切り替え
  const handleToggleRule = useCallback((ruleId: string) => {
    const updatedRules = rules.map(r =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    onRulesChange(updatedRules);
  }, [rules, onRulesChange]);

  // ルールを削除
  const handleDeleteRule = useCallback((ruleId: string) => {
    const updatedRules = rules.filter(r => r.id !== ruleId);
    onRulesChange(updatedRules);
  }, [rules, onRulesChange]);

  // ルールを保存（追加または更新）
  const handleSaveRule = useCallback(async (rule: UrlNormalizationRule, applyToExisting: boolean) => {
    const existingIndex = rules.findIndex(r => r.id === rule.id);
    let updatedRules: UrlNormalizationRule[];
    
    if (existingIndex >= 0) {
      updatedRules = [...rules];
      updatedRules[existingIndex] = rule;
    } else {
      updatedRules = [...rules, rule];
    }
    
    onRulesChange(updatedRules);
    setIsDialogOpen(false);
    setEditingRule(null);

    // 既存タブへの適用
    if (applyToExisting) {
      if (confirm(t('settings.urlNormalization.dialog.applyConfirm'))) {
        try {
          const result = await applyNormalizationToExisting(updatedRules);
          setNormalizationResult(result);
        } catch (error) {
          console.error('Failed to apply normalization:', error);
          alert('Failed to apply normalization to existing tabs.');
        }
      }
    }
  }, [rules, onRulesChange, t]);

  // ダイアログを閉じる
  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingRule(null);
  }, []);

  return (
    <>
      <div className="form-group">
        <label className={`form-checkbox-label ${enabled !== savedEnabled ? 'modified' : ''}`}>
          <input
            type="checkbox"
            id="urlNormalizationEnabled"
            className="form-checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
          />
          <span className="checkbox-custom"></span>
          <span>{t('settings.urlNormalization.enableLabel')}</span>
        </label>
      </div>

      <div className={`form-group url-normalization-settings ${enabled ? 'enabled' : ''}`}>
        <div className="rules-section">
          <div className="rules-header">
            <h3 className="rules-title">{t('settings.urlNormalization.rulesTitle')}</h3>
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={handleAddRule}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              data-testid="add-normalization-rule-button"
            >
              <Plus size={16} />
              <span>{t('settings.urlNormalization.addRule')}</span>
            </button>
          </div>
          <p className="rules-description">{t('settings.urlNormalization.rulesDescription')}</p>

          <div className="rules-list">
            {rules.length === 0 ? (
              <div className="no-rules">{t('settings.urlNormalization.noRules')}</div>
            ) : (
              rules.map(rule => (
                <div key={rule.id} className={`rule-item ${rule.enabled ? '' : 'disabled'}`} data-testid="normalization-rule-item">
                  <div className="rule-info">
                    <div className="rule-name-row">
                      <label className="form-checkbox-label">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={() => handleToggleRule(rule.id)}
                          className="form-checkbox"
                        />
                        <span className="checkbox-custom"></span>
                        <span className="rule-name">{rule.name}</span>
                      </label>
                    </div>
                    <div className="rule-pattern-text">
                      <code>{rule.pattern}</code> <span>→</span> <code>{rule.replacement}</code>
                    </div>
                  </div>
                  <div className="rule-actions">
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => handleEditRule(rule.id)}
                      title={t('settings.urlNormalization.editRule')}
                      data-testid="edit-normalization-rule-button"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon btn-danger-icon"
                      onClick={() => handleDeleteRule(rule.id)}
                      title={t('common.delete')}
                      data-testid="delete-normalization-rule-button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* シミュレータ */}
        <div className="simulator-section">
          <h3 className="rules-title">{t('settings.urlNormalization.simulatorTitle')}</h3>
          <div className="simulator-input-group">
            <input
              type="url"
              className="form-input"
              placeholder={t('settings.urlNormalization.simulatorPlaceholder')}
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              data-testid="normalization-simulator-input"
            />
          </div>
          {testUrl && (
            <div className="simulator-result">
              <span>{t('settings.urlNormalization.simulatorResult')}</span>
              <code className="normalized-url" data-testid="normalization-simulator-result">{normalizedTestUrl}</code>
            </div>
          )}
        </div>
      </div>

      <UrlNormalizationRuleDialog
        isOpen={isDialogOpen}
        editingRule={editingRule}
        onSave={handleSaveRule}
        onClose={handleCloseDialog}
      />

      <NormalizationResultDialog
        isOpen={normalizationResult !== null}
        result={normalizationResult}
        onClose={() => setNormalizationResult(null)}
      />
    </>
  );
}
