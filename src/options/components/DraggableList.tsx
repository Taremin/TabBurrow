/**
 * TabBurrow - ドラッグ&ドロップリスト共通コンポーネント
 * カスタムグループとピン留めドメイングループで共通利用
 */

import { useState, useCallback } from 'react';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';

/**
 * リストアイテムの型定義
 */
export interface DraggableListItem {
  id: string;             // ユニーク識別子
  name: string;           // 表示名
  icon: React.ReactNode;  // アイコン
  badge?: string;         // 補足情報（タブ数など）
}

/**
 * DraggableListコンポーネントのProps
 */
interface DraggableListProps {
  items: DraggableListItem[];
  onReorder: (newOrder: string[]) => void;
  onEdit?: (id: string) => void;
  onDelete: (id: string) => void;
  editTitle?: string;
  deleteTitle?: string;
  dragHint?: string;
  emptyMessage?: string;
}

/**
 * ドラッグ&ドロップ対応のリストコンポーネント
 */
export function DraggableList({
  items,
  onReorder,
  onEdit,
  onDelete,
  editTitle = 'Edit',
  deleteTitle = 'Delete',
  dragHint = 'Drag to reorder',
  emptyMessage = 'No items',
}: DraggableListProps) {
  // ドラッグ状態
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  // ドラッグ開始
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }, []);

  // ドラッグ終了
  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
    setDropPosition(null);
  }, []);

  // ドラッグオーバー
  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedId && draggedId !== id) {
      // マウス位置に基づいて挿入位置を判定（上半分=before、下半分=after）
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const position: 'before' | 'after' = mouseY < rect.height / 2 ? 'before' : 'after';
      
      setDragOverId(id);
      setDropPosition(position);
    }
  }, [draggedId]);

  // ドラッグ離脱
  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
    setDropPosition(null);
  }, []);

  // ドロップ処理
  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    
    if (!sourceId || sourceId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      setDropPosition(null);
      return;
    }

    // 挿入位置を計算
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const position: 'before' | 'after' = mouseY < rect.height / 2 ? 'before' : 'after';

    // 新しい順序を計算
    const currentOrder = items.map(item => item.id);
    const sourceIndex = currentOrder.indexOf(sourceId);
    let targetIndex = currentOrder.indexOf(targetId);
    
    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      setDropPosition(null);
      return;
    }

    // ソースを削除
    const newOrder = [...currentOrder];
    newOrder.splice(sourceIndex, 1);
    
    // ターゲットインデックスを再計算（ソース削除後にインデックスがずれる可能性）
    targetIndex = newOrder.indexOf(targetId);
    
    // 挿入位置を調整
    const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex;
    newOrder.splice(insertIndex, 0, sourceId);
    
    // 状態をリセット
    setDraggedId(null);
    setDragOverId(null);
    setDropPosition(null);

    // コールバック
    onReorder(newOrder);
  }, [items, onReorder]);

  // アイテムがない場合
  if (items.length === 0) {
    return <p className="empty-message">{emptyMessage}</p>;
  }

  return (
    <ul className="draggable-list">
      {items.map(item => {
        const isDragging = draggedId === item.id;
        const isDropTarget = dragOverId === item.id && !isDragging;
        const dropClass = isDropTarget && dropPosition ? `drop-${dropPosition}` : '';
        
        return (
          <li
            key={item.id}
            className={`draggable-list-item ${isDragging ? 'dragging' : ''} ${dropClass}`}
            draggable
            onDragStart={(e) => handleDragStart(e, item.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, item.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, item.id)}
          >
            <span className="drag-handle" title={dragHint}>
              <GripVertical size={16} />
            </span>
            <div className="draggable-list-info">
              <span className="draggable-list-icon">
                {item.icon}
              </span>
              <span className="draggable-list-name">{item.name}</span>
              {item.badge && (
                <span className="draggable-list-badge">
                  ({item.badge})
                </span>
              )}
            </div>
            <div className="draggable-list-actions">
              {onEdit && (
                <button
                  type="button"
                  className="btn btn-icon"
                  onClick={() => onEdit(item.id)}
                  title={editTitle}
                  aria-label={editTitle}
                >
                  <Pencil size={16} />
                </button>
              )}
              <button
                type="button"
                className="btn btn-icon btn-danger-icon"
                onClick={() => onDelete(item.id)}
                title={deleteTitle}
                aria-label={deleteTitle}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
