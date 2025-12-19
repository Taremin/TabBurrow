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
  // 表示密度
  isCompact?: boolean;
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
  isCompact = false,
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
  const [compactPopupUrl, setCompactPopupUrl] = useState<string | null>(null);
  
  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    // デバッグログ
    console.log('[TabCard] handleMouseEnter called', {
      isCompact,
      screenshotUrl,
      hasScreenshot: !!tab.screenshot,
      screenshotSize: tab.screenshot?.size,
    });
    
    // screenshotUrlがあればそれを使用、なければtab.screenshotから生成
    let urlToUse = screenshotUrl;
    
    if (!urlToUse && tab.screenshot && tab.screenshot.size > 0) {
      // コンパクト表示時: ホバー時にURLを即時生成
      console.log('[TabCard] Creating compact popup URL from tab.screenshot');
      urlToUse = URL.createObjectURL(tab.screenshot);
      setCompactPopupUrl(urlToUse);
    }
    
    if (!urlToUse) {
      console.log('[TabCard] No URL to use, returning early');
      return;
    }
    
    const popupWidth = 400;
    const popupHeight = 300;
    let left: number;
    let top: number;
    
    if (isCompact) {
      // コンパクト表示時: マウスカーソルの右下に表示
      left = e.clientX + 16;
      top = e.clientY + 16;
    } else {
      // 通常表示時: 要素の右側に表示
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      left = rect.right + 12;
      top = rect.top;
    }
    
    // 右側に収まらない場合は左側に表示
    if (left + popupWidth > window.innerWidth) {
      left = isCompact ? e.clientX - popupWidth - 16 : left - popupWidth - 24;
    }
    // 左側にも収まらない場合は画面左端に配置
    if (left < 12) {
      left = 12;
    }
    if (top + popupHeight > window.innerHeight) {
      top = window.innerHeight - popupHeight - 12;
    }
    if (top < 12) {
      top = 12;
    }
    
    console.log('[TabCard] Setting popup visible', { urlToUse, left, top });
    setPopupPosition({ left, top });
    setShowPopup(true);
  }, [isCompact, screenshotUrl, tab.screenshot]);

  // コンパクト表示時: マウス移動でポップアップがついてくる
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isCompact || !showPopup) return;
    
    const popupWidth = 400;
    const popupHeight = 300;
    let left = e.clientX + 16;
    let top = e.clientY + 16;
    
    // 右側に収まらない場合は左側に表示
    if (left + popupWidth > window.innerWidth) {
      left = e.clientX - popupWidth - 16;
    }
    // 左側にも収まらない場合は画面左端に配置
    if (left < 12) {
      left = 12;
    }
    if (top + popupHeight > window.innerHeight) {
      top = window.innerHeight - popupHeight - 12;
    }
    if (top < 12) {
      top = 12;
    }
    
    setPopupPosition({ left, top });
  }, [isCompact, showPopup]);

  const handleMouseLeave = useCallback(() => {
    setShowPopup(false);
    // コンパクト表示用に生成したURLがあれば解放
    if (compactPopupUrl) {
      URL.revokeObjectURL(compactPopupUrl);
      setCompactPopupUrl(null);
    }
  }, [compactPopupUrl]);

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
        className={`tab-card ${isRemoving ? 'removing' : ''} ${isSelected ? 'selected' : ''} ${isCompact ? 'tab-card-compact' : ''}`}
        onClick={handleClick}
        onMouseEnter={isCompact ? handleMouseEnter : undefined}
        onMouseMove={isCompact ? handleMouseMove : undefined}
        onMouseLeave={isCompact ? handleMouseLeave : undefined}
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
        {/* 通常表示時のスクリーンショット */}
        {!isCompact && (
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
        )}
        {/* コンパクト表示時: スクリーンショットインジケータ（imageRefは使用しない） */}
        {isCompact && tab.screenshot && tab.screenshot.size > 0 && (
          <div className="tab-screenshot-indicator">📷</div>
        )}
        <div className={`tab-info ${isCompact ? 'tab-info-compact' : ''}`}>
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
          {/* コンパクト表示時: URLを省略表示 */}
          <div className={`tab-url ${isCompact ? 'tab-url-compact' : ''}`}>{tab.url}</div>
          {/* メタ情報（時刻） */}
          {isCompact ? (
            <div className="tab-meta tab-meta-compact">
              <span>📅 {formatDateTime(tab.lastAccessed)}</span>
              <span>💾 {formatDateTime(tab.savedAt)}</span>
            </div>
          ) : (
            <div className="tab-meta">
              <span>{t('tabManager.tabCard.lastAccessed', { datetime: formatDateTime(tab.lastAccessed) })}</span>
              <span>{t('tabManager.tabCard.saved', { datetime: formatDateTime(tab.savedAt) })}</span>
            </div>
          )}
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
      {showPopup && (screenshotUrl || compactPopupUrl) && (
        <div 
          className="screenshot-popup"
          style={{
            display: 'block',
            left: popupPosition.left,
            top: popupPosition.top,
          }}
        >
          <img src={screenshotUrl || compactPopupUrl || ''} alt="Screenshot" />
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
