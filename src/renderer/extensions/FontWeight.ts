import { Extension } from "@tiptap/core";
import "@tiptap/extension-text-style";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontWeight: {
      /**
       * Set the font weight
       */
      setFontWeight: (weight: string) => ReturnType;
      /**
       * Unset the font weight
       */
      unsetFontWeight: () => ReturnType;
    };
  }
}

export const FontWeight = Extension.create({
  name: "fontWeight",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontWeight: {
            default: null,
            parseHTML: (element) => element.style.fontWeight?.replace(/['"]+/g, ""),
            renderHTML: (attributes) => {
              if (!attributes.fontWeight) {
                return {};
              }
              return {
                style: `font-weight: ${attributes.fontWeight}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontWeight:
        (fontWeight: string) =>
        ({ chain }) => {
          return chain().setMark("textStyle", { fontWeight }).run();
        },
      unsetFontWeight:
        () =>
        ({ chain }) => {
          return chain()
            .setMark("textStyle", { fontWeight: null })
            .removeEmptyTextStyle()
            .run();
        },
    };
  },
});
