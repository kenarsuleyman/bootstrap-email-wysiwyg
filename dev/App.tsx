import { useCallback, useEffect, useRef, useState } from "react";

// Import straight from source so edits to the library hot-reload in the demo.
import {
  BootstrapEmailEditor,
  type BootstrapEmailEditorHandle,
  type MergeTag,
} from "../src";

// A few sample merge tags so the toolbar's merge-tag dropdown is exercised.
// The `isLink` ones also show in the link popover / image link pickers.
const MERGE_TAGS: MergeTag[] = [
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "email", label: "Email" },
  { key: "company", label: "Company" },
  { key: "profile_url", label: "Profile URL", isLink: true },
  { key: "unsubscribe_url", label: "Unsubscribe URL", isLink: true },
];

export function App() {
  const editorRef = useRef<BootstrapEmailEditorHandle>(null);
  const [fullDocument, setFullDocument] = useState(false);
  const [source, setSource] = useState("");
  const [copied, setCopied] = useState(false);

  // Recompute the shown source from the editor (used on edit and toggle change).
  const refresh = useCallback(() => {
    setSource(editorRef.current?.getHtml({ document: fullDocument }) ?? "");
  }, [fullDocument]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const copy = () => {
    void navigator.clipboard?.writeText(source);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  // Feed the shown source back in — the export → import round-trip, by hand.
  const reimport = () => editorRef.current?.setHtml(source);

  return (
    <main className="demo-shell">
      <header className="demo-header">
        <h1>bootstrap-email-wysiwyg</h1>
        <p>Edit on the left — Bootstrap Email source updates live on the right.</p>
      </header>

      <div className="demo-layout">
        <section className="demo-pane">
          <div className="demo-pane-title">Editor</div>
          <BootstrapEmailEditor
            ref={editorRef}
            onChange={refresh}
            mergeTags={MERGE_TAGS}
          />
        </section>

        <section className="demo-pane">
          <div className="demo-pane-title">
            <span>Bootstrap Email source</span>
            <span className="demo-pane-actions">
              <label className="demo-toggle">
                <input
                  type="checkbox"
                  checked={fullDocument}
                  onChange={(e) => setFullDocument(e.target.checked)}
                />
                Full document
              </label>
              <button type="button" className="demo-copy" onClick={reimport}>
                Re-import
              </button>
              <button type="button" className="demo-copy" onClick={copy}>
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </span>
          </div>
          <pre className="demo-output">
            <code>{source || "<!-- start typing to see the output -->"}</code>
          </pre>
        </section>
      </div>
    </main>
  );
}
