import { $applyNodeReplacement, DecoratorNode } from "lexical";
import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import type { ReactNode } from "react";

import { imageClasses, parseImageClasses, type ImageMode } from "../imageSize";
import { ImageComponent } from "./ImageComponent";

export interface ImagePayload {
  src: string;
  alt?: string;
  mode?: ImageMode;
  width?: string | null;
  height?: string | null;
  /** Optional link — wraps the exported `<img>` in an `<a href>`. */
  link?: string;
  key?: NodeKey;
}

export type SerializedImageNode = Spread<
  {
    src: string;
    alt: string;
    mode: ImageMode;
    width: string | null;
    height: string | null;
    link: string;
  },
  SerializedLexicalNode
>;

/**
 * A Bootstrap Email image (`<img>` from a URL). Sizing is one of three modes:
 * fluid (`img-fluid`), fixed (`w-*`/`h-*`), or max-width (`max-w-* w-full`).
 * Rendered as a decorator so the editor can show a settings (gear) overlay.
 */
export class ImageNode extends DecoratorNode<ReactNode> {
  __src: string;
  __alt: string;
  __mode: ImageMode;
  __width: string | null;
  __height: string | null;
  __link: string;

  static getType(): string {
    return "bootstrap-image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__alt,
      node.__mode,
      node.__width,
      node.__height,
      node.__link,
      node.__key,
    );
  }

  constructor(
    src: string,
    alt = "",
    mode: ImageMode = "fluid",
    width: string | null = null,
    height: string | null = null,
    link = "",
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__alt = alt;
    this.__mode = mode;
    this.__width = width;
    this.__height = height;
    this.__link = link;
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    return $createImageNode({
      src: serializedNode.src,
      alt: serializedNode.alt,
      mode: serializedNode.mode,
      width: serializedNode.width,
      height: serializedNode.height,
      link: serializedNode.link ?? "",
    });
  }

  exportJSON(): SerializedImageNode {
    return {
      type: "bootstrap-image",
      version: 1,
      src: this.__src,
      alt: this.__alt,
      mode: this.__mode,
      width: this.__width,
      height: this.__height,
      link: this.__link,
    };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({ conversion: $convertImageElement, priority: 0 }),
    };
  }

  exportDOM(): DOMExportOutput {
    const img = document.createElement("img");
    img.setAttribute("src", this.__src);
    img.setAttribute("alt", this.__alt);
    img.className = imageClasses(this.__mode, this.__width, this.__height).join(
      " ",
    );

    // A linked image is wrapped in an anchor in the exported email HTML.
    const link = this.__link.trim();
    if (link) {
      const anchor = document.createElement("a");
      anchor.setAttribute("href", link);
      anchor.appendChild(img);
      return { element: anchor };
    }
    return { element: img };
  }

  // --- Accessors -----------------------------------------------------------

  getSrc(): string {
    return this.getLatest().__src;
  }

  setSrc(src: string): this {
    const writable = this.getWritable();
    writable.__src = src;
    return writable;
  }

  getAlt(): string {
    return this.getLatest().__alt;
  }

  setAlt(alt: string): this {
    const writable = this.getWritable();
    writable.__alt = alt;
    return writable;
  }

  getMode(): ImageMode {
    return this.getLatest().__mode;
  }

  setMode(mode: ImageMode): this {
    const writable = this.getWritable();
    writable.__mode = mode;
    return writable;
  }

  getWidth(): string | null {
    return this.getLatest().__width;
  }

  setWidth(width: string | null): this {
    const writable = this.getWritable();
    writable.__width = width;
    return writable;
  }

  getHeight(): string | null {
    return this.getLatest().__height;
  }

  setHeight(height: string | null): this {
    const writable = this.getWritable();
    writable.__height = height;
    return writable;
  }

  getLink(): string {
    return this.getLatest().__link;
  }

  setLink(link: string): this {
    const writable = this.getWritable();
    writable.__link = link;
    return writable;
  }

  // --- Rendering -----------------------------------------------------------

  createDOM(): HTMLElement {
    const div = document.createElement("div");
    div.className = "bew-image-block";
    return div;
  }

  updateDOM(): boolean {
    return false;
  }

  isInline(): boolean {
    return false;
  }

  decorate(): ReactNode {
    return (
      <ImageComponent
        nodeKey={this.getKey()}
        src={this.__src}
        alt={this.__alt}
        mode={this.__mode}
        width={this.__width}
        height={this.__height}
        link={this.__link}
      />
    );
  }
}

function $convertImageElement(domNode: HTMLElement): DOMConversionOutput | null {
  const img = domNode as HTMLImageElement;
  const src = img.getAttribute("src");
  if (!src) return null;
  const alt = img.getAttribute("alt") ?? "";
  const { mode, width, height } = parseImageClasses(Array.from(img.classList));
  // An <img> wrapped in an <a> carries its link on the parent anchor.
  const parent = img.parentElement;
  const link =
    parent && parent.tagName === "A"
      ? (parent.getAttribute("href") ?? "")
      : "";
  return { node: $createImageNode({ src, alt, mode, width, height, link }) };
}

export function $createImageNode(payload: ImagePayload): ImageNode {
  const {
    src,
    alt = "",
    mode = "fluid",
    width = null,
    height = null,
    link = "",
    key,
  } = payload;
  return $applyNodeReplacement(
    new ImageNode(src, alt, mode, width, height, link, key),
  );
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}
