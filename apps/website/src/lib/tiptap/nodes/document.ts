import { Node } from '@tiptap/core';
import { values } from '../values';

const documentParagraphIndents = values.documentParagraphIndent.map(({ value }) => value);
type DocumentParagraphIndent = (typeof documentParagraphIndents)[number];

const documentParagraphSpacings = values.documentParagraphSpacing.map(({ value }) => value);
type DocumentParagraphSpacing = (typeof documentParagraphSpacings)[number];

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    document: {
      setDocumentParagraphIndent: (documentParagraphIndent: DocumentParagraphIndent) => ReturnType;
      setDocumentParagraphSpacing: (documentParagraphSpacing: DocumentParagraphSpacing) => ReturnType;
    };
  }
}

export const Document = Node.create({
  name: 'document',
  content: 'block+',

  addAttributes() {
    return {
      documentParagraphIndent: {
        default: 1,
        renderHTML: ({ documentParagraphIndent }) => ({
          style: `--document-paragraph-indent: ${documentParagraphIndent}rem`,
        }),
      },

      documentParagraphSpacing: {
        default: 0,
        renderHTML: ({ documentParagraphSpacing }) => ({
          style: `--document-paragraph-spacing: ${documentParagraphSpacing}rem`,
        }),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', HTMLAttributes, 0];
  },

  addCommands() {
    return {
      setDocumentParagraphIndent:
        (documentParagraphIndent) =>
        ({ commands }) => {
          if (!documentParagraphIndents.includes(documentParagraphIndent)) {
            return false;
          }

          return commands.updateAttributes(this.name, { documentParagraphIndent });
        },

      setDocumentParagraphSpacing:
        (documentParagraphSpacing) =>
        ({ commands }) => {
          if (!documentParagraphSpacings.includes(documentParagraphSpacing)) {
            return false;
          }

          return commands.updateAttributes(this.name, { documentParagraphSpacing });
        },
    };
  },
});
