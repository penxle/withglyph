import { init } from '@paralleldrive/cuid2';
import { sql } from 'drizzle-orm';
import { bigserial, boolean, index, integer, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import * as E from './enums';
import { bytea, datetime, jsonb } from './types';
import type { JSONContent } from '@tiptap/core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

const createId = init({ length: 16 });

export const PostComments = pgTable(
  'post_comments',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    postId: text('post_id')
      .notNull()
      .references(() => Posts.id),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    profileId: text('profile_id')
      .notNull()
      .references(() => Profiles.id),
    parentId: text('parent_id').references((): AnyPgColumn => PostComments.id),
    state: E._PostCommentState('state').notNull(),
    visibility: E._PostCommentVisibility('visibility').notNull(),
    content: text('content').notNull(),
    pinned: boolean('pinned').notNull().default(false),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
    updatedAt: datetime('updated_at'),
  },
  (t) => ({
    postIdCreatedAtIdx: index().on(t.postId, t.createdAt),
  }),
);

export const PostCommentLikes = pgTable(
  'post_comment_likes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    commentId: text('comment_id')
      .notNull()
      .references(() => PostComments.id),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    profileId: text('profile_id')
      .notNull()
      .references(() => Profiles.id),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    commentIdUserIdUniqIdx: uniqueIndex().on(t.commentId, t.userId),
  }),
);

export const RevenueWithdrawals = pgTable('revenue_withdrawals', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id')
    .notNull()
    .references(() => Users.id),
  bankCode: text('bank_code').notNull(),
  bankAccountNumber: text('bank_account_number').notNull(),
  revenueAmount: integer('revenue_amount').notNull(),
  taxBaseAmount: integer('tax_base_amount').notNull(),
  taxAmount: integer('tax_amount').notNull(),
  serviceFeeAmount: integer('service_fee_amount').notNull(),
  withdrawalFeeAmount: integer('withdrawal_fee_amount').notNull(),
  totalFeeAmount: integer('total_fee_amount').notNull(),
  paidAmount: integer('paid_amount').notNull(),
  txId: text('tx_id'),
  kind: E._RevenueWithdrawalKind('kind').notNull(),
  state: E._RevenueWithdrawalState('state').notNull().default('PENDING'),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const Embeds = pgTable('embeds', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  url: text('url').notNull().unique(),
  type: text('type').notNull(),
  title: text('title'),
  description: text('description'),
  html: text('html'),
  thumbnailUrl: text('thumbnail_url'),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const PostTags = pgTable(
  'post_tags',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    postId: text('post_id')
      .notNull()
      .references(() => Posts.id),
    tagId: text('tag_id')
      .notNull()
      .references(() => Tags.id),
    kind: E._PostTagKind('kind').notNull(),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    postIdTagIdKindUniqIdx: uniqueIndex().on(t.postId, t.tagId, t.kind),
    tagIdIdx: index().on(t.tagId),
  }),
);

export const BookmarkGroups = pgTable('bookmarks', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id')
    .notNull()
    .references(() => Users.id),
  name: text('name').notNull(),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const BookmarkGroupPosts = pgTable(
  'bookmark_posts',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    bookmarkGroupId: text('bookmark_id')
      .notNull()
      .references(() => BookmarkGroups.id),
    postId: text('post_id')
      .notNull()
      .references(() => Posts.id),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    bookmarkGroupIdPostIdUniqIdx: uniqueIndex().on(t.bookmarkGroupId, t.postId),
  }),
);

export const Files = pgTable('files', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id')
    .notNull()
    .references(() => Users.id),
  name: text('name').notNull(),
  format: text('format').notNull(),
  size: integer('size').notNull(),
  path: text('path').notNull(),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const Images = pgTable('images', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id').references((): AnyPgColumn => Users.id),
  name: text('name').notNull(),
  format: text('format').notNull(),
  size: integer('size').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  path: text('path').notNull(),
  color: text('color').notNull(),
  placeholder: text('placeholder').notNull(),
  hash: text('hash').notNull(),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const PointBalances = pgTable(
  'point_balances',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    purchaseId: text('purchase_id').references(() => PointPurchases.id),
    kind: E._PointKind('kind').notNull(),
    initial: integer('initial').notNull(),
    leftover: integer('leftover').notNull(),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
    expiresAt: datetime('expires_at').notNull(),
  },
  (t) => ({
    userIdKindCreatedAtIdx: index().on(t.userId, t.kind, t.createdAt),
  }),
);

export const PointPurchases = pgTable('point_purchases', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id')
    .notNull()
    .references(() => Users.id),
  pointAmount: integer('point_amount').notNull(),
  paymentAmount: integer('payment_amount').notNull(),
  paymentMethod: E._PaymentMethod('payment_method').notNull(),
  paymentKey: text('payment_key').notNull().unique(),
  paymentData: jsonb('payment_data').notNull(),
  paymentResult: jsonb('payment_result'),
  state: E._PointPurchaseState('state').notNull(),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
  expiresAt: datetime('expires_at').notNull(),
  completedAt: datetime('completed_at'),
});

