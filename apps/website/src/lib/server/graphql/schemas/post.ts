import { init as cuid } from '@paralleldrive/cuid2';
import * as Sentry from '@sentry/sveltekit';
import { hash, verify } from 'argon2';
import dayjs from 'dayjs';
import { and, asc, count, desc, eq, exists, gt, gte, isNotNull, isNull, lt, ne, notExists, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { pipe, Repeater } from 'graphql-yoga';
import { fromUint8Array, toUint8Array } from 'js-base64';
import { match, P } from 'ts-pattern';
import { prosemirrorToYDoc, yDocToProsemirrorJSON } from 'y-prosemirror';
import * as Y from 'yjs';
import { emojiData } from '$lib/emoji';
import {
  PostAgeRating,
  PostCategory,
  PostCommentQualification,
  PostPair,
  PostRevisionKind,
  PostState,
  PostSynchronizationKind,
  PostTagKind,
  PostVisibility,
} from '$lib/enums';
import { FormValidationError, IntentionalError, NotFoundError, PermissionDeniedError, UnknownError } from '$lib/errors';
import { redis } from '$lib/server/cache';
import {
  BookmarkGroupPosts,
  BookmarkGroups,
  database,
  inArray,
  notInArray,
  PostComments,
  PostContentSnapshots,
  PostContentStates,
  PostContentUpdates,
  PostLikes,
  PostPurchases,
  PostReactions,
  PostRevisionContents,
  PostRevisions,
  Posts,
  PostTags,
  PostViews,
  Revenues,
  SpaceCollectionPosts,
  SpaceCollections,
  SpaceMasquerades,
  SpaceMembers,
  Spaces,
  Tags,
  UserContentFilterPreferences,
} from '$lib/server/database';
import { enqueueJob } from '$lib/server/jobs';
import { elasticSearch, indexName } from '$lib/server/search';
import {
  checkAgeRatingAllowed,
  deductUserPoint,
  defragmentSpaceCollectionPosts,
  generatePostShareImage,
  getMutedSpaceIds,
  getMutedTagIds,
  getPersonalIdentity,
  getPostContentState,
  getPostViewCount,
  getSpaceMember,
  makePostContentId,
  makeQueryContainers,
  searchResultToIds,
  useFirstRow,
  useFirstRowOrThrow,
} from '$lib/server/utils';
import { base36To10, createEmptyTiptapDocumentNode, getMetadataFromTiptapDocument } from '$lib/utils';
import { PublishPostInputSchema } from '$lib/validations/post';
import { builder } from '../builder';
import { pubsub } from '../pubsub';
import { createObjectRef } from '../utils';
import { BookmarkGroup } from './bookmark';
import { SpaceCollection } from './collection';
import { PostComment } from './comment';
import { Image } from './image';
import { Space, SpaceMember } from './space';
import { PostTag } from './tag';
import type { JSONContent } from '@tiptap/core';

/**
 * * Types
 */

const CommentOrderByKind = builder.enumType('CommentOrderByKind', {
  values: ['LATEST', 'OLDEST'] as const,
});

const PostInvisibleReason = builder.enumType('PostInvisibleReason', {
  values: ['PASSWORD', 'NOT_IDENTIFIED', 'AGE_RATING'] as const,
});

const PostBlurredReason = builder.enumType('PostBlurredReason', {
  values: ['ADULT_HIDDEN', 'TRIGGER'] as const,
});

export const Post = createObjectRef('Post', Posts);
Post.implement({
  roleGranter: {
    edit: async (post, context) => {
      if (!context.session) {
        return false;
      }

      if (post.userId === context.session.userId) {
        return true;
      }

      if (!post.spaceId) {
        return false;
      }

      const meAsMember = await getSpaceMember(context, post.spaceId);
      return !!meAsMember;
    },

    view: async (post, context) => {
      if (post.userId === context.session?.userId) {
        return true;
      }

      if (!(await checkAgeRatingAllowed(context.session?.userId, post.ageRating, context))) {
        return false;
      }

      if (post.password && post.userId !== context.session?.userId) {
        const unlock = await redis.hget(`Post:${post.id}:passwordUnlock`, context.deviceId);
        if (!unlock || dayjs(unlock).isBefore(dayjs())) {
          return false;
        }
      }

      return true;
    },
  },

  fields: (t) => ({
    id: t.exposeID('id'),
    state: t.expose('state', { type: PostState }),

    permalink: t.exposeString('permalink'),
    shortlink: t.string({
      resolve: ({ permalink }) => BigInt(permalink).toString(36),
    }),

    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    publishedAt: t.expose('publishedAt', { type: 'DateTime', nullable: true }),

    member: t.field({
      type: SpaceMember,
      nullable: true,
      resolve: (post) => post.memberId,
    }),

    space: t.field({
      type: Space,
      nullable: true,
      resolve: (post) => post.spaceId,
    }),

    tags: t.field({
      type: [PostTag],
      resolve: async (post, _, context) => {
        const loader = context.loader({
          name: 'Post.tags',
          many: true,
          load: async (ids: string[]) => {
            return await database.select().from(PostTags).where(inArray(PostTags.postId, ids));
          },
          key: (row) => row.postId,
        });

        return loader.load(post.id);
      },
    }),

    visibility: t.expose('visibility', { type: PostVisibility }),
    ageRating: t.expose('ageRating', { type: PostAgeRating }),
    externalSearchable: t.exposeBoolean('externalSearchable'),
    category: t.expose('category', { type: PostCategory }),
    pairs: t.expose('pairs', { type: [PostPair] }),

    discloseStats: t.exposeBoolean('discloseStats'),
    receiveFeedback: t.exposeBoolean('receiveFeedback'),
    receivePatronage: t.exposeBoolean('receivePatronage'),
    receiveTagContribution: t.exposeBoolean('receiveTagContribution'),
    protectContent: t.exposeBoolean('protectContent'),
    commentQualification: t.expose('commentQualification', { type: PostCommentQualification }),

    thumbnail: t.field({
      type: Image,
      nullable: true,
      resolve: async (post, _, context) => {
        if (await checkAgeRatingAllowed(context.session?.userId, post.ageRating, context)) {
          return post.thumbnailId;
        }
      },
    }),

    likeCount: t.int({
      deprecationReason: 'Use `reactionCount` instead',
      resolve: async (post) => {
        const [{ value }] = await database
          .select({ value: count() })
          .from(PostLikes)
          .where(eq(PostLikes.postId, post.id));
        return value;
      },
    }),

    viewCount: t.int({
      resolve: (post, _, context) => getPostViewCount({ context, postId: post.id }),
    }),

    viewed: t.boolean({
      resolve: async (post, _, context) => {
        const loader = context.loader({
          name: 'Post.viewed',
          nullable: true,
          load: async (ids: string[]) => {
            if (!context.session) {
              return [];
            }

            return await database
              .select({ postId: PostViews.postId })
              .from(PostViews)
              .where(and(inArray(PostViews.postId, ids), eq(PostViews.userId, context.session.userId)));
          },
          key: (row) => row?.postId,
        });

        const view = await loader.load(post.id);

        return !!view;
      },
    }),

    hasPassword: t.boolean({
      resolve: (post) => !!post.password,
    }),

    unlocked: t.boolean({
      resolve: async (post, _, context) => {
        if (!post.password) {
          return true;
        }

        const unlock = await redis.hget(`Post:${post.id}:passwordUnlock`, context.deviceId);
        return !!unlock && dayjs(unlock).isAfter(dayjs());
      },
    }),

    blurred: t.boolean({
      deprecationReason: 'Use `blurredReason` instead',
      resolve: async (post, _, context) => {
        if (context.session?.userId === post.userId) {
          return false;
        }

        if (post.ageRating !== 'ALL' && !context.session) {
          return true;
        }

        const triggerTagsLoader = context.loader({
          name: 'Post.blurred > triggerTags',
          many: true,
          load: async (ids: string[]) => {
            return await database
              .select({ postId: PostTags.postId })
              .from(PostTags)
              .where(and(inArray(PostTags.postId, ids), eq(PostTags.kind, 'TRIGGER')));
          },
          key: (row) => row?.postId,
        });

        const triggerTags = await triggerTagsLoader.load(post.id);

        if (triggerTags.length > 0) {
          return true;
        }

        if (post.ageRating === 'ALL') {
          return false;
        }

        const adultFiltersLoader = context.loader({
          name: 'Post.blurred > adultFilters',
          nullable: true,
          load: async (ids: string[]) => {
            return await database
              .select({ userId: UserContentFilterPreferences.userId, action: UserContentFilterPreferences.action })
              .from(UserContentFilterPreferences)
              .where(
                and(
                  inArray(UserContentFilterPreferences.userId, ids),
                  eq(UserContentFilterPreferences.category, 'ADULT'),
                ),
              );
          },
          key: (row) => row?.userId,
        });

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const adultFilters = await adultFiltersLoader.load(context.session!.userId);

        return adultFilters?.action !== 'EXPOSE';
      },
    }),

    invisibleReason: t.field({
      type: PostInvisibleReason,
      nullable: true,
      resolve: async (post, _, context) => {
        if (post.password && post.userId !== context.session?.userId) {
          const unlock = await redis.hget(`Post:${post.id}:passwordUnlock`, context.deviceId);
          if (!unlock || dayjs(unlock).isBefore(dayjs())) {
            return 'PASSWORD';
          }
        }

        if (post.ageRating !== 'ALL') {
          const identity = await getPersonalIdentity(context.session?.userId, context);

          if (!identity) {
            return 'NOT_IDENTIFIED';
          }

          if (!(await checkAgeRatingAllowed(context.session?.userId, post.ageRating, context))) {
            return 'AGE_RATING';
          }
        }
      },
    }),

    blurredReasons: t.field({
      type: [PostBlurredReason],
      resolve: async (post, _, context) => {
        const reasons: (typeof PostBlurredReason.$inferType)[] = [];

        if (post.ageRating !== 'ALL') {
          const adultFiltersLoader = context.loader({
            name: 'Post.blurred > adultFilters',
            nullable: true,
            load: async (ids: string[]) => {
              return await database
                .select({ userId: UserContentFilterPreferences.userId, action: UserContentFilterPreferences.action })
                .from(UserContentFilterPreferences)
                .where(
                  and(
                    inArray(UserContentFilterPreferences.userId, ids),
                    eq(UserContentFilterPreferences.category, 'ADULT'),
                  ),
                );
            },
            key: (row) => row?.userId,
          });

          // context.session이 null이면 checkAgeRatingAllowed에서 걸림
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const adultFilter = await adultFiltersLoader.load(context.session!.userId);
          if (adultFilter?.action !== 'EXPOSE') {
            reasons.push('ADULT_HIDDEN');
          }
        }

        const triggerTagsLoader = context.loader({
          name: 'Post.blurred > triggerTags',
          many: true,
          load: async (ids: string[]) => {
            return await database
              .select({ postId: PostTags.postId })
              .from(PostTags)
              .where(and(inArray(PostTags.postId, ids), eq(PostTags.kind, 'TRIGGER')));
          },
          key: (row) => row?.postId,
        });

        const triggerTags = await triggerTagsLoader.load(post.id);
        if (triggerTags.length > 0) {
          reasons.push('TRIGGER');
        }

        return reasons;
      },
    }),

    publishedRevision: t.field({
      type: PostRevision,
      nullable: true,
      resolve: (post) => post.publishedRevisionId,
    }),

    revision: t.field({
      type: PostRevision,
      args: { id: t.arg.id() },
      resolve: async (post, args) => {
        const revisions = await database
          .select({ id: PostRevisions.id })
          .from(PostRevisions)
          .where(and(eq(PostRevisions.id, args.id), eq(PostRevisions.postId, post.id)));

        if (revisions.length === 0) {
          throw new NotFoundError();
        }

        return revisions[0].id;
      },
    }),

    contentState: t.withAuth({ user: true }).field({
      type: PostContentState,
      resolve: async (post, _, context) => {
        if (post.userId !== context.session.userId) {
          if (!post.spaceId) {
            throw new PermissionDeniedError();
          }

          const meAsMember = await getSpaceMember(context, post.spaceId);
          if (!meAsMember) {
            throw new PermissionDeniedError();
          }
        }

        const loader = context.loader({
          name: 'Post.contentState',
          load: async (ids: string[]) => {
            return await database.select().from(PostContentStates).where(inArray(PostContentStates.postId, ids));
          },
          key: (row) => row.postId,
        });

        return await loader.load(post.id);
      },
    }),

    contentSnapshots: t.withAuth({ user: true }).field({
      type: [PostContentSnapshot],
      resolve: async (post, _, context) => {
        if (post.userId !== context.session.userId) {
          if (!post.spaceId) {
            throw new PermissionDeniedError();
          }

          const meAsMember = await getSpaceMember(context, post.spaceId);
          if (!meAsMember) {
            throw new PermissionDeniedError();
          }
        }

        return await database
          .select()
          .from(PostContentSnapshots)
          .where(
            and(
              eq(PostContentSnapshots.postId, post.id),
              gte(PostContentSnapshots.createdAt, dayjs().subtract(24, 'hours')),
            ),
          )
          .orderBy(asc(PostContentSnapshots.createdAt));
      },
    }),

    liked: t.boolean({
      resolve: async (post, _, context) => {
        if (!context.session) {
          return false;
        }

        const likes = await database
          .select({ id: PostLikes.id })
          .from(PostLikes)
          .where(and(eq(PostLikes.postId, post.id), eq(PostLikes.userId, context.session.userId)));

        return likes.length > 0;
      },
    }),

    reactions: t.field({
      type: [PostReaction],
      resolve: async (post, _, context) => {
        if (!post.receiveFeedback) {
          if (context.session) {
            return await database
              .select()
              .from(PostReactions)
              .where(and(eq(PostReactions.postId, post.id), eq(PostReactions.userId, context.session.userId)))
              .orderBy(desc(PostReactions.createdAt));
          } else {
            return [];
          }
        }

        if (!context.session) {
          return await database
            .select()
            .from(PostReactions)
            .where(eq(PostReactions.postId, post.id))
            .orderBy(desc(PostReactions.createdAt));
        }

        return [
          ...(await database
            .select()
            .from(PostReactions)
            .where(and(eq(PostReactions.postId, post.id), eq(PostReactions.userId, context.session.userId)))
            .orderBy(desc(PostReactions.createdAt))),
          ...(await database
            .select()
            .from(PostReactions)
            .where(and(eq(PostReactions.postId, post.id), ne(PostReactions.userId, context.session.userId)))
            .orderBy(desc(PostReactions.createdAt))),
        ];
      },
    }),

    reactionCount: t.int({
      resolve: async (post, _, context) => {
        const loader = context.loader({
          name: 'Post.reactionCount',
          nullable: true,
          load: async (ids: string[]) => {
            return await database
              .select({ postId: PostReactions.postId, count: count() })
              .from(PostReactions)
              .where(inArray(PostReactions.postId, ids))
              .groupBy(PostReactions.postId);
          },
          key: (row) => row?.postId,
        });

        const postReaction = await loader.load(post.id);
        return postReaction?.count ?? 0;
      },
    }),

    bookmarkGroups: t.field({
      type: [BookmarkGroup],
      resolve: async (post, _, context) => {
        const loader = context.loader({
          name: 'Post.bookmarkGroups',
          many: true,
          load: async (ids: string[]) => {
            if (!context.session) {
              return [];
            }

            return await database
              .select({ id: BookmarkGroups.id, postId: BookmarkGroupPosts.postId })
              .from(BookmarkGroups)
              .innerJoin(BookmarkGroupPosts, eq(BookmarkGroups.id, BookmarkGroupPosts.bookmarkGroupId))
              .where(and(eq(BookmarkGroups.userId, context.session.userId), inArray(BookmarkGroupPosts.postId, ids)));
          },
          key: (row) => row.postId,
        });

        const rows = await loader.load(post.id);
        return rows.map((row) => row.id);
      },
    }),

    collection: t.field({
      type: SpaceCollection,
      nullable: true,
      resolve: async (post) => {
        const collections = await database
          .select({ id: SpaceCollections.id })
          .from(SpaceCollections)
          .innerJoin(SpaceCollectionPosts, eq(SpaceCollections.id, SpaceCollectionPosts.collectionId))
          .where(and(eq(SpaceCollectionPosts.postId, post.id), eq(SpaceCollections.state, 'ACTIVE')));

        if (collections.length === 0) {
          return null;
        }

        return collections[0].id;
      },
    }),

    purchasedAt: t.field({
      type: 'DateTime',
      nullable: true,
      resolve: async (post, _, context) => {
        if (!context.session) {
          return null;
        }

        const purchases = await database
          .select({ createdAt: PostPurchases.createdAt })
          .from(PostPurchases)
          .where(and(eq(PostPurchases.postId, post.id), eq(PostPurchases.userId, context.session.userId)));

        if (purchases.length === 0) {
          return null;
        }

        return purchases[0].createdAt;
      },
    }),

    previousPost: t.field({
      type: Post,
      nullable: true,
      resolve: async (post) => {
        if (!post.publishedAt || !post.spaceId) {
          return null;
        }

        const posts = await database
          .select()
          .from(Posts)
          .where(
            and(
              eq(Posts.spaceId, post.spaceId),
              eq(Posts.state, 'PUBLISHED'),
              eq(Posts.visibility, 'PUBLIC'),
              lt(Posts.publishedAt, post.publishedAt),
            ),
          )
          .orderBy(desc(Posts.publishedAt))
          .limit(1);

        if (posts.length === 0) {
          return null;
        }

        return posts[0];
      },
    }),

    nextPost: t.field({
      type: Post,
      nullable: true,
      resolve: async (post) => {
        if (!post.publishedAt || !post.spaceId) {
          return null;
        }

        const posts = await database
          .select()
          .from(Posts)
          .where(
            and(
              eq(Posts.spaceId, post.spaceId),
              eq(Posts.state, 'PUBLISHED'),
              eq(Posts.visibility, 'PUBLIC'),
              gt(Posts.publishedAt, post.publishedAt),
            ),
          )
          .orderBy(asc(Posts.publishedAt))
          .limit(1);

        if (posts.length === 0) {
          return null;
        }

        return posts[0];
      },
    }),

    recommendedPosts: t.field({
      type: [Post],
      resolve: async (post, _, context) => {
        if (!post.publishedRevisionId) {
          return [];
        }

        const [postTagIds, mutedTagIds, mutedSpaceIds, recentlyViewedPostIds] = await Promise.all([
          database
            .select({ tagId: PostTags.tagId })
            .from(PostTags)
            .where(eq(PostTags.postId, post.id))
            .then((rows) => rows.map((row) => row.tagId)),
          getMutedTagIds({ userId: context.session?.userId }),
          getMutedSpaceIds({ userId: context.session?.userId }),
          context.session
            ? database
                .select({ postId: PostViews.postId })
                .from(PostViews)
                .where(eq(PostViews.userId, context.session.userId))
                .orderBy(desc(PostViews.viewedAt))
                .limit(50)
                .then((views) => views.map((view) => view.postId))
            : [post.id],
        ]);

        const searchResult = await elasticSearch.search({
          index: indexName('posts'),
          query: {
            function_score: {
              query: {
                bool: {
                  should: [
                    { terms: { 'tags.id': postTagIds } },
                    { term: { ['spaceId']: post.spaceId } },
                    { rank_feature: { field: 'trendingScore' } },
                    { match_all: { boost: 0.1 } },
                  ],
                  must_not: makeQueryContainers([
                    {
                      query: {
                        terms: { 'tags.id': mutedTagIds },
                      },
                      condition: mutedTagIds.length > 0,
                    },
                    {
                      query: {
                        terms: { 'space.id': mutedSpaceIds },
                      },
                      condition: mutedSpaceIds.length > 0,
                    },
                    {
                      query: {
                        ids: { values: recentlyViewedPostIds },
                      },
                    },
                  ]),
                },
              },
              functions: [
                {
                  random_score: { seed: Math.floor(Math.random() * 1000), field: '_seq_no' },
                },
              ],
            },
          },

          size: 8,
        });

        return searchResultToIds(searchResult);
      },
    }),

    commentCount: t.int({
      args: { pagination: t.arg.boolean({ defaultValue: false }) },
      resolve: async (post, { pagination }, context) => {
        if (pagination) {
          const ChildComments = alias(PostComments, 'child');

          return await database
            .select({ count: count() })
            .from(PostComments)
            .where(
              and(
                eq(PostComments.postId, post.id),
                isNull(PostComments.parentId),
                or(
                  eq(PostComments.state, 'ACTIVE'),
                  exists(
                    database
                      .select({ id: ChildComments.id })
                      .from(ChildComments)
                      .where(and(eq(ChildComments.parentId, PostComments.id), eq(ChildComments.state, 'ACTIVE'))),
                  ),
                ),
              ),
            )
            .then(([result]) => result.count);
        } else {
          const loader = context.loader({
            name: 'Post.commentCount',
            nullable: true,
            load: async (postIds: string[]) => {
              return await database
                .select({ postId: PostComments.postId, count: count() })
                .from(PostComments)
                .where(and(inArray(PostComments.postId, postIds), eq(PostComments.state, 'ACTIVE')))
                .groupBy(PostComments.postId);
            },
            key: (row) => row?.postId,
          });

          const row = await loader.load(post.id);
          return row?.count ?? 0;
        }
      },
    }),

    comments: t.field({
      type: [PostComment],
      args: {
        orderBy: t.arg({ type: CommentOrderByKind, defaultValue: 'OLDEST' }),
        page: t.arg.int({ defaultValue: 1 }),
        take: t.arg.int({ defaultValue: 5 }),
      },
      resolve: async (post, { orderBy, page, take }) => {
        if (post.commentQualification === 'NONE') {
          return [];
        }

        const pinnedCommentIds = await database
          .select({ id: PostComments.id })
          .from(PostComments)
          .where(
            and(
              eq(PostComments.postId, post.id),
              eq(PostComments.state, 'ACTIVE'),
              eq(PostComments.pinned, true),
              notExists(
                database
                  .select({ id: SpaceMasquerades.id })
                  .from(SpaceMasquerades)
                  .where(
                    and(eq(SpaceMasquerades.profileId, PostComments.profileId), isNotNull(SpaceMasquerades.blockedAt)),
                  ),
              ),
            ),
          )
          .orderBy(orderBy === 'OLDEST' ? asc(PostComments.createdAt) : desc(PostComments.createdAt))
          .then((comments) => comments.map((comment) => comment.id));

        const pagedPinnedCommentIds = pinnedCommentIds.slice((page - 1) * take, page * take);
        if (pagedPinnedCommentIds.length === take) {
          return pagedPinnedCommentIds;
        }

        const ChildComments = alias(PostComments, 'child');

        const comments = await database
          .select()
          .from(PostComments)
          .where(
            and(
              eq(PostComments.postId, post.id),
              isNull(PostComments.parentId),
              eq(PostComments.pinned, false),
              or(
                eq(PostComments.state, 'ACTIVE'),
                exists(
                  database
                    .select({ id: ChildComments.id })
                    .from(ChildComments)
                    .where(and(eq(ChildComments.parentId, PostComments.id), eq(ChildComments.state, 'ACTIVE'))),
                ),
              ),
              notExists(
                database
                  .select({ id: SpaceMasquerades.id })
                  .from(SpaceMasquerades)
                  .where(
                    and(eq(SpaceMasquerades.profileId, PostComments.profileId), isNotNull(SpaceMasquerades.blockedAt)),
                  ),
              ),
            ),
          )
          .orderBy(orderBy === 'OLDEST' ? asc(PostComments.createdAt) : desc(PostComments.createdAt))
          .limit(take - pagedPinnedCommentIds.length)
          .offset(Math.max(0, (page - 1) * take - pinnedCommentIds.length));

        return [...pagedPinnedCommentIds, ...comments];
      },
    }),

    purchasedRevision: t.withAuth({ user: true }).field({
      type: PostRevision,
      nullable: true,
      resolve: async (post, _, context) => {
        return await database
          .select({ revisionId: PostPurchases.revisionId })
          .from(PostPurchases)
          .where(and(eq(PostPurchases.postId, post.id), eq(PostPurchases.userId, context.session.userId)))
          .then(([purchase]) => purchase?.revisionId);
      },
    }),
  }),
});

export const PostRevision = createObjectRef('PostRevision', PostRevisions);
PostRevision.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    kind: t.expose('kind', { type: PostRevisionKind }),
    title: t.exposeString('title', { nullable: true }),
    subtitle: t.exposeString('subtitle', { nullable: true }),
    price: t.exposeInt('price', { nullable: true }),
    paragraphIndent: t.exposeInt('paragraphIndent'),
    paragraphSpacing: t.exposeInt('paragraphSpacing'),

    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),

    freeContent: t.field({
      type: PostRevisionContent,
      nullable: true,
      scopes: (_, revision) => ({
        scope: 'view',
        resourceType: Post,
        resourceId: revision.postId,
      }),

      resolve: (revision) => revision.freeContentId,
    }),

    paidContent: t.field({
      type: PostRevisionContent,
      nullable: true,
      scopes: (_, revision) => ({
        scope: 'view',
        resourceType: Post,
        resourceId: revision.postId,
      }),

      resolve: (revision) => revision.paidContentId,
    }),

    content: t.field({
      type: 'JSON',
      scopes: (_, revision) => ({
        scope: 'view',
        resourceType: Post,
        resourceId: revision.postId,
      }),

      resolve: async (revision, _, context) => {
        type CreateDocumentOptions = { withPaidContent?: boolean };
        const createDocument = async (options?: CreateDocumentOptions) => {
          const nodes: JSONContent[] = [];

          if (revision.freeContentId) {
            const [freeContent] = await database
              .select({ data: PostRevisionContents.data })
              .from(PostRevisionContents)
              .where(eq(PostRevisionContents.id, revision.freeContentId));

            nodes.push(...freeContent.data);
          }

          if (revision.paidContentId) {
            nodes.push({ type: 'access_barrier', attrs: { price: revision.price } });
          }

          if (options?.withPaidContent && revision.paidContentId) {
            const [paidContent] = await database
              .select({ data: PostRevisionContents.data })
              .from(PostRevisionContents)
              .where(eq(PostRevisionContents.id, revision.paidContentId));

            nodes.push(...paidContent.data);
          }

          return {
            type: 'doc',
            content: [{ type: 'document', attrs: revision.attributes as never, content: nodes }],
          };
        };

        if (!revision.paidContentId) {
          return await createDocument();
        }

        if (context.session) {
          const [post] = await database
            .select({ userId: Posts.userId, spaceId: Posts.spaceId })
            .from(Posts)
            .where(eq(Posts.id, revision.postId));

          if (post.spaceId) {
            const member = await getSpaceMember(context, post.spaceId);
            if (member) {
              return await createDocument({ withPaidContent: true });
            }
          }

          const purchases = await database
            .select({ createdAt: PostPurchases.createdAt })
            .from(PostPurchases)
            .where(and(eq(PostPurchases.postId, revision.postId), eq(PostPurchases.userId, context.session.userId)));

          if (purchases.length > 0) {
            return await createDocument({ withPaidContent: true });
          }
        }

        return createDocument();
      },

      scopeError: () => ({}),
    }),

    previewText: t.string({
      scopes: (_, revision) => ({
        scope: 'view',
        resourceType: Post,
        resourceId: revision.postId,
      }),

      resolve: async (revision, _, context) => {
        const loader = context.loader({
          name: 'PostRevisionContents(id)',
          load: async (ids: string[]) => {
            return await database.select().from(PostRevisionContents).where(inArray(PostRevisionContents.id, ids));
          },
          key: (content) => content.id,
        });

        const text = revision.freeContentId ? await loader.load(revision.freeContentId).then((v) => v.text) : '';

        return text.slice(0, 200).replaceAll(/\s+/g, ' ');
      },

      scopeError: () => '',
    }),

    readingTime: t.int({
      resolve: async (revision, _, context) => {
        const loader = context.loader({
          name: 'PostRevisionContents(id)',
          load: async (ids: string[]) => {
            return await database.select().from(PostRevisionContents).where(inArray(PostRevisionContents.id, ids));
          },
          key: (content) => content.id,
        });

        const charactersArray = await Promise.all(
          [revision.freeContentId, revision.paidContentId].map((id) =>
            id ? loader.load(id).then((v) => v.characters) : 0,
          ),
        );

        return Math.max(Math.ceil((charactersArray.reduce((acc, val) => acc + val, 0) / 700) * 60), 1);
      },
    }),
  }),
});

export const PostRevisionContent = createObjectRef('PostRevisionContent', PostRevisionContents);
PostRevisionContent.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    characters: t.exposeInt('characters'),
    images: t.exposeInt('images'),
    files: t.exposeInt('files'),
  }),
});

export const PostReaction = createObjectRef('PostReaction', PostReactions);
PostReaction.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    emoji: t.exposeString('emoji'),

    mine: t.boolean({
      resolve: (reaction, _, context) => !!context.session && reaction.userId === context.session.userId,
    }),
  }),
});

export const PostContentState = createObjectRef('PostContentState', PostContentStates);
PostContentState.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    update: t.string({ resolve: (state) => fromUint8Array(state.update) }),
    title: t.exposeString('title', { nullable: true }),
    subtitle: t.exposeString('subtitle', { nullable: true }),
    characters: t.exposeInt('characters'),
    images: t.exposeInt('images'),
    files: t.exposeInt('files'),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),

    previewText: t.string({
      resolve: (state) => {
        return state.text.slice(0, 200).replaceAll(/\s+/g, ' ');
      },
    }),
  }),
});

export const PostContentSnapshot = createObjectRef('PostContentSnapshot', PostContentSnapshots);
PostContentSnapshot.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    data: t.string({ resolve: (snapshot) => fromUint8Array(snapshot.data) }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

export const PostPurchase = createObjectRef('PostPurchase', PostPurchases);
PostPurchase.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    pointAmount: t.exposeInt('pointAmount'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),

    post: t.field({
      type: Post,
      resolve: (purchase) => purchase.postId,
    }),

    revision: t.field({
      type: PostRevision,
      resolve: (purchase) => purchase.revisionId,
    }),
  }),
});

