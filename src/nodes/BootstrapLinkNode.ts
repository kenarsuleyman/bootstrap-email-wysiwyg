import { LinkNode } from "@lexical/link";
import type { SerializedLinkNode } from "@lexical/link";

/**
 * A {@link LinkNode} that keeps merge-tag URLs verbatim. The base LinkNode runs
 * every href through `formatUrl`, which prefixes a schemeless URL with
 * `https://` — turning a bare `{{key}}` href into `https://{{key}}` and breaking
 * the server-side substitution. Here a URL that starts with a merge tag is left
 * untouched; everything else keeps the base sanitization (including the
 * `about:blank` fallback for unsafe protocols).
 *
 * Registered as a replacement for LinkNode, so every link the editor creates
 * (toolbar, paste, …) is one of these. It still `instanceof LinkNode`, so
 * `$isLinkNode` and the `@lexical/link` plugin keep working.
 */
export class BootstrapLinkNode extends LinkNode {
  static getType(): string {
    return "bootstrap-link";
  }

  static clone(node: BootstrapLinkNode): BootstrapLinkNode {
    return new BootstrapLinkNode(
      node.__url,
      { rel: node.__rel, target: node.__target, title: node.__title },
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedLinkNode): BootstrapLinkNode {
    return new BootstrapLinkNode().updateFromJSON(serializedNode);
  }

  exportJSON(): SerializedLinkNode {
    return {
      ...super.exportJSON(),
      type: "bootstrap-link",
      version: 1,
    };
  }

  sanitizeUrl(url: string): string {
    // Merge-tag URLs resolve to a real link server-side; keep them intact.
    if (url.startsWith("{{")) return url;
    return super.sanitizeUrl(url);
  }
}
