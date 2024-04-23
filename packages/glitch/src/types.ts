import graphql from 'graphql';
import type { Client } from '@urql/core';
import type { Readable } from 'svelte/store';

export type MakeRequired<T, K extends string> = T extends (infer T0)[]
  ? MakeRequired<T0, K>[]
  : T & {
      [P in keyof T as P extends (K extends `${infer K0}.${string}` ? K0 : K) ? P : never]-?: P extends K
        ? NonNullable<T[P]>
        : MakeRequired<T[P], K extends `${Exclude<P, symbol>}.${infer R}` ? R : never>;
    };

export type FragmentType<T extends { ' $fragmentType'?: unknown }> = Omit<
  NonNullable<T[' $fragmentType']>,
  ' $fragmentName'
>;

export type ValidOperationDocumentNode = {
  kind: graphql.Kind.DOCUMENT;
  definitions: [graphql.OperationDefinitionNode & { name: graphql.NameNode }];
};

export type ValidFragmentDocumentNode = {
  kind: graphql.Kind.DOCUMENT;
  definitions: [graphql.FragmentDefinitionNode & { name: graphql.NameNode }];
};

export type ValidDocumentNode = ValidOperationDocumentNode | ValidFragmentDocumentNode;

type OperationArtifact = {
  kind: 'query' | 'mutation' | 'subscription';
  documentNode: ValidOperationDocumentNode;
};

type FragmentArtifact = {
  kind: 'fragment';
  documentNode: ValidFragmentDocumentNode;
};

export type Artifact = {
  type: 'automatic' | 'manual';
  name: string;
  filePath: string;
  source: string;
  hash: number;
} & (OperationArtifact | FragmentArtifact);

export type GlitchContext = {
  root: string;
  codegenRoot: string;

  schema: graphql.DocumentNode | undefined;
  artifacts: Artifact[];

  state: {
    version: number;
    schemaHash: number;
    artifactHashes: Record<string, number>;
  };
};

export type GlitchClient<E = Error> = {
  client: Client;
  transformError: (error: unknown) => E;
  onMutationError: (error: E) => void;
};

export type QueryStore<D, V> = Readable<D> & {
  refetch: V extends Record<string, never>
    ? () => Promise<NonNullable<D>>
    : D extends undefined
      ? (variables: V) => Promise<NonNullable<D>>
      : (variables?: V) => Promise<D>;
};

export type MutationStore<D, V> = Readable<{
  inflight: boolean;
}> &
  (V extends Record<string, never>
    ? () => Promise<D[keyof D]>
    : V extends { input: infer I }
      ? (input: I) => Promise<D[keyof D]>
      : never);

export type FragmentStore<D> = Readable<D>;

export type SubscriptionStore<D, V> = {
  subscribe: V extends Record<string, never> ? () => () => void : (variables: V) => () => void;
  on: (event: 'data', handler: (data: D) => void) => void;
};