export type SynchronizePostResultType = typeof SynchronizePostResult.$inferType;
export const SynchronizePostResult = builder.simpleObject('SynchronizePostResult', {
  fields: (t) => ({
    postId: t.id(),
    kind: t.field({ type: PostSynchronizationKind }),
    data: t.string(),
  }),
});

/**
 * * Inputs
 */

const TagInput = builder.inputType('TagInput', {
  fields: (t) => ({
    name: t.string(),
    kind: t.field({ type: PostTagKind }),
  }),
});

const CreatePostInput = builder.inputType('CreatePostInput', {
  fields: (t) => ({
    spaceId: t.id({ required: false }),
    collectionId: t.id({ required: false }),
    isTemplate: t.boolean({ defaultValue: false }),
    usingTemplate: t.id({ required: false }),
  }),
});

const PublishPostInput = builder.inputType('PublishPostInput', {
  fields: (t) => ({
    postId: t.id(),
    spaceId: t.id(),
    collectionId: t.id({ required: false }),
    thumbnailId: t.id({ required: false }),
    visibility: t.field({ type: PostVisibility }),
    password: t.string({ required: false }),
    ageRating: t.field({ type: PostAgeRating }),
    externalSearchable: t.boolean(),
    discloseStats: t.boolean(),
    receiveFeedback: t.boolean(),
    receivePatronage: t.boolean(),
    receiveTagContribution: t.boolean(),
    protectContent: t.boolean(),
    commentQualification: t.field({
      type: PostCommentQualification,
      required: false,
      defaultValue: 'ANY',
    }),
    category: t.field({ type: PostCategory }),
    pairs: t.field({ type: [PostPair], defaultValue: [] }),
    tags: t.field({ type: [TagInput], defaultValue: [] }),
  }),
  validate: { schema: PublishPostInputSchema },
});

