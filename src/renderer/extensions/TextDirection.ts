import { Extension } from "@tiptap/core";

export type TextDir = "rtl" | "ltr";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockDirection: {
      /** Set base direction (and matching alignment) on the current block(s). */
      setBlockDirection: (dir: TextDir) => ReturnType;
      /** Clear an explicit direction, falling back to the document direction. */
      unsetBlockDirection: () => ReturnType;
    };
  }
}

function isDir(value: string | null): value is TextDir {
  return value === "rtl" || value === "ltr";
}

/**
 * Per-block base direction for paragraphs/headings, stored as a `dir` attribute.
 * Setting `dir` makes the browser's bidi algorithm order mixed Arabic/English
 * runs correctly without breaking visual order. Code blocks keep their own
 * `dir` attribute (handled in CustomCodeBlock) — direction only, no rich text.
 */
export const TextDirection = Extension.create({
  name: "textDirection",

  addOptions() {
    // Lists are included so the marker (bullet/number) follows the text:
    // setting dir on the <ul>/<ol> flips the logical list padding side.
    return {
      types: ["paragraph", "heading", "bulletList", "orderedList", "listItem"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          dir: {
            default: null,
            parseHTML: (element) => {
              const value = element.getAttribute("dir");
              return isDir(value) ? value : null;
            },
            renderHTML: (attributes) => {
              const value = (attributes as Record<string, string>).dir;
              return isDir(value) ? { dir: value } : {};
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setBlockDirection:
        (dir: TextDir) =>
        ({ chain }) => {
          if (!isDir(dir)) {
            return false;
          }
          // dir + matching alignment so English inside an Arabic block keeps
          // correct visual order. updateAttributes on a non-active type is a
          // no-op, so this safely targets only the current block.
          return chain()
            .focus()
            .updateAttributes("paragraph", { dir })
            .updateAttributes("heading", { dir })
            .updateAttributes("bulletList", { dir })
            .updateAttributes("orderedList", { dir })
            .updateAttributes("listItem", { dir })
            .updateAttributes("codeBlock", { dir })
            .setTextAlign(dir === "rtl" ? "right" : "left")
            .run();
        },
      unsetBlockDirection:
        () =>
        ({ chain }) =>
          chain()
            .focus()
            .updateAttributes("paragraph", { dir: null })
            .updateAttributes("heading", { dir: null })
            .updateAttributes("bulletList", { dir: null })
            .updateAttributes("orderedList", { dir: null })
            .updateAttributes("listItem", { dir: null })
            .run(),
    };
  },
});
