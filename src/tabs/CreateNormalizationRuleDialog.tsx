/**
 * TabBurrow - 正規化ルール作成ダイアログ（タブ管理画面用）
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '../common/i18nContext';
import { generateRegexFromUrls, applyUrlNormalization } from '../utils/url';
import { Dialog } from '../common/Dialog';
import { NormalizationRuleForm, NormalizationRuleIcon } from '../common/NormalizationRuleForm';
import type { UrlNormalizationRule } from '../settings';

interface CreateNormalizationRuleDialogProps {
  isOpen: boolean;
  selectedUrls: string[];
  onSave: (rule: UrlNormalizationRule, applyToExisting: boolean) => void;
  onClose: () => void;
}

export function CreateNormalizationRuleDialog({
  isOpen,
  selectedUrls,
  onSave,
  onClose,
}: CreateNormalizationRuleDialogProps) {
  const { t } = useTranslation();
  
  const [name, setName] = useState('');
  const [pattern, setPattern] = useState('');
  const [replacement, setReplacement] = useState('');
  const [applyToExisting, setApplyToExisting] = useState(true);

  // 初期値の生成
  useEffect(() => {
    if (isOpen && selectedUrls.length > 0) {
      const suggestion = generateRegexFromUrls(selectedUrls);
      setPattern(suggestion.pattern);
      setReplacement(suggestion.replacement);
      
      // ドメイン名をデフォルト名にする
      try {
        const domain = new URL(selectedUrls[0]).hostname;
        setName(domain);
      } catch {
        setName('New Rule');
      }
    }
  }, [isOpen, selectedUrls]);

  // プレビュー表示
  const previewResults = useMemo(() => {
    if (!pattern) return [];
    
    const tempRule: UrlNormalizationRule = {
      id: 'temp',
      enabled: true,
      name: 'temp',
      pattern,
      replacement,
    };
    
    return selectedUrls.slice(0, 3).map(url => ({
      original: url,
      normalized: applyUrlNormalization(url, [tempRule])
    }));
  }, [pattern, replacement, selectedUrls]);

  const handleSave = useCallback(() => {
    if (!name || !pattern) return;
    
    const rule: UrlNormalizationRule = {
      id: crypto.randomUUID(),
      enabled: true,
      name,
      pattern,
      replacement,
    };
    
    onSave(rule, applyToExisting);
  }, [name, pattern, replacement, applyToExisting, onSave]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('tabManager.selection.createNormalizationRule')}
      icon={<NormalizationRuleIcon />}
      width="480px"
      actions={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!name || !pattern}
          >
            {t('common.save')}
          </button>
        </>
      }
    >
      <NormalizationRuleForm
        name={name}
        onNameChange={setName}
        pattern={pattern}
        onPatternChange={setPattern}
        replacement={replacement}
        onReplacementChange={setReplacement}
        applyToExisting={applyToExisting}
        onApplyToExistingChange={setApplyToExisting}
        previewResults={previewResults}
      />
    </Dialog>
  );
}
