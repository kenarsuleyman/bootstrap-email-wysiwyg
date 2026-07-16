import { $applyNodeReplacement, TextNode } from "lexical";
import type {
  EditorConfig,
  LexicalNode,
  SerializedTextNode,
  Spread,
} from "lexical";

export type SerializedMergeTagNode = Spread<
  { mergeKey: string },
  SerializedTextNode
>;

/**
 * An atomic `{{key}}` merge tag. It's a {@link TextNode} in *token mode*
 * (`__mode === 1`), so the whole tag is inserted, selected, and deleted as one
 * unit and can never break into pieces — the backend that later swaps `{{key}}`
 * for a value relies on it staying intact. Being a TextNode, it still takes all
 * inline styling (bold, color, font size, …) exactly like normal text, and
 * exports as the literal `{{key}}`.
 */
export class MergeTagNode extends TextNode {
  __mergeKey: string;

  constructor(mergeKey: string, key?: string) {
    super(`{{${mergeKey}}}`, key);
    this.__mergeKey = mergeKey;
    // IS_TOKEN = 1: indivisible, never split by the caret and never merged
    // with an adjacent text node.
    this.__mode = 1;
  }

  static getType(): string {
    return "merge-tag";
  }

  static clone(node: MergeTagNode): MergeTagNode {
    // Custom fields must be passed here; format/style/mode/text are carried
    // over by TextNode.afterCloneFrom.
    return new MergeTagNode(node.__mergeKey, node.__key);
  }

  static importJSON(serializedNode: SerializedMergeTagNode): MergeTagNode {
    return $createMergeTagNode(serializedNode.mergeKey).updateFromJSON(
      serializedNode,
    );
  }

  exportJSON(): SerializedMergeTagNode {
    return {
      ...super.exportJSON(),
      type: "merge-tag",
      version: 1,
      mergeKey: this.__mergeKey,
    };
  }

  /** The bare key (without braces), e.g. `first_name` for `{{first_name}}`. */
  getMergeKey(): string {
    return this.getLatest().__mergeKey;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    // Editor-only chip styling; the `bew-` class is stripped on export.
    dom.classList.add("bew-merge-tag");
    return dom;
  }
}

/** Create an atomic `{{mergeKey}}` merge-tag node. */
export function $createMergeTagNode(mergeKey: string): MergeTagNode {
  return $applyNodeReplacement(new MergeTagNode(mergeKey));
}

export function $isMergeTagNode(
  node: LexicalNode | null | undefined,
): node is MergeTagNode {
  return node instanceof MergeTagNode;
}
