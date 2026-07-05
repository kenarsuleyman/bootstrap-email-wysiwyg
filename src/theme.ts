import type { EditorThemeClasses } from "lexical";

/**
 * Maps Lexical node types to CSS class names. These classes are styled in
 * `editor.css`. Keeping the theme separate lets consumers override styling
 * without touching editor logic.
 */
export const bootstrapEmailTheme: EditorThemeClasses = {
  paragraph: "bew-paragraph",
  text: {
    bold: "bew-text-bold",
    italic: "bew-text-italic",
    underline: "bew-text-underline",
    strikethrough: "bew-text-strikethrough",
  },
};
