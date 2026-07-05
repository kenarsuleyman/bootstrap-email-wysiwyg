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
import { mergeRegister } from "@lexical/utils";

import { insertButton } from "../nodes/insertButton";
import { insertImage } from "../nodes/insertImage";
import { insertHr } from "../nodes/insertHr";
import { getLastButtonStyle } from "../nodes/buttonMemory";
import { normalizeAlign, type Align } from "../nodes/alignment";
import { applyColor, type ColorKind } from "../nodes/applyColor";
import { adjustFontSize } from "../nodes/applyFontSize";
import { ColorPicker } from "./ColorPicker";
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

export function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const [formats, setFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  });
  const [align, setAlign] = useState<Align>("left");
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
      applyColor(editor, kind, token);
    },
    [editor],
  );

  const insertStyledButton = useCallback(() => {
    insertButton(editor, { ...getLastButtonStyle(), label: "Button" });
  }, [editor]);

  const insertImageFromUrl = useCallback(() => {
    const url = window.prompt("Image URL");
    const src = url?.trim();
    if (src) insertImage(editor, { src });
  }, [editor]);

  const insertSeparator = useCallback(() => {
    insertHr(editor);
  }, [editor]);

  return (
    <div className="bew-toolbar" role="toolbar" aria-label="Formatting">
      <button
        type="button"
        className="bew-tb-btn"
        aria-label="Undo"
        disabled={!canUndo}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
      >
        ↶
      </button>
      <button
        type="button"
        className="bew-tb-btn"
        aria-label="Redo"
        disabled={!canRedo}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
      >
        ↷
      </button>

      <span className="bew-tb-divider" />

      <button
        type="button"
        className="bew-tb-btn bew-tb-font"
        aria-label="Decrease font size"
        title="Decrease font size"
        onClick={() => changeFontSize("decrease")}
      >
        <span className="bew-tb-font-a bew-tb-font-a--sm">A</span>
        <span className="bew-tb-font-sign">−</span>
      </button>
      <button
        type="button"
        className="bew-tb-btn bew-tb-font"
        aria-label="Increase font size"
        title="Increase font size"
        onClick={() => changeFontSize("increase")}
      >
        <span className="bew-tb-font-a bew-tb-font-a--lg">A</span>
        <span className="bew-tb-font-sign">+</span>
      </button>

      <span className="bew-tb-divider" />

      <button
        type="button"
        className={cx("bew-tb-btn", "bew-tb-btn--bold", formats.bold && "is-active")}
        aria-label="Bold"
        aria-pressed={formats.bold}
        onClick={() => toggleFormat("bold")}
      >
        B
      </button>
      <button
        type="button"
        className={cx("bew-tb-btn", "bew-tb-btn--italic", formats.italic && "is-active")}
        aria-label="Italic"
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
        aria-label="Underline"
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
        aria-label="Strikethrough"
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
          aria-label={`Align ${option}`}
          aria-pressed={align === option}
          onClick={() => setAlignment(option)}
        >
          <AlignIcon align={option} />
        </button>
      ))}

      <span className="bew-tb-divider" />

      <Dropdown
        ariaLabel="Text color"
        triggerClassName="bew-tb-btn"
        menuClassName="bew-tb-menu--color"
        label={<TextColorIcon />}
      >
        <ColorPicker onSelect={(token) => setColor("text", token)} />
      </Dropdown>
      <Dropdown
        ariaLabel="Background color"
        triggerClassName="bew-tb-btn"
        menuClassName="bew-tb-menu--color"
        label={<BgColorIcon />}
      >
        <ColorPicker onSelect={(token) => setColor("bg", token)} />
      </Dropdown>
      <Dropdown
        ariaLabel="Border color (buttons)"
        triggerClassName="bew-tb-btn"
        menuClassName="bew-tb-menu--color"
        label={<BorderColorIcon />}
      >
        <ColorPicker onSelect={(token) => setColor("border", token)} />
      </Dropdown>

      <span className="bew-tb-divider" />

      <button
        type="button"
        className="bew-tb-btn"
        aria-label="Insert button"
        title="Insert button"
        onClick={insertStyledButton}
      >
        <ButtonInsertIcon />
      </button>
      <button
        type="button"
        className="bew-tb-btn"
        aria-label="Insert image"
        title="Insert image from URL"
        onClick={insertImageFromUrl}
      >
        <ImageInsertIcon />
      </button>
      <button
        type="button"
        className="bew-tb-btn"
        aria-label="Insert separator"
        title="Insert separator"
        onClick={insertSeparator}
      >
        <HrInsertIcon />
      </button>
    </div>
  );
}
