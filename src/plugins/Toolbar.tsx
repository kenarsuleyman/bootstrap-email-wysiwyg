import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  type ElementFormatType,
  type TextFormatType,
} from "lexical";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";
import { $isLinkNode } from "@lexical/link";

import { insertButton } from "../nodes/insertButton";
import { $isButtonNode } from "../nodes/ButtonNode";
import { insertImage } from "../nodes/insertImage";
import { insertHr } from "../nodes/insertHr";
import { insertGrid, setColumnColor } from "../nodes/insertGrid";
import { useGridSelection } from "./GridSelectionContext";
import { getLastButtonStyle } from "../nodes/buttonMemory";
import { normalizeAlign, type Align } from "../nodes/alignment";
import { applyColor, type ColorKind } from "../nodes/applyColor";
import { adjustFontSize } from "../nodes/applyFontSize";
import { ColorPicker } from "./ColorPicker";
import { LinkPopover, type LinkState } from "./LinkPopover";
import { useLabels } from "../i18n";
import "./toolbar.css";

function cx(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

function Chevron() {
  return (
    <svg
      className="bew-tb-chevron"
      width="10"
      height="10"
      viewBox="0 0 10 10"
      aria-hidden="true"
    >
      <path
        d="M2 3.5L5 6.5L8 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// x-coordinates [start, end] for the four lines that make up each align icon.
const ALIGN_LINES: Record<Align, [number, number][]> = {
  left: [
    [1, 15],
    [1, 9],
    [1, 15],
    [1, 9],
  ],
  center: [
    [1, 15],
    [4, 12],
    [1, 15],
    [4, 12],
  ],
  right: [
    [1, 15],
    [7, 15],
    [1, 15],
    [7, 15],
  ],
  justify: [
    [1, 15],
    [1, 15],
    [1, 15],
    [1, 15],
  ],
};

function AlignIcon({ align }: { align: Align }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      {ALIGN_LINES[align].map(([x1, x2], i) => (
        <line
          key={i}
          x1={x1}
          x2={x2}
          y1={3 + i * 3.5}
          y2={3 + i * 3.5}
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

const ALIGN_OPTIONS: Align[] = ["left", "center", "right", "justify"];

interface DropdownProps {
  label: ReactNode;
  ariaLabel: string;
  children: ReactNode;
  /** Render a bare trigger (for icon buttons) instead of the labelled pill. */
  triggerClassName?: string;
  menuClassName?: string;
}

/** Minimal click-outside dropdown, styled to match the toolbar. */
function Dropdown({
  label,
  ariaLabel,
  children,
  triggerClassName,
  menuClassName,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div className="bew-tb-dropdown" ref={ref}>
      <button
        type="button"
        className={triggerClassName ?? "bew-tb-dropdown-trigger"}
        aria-label={ariaLabel}
        title={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {triggerClassName ? (
          label
        ) : (
          <span className="bew-tb-dropdown-label">{label}</span>
        )}
        {!triggerClassName && <Chevron />}
      </button>
      {open && (
        <div
          className={`bew-tb-menu${menuClassName ? ` ${menuClassName}` : ""}`}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function TextColorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3.5 12L6.5 4h1L10.5 12M4.6 9.2h4.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="2.5" y="13" width="9" height="2" rx="0.5" className="bew-tb-colorbar" />
    </svg>
  );
}

function BgColorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M6 2.5l5 5-4.2 4.2a1.5 1.5 0 0 1-2.1 0L2.5 9.5a1.5 1.5 0 0 1 0-2.1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M4 8.5h7" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <rect x="2.5" y="13" width="11" height="2" rx="0.5" className="bew-tb-colorbar" />
    </svg>
  );
}

function BorderColorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect
        x="2.5"
        y="2.5"
        width="8"
        height="8"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeDasharray="2 1.4"
      />
      <rect x="2.5" y="13" width="11" height="2" rx="0.5" className="bew-tb-colorbar" />
    </svg>
  );
}

function ImageInsertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect
        x="1.5"
        y="2.5"
        width="13"
        height="11"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="5.5" cy="6" r="1.3" fill="currentColor" />
      <path
        d="M2.5 12l3.5-4 2.5 2.5L11 8l3 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HrInsertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="3.5" y1="4.5" x2="12.5" y2="4.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.35" />
      <line x1="3.5" y1="11.5" x2="12.5" y2="11.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

function ButtonInsertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect
        x="1.5"
        y="4.5"
        width="13"
        height="7"
        rx="2"
        fill="currentColor"
        opacity="0.15"
      />
      <rect
        x="1.5"
        y="4.5"
        width="13"
        height="7"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M5.5 8h5M8 5.5v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"
      />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"
      />
    </svg>
  );
}

function GridInsertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <line x1="6.3" y1="3.5" x2="6.3" y2="12.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="9.7" y1="3.5" x2="9.7" y2="12.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const labels = useLabels();
  const { selectedColumnKey } = useGridSelection();
  const alignLabels: Record<Align, string> = {
    left: labels.alignLeft,
    center: labels.alignCenter,
    right: labels.alignRight,
    justify: labels.alignJustify,
  };
  const [formats, setFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  });
  const [align, setAlign] = useState<Align>("left");
  const [link, setLink] = useState<LinkState>({
    active: false,
    url: "",
    inButton: false,
    needsDisplayText: false,
    canRemove: false,
  });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    setFormats({
      bold: selection.hasFormat("bold"),
      italic: selection.hasFormat("italic"),
      underline: selection.hasFormat("underline"),
      strikethrough: selection.hasFormat("strikethrough"),
    });

    const anchorNode = selection.anchor.getNode();
    // A button is itself an <a>, so its own href is the link target. Detect it
    // first, before checking for a wrapping LinkNode.
    const buttonNode = $isButtonNode(anchorNode)
      ? anchorNode
      : $findMatchingParent(anchorNode, $isButtonNode);
    if ($isButtonNode(buttonNode)) {
      const href = buttonNode.getHref();
      const hasHref = href !== "" && href !== "#";
      setLink({
        active: hasHref,
        url: hasHref ? href : "",
        inButton: true,
        needsDisplayText: false,
        canRemove: hasHref,
      });
    } else {
      const linkNode = $isLinkNode(anchorNode)
        ? anchorNode
        : $findMatchingParent(anchorNode, $isLinkNode);
      if ($isLinkNode(linkNode)) {
        setLink({
          active: true,
          url: linkNode.getURL(),
          inButton: false,
          needsDisplayText: false,
          canRemove: true,
        });
      } else {
        // No link/button context: when the cursor is collapsed there's no text
        // to wrap, so the popover collects display text too.
        setLink({
          active: false,
          url: "",
          inButton: false,
          needsDisplayText: selection.isCollapsed(),
          canRemove: false,
        });
      }
    }

    const element =
      anchorNode.getKey() === "root"
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();
    setAlign(
      $isElementNode(element)
        ? (normalizeAlign(element.getFormatType()) ?? "left")
        : "left",
    );
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(updateToolbar);
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, updateToolbar]);

  const changeFontSize = useCallback(
    (direction: "increase" | "decrease") => {
      adjustFontSize(editor, direction);
    },
    [editor],
  );

  const toggleFormat = useCallback(
    (format: TextFormatType) => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    },
    [editor],
  );

  const setAlignment = useCallback(
    (value: ElementFormatType) => {
      editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, value);
    },
    [editor],
  );

  const setColor = useCallback(
    (kind: ColorKind, token: string | null) => {
      // A selected column takes the color on its own `col-N` div; otherwise the
      // color applies to the text selection / current block as usual.
      if (selectedColumnKey) setColumnColor(editor, selectedColumnKey, kind, token);
      else applyColor(editor, kind, token);
    },
    [editor, selectedColumnKey],
  );

  const insertStyledButton = useCallback(() => {
    insertButton(editor, {
      ...getLastButtonStyle(),
      label: labels.buttonDefaultLabel,
    });
  }, [editor, labels.buttonDefaultLabel]);

  const insertImageFromUrl = useCallback(() => {
    const url = window.prompt(labels.imagePrompt);
    const src = url?.trim();
    if (src) insertImage(editor, { src });
  }, [editor, labels.imagePrompt]);

  const insertSeparator = useCallback(() => {
    insertHr(editor);
  }, [editor]);

  const insertGridBlock = useCallback(() => {
    insertGrid(editor);
  }, [editor]);

  return (
    <div className="bew-toolbar" role="toolbar" aria-label={labels.toolbar}>
      <button
        type="button"
        className="bew-tb-btn"
        aria-label={labels.undo}
        title={labels.undo}
        disabled={!canUndo}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
      >
        <UndoIcon />
      </button>
      <button
        type="button"
        className="bew-tb-btn"
        aria-label={labels.redo}
        title={labels.redo}
        disabled={!canRedo}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
      >
        <RedoIcon />
      </button>

      <span className="bew-tb-divider" />

      <button
        type="button"
        className="bew-tb-btn bew-tb-font"
        aria-label={labels.decreaseFontSize}
        title={labels.decreaseFontSize}
        onClick={() => changeFontSize("decrease")}
      >
        <span className="bew-tb-font-a bew-tb-font-a--sm">A</span>
        <span className="bew-tb-font-sign">−</span>
      </button>
      <button
        type="button"
        className="bew-tb-btn bew-tb-font"
        aria-label={labels.increaseFontSize}
        title={labels.increaseFontSize}
        onClick={() => changeFontSize("increase")}
      >
        <span className="bew-tb-font-a bew-tb-font-a--lg">A</span>
        <span className="bew-tb-font-sign">+</span>
      </button>

      <span className="bew-tb-divider" />

      <button
        type="button"
        className={cx("bew-tb-btn", "bew-tb-btn--bold", formats.bold && "is-active")}
        aria-label={labels.bold}
        title={labels.bold}
        aria-pressed={formats.bold}
        onClick={() => toggleFormat("bold")}
      >
        B
      </button>
      <button
        type="button"
        className={cx("bew-tb-btn", "bew-tb-btn--italic", formats.italic && "is-active")}
        aria-label={labels.italic}
        title={labels.italic}
        aria-pressed={formats.italic}
        onClick={() => toggleFormat("italic")}
      >
        I
      </button>
      <button
        type="button"
        className={cx(
          "bew-tb-btn",
          "bew-tb-btn--underline",
          formats.underline && "is-active",
        )}
        aria-label={labels.underline}
        title={labels.underline}
        aria-pressed={formats.underline}
        onClick={() => toggleFormat("underline")}
      >
        U
      </button>
      <button
        type="button"
        className={cx(
          "bew-tb-btn",
          "bew-tb-btn--strike",
          formats.strikethrough && "is-active",
        )}
        aria-label={labels.strikethrough}
        title={labels.strikethrough}
        aria-pressed={formats.strikethrough}
        onClick={() => toggleFormat("strikethrough")}
      >
        S
      </button>

      <span className="bew-tb-divider" />

      {ALIGN_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          className={cx("bew-tb-btn", align === option && "is-active")}
          aria-label={alignLabels[option]}
          title={alignLabels[option]}
          aria-pressed={align === option}
          onClick={() => setAlignment(option)}
        >
          <AlignIcon align={option} />
        </button>
      ))}

      <span className="bew-tb-divider" />

      <Dropdown
        ariaLabel={labels.textColor}
        triggerClassName="bew-tb-btn"
        menuClassName="bew-tb-menu--color"
        label={<TextColorIcon />}
      >
        <ColorPicker onSelect={(token) => setColor("text", token)} />
      </Dropdown>
      <Dropdown
        ariaLabel={labels.backgroundColor}
        triggerClassName="bew-tb-btn"
        menuClassName="bew-tb-menu--color"
        label={<BgColorIcon />}
      >
        <ColorPicker onSelect={(token) => setColor("bg", token)} />
      </Dropdown>
      <Dropdown
        ariaLabel={labels.borderColor}
        triggerClassName="bew-tb-btn"
        menuClassName="bew-tb-menu--color"
        label={<BorderColorIcon />}
      >
        <ColorPicker onSelect={(token) => setColor("border", token)} />
      </Dropdown>

      <span className="bew-tb-divider" />

      <LinkPopover editor={editor} state={link} />
      <button
        type="button"
        className="bew-tb-btn"
        aria-label={labels.insertButton}
        title={labels.insertButton}
        onClick={insertStyledButton}
      >
        <ButtonInsertIcon />
      </button>
      <button
        type="button"
        className="bew-tb-btn"
        aria-label={labels.insertImage}
        title={labels.insertImageTitle}
        onClick={insertImageFromUrl}
      >
        <ImageInsertIcon />
      </button>
      <button
        type="button"
        className="bew-tb-btn"
        aria-label={labels.insertSeparator}
        title={labels.insertSeparator}
        onClick={insertSeparator}
      >
        <HrInsertIcon />
      </button>
      <button
        type="button"
        className="bew-tb-btn"
        aria-label={labels.insertGrid}
        title={labels.insertGridTitle}
        onClick={insertGridBlock}
      >
        <GridInsertIcon />
      </button>
    </div>
  );
}
