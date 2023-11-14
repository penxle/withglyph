import { createNodeView } from '../../lib';
import Component from './Component.svelte';

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    image: {
      setImage: (file: File) => ReturnType;
    };
  }
}

export const Image = createNodeView(Component, {
  name: 'image',
  group: 'block',
  draggable: true,

  addAttributes() {
    return {
      id: {},
      __data: { default: undefined },
      __file: { default: undefined },
    };
  },

  addCommands() {
    return {
      setImage:
        (file) =>
        ({ tr }) => {
          tr.replaceSelectionWith(this.type.create({ __file: file }));
          return tr.docChanged;
        },
    };
  },
});