import { and, eq } from 'drizzle-orm';
import { database, PostRevisions, Posts, Profiles, SpaceFollows, SpaceMembers, Spaces } from '$lib/server/database';
import { createNotification, useFirstRow } from '$lib/server/utils';
import type { NotificationMaker } from './type';

export const spaceNewPostNotificationMaker: NotificationMaker = async (postId: string) => {
  const post = await database
    .select({
      permalink: Posts.permalink,
      title: PostRevisions.title,
      userId: Posts.userId,
      memberProfileId: SpaceMembers.profileId,
      memberProfileName: Profiles.name,
      spaceId: Spaces.id,
      spaceSlug: Spaces.slug,
      spaceName: Spaces.name,
    })
    .from(Posts)
    .innerJoin(Spaces, eq(Posts.spaceId, Spaces.id))
    .innerJoin(PostRevisions, eq(Posts.publishedRevisionId, PostRevisions.id))
    .innerJoin(
      SpaceMembers,
      and(
        eq(SpaceMembers.spaceId, Posts.spaceId),
        eq(SpaceMembers.userId, Posts.userId),
        eq(SpaceMembers.state, 'ACTIVE'),
      ),
    )
    .innerJoin(Profiles, eq(SpaceMembers.profileId, Profiles.id))
    .where(and(eq(Posts.id, postId), eq(Posts.state, 'PUBLISHED'), eq(Posts.visibility, 'PUBLIC')))
    .then(useFirstRow);

  if (!post) {
    return;
  }

  const followerIds = await database
    .select({
      userId: SpaceFollows.userId,
    })
    .from(SpaceFollows)
    .where(and(eq(SpaceFollows.spaceId, post.spaceId)))
    .then((rows) => rows.map((row) => row.userId));

  await Promise.all(
    followerIds.map(async (userId) => {
      await createNotification({
        userId,
        category: 'NEW_POST',
        actorId: post.memberProfileId,
        data: {
          postId,
        },
        pushTitle: post.spaceName,
        pushBody: `${post.title} 글이 올라왔어요.`,
        pushPath: `/${post.spaceSlug}/${post.permalink}`,
      });
    }),
  );
};
