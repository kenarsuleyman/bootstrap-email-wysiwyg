import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type ReactNode,
} from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { InitialConfigType } from "@lexical/react/LexicalComposer";

import { LinkNode } from "@lexical/link";
import { $getRoot, type LexicalEditor } from "lexical";
import { ParagraphNode } from "lexical";

import { BootstrapLinkNode } from "./nodes/BootstrapLinkNode";

import { bootstrapEmailTheme } from "./theme";
import { ButtonNode } from "./nodes/ButtonNode";
import { BootstrapParagraphNode } from "./nodes/BootstrapParagraphNode";
import { ImageNode } from "./nodes/ImageNode";
import { HrNode } from "./nodes/HrNode";
import { RowNode } from "./nodes/RowNode";
import { ColumnNode } from "./nodes/ColumnNode";
import { MergeTagNode } from "./nodes/MergeTagNode";
import { isSafeLinkUrl } from "./nodes/insertLink";
import { Toolbar } from "./plugins/Toolbar";
import { GridPlugin } from "./plugins/GridPlugin";
import { GridControls } from "./plugins/GridControls";
import { GridSelectionProvider } from "./plugins/GridSelectionContext";
import { MergeTagProvider, type MergeTag } from "./plugins/MergeTagContext";
import {
  toBootstrapEmailHtml,
  type BootstrapEmailHtmlOptions,
} from "./export";
import { LabelsProvider, defaultLabels, type EditorLabels } from "./i18n";
import "./editor.css";

/** Payload passed to `onChange` on every edit. */
export interface EditorChange {
  /** Bootstrap Email source HTML (content fragment). */
  html: string;
  /** Serialized editor state, for persistence / `initialContent`. */
  json: string;
}

/** Imperative handle exposed via `ref`. */
export interface BootstrapEmailEditorHandle {
  /** Export Bootstrap Email HTML (fragment by default; pass `{ document: true }`). */
  getHtml: (options?: BootstrapEmailHtmlOptions) => string;
  /** Serialized editor state JSON, suitable for `initialContent`. */
  getJson: () => string;
  focus: () => void;
  /** Remove all content. */
  clear: () => void;
  /** The underlying Lexical editor, for advanced use. */
  getEditor: () => LexicalEditor | null;
}

export interface BootstrapEmailEditorProps {
  /**
   * Placeholder text shown when the editor is empty. Takes precedence over
   * `labels.placeholder`.
   */
  placeholder?: string;
  /**
   * Override any editor chrome strings (toolbar tooltips, panel labels, …) for
   * localization. Missing keys fall back to the English defaults.
   */
  labels?: Partial<EditorLabels>;
  /**
   * Merge tags the user can insert as atomic `{{key}}` tokens. When at least one
   * is defined, the toolbar shows a merge-tag dropdown listing their `label`s.
   */
  mergeTags?: MergeTag[];
  /**
   * Optional per-key override of merge-tag display `label`s (for localization),
   * mirroring `labels`. Missing keys keep the definition's own label.
   */
  mergeTagLabels?: Record<string, string>;
  /** Show the built-in formatting toolbar. Defaults to true. */
  toolbar?: boolean;
  /** Seed the editor from a serialized state (as produced by `getJson`). */
  initialContent?: string;
  /** Called on every edit with the current HTML + serialized state. */
  onChange?: (change: EditorChange) => void;
  /** Called when Lexical throws during an update. */
  onError?: (error: Error) => void;
  /**
   * Extra Lexical plugins/components rendered inside the composer, so they
   * have access to the editor context.
   */
  children?: ReactNode;
}

/** Captures the editor instance into a ref for the imperative handle. */
function EditorRefPlugin({
  editorRef,
}: {
  editorRef: React.MutableRefObject<LexicalEditor | null>;
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editorRef.current = editor;
    return () => {
      editorRef.current = null;
    };
  }, [editor, editorRef]);
  return null;
}

