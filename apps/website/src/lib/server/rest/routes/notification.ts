import { eq } from 'drizzle-orm';
import { status } from 'itty-router';
import { match } from 'ts-pattern';
import { database, PostComments, Posts, Spaces, UserNotifications } from '$lib/server/database';
import { createRouter } from '../router';
import type { Notification } from '$lib/utils';

export const notification = createRouter();

notification.get('/notification/:notificationId', async (request) => {
  const notificationId = request.params.notificationId;
  if (!notificationId) {
    throw new Error('notificationId is required');
  }

  const notifications = await database.select().from(UserNotifications).where(eq(UserNotifications.id, notificationId));
  const notification = notifications[0] as Notification;

  if (notifications.length === 0) {
    return status(307, { headers: { Location: `/404` } });
  }

  return status(307, {
    headers: {
      Location: await match(notification)
        .with({ category: 'PURCHASE' }, async ({ data }) => {
          const posts = await database
            .select({ permalink: Posts.permalink, space: { slug: Spaces.slug } })
            .from(Posts)
            .innerJoin(Spaces, eq(Spaces.id, Posts.spaceId))
            .where(eq(Posts.id, data.postId));

          if (posts.length === 0) {
            return `/404`;
          }

          return `/${posts[0].space.slug}/${posts[0].permalink}`;
        })
        .with({ category: 'SUBSCRIBE' }, async ({ data }) => {
          const spaces = await database.select({ slug: Spaces.slug }).from(Spaces).where(eq(Spaces.id, data.spaceId));
          if (spaces.length === 0) {
            return `/404`;
          }

          return `/${spaces[0].slug}`;
        })
        .with({ category: 'COMMENT' }, async ({ data }) => {
          const comments = await database
            .select({ post: { permalink: Posts.permalink }, space: { slug: Spaces.slug } })
            .from(PostComments)
            .innerJoin(Posts, eq(Posts.id, PostComments.postId))
            .innerJoin(Spaces, eq(Spaces.id, Posts.spaceId))
            .where(eq(PostComments.id, data.commentId));

          if (comments.length === 0) {
            return `/404`;
          }

          return `/${comments[0].space.slug}/${comments[0].post.permalink}`;
        })
        .with({ category: 'EMOJI_REACTION' }, async ({ data }) => {
          const posts = await database
            .select({ permalink: Posts.permalink, space: { slug: Spaces.slug } })
            .from(Posts)
            .innerJoin(Spaces, eq(Spaces.id, Posts.spaceId))
            .where(eq(Posts.id, data.postId));

          if (posts.length === 0) {
            return `/404`;
          }

          return `/${posts[0].space.slug}/${posts[0].permalink}`;
        })
        .with({ category: 'NEW_POST' }, async ({ data }) => {
          const posts = await database
            .select({ permalink: Posts.permalink, space: { slug: Spaces.slug } })
            .from(Posts)
            .innerJoin(Spaces, eq(Spaces.id, Posts.spaceId))
            .where(eq(Posts.id, data.postId));

          if (posts.length === 0) {
            return `/404`;
          }

          return `/${posts[0].space.slug}/${posts[0].permalink}`;
        })
        .exhaustive(),
    },
  });
});