export const PointTransactions = pgTable('point_transactions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id')
    .notNull()
    .references(() => Users.id),
  cause: E._PointTransactionCause('cause').notNull(),
  amount: integer('amount').notNull(),
  targetId: text('target_id'),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const Spaces = pgTable(
  'spaces',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    iconId: text('icon_id')
      .notNull()
      .references(() => Images.id),
    visibility: E._SpaceVisibility('visibility').notNull(),
    state: E._SpaceState('state').notNull(),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    slugStateIdx: index().on(t.slug, t.state),
    stateVisibilityIdx: index().on(t.state, t.visibility),
  }),
);

export const SpaceMembers = pgTable(
  'space_members',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    spaceId: text('space_id')
      .notNull()
      .references(() => Spaces.id),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    profileId: text('profile_id')
      .notNull()
      .references(() => Profiles.id),
    state: E._SpaceMemberState('state').notNull(),
    role: E._SpaceMemberRole('role').notNull(),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    spaceIdUserIdUniqIdx: uniqueIndex().on(t.spaceId, t.userId),
    spaceIdUserIdStateIdx: index().on(t.spaceId, t.userId, t.state),
    userIdSpaceIdStateIdx: index().on(t.userId, t.spaceId, t.state),
  }),
);

export const PostLikes = pgTable(
  'post_likes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    postId: text('post_id')
      .notNull()
      .references(() => Posts.id),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    postIdUserIdUniqIdx: uniqueIndex().on(t.postId, t.userId),
  }),
);

export const PostReactions = pgTable(
  'post_reactions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    postId: text('post_id')
      .notNull()
      .references(() => Posts.id),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    emoji: text('emoji').notNull(),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    createdAtIdx: index().on(t.createdAt),
    postIdUserIdEmojiUniqIdx: uniqueIndex().on(t.postId, t.userId, t.emoji),
  }),
);

export const PostRevisionContents = pgTable('post_revision_contents', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  hash: text('hash').notNull().unique(),
  data: jsonb('data').$type<JSONContent[]>().notNull(),
  text: text('text').notNull().default(''),
  characters: integer('characters').notNull().default(0),
  images: integer('images').notNull().default(0),
  files: integer('files').notNull().default(0),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const Tags = pgTable(
  'tags',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text('name').notNull().unique(),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    createdAtIdx: index('tags_created_at_idx').on(t.createdAt),
  }),
);

export const PostViews = pgTable(
  'post_views',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    postId: text('post_id')
      .notNull()
      .references(() => Posts.id),
    userId: text('user_id').references(() => Users.id),
    deviceId: text('device_id').notNull(),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
    viewedAt: datetime('viewed_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    userIdViewedAtIdx: index().on(t.userId, t.viewedAt),
    userIdPostIdUniqIdx: uniqueIndex().on(t.postId, t.userId),
  }),
);

export const SpaceCollections = pgTable(
  'space_collections',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    spaceId: text('space_id')
      .notNull()
      .references(() => Spaces.id),
    thumbnailId: text('thumbnail_id').references(() => Images.id),
    name: text('name').notNull(),
    description: text('description'),
    state: E._SpaceCollectionState('state').notNull(),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    spaceIdStateIdx: index().on(t.spaceId, t.state),
  }),
);

export const SpaceCollectionPosts = pgTable(
  'space_collection_posts',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    collectionId: text('collection_id')
      .notNull()
      .references(() => SpaceCollections.id),
    postId: text('post_id')
      .notNull()
      .unique()
      .references(() => Posts.id),
    order: integer('order').notNull(),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    collectionIdOrderUniqIdx: uniqueIndex().on(t.collectionId, t.order),
  }),
);

export const PostPurchases = pgTable(
  'post_purchases',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    postId: text('post_id')
      .notNull()
      .references(() => Posts.id),
    revisionId: text('revision_id')
      .notNull()
      .references(() => PostRevisions.id),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    pointAmount: integer('point_amount').notNull().default(0),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    postIdUserIdUniqIdx: uniqueIndex().on(t.postId, t.userId),
  }),
);

