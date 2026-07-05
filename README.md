# bootstrap-email-wysiwyg

A [Lexical](https://lexical.dev)-based WYSIWYG editor for authoring
[Bootstrap Email](https://bootstrap-email.com) templates. You edit visually; it
outputs clean, class-based Bootstrap Email source HTML that you feed to the
Bootstrap Email compiler to produce bullet-proof, cross-client email markup.

- 🧱 **Bootstrap Email native** — every block is a `<div>`; colors, sizes,
  spacing, buttons, images and rules all emit real Bootstrap Email classes
  (`text-center`, `bg-blue-500`, `w-64`, `mt-5`, `btn btn-primary`, …).
- 🎨 **Full palette** — text / background / border color pickers over the
  complete Bootstrap Email color scale, plus custom colors.
- 🔤 **Type scale** — increase/decrease font size across `text-xs … text-7xl`.
- 🖼️ **Images & separators** — insert from URL with an inline settings gear
  (fluid / fixed / max-width sizing; configurable rule spacing).
- 🔘 **Buttons** — Bootstrap Email buttons with independent text/bg/border color
  and size; remembers your last styling.
- 🔌 **Controlled or headless** — `onChange`, `initialContent`, an imperative
  `ref`, and framework-free command functions for building your own UI.
- 📦 **Typed** — ships TypeScript declarations.

> **Status:** pre-1.0 (`0.0.0`). The API is usable and covered by tests, but may
> still change before a stable release.

---

## Table of contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Styling](#styling)
- [Getting content out](#getting-content-out)
- [Seeding content](#seeding-content)
- [Exporting HTML](#exporting-html)
- [Compiling to email HTML](#compiling-to-email-html)
- [Component API](#component-api)
- [Imperative handle (ref)](#imperative-handle-ref)
- [Toolbar features](#toolbar-features)
- [Headless / custom toolbar](#headless--custom-toolbar)
- [Programmatic commands](#programmatic-commands)
- [How it works](#how-it-works)
- [Framework support](#framework-support)
- [Development](#development)
- [Roadmap](#roadmap)
- [License](#license)

---

## Installation

```sh
npm install bootstrap-email-wysiwyg
```

`react` and `react-dom` (>= 18) are **peer dependencies** — install them in your
app if you haven't already:

```sh
npm install react react-dom
```

## Quick start

```tsx
import { BootstrapEmailEditor } from "bootstrap-email-wysiwyg";
import "bootstrap-email-wysiwyg/styles.css";

export function MyEditor() {
  return <BootstrapEmailEditor placeholder="Compose your email…" />;
}
```

That renders the editor with the built-in toolbar. To do anything with the
content, read [Getting content out](#getting-content-out).

## Styling

The editor ships a single stylesheet for its chrome (toolbar, pickers, image /
rule overlays) and a light in-editor preview of the Bootstrap Email classes.
**Import it once** in your app:

```ts
import "bootstrap-email-wysiwyg/styles.css";
```

> The stylesheet only styles the **editing surface**. Your final email is styled
> by the Bootstrap Email compiler, not by this CSS.

## Getting content out

The editor is uncontrolled by default. Get its content two ways:

### `onChange` (fires on every edit)

```tsx
import { BootstrapEmailEditor, type EditorChange } from "bootstrap-email-wysiwyg";

function Editor() {
  const handleChange = ({ html, json }: EditorChange) => {
    // `html` — Bootstrap Email source (content fragment)
    // `json` — serialized editor state, for persistence / initialContent
    console.log(html);
  };

  return <BootstrapEmailEditor onChange={handleChange} />;
}
```

### Imperative `ref` (on demand)

```tsx
import { useRef } from "react";
import {
  BootstrapEmailEditor,
  type BootstrapEmailEditorHandle,
} from "bootstrap-email-wysiwyg";

function Editor() {
  const ref = useRef<BootstrapEmailEditorHandle>(null);

  const save = () => {
    const html = ref.current?.getHtml();              // fragment
    const doc = ref.current?.getHtml({ document: true }); // full document
    const state = ref.current?.getJson();             // for reloading later
    // …persist state / send html…
  };

  return (
    <>
      <BootstrapEmailEditor ref={ref} />
      <button onClick={save}>Save</button>
    </>
  );
}
```

## Seeding content

Pass a previously saved state (from `getJson()` or `onChange().json`) as
`initialContent`. This is applied once, at mount (default-value semantics — it is
**not** a controlled `value`).

```tsx
<BootstrapEmailEditor initialContent={savedJson} />
```

> `initialContent` accepts the **serialized editor-state JSON**, not raw HTML.
> JSON round-trips losslessly; HTML seeding is on the roadmap.

## Exporting HTML

Use the component `ref`/`onChange`, or call the exporter directly with a Lexical
editor instance:

```ts
import { toBootstrapEmailHtml } from "bootstrap-email-wysiwyg";

toBootstrapEmailHtml(editor);                     // content fragment (default)
toBootstrapEmailHtml(editor, { document: true }); // full <!DOCTYPE html> document
toBootstrapEmailHtml(editor, { pretty: false });  // compact, single line
```

**Fragment** output (default):

```html
<div class="text-center text-blue-500">Hello world</div>
<div class="ax-center"><a href="#" class="btn btn-primary">Shop now</a></div>
<img src="https://…/logo.png" alt="Logo" class="img-fluid">
<hr class="mt-5 mb-5">
```

**Document** output (`{ document: true }`) wraps the fragment in a minimal HTML
email document with a `.container`, ready for the compiler.

| Option     | Type      | Default | Description                                            |
| ---------- | --------- | ------- | ------------------------------------------------------ |
| `document` | `boolean` | `false` | Wrap the content in a full HTML email document.        |
| `pretty`   | `boolean` | `true`  | Pretty-print with indentation (`false` = single line). |

> `toBootstrapEmailHtml` and `cleanBootstrapHtml` use the DOM and are
> **browser-only** (call them client-side, not during SSR).

## Compiling to email HTML

This editor produces **Bootstrap Email source** — semantic HTML with Bootstrap
Email utility classes. To turn it into final, table-based, cross-client email
HTML, run the output through the [Bootstrap Email](https://bootstrap-email.com)
compiler (the Ruby gem or a compatible port):

```
editor  →  toBootstrapEmailHtml({ document: true })  →  bootstrap-email compile  →  send
```

## Component API

```tsx
import { BootstrapEmailEditor } from "bootstrap-email-wysiwyg";
```

| Prop             | Type                              | Default              | Description                                                             |
| ---------------- | --------------------------------- | -------------------- | ----------------------------------------------------------------------- |
| `placeholder`    | `string`                          | `"Start writing…"`   | Placeholder shown when empty.                                           |
| `toolbar`        | `boolean`                         | `true`               | Render the built-in formatting toolbar.                                 |
| `initialContent` | `string`                          | `undefined`          | Serialized editor state to seed the editor (see [Seeding](#seeding-content)). |
| `onChange`       | `(change: EditorChange) => void`  | `undefined`          | Called on every edit with `{ html, json }`.                             |
| `onError`        | `(error: Error) => void`          | `undefined`          | Called when Lexical throws (defaults to rethrow).                       |
| `children`       | `ReactNode`                       | `undefined`          | Extra plugins/components rendered **inside** the editor context.        |

```ts
interface EditorChange {
  html: string; // Bootstrap Email source (fragment)
  json: string; // serialized editor state
}
```

## Imperative handle (ref)

Attach a `ref` of type `BootstrapEmailEditorHandle`:

| Method                | Signature                                       | Description                                       |
| --------------------- | ----------------------------------------------- | ------------------------------------------------- |
| `getHtml(options?)`   | `(options?: BootstrapEmailHtmlOptions) => string` | Export Bootstrap Email HTML (fragment or document). |
| `getJson()`           | `() => string`                                  | Serialized editor state, for `initialContent`.    |
| `focus()`             | `() => void`                                    | Focus the editor.                                 |
| `clear()`             | `() => void`                                    | Remove all content.                               |
| `getEditor()`         | `() => LexicalEditor \| null`                   | The underlying Lexical editor, for advanced use.  |

## Toolbar features

| Group          | Controls                                                                 | Emits                                    |
| -------------- | ------------------------------------------------------------------------ | ---------------------------------------- |
| History        | Undo / redo                                                              | —                                        |
| Font size      | Decrease / increase across the type scale                                | `text-xs … text-7xl`                     |
| Inline         | Bold, italic, underline, strikethrough                                   | `<strong>` `<em>` `<u>` `<s>`            |
| Alignment      | Left, center, right, justify                                             | `text-*` (or `ax-*` for buttons)         |
| Colors         | Text, background, border (buttons) — palette + custom                    | `text-*`, `bg-*`, `border-*`             |
| Insert         | Button, image (from URL), separator                                      | `btn`, `img-fluid`, `<hr>`               |

Colors apply to the selected text (as a span), the current block, or a focused
button, depending on the selection. Images and separators show an inline **gear**
overlay for sizing / spacing.

## Headless / custom toolbar

Turn off the built-in toolbar and build your own. Components passed as `children`
render **inside** the editor context, so `useLexicalComposerContext()` and the
command functions work:

```tsx
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { BootstrapEmailEditor, insertButton } from "bootstrap-email-wysiwyg";

function MyToolbar() {
  const [editor] = useLexicalComposerContext();
  return (
    <button onClick={() => insertButton(editor, { label: "Buy", variant: "success" })}>
      Add button
    </button>
  );
}

<BootstrapEmailEditor toolbar={false}>
  <MyToolbar />
</BootstrapEmailEditor>;
```

The prebuilt `Toolbar` component is also exported if you want to place it
yourself.

## Programmatic commands

All commands are framework-free and take a Lexical editor (via `ref.getEditor()`
or `useLexicalComposerContext()`):

```ts
import {
  insertButton,
  insertImage,
  insertHr,
  applyColor,
  adjustFontSize,
} from "bootstrap-email-wysiwyg";

insertButton(editor, {
  label: "Shop now",
  href: "https://example.com",
  variant: "primary",     // primary | secondary | success | danger | warning | info | light | dark
  outline: false,
  // optional overrides (palette token or "#hex"):
  textColor: null,
  bgColor: "green-500",
  borderColor: null,
  fontSize: null,         // "xs" … "7xl"
});

insertImage(editor, {
  src: "https://example.com/logo.png",
  alt: "Logo",
  mode: "fluid",          // fluid | fixed | max
  width: null,            // size key, e.g. "64" (256px)
  height: null,
});

insertHr(editor, { top: "5", bottom: "5" }); // margin keys (mt-5 / mb-5 = 20px)

applyColor(editor, "text", "blue-500");  // "text" | "bg" | "border"; token or "#hex" or null to clear
adjustFontSize(editor, "increase");      // "increase" | "decrease"
```

`$`-prefixed variants (`$applyColor`, `$adjustFontSize`) run inside an existing
`editor.update()` if you're composing your own updates.

Color, size, and spacing scales are exported too (`BASE_COLORS`,
`COLOR_FAMILIES`, `FONT_SIZE_KEYS`, `SIZE_STEPS`, `MARGIN_STEPS`), along with the
conversion helpers (`tokenToClass`, `hexToToken`, `fontSizeClass`, …) — handy for
building custom pickers.

## How it works

The editor is built on [Lexical](https://lexical.dev). Custom nodes map the
document to Bootstrap Email markup:

| Node                     | Renders / exports as                                  |
| ------------------------ | ----------------------------------------------------- |
| `BootstrapParagraphNode` | `<div>` line, with alignment/color/size classes       |
| `ButtonNode`             | `<a class="btn btn-…">` (inline)                       |
| `ImageNode`              | `<img class="img-fluid \| w-… \| max-w-…">` (decorator) |
| `HrNode`                 | `<hr class="mt-… mb-…">` (decorator)                   |

On export, Lexical's raw HTML is cleaned (text-wrapper spans removed) and inline
colors/sizes are converted to Bootstrap Email classes. Editor state serializes to
JSON for persistence.

## Framework support

Currently **React-first** — the editor and toolbar are built on
`@lexical/react`. The logic layer (nodes, commands, color/size/spacing scales,
export) is already framework-free, and a framework-agnostic core with thin
per-framework wrappers is on the roadmap. If you use another framework today, the
command functions and `toBootstrapEmailHtml` are usable, but you'd wire the mount
and UI yourself.

## Development

This repo contains the library (`src/`) and a live playground (`dev/`) that
imports it directly, so changes hot-reload.

```sh
npm install     # install dependencies
npm run dev     # start the playground (editor + live source preview)
npm run build   # build the publishable library into dist/
npm run typecheck
```

Behavior is covered by headless verification scripts:

```sh
npx tsx scripts/verify-export.mjs   # export API + JSON round-trip
npx tsx scripts/verify-color.mjs    # color apply + class output
# …and verify-button / align / fontsize / image / hr
```

Only `dist/` is published; the `dev/` playground stays in the repo.

## Roadmap

- Configurable toolbar (feature flags), `readOnly` mode
- Inline links and lists (`<ul>` / `<ol>`)
- Controlled `value` and HTML seeding / import
- Framework-agnostic core + Vue/Svelte/vanilla wrappers

## License

[MIT](./LICENSE)
