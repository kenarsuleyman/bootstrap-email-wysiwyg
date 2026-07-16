import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

/**
 * Every user-facing string in the editor chrome (toolbar tooltips, panel
 * labels, popover fields, prompts). The email *content* is never localized —
 * that's the consuming app's data. Pass a `Partial<EditorLabels>` to the editor
 * to translate; missing keys fall back to the English {@link defaultLabels}.
 */
export interface EditorLabels {
  /** Placeholder shown when the editor is empty. */
  placeholder: string;

  // Toolbar
  /** aria-label of the toolbar itself. */
  toolbar: string;
  undo: string;
  redo: string;
  decreaseFontSize: string;
  increaseFontSize: string;
  bold: string;
  italic: string;
  underline: string;
  strikethrough: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  alignJustify: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  insertButton: string;
  /** aria-label of the insert-image button. */
  insertImage: string;
  /** Tooltip of the insert-image button (may add detail, e.g. "from URL"). */
  insertImageTitle: string;
  insertSeparator: string;
  /** aria-label of the insert-grid button. */
  insertGrid: string;
  /** Tooltip of the insert-grid button. */
  insertGridTitle: string;
  /** Message in the `window.prompt` shown when inserting an image. */
  imagePrompt: string;
  /** Text of a freshly inserted button. */
  buttonDefaultLabel: string;

  // Link popover
  insertLink: string;
  editLink: string;
  setButtonLink: string;
  /** Label of the URL field. */
  url: string;
  /** Placeholder for URL inputs (link popover, image link). */
  urlPlaceholder: string;
  displayTextOptional: string;
  linkTextPlaceholder: string;
  remove: string;
  apply: string;

  // Grid controls
  narrowColumn: string;
  widenColumn: string;
  columnWidth: string;
  deleteColumn: string;
  addColumn: string;

  // Image panel
  imageSettings: string;
  imageFullWidth: string;
  imageFixedSize: string;
  imageMaxWidth: string;
  width: string;
  height: string;
  imageLinkOptional: string;

  // Separator panel
  separatorSettings: string;
  topSpacing: string;
  bottomSpacing: string;

  // Color picker
  noColor: string;
  customColor: string;
  addCustomColor: string;
  /** Hint appended to a custom swatch's tooltip, e.g. "right-click to remove". */
  removeColorHint: string;
}

/** English defaults. A `labels` override is shallow-merged over these. */
export const defaultLabels: EditorLabels = {
  placeholder: "Start writing your email…",

  toolbar: "Formatting",
  undo: "Undo",
  redo: "Redo",
  decreaseFontSize: "Decrease font size",
  increaseFontSize: "Increase font size",
  bold: "Bold",
  italic: "Italic",
  underline: "Underline",
  strikethrough: "Strikethrough",
  alignLeft: "Align left",
  alignCenter: "Align center",
  alignRight: "Align right",
  alignJustify: "Align justify",
  textColor: "Text color",
  backgroundColor: "Background color",
  borderColor: "Border color",
  insertButton: "Insert button",
  insertImage: "Insert image",
  insertImageTitle: "Insert image from URL",
  insertSeparator: "Insert separator",
  insertGrid: "Insert grid",
  insertGridTitle: "Insert grid (row of columns)",
  imagePrompt: "Image URL",
  buttonDefaultLabel: "Button",

  insertLink: "Insert link",
  editLink: "Edit link",
  setButtonLink: "Set button link",
  url: "URL",
  urlPlaceholder: "https://example.com",
  displayTextOptional: "Display text (optional)",
  linkTextPlaceholder: "Link text",
  remove: "Remove",
  apply: "Apply",

  narrowColumn: "Narrow column",
  widenColumn: "Widen column",
  columnWidth: "Column width (of 12)",
  deleteColumn: "Delete column",
  addColumn: "Add column",

  imageSettings: "Image settings",
  imageFullWidth: "Full width",
  imageFixedSize: "Fixed size",
  imageMaxWidth: "Max width",
  width: "Width",
  height: "Height",
  imageLinkOptional: "Link (optional)",

  separatorSettings: "Separator settings",
  topSpacing: "Top spacing",
  bottomSpacing: "Bottom spacing",

  noColor: "No color",
  customColor: "Custom",
  addCustomColor: "Add a custom color",
  removeColorHint: "right-click to remove",
};

const LabelsContext = createContext<EditorLabels>(defaultLabels);

/**
 * Provides the merged label set to the editor subtree. Components read it via
 * {@link useLabels}; used standalone (outside a provider) they get the English
 * {@link defaultLabels}.
 */
export function LabelsProvider({
  labels,
  children,
}: {
  labels?: Partial<EditorLabels>;
  children: ReactNode;
}) {
  const value = useMemo(
    () => (labels ? { ...defaultLabels, ...labels } : defaultLabels),
    [labels],
  );
  return (
    <LabelsContext.Provider value={value}>{children}</LabelsContext.Provider>
  );
}

/** Read the current editor chrome labels. */
export function useLabels(): EditorLabels {
  return useContext(LabelsContext);
}
