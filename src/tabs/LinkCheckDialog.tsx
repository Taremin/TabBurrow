/**
 * TabBurrow - リンクチェックダイアログコンポーネント
 * 進捗表示と結果操作のUIを提供
 */

import React, { useState, useEffect, useCallback } from 'react';
import browser from '../browserApi.js';
import { t } from '../i18n.js';
import type { LinkCheckAction } from '../settings.js';
import { deleteMultipleTabs, assignMultipleTabsToGroup, getAllCustomGroups } from '../storage.js';
import type { CustomGroupMeta } from '../dbSchema.js';

// ======================
// 型定義
// ======================

/** リンクチェック進捗 */
interface LinkCheckProgress {
  total: number;
  checked: number;
  alive: number;
  dead: number;
  warning: number;
}

/** リンクチェック結果 */
interface LinkCheckResult {
  tabId: string;
  url: string;
  title: string;
  domain: string;
  statusCode: number | null;
  error?: string;
  action: LinkCheckAction;
}

/** フィルタータイプ */
type FilterType = 'all' | 'dead' | 'warning';

/** コンポーネントProps */
interface LinkCheckDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTabsDeleted: () => void; // タブ削除後にリストを更新するコールバック
}

// ======================
// コンポーネント
// ======================

export function LinkCheckDialog({ isOpen, onClose, onTabsDeleted }: LinkCheckDialogProps) {
  // 状態
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState<LinkCheckProgress>({
    total: 0,
    checked: 0,
    alive: 0,
    dead: 0,
    warning: 0,
  });
  const [results, setResults] = useState<LinkCheckResult[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [customGroups, setCustomGroups] = useState<CustomGroupMeta[]>([]);
  const [showGroupMenu, setShowGroupMenu] = useState(false);

  // カスタムグループを読み込み
  useEffect(() => {
    if (isOpen) {
      getAllCustomGroups().then(setCustomGroups).catch(console.error);
    }
  }, [isOpen]);

  // メッセージリスナーを設定
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (message: { type: string; progress?: LinkCheckProgress; results?: LinkCheckResult[]; error?: string }) => {
      switch (message.type) {
        case 'link-check-progress':
          if (message.progress) {
            setProgress(message.progress);
          }
          break;

        case 'link-check-complete':
          setIsRunning(false);
          setIsComplete(true);
          if (message.results) {
            setResults(message.results);
          }
          break;

        case 'link-check-error':
          setIsRunning(false);
          setError(message.error || 'Unknown error');
          break;
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, [isOpen]);

  // リンクチェックを開始
  const startCheck = useCallback(async () => {
    setIsRunning(true);
    setIsComplete(false);
    setResults([]);
    setSelectedIds(new Set());
    setError(null);
    setProgress({ total: 0, checked: 0, alive: 0, dead: 0, warning: 0 });

    try {
      await browser.runtime.sendMessage({
        type: 'link-check-start',
        tabIds: [],
      });
    } catch (err) {
      setError(String(err));
      setIsRunning(false);
    }
  }, []);

  // ダイアログが開いたときに自動開始
  useEffect(() => {
    if (isOpen && !isRunning && !isComplete && results.length === 0) {
      startCheck();
    }
  }, [isOpen, isRunning, isComplete, results.length, startCheck]);

  // キャンセル
  const handleCancel = useCallback(async () => {
    try {
      await browser.runtime.sendMessage({ type: 'link-check-cancel' });
    } catch (err) {
      console.error('Failed to cancel:', err);
    }
    setIsRunning(false);
  }, []);

  // 閉じる
  const handleClose = useCallback(() => {
    if (isRunning) {
      handleCancel();
    }
    onClose();
    // 状態をリセット
    setIsRunning(false);
    setIsComplete(false);
    setResults([]);
    setSelectedIds(new Set());
    setError(null);
    setProgress({ total: 0, checked: 0, alive: 0, dead: 0, warning: 0 });
  }, [isRunning, handleCancel, onClose]);

  // フィルタリングされた結果
  const filteredResults = results.filter(result => {
    switch (filter) {
      case 'dead':
        return result.action === 'dead';
      case 'warning':
        return result.action === 'warning';
      default:
        return true;
    }
  });

  // 全選択/全解除
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResults.map(r => r.tabId)));
    }
  }, [filteredResults, selectedIds]);

  // 個別選択
  const toggleSelection = useCallback((tabId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(tabId)) {
        next.delete(tabId);
      } else {
        next.add(tabId);
      }
      return next;
    });
  }, []);

  // 選択を削除
  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    
    const confirmed = window.confirm(
      t('linkCheck.confirmDeleteMessage', { count: selectedIds.size.toString() })
    );
    if (!confirmed) return;

    try {
      await deleteMultipleTabs(Array.from(selectedIds));
      // 結果から削除したタブを除外
      setResults(prev => prev.filter(r => !selectedIds.has(r.tabId)));
      setSelectedIds(new Set());
      onTabsDeleted();
    } catch (err) {
      console.error('Failed to delete tabs:', err);
    }
  }, [selectedIds, onTabsDeleted]);

  // グループに移動
  const handleMoveToGroup = useCallback(async (groupName: string) => {
    if (selectedIds.size === 0) return;

    try {
      await assignMultipleTabsToGroup(Array.from(selectedIds), groupName);
      setShowGroupMenu(false);
      onTabsDeleted(); // リストを更新
    } catch (err) {
      console.error('Failed to move tabs:', err);
    }
  }, [selectedIds, onTabsDeleted]);

  // 新規グループ作成
  const handleCreateNewGroup = useCallback(async () => {
    const name = window.prompt(t('tabManager.customGroup.renameDialogTitle'));
    if (!name || !name.trim()) return;
    
    await handleMoveToGroup(name.trim());
  }, [handleMoveToGroup]);

  // ダイアログが閉じている場合は何も表示しない
  if (!isOpen) return null;

  // 進捗率
  const progressPercent = progress.total > 0 
    ? Math.round((progress.checked / progress.total) * 100) 
    : 0;

  // ステータスコード表示
  const getStatusDisplay = (result: LinkCheckResult): string => {
    if (result.error) {
      return result.error === 'timeout' 
        ? t('linkCheck.timeout')
        : result.error === 'network-error'
          ? t('linkCheck.networkError')
          : result.error;
    }
    return result.statusCode?.toString() || '-';
  };

  // アクションのアイコン
  const getActionIcon = (action: LinkCheckAction): string => {
    switch (action) {
      case 'alive': return '✅';
      case 'dead': return '❌';
      case 'warning': return '⚠️';
      default: return '➖';
    }
  };

  return (
    <div className="link-check-overlay" onClick={handleClose}>
      <div className="link-check-dialog" onClick={e => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="link-check-header">
          <h2>{t('linkCheck.title')}</h2>
          <button className="link-check-close" onClick={handleClose}>×</button>
        </div>

        {/* 進捗セクション */}
        <div className="link-check-progress-section">
          <div className="link-check-progress-bar">
            <div 
              className="link-check-progress-fill" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="link-check-progress-text">
            {isRunning ? t('linkCheck.checking') : t('linkCheck.complete')}
            {' '}
            {progress.checked}/{progress.total} ({progressPercent}%)
          </div>
          <div className="link-check-stats">
            <span className="stat-alive">✅ {t('linkCheck.alive')}: {progress.alive}</span>
            <span className="stat-warning">⚠️ {t('linkCheck.warning')}: {progress.warning}</span>
            <span className="stat-dead">❌ {t('linkCheck.dead')}: {progress.dead}</span>
            <span className="stat-remaining">⏳ {t('linkCheck.remaining')}: {progress.total - progress.checked}</span>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="link-check-error">
            {error}
          </div>
        )}

        {/* フィルターセクション */}
        <div className="link-check-filter">
          <select value={filter} onChange={e => setFilter(e.target.value as FilterType)}>
            <option value="all">{t('linkCheck.filterAll')}</option>
            <option value="dead">{t('linkCheck.filterDead')}</option>
            <option value="warning">{t('linkCheck.filterWarning')}</option>
          </select>
        </div>

        {/* 結果リスト */}
        <div className="link-check-results">
          {filteredResults.length === 0 && isComplete && (
            <div className="link-check-no-results">
              {filter === 'all' 
                ? t('linkCheck.noTabs')
                : t('tabManager.noResults.message')}
            </div>
          )}
          {filteredResults.map(result => (
            <div 
              key={result.tabId} 
              className={`link-check-result-item ${selectedIds.has(result.tabId) ? 'selected' : ''}`}
              onClick={() => toggleSelection(result.tabId)}
            >
              <input 
                type="checkbox" 
                checked={selectedIds.has(result.tabId)}
                onChange={() => toggleSelection(result.tabId)}
              />
              <span className="result-icon">{getActionIcon(result.action)}</span>
              <div className="result-info">
                <div className="result-title" title={result.title}>{result.title}</div>
                <div className="result-url" title={result.url}>{result.url}</div>
              </div>
              <div className="result-status">
                {getStatusDisplay(result)}
              </div>
            </div>
          ))}
        </div>

        {/* 選択情報 */}
        <div className="link-check-selection-info">
          {selectedIds.size > 0 && (
            <span>{t('tabManager.selection.selectedCount', { count: selectedIds.size.toString() })}</span>
          )}
        </div>

        {/* アクションボタン */}
        <div className="link-check-actions">
          <button 
            className="btn-select-all"
            onClick={handleSelectAll}
            disabled={filteredResults.length === 0}
          >
            {selectedIds.size === filteredResults.length && filteredResults.length > 0
              ? t('linkCheck.deselectAll')
              : t('linkCheck.selectAll')}
          </button>
          
          <button 
            className="btn-delete"
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0}
          >
            {t('linkCheck.deleteSelected')}
          </button>
          
          <div className="group-menu-container">
            <button 
              className="btn-move"
              onClick={() => setShowGroupMenu(!showGroupMenu)}
              disabled={selectedIds.size === 0}
            >
              {t('linkCheck.moveToGroup')} ▼
            </button>
            {showGroupMenu && (
              <div className="group-menu">
                <button onClick={handleCreateNewGroup}>
                  {t('contextMenu.newGroup')}
                </button>
                {customGroups.map(group => (
                  <button key={group.name} onClick={() => handleMoveToGroup(group.name)}>
                    {group.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isRunning ? (
            <button className="btn-cancel" onClick={handleCancel}>
              {t('linkCheck.cancel')}
            </button>
          ) : (
            <button className="btn-close" onClick={handleClose}>
              {t('linkCheck.close')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
