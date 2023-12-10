import { Client } from '@opensearch-project/opensearch';

export const openSearch = new Client({
  node: process.env.PRIVATE_OPENSEARCH_URL,
});

const version = Date.now();

const createIndex = async (name, indexBody) => {
  await openSearch.indices.create({
    index: `${name}-${version}`,
    body: indexBody,
  });

  try {
    const getAliasRequest = await openSearch.indices.getAlias({ name });
    const aliases = Object.keys(getAliasRequest.body);

    await Promise.all(
      aliases.map(async (alias) => {
        await openSearch.reindex({
          body: {
            source: { index: alias },
            dest: { index: `${name}-${version}` },
          },
        });

        await openSearch.indices.delete({ index: alias });
      }),
    );
  } catch {
    /* empty */
  }

  await openSearch.indices.putAlias({
    index: `${name}-${version}`,
    name,
  });
};

await createIndex('posts', {
  settings: {
    index: {
      number_of_shards: 12,
      number_of_replicas: 0,
    },
  },
  mappings: {
    properties: {
      title: { type: 'text', analyzer: 'nori' },
      subtitle: { type: 'text', analyzer: 'nori' },
      tags: {
        properties: {
          id: { type: 'keyword' },
          name: { type: 'text', analyzer: 'nori' },
        },
      },
      spaceId: { type: 'keyword' },
      publishedAt: { type: 'date', format: 'epoch_millis' },
    },
  },
});

await createIndex('spaces', {
  settings: {
    index: {
      number_of_shards: 12,
      number_of_replicas: 0,
    },
  },
  mappings: {
    properties: {
      name: { type: 'text', analyzer: 'nori' },
    },
  },
});

await createIndex('tags', {
  settings: {
    index: {
      number_of_shards: 12,
      number_of_replicas: 0,
      analysis: {
        analyzer: {
          ngram_23: {
            type: 'custom',
            tokenizer: 'ngram_23',
            filter: ['lowercase'],
          },
        },
        tokenizer: {
          ngram_23: {
            type: 'ngram',
            min_gram: 2,
            max_gram: 3,
          },
        },
      },
    },
  },
  mappings: {
    properties: {
      name: {
        properties: {
          raw: { type: 'text', analyzer: 'ngram_23' }, // 원본
          disassembled: { type: 'text', analyzer: 'ngram_23' }, // 초중종성 분해
          initial: { type: 'text', analyzer: 'ngram_23' }, // 초성
        },
      },
    },
  },
});