import { useEffect, useRef, useState, type RefObject } from "react";

import { useMergeTags } from "./MergeTagContext";
import { useLabels } from "../i18n";
import "./merge-tag-link.css";

/**
 * Splice `text` into a controlled input at its caret (replacing any selection),
 * update state, then restore focus and place the caret after the inserted text.
 * Lets a merge tag be dropped into the middle of a URL (e.g. tracking params),
 * not just replace the whole field.
 */
export function insertAtInputCaret(
  inputRef: RefObject<HTMLInputElement | null>,
  value: string,
  setValue: (next: string) => void,
  text: string,
): string {
  const el = inputRef.current;
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  const next = value.slice(0, start) + text + value.slice(end);
  setValue(next);
  requestAnimationFrame(() => {
    if (!el) return;
    el.focus();
    const pos = start + text.length;
    el.setSelectionRange(pos, pos);
  });
  return next;
}

function BracesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M6 2.5c-1.5 0-2 .8-2 2v1.4c0 .9-.4 1.5-1.3 1.6v.9c.9.1 1.3.7 1.3 1.6V11.5c0 1.2.5 2 2 2M10 2.5c1.5 0 2 .8 2 2v1.4c0 .9.4 1.5 1.3 1.6v.9c-.9.1-1.3.7-1.3 1.6V11.5c0 1.2-.5 2-2 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * A compact dropdown listing merge tags flagged `isLink`, for using `{{key}}`
 * as an href. `onPick` receives the chosen tag's key. Renders nothing when no
 * link tags are defined.
 */
export function MergeTagLinkPicker({
  onPick,
}: {
  onPick: (key: string) => void;
}) {
  const labels = useLabels();
  const linkTags = useMergeTags().filter((tag) => tag.isLink);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (linkTags.length === 0) return null;

  return (
    <div className="bew-mtlink" ref={ref}>
      <button
        type="button"
        className="bew-mtlink-trigger"
        aria-label={labels.mergeTag}
        title={labels.mergeTag}
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((prev) => !prev)}
      >
        <BracesIcon />
      </button>
      {open && (
        <div className="bew-mtlink-menu">
          {linkTags.map((tag) => (
            <button
              key={tag.key}
              type="button"
              className="bew-mtlink-item"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onPick(tag.key);
                setOpen(false);
              }}
            >
              <span className="bew-mtlink-item-label">{tag.label}</span>
              <code className="bew-mtlink-item-key">{`{{${tag.key}}}`}</code>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
