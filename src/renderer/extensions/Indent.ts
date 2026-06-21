import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockIndent: {
      /** Increase block indentation by one level. */
      indent: () => ReturnType;
      /** Decrease block indentation by one level. */
      outdent: () => ReturnType;
    };
  }
}

const MAX_INDENT = 8;
const INDENT_STEP_EM = 2;

function clampLevel(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(MAX_INDENT, Math.round(value));
}

/**
 * Direction-aware block indentation stored as a `data-indent` level on
 * paragraphs/headings. Rendered with the logical `margin-inline-start`, so the
 * indent grows on the right for RTL blocks and on the left for LTR blocks
 * automatically — no separate handling per direction.
 */
export const Indent = Extension.create({
  name: "blockIndent",

  addOptions() {
    return {
      types: ["paragraph", "heading"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          "data-indent": {
            default: 0,
            parseHTML: (element) =>
              clampLevel(parseInt(element.getAttribute("data-indent") ?? "0", 10)),
            renderHTML: (attributes) => {
              const level = clampLevel(
                Number((attributes as Record<string, unknown>)["data-indent"]),
              );
              if (level <= 0) {
                return {};
              }
              return {
                "data-indent": String(level),
                style: `margin-inline-start: ${level * INDENT_STEP_EM}em`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    const types = this.options.types as string[];

    const currentLevel = (): number => {
      for (const type of types) {
        const value = this.editor.getAttributes(type)["data-indent"];
        if (value !== undefined && value !== null) {
          return clampLevel(Number(value));
        }
      }
      return 0;
    };

    return {
      indent:
        () =>
        ({ chain }) => {
          const next = clampLevel(currentLevel() + 1);
          let pipeline = chain().focus();
          for (const type of types) {
            pipeline = pipeline.updateAttributes(type, { "data-indent": next });
          }
          return pipeline.run();
        },
      outdent:
        () =>
        ({ chain }) => {
          const next = clampLevel(currentLevel() - 1);
          let pipeline = chain().focus();
          for (const type of types) {
            pipeline = pipeline.updateAttributes(type, { "data-indent": next });
          }
          return pipeline.run();
        },
    };
  },
});
