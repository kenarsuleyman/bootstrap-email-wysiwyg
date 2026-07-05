import type { ButtonNode, ButtonVariant } from "./ButtonNode";

/** The full visual styling of a button, minus href/label. */
export interface ButtonStyle {
  variant: ButtonVariant;
  outline: boolean;
  textColor: string | null;
  bgColor: string | null;
  borderColor: string | null;
  fontSize: string | null;
}

const DEFAULT_STYLE: ButtonStyle = {
  variant: "primary",
  outline: false,
  textColor: null,
  bgColor: null,
  borderColor: null,
  fontSize: null,
};

// The most recently used button styling, so newly inserted buttons match the
// last one the user styled. Session-scoped (resets on reload) by design.
let lastStyle: ButtonStyle = { ...DEFAULT_STYLE };

export function getLastButtonStyle(): ButtonStyle {
  return { ...lastStyle };
}

export function rememberButtonStyle(style: ButtonStyle): void {
  lastStyle = { ...style };
}

/** Snapshot a button's current styling. */
export function captureButtonStyle(button: ButtonNode): ButtonStyle {
  return {
    variant: button.getVariant(),
    outline: button.getOutline(),
    textColor: button.getTextColor(),
    bgColor: button.getBgColor(),
    borderColor: button.getBorderColor(),
    fontSize: button.getFontSize(),
  };
}
