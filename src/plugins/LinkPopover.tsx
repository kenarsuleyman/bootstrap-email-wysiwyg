import { useEffect, useRef, useState } from "react";
import type { LexicalEditor } from "lexical";

import { toggleLink, insertLinkWithText } from "../nodes/insertLink";
import { setButtonHref } from "../nodes/insertButton";
import "./link-popover.css";

/** Selection context the toolbar computes to drive the link popover. */
export interface LinkState {
  /** Whether the link button should render active (a link/button link exists). */
  active: boolean;
  /** URL to prefill: an existing link's href, or the button's href. */
  url: string;
  /** The cursor is inside a button — apply sets the button's own href. */
  inButton: boolean;
  /** Collapsed cursor with no text to wrap — show the display-text field. */
  needsDisplayText: boolean;
  /** An existing link (or button href) can be removed. */
  canRemove: boolean;
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M6.5 9.5l3-3M6 5.5L7.4 4.1a2.2 2.2 0 0 1 3.1 3.1L9.1 8.6M10 10.5L8.6 11.9a2.2 2.2 0 0 1-3.1-3.1L6.9 7.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface LinkPopoverProps {
  editor: LexicalEditor;
  state: LinkState;
}

/**
 * The toolbar link control: a button that opens a small popover to enter a URL
 * (and, when there's no selection to wrap, an optional display text). When the
 * cursor is inside a button, it edits the button's own href instead of nesting
 * a link.
 */
export function LinkPopover({ editor, state }: LinkPopoverProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Seed the fields from the current selection each time the popover opens.
  useEffect(() => {
    if (!open) return;
    setUrl(state.url);
    setText("");
    const id = requestAnimationFrame(() => urlInputRef.current?.focus());
    return () => cancelAnimationFrame(id);
    // Only re-seed on open, not on every selection tick while already open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside click.
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

  const apply = () => {
    const trimmed = url.trim();
    if (state.inButton) {
      setButtonHref(editor, trimmed);
    } else if (state.needsDisplayText) {
      if (trimmed !== "") insertLinkWithText(editor, trimmed, text);
    } else {
      toggleLink(editor, trimmed === "" ? null : trimmed);
    }
    setOpen(false);
  };

  const remove = () => {
    if (state.inButton) setButtonHref(editor, "");
    else toggleLink(editor, null);
    setOpen(false);
  };

  const label = state.inButton
    ? "Set button link"
    : state.active
      ? "Edit link"
      : "Insert link";

  return (
    <div className="bew-tb-dropdown" ref={ref}>
      <button
        type="button"
        className={`bew-tb-btn${state.active ? " is-active" : ""}`}
        aria-label={label}
        aria-pressed={state.active}
        aria-expanded={open}
        title={label}
        onClick={() => setOpen((prev) => !prev)}
      >
        <LinkIcon />
      </button>

      {open && (
        <div
          className="bew-link-popover"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              apply();
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        >
          <label className="bew-link-field">
            <span>URL</span>
            <input
              ref={urlInputRef}
              type="url"
              value={url}
              placeholder="https://example.com"
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>

          {state.needsDisplayText && (
            <label className="bew-link-field">
              <span>Display text (optional)</span>
              <input
                type="text"
                value={text}
                placeholder="Link text"
                onChange={(event) => setText(event.target.value)}
              />
            </label>
          )}

          <div className="bew-link-actions">
            {state.canRemove && (
              <button
                type="button"
                className="bew-link-btn bew-link-btn--remove"
                onClick={remove}
              >
                Remove
              </button>
            )}
            <button
              type="button"
              className="bew-link-btn bew-link-btn--apply"
              onClick={apply}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
