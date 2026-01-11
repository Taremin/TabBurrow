/**
 * TabBurrow - ゴミ箱ダイアログ
 * 削除されたタブの一覧表示、復元、完全削除を行う
 */

import { useState, useCallback, useEffect } from 'react';
import browser from '../browserApi';
import { useTranslation } from '../common/i18nContext';
import { DialogOverlay } from '../common/DialogOverlay';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { TrashedTab } from '../storage';
import {
  getTrashedTabs,
  restoreTabFromTrash,
  restoreTabsFromTrash,
  deleteFromTrash,
  emptyTrash,
  getTrashCount,
} from '../storage';
import { Trash2, RotateCcw, XCircle, Search } from 'lucide-react';

interface TrashDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTrashChanged?: () => void;
}

export function TrashDialog({ isOpen, onClose, onTrashChanged }: TrashDialogProps) {
  const { t } = useTranslation();
  const [trashedTabs, setTrashedTabs] = useState<TrashedTab[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);

  // ゴミ箱の内容を読み込み
  const loadTrash = useCallback(async () => {
    setIsLoading(true);
    try {
      const tabs = await getTrashedTabs();
      setTrashedTabs(tabs);
    } catch (error) {
      console.error('ゴミ箱の読み込みに失敗:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadTrash();
      setSelectedIds(new Set());
      setSearchQuery('');
    }
  }, [isOpen, loadTrash]);

  // 検索フィルタ
  const filteredTabs = trashedTabs.filter(tab => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      tab.title.toLowerCase().includes(query) ||
      tab.url.toLowerCase().includes(query) ||
      tab.domain.toLowerCase().includes(query)
    );
  });

  // 削除日時の表示
  const formatDeletedAt = (trashedAt: number): string => {
    const now = Date.now();
    const diff = now - trashedAt;
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    
    if (days === 0) {
      return t('tabManager.trash.deletedToday');
    }
    return t('tabManager.trash.deletedAt', { days });
  };

  // 選択トグル
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 全選択/全解除
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTabs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTabs.map(tab => tab.id)));
    }
  };

  // 単一復元
  const handleRestore = async (id: string) => {
    await restoreTabFromTrash(id);
    await loadTrash();
    onTrashChanged?.();
  };

  // 選択復元
  const handleRestoreSelected = async () => {
    if (selectedIds.size === 0) return;
    await restoreTabsFromTrash(Array.from(selectedIds));
    await loadTrash();
    setSelectedIds(new Set());
    onTrashChanged?.();
  };

  // 全復元
  const handleRestoreAll = async () => {
    const ids = filteredTabs.map(tab => tab.id);
    await restoreTabsFromTrash(ids);
    await loadTrash();
    setSelectedIds(new Set());
    onTrashChanged?.();
  };

  // 単一完全削除
  const handleDeletePermanently = async (id: string) => {
    await deleteFromTrash(id);
    await loadTrash();
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  // ゴミ箱を空にする
  const handleEmptyTrash = async () => {
    await emptyTrash();
    await loadTrash();
    setSelectedIds(new Set());
    setShowEmptyConfirm(false);
    onTrashChanged?.();
  };

  if (!isOpen) return null;

  return (
    <>
      <DialogOverlay isOpen={isOpen} onClose={onClose}>
        <div 
          className="dialog trash-dialog" 
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-labelledby="trash-dialog-title"
        >
          <div className="dialog-header">
            <h2 id="trash-dialog-title" className="dialog-title">
              <Trash2 size={20} />
              {t('tabManager.trash.title')}
              {trashedTabs.length > 0 && (
                <span className="trash-count">({trashedTabs.length})</span>
              )}
            </h2>
            <button
              className="dialog-close-button"
              onClick={onClose}
              aria-label={t('common.close')}
            >
              ×
            </button>
          </div>

          {/* 検索バー */}
          <div className="trash-search">
            <Search size={16} />
            <input
              type="text"
              placeholder={t('tabManager.trash.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="trash-search-input"
            />
          </div>

          {/* アクションバー */}
          {trashedTabs.length > 0 && (
            <div className="trash-actions">
              <label className="trash-select-all">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredTabs.length && filteredTabs.length > 0}
                  onChange={toggleSelectAll}
                />
                <span>
                  {selectedIds.size > 0
                    ? `${selectedIds.size}件選択中`
                    : '全選択'}
                </span>
              </label>
              <div className="trash-action-buttons">
                {selectedIds.size > 0 ? (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleRestoreSelected}
                  >
                    <RotateCcw size={14} />
                    {t('tabManager.trash.restoreSelected')}
                  </button>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleRestoreAll}
                    disabled={filteredTabs.length === 0}
                  >
                    <RotateCcw size={14} />
                    {t('tabManager.trash.restoreAll')}
                  </button>
                )}
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => setShowEmptyConfirm(true)}
                >
                  <XCircle size={14} />
                  {t('tabManager.trash.emptyTrash')}
                </button>
              </div>
            </div>
          )}

          {/* タブ一覧 */}
          <div className="trash-list">
            {isLoading ? (
              <div className="trash-loading">Loading...</div>
            ) : filteredTabs.length === 0 ? (
              <div className="trash-empty">
                <Trash2 size={48} opacity={0.3} />
                <p>{t('tabManager.trash.empty')}</p>
              </div>
            ) : (
              filteredTabs.map(tab => (
                <div
                  key={tab.id}
                  className={`trash-item ${selectedIds.has(tab.id) ? 'selected' : ''}`}
                >
                  <label className="trash-item-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tab.id)}
                      onChange={() => toggleSelection(tab.id)}
                    />
                  </label>
                  <img
                    src={tab.favIconUrl || '/icons/icon-32.png'}
                    alt=""
                    className="trash-item-favicon"
                    onError={e => {
                      (e.target as HTMLImageElement).src = '/icons/icon-32.png';
                    }}
                  />
                  <div className="trash-item-content">
                    <div className="trash-item-title" title={tab.title}>
                      {tab.displayName || tab.title}
                    </div>
                    <div className="trash-item-meta">
                      <span className="trash-item-domain">{tab.domain}</span>
                      <span className="trash-item-date">
                        {formatDeletedAt(tab.trashedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="trash-item-actions">
                    <button
                      className="btn-icon"
                      onClick={() => handleRestore(tab.id)}
                      title={t('tabManager.trash.restore')}
                      aria-label={t('tabManager.trash.restore')}
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button
                      className="btn-icon btn-icon-danger"
                      onClick={() => handleDeletePermanently(tab.id)}
                      title={t('tabManager.trash.deletePermanently')}
                      aria-label={t('tabManager.trash.deletePermanently')}
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogOverlay>

      {/* ゴミ箱を空にする確認ダイアログ */}
      <ConfirmDialog
        isOpen={showEmptyConfirm}
        title={t('tabManager.trash.emptyTrash')}
        message={t('tabManager.trash.emptyTrashConfirm')}
        confirmButtonText={t('tabManager.trash.emptyTrash')}
        confirmButtonStyle="danger"
        onConfirm={handleEmptyTrash}
        onCancel={() => setShowEmptyConfirm(false)}
      />
    </>
  );
}

// ゴミ箱タブ数を取得するフック
export function useTrashCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const c = await getTrashCount();
      setCount(c);
    } catch (error) {
      console.error('ゴミ箱カウント取得に失敗:', error);
    }
  }, []);

  useEffect(() => {
    refresh();

    // ゴミ箱変更メッセージをリッスン
    const listener = (message: unknown) => {
      const msg = message as { type?: string };
      if (msg.type === 'trash-changed' || msg.type === 'tabs-changed') {
        refresh();
      }
    };

    // ブラウザ拡張のメッセージリスナー
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, [refresh]);

  return { count, refresh };
}
