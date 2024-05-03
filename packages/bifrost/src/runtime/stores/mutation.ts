import { createRequest } from '@urql/core';
import { derived, writable } from 'svelte/store';
import { filter, fromValue, mergeMap, pipe, take, tap, toPromise } from 'wonka';
import { getClient } from '../../client/internal';
import type { Readable } from 'svelte/store';
import type { $StoreSchema, StoreSchema } from '../../types';

type Kind = 'mutation';
export type MutationStore<T extends $StoreSchema<Kind>> = Readable<{ inflight: boolean }> &
  (T['$input'] extends Record<string, never>
    ? () => Promise<T['$output'][keyof T['$output']]>
    : (input: T['$input'] extends { input: infer U } ? U : never) => Promise<T['$output'][keyof T['$output']]>);

export const createMutationStore = <T extends $StoreSchema<Kind>>(schema: StoreSchema<T>): MutationStore<T> => {
  const count = writable(0);

  const mutate = async (input?: T['$input'] extends { input: infer U } ? U : never) => {
    const { client, transformError, onMutationError } = getClient();

    const request = createRequest(schema.source, input ? { input } : undefined);
    const operation = client.createRequestOperation('mutation', request, {
      requestPolicy: 'network-only',
    });

    const result = await pipe(
      fromValue(null),
      tap(() => count.update((n) => n + 1)),
      mergeMap(() => client.executeRequestOperation(operation)),
      filter(({ stale }) => !stale),
      take(1),
      tap(() => count.update((n) => n - 1)),
      toPromise,
    );

    if (result.error?.networkError) {
      const err = transformError(result.error.networkError);
      onMutationError(err);
      throw err;
    }

    if (result.error?.graphQLErrors.length) {
      const err = transformError(result.error.graphQLErrors[0]);
      onMutationError(err);
      throw err;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const data = result.data!;

    return data[Object.keys(data)[0] as keyof typeof data];
  };

  return Object.assign(
    mutate,
    derived(count, (n) => ({
      inflight: n > 0,
    })),
  );
};
