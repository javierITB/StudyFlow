import { Extension, Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textColor: {
      setColor: (color: string) => ReturnType;
      unsetColor: () => ReturnType;
    };
    highlight: {
      setHighlight: (attributes?: { color: string }) => ReturnType;
      toggleHighlight: (attributes?: { color: string }) => ReturnType;
      unsetHighlight: () => ReturnType;
    };
  }
}

export const TextColor = Extension.create({
  name: 'textColor',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          color: {
            default: null,
            parseHTML: (element) => element.style.color?.replace(/['"]+/g, '') || null,
            renderHTML: (attributes) => {
              if (!attributes.color) {
                return {};
              }
              return {
                style: `color: ${attributes.color}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setColor:
        (color: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { color }).run();
        },
      unsetColor:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { color: null }).removeEmptyTextStyle().run();
        },
    };
  },
});

export const AcademicHighlight = Mark.create({
  name: 'highlight',

  addOptions() {
    return {
      multicolor: true,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    if (!this.options.multicolor) {
      return {};
    }

    return {
      color: {
        default: '#fef08a', // amarillo pastel por defecto
        parseHTML: (element) => element.getAttribute('data-color') || element.style.backgroundColor || null,
        renderHTML: (attributes) => {
          if (!attributes.color) {
            return {};
          }
          return {
            'data-color': attributes.color,
            style: `background-color: ${attributes.color}; border-radius: 3px; padding: 1px 3px;`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'mark',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setHighlight:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      toggleHighlight:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes);
        },
      unsetHighlight:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});

