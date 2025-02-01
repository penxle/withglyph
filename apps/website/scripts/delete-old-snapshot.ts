/* eslint-disable unicorn/no-process-exit */
import dayjs from 'dayjs';
import { and, count, desc, eq, gt, lt, ne, sql } from 'drizzle-orm';
import { database, PostContentSnapshots, Posts } from '$lib/server/database';
import { useFirstRow } from '$lib/server/utils/database';

let lastId = ' ';
let total: number | undefined;

const limit = dayjs().subtract(1, 'day');
const batchSize = 100;

await database.execute(sql`set session_replication_role = replica;`);

database
  .select({ count: count(Posts.id) })
  .from(Posts)
  .where(ne(Posts.state, 'EPHEMERAL'))
  // eslint-disable-next-line unicorn/prefer-top-level-await
  .then(([row]) => {
    total = row.count;
  });

for (let i = 0; ; i++) {
  const posts = await database
    .select({ id: Posts.id })
    .from(Posts)
    .where(and(gt(Posts.id, lastId), ne(Posts.state, 'EPHEMERAL')))
    .orderBy(Posts.id)
    .limit(batchSize);

  if (posts.length === 0) {
    break;
  }

  const message = `Processed ${i * batchSize + posts.length} / ${total ?? '???'} posts`;
  console.time(message);

  const ids = posts.map((post) => post.id);

  await Promise.all(
    ids.map(async (id) => {
      const lastSnapshot = await database
        .select({ id: PostContentSnapshots.id })
        .from(PostContentSnapshots)
        .where(eq(PostContentSnapshots.postId, id))
        .orderBy(desc(PostContentSnapshots.createdAt))
        .limit(1)
        .then(useFirstRow);

      if (lastSnapshot) {
        await database
          .delete(PostContentSnapshots)
          .where(
            and(
              eq(PostContentSnapshots.postId, id),
              ne(PostContentSnapshots.id, lastSnapshot.id),
              lt(PostContentSnapshots.createdAt, limit),
            ),
          );
      }
    }),
  );

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  lastId = posts.at(-1)!.id;

  console.timeEnd(message);
}

process.exit(0);
