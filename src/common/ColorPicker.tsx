/**
 * TabBurrow - カラーピッカーコンポーネント
 * プリセットパレット + カスタム色選択（react-colorful使用）
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { Palette, X } from 'lucide-react';

// プリセットカラー（10色 + なし）
const PRESET_COLORS = [
  '#ef4444', // 赤
  '#f97316', // オレンジ
  '#eab308', // 黄
  '#22c55e', // 緑
  '#06b6d4', // シアン
  '#3b82f6', // 青
  '#8b5cf6', // 紫
  '#ec4899', // ピンク
  '#6b7280', // グレー
];

interface ColorPickerProps {
  color?: string;
  onChange: (color: string | undefined) => void;
  disabled?: boolean;
}

/**
 * カラーピッカーコンポーネント
 * - プリセットパレット
 * - カスタム色選択（HSVピッカー + HEX入力）
 */
export function ColorPicker({ color, onChange, disabled = false }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // ポップオーバーの位置を計算
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      
      // ボタンの直下に表示（body基準の絶対座標ではなくfixedで表示するため、スクロールを考慮しない）
      // ただしOptions画面などはbodyがscrollableなので、getBoundingClientRectが正しい
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, []);

  // 外部クリックで閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      // ポップオーバー内またはトリガーボタン内のクリックは無視
      if (
        popoverRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
      setShowCustomPicker(false);
    };

    // 位置を初期計算
    updatePosition();

    // スクロールやリサイズ時に位置を更新
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, updatePosition]);

  const handlePresetClick = useCallback((presetColor: string) => {
    onChange(presetColor);
    setIsOpen(false);
    setShowCustomPicker(false);
  }, [onChange]);

  const handleClearColor = useCallback(() => {
    onChange(undefined);
    setIsOpen(false);
    setShowCustomPicker(false);
  }, [onChange]);

  const handleCustomColorChange = useCallback((newColor: string) => {
    onChange(newColor);
  }, [onChange]);

  const togglePicker = useCallback(() => {
    if (!disabled) {
      setIsOpen(prev => !prev);
      if (isOpen) {
        setShowCustomPicker(false);
      }
    }
  }, [disabled, isOpen]);

  return (
    <div className="color-picker-wrapper">
      {/* トリガーボタン / カラー表示 */}
      <button
        ref={triggerRef}
        type="button"
        className={`btn btn-icon color-picker-trigger ${disabled ? 'disabled' : ''}`}
        onClick={togglePicker}
        title="グループ色を選択"
        disabled={disabled}
      >
        {color ? (
          <span
            className="color-preview"
            style={{ backgroundColor: color }}
          />
        ) : (
          <Palette size={16} />
        )}
      </button>

      {/* ポップオーバー (Portalを使用してbody直下に描画) */}
      {isOpen && createPortal(
        <div 
          ref={popoverRef} 
          className="color-picker-popover"
          style={{ 
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
          // 親のDraggableList等のイベントを完全に遮断
          onMouseDown={(e) => e.stopPropagation()}
          onDragStart={(e) => e.stopPropagation()}
        >
          {/* プリセットパレット */}
          <div className="color-preset-grid">
            {PRESET_COLORS.map((presetColor) => (
              <button
                key={presetColor}
                type="button"
                className={`color-preset-item ${color === presetColor ? 'selected' : ''}`}
                style={{ backgroundColor: presetColor }}
                onClick={() => handlePresetClick(presetColor)}
                title={presetColor}
              />
            ))}
            {/* 色なしボタン */}
            <button
              type="button"
              className={`color-preset-item no-color ${!color ? 'selected' : ''}`}
              onClick={handleClearColor}
              title="色なし"
            >
              <X size={12} />
            </button>
          </div>

          {/* カスタム色選択トグル */}
          <button
            type="button"
            className="color-custom-toggle"
            onClick={() => setShowCustomPicker(prev => !prev)}
          >
            {showCustomPicker ? '閉じる' : 'カスタム色を選択'}
          </button>

          {/* カスタム色ピッカー（HSV + HEX入力） */}
          {showCustomPicker && (
            <div className="color-custom-picker">
              <HexColorPicker
                color={color || '#3b82f6'}
                onChange={handleCustomColorChange}
              />
              <div className="color-hex-input-wrapper">
                <span className="color-hex-label">#</span>
                <HexColorInput
                  color={color || '#3b82f6'}
                  onChange={handleCustomColorChange}
                  className="color-hex-input"
                  prefixed={false}
                />
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