const UpdatePostOptionsInput = builder.inputType('UpdatePostOptionsInput', {
  fields: (t) => ({
    postId: t.id(),
    visibility: t.field({ type: PostVisibility, required: false }),
    discloseStats: t.boolean({ required: false }),
    receiveFeedback: t.boolean({ required: false }),
    receivePatronage: t.boolean({ required: false }),
    receiveTagContribution: t.boolean({ required: false }),
    commentQualification: t.field({ type: PostCommentQualification, required: false }),
    externalSearchable: t.boolean({ required: false }),
    ageRating: t.field({ type: PostAgeRating, required: false }),
    protectContent: t.boolean({ required: false }),
  }),
});

const UpdatePostTagsInput = builder.inputType('UpdatePostTagsInput', {
  fields: (t) => ({
    postId: t.id(),
    category: t.field({ type: PostCategory }),
    pairs: t.field({ type: [PostPair] }),
    tags: t.field({ type: [TagInput] }),
  }),
});

const ReplacePostThumbnailInput = builder.inputType('ReplacePostThumbnailInput', {
  fields: (t) => ({
    postId: t.id(),
    thumbnailId: t.id({ required: false }),
  }),
});

const DeletePostInput = builder.inputType('DeletePostInput', {
  fields: (t) => ({
    postId: t.id(),
  }),
});

