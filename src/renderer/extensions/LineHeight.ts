import { Extension } from "@tiptap/core";
import "@tiptap/extension-text-style";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    lineHeight: {
      /**
       * Set the line height
       */
      setLineHeight: (height: string) => ReturnType;
      /**
       * Unset the line height
       */
      unsetLineHeight: () => ReturnType;
    };
  }
}

const LINE_HEIGHT_VALUES = ["1.0", "1.25", "1.5", "1.75", "2.0"] as const;

export const LineHeight = Extension.create({
  name: "lineHeight",

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
          "data-line-height": {
            default: null,
            parseHTML: (element) => element.getAttribute("data-line-height") || null,
            renderHTML: (attributes) => {
              const value = (attributes as Record<string, string>)[`data-line-height`];
              if (!value || !LINE_HEIGHT_VALUES.includes(value as typeof LINE_HEIGHT_VALUES[number])) {
                return {};
              }
              return {
                "data-line-height": value,
                style: `line-height: ${value}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    // ponytail: line-height is a block attribute on paragraph/heading only.
    // No textStyle mark — keeps code blocks and RTL inline runs untouched.
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ chain }) => {
          if (!LINE_HEIGHT_VALUES.includes(lineHeight as typeof LINE_HEIGHT_VALUES[number])) {
            return false;
          }
          return chain()
            .focus()
            .updateAttributes("paragraph", { "data-line-height": lineHeight })
            .updateAttributes("heading", { "data-line-height": lineHeight })
            .run();
        },
      unsetLineHeight:
        () =>
        ({ chain }) =>
          chain()
            .focus()
            .updateAttributes("paragraph", { "data-line-height": null })
            .updateAttributes("heading", { "data-line-height": null })
            .run(),
    };
  },
});
