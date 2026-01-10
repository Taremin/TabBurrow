/**
 * TabBurrow - ドメイングループ設定コンポーネント
 */

import { useState, useCallback } from 'react';
import { Tag, Pencil, Trash2, Plus } from 'lucide-react';
import { useTranslation } from '../../common/i18nContext';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { PromptDialog } from '../../common/PromptDialog';

interface DomainGroupSettingsProps {
  aliases: Record<string, string>;
  onAliasesChange: (newAliases: Record<string, string>) => void;
}

export function DomainGroupSettings({ aliases, onAliasesChange }: DomainGroupSettingsProps) {
  const { t } = useTranslation();
  
  // ダイアログ状態
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // 選択中のドメイン（編集・削除用）
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  
  // 新規追加用のドメイン入力（2段階ダイアログにするのは面倒なので、PromptDialogを拡張するか、簡易的にキー入力は別途考える）
  // PromptDialogは1つの入力しかない。
  // 新規追加の場合、ドメインとエイリアスの2つが必要。
  // ドメイン入力 -> エイリアス入力 の2ステップにするか、
  // あるいは、UI上に「新しいエイリアスを追加」ボタンを押すと、まずドメインを入力させ、次にエイリアスを入力させる？
  // 簡易的に：既存のPromptDialogでは無理があるため、ここだけカスタムUIにするか、2回ダイアログを出す。
  // 今回は2回ダイアログを出す方式で実装する（Step 1: Domain, Step 2: Alias）。
  const [step, setStep] = useState<'domain' | 'alias'>('domain');
  const [tempDomain, setTempDomain] = useState('');
  
  // エラー状態
  const [error, setError] = useState<string | null>(null);

  // 一覧表示用データ
  const aliasEntries = Object.entries(aliases).sort((a, b) => a[0].localeCompare(b[0]));

  // 新規作成開始
  const handleStartCreate = useCallback(() => {
    setStep('domain');
    setTempDomain('');
    setError(null);
    setCreateDialogOpen(true);
  }, []);

  // 新規作成：ドメイン入力完了
  const handleDomainInput = useCallback((domain: string) => {
    const trimmedDomain = domain.trim();
    if (!trimmedDomain) {
      setError(t('settings.domainGroups.emptyDomainError'));
      return;
    }
    
    // 既存チェック
    if (aliases[trimmedDomain]) {
      setError(t('settings.domainGroups.duplicateError'));
      return;
    }

    setTempDomain(trimmedDomain);
    setStep('alias'); // 次へ
    setError(null);
    // Dialogを開き直す（PromptDialogの更新のため、stateリセットが必要かもだが、keyを変えるか、defaultValueを変える）
  }, [aliases, t]);

  // 新規作成：エイリアス入力完了（保存）
  const handleAliasInput = useCallback((alias: string) => {
    const trimmedAlias = alias.trim();
    if (!trimmedAlias) {
      setError(t('settings.domainGroups.emptyAliasError'));
      return;
    }

    const newAliases = { ...aliases, [tempDomain]: trimmedAlias };
    onAliasesChange(newAliases);
    setCreateDialogOpen(false);
    setError(null);
  }, [aliases, tempDomain, onAliasesChange, t]);
  
  // ラッパー：CreateDialogのConfirm
  const handleCreateConfirm = useCallback((value: string) => {
    if (step === 'domain') {
      handleDomainInput(value);
    } else {
      handleAliasInput(value);
    }
  }, [step, handleDomainInput, handleAliasInput]);

  // 編集開始
  const openEditDialog = useCallback((domain: string) => {
    setSelectedDomain(domain);
    setError(null);
    setEditDialogOpen(true);
  }, []);

  // 編集完了
  const handleEditConfirm = useCallback((newAlias: string) => {
    if (!selectedDomain) return;
    
    const trimmedAlias = newAlias.trim();
    if (!trimmedAlias) {
      setError(t('settings.domainGroups.emptyAliasError'));
      return;
    }

    const newAliases = { ...aliases, [selectedDomain]: trimmedAlias };
    onAliasesChange(newAliases);
    setEditDialogOpen(false);
    setSelectedDomain(null);
    setError(null);
  }, [selectedDomain, aliases, onAliasesChange, t]);

  // 削除開始
  const openDeleteDialog = useCallback((domain: string) => {
    setSelectedDomain(domain);
    setDeleteDialogOpen(true);
  }, []);

  // 削除完了
  const handleDeleteConfirm = useCallback(() => {
    if (!selectedDomain) return;

    const rest = { ...aliases };
    delete rest[selectedDomain];
    onAliasesChange(rest);
    setDeleteDialogOpen(false);
    setSelectedDomain(null);
  }, [selectedDomain, aliases, onAliasesChange]);

  return (
    <div className="domain-groups-settings">
      {/* エイリアス一覧 */}
      {aliasEntries.length === 0 ? (
        <p className="empty-message">{t('settings.domainGroups.empty')}</p>
      ) : (
        <ul className="custom-groups-list"> {/* スタイルはcustom-groups-listを流用 */}
          {aliasEntries.map(([domain, alias]) => (
            <li key={domain} className="custom-group-item">
              <div className="custom-group-info">
                <span className="custom-group-icon">
                  <Tag size={16} />
                </span>
                <span className="custom-group-name" style={{ fontWeight: 'normal' }}>
                  {domain}
                </span>
                <span className="custom-group-arrow">→</span>
                <span className="custom-group-name">
                  {alias}
                </span>
              </div>
              <div className="custom-group-actions">
                <button
                  type="button"
                  className="btn btn-icon"
                  onClick={() => openEditDialog(domain)}
                  title={t('settings.domainGroups.editAlias')}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  className="btn btn-icon btn-danger-icon"
                  onClick={() => openDeleteDialog(domain)}
                  title={t('settings.domainGroups.deleteAlias')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 新規追加ボタン */}
      <button
        type="button"
        className="btn btn-primary add-group-button"
        onClick={handleStartCreate}
      >
        <Plus size={16} />
        <span>{t('settings.domainGroups.addAlias')}</span>
      </button>

      {/* 新規作成ダイアログ */}
      <PromptDialog
        isOpen={createDialogOpen}
        key={`create-dialog-${step}`} // stepが変わったら再描画してtitle等を更新
        title={step === 'domain' ? t('settings.domainGroups.createDialogTitle') : t('settings.domainGroups.aliasPlaceholder')}
        message={step === 'domain' ? t('settings.domainGroups.domainPlaceholder') : `${t('settings.domainGroups.domainPlaceholder')}: ${tempDomain}`}
        defaultValue=""
        error={error}
        onConfirm={handleCreateConfirm}
        onCancel={() => {
          setCreateDialogOpen(false);
          setError(null);
        }}
      />

      {/* 編集ダイアログ */}
      <PromptDialog
        isOpen={editDialogOpen}
        title={t('settings.domainGroups.renameDialogTitle')}
        message={`${t('settings.domainGroups.domainPlaceholder')}: ${selectedDomain}`}
        defaultValue={selectedDomain ? aliases[selectedDomain] : ''}
        error={error}
        onConfirm={handleEditConfirm}
        onCancel={() => {
          setEditDialogOpen(false);
          setSelectedDomain(null);
          setError(null);
        }}
      />

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title={t('settings.domainGroups.deleteConfirmTitle')}
        message={t('settings.domainGroups.deleteConfirmMessage', { domain: selectedDomain || '' })}
        confirmButtonText={t('common.delete')}
        confirmButtonStyle="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedDomain(null);
        }}
      />
    </div>
  );
}
