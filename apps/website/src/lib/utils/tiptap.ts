import { getSchema } from '@tiptap/core';
import { Node, Schema } from '@tiptap/pm/model';
import { extensions } from '$lib/tiptap';
import type { JSONContent } from '@tiptap/core';

export const createEmptyTiptapDocumentNode = (schema?: Schema): Node => {
  schema ??= getSchema(extensions);

  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  return schema.topNodeType.createAndFill(null, [
    schema.nodes.document.createAndFill(null, [
      schema.nodes.paragraph.createAndFill()!,
      schema.nodes.access_barrier.createAndFill()!,
    ])!,
  ])!;
  /* eslint-enable @typescript-eslint/no-non-null-assertion */
};

export const getMetadataFromTiptapDocument = (content: JSONContent) => {
  const doc = Node.fromJSON(getSchema(extensions), content);
  const text = doc.content.textBetween(0, doc.content.size, '\n');
  const characters = text.length;

  let images = 0;
  let files = 0;

  doc.descendants((node) => {
    // eslint-disable-next-line unicorn/prefer-switch
    if (node.type.name === 'image') {
      images += 1;
    } else if (node.type.name === 'gallery') {
      images += node.attrs.ids.length;
    } else if (node.type.name === 'file') {
      files += 1;
    }
  });

  return {
    doc,
    text,
    characters,
    images,
    files,
  };
};
