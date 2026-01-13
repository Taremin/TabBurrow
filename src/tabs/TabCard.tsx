/**
 * TabBurrow - タブカードコンポーネント
 * 個別タブの表示・操作を担当
 */

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { SavedTab, CustomGroupMeta } from './types';
import { formatDateTime } from './utils';
import { useImageLoader } from './hooks/useImageLoader';
import { useTranslation } from '../common/i18nContext';
import { useClickOutside } from '../common/hooks/useClickOutside';
import { ScreenshotPopup } from './ScreenshotPopup';
import { Globe, Camera, Pencil, Folder, Trash2, Calendar, Save, Tag, Check, X, ArrowUpDown } from 'lucide-react';

interface TabCardProps {
  tab: SavedTab;
  customGroups: CustomGroupMeta[];
  onDelete: (id: string) => void | Promise<void>;
  onOpen: (url: string) => void;
  onMiddleClick?: (url: string) => void; // ホイールクリック（中クリック）
  onMoveToGroup: (tabId: string, groupName: string) => void;
  onRemoveFromGroup: (tabId: string, groupName?: string) => void;
  onRequestMoveToNewGroup: (tabId: string) => void; // 新規グループ作成して移動
  onEditTab?: (id: string) => void; // タブの編集（表示名・ソートキー）
  // コンテキスト情報
  currentGroupName?: string;
  currentGroupType?: 'domain' | 'custom';
  // 表示密度
  isCompact?: boolean;
  // 選択モード関連
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  // グループタグ表示用
  onNavigateToGroup?: (groupName: string) => void;
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
  onMiddleClick,
  onMoveToGroup,
  onRemoveFromGroup,
  onRequestMoveToNewGroup,
  onEditTab,
  currentGroupName,
  currentGroupType,
  isCompact = false,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection,
  onNavigateToGroup,
}: TabCardProps) {
  const { t } = useTranslation();
  const [isRemoving, setIsRemoving] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [deleteMenuPosition, setDeleteMenuPosition] = useState({ left: 0, top: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const deleteMenuRef = useRef<HTMLDivElement>(null);

  // 画像の遅延読み込み/解放
  const { url: screenshotUrl, ref: imageRef } = useImageLoader(tab.screenshot, {
    rootMargin: '200px', // 200px手前から読み込み開始
  });


  // 表示するグループタグを計算（現在表示中のグループ以外）
  const otherGroups = (tab.customGroups || []).filter(g => g !== currentGroupName);
  const showGroupTags = currentGroupType === 'domain' 
    ? (tab.customGroups?.length || 0) > 0  // ドメイングループ内: 所属カスタムグループを全て表示
    : otherGroups.length > 0;  // カスタムグループ内: 他の所属グループのみ表示
  const groupsToShow = currentGroupType === 'domain' ? (tab.customGroups || []) : otherGroups;

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

  // ホイールクリック（中クリック）でタブを開く（画面は維持）
  const handleAuxClick = useCallback((e: React.MouseEvent) => {
    // button === 1 はホイールクリック（中クリック）
    if (e.button !== 1) return;
    
    const target = e.target as HTMLElement;
    if (target.closest('.tab-delete') || target.closest('.tab-group-action') || target.closest('.tab-checkbox')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    if (onMiddleClick) {
      onMiddleClick(tab.url);
    }
  }, [onMiddleClick, tab.url]);

  // 中クリック時のブラウザデフォルト動作（自動スクロール）を防止
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // button === 1 はホイールクリック（中クリック）
    if (e.button === 1) {
      e.preventDefault(); // 自動スクロールモードを無効化
    }
  }, []);

  // チェックボックスのトグル
  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSelection) {
      onToggleSelection(tab.id);
    }
  }, [onToggleSelection, tab.id]);

  // 実際の削除処理
  const handleConfirmDelete = useCallback(async () => {
    setIsRemoving(true);
    await new Promise(resolve => setTimeout(resolve, 200));
    await onDelete(tab.id);
    setShowDeleteMenu(false);
  }, [onDelete, tab.id]);

  // 削除ボタンクリック時の振る舞い
  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentGroupType === 'custom' && deleteButtonRef.current) {
      // カスタムグループ内の場合はメニューを表示
      const rect = deleteButtonRef.current.getBoundingClientRect();
      setDeleteMenuPosition({
        left: rect.right - 180,
        top: rect.bottom + 4,
      });
      setShowDeleteMenu(prev => !prev);
    } else {
      // それ以外は直接削除
      handleConfirmDelete();
    }
  }, [currentGroupType, handleConfirmDelete]);

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


  // スクリーンショットホバー
  const [compactPopupUrl, setCompactPopupUrl] = useState<string | null>(null);
  // マウス位置を保持（ポップアップ位置計算用）
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
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
    
    // コンパクトモードの場合、スクリーンショットがなくてもタイトル・URLを表示するためポップアップを出す
    if (!urlToUse && !isCompact) {
      console.log('[TabCard] No URL to use and not compact mode, returning early');
      return;
    }
    
    // マウス位置を保存
    setMousePos({ x: e.clientX, y: e.clientY });
    
    // 通常表示時はアンカー要素の位置を保存
    if (!isCompact) {
      setAnchorRect((e.currentTarget as HTMLElement).getBoundingClientRect());
    }
    
    setShowPopup(true);
    console.log('[TabCard] Setting popup visible', { urlToUse });
  }, [isCompact, screenshotUrl, tab.screenshot]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isCompact || !showPopup) return;
    setMousePos({ x: e.clientX, y: e.clientY });
  }, [isCompact, showPopup]);

  const handleMouseLeave = useCallback(() => {
    setShowPopup(false);
    setAnchorRect(null);
    // コンパクト表示用に生成したURLがあれば解放
    if (compactPopupUrl) {
      URL.revokeObjectURL(compactPopupUrl);
      setCompactPopupUrl(null);
    }
  }, [compactPopupUrl]);

  // 外部クリックでメニューを閉じる
  const closeGroupMenu = useCallback(() => setShowGroupMenu(false), []);
  useClickOutside([menuRef, buttonRef], closeGroupMenu, showGroupMenu);

  // 外部クリックで削除メニューを閉じる
  const closeDeleteMenu = useCallback(() => setShowDeleteMenu(false), []);
  useClickOutside([deleteMenuRef, deleteButtonRef], closeDeleteMenu, showDeleteMenu);

  // スクロール時にメニューを閉じる
  useEffect(() => {
    if (!showGroupMenu && !showDeleteMenu) return;

    const handleScroll = () => {
      setShowGroupMenu(false);
      setShowDeleteMenu(false);
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [showGroupMenu, showDeleteMenu]);

  return (
    <>
      <div 
        className={`tab-card ${isRemoving ? 'removing' : ''} ${isSelected ? 'selected' : ''} ${isCompact ? 'tab-card-compact' : ''}`}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onAuxClick={handleAuxClick}
        onMouseEnter={isCompact ? handleMouseEnter : undefined}
        onMouseMove={isCompact ? handleMouseMove : undefined}
        onMouseLeave={isCompact ? handleMouseLeave : undefined}
        data-group-type={currentGroupType}
        data-tab-id={tab.id}
        data-testid="tab-card"
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
              <div className="tab-screenshot-placeholder"><Globe size={24} /></div>
            )}
          </div>
        )}
        {/* コンパクト表示時: スクリーンショットインジケータ（imageRefは使用しない） */}
        {isCompact && tab.screenshot && tab.screenshot.size > 0 && (
          <div className="tab-screenshot-indicator"><Camera size={14} /></div>
        )}
        <div className={`tab-info ${isCompact ? 'tab-info-compact' : ''}`}>
          <div className="tab-title" title={!isCompact && tab.displayName ? tab.title : undefined}>
            {tab.faviconUrl && (
              <img 
                src={tab.faviconUrl} 
                alt="" 
                className="tab-favicon"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}
            <span data-testid="tab-title">{tab.displayName || tab.title}</span>
            {/* コンパクト表示時: displayNameがあれば編集済みアイコン（タイトル末尾に表示） */}
            {isCompact && tab.displayName && (
              <span className="tab-displayname-indicator"><Pencil size={12} /></span>
            )}
            {/* 通常表示でdisplayNameがある場合、元タイトルを小さく表示 */}
            {!isCompact && tab.displayName && (
              <span className="tab-original-title">{tab.title}</span>
            )}
          </div>
          {/* URL行: グループタグ/バッジを含む */}
          <div className={`tab-url-row ${isCompact ? 'tab-url-row-compact' : ''}`}>
            <div className={`tab-url ${isCompact ? 'tab-url-compact' : ''}`} data-testid="tab-url">{tab.url}</div>
            {showGroupTags && (
              isCompact ? (
                /* コンパクト表示: バッジ */
                <span className="group-badge" title={groupsToShow.join(', ')} data-testid="group-badge">
                  <Tag size={12} />{groupsToShow.length}
                </span>
              ) : (
                /* 通常表示: タグチップ */
                <div className="group-tags">
                  {groupsToShow.map(groupName => (
                    <button
                      key={groupName}
                      className="group-tag"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToGroup?.(groupName);
                      }}
                      title={groupName}
                      data-testid="group-tag"
                    >
                      {groupName}
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
          {isCompact ? (
            <div className="tab-meta tab-meta-compact">
              {tab.sortKey && (
                <span className="sortkey-badge" title={t('tabManager.tabCard.sortKey', { key: tab.sortKey })}>
                  <ArrowUpDown size={12} />{tab.sortKey}
                </span>
              )}
              <span><Calendar size={12} /> {formatDateTime(tab.lastAccessed)}</span>
              <span><Save size={12} /> {formatDateTime(tab.savedAt)}</span>
            </div>
          ) : (
            <div className="tab-meta">
              {tab.sortKey && (
                <span className="sortkey-badge" title={t('tabManager.tabCard.sortKey', { key: tab.sortKey })}>
                  <ArrowUpDown size={12} />{tab.sortKey}
                </span>
              )}
              <span>{t('tabManager.tabCard.lastAccessed', { datetime: formatDateTime(tab.lastAccessed) })}</span>
              <span>{t('tabManager.tabCard.saved', { datetime: formatDateTime(tab.savedAt) })}</span>
            </div>
          )}
        </div>
        <div className="tab-actions">
          {onEditTab && (
            <button 
              className="tab-rename" 
              title={t('tabManager.tabCard.edit')}
              data-testid="tab-edit-button"
              onClick={(e) => {
                e.stopPropagation();
                onEditTab(tab.id);
              }}
            >
              <Pencil size={16} />
            </button>
          )}
          <button 
            ref={buttonRef}
            className="tab-group-action" 
            title={t('tabManager.tabCard.customGroups')}
            data-testid="tab-group-button"
            onClick={handleToggleGroupMenu}
          >
            <Folder size={16} />
          </button>
          <button 
            ref={deleteButtonRef}
            className="tab-delete" 
            title={currentGroupType === 'custom' ? t('tabManager.tabCard.deleteMenuLabel') : t('tabManager.tabCard.deleteTab')}
            data-testid="tab-delete-button"
            onClick={handleDeleteClick}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <ScreenshotPopup
        isVisible={showPopup}
        isCompact={isCompact}
        screenshotUrl={screenshotUrl || compactPopupUrl}
        tab={tab}
        mousePos={mousePos}
        anchorRect={anchorRect}
        onClose={handleMouseLeave}
      />

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
          {customGroups.length > 0 && (
            <>
              <div className="group-menu-label">{t('tabManager.tabCard.customGroups')}</div>
              {customGroups.map(group => {
                const isMember = tab.customGroups?.includes(group.name);
                return (
                  <button 
                    key={group.name}
                    className={`group-menu-item ${isMember ? 'is-member' : ''}`}
                    onClick={() => isMember ? onRemoveFromGroup(tab.id, group.name) : handleMoveToGroup(group.name)}
                  >
                    <span className="group-menu-item-check">{isMember && <Check size={14} />}</span>
                    <span className="group-menu-item-text">{group.name}</span>
                  </button>
                );
              })}
            </>
          )}
          {/* 新規グループ作成 */}
          <div className="group-menu-divider" />
          <button
            className="group-menu-item group-menu-item-new"
            onClick={() => {
              onRequestMoveToNewGroup(tab.id);
              setShowGroupMenu(false);
            }}
          >
            {t('tabManager.customGroup.createNew')}
          </button>
        </div>,
        document.body
      )}

      {/* 削除メニュー（ポータルで描画） */}
      {showDeleteMenu && createPortal(
        <div 
          ref={deleteMenuRef}
          className="delete-menu-portal"
          style={{
            position: 'fixed',
            left: deleteMenuPosition.left,
            top: deleteMenuPosition.top,
            zIndex: 1000,
          }}
        >
          <div className="group-menu-label">{t('tabManager.tabCard.deleteMenuLabel')}</div>
          {currentGroupType === 'custom' && (
            <button
              className="group-menu-item"
              data-testid="remove-from-group"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFromGroup(tab.id, currentGroupName);
                setShowDeleteMenu(false);
              }}
            >
              <span className="group-menu-item-check"><X size={14} /></span>
              <span className="group-menu-item-text">{t('tabManager.tabCard.removeFromGroup')}</span>
            </button>
          )}
          <button
            className="group-menu-item group-menu-item-danger"
            data-testid="delete-tab"
            onClick={(e) => {
              e.stopPropagation();
              handleConfirmDelete();
            }}
          >
            <span className="group-menu-item-check"><Trash2 size={14} /></span>
            <span className="group-menu-item-text">{t('tabManager.tabCard.deleteTab')}</span>
          </button>
        </div>,
        document.body
      )}
    </>
  );
});
