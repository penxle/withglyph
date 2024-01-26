import { mergeAttributes, Node } from '@tiptap/core';

export type TableCellOptions = {
  HTMLAttributes: Record<string, unknown>;
};

export const TableCell = Node.create<TableCellOptions>({
  name: 'tableCell',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  content: 'block+',

  addAttributes() {
    return {
      colspan: {
        default: 1,
      },
      rowspan: {
        default: 1,
      },
      colwidth: {
        default: null,
        parseHTML: (element) => {
          const colwidth = element.getAttribute('colwidth');
          const value = colwidth ? [Number.parseInt(colwidth, 10)] : null;

          return value;
        },
      },
    };
  },

  tableRole: 'cell',

  isolating: true,

  parseHTML() {
    return [{ tag: 'td' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'td',
      mergeAttributes(HTMLAttributes, {
        class: 'relative vertical-top min-w-1em px-3 py-5 border-(1px solid block)',
      }),
      0,
    ];
  },
});
