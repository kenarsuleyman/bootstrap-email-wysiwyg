import { useEffect, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey } from "lexical";
import type { NodeKey } from "lexical";

import { SIZE_STEPS, imagePreviewStyle, type ImageMode } from "../imageSize";
import { StepSlider } from "../plugins/StepSlider";
import { isSafeLinkUrl, normalizeLinkUrl } from "./insertLink";
import { $isImageNode, type ImageNode } from "./ImageNode";
import { useLabels } from "../i18n";
import {
  MergeTagLinkPicker,
  insertAtInputCaret,
} from "../plugins/MergeTagLinkPicker";
import "./image.css";

interface ImageComponentProps {
  nodeKey: NodeKey;
  src: string;
  alt: string;
  mode: ImageMode;
  width: string | null;
  height: string | null;
  link: string;
}

export function ImageComponent({
  nodeKey,
  src,
  alt,
  mode,
  width,
  height,
  link,
}: ImageComponentProps) {
  const [editor] = useLexicalComposerContext();
  const labels = useLabels();
  const modes: { mode: ImageMode; label: string }[] = [
    { mode: "fluid", label: labels.imageFullWidth },
    { mode: "fixed", label: labels.imageFixedSize },
    { mode: "max", label: labels.imageMaxWidth },
  ];
  const [open, setOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState(link);
  const linkInputRef = useRef<HTMLInputElement>(null);

  // Keep the draft in sync when the node's link changes (undo/redo, etc.).
  useEffect(() => setLinkDraft(link), [link]);

  const update = (mutate: (node: ImageNode) => void) => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isImageNode(node)) mutate(node);
    });
  };

  // Commit the link on blur / Enter (or after picking a merge tag): empty
  // clears it, unsafe URLs are ignored.
  const applyLink = (raw: string = linkDraft) => {
    const trimmed = raw.trim();
    if (trimmed === "") {
      update((node) => node.setLink(""));
    } else if (isSafeLinkUrl(trimmed)) {
      const normalized = normalizeLinkUrl(trimmed);
      setLinkDraft(normalized);
      update((node) => node.setLink(normalized));
    }
  };

  const changeMode = (next: ImageMode) => {
    update((node) => {
      node.setMode(next);
      if (next === "fluid") {
        node.setWidth(null);
        node.setHeight(null);
      } else if (next === "fixed") {
        if (!node.getWidth() && !node.getHeight()) node.setWidth("64"); // 256px
      } else if (next === "max") {
        node.setHeight(null);
        if (!node.getWidth()) node.setWidth("96"); // 384px
      }
    });
  };

  // In fixed mode exactly one axis is constrained; the other is auto.
  const axis: "width" | "height" = height !== null ? "height" : "width";

  return (
    // The container is block-level and does NOT resize with the image, so the
    // settings panel stays anchored while the image (and its wrap) grow.
    <div className="bew-image-container">
      <span className="bew-image-wrap" draggable={false}>
        <img
          src={src}
          alt={alt}
          className="bew-image"
          style={imagePreviewStyle(mode, width, height)}
        />
        <button
          type="button"
          className="bew-image-gear"
          aria-label={labels.imageSettings}
          onClick={() => setOpen((prev) => !prev)}
        >
          ⚙
        </button>
      </span>

      {open && (
        <div className="bew-image-panel">
          <div className="bew-image-modes">
            {modes.map((option) => (
              <button
                key={option.mode}
                type="button"
                className={`bew-image-mode${mode === option.mode ? " is-active" : ""}`}
                onClick={() => changeMode(option.mode)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {mode === "fixed" && (
            <>
              <div className="bew-image-modes">
                <button
                  type="button"
                  className={`bew-image-mode${axis === "width" ? " is-active" : ""}`}
                  onClick={() =>
                    update((node) => {
                      node.setHeight(null);
                      if (!node.getWidth()) node.setWidth("64");
                    })
                  }
                >
                  {labels.width}
                </button>
                <button
                  type="button"
                  className={`bew-image-mode${axis === "height" ? " is-active" : ""}`}
                  onClick={() =>
                    update((node) => {
                      node.setWidth(null);
                      if (!node.getHeight()) node.setHeight("48");
                    })
                  }
                >
                  {labels.height}
                </button>
              </div>
              <StepSlider
                label={axis === "width" ? labels.width : labels.height}
                steps={SIZE_STEPS}
                value={axis === "width" ? width : height}
                fallbackKey={axis === "width" ? "64" : "48"}
                onChange={(key) =>
                  update((node) => {
                    if (axis === "width") {
                      node.setWidth(key);
                      node.setHeight(null);
                    } else {
                      node.setHeight(key);
                      node.setWidth(null);
                    }
                  })
                }
              />
            </>
          )}

          {mode === "max" && (
            <StepSlider
              label={labels.imageMaxWidth}
              steps={SIZE_STEPS}
              value={width}
              fallbackKey="96"
              onChange={(key) => update((node) => node.setWidth(key))}
            />
          )}

          <label className="bew-image-link">
            <span>{labels.imageLinkOptional}</span>
            <div className="bew-link-input-row">
              <input
                ref={linkInputRef}
                type="url"
                value={linkDraft}
                placeholder={labels.urlPlaceholder}
                onChange={(event) => setLinkDraft(event.target.value)}
                onBlur={() => applyLink()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyLink();
                  }
                }}
              />
              <MergeTagLinkPicker
                onPick={(key) =>
                  applyLink(
                    insertAtInputCaret(
                      linkInputRef,
                      linkDraft,
                      setLinkDraft,
                      `{{${key}}}`,
                    ),
                  )
                }
              />
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