export const PostRevisions = pgTable(
  'post_revisions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    postId: text('post_id')
      .notNull()
      .references((): AnyPgColumn => Posts.id),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    freeContentId: text('free_content_id').references(() => PostRevisionContents.id),
    paidContentId: text('paid_content_id').references(() => PostRevisionContents.id),
    price: integer('price'),
    kind: E._PostRevisionKind('kind').notNull(),
    title: text('title'),
    subtitle: text('subtitle'),
    paragraphIndent: integer('paragraph_indent').notNull().default(100),
    paragraphSpacing: integer('paragraph_spacing').notNull().default(100),
    attributes: jsonb('attributes')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'`),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
    updatedAt: datetime('updated_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    postIdCreatedAtIdx: index().on(t.postId, t.createdAt),
  }),
);

export const SpaceExternalLinks = pgTable('space_external_links', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  spaceId: text('space_id')
    .notNull()
    .references(() => Spaces.id),
  url: text('url').notNull(),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const SpaceFollows = pgTable(
  'space_follows',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    spaceId: text('space_id')
      .notNull()
      .references(() => Spaces.id),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    userIdSpaceIdUniqIdx: uniqueIndex().on(t.userId, t.spaceId),
  }),
);

export const SpaceUserBlocks = pgTable('space_user_blocks', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  spaceId: text('space_id')
    .notNull()
    .references(() => Spaces.id),
  userId: text('user_id')
    .notNull()
    .references(() => Users.id),
  reason: text('reason'),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const SpaceMemberInvitations = pgTable('space_member_invitations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  spaceId: text('space_id')
    .notNull()
    .references(() => Spaces.id),
  sentUserId: text('sent_user_id')
    .notNull()
    .references(() => Users.id),
  receivedUserId: text('received_user_id').references(() => Users.id),
  receivedEmail: text('received_email').notNull(),
  role: E._SpaceMemberRole('role').notNull(),
  state: E._SpaceMemberInvitationState('state').notNull(),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
  respondedAt: datetime('responded_at'),
});

export const TagFollows = pgTable(
  'tag_follows',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    tagId: text('tag_id')
      .notNull()
      .references(() => Tags.id),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    userIdTagIdUniqIdx: uniqueIndex().on(t.userId, t.tagId),
  }),
);

export const TagHierarchies = pgTable('tag_hierarchies', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  parentTagId: text('parent_tag_id')
    .notNull()
    .unique()
    .references(() => Tags.id),
  childTagId: text('child_tag_id')
    .notNull()
    .unique()
    .references(() => Tags.id),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const TagWikis = pgTable('tag_wikis', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  tagId: text('tag_id')
    .notNull()
    .unique()
    .references(() => Tags.id),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const TagWikiRevisions = pgTable(
  'tag_wiki_revisions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    tagWikiId: text('tag_wiki_id')
      .notNull()
      .references(() => TagWikis.id),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    content: text('content').notNull(),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    createdAtIdx: index().on(t.createdAt),
  }),
);

export const SpaceMasquerades = pgTable(
  'space_masquerades',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    spaceId: text('space_id')
      .notNull()
      .references(() => Spaces.id),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    profileId: text('profile_id')
      .notNull()
      .unique()
      .references(() => Profiles.id),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
    blockedAt: datetime('blocked_at'),
  },
  (t) => ({
    spaceIdUserIdUniqIdx: uniqueIndex().on(t.spaceId, t.userId),
  }),
);

export const Posts = pgTable(
  'posts',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    permalink: text('permalink').notNull().unique(),
    spaceId: text('space_id').references(() => Spaces.id),
    memberId: text('member_id').references(() => SpaceMembers.id),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    publishedRevisionId: text('published_revision_id').references(() => PostRevisions.id),
    state: E._PostState('state').notNull(),
    visibility: E._PostVisibility('visibility').notNull(),
    discloseStats: boolean('disclose_stats').notNull(),
    receiveFeedback: boolean('receive_feedback').notNull(),
    receivePatronage: boolean('receive_patronage').notNull(),
    receiveTagContribution: boolean('receive_tag_contribution').notNull(),
    password: text('password'),
    protectContent: boolean('protect_content').notNull().default(true),
    ageRating: E._PostAgeRating('age_rating').notNull().default('ALL'),
    externalSearchable: boolean('external_searchable').notNull().default(true),
    pairs: E._PostPair('pairs')
      .array()
      .notNull()
      .default(sql`'{}'`),
    category: E._PostCategory('category').notNull().default('OTHER'),
    commentQualification: E._PostCommentQualification('comment_qualification').notNull().default('ANY'),
    thumbnailId: text('thumbnail_id').references(() => Images.id),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
    publishedAt: datetime('published_at'),
  },
  (t) => ({
    publishedAtIdx: index().on(t.publishedAt),
    stateVisibilityIdx: index().on(t.state, t.visibility),
    spaceIdStateVisibilityIdx: index().on(t.spaceId, t.state, t.visibility),
    userIdStateVisibilityIdx: index().on(t.userId, t.state, t.visibility),
  }),
);

