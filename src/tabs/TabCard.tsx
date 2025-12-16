/**
 * TabBurrow - タブカードコンポーネント
 * 個別タブの表示・操作を担当
 */

import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import type { SavedTab, CustomGroupMeta } from './types';
import { formatDateTime } from './utils';
import { useImageLoader } from './hooks/useImageLoader';
import { useTranslation } from '../common/i18nContext.js';

interface TabCardProps {
  tab: SavedTab;
  customGroups: CustomGroupMeta[];
  onDelete: (id: string) => void;
  onOpen: (url: string) => void;
  onMoveToGroup: (tabId: string, groupName: string) => void;
  onRemoveFromGroup: (tabId: string) => void;
  // 選択モード関連
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
}

/**
 * タブカードコンポーネント
 * - スクリーンショットの遅延読み込み/解放
 * - ホバー時のスクリーンショットポップアップ
 * - カスタムグループへの移動/解除
 * - 選択モード対応
 */
export const TabCard = memo(function TabCard({ 
  tab, 
  customGroups,
  onDelete, 
  onOpen,
  onMoveToGroup,
  onRemoveFromGroup,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection,
}: TabCardProps) {
  const { t } = useTranslation();
  const [isRemoving, setIsRemoving] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ left: 0, top: 0 });
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 画像の遅延読み込み/解放
  const { url: screenshotUrl, ref: imageRef } = useImageLoader(tab.screenshot, {
    rootMargin: '200px', // 200px手前から読み込み開始
  });

  const isInCustomGroup = tab.groupType === 'custom';

  // タブを開くまたは選択をトグル
  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.tab-delete') || target.closest('.tab-group-action') || target.closest('.tab-checkbox')) return;
    
    if (isSelectionMode && onToggleSelection) {
      onToggleSelection(tab.id);
    } else {
      onOpen(tab.url);
    }
  }, [onOpen, tab.url, tab.id, isSelectionMode, onToggleSelection]);

  // チェックボックスのトグル
  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSelection) {
      onToggleSelection(tab.id);
    }
  }, [onToggleSelection, tab.id]);

  // 削除
  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRemoving(true);
    await new Promise(resolve => setTimeout(resolve, 200));
    onDelete(tab.id);
  }, [onDelete, tab.id]);

  // グループメニュートグル
  const handleToggleGroupMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showGroupMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        left: rect.right - 180, // メニュー幅を考慮して右寄せ
        top: rect.bottom + 4,
      });
    }
    setShowGroupMenu(prev => !prev);
  }, [showGroupMenu]);

  // グループに移動
  const handleMoveToGroup = useCallback((groupName: string) => {
    onMoveToGroup(tab.id, groupName);
    setShowGroupMenu(false);
  }, [onMoveToGroup, tab.id]);

  // グループから削除
  const handleRemoveFromGroup = useCallback(() => {
    onRemoveFromGroup(tab.id);
    setShowGroupMenu(false);
  }, [onRemoveFromGroup, tab.id]);

  // スクリーンショットホバー
  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (!screenshotUrl) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const popupWidth = 400;
    const popupHeight = 300;
    
    let left = rect.right + 12;
    let top = rect.top;
    
    if (left + popupWidth > window.innerWidth) {
      left = rect.left - popupWidth - 12;
    }
    if (top + popupHeight > window.innerHeight) {
      top = window.innerHeight - popupHeight - 12;
    }
    if (top < 12) {
      top = 12;
    }
    
    setPopupPosition({ left, top });
    setShowPopup(true);
  }, [screenshotUrl]);

  const handleMouseLeave = useCallback(() => {
    setShowPopup(false);
  }, []);

  // 外部クリックでメニューを閉じる
  useEffect(() => {
    if (!showGroupMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setShowGroupMenu(false);
      }
    };

    // 次のフレームで登録
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleClickOutside);
    });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showGroupMenu]);

  // スクロール時にメニューを閉じる
  useEffect(() => {
    if (!showGroupMenu) return;

    const handleScroll = () => {
      setShowGroupMenu(false);
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [showGroupMenu]);

  return (
    <>
      <div 
        className={`tab-card ${isRemoving ? 'removing' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
      >
        {/* 選択モード時のチェックボックス */}
        {isSelectionMode && (
          <div className="tab-checkbox" onClick={handleCheckboxClick}>
            <input 
              type="checkbox" 
              checked={isSelected} 
              onChange={() => {}} 
              tabIndex={-1}
            />
          </div>
        )}
        <div 
          className="tab-screenshot"
          ref={imageRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {screenshotUrl ? (
            <img src={screenshotUrl} alt="Screenshot" />
          ) : (
            <div className="tab-screenshot-placeholder">🌐</div>
          )}
        </div>
        <div className="tab-info">
          <div className="tab-title">
            {tab.favIconUrl && (
              <img 
                src={tab.favIconUrl} 
                alt="" 
                className="tab-favicon"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}
            <span>{tab.title}</span>
          </div>
          <div className="tab-url">{tab.url}</div>
          <div className="tab-meta">
            <span>{t('tabManager.tabCard.lastAccessed', { datetime: formatDateTime(tab.lastAccessed) })}</span>
            <span>{t('tabManager.tabCard.saved', { datetime: formatDateTime(tab.savedAt) })}</span>
          </div>
        </div>
        <div className="tab-actions">
          {/* グループ操作ボタン */}
          <button 
            ref={buttonRef}
            className="tab-group-action" 
            title={isInCustomGroup ? t('tabManager.tabCard.removeFromGroup') : t('tabManager.tabCard.moveToGroup')}
            onClick={handleToggleGroupMenu}
          >
            📁
          </button>
          <button 
            className="tab-delete" 
            title={t('tabManager.tabCard.deleteButton')}
            onClick={handleDelete}
          >
            🗑️
          </button>
        </div>
      </div>

      {/* スクリーンショットポップアップ */}
      {showPopup && screenshotUrl && (
        <div 
          className="screenshot-popup"
          style={{
            display: 'block',
            left: popupPosition.left,
            top: popupPosition.top,
          }}
        >
          <img src={screenshotUrl} alt="Screenshot" />
        </div>
      )}

      {/* グループメニュー（ポータルで描画） */}
      {showGroupMenu && createPortal(
        <div 
          ref={menuRef}
          className="group-menu-portal"
          style={{
            position: 'fixed',
            left: menuPosition.left,
            top: menuPosition.top,
            zIndex: 1000,
          }}
        >
          {isInCustomGroup && (
            <button 
              className="group-menu-item remove-from-group"
              onClick={handleRemoveFromGroup}
            >
              {t('tabManager.tabCard.removeFromGroup')}
            </button>
          )}
          {customGroups.length > 0 && (
            <>
              <div className="group-menu-label">{t('tabManager.tabCard.moveToGroup')}</div>
              {customGroups.map(group => (
                <button 
                  key={group.name}
                  className="group-menu-item"
                  onClick={() => handleMoveToGroup(group.name)}
                  disabled={isInCustomGroup && tab.group === group.name}
                >
                  {group.name}
                </button>
              ))}
            </>
          )}
          {customGroups.length === 0 && !isInCustomGroup && (
            <div className="group-menu-empty">グループなし</div>
          )}
        </div>,
        document.body
      )}
    </>
  );
});