const LikePostInput = builder.inputType('LikePostInput', {
  fields: (t) => ({
    postId: t.id(),
  }),
});

const UnlikePostInput = builder.inputType('UnlikePostInput', {
  fields: (t) => ({
    postId: t.id(),
  }),
});

const PurchasePostInput = builder.inputType('PurchasePostInput', {
  fields: (t) => ({
    postId: t.id(),
    revisionId: t.id(),
  }),
});

const UpdatePostViewInput = builder.inputType('UpdatePostViewInput', {
  fields: (t) => ({
    postId: t.id(),
  }),
});

const CreatePostReactionInput = builder.inputType('CreatePostReactionInput', {
  fields: (t) => ({
    postId: t.id(),
    emoji: t.string(),
  }),
});

const DeletePostReactionInput = builder.inputType('DeletePostReactionInput', {
  fields: (t) => ({
    postId: t.id(),
    emoji: t.string(),
  }),
});

const UnlockPasswordedPostInput = builder.inputType('UnlockPasswordedPostInput', {
  fields: (t) => ({
    postId: t.id(),
    password: t.string(),
  }),
});

const GeneratePostShareImageInput = builder.inputType('GeneratePostShareImageInput', {
  fields: (t) => ({
    title: t.string(),
    space: t.string(),
    body: t.string(),
    font: t.string(), // Pretendard, RIDIBatang
    size: t.string(), // small, medium, large
    color: t.string(), // hex code
    background: t.string(), // hex code
  }),
});

const SynchronizePostInput = builder.inputType('SynchronizePostInput', {
  fields: (t) => ({
    clientId: t.string(),
    postId: t.id(),
    kind: t.field({ type: PostSynchronizationKind }),
    data: t.string(),
  }),
});

/**
 * * Queries
 */

builder.queryFields((t) => ({
  post: t.field({
    type: Post,
    args: { permalink: t.arg.string() },
    resolve: async (_, args, context) => {
      const post = await database
        .select({
          id: Posts.id,
          userId: Posts.userId,
          visibility: Posts.visibility,
          state: Posts.state,
          space: { id: Spaces.id, visibility: Spaces.visibility, state: Spaces.state },
          purchaseId: PostPurchases.id,
        })
        .from(Posts)
        .leftJoin(Spaces, eq(Posts.spaceId, Spaces.id))
        .leftJoin(
          PostPurchases,
          and(
            eq(PostPurchases.postId, Posts.id),
            context.session ? eq(PostPurchases.userId, context.session.userId) : sql`1 = 0`,
          ),
        )
        .where(eq(Posts.permalink, args.permalink))
        .then(useFirstRowOrThrow(new NotFoundError()));

      if (!post.purchaseId) {
        if (post.state === 'DELETED' || (post.space && post.space.state !== 'ACTIVE')) {
          throw new NotFoundError();
        }

        if (
          post.userId !== context.session?.userId &&
          (!post.space || post.space.visibility === 'PRIVATE' || post.visibility === 'SPACE')
        ) {
          const meAsMember = post.space ? await getSpaceMember(context, post.space.id) : null;
          if (!meAsMember) {
            throw new PermissionDeniedError();
          }
        }
      }

      return post.id;
    },
  }),

  draftPost: t.withAuth({ user: true }).field({
    type: Post,
    args: { permalink: t.arg.string() },
    resolve: async (_, args, context) => {
      const posts = await database
        .select({
          id: Posts.id,
          userId: Posts.userId,
          visibility: Posts.visibility,
          state: Posts.state,
          space: { id: Spaces.id, visibility: Spaces.visibility, state: Spaces.state },
        })
        .from(Posts)
        .leftJoin(Spaces, eq(Posts.spaceId, Spaces.id))
        .where(
          and(
            eq(Posts.permalink, args.permalink),
            ne(Posts.state, 'DELETED'),
            or(eq(Spaces.state, 'ACTIVE'), isNull(Spaces.id)),
          ),
        );

      if (posts.length === 0) {
        throw new NotFoundError();
      }

      const [post] = posts;

      if (post.space && post.userId !== context.session.userId) {
        const meAsMember = await getSpaceMember(context, post.space.id);
        if (!meAsMember) {
          throw new PermissionDeniedError();
        }
      }

      return post.id;
    },
  }),

  postShortlink: t.field({
    type: Post,
    args: { shortlink: t.arg.string() },
    resolve: async (_, args) => {
      const permalink = base36To10(args.shortlink);

      const posts = await database.select({ id: Posts.id }).from(Posts).where(eq(Posts.permalink, permalink));

      if (posts.length === 0) {
        throw new NotFoundError();
      }

      return posts[0].id;
    },
  }),
}));

/**
 * * Mutations
 */