export const Revenues = pgTable('revenues', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id')
    .notNull()
    .references(() => Users.id),
  targetId: text('target_id'),
  state: E._RevenueState('state').notNull(),
  kind: E._RevenueKind('kind').notNull(),
  amount: integer('amount').notNull(),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
  withdrawalId: text('withdrawal_id').references(() => RevenueWithdrawals.id),
});

export const Profiles = pgTable('profiles', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text('name').notNull(),
  avatarId: text('avatar_id')
    .notNull()
    .references(() => Images.id),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const Users = pgTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    email: text('email').notNull(),
    profileId: text('profile_id')
      .notNull()
      .unique()
      .references(() => Profiles.id),
    state: E._UserState('state').notNull(),
    role: E._UserRole('role').notNull().default('USER'),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    emailStateIdx: index().on(t.email, t.state),
  }),
);

export const UserSettlementIdentities = pgTable('user_settlement_identities', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => Users.id),
  residentRegistrationNumberHash: text('resident_registration_number_hash')
    .notNull()
    .unique('user_settlement_identities_rrn_hash_unique'),
  encryptedResidentRegistrationNumber: text('encrypted_resident_registration_number').notNull(),
  encryptedResidentRegistrationNumberNonce: text('encrypted_resident_registration_number_nonce').notNull(),
  bankCode: text('bank_code').notNull(),
  bankAccountNumber: text('bank_account_number').notNull(),
  bankAccountHolderName: text('bank_account_holder_name').notNull(),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const UserNotifications = pgTable(
  'user_notifications',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    actorId: text('actor_id').references(() => Profiles.id),
    category: E._UserNotificationCategory('category').notNull(),
    state: E._UserNotificationState('state').notNull(),
    data: jsonb('data'),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    createdAtIndex: index().on(t.createdAt),
  }),
);

export const UserEmailVerifications = pgTable('user_email_verifications', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id').references(() => Users.id),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  code: text('code'),
  kind: E._UserEmailVerificationKind('kind').notNull(),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
  expiresAt: datetime('expires_at').notNull(),
});

export const UserMarketingConsents = pgTable('user_marketing_consents', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => Users.id),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const UserNotificationPreferences = pgTable(
  'user_notification_preferences',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    category: E._UserNotificationCategory('category').notNull(),
    method: E._UserNotificationMethod('method').notNull(),
    opted: boolean('opted').notNull(),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    userIdCategoryMethodUniqIdx: uniqueIndex().on(t.userId, t.category, t.method),
  }),
);

export const UserSingleSignOns = pgTable(
  'user_single_sign_ons',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    provider: E._UserSingleSignOnProvider('provider').notNull(),
    principal: text('principal').notNull(),
    email: text('email').notNull(),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    userIdProviderUniqIdx: uniqueIndex().on(t.userId, t.provider),
    providerPrincipalUniqIdx: uniqueIndex().on(t.provider, t.principal),
  }),
);

export const UserSessions = pgTable('user_sessions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id')
    .notNull()
    .references(() => Users.id),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const UserSpaceMutes = pgTable(
  'user_space_mutes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    spaceId: text('space_id')
      .notNull()
      .references(() => Spaces.id),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    userIdSpaceIdUniqIdx: uniqueIndex().on(t.userId, t.spaceId),
  }),
);

export const UserTagMutes = pgTable(
  'user_tag_mute',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    tagId: text('tag_id')
      .notNull()
      .references(() => Tags.id),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    userIdTagIdUniqIdx: uniqueIndex().on(t.userId, t.tagId),
  }),
);

export const UserEventEnrollments = pgTable(
  'user_event_enrollments',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    eventCode: text('event_code').notNull(),
    eligible: boolean('eligible').notNull(),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
    rewardedAt: datetime('rewarded_at'),
  },
  (t) => ({
    userIdEventCodeUniqIdx: uniqueIndex().on(t.userId, t.eventCode),
  }),
);