/** Emits `onChange` with Bootstrap Email HTML + serialized state on every edit. */
function ChangeEmitter({
  onChange,
}: {
  onChange: (change: EditorChange) => void;
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      onChange({
        html: toBootstrapEmailHtml(editor),
        json: JSON.stringify(editorState.toJSON()),
      });
    });
  }, [editor, onChange]);
  return null;
}

/**
 * The root WYSIWYG editor component: a rich-text surface with a Quill-style
 * toolbar (inline formatting, font sizing, colors, image / button / separator
 * insertion) and undo/redo history. Every block is a Bootstrap Email `<div>`.
 *
 * Get content out via `onChange` or the imperative `ref`; seed it with
 * `initialContent`.
 */
export const BootstrapEmailEditor = forwardRef<
  BootstrapEmailEditorHandle,
  BootstrapEmailEditorProps
>(function BootstrapEmailEditor(
  {
    placeholder,
    labels,
    mergeTags,
    mergeTagLabels,
    toolbar = true,
    initialContent,
    onChange,
    onError,
    children,
  },
  ref,
) {
  const editorRef = useRef<LexicalEditor | null>(null);
  // The `placeholder` prop wins; otherwise fall back to the (possibly
  // localized) label, then the English default.
  const resolvedPlaceholder =
    placeholder ?? labels?.placeholder ?? defaultLabels.placeholder;

  useImperativeHandle(
    ref,
    () => ({
      getHtml: (options) =>
        editorRef.current ? toBootstrapEmailHtml(editorRef.current, options) : "",
      getJson: () =>
        editorRef.current
          ? JSON.stringify(editorRef.current.getEditorState().toJSON())
          : "",
      focus: () => editorRef.current?.focus(),
      clear: () =>
        editorRef.current?.update(() => {
          $getRoot().clear();
        }),
      getEditor: () => editorRef.current,
    }),
    [],
  );

  const handleError = useCallback(
    (error: Error) => {
      if (onError) onError(error);
      else throw error;
    },
    [onError],
  );

  const initialConfig: InitialConfigType = {
    namespace: "bootstrap-email-wysiwyg",
    theme: bootstrapEmailTheme,
    editorState: initialContent,
    nodes: [
      ButtonNode,
      ImageNode,
      HrNode,
      LinkNode,
      BootstrapLinkNode,
      RowNode,
      ColumnNode,
      MergeTagNode,
      BootstrapParagraphNode,
      // Swap the core paragraph for our Bootstrap Email `<div>` variant.
      {
        replace: ParagraphNode,
        with: () => new BootstrapParagraphNode(),
        withKlass: BootstrapParagraphNode,
      },
      // Swap LinkNode so merge-tag hrefs (`{{key}}`) aren't https://-prefixed.
      {
        replace: LinkNode,
        with: (node: LinkNode) =>
          new BootstrapLinkNode(node.getURL(), {
            rel: node.getRel(),
            target: node.getTarget(),
            title: node.getTitle(),
          }),
        withKlass: BootstrapLinkNode,
      },
    ],
    onError: handleError,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <LabelsProvider labels={labels}>
      <MergeTagProvider mergeTags={mergeTags} labels={mergeTagLabels}>
      <GridSelectionProvider>
      <div className="bew-editor-shell">
        {toolbar && <Toolbar />}
        <div className="bew-editor-body">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="bew-content-editable" />
            }
            placeholder={
              <div className="bew-placeholder">{resolvedPlaceholder}</div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <GridControls />
        </div>
        <HistoryPlugin />
        <LinkPlugin validateUrl={isSafeLinkUrl} />
        <GridPlugin />
      </div>
      <EditorRefPlugin editorRef={editorRef} />
      {onChange && <ChangeEmitter onChange={onChange} />}
      {children}
      </GridSelectionProvider>
      </MergeTagProvider>
      </LabelsProvider>
    </LexicalComposer>
  );
});
