/**
 * TabBurrow - リンクチェック設定コンポーネント
 */

import { useState, useCallback } from 'react';
import { useTranslation } from '../../common/i18nContext.js';
import type { LinkCheckRule, LinkCheckAction } from '../../settings.js';
import { LinkCheckRuleDialog } from './LinkCheckRuleDialog.js';
import { Pencil, Trash2 } from 'lucide-react';

interface LinkCheckSettingsProps {
  rules: LinkCheckRule[];
  timeoutMs: number;
  concurrency: number;
  domainConcurrency: number;
  domainDelayMs: number;
  useGetFallback: boolean;
  onRulesChange: (rules: LinkCheckRule[]) => void;
  onTimeoutChange: (value: number) => void;
  onConcurrencyChange: (value: number) => void;
  onDomainConcurrencyChange: (value: number) => void;
  onDomainDelayChange: (value: number) => void;
  onUseGetFallbackChange: (value: boolean) => void;
}

// アクションの選択肢
const ACTIONS: { value: LinkCheckAction; labelKey: string }[] = [
  { value: 'alive', labelKey: 'linkCheck.settings.actionAlive' },
  { value: 'dead', labelKey: 'linkCheck.settings.actionDead' },
  { value: 'warning', labelKey: 'linkCheck.settings.actionWarning' },
  { value: 'ignore', labelKey: 'linkCheck.settings.actionIgnore' },
];

