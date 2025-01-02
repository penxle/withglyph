import { and, eq } from 'drizzle-orm';
import { database, Posts } from '$lib/server/database';
import { builder } from '../builder';
import { Post } from './post';

builder.inputType('CreateTemplateBasedPostInput', {
  fields: (t) => ({
    templateId: t.id(),
  }),
});

builder.queryFields((t) => ({
  templatePosts: t.withAuth({ user: true }).field({
    type: [Post],
    resolve: async (_, __, context) => {
      return await database
        .select()
        .from(Posts)
        .where(and(eq(Posts.state, 'TEMPLATE'), eq(Posts.userId, context.session.userId)));
    },
  }),
}));
