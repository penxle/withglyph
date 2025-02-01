import { findChildren } from '@tiptap/core';
import { NodeSelection, Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { bundledLanguages, getHighlighter, getTokenStyleObject, stringifyTokenStyle } from 'shiki';
import { createNodeView } from '../../lib';
import Component from './Component.svelte';
import type { Node } from '@tiptap/pm/model';
import type { BundledTheme, Highlighter, TokenStyles } from 'shiki';

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    codeBlock: {
      setCodeBlock: () => ReturnType;
    };
  }
}

type Options = {
  theme: BundledTheme;
};

type Storage = {
  highlighter: Highlighter | undefined;
};

export const CodeBlock = createNodeView<Options, Storage>(Component, {
  name: 'code_block',
  group: 'block',
  draggable: true,
  content: 'text*',
  marks: '',
  code: true,
  defining: true,
  isolating: true,

  addOptions() {
    return {
      theme: 'material-theme-palenight',
    };
  },

  addAttributes() {
    return {
      language: { default: 'text' },
    };
  },

  addCommands() {
    return {
      setCodeBlock:
        () =>
        ({ state, tr }) => {
          const { selection } = state;
          const { $to } = selection;

          const pos = selection instanceof TextSelection ? $to.end() + 1 : $to.pos;

          tr.insert(pos, this.type.create());
          tr.setSelection(NodeSelection.create(tr.doc, pos));
          tr.scrollIntoView();

          return tr.docChanged;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Backspace': ({ editor }) => {
        const { $anchor, empty } = editor.state.selection;

        if (!empty || $anchor.parent.type !== this.type || $anchor.parent.textContent.length > 0) {
          return false;
        }

        return true;
      },

      'Mod-a': ({ editor }) => {
        const { $anchor } = editor.state.selection;
        if ($anchor.parent.type !== this.type) {
          return false;
        }

        return editor.commands.setTextSelection({
          from: $anchor.start(),
          to: $anchor.end(),
        });
      },
    };
  },

  addProseMirrorPlugins() {
    const key = new PluginKey('codeBlock');

    return [
      new Plugin({
        key,
        state: {
          init: () => {
            getHighlighter({
              themes: [this.options.theme],
              langs: Object.keys(bundledLanguages),
            }).then((highlighter) => {
              this.storage.highlighter = highlighter;

              const { tr } = this.editor.state;
              tr.setMeta(key, true);
              this.editor.view.dispatch(tr);
            });

            return DecorationSet.empty;
          },
          apply: (tr, decorationSet) => {
            if (!this.storage.highlighter) {
              return DecorationSet.empty;
            }

            if (tr.getMeta(key) === true || tr.docChanged) {
              return getDecorations(this.storage.highlighter, this.options.theme, tr.doc);
            }

            // eslint-disable-next-line unicorn/no-array-callback-reference, unicorn/no-array-method-this-argument
            return decorationSet.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations: (state) => {
            return key.getState(state);
          },
        },
      }),
    ];
  },
});

const themedTokenToStyle = (token: TokenStyles) => {
  return stringifyTokenStyle(token.htmlStyle || getTokenStyleObject(token));
};

const getDecorations = (highlighter: Highlighter, theme: BundledTheme, doc: Node) => {
  const decorations: Decoration[] = [];

  const children = findChildren(doc, (node) => node.type.name === 'code_block');
  for (const child of children) {
    const lang = child.node.attrs.language;

    const result = highlighter.codeToTokens(child.node.textContent, { theme, lang });

    for (const token of result.tokens.flat()) {
      const from = child.pos + token.offset + 1;
      const to = from + token.content.length;

      decorations.push(
        Decoration.inline(from, to, {
          style: themedTokenToStyle(token),
        }),
      );
    }
  }

  return DecorationSet.create(doc, decorations);
};