export function LinkCheckSettings({
  rules,
  timeoutMs,
  concurrency,
  domainConcurrency,
  domainDelayMs,
  useGetFallback,
  onRulesChange,
  onTimeoutChange,
  onConcurrencyChange,
  onDomainConcurrencyChange,
  onDomainDelayChange,
  onUseGetFallbackChange,
}: LinkCheckSettingsProps) {
  const { t } = useTranslation();

  // ダイアログ状態
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<LinkCheckRule | null>(null);

  // ルールの有効/無効切り替え
  const handleToggleRule = useCallback((ruleId: string) => {
    const updatedRules = rules.map(r =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    onRulesChange(updatedRules);
  }, [rules, onRulesChange]);

  // ルールのアクション変更
  const handleActionChange = useCallback((ruleId: string, action: LinkCheckAction) => {
    const updatedRules = rules.map(r =>
      r.id === ruleId ? { ...r, action } : r
    );
    onRulesChange(updatedRules);
  }, [rules, onRulesChange]);

  // ルール削除
  const handleDeleteRule = useCallback((ruleId: string) => {
    const updatedRules = rules.filter(r => r.id !== ruleId);
    onRulesChange(updatedRules);
  }, [rules, onRulesChange]);

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

  // ルールを保存（追加または更新）
  const handleSaveRule = useCallback((rule: LinkCheckRule) => {
    const existingIndex = rules.findIndex(r => r.id === rule.id);
    if (existingIndex >= 0) {
      // 更新
      const updatedRules = [...rules];
      updatedRules[existingIndex] = rule;
      onRulesChange(updatedRules);
    } else {
      // 追加
      onRulesChange([...rules, rule]);
    }
  }, [rules, onRulesChange]);

  // ダイアログを閉じる
  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingRule(null);
  }, []);

  return (
    <>
      {/* 基本設定 */}
      <div className="form-group">
        <div className="link-check-settings-grid">
          {/* タイムアウト */}
          <div className="setting-row">
            <label htmlFor="linkCheckTimeout" className="form-label">
              {t('linkCheck.settings.timeout')}
            </label>
            <div className="input-group input-group-compact">
              <input
                type="number"
                id="linkCheckTimeout"
                className="form-input form-input-small"
                min={1}
                max={60}
                value={Math.round(timeoutMs / 1000)}
                onChange={(e) => onTimeoutChange((parseInt(e.target.value, 10) || 10) * 1000)}
              />
              <span className="input-suffix">{t('linkCheck.settings.timeoutUnit')}</span>
            </div>
          </div>

          {/* 同時リクエスト数 */}
          <div className="setting-row">
            <label htmlFor="linkCheckConcurrency" className="form-label">
              {t('linkCheck.settings.concurrency')}
            </label>
            <div className="input-group input-group-compact">
              <input
                type="number"
                id="linkCheckConcurrency"
                className="form-input form-input-small"
                min={1}
                max={20}
                value={concurrency}
                onChange={(e) => onConcurrencyChange(parseInt(e.target.value, 10) || 5)}
              />
            </div>
          </div>

          {/* ドメイン別同時リクエスト */}
          <div className="setting-row">
            <label htmlFor="linkCheckDomainConcurrency" className="form-label">
              {t('linkCheck.settings.domainConcurrency')}
            </label>
            <div className="input-group input-group-compact">
              <input
                type="number"
                id="linkCheckDomainConcurrency"
                className="form-input form-input-small"
                min={1}
                max={10}
                value={domainConcurrency}
                onChange={(e) => onDomainConcurrencyChange(parseInt(e.target.value, 10) || 1)}
              />
            </div>
          </div>

          {/* ドメイン間ディレイ */}
          <div className="setting-row">
            <label htmlFor="linkCheckDomainDelay" className="form-label">
              {t('linkCheck.settings.domainDelay')}
            </label>
            <div className="input-group input-group-compact">
              <input
                type="number"
                id="linkCheckDomainDelay"
                className="form-input form-input-small"
                min={0}
                max={5000}
                step={50}
                value={domainDelayMs}
                onChange={(e) => onDomainDelayChange(parseInt(e.target.value, 10) || 100)}
              />
              <span className="input-suffix">{t('linkCheck.settings.domainDelayUnit')}</span>
            </div>
          </div>
        </div>

        {/* GETフォールバック設定 */}
        <div className="form-group" style={{ marginTop: '16px' }}>
          <label className="form-checkbox-label" title={t('linkCheck.settings.useGetFallbackHint')}>
            <input
              type="checkbox"
              className="form-checkbox"
              checked={useGetFallback}
              onChange={(e) => onUseGetFallbackChange(e.target.checked)}
            />
            <span className="checkbox-custom"></span>
            <span>
              {t('linkCheck.settings.useGetFallback')}
            </span>
          </label>
          <div className="form-hint" style={{ marginLeft: '30px' }}>
            {t('linkCheck.settings.useGetFallbackHint')}
          </div>
        </div>
      </div>

      {/* ステータスコード別アクション */}
      <div className="form-group">
        <h3 className="rules-title">{t('linkCheck.settings.rules')}</h3>
        <p className="rules-description">{t('linkCheck.settings.rulesHint')}</p>

        <div className="link-check-rules-header">
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={handleAddRule}
              data-testid="add-rule-button"
            >
              {t('linkCheck.settings.addRule')}
            </button>
        </div>

        <div className="link-check-rules-list">
          {rules.length === 0 && (
            <div className="rules-empty">{t('settings.autoClose.noRules')}</div>
          )}
          {rules.map(rule => (
            <div key={rule.id} className={`link-check-rule-item ${!rule.enabled ? 'disabled' : ''}`} data-testid="link-check-rule-item">
              <div className="link-check-rule-content">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => handleToggleRule(rule.id)}
                  className="rule-checkbox"
                />
                <span className="rule-condition">{rule.condition}</span>
                <span className="rule-arrow">→</span>
                <select
                  className="form-select form-select-small"
                  value={rule.action}
                  onChange={(e) => handleActionChange(rule.id, e.target.value as LinkCheckAction)}
                >
                  {ACTIONS.map(action => (
                    <option key={action.value} value={action.value}>
                      {t(action.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="link-check-rule-actions">
                  <button
                    type="button"
                    className="btn btn-icon"
                    onClick={() => handleEditRule(rule.id)}
                    title={t('linkCheck.settings.editRule')}
                    data-testid="edit-rule-button"
                  >
                  <Pencil size={14} />
                </button>
                  <button
                    type="button"
                    className="btn btn-icon btn-danger-icon"
                    onClick={() => handleDeleteRule(rule.id)}
                    title={t('common.delete')}
                    data-testid="delete-rule-button"
                  >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ルール編集ダイアログ */}
      <LinkCheckRuleDialog
        isOpen={isDialogOpen}
        editingRule={editingRule}
        onSave={handleSaveRule}
        onClose={handleCloseDialog}
      />
    </>
  );
}