builder.mutationFields((t) => ({
  createPost: t.withAuth({ user: true }).field({
    type: Post,
    args: { input: t.arg({ type: CreatePostInput }) },
    resolve: async (_, { input }, context) => {
      let permalink;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        permalink = base36To10(cuid({ length: 6 })());

        const posts = await database.select({ id: Posts.id }).from(Posts).where(eq(Posts.permalink, permalink));
        if (posts.length === 0) {
          break;
        }
      }

      if (input.collectionId) {
        const collection = await database
          .select({ id: SpaceCollections.id, spaceId: SpaceCollections.spaceId })
          .from(SpaceCollections)
          .where(eq(SpaceCollections.id, input.collectionId))
          .then(useFirstRowOrThrow(new NotFoundError()));

        if (input.spaceId) {
          if (collection.spaceId !== input.spaceId) {
            throw new PermissionDeniedError();
          }
        } else {
          input.spaceId = collection.spaceId;
        }
      }
      if (input.spaceId) {
        await database
          .select({ id: Spaces.id })
          .from(Spaces)
          .innerJoin(SpaceMembers, eq(SpaceMembers.spaceId, Spaces.id))
          .where(
            and(
              eq(Spaces.id, input.spaceId),
              eq(SpaceMembers.userId, context.session.userId),
              eq(SpaceMembers.state, 'ACTIVE'),
            ),
          )
          .then(useFirstRowOrThrow(new PermissionDeniedError()));
      }

      return await database.transaction(async (tx) => {
        const publishOptions = input.usingTemplate
          ? await database
              .select({
                visibility: Posts.visibility,
                discloseStats: Posts.discloseStats,
                receiveFeedback: Posts.receiveFeedback,
                receivePatronage: Posts.receivePatronage,
                receiveTagContribution: Posts.receiveTagContribution,
                protectContent: Posts.protectContent,
              })
              .from(Posts)
              .where(and(eq(Posts.id, input.usingTemplate)))
              .then(useFirstRowOrThrow(new NotFoundError()))
          : ({
              visibility: 'PUBLIC',
              discloseStats: true,
              receiveFeedback: true,
              receivePatronage: true,
              receiveTagContribution: true,
              protectContent: true,
            } as const);

        const [post] = await tx
          .insert(Posts)
          .values({
            permalink,
            userId: context.session.userId,
            spaceId: input.spaceId,
            state: input.isTemplate ? 'TEMPLATE' : 'EPHEMERAL',
            ...publishOptions,
          })
          .returning({ id: Posts.id });

        const metadata = input.usingTemplate
          ? await tx
              .select({ content: PostContentStates.content })
              .from(PostContentStates)
              .where(eq(PostContentStates.postId, input.usingTemplate))
              .then((rows) => getMetadataFromTiptapDocument(rows[0].content))
          : null;

        const node = metadata?.doc ?? createEmptyTiptapDocumentNode();

        const doc = prosemirrorToYDoc(node, 'content');
        const update = Y.encodeStateAsUpdateV2(doc);
        const vector = Y.encodeStateVector(doc);
        const snapshot = Y.encodeSnapshotV2(Y.snapshot(doc));

        await tx.insert(PostContentStates).values({
          postId: post.id,
          update,
          vector,
          upToSeq: 0n,
          content: node.toJSON(),
          text: metadata?.text ?? '',
          characters: metadata?.characters ?? 0,
          images: metadata?.images ?? 0,
          files: metadata?.files ?? 0,
        });

        await tx.insert(PostContentSnapshots).values({
          postId: post.id,
          data: snapshot,
        });

        if (input.collectionId) {
          await tx.insert(SpaceCollectionPosts).values({
            collectionId: input.collectionId,
            postId: post.id,
            order: 2_147_483_647,
          });

          await defragmentSpaceCollectionPosts(tx, input.collectionId);
        }

        return post.id;
      });
    },
  }),

  publishPost: t.withAuth({ user: true }).field({
    type: Post,
    args: { input: t.arg({ type: PublishPostInput }) },
    resolve: async (_, { input }, context) => {
      const posts = await database
        .select({
          userId: Posts.userId,
          state: Posts.state,
          spaceId: Posts.spaceId,
          collectionPost: { id: SpaceCollectionPosts.id, collectionId: SpaceCollectionPosts.collectionId },
        })
        .from(Posts)
        .leftJoin(Spaces, eq(Spaces.id, Posts.spaceId))
        .leftJoin(SpaceCollectionPosts, eq(SpaceCollectionPosts.postId, Posts.id))
        .where(
          and(
            eq(Posts.id, input.postId),
            notInArray(Posts.state, ['DELETED', 'TEMPLATE']),
            or(eq(Spaces.state, 'ACTIVE'), isNull(Spaces.id)),
          ),
        );

      if (posts.length === 0) {
        throw new NotFoundError();
      }

      const [post] = posts;

      if (post.state === 'PUBLISHED' && post.spaceId !== input.spaceId) {
        throw new IntentionalError('발행된 포스트의 스페이스를 변경할 수 없어요');
      }

      const meAsMember = await getSpaceMember(context, input.spaceId);
      if (!meAsMember) {
        throw new PermissionDeniedError();
      }

      if (!(await checkAgeRatingAllowed(context.session.userId, input.ageRating, context))) {
        throw new IntentionalError('본인인증을 하지 않으면 연령 제한 컨텐츠를 게시할 수 없어요');
      }

      const state = await getPostContentState(input.postId);

      const doc = new Y.Doc();
      Y.applyUpdateV2(doc, state.update);

      const title = doc.getText('title').toString();
      const subtitle = doc.getText('subtitle').toString();
      const content = yDocToProsemirrorJSON(doc, 'content') as JSONContent;

      const documentNode = content.content?.[0];
      if (!documentNode || documentNode.type !== 'document') {
        throw new Error('invalid document');
      }

      const nodes = documentNode.content;
      if (!nodes || nodes.length === 0) {
        throw new Error('invalid document');
      }

      const attributes = documentNode.attrs ?? {};

      const accessBarrierPosition = nodes.findIndex((node) => node.type === 'access_barrier');
      const accessBarrier = nodes[accessBarrierPosition];

      const freeNodes = nodes.slice(0, accessBarrierPosition);
      const paidNodes = nodes.slice(accessBarrierPosition + 1);

      let price: number | null = null;
      if (paidNodes.length > 0) {
        price = accessBarrier.attrs?.price ?? null;

        if (price === null) {
          throw new IntentionalError('가격을 설정해주세요');
        } else {
          if (price <= 0 || price > 1_000_000 || price % 100 !== 0) {
            throw new IntentionalError('잘못된 가격이에요');
          }
        }
      }

      const password = await match(input.password)
        .with('', () => undefined)
        .with(P.string, (password) => hash(password))
        .with(P.nullish, () => null)
        .exhaustive();

      await database.transaction(async (tx) => {
        const freeContentId = await makePostContentId(tx, freeNodes);
        const paidContentId = await makePostContentId(tx, paidNodes);

        await tx
          .update(PostRevisions)
          .set({ kind: 'ARCHIVED' })
          .where(and(eq(PostRevisions.postId, input.postId), eq(PostRevisions.kind, 'PUBLISHED')));

        const [revision] = await tx
          .insert(PostRevisions)
          .values({
            postId: input.postId,
            userId: context.session.userId,
            kind: 'PUBLISHED',
            title: title.length > 0 ? title : null,
            subtitle: subtitle.length > 0 ? subtitle : null,
            freeContentId,
            paidContentId,
            attributes,
            price,
            updatedAt: dayjs(),
          })
          .returning({ id: PostRevisions.id });

        await tx.delete(PostTags).where(eq(PostTags.postId, input.postId));
        for (const { name, kind } of input.tags) {
          const tagId: string =
            (await tx
              .select({ id: Tags.id })
              .from(Tags)
              .where(eq(Tags.name, name))
              .then(useFirstRow)
              .then((row) => row?.id)) ??
            (await tx
              .insert(Tags)
              .values({ name })
              .returning({ id: Tags.id })
              .then(useFirstRowOrThrow())
              .then((row) => row.id));
          await tx.insert(PostTags).values({ postId: input.postId, tagId, kind });
        }

        await tx
          .update(Posts)
          .set({
            state: 'PUBLISHED',
            spaceId: input.spaceId,
            memberId: meAsMember.id,
            publishedAt: post.state === 'PUBLISHED' ? undefined : dayjs(),
            publishedRevisionId: revision.id,
            visibility: input.visibility,
            ageRating: input.ageRating,
            thumbnailId: input.thumbnailId ?? null,
            externalSearchable: input.externalSearchable,
            discloseStats: input.discloseStats,
            receiveFeedback: input.receiveFeedback,
            receivePatronage: input.receivePatronage,
            receiveTagContribution: input.receiveTagContribution,
            protectContent: input.protectContent,
            commentQualification: input.commentQualification ?? 'ANY',
            password,
            category: input.category,
            pairs: input.pairs,
          })
          .where(eq(Posts.id, input.postId));

        if (post.collectionPost && (!input.collectionId || input.collectionId !== post.collectionPost.collectionId)) {
          await tx.delete(SpaceCollectionPosts).where(eq(SpaceCollectionPosts.postId, input.postId));
          await defragmentSpaceCollectionPosts(tx, post.collectionPost.collectionId);
        }

        if (input.collectionId && (!post.collectionPost || input.collectionId !== post.collectionPost.collectionId)) {
          await tx
            .insert(SpaceCollectionPosts)
            .values({ collectionId: input.collectionId, postId: input.postId, order: 2_147_483_647 });
          await defragmentSpaceCollectionPosts(tx, input.collectionId);
        }
      });

      if (input.password) {
        await redis.del(`Post:${input.postId}:passwordUnlock`);
      }

      await enqueueJob('indexPost', input.postId);
      await enqueueJob('notifyIndexNow', input.postId);

      return input.postId;
    },
  }),

  updatePostOptions: t.withAuth({ user: true }).field({
    type: Post,
    args: { input: t.arg({ type: UpdatePostOptionsInput }) },
    resolve: async (_, { input }, context) => {
      const posts = await database
        .select({ userId: Posts.userId, space: { id: Spaces.id } })
        .from(Posts)
        .innerJoin(Spaces, eq(Spaces.id, Posts.spaceId))
        .where(
          and(eq(Posts.id, input.postId), inArray(Posts.state, ['PUBLISHED', 'TEMPLATE']), eq(Spaces.state, 'ACTIVE')),
        );

      if (posts.length === 0) {
        throw new NotFoundError();
      }

      const [post] = posts;

      const meAsMember = await getSpaceMember(context, post.space.id);
      if (!meAsMember) {
        throw new PermissionDeniedError();
      }

      if (input.ageRating && !(await checkAgeRatingAllowed(context.session.userId, input.ageRating, context))) {
        throw new IntentionalError('본인인증을 하지 않으면 연령 제한 컨텐츠를 게시할 수 없어요');
      }

      await database
        .update(Posts)
        .set({
          visibility: input.visibility ?? undefined,
          discloseStats: input.discloseStats ?? undefined,
          receiveFeedback: input.receiveFeedback ?? undefined,
          receivePatronage: input.receivePatronage ?? undefined,
          receiveTagContribution: input.receiveTagContribution ?? undefined,
          commentQualification: input.commentQualification ?? undefined,
          externalSearchable: input.externalSearchable ?? undefined,
          ageRating: input.ageRating ?? undefined,
          protectContent: input.protectContent ?? undefined,
        })
        .where(eq(Posts.id, input.postId));

      await enqueueJob('indexPost', input.postId);

      return input.postId;
    },
  }),

  updatePostTags: t.withAuth({ user: true }).field({
    type: Post,
    args: { input: t.arg({ type: UpdatePostTagsInput }) },
    resolve: async (_, { input }, context) => {
      const posts = await database
        .select({ userId: Posts.userId, space: { id: Spaces.id } })
        .from(Posts)
        .innerJoin(Spaces, eq(Spaces.id, Posts.spaceId))
        .where(
          and(eq(Posts.id, input.postId), inArray(Posts.state, ['PUBLISHED', 'TEMPLATE']), eq(Spaces.state, 'ACTIVE')),
        );

      if (posts.length === 0) {
        throw new NotFoundError();
      }

      const [post] = posts;

      const meAsMember = await getSpaceMember(context, post.space.id);
      if (!meAsMember) {
        throw new PermissionDeniedError();
      }

      await database.transaction(async (tx) => {
        await tx.delete(PostTags).where(eq(PostTags.postId, input.postId));

        for (const { name, kind } of input.tags) {
          const tagId: string =
            (await tx
              .select({ id: Tags.id })
              .from(Tags)
              .where(eq(Tags.name, name))
              .then(useFirstRow)
              .then((row) => row?.id)) ??
            (await tx
              .insert(Tags)
              .values({ name })
              .returning({ id: Tags.id })
              .then(useFirstRowOrThrow())
              .then((row) => row.id));

          await tx.insert(PostTags).values({ postId: input.postId, tagId, kind });
        }

        await tx.update(Posts).set({ category: input.category, pairs: input.pairs }).where(eq(Posts.id, input.postId));
      });

      await enqueueJob('indexPost', input.postId);

      return input.postId;
    },
  }),

  replacePostThumbnail: t.withAuth({ user: true }).field({
    type: Post,
    args: { input: t.arg({ type: ReplacePostThumbnailInput }) },
    resolve: async (_, { input }, context) => {
      const post = await database
        .select({ id: Posts.id })
        .from(Posts)
        .innerJoin(Spaces, eq(Spaces.id, Posts.spaceId))
        .innerJoin(SpaceMembers, and(eq(SpaceMembers.spaceId, Spaces.id), eq(SpaceMembers.state, 'ACTIVE')))
        .where(and(eq(Posts.id, input.postId), eq(SpaceMembers.userId, context.session.userId)))
        .then(useFirstRowOrThrow(new NotFoundError()));

      await database
        .update(Posts)
        .set({ thumbnailId: input.thumbnailId ?? null })
        .where(eq(Posts.id, post.id));

      return post.id;
    },
  }),

  deletePost: t.withAuth({ user: true }).field({
    type: Post,
    args: { input: t.arg({ type: DeletePostInput }) },
    resolve: async (_, { input }, context) => {
      const posts = await database
        .select({ userId: Posts.userId, space: { id: Spaces.id } })
        .from(Posts)
        .leftJoin(Spaces, eq(Spaces.id, Posts.spaceId))
        .where(and(eq(Posts.id, input.postId)));

      if (posts.length === 0) {
        throw new NotFoundError();
      }

      const [post] = posts;

      if (post.userId !== context.session.userId) {
        const meAsMember = post.space ? await getSpaceMember(context, post.space.id) : null;
        if (meAsMember?.role !== 'ADMIN') {
          throw new PermissionDeniedError();
        }
      }

      await database.transaction(async (tx) => {
        if (post.space) {
          await tx.delete(SpaceCollectionPosts).where(eq(SpaceCollectionPosts.postId, input.postId));
          await defragmentSpaceCollectionPosts(tx, post.space.id);
        }

        await tx.update(Posts).set({ state: 'DELETED' }).where(eq(Posts.id, input.postId));
        await tx
          .update(PostRevisions)
          .set({ kind: 'ARCHIVED' })
          .where(and(eq(PostRevisions.postId, input.postId), eq(PostRevisions.kind, 'PUBLISHED')));
      });

      await enqueueJob('indexPost', input.postId);

      return input.postId;
    },
  }),

  likePost: t.withAuth({ user: true }).field({
    type: Post,
    args: { input: t.arg({ type: LikePostInput }) },
    resolve: async (_, { input }, context) => {
      await database
        .insert(PostLikes)
        .values({
          postId: input.postId,
          userId: context.session.userId,
        })
        .onConflictDoNothing();

      return input.postId;
    },
  }),

  unlikePost: t.withAuth({ user: true }).field({
    type: Post,
    args: { input: t.arg({ type: UnlikePostInput }) },
    resolve: async (_, { input }, context) => {
      await database
        .delete(PostLikes)
        .where(and(eq(PostLikes.postId, input.postId), eq(PostLikes.userId, context.session.userId)));

      return input.postId;
    },
  }),

  purchasePost: t.withAuth({ user: true }).field({
    type: Post,
    args: { input: t.arg({ type: PurchasePostInput }) },
    resolve: async (_, { input }, context) => {
      const posts = await database
        .select({
          userId: Posts.userId,
          space: { id: Spaces.id },
          revision: { id: PostRevisions.id, price: PostRevisions.price },
        })
        .from(Posts)
        .innerJoin(Spaces, eq(Spaces.id, Posts.spaceId))
        .innerJoin(PostRevisions, eq(PostRevisions.id, Posts.publishedRevisionId))
        .where(and(eq(Posts.id, input.postId), eq(Posts.state, 'PUBLISHED'), eq(Spaces.state, 'ACTIVE')));

      if (posts.length === 0) {
        throw new NotFoundError();
      }

      const [post] = posts;

      if (post.revision.id !== input.revisionId) {
        throw new IntentionalError('포스트 내용이 변경되었어요. 다시 시도해 주세요');
      }

      const price = post.revision.price;
      if (!price) {
        throw new IntentionalError('구매할 수 없는 포스트예요');
      }

      const meAsMember = await getSpaceMember(context, post.space.id);
      if (meAsMember) {
        throw new IntentionalError('자신이 속한 스페이스의 포스트는 구매할 수 없어요');
      }

      const purchases = await database
        .select({ id: PostPurchases.id })
        .from(PostPurchases)
        .where(and(eq(PostPurchases.postId, input.postId), eq(PostPurchases.userId, context.session.userId)));

      if (purchases.length > 0) {
        throw new IntentionalError('이미 구매한 포스트예요');
      }

      const purchaseId = await database.transaction(async (tx) => {
        const [purchase] = await tx
          .insert(PostPurchases)
          .values({
            userId: context.session.userId,
            postId: input.postId,
            revisionId: post.revision.id,
            pointAmount: price,
          })
          .returning({ id: PostPurchases.id });

        await deductUserPoint({
          tx,
          userId: context.session.userId,
          amount: price,
          targetId: purchase.id,
          cause: 'UNLOCK_CONTENT',
        });

        await tx.insert(Revenues).values({
          userId: post.userId,
          amount: price,
          targetId: purchase.id,
          kind: 'POST_PURCHASE',
          state: 'PENDING',
        });

        return purchase.id;
      });

      await enqueueJob('createNotification', {
        category: 'PURCHASE',
        targetId: purchaseId,
      });

      return input.postId;
    },
  }),

  updatePostView: t.field({
    type: Post,
    args: { input: t.arg({ type: UpdatePostViewInput }) },
    resolve: async (_, { input }, context) => {
      const views = await database
        .select({ id: PostViews.id })
        .from(PostViews)
        .where(
          and(
            eq(PostViews.postId, input.postId),
            context.session ? eq(PostViews.userId, context.session.userId) : eq(PostViews.deviceId, context.deviceId),
          ),
        );

      if (views.length > 0) {
        await database
          .update(PostViews)
          .set({ deviceId: context.deviceId, viewedAt: dayjs() })
          .where(eq(PostViews.id, views[0].id));
      } else {
        await database
          .insert(PostViews)
          .values({
            postId: input.postId,
            userId: context.session?.userId,
            deviceId: context.deviceId,
          })
          .onConflictDoNothing();

        await redis.incr(`Post:${input.postId}:viewCount`);
      }

      return input.postId;
    },
  }),

  createPostReaction: t.withAuth({ user: true }).field({
    type: Post,
    args: { input: t.arg({ type: CreatePostReactionInput }) },
    resolve: async (_, { input }, context) => {
      if (!emojiData.emojis[input.emoji]) {
        throw new IntentionalError('잘못된 이모지예요');
      }

      const post = await database
        .select({ userId: Posts.userId, spaceId: Posts.spaceId, receiveFeedback: Posts.receiveFeedback })
        .from(Posts)
        .where(eq(Posts.id, input.postId))
        .then(useFirstRowOrThrow(new NotFoundError()));

      if (!post.receiveFeedback) {
        throw new IntentionalError('피드백을 받지 않는 포스트예요');
      }

      const reactions = await database
        .insert(PostReactions)
        .values({
          userId: context.session.userId,
          postId: input.postId,
          emoji: input.emoji,
        })
        .onConflictDoNothing()
        .returning({ id: PostReactions.id });

      if (reactions.length > 0) {
        await enqueueJob('createNotification', {
          category: 'EMOJI_REACTION',
          targetId: reactions[0].id,
        });
      }

      return input.postId;
    },
  }),

  deletePostReaction: t.withAuth({ user: true }).field({
    type: Post,
    args: { input: t.arg({ type: DeletePostReactionInput }) },
    resolve: async (_, { input }, context) => {
      await database
        .delete(PostReactions)
        .where(
          and(
            eq(PostReactions.postId, input.postId),
            eq(PostReactions.userId, context.session.userId),
            eq(PostReactions.emoji, input.emoji),
          ),
        );

      return input.postId;
    },
  }),

  unlockPasswordedPost: t.field({
    type: Post,
    args: { input: t.arg({ type: UnlockPasswordedPostInput }) },
    resolve: async (_, { input }, context) => {
      const posts = await database.select({ password: Posts.password }).from(Posts).where(eq(Posts.id, input.postId));

      if (posts.length === 0) {
        throw new NotFoundError();
      }

      if (posts[0].password) {
        if (!(await verify(posts[0].password, input.password))) {
          throw new FormValidationError('password', '잘못된 비밀번호예요');
        }

        await redis.hset(`Post:${input.postId}:passwordUnlock`, context.deviceId, dayjs().add(1, 'hour').toISOString());
        await redis.expire(`Post:${input.postId}:passwordUnlock`, 60 * 60);
      }

      return input.postId;
    },
  }),

  generatePostShareImage: t.string({
    args: { input: t.arg({ type: GeneratePostShareImageInput }) },
    resolve: async (_, { input }) => {
      const png = await generatePostShareImage(input);
      return `data:image/png;base64,${png.toString('base64')}`;
    },
  }),

  synchronizePost: t.withAuth({ user: true }).field({
    type: [SynchronizePostResult],
    args: { input: t.arg({ type: SynchronizePostInput }) },
    resolve: async (_, { input }, context) => {
      const posts = await database
        .select({ userId: Posts.userId, spaceId: Posts.spaceId })
        .from(Posts)
        .leftJoin(Spaces, eq(Spaces.id, Posts.spaceId))
        .where(
          and(
            eq(Posts.id, input.postId),
            ne(Posts.state, 'DELETED'),
            or(eq(Spaces.state, 'ACTIVE'), isNull(Spaces.id)),
          ),
        );

      if (posts.length === 0) {
        throw new NotFoundError();
      }

      const [post] = posts;

      if (post.userId !== context.session.userId) {
        if (!post.spaceId) {
          throw new PermissionDeniedError();
        }

        const meAsMember = await getSpaceMember(context, post.spaceId);
        if (!meAsMember) {
          throw new PermissionDeniedError();
        }
      }

      if (input.kind === 'UPDATE') {
        pubsub.publish('post:synchronization', input.postId, {
          postId: input.postId,
          kind: 'UPDATE',
          data: input.data,
        });

        await database.insert(PostContentUpdates).values({
          postId: input.postId,
          userId: context.session.userId,
          clientId: input.clientId,
          data: toUint8Array(input.data),
        });

        await database
          .update(Posts)
          .set({ state: 'DRAFT' })
          .where(and(eq(Posts.id, input.postId), eq(Posts.state, 'EPHEMERAL')));

        await enqueueJob('updatePostContentState', input.postId);

        return [];
      } else if (input.kind === 'SYNCHRONIZE_1') {
        const state = await getPostContentState(input.postId);

        const clientStateVector = toUint8Array(input.data);
        const clientMissingUpdate = Y.diffUpdateV2(state.update, clientStateVector);
        const serverStateVector = state.vector;

        return [
          {
            postId: input.postId,
            kind: 'SYNCHRONIZE_2',
            data: fromUint8Array(clientMissingUpdate),
          },
          {
            postId: input.postId,
            kind: 'SYNCHRONIZE_1',
            data: fromUint8Array(serverStateVector),
          },
        ] as const;
      } else if (input.kind == 'SYNCHRONIZE_2') {
        pubsub.publish('post:synchronization', input.postId, {
          postId: input.postId,
          kind: 'UPDATE',
          data: input.data,
        });

        const serverMissingUpdate = toUint8Array(input.data);

        await database.insert(PostContentUpdates).values({
          postId: input.postId,
          userId: context.session.userId,
          clientId: input.clientId,
          data: serverMissingUpdate,
        });

        await enqueueJob('updatePostContentState', input.postId);

        pubsub.publish('post:synchronization', input.postId, {
          postId: input.postId,
          kind: 'SYNCHRONIZE_3',
          data: input.clientId,
        });

        return [];
      } else if (input.kind === 'AWARENESS') {
        pubsub.publish('post:synchronization', input.postId, {
          postId: input.postId,
          kind: 'AWARENESS',
          data: input.data,
        });

        return [];
      }

      throw new Error('Invalid kind');
    },
  }),
}));

