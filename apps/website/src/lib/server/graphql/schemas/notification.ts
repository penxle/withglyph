import { and, eq } from 'drizzle-orm';
import { match } from 'ts-pattern';
import { UserNotificationCategory, UserNotificationState } from '$lib/enums';
import { NotFoundError } from '$lib/errors';
import { database, inArray, PostComments, UserNotifications } from '$lib/server/database';
import { builder } from '../builder';
import { createInterfaceRef, createObjectRef } from '../utils';
import { PostComment } from './comment';
import { Post } from './post';
import { Space } from './space';
import { Profile } from './user';

/**
 * * Types
 */

export const IUserNotification = createInterfaceRef('IUserNotification', UserNotifications);
IUserNotification.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    category: t.expose('category', { type: UserNotificationCategory }),
    state: t.expose('state', { type: UserNotificationState }),
    data: t.expose('data', { type: 'JSON' }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),

    actor: t.field({
      type: Profile,
      nullable: true,
      resolve: (notification) => notification.actorId,
    }),
  }),

  resolveType: (notification) =>
    match(notification.category)
      .with('PURCHASE', () => 'PurchaseNotification')
      .with('SUBSCRIBE', () => 'SubscribeNotification')
      .with('COMMENT', () => 'CommentNotification')
      .with('EMOJI_REACTION', () => 'EmojiReactionNotification')
      .with('NEW_POST', () => 'NewPostNotification')
      .run(),
});

export const PurchaseNotification = createObjectRef('PurchaseNotification', UserNotifications);
PurchaseNotification.implement({
  interfaces: [IUserNotification],
  fields: (t) => ({
    post: t.field({
      type: Post,
      resolve: async (notification) => {
        const data = notification.data as { postId: string };
        return data.postId;
      },
    }),
  }),
});

export const SubscribeNotification = createObjectRef('SubscribeNotification', UserNotifications);
SubscribeNotification.implement({
  interfaces: [IUserNotification],
  fields: (t) => ({
    space: t.field({
      type: Space,
      resolve: (notification) => {
        const data = notification.data as { spaceId: string };
        return data.spaceId;
      },
    }),
  }),
});

export const CommentNotification = createObjectRef('CommentNotification', UserNotifications);
CommentNotification.implement({
  interfaces: [IUserNotification],
  fields: (t) => ({
    post: t.field({
      type: Post,
      resolve: async (notification, _, context) => {
        const data = notification.data as { commentId: string };

        const comment = await PostComment.getDataloader(context).load(data.commentId);
        return comment.postId;
      },
    }),

    comment: t.field({
      type: PostComment,
      resolve: async (notification) => {
        const data = notification.data as { commentId: string };
        return data.commentId;
      },
    }),

    parentComment: t.field({
      type: PostComment,
      nullable: true,
      resolve: async (notification) => {
        const data = notification.data as { commentId: string };

        const comments = await database
          .select({ parentId: PostComments.parentId })
          .from(PostComments)
          .where(eq(PostComments.id, data.commentId));

        if (comments.length === 0) {
          throw new NotFoundError();
        }

        return comments[0].parentId;
      },
    }),
  }),
});

export const EmojiReactionNotification = createObjectRef('EmojiReactionNotification', UserNotifications);
EmojiReactionNotification.implement({
  interfaces: [IUserNotification],
  fields: (t) => ({
    emoji: t.string({
      resolve: (notification) => {
        const data = notification.data as { emoji: string };
        return data.emoji;
      },
    }),

    post: t.field({
      type: Post,
      resolve: async (notification) => {
        const data = notification.data as { postId: string };
        return data.postId;
      },
    }),
  }),
});

export const NewPostNotification = createObjectRef('NewPostNotification', UserNotifications);
NewPostNotification.implement({
  interfaces: [IUserNotification],
  fields: (t) => ({
    post: t.field({
      type: Post,
      resolve: async (notification) => {
        const data = notification.data as { postId: string };
        return data.postId;
      },
    }),
  }),
});

/**
 * * Inputs
 */

const MarkNotificationAsReadInput = builder.inputType('MarkNotificationAsReadInput', {
  fields: (t) => ({
    notificationId: t.id(),
  }),
});

/**
 * * Mutations
 */

builder.mutationFields((t) => ({
  markNotificationAsRead: t.withAuth({ user: true }).field({
    type: IUserNotification,
    args: { input: t.arg({ type: MarkNotificationAsReadInput }) },
    resolve: async (_, { input }, context) => {
      await database
        .update(UserNotifications)
        .set({ state: 'READ' })
        .where(
          and(eq(UserNotifications.id, input.notificationId), eq(UserNotifications.userId, context.session.userId)),
        );

      return input.notificationId;
    },
  }),

  markAllNotificationsAsRead: t.withAuth({ user: true }).field({
    type: [IUserNotification],
    resolve: async (_, __, context) => {
      const unreadNotificationIds = await database
        .select({ id: UserNotifications.id })
        .from(UserNotifications)
        .where(and(eq(UserNotifications.userId, context.session.userId), eq(UserNotifications.state, 'UNREAD')))
        .then((rows) => rows.map((row) => row.id));

      if (unreadNotificationIds.length > 0) {
        await database
          .update(UserNotifications)
          .set({ state: 'READ' })
          .where(inArray(UserNotifications.id, unreadNotificationIds));
      }

      return unreadNotificationIds;
    },
  }),
}));
