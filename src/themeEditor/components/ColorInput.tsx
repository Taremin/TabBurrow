/**
 * カラー入力コンポーネント
 */

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isTextOnly?: boolean;
}

export function ColorInput({ label, value, onChange, isTextOnly = false }: ColorInputProps) {
  if (isTextOnly) {
    // フォントやシャドウなどテキストベースの入力
    return (
      <div className="text-input-group">
        <label className="color-input-label">{label}</label>
        <input
          type="text"
          className="text-input"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    );
  }

  // カラーピッカー
  return (
    <div className="color-input-group">
      <label className="color-input-label">{label}</label>
      <div className="color-input-row">
        <div className="color-picker-wrapper">
          <input
            type="color"
            className="color-picker-input"
            value={value.startsWith('#') ? value : '#ffffff'}
            onChange={e => onChange(e.target.value)}
          />
        </div>
        <input
          type="text"
          className="color-value-input"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#ffffff"
        />
      </div>
    </div>
  );
}