/**
 * * Subscriptions
 */

builder.subscriptionFields((t) => ({
  postSynchronization: t.withAuth({ user: true }).field({
    type: SynchronizePostResult,
    args: { postId: t.arg.id() },
    subscribe: async (_, args, context) => {
      const posts = await database
        .select({ userId: Posts.userId, spaceId: Posts.spaceId })
        .from(Posts)
        .leftJoin(Spaces, eq(Spaces.id, Posts.spaceId))
        .where(
          and(eq(Posts.id, args.postId), ne(Posts.state, 'DELETED'), or(eq(Spaces.state, 'ACTIVE'), isNull(Spaces.id))),
        );

      if (posts.length === 0) {
        throw new NotFoundError();
      }

      const [post] = posts;

      if (post.userId !== context.session.userId) {
        if (!post.spaceId) {
          throw new PermissionDeniedError();
        }

        const meAsMember = await getSpaceMember(context, post.spaceId);
        if (!meAsMember) {
          throw new PermissionDeniedError();
        }
      }

      try {
        return pipe(
          Repeater.merge([
            pubsub.subscribe('post:synchronization', args.postId),
            new Repeater<SynchronizePostResultType>(async (push, stop) => {
              push({
                postId: args.postId,
                kind: 'PING',
                data: dayjs().valueOf().toString(),
              });

              const interval = setInterval(() => {
                push({
                  postId: args.postId,
                  kind: 'PING',
                  data: dayjs().valueOf().toString(),
                });
              }, 1000);

              await stop;
              clearInterval(interval);
            }),
          ]),
        );
      } catch (err) {
        const errId = Sentry.captureException(err, {
          tags: {
            section: 'gql_subscription_postSynchronization',
          },
        });
        throw new UnknownError(err, errId);
      }
    },
    resolve: (payload) => payload,
  }),
}));
