# bootstrap-email-wysiwyg

A [Lexical](https://lexical.dev)-based WYSIWYG editor for authoring
[Bootstrap Email](https://bootstrapemail.com) templates. You edit visually; it
outputs clean, class-based Bootstrap Email source HTML that you feed to the
Bootstrap Email compiler to produce bullet-proof, cross-client email markup.

- 🧱 **Bootstrap Email native** — every block is a `<div>`; colors, sizes,
  spacing, buttons, images and rules all emit real Bootstrap Email classes
  (`text-center`, `bg-blue-500`, `w-64`, `mt-5`, `btn btn-primary`, …).
- 🎨 **Full palette** — text / background / border color pickers over the
  complete Bootstrap Email color scale, plus custom colors.
- 🔤 **Type scale** — increase/decrease font size across `text-xs … text-7xl`.
- 🖼️ **Images & separators** — insert from URL with an inline settings gear
  (fluid / fixed / max-width sizing; optional link; configurable rule spacing).
- 🔘 **Buttons** — Bootstrap Email buttons with independent text/bg/border color
  and size; remembers your last styling.
- 🔗 **Inline links** — wrap selected text (or insert new link text) via a
  popover; bare domains get an `https://` prefix and unsafe schemes (e.g.
  `javascript:`) are rejected. Buttons and images link via their own href.
- 🔳 **Grid layout** — insert Bootstrap Email rows of columns (`row` /
  `col-N`). Add, remove, or resize columns and the widths auto-balance to
  always total 12 (e.g. `6·6` + one column → `4·4·4`; uneven counts pack as
  evenly as possible, like `2·2·2·3·3` for five). Select a column (click its
  top/bottom edge) to color the column itself — text / background / border
  land on the `col-N` div.
- 🔌 **Controlled or headless** — `onChange`, `initialContent` / `initialHtml`, an imperative
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
- [Importing HTML](#importing-html)
- [Compiling to email HTML](#compiling-to-email-html)
- [Component API](#component-api)
- [Imperative handle (ref)](#imperative-handle-ref)
- [Toolbar features](#toolbar-features)
- [Merge tags](#merge-tags)
- [Localization](#localization)
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
> To seed from HTML, use `initialHtml` (below).

### Seeding from HTML

If you store Bootstrap Email HTML rather than editor state, pass it as
`initialHtml` — the HTML this editor produced (`getHtml()` / `onChange().html`,
fragment or full document) is imported back into editable content:

```tsx
<BootstrapEmailEditor initialHtml={savedHtml} />
```

Or replace the content at any time through the `ref`:

```ts
ref.current?.setHtml(savedHtml);
```

Merge tags (`{{key}}`) come back as atomic tokens, and buttons, images, linked
images, separators, grid rows/columns, block and inline colors, font sizes and
alignment are all restored as editable nodes. Markup the editor can't model is
imported as plain rich text.

> JSON is still the lossless format — prefer `initialContent` when you control
> both ends. HTML is the interoperable one: use it when the stored template has
> to stay readable/portable, or was written outside the editor.

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

## Importing HTML

The inverse of the exporter, for use with a Lexical editor instance:

```ts
import { fromBootstrapEmailHtml } from "bootstrap-email-wysiwyg";

fromBootstrapEmailHtml(editor, html); // replaces the editor's content
```

`$nodesFromBootstrapEmailHtml(editor, html)` is also exported for building the
nodes yourself inside an `editor.update()` (e.g. to insert at the selection
instead of replacing everything). Both are **browser-only**, like the exporter.

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
| `placeholder`    | `string`                          | `"Start writing…"`   | Placeholder shown when empty. Wins over `labels.placeholder`.           |
| `labels`         | `Partial<EditorLabels>`           | `undefined`          | Override chrome strings for localization (see [Localization](#localization)). |
| `mergeTags`      | `MergeTag[]`                      | `undefined`          | Insertable `{{key}}` tokens; shows a toolbar dropdown (see [Merge tags](#merge-tags)). |
| `mergeTagLabels` | `Record<string, string>`          | `undefined`          | Per-key override of merge-tag display labels (localization).            |
| `toolbar`        | `boolean`                         | `true`               | Render the built-in formatting toolbar.                                 |
| `initialContent` | `string`                          | `undefined`          | Serialized editor state to seed the editor (see [Seeding](#seeding-content)). |
| `initialHtml`    | `string`                          | `undefined`          | Bootstrap Email HTML to seed the editor, applied once at mount. Ignored when `initialContent` is set. |
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
| `setHtml(html)`       | `(html: string) => void`                        | Replace the content with Bootstrap Email HTML.    |
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
| Insert         | Link, button, image (from URL), separator, grid                         | `<a href>`, `btn`, `img-fluid`, `<hr>`, `row`/`col-N` |
| Merge tags     | Insert a `{{key}}` token (dropdown; only when `mergeTags` is set)        | `{{key}}`                                 |

Colors apply to the selected text (as a span), the current block, or a focused
button, depending on the selection. The **link** button opens a popover:

- **Text selected** → wraps it in a link.
- **Empty cursor** → also asks for optional display text (defaults to the URL).
- **Cursor already in a link** → prefills the URL for editing; **Remove** unlinks.
- **Cursor inside a button** → sets the button's own `href` (a button is already
  an `<a>`, so it's never wrapped in a nested link).

Images and separators show an inline **gear** overlay for sizing / spacing; the
image gear also has a **Link** field that wraps the exported `<img>` in an `<a>`.

The **grid** button inserts a two-column row. The grid is then edited by hover:
pointing at a column reveals a pill at its top-right — a width stepper
(`−  6  +`) and a delete (`×`) — and a round `+` button centered on the row's
right edge adds a column. Every change re-balances the row so the column widths
always total 12 — adding a column to `6·6` yields `4·4·4`, widening one of
`4·4·4` to 6 yields `6·3·3`, and counts that don't divide evenly pack as close
as possible (five columns → `2·2·2·3·3`). A row holds at most 12 columns;
deleting the last one removes the row.

**Coloring a column:** click a column's top or bottom edge to **select** it —
it's highlighted and its pill stays pinned. While a column is selected, the
toolbar's text / background / border color pickers target the **column** (the
`col-N` div gets `text-*` / `bg-*` / `border-*` classes) instead of the content
inside it. Click inside the column body to deselect.

## Merge tags

Merge tags (a.k.a. variables / personalization fields) let users drop
`{{key}}` placeholders into the content for a backend to fill in later — e.g.
`Hi {{first_name}},`. Define them with the `mergeTags` prop; each has a `key`
(inserted as `{{key}}`) and a `label` (shown in the toolbar). The toolbar's
merge-tag dropdown appears **only when at least one tag is defined**.

```tsx
<BootstrapEmailEditor
  mergeTags={[
    { key: "first_name", label: "First name" },
    { key: "email", label: "Email" },
  ]}
/>
```

Each inserted tag is an **atomic token**: it's selected and deleted as a single
unit and can never be split down the middle, so `{{key}}` always reaches your
backend intact. Because it's still text under the hood, a tag takes all the
usual formatting — bold, color, font size — applied to the **whole** tag:

```html
<!-- {{first_name}} colored + bolded, exported: -->
<strong><span class="text-primary">{{first_name}}</span></strong>
```

**Tags inside buttons.** A tag can also be (part of) a button's label — insert
it with the cursor in the button, or select label text to replace it. The tag
stays inside the button and exports as
`<a class="btn …">{{first_name}}</a>`.

### Link merge tags

Flag a tag with `isLink: true` to mark it as resolving to a URL. Link tags get
a picker in the **link popover** (for text and button hrefs) and the **image
link** field, so `{{key}}` can be used as an href — inserted at the cursor, so
it works standalone (`{{cta_url}}`) or embedded (`https://x.co/{{tracking_id}}`).
Link tags also still appear in the regular content dropdown.

```tsx
<BootstrapEmailEditor
  mergeTags={[
    { key: "first_name", label: "First name" },
    { key: "cta_url", label: "CTA link", isLink: true },
  ]}
/>
```

A merge-tag href is kept **verbatim** — never `https://`-prefixed or otherwise
mangled — so the backend gets a clean `{{cta_url}}`:

```html
<a href="{{cta_url}}" class="btn btn-primary">Shop now</a>
<a href="{{cta_url}}">Read more</a>            <!-- inline text link -->
<a href="{{cta_url}}"><img src="…" class="img-fluid"></a>  <!-- image link -->
```

URL safety still applies to the surrounding text: `javascript:{{x}}` is rejected,
while `mailto:{{email}}` and `https://x.co/{{id}}` pass.

**Localizing labels.** Like [chrome strings](#localization), tag labels are
overridable without rebuilding the list — pass `mergeTagLabels`, a per-key map
that wins over each definition's `label` (missing keys keep the default):

```tsx
<BootstrapEmailEditor
  mergeTags={[{ key: "first_name", label: "First name" }]}
  mergeTagLabels={{ first_name: "Ad" }} // shown as "Ad" in the dropdown
/>
```

**Programmatic insert.** `insertMergeTag(editor, key)` inserts a tag at the
selection; standalone components can read the resolved list via `useMergeTags()`
(wrap them in `MergeTagProvider` when used outside `BootstrapEmailEditor`, same
as [`LabelsProvider`](#localization)).

```ts
import { insertMergeTag, type MergeTag } from "bootstrap-email-wysiwyg";

insertMergeTag(editor, "first_name"); // inserts {{first_name}}
```

| Export             | Type                                     | Use                                             |
| ------------------ | ---------------------------------------- | ----------------------------------------------- |
| `MergeTag`           | `interface`                              | A tag definition: `{ key, label, isLink? }`.    |
| `insertMergeTag`     | `(editor, key: string) => void`          | Insert a `{{key}}` token at the selection.      |
| `useMergeTags()`     | `() => MergeTag[]`                        | Read the resolved tags in a custom control.     |
| `MergeTagProvider`   | `({ mergeTags?, labels?, children }) => JSX.Element` | Supply tags around standalone components. |
| `MergeTagNode`       | `class` (+ `$createMergeTagNode`, `$isMergeTagNode`) | The token node, for advanced use.   |
| `MergeTagLinkPicker` | `({ onPick }) => JSX.Element`            | The link-tag picker; renders link tags only.    |
| `BootstrapLinkNode`  | `class`                                  | LinkNode variant that preserves `{{key}}` hrefs. |

## Localization

Only the **editor chrome** is localizable — toolbar tooltips, panel labels,
popover fields, prompts. The email **content** is your data and is never
translated; localizing what your users write is the consuming app's job.

The editor ships no i18n runtime and bundles no locale files. Instead, every
chrome string is a typed key on the `EditorLabels` interface, with English
`defaultLabels`. Pass a `Partial<EditorLabels>` to translate — plug in strings
from whatever i18n system you already use. Missing keys fall back to English, so
a partial override never breaks the UI.

```tsx
import { BootstrapEmailEditor, type EditorLabels } from "bootstrap-email-wysiwyg";

const tr: Partial<EditorLabels> = {
  placeholder: "E-postanızı yazmaya başlayın…",
  bold: "Kalın",
  italic: "İtalik",
  insertLink: "Bağlantı ekle",
  insertImage: "Görsel ekle",
};

<BootstrapEmailEditor labels={tr} />;
```

`EditorLabels` covers the full toolbar (undo/redo, font sizing, inline formats,
alignment, color pickers, insert buttons), the link popover, the image and
separator panels, and the grid controls — see the exported interface for the
complete key list. The `placeholder` prop, if set, wins over
`labels.placeholder`.

### Related exports

| Export                    | Type                                        | Use                                                        |
| ------------------------- | ------------------------------------------- | ---------------------------------------------------------- |
| `EditorLabels`            | `interface`                                 | The full set of chrome string keys.                        |
| `defaultLabels`           | `EditorLabels`                              | The English defaults — spread from these to build a locale. |
| `useLabels()`             | `() => EditorLabels`                        | Read the merged labels inside a custom control.            |
| `LabelsProvider`          | `({ labels?, children }) => JSX.Element`    | Supply labels around standalone components (see below).    |

When you render the exported components standalone (e.g. a
[headless toolbar](#headless--custom-toolbar)) rather than through
`BootstrapEmailEditor`, wrap them in `LabelsProvider` to localize them; without
a provider they use the English defaults. Custom controls of your own can read
the active labels with `useLabels()`.

```tsx
import { LabelsProvider, Toolbar, useLabels } from "bootstrap-email-wysiwyg";

<LabelsProvider labels={tr}>
  <Toolbar />
</LabelsProvider>;
```

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
  insertGrid,
  insertMergeTag,
  addGridColumn,
  removeGridColumn,
  adjustGridColumn,
  setColumnColor,
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

insertMergeTag(editor, "first_name"); // inserts the atomic token {{first_name}}

insertGrid(editor, 2);          // a row of N evenly-sized columns (default 2)
addGridColumn(editor);          // add a column to the current row, re-balance
removeGridColumn(editor);       // remove the current column (row if it's last)
adjustGridColumn(editor, 1);    // widen (+) / narrow (−) the current column
setColumnColor(editor, columnKey, "bg", "blue-500"); // color a column's own div

applyColor(editor, "text", "blue-500");  // "text" | "bg" | "border"; token or "#hex" or null to clear
adjustFontSize(editor, "increase");      // "increase" | "decrease"
```

The grid width math is exported as pure helpers too — `distributeSpans(n)`
(even split totalling 12) and `resizeSpans(spans, index, target)` (set one
column, re-balance the rest) — for building your own grid controls.

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
| `LinkNode`               | `<a href="…">` (inline text link)                     |
| `ImageNode`              | `<img class="img-fluid \| w-… \| max-w-…">`, optionally wrapped in `<a href>` (decorator) |
| `HrNode`                 | `<hr class="mt-… mb-…">` (decorator)                   |
| `RowNode`                | `<div class="row">` — grid row, holds only columns     |
| `ColumnNode`             | `<div class="col-N">` — grid column (N = width in 12ths), with optional own `text-*`/`bg-*`/`border-*` |

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
npx tsx scripts/verify-grid.mjs     # grid width math + row/column export
npx tsx scripts/verify-mergetag.mjs # merge-tag atomicity + clean {{key}} export
npx tsx scripts/verify-import.mjs   # HTML import + full export→import round-trip
npx tsx scripts/verify-mergetag-link.mjs # merge-tag hrefs on buttons/text/images
# …and verify-button / align / fontsize / image / hr / link
```

Only `dist/` is published; the `dev/` playground stays in the repo.

## Roadmap

- Configurable toolbar (feature flags), `readOnly` mode
- Lists (`<ul>` / `<ol>`)
- Controlled `value` prop
- Framework-agnostic core + Vue/Svelte/vanilla wrappers

## License

[MIT](./LICENSE)
