import { Extension } from "@tiptap/core";
import { mergeAttributes } from "@tiptap/react";
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
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ chain, commands }) => {
          if (!LINE_HEIGHT_VALUES.includes(lineHeight as typeof LINE_HEIGHT_VALUES[number])) {
            return chain.focus().run();
          }
          return (
            chain()
              .setMark("textStyle", { "data-line-height": lineHeight })
              .updateAttributes("paragraph", { "data-line-height": lineHeight })
              .updateAttributes("heading", { "data-line-height": lineHeight })
              .run()
          );
        },
      unsetLineHeight:
        () =>
        ({ chain, commands }) => {
          return (
            chain()
              .unsetMark("textStyle", "data-line-height")
              .updateAttributes("paragraph", { "data-line-height": null })
              .updateAttributes("heading", { "data-line-height": null })
              .run()
          );
        },
    };
  },
});
