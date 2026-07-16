import { createContext, useContext, useMemo, type ReactNode } from "react";

/**
 * A consumer-defined merge tag. `key` is inserted into the text as `{{key}}`
 * for a backend to replace; `label` is the human-readable name shown in the
 * toolbar's merge-tag dropdown.
 */
export interface MergeTag {
  key: string;
  label: string;
  /**
   * The tag resolves to a URL. Link tags additionally appear in the merge-tag
   * pickers on the link popover and image link field (so `{{key}}` can be used
   * as an href). They still show in the regular content dropdown too.
   */
  isLink?: boolean;
}

const MergeTagContext = createContext<MergeTag[]>([]);

/**
 * Provides the resolved merge-tag list to the editor subtree; the toolbar reads
 * it via {@link useMergeTags}. `labels` optionally overrides each tag's display
 * label by key (for localization), mirroring the `EditorLabels` pattern —
 * missing keys keep the definition's own `label`.
 */
export function MergeTagProvider({
  mergeTags,
  labels,
  children,
}: {
  mergeTags?: MergeTag[];
  labels?: Record<string, string>;
  children: ReactNode;
}) {
  const value = useMemo<MergeTag[]>(() => {
    if (!mergeTags) return [];
    if (!labels) return mergeTags;
    return mergeTags.map((tag) =>
      labels[tag.key] ? { ...tag, label: labels[tag.key] } : tag,
    );
  }, [mergeTags, labels]);
  return (
    <MergeTagContext.Provider value={value}>
      {children}
    </MergeTagContext.Provider>
  );
}

/** The resolved merge tags available to the toolbar. Empty when none defined. */
export function useMergeTags(): MergeTag[] {
  return useContext(MergeTagContext);
}