export const UserContentFilterPreferences = pgTable(
  'user_content_filter_preferences',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    category: E._ContentFilterCategory('category').notNull(),
    action: E._ContentFilterAction('action').notNull(),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    userIdCategoryUniqIdx: uniqueIndex().on(t.userId, t.category),
  }),
);

export const UserPersonalIdentities = pgTable('user_personal_identities', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => Users.id),
  name: text('name').notNull(),
  birthday: datetime('birthday').notNull(),
  phoneNumber: text('phone_number'),
  ci: text('ci').notNull(),
  kind: E._UserPersonalIdentityKind('kind').notNull().default('PHONE'),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
  expiresAt: datetime('expires_at'),
});

export const ProvisionedUsers = pgTable('provisioned_users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  token: text('token').notNull().unique(),
  email: text('email').notNull(),
  provider: E._UserSingleSignOnProvider('provider'),
  principal: text('principal'),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const Banners = pgTable('banners', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull(),
  bottomline: text('bottomline'),
  color: text('color').notNull(),
  backgroundImageUrl: text('background_image_url').notNull(),
  href: text('href').notNull(),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const CurationPosts = pgTable('curation_posts', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  postId: text('post_id')
    .notNull()
    .references(() => Posts.id),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const PostContentUpdates = pgTable(
  'post_content_updates',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    postId: text('post_id')
      .notNull()
      .references(() => Posts.id),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    clientId: text('client_id').notNull(),
    data: bytea('data').notNull(),
    seq: bigserial('seq', { mode: 'bigint' }).notNull(),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    postIdSeqIdx: index().on(t.postId, t.seq),
  }),
);

export const PostContentStates = pgTable('post_content_states', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  postId: text('post_id')
    .notNull()
    .unique()
    .references(() => Posts.id),
  update: bytea('update').notNull(),
  vector: bytea('vector').notNull(),
  upToSeq: bigserial('up_to_seq', { mode: 'bigint' }).notNull(),
  title: text('title'),
  subtitle: text('subtitle'),
  content: jsonb('content').$type<JSONContent>().notNull(),
  text: text('text').notNull(),
  characters: integer('characters').notNull(),
  images: integer('images').notNull(),
  files: integer('files').notNull(),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
  updatedAt: datetime('updated_at')
    .notNull()
    .default(sql`now()`),
});

export const PostContentSnapshots = pgTable(
  'post_content_snapshots',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    postId: text('post_id')
      .notNull()
      .references(() => Posts.id),
    data: bytea('data').notNull(),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    postIdCreatedAtIdx: index().on(t.postId, t.createdAt),
  }),
);

export const FeatureFlags = pgTable('feature_flags', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  flag: E._FeatureFlag('flag').notNull().unique(),
  ratio: integer('ratio').notNull(),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const UserPushNotificationTokens = pgTable('user_push_notification_tokens', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id')
    .notNull()
    .references(() => Users.id),
  token: text('token').notNull().unique(),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const FeaturedImages = pgTable('featured_images', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  imageId: text('image_id')
    .notNull()
    .references(() => Images.id),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const RedeemCodeGroups = pgTable('redeem_code_groups', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id')
    .notNull()
    .references(() => Users.id),
  spaceId: text('space_id')
    .notNull()
    .references(() => Spaces.id),
  memberId: text('member_id')
    .notNull()
    .references(() => SpaceMembers.id),
  postId: text('post_id')
    .notNull()
    .references(() => Posts.id),
  state: E._RedeemCodeGroupState('state').notNull(),
  description: text('description'),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
  expiresAt: datetime('expires_at').notNull(),
});

export const RedeemCodes = pgTable('redeem_codes', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  groupId: text('group_id')
    .notNull()
    .references(() => RedeemCodeGroups.id),
  state: E._RedeemCodeState('state').notNull(),
  code: text('code').notNull().unique(),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`now()`),
});

export const RedeemCodeRedemptions = pgTable('redeem_code_redemptions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  codeId: text('code_id')
    .notNull()
    .references(() => RedeemCodes.id),
  purchaseId: text('purchase_id')
    .notNull()
    .references(() => PostPurchases.id),
  createdAt: datetime('used_at')
    .notNull()
    .default(sql`now()`),
});

export const UserArbitraryKeyValues = pgTable(
  'user_arbitrary_key_values',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id')
      .notNull()
      .references(() => Users.id),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    userIdKeyUniqIdx: uniqueIndex().on(t.userId, t.key),
  }),
);
