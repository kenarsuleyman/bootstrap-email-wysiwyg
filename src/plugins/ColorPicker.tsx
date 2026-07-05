import { useRef } from "react";

import { BASE_COLORS, COLOR_FAMILIES } from "../colors";
import {
  addCustomColor,
  removeCustomColor,
  useCustomColors,
} from "./customColors";
import "./color-picker.css";

interface ColorPickerProps {
  /** Called with a palette token, a custom "#hex", or null to clear color. */
  onSelect: (token: string | null) => void;
}

interface SwatchProps {
  hex: string;
  token: string;
  title: string;
  onSelect: (token: string) => void;
  onRemove?: () => void;
}

function Swatch({ hex, token, title, onSelect, onRemove }: SwatchProps) {
  const transparent = hex === "transparent";
  return (
    <button
      type="button"
      className={`bew-swatch${transparent ? " bew-swatch--transparent" : ""}`}
      style={transparent ? undefined : { backgroundColor: hex }}
      title={title}
      aria-label={title}
      onClick={() => onSelect(token)}
      onContextMenu={
        onRemove
          ? (event) => {
              event.preventDefault();
              onRemove();
            }
          : undefined
      }
    />
  );
}

export function ColorPicker({ onSelect }: ColorPickerProps) {
  const customColors = useCustomColors();
  const colorInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bew-color-picker">
      <button
        type="button"
        className="bew-color-clear"
        onClick={() => onSelect(null)}
      >
        <span className="bew-color-clear-swatch" />
        No color
      </button>

      <div className="bew-color-row">
        {BASE_COLORS.map((color) => (
          <Swatch
            key={color.token}
            hex={color.hex}
            token={color.token}
            title={color.token}
            onSelect={onSelect}
          />
        ))}
      </div>

      <div className="bew-color-grid">
        {COLOR_FAMILIES.map((family) => (
          <div className="bew-color-grid-row" key={family.name}>
            {/* Darkest → lightest, so 900 sits on the left. */}
            {[...family.shades].reverse().map((shade) => (
              <Swatch
                key={shade.token}
                hex={shade.hex}
                token={shade.token}
                title={shade.token}
                onSelect={onSelect}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="bew-color-custom">
        <span className="bew-color-custom-label">Custom</span>
        <div className="bew-color-row">
          {customColors.map((hex) => (
            <Swatch
              key={hex}
              hex={hex}
              token={hex}
              title={`${hex} (right-click to remove)`}
              onSelect={onSelect}
              onRemove={() => removeCustomColor(hex)}
            />
          ))}
          <button
            type="button"
            className="bew-swatch bew-swatch--add"
            title="Add a custom color"
            aria-label="Add a custom color"
            onClick={() => colorInputRef.current?.click()}
          >
            +
          </button>
          <input
            ref={colorInputRef}
            type="color"
            className="bew-color-input"
            onChange={(event) => {
              const hex = event.target.value.toLowerCase();
              addCustomColor(hex);
              onSelect(hex);
            }}
          />
        </div>
      </div>
    </div>
  );
}
