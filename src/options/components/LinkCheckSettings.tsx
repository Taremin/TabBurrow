/**
 * TabBurrow - リンクチェック設定コンポーネント
 */

import { useCallback } from 'react';
import { useTranslation } from '../../common/i18nContext.js';
import type { LinkCheckRule, LinkCheckAction } from '../../settings.js';

interface LinkCheckSettingsProps {
  rules: LinkCheckRule[];
  timeoutMs: number;
  concurrency: number;
  domainConcurrency: number;
  domainDelayMs: number;
  onRulesChange: (rules: LinkCheckRule[]) => void;
  onTimeoutChange: (value: number) => void;
  onConcurrencyChange: (value: number) => void;
  onDomainConcurrencyChange: (value: number) => void;
  onDomainDelayChange: (value: number) => void;
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
  onRulesChange,
  onTimeoutChange,
  onConcurrencyChange,
  onDomainConcurrencyChange,
  onDomainDelayChange,
}: LinkCheckSettingsProps) {
  const { t } = useTranslation();

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

  // 新規ルール追加
  const handleAddRule = useCallback(() => {
    const condition = window.prompt(t('linkCheck.settings.condition'), '');
    if (!condition || !condition.trim()) return;
    
    const newRule: LinkCheckRule = {
      id: crypto.randomUUID(),
      enabled: true,
      name: condition.trim(),
      condition: condition.trim(),
      action: 'warning',
    };
    onRulesChange([...rules, newRule]);
  }, [rules, onRulesChange, t]);

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
          >
            {t('linkCheck.settings.addRule')}
          </button>
        </div>

        <div className="link-check-rules-list">
          {rules.length === 0 && (
            <div className="rules-empty">{t('settings.autoClose.noRules')}</div>
          )}
          {rules.map(rule => (
            <div key={rule.id} className={`link-check-rule-item ${!rule.enabled ? 'disabled' : ''}`}>
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
              <button
                type="button"
                className="btn-rule-delete"
                onClick={() => handleDeleteRule(rule.id)}
                title={t('common.delete')}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
