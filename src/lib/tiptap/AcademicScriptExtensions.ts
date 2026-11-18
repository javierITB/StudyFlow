import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    superscript: {
      setSuperscript: () => ReturnType;
      toggleSuperscript: () => ReturnType;
      unsetSuperscript: () => ReturnType;
    };
    subscript: {
      setSubscript: () => ReturnType;
      toggleSubscript: () => ReturnType;
      unsetSubscript: () => ReturnType;
    };
  }
}

export const Superscript = Mark.create({
  name: 'superscript',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      { tag: 'sup' },
      {
        style: 'vertical-align',
        getAttrs: (value) => (value === 'super' ? {} : false),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['sup', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setSuperscript:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name);
        },
      toggleSuperscript:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      unsetSuperscript:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-.': () => this.editor.commands.toggleSuperscript(),
    };
  },
});

export const Subscript = Mark.create({
  name: 'subscript',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      { tag: 'sub' },
      {
        style: 'vertical-align',
        getAttrs: (value) => (value === 'sub' ? {} : false),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['sub', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setSubscript:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name);
        },
      toggleSubscript:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      unsetSubscript:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-,': () => this.editor.commands.toggleSubscript(),
    };
  },
});

