import { webcrypto } from 'node:crypto';
import dayjs from 'dayjs';
import { and, asc, count, desc, eq, gt, gte, lt, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import qs from 'query-string';
import * as R from 'radash';
import { match } from 'ts-pattern';
import { env } from '$env/dynamic/private';
import {
  AuthScope,
  AuthTokenKind,
  ContentFilterAction,
  ContentFilterCategory,
  PointKind,
  PostAgeRating,
  PostState,
  UserEmailVerificationKind,
  UserNotificationCategory,
  UserNotificationMethod,
  UserSingleSignOnAuthorizationType,
  UserSingleSignOnProvider,
  UserState,
} from '$lib/enums';
import { IntentionalError, NotFoundError, PermissionDeniedError } from '$lib/errors';
import {
  BookmarkGroups,
  database,
  Images,
  PointTransactions,
  PostComments,
  PostPurchases,
  PostReactions,
  Posts,
  PostViews,
  Profiles,
  ProvisionedUsers,
  RedeemCodeRedemptions,
  Revenues,
  RevenueWithdrawals,
  SpaceFollows,
  SpaceMembers,
  Spaces,
  TagFollows,
  UserArbitraryKeyValues,
  UserContentFilterPreferences,
  UserEmailVerifications,
  UserEventEnrollments,
  UserMarketingConsents,
  UserNotificationPreferences,
  UserNotifications,
  UserPersonalIdentities,
  UserPushNotificationTokens,
  Users,
  UserSessions,
  UserSettlementIdentities,
  UserSingleSignOns,
  UserSpaceMutes,
  UserTagMutes,
} from '$lib/server/database';
import { sendEmail } from '$lib/server/email';
import { LoginUser, UpdateUserEmail } from '$lib/server/email/templates';
import { apple, coocon, google, naver, portone, twitter } from '$lib/server/external-api';
import {
  createAccessToken,
  decryptAES,
  encryptAES,
  getAllowedAgeRating,
  getUserPoint,
  getUserRevenue,
  useFirstRow,
} from '$lib/server/utils';
import {
  CreateUserSchema,
  DeleteUserSchema,
  IssueUserEmailAuthorizationTokenSchema,
  LoginUserSchema,
  UpdateUserEmailSchema,
  UpdateUserProfileSchema,
  VerifyPassportIdentitySchema,
  VerifySettlementIdentitySchema,
} from '$lib/validations';
import { builder } from '../builder';
import { createObjectRef } from '../utils';
import { BookmarkGroup } from './bookmark';
import { PostComment } from './comment';
import { Image } from './image';
import { IUserNotification } from './notification';
import { IPointTransaction } from './point';
import { Post, PostPurchase } from './post';
import { RedeemCodeRedemption } from './redeem';
import { Revenue, RevenueWithdrawal } from './revenue';
import { Space } from './space';
import { Tag } from './tag';

/**
 * * Types
 */

export const Profile = createObjectRef('Profile', Profiles);
Profile.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),

    avatar: t.field({ type: Image, resolve: (parent) => parent.avatarId }),
  }),
});

export const ProvisionedUser = createObjectRef('ProvisionedUser', ProvisionedUsers);
ProvisionedUser.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    email: t.exposeString('email'),
    name: t.exposeString('name', { nullable: true }),
    avatarUrl: t.exposeString('avatarUrl', { nullable: true }),
  }),
});

export const User = createObjectRef('User', Users);
User.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    email: t.exposeString('email'),
    state: t.expose('state', { type: UserState }),

    profile: t.field({
      type: Profile,
      resolve: (user) => user.profileId,
    }),

    contentFilterPreferences: t.field({
      type: [UserContentFilterPreference],
      resolve: async (user) => {
        const preferences = await database
          .select({ id: UserContentFilterPreferences.id })
          .from(UserContentFilterPreferences)
          .where(eq(UserContentFilterPreferences.userId, user.id));

        return preferences.map((preference) => preference.id);
      },
    }),

    notificationPreferences: t.field({
      type: [UserNotificationPreference],
      resolve: async (user) => {
        const preferences = await database
          .select({ id: UserNotificationPreferences.id })
          .from(UserNotificationPreferences)
          .where(eq(UserNotificationPreferences.userId, user.id));

        return preferences.map((preference) => preference.id);
      },
    }),

    marketingConsent: t.field({
      type: UserMarketingConsent,
      nullable: true,
      resolve: async (user) => {
        const consents = await database
          .select({ id: UserMarketingConsents.id })
          .from(UserMarketingConsents)
          .where(eq(UserMarketingConsents.userId, user.id));

        if (consents.length === 0) {
          return null;
        }

        return consents[0].id;
      },
    }),

    personalIdentity: t.field({
      type: UserPersonalIdentity,
      nullable: true,
      resolve: async (user) => {
        const identities = await database
          .select({ id: UserPersonalIdentities.id })
          .from(UserPersonalIdentities)
          .where(eq(UserPersonalIdentities.userId, user.id));

        if (identities.length === 0) {
          return null;
        }

        return identities[0].id;
      },
    }),

    singleSignOns: t.field({
      type: [UserSingleSignOn],
      resolve: async (user) => {
        const ssos = await database
          .select({ id: UserSingleSignOns.id })
          .from(UserSingleSignOns)
          .where(eq(UserSingleSignOns.userId, user.id));

        return ssos.map((sso) => sso.id);
      },
    }),

    bookmarkGroups: t.field({
      type: [BookmarkGroup],
      resolve: async (user) => {
        const groups = await database
          .select({ id: BookmarkGroups.id })
          .from(BookmarkGroups)
          .where(eq(BookmarkGroups.userId, user.id));

        return groups.map((group) => group.id);
      },
    }),

    isAdulthood: t.boolean({
      resolve: async (user, _, context) => {
        const allowedAgeRating = await getAllowedAgeRating(user.id, context);
        return allowedAgeRating.includes('R19');
      },
      deprecationReason: 'Use allowedAgeRating instead',
    }),

    allowedAgeRating: t.field({
      type: [PostAgeRating],
      resolve: async (user, _, context) => await getAllowedAgeRating(user.id, context),
    }),

    point: t.int({
      args: { kind: t.arg({ type: PointKind, required: false }) },
      resolve: async (user, args) => {
        return await getUserPoint({ userId: user.id, kind: args.kind ?? undefined });
      },
    }),

    points: t.field({
      type: [IPointTransaction],
      args: { amountFilter: t.arg.int({ defaultValue: 0 }) },
      resolve: async (user, args) => {
        const transactions = await database
          .select({ id: PointTransactions.id })
          .from(PointTransactions)
          .where(
            and(
              eq(PointTransactions.userId, user.id),
              args.amountFilter > 0 ? gt(PointTransactions.amount, 0) : undefined,
              args.amountFilter < 0 ? lt(PointTransactions.amount, 0) : undefined,
            ),
          )
          .orderBy(desc(PointTransactions.createdAt));

        return transactions.map((transaction) => transaction.id);
      },
    }),

    spaces: t.field({
      type: [Space],
      resolve: async (user) => {
        const spaces = await database
          .select({ id: Spaces.id })
          .from(Spaces)
          .innerJoin(SpaceMembers, eq(Spaces.id, SpaceMembers.spaceId))
          .where(and(eq(SpaceMembers.userId, user.id), eq(Spaces.state, 'ACTIVE'), eq(SpaceMembers.state, 'ACTIVE')));

        return spaces.map((space) => space.id);
      },
    }),

    followedSpaces: t.field({
      type: [Space],
      resolve: async (user) => {
        const spaces = await database
          .select({ id: Spaces.id })
          .from(Spaces)
          .innerJoin(SpaceFollows, eq(Spaces.id, SpaceFollows.spaceId))
          .where(and(eq(SpaceFollows.userId, user.id), eq(Spaces.state, 'ACTIVE')));

        return spaces.map((space) => space.id);
      },
    }),

    mutedSpaces: t.field({
      type: [Space],
      resolve: async (user) => {
        const spaces = await database
          .select({ id: Spaces.id })
          .from(Spaces)
          .innerJoin(UserSpaceMutes, eq(Spaces.id, UserSpaceMutes.spaceId))
          .where(and(eq(UserSpaceMutes.userId, user.id), eq(Spaces.state, 'ACTIVE')));

        return spaces.map((space) => space.id);
      },
    }),

    followedTags: t.field({
      type: [Tag],
      resolve: async (user) => {
        return await database
          .select({ tagId: TagFollows.tagId })
          .from(TagFollows)
          .where(and(eq(TagFollows.userId, user.id)))
          .then((rows) => rows.map((row) => row.tagId));
      },
    }),

    mutedTags: t.field({
      type: [Tag],
      resolve: async (user) => {
        const mutes = await database
          .select({ tagId: UserTagMutes.tagId })
          .from(UserTagMutes)
          .where(and(eq(UserTagMutes.userId, user.id)));

        return mutes.map((mute) => mute.tagId);
      },
    }),

    posts: t.field({
      type: [Post],
      args: { state: t.arg({ type: PostState, defaultValue: 'PUBLISHED' }) },
      resolve: async (user, args) => {
        const posts = await database
          .select({ id: Posts.id })
          .from(Posts)
          .where(and(eq(Posts.userId, user.id), eq(Posts.state, args.state)))
          .orderBy(desc(Posts.createdAt));

        return posts.map((post) => post.id);
      },
    }),

    recentlyViewedPosts: t.field({
      type: [Post],
      resolve: async (user) => {
        const sq = database
          .selectDistinctOn([Posts.id], { id: Posts.id, viewedAt: PostViews.viewedAt })
          .from(Posts)
          .innerJoin(PostViews, eq(PostViews.postId, Posts.id))
          .innerJoin(Spaces, eq(Spaces.id, Posts.spaceId))
          .innerJoin(SpaceMembers, eq(SpaceMembers.spaceId, Spaces.id))
          .where(
            and(
              eq(PostViews.userId, user.id),
              eq(Posts.state, 'PUBLISHED'),
              eq(Spaces.state, 'ACTIVE'),
              or(
                eq(Posts.visibility, 'PUBLIC'),
                eq(Posts.visibility, 'UNLISTED'),
                and(eq(Posts.visibility, 'SPACE'), eq(SpaceMembers.userId, user.id)),
              ),
              or(
                eq(Spaces.visibility, 'PUBLIC'),
                and(eq(Spaces.visibility, 'PRIVATE'), eq(SpaceMembers.userId, user.id)),
              ),
            ),
          )
          .orderBy(asc(Posts.id), desc(PostViews.viewedAt))
          .as('sq');

        const posts = await database.select({ id: sq.id }).from(sq).orderBy(desc(sq.viewedAt)).limit(20);

        return posts.map((post) => post.id);
      },
    }),

    emojiReactedPosts: t.field({
      type: [Post],
      resolve: async (user) => {
        const sq = database
          .selectDistinctOn([Posts.id], { id: Posts.id, createdAt: PostReactions.createdAt })
          .from(Posts)
          .innerJoin(PostReactions, eq(PostReactions.postId, Posts.id))
          .innerJoin(Spaces, eq(Spaces.id, Posts.spaceId))
          .innerJoin(SpaceMembers, eq(SpaceMembers.spaceId, Spaces.id))
          .where(
            and(
              eq(PostReactions.userId, user.id),
              eq(Posts.state, 'PUBLISHED'),
              eq(Spaces.state, 'ACTIVE'),
              or(
                eq(Posts.visibility, 'PUBLIC'),
                eq(Posts.visibility, 'UNLISTED'),
                and(eq(Posts.visibility, 'SPACE'), eq(SpaceMembers.userId, user.id)),
              ),
              or(
                eq(Spaces.visibility, 'PUBLIC'),
                and(eq(Spaces.visibility, 'PRIVATE'), eq(SpaceMembers.userId, user.id)),
              ),
            ),
          )
          .orderBy(asc(Posts.id), desc(PostReactions.createdAt))
          .as('sq');

        const posts = await database.select({ id: sq.id }).from(sq).orderBy(desc(sq.createdAt)).limit(100);

        return posts.map((post) => post.id);
      },
    }),

    purchasedPosts: t.field({
      type: [Post],
      resolve: async (user) => {
        const purchases = await database
          .select({ postId: PostPurchases.postId })
          .from(PostPurchases)
          .where(eq(PostPurchases.userId, user.id))
          .orderBy(desc(PostPurchases.createdAt));

        return purchases.map((purchase) => purchase.postId);
      },

      deprecationReason: 'Use postPurchases instead',
    }),

    postPurchases: t.field({
      type: [PostPurchase],
      resolve: async (user) => {
        return await database
          .select()
          .from(PostPurchases)
          .where(eq(PostPurchases.userId, user.id))
          .orderBy(desc(PostPurchases.createdAt));
      },
    }),

    redeemCodeRedemptions: t.field({
      type: [RedeemCodeRedemption],
      resolve: async (user) => {
        return await database
          .select({ RedeemCodeRedemptions })
          .from(RedeemCodeRedemptions)
          .innerJoin(PostPurchases, eq(PostPurchases.id, RedeemCodeRedemptions.purchaseId))
          .where(eq(PostPurchases.userId, user.id))
          .orderBy(desc(RedeemCodeRedemptions.createdAt))
          .then((rows) => rows.map((row) => row.RedeemCodeRedemptions));
      },
    }),

    revenue: t.field({
      type: 'Int',
      args: { withdrawable: t.arg.boolean({ required: false }) },
      resolve: async (user, args) => {
        return await getUserRevenue({ userId: user.id, withdrawable: args.withdrawable ?? undefined });
      },
    }),

    revenues: t.field({
      type: [Revenue],
      args: {
        page: t.arg.int({ defaultValue: 1 }),
        take: t.arg.int({ defaultValue: 10 }),
      },
      resolve: async (user, args) => {
        const revenues = await database
          .select({ id: Revenues.id })
          .from(Revenues)
          .where(eq(Revenues.userId, user.id))
          .orderBy(desc(Revenues.createdAt))
          .limit(args.take)
          .offset((args.page - 1) * args.take);

        return revenues.map((revenue) => revenue.id);
      },
    }),

    revenuesCount: t.int({
      resolve: async (user) => {
        return await database
          .select({ count: count() })
          .from(Revenues)
          .where(eq(Revenues.userId, user.id))
          .then((rows) => rows[0]?.count ?? 0);
      },
    }),

    revenueWithdrawals: t.field({
      type: [RevenueWithdrawal],
      resolve: async (user) => {
        const withdrawals = await database
          .select({ id: RevenueWithdrawals.id })
          .from(RevenueWithdrawals)
          .where(eq(RevenueWithdrawals.userId, user.id))
          .orderBy(desc(RevenueWithdrawals.createdAt));

        return withdrawals.map((withdrawal) => withdrawal.id);
      },
    }),

    settlementIdentity: t.field({
      type: UserSettlementIdentity,
      nullable: true,
      resolve: async (user) => {
        const identities = await database
          .select({ id: UserSettlementIdentities.id })
          .from(UserSettlementIdentities)
          .where(eq(UserSettlementIdentities.userId, user.id));

        if (identities.length === 0) {
          return null;
        }

        return identities[0].id;
      },
    }),

    notifications: t.field({
      type: [IUserNotification],
      args: {
        unreadOnly: t.arg.boolean({ defaultValue: false }),
        category: t.arg({ type: UserNotificationCategory, required: false }),
      },
      resolve: async (user, args) => {
        const notifications = await database
          .select({ id: UserNotifications.id })
          .from(UserNotifications)
          .where(
            and(
              eq(UserNotifications.userId, user.id),
              args.unreadOnly ? eq(UserNotifications.state, 'UNREAD') : undefined,
              args.category ? eq(UserNotifications.category, args.category) : undefined,
            ),
          )
          .orderBy(desc(UserNotifications.createdAt));

        return notifications.map((notification) => notification.id);
      },
    }),

    notificationCount: t.int({
      args: {
        unreadOnly: t.arg.boolean({ defaultValue: false }),
      },
      resolve: async (user, args) => {
        return await database
          .select({ count: count() })
          .from(UserNotifications)
          .where(
            and(
              eq(UserNotifications.userId, user.id),
              args.unreadOnly ? eq(UserNotifications.state, 'UNREAD') : undefined,
            ),
          )
          .then((rows) => rows[0]?.count ?? 0);
      },
    }),

    eventEnrollment: t.field({
      type: UserEventEnrollment,
      nullable: true,
      args: { eventCode: t.arg.string() },
      resolve: async (user, { eventCode }) => {
        const enrollments = await database
          .select({ id: UserEventEnrollments.id })
          .from(UserEventEnrollments)
          .where(and(eq(UserEventEnrollments.userId, user.id), eq(UserEventEnrollments.eventCode, eventCode)));

        if (enrollments.length === 0) {
          return null;
        }

        return enrollments[0].id;
      },
    }),

    onboardingCompleted: t.boolean({
      resolve: async (user) => {
        const kvs = await database
          .select({ id: UserArbitraryKeyValues.id })
          .from(UserArbitraryKeyValues)
          .where(and(eq(UserArbitraryKeyValues.userId, user.id), eq(UserArbitraryKeyValues.key, 'onboarding')));

        return kvs.length > 0;
      },
    }),

    comments: t.field({
      type: [PostComment],
      args: { page: t.arg.int({ defaultValue: 1 }), take: t.arg.int({ defaultValue: 10 }) },
      resolve: async (user, args) => {
        return await database
          .select({ id: PostComments.id })
          .from(PostComments)
          .where(and(eq(PostComments.userId, user.id), eq(PostComments.state, 'ACTIVE')))
          .orderBy(desc(PostComments.createdAt))
          .limit(args.take)
          .offset((args.page - 1) * args.take)
          .then((rows) => rows.map((row) => row.id));
      },
    }),

    commentCount: t.int({
      resolve: async (user) => {
        return await database
          .select({ count: count() })
          .from(PostComments)
          .where(and(eq(PostComments.userId, user.id), eq(PostComments.state, 'ACTIVE')))
          .then((rows) => rows[0].count);
      },
    }),
  }),
});

export const UserContentFilterPreference = createObjectRef('UserContentFilterPreference', UserContentFilterPreferences);
UserContentFilterPreference.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    category: t.expose('category', { type: ContentFilterCategory }),
    action: t.expose('action', { type: ContentFilterAction }),
  }),
});

export const UserEmailVerification = createObjectRef('UserEmailVerification', UserEmailVerifications);
UserEmailVerification.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    kind: t.expose('kind', { type: UserEmailVerificationKind }),
    email: t.exposeString('email'),
    expiresAt: t.expose('expiresAt', { type: 'DateTime' }),
  }),
});

export const UserMarketingConsent = createObjectRef('UserMarketingConsent', UserMarketingConsents);
UserMarketingConsent.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

export const UserNotificationPreference = createObjectRef('UserNotificationPreference', UserNotificationPreferences);
UserNotificationPreference.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    category: t.expose('category', { type: UserNotificationCategory }),
    method: t.expose('method', { type: UserNotificationMethod }),
    opted: t.exposeBoolean('opted'),
  }),
});

export const UserPersonalIdentity = createObjectRef('UserPersonalIdentity', UserPersonalIdentities);
UserPersonalIdentity.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    birthday: t.expose('birthday', { type: 'DateTime' }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    expiresAt: t.expose('expiresAt', { type: 'DateTime', nullable: true }),
  }),
});

export const UserSingleSignOn = createObjectRef('UserSingleSignOn', UserSingleSignOns);
UserSingleSignOn.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    provider: t.expose('provider', { type: UserSingleSignOnProvider }),
    email: t.exposeString('email'),
  }),
});

export const UserSettlementIdentity = createObjectRef('UserSettlementIdentity', UserSettlementIdentities);
UserSettlementIdentity.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    bankCode: t.exposeString('bankCode'),
    bankAccountNumber: t.exposeString('bankAccountNumber'),
    bankAccountHolderName: t.string({
      resolve: async ({ bankAccountHolderName }) => {
        if (bankAccountHolderName.length <= 1) {
          return '*';
        } else if (bankAccountHolderName.length === 2) {
          return bankAccountHolderName.at(0) + '*';
        } else {
          return (
            bankAccountHolderName.at(0) + '*'.repeat(bankAccountHolderName.length - 2) + bankAccountHolderName.at(-1)
          );
        }
      },
    }),
  }),
});

export const UserEventEnrollment = createObjectRef('UserEventEnrollment', UserEventEnrollments);
UserEventEnrollment.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    eventCode: t.exposeString('eventCode'),
    eligible: t.exposeBoolean('eligible'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    rewardedAt: t.expose('rewardedAt', { type: 'DateTime', nullable: true }),
  }),
});

const IssueUserSingleSignOnAuthorizationUrlResult = builder.simpleObject(
  'IssueUserSingleSignOnAuthorizationUrlResult',
  {
    fields: (t) => ({
      url: t.string(),
    }),
  },
);

const IssueUserEmailAuthorizationTokenResult = builder.simpleObject('IssueUserEmailAuthorizationTokenResult', {
  fields: (t) => ({
    token: t.string(),
  }),
});

const AuthorizeSingleSignOnTokenResult = builder.simpleObject('AuthorizeSingleSignOnTokenResult', {
  fields: (t) => ({
    kind: t.field({ type: AuthTokenKind }),
    token: t.string(),
  }),
});

const AuthorizeUserEmailTokenResult = builder.simpleObject('AuthorizeUserEmailTokenResult', {
  fields: (t) => ({
    kind: t.field({ type: AuthTokenKind }),
    token: t.string(),
  }),
});

const CreateUserResult = builder.simpleObject('CreateUserResult', {
  fields: (t) => ({
    token: t.string(),
  }),
});

/**
 * * Inputs
 */

const IssueUserSingleSignOnAuthorizationUrlInput = builder.inputType('IssueUserSingleSignOnAuthorizationUrlInput', {
  fields: (t) => ({
    type: t.field({ type: UserSingleSignOnAuthorizationType }),
    provider: t.field({ type: UserSingleSignOnProvider }),
  }),
});

const AuthorizeSingleSignOnTokenInput = builder.inputType('AuthorizeSingleSignOnTokenInput', {
  fields: (t) => ({
    provider: t.field({ type: UserSingleSignOnProvider }),
    token: t.string(),
  }),
});

const AuthorizeUserEmailTokenInput = builder.inputType('AuthorizeUserEmailTokenInput', {
  fields: (t) => ({
    token: t.string(),
  }),
});

const LoginUserInput = builder.inputType('LoginUserInput', {
  fields: (t) => ({
    email: t.string(),
  }),
  validate: { schema: LoginUserSchema },
});

const CreateUserInput = builder.inputType('CreateUserInput', {
  fields: (t) => ({
    token: t.string(),
    name: t.string({ required: false }),
    termsConsent: t.boolean(),
    isGte14: t.boolean(),
    marketingConsent: t.boolean(),
  }),
  validate: { schema: CreateUserSchema },
});

const UpdateUserEmailInput = builder.inputType('UpdateUserEmailInput', {
  fields: (t) => ({
    email: t.string(),
  }),
  validate: { schema: UpdateUserEmailSchema },
});

const UnlinkUserSingleSignOnInput = builder.inputType('UnlinkUserSingleSignOnInput', {
  fields: (t) => ({
    provider: t.field({ type: UserSingleSignOnProvider }),
  }),
});

const UpdateUserContentFilterPreferenceInput = builder.inputType('UpdateUserContentFilterPreferenceInput', {
  fields: (t) => ({
    category: t.field({ type: ContentFilterCategory }),
    action: t.field({ type: ContentFilterAction }),
  }),
});

const UpdateUserMarketingConsentInput = builder.inputType('UpdateUserMarketingConsentInput', {
  fields: (t) => ({
    consent: t.boolean(),
  }),
});

const UpdateUserNotificationPreferenceInput = builder.inputType('UpdateUserNotificationPreferenceInput', {
  fields: (t) => ({
    category: t.field({ type: UserNotificationCategory }),
    method: t.field({ type: UserNotificationMethod }),
    opted: t.boolean(),
  }),
});

const UpdateUserProfileInput = builder.inputType('UpdateUserProfileInput', {
  fields: (t) => ({
    avatarId: t.id(),
    name: t.string(),
  }),
  validate: { schema: UpdateUserProfileSchema },
});

const IssueUserEmailAuthorizationTokenInput = builder.inputType('IssueUserEmailAuthorizationTokenInput', {
  fields: (t) => ({
    email: t.string(),
    code: t.string(),
  }),
  validate: { schema: IssueUserEmailAuthorizationTokenSchema },
});

const DeleteUserInput = builder.inputType('DeleteUserInput', {
  fields: (t) => ({
    email: t.string(),
  }),
  validate: { schema: DeleteUserSchema },
});

const VerifyPersonalIdentityInput = builder.inputType('VerifyPersonalIdentityInput', {
  fields: (t) => ({
    uid: t.string(),
  }),
});

const VerifySettlementIdentityInput = builder.inputType('VerifySettlementIdentityInput', {
  fields: (t) => ({
    residentRegistrationNumberBack: t.string(),
    idCardIssuedDate: t.string(),
    bankCode: t.string(),
    bankAccountNumber: t.string(),
  }),
  validate: { schema: VerifySettlementIdentitySchema },
});

const VerifyPassportIdentityInput = builder.inputType('VerifyPassportIdentityInput', {
  fields: (t) => ({
    name: t.string(),
    birthday: t.string(),
    passportNumber: t.string(),
    issuedDate: t.string(),
    expirationDate: t.string(),
  }),
  validate: { schema: VerifyPassportIdentitySchema },
});

const RegisterPushNotificationTokenInput = builder.inputType('RegisterPushNotificationTokenInput', {
  fields: (t) => ({
    token: t.string(),
  }),
});

const DeletePushNotificationTokenInput = builder.inputType('DeletePushNotificationTokenInput', {
  fields: (t) => ({
    token: t.string(),
  }),
});

/**
 * * Queries
 */

builder.queryFields((t) => ({
  auth: t.field({
    type: 'Void',
    nullable: true,
    authScopes: (_, args) => ({ [args.scope.toLowerCase()]: true }),
    args: { scope: t.arg({ type: AuthScope }) },
    resolve: () => null,
    unauthorizedError: (_, args) =>
      match(args.scope)
        .with('USER', () => new IntentionalError('로그인이 필요해요'))
        .otherwise(() => new PermissionDeniedError()),
  }),

  me: t.field({
    type: User,
    nullable: true,
    resolve: async (_, __, context) => {
      return context.session?.userId ?? null;
    },
  }),

  provisionedUser: t.field({
    type: ProvisionedUser,
    args: { token: t.arg.string() },
    resolve: async (_, args) => {
      const users = await database
        .select({ id: ProvisionedUsers.id })
        .from(ProvisionedUsers)
        .where(eq(ProvisionedUsers.token, args.token));

      if (users.length === 0) {
        throw new NotFoundError();
      }

      return users[0].id;
    },
  }),
}));

/**
 * * Mutations
 */

builder.mutationFields((t) => ({
  loginUser: t.field({
    type: UserEmailVerification,
    args: { input: t.arg({ type: LoginUserInput }) },
    resolve: async (_, { input }, context) => {
      const users = await database
        .select({ id: Users.id })
        .from(Users)
        .where(and(eq(Users.email, input.email.toLowerCase()), eq(Users.state, 'ACTIVE')));

      const isEmailExists = users.length > 0;

      const code =
        input.email === env.PRIVATE_APP_REVIEW_LOGIN_EMAIL
          ? env.PRIVATE_APP_REVIEW_LOGIN_CODE
          : R.random(100_000, 999_999).toString();

      const token = nanoid();

      const [verification] = await database
        .insert(UserEmailVerifications)
        .values({
          kind: 'USER_LOGIN',
          email: input.email.toLowerCase(),
          token,
          code,
          expiresAt: dayjs().add(1, 'hour'),
        })
        .returning({ id: UserEmailVerifications.id });

      await sendEmail({
        subject: `글리프 ${isEmailExists ? '로그인' : '가입'}하기`,
        recipient: input.email,
        template: LoginUser,
        props: {
          action: isEmailExists ? '로그인' : '가입',
          code,
          url: qs.stringifyUrl({
            url: `${context.event.url.origin}/api/email`,
            query: { token },
          }),
        },
      });

      return verification.id;
    },
  }),

  logoutUser: t.withAuth({ user: true }).field({
    type: 'Void',
    nullable: true,
    resolve: async (_, __, context) => {
      await database.delete(UserSessions).where(eq(UserSessions.id, context.session.id));

      context.event.cookies.delete('glyph-at', { path: '/' });
    },
  }),

  issueUserEmailAuthorizationToken: t.field({
    type: IssueUserEmailAuthorizationTokenResult,
    args: { input: t.arg({ type: IssueUserEmailAuthorizationTokenInput }) },
    resolve: async (_, { input }) => {
      const emailVerifications = await database
        .select({ token: UserEmailVerifications.token })
        .from(UserEmailVerifications)
        .where(
          and(
            eq(UserEmailVerifications.kind, 'USER_LOGIN'),
            eq(UserEmailVerifications.email, input.email),
            eq(UserEmailVerifications.code, input.code),
            gte(UserEmailVerifications.expiresAt, dayjs()),
          ),
        )
        .orderBy(desc(UserEmailVerifications.createdAt))
        .limit(1);

      if (emailVerifications.length === 0) {
        throw new IntentionalError('올바르지 않은 코드예요.');
      }

      return {
        token: emailVerifications[0].token,
      };
    },
  }),

  authorizeUserEmailToken: t.field({
    type: AuthorizeUserEmailTokenResult,
    args: { input: t.arg({ type: AuthorizeUserEmailTokenInput }) },
    resolve: async (_, { input }) => {
      return await database.transaction(async (tx) => {
        const userEmailVerifications = await tx
          .select({ id: UserEmailVerifications.id, email: UserEmailVerifications.email })
          .from(UserEmailVerifications)
          .where(
            and(
              eq(UserEmailVerifications.kind, 'USER_LOGIN'),
              eq(UserEmailVerifications.token, input.token),
              gte(UserEmailVerifications.expiresAt, dayjs()),
            ),
          );

        if (userEmailVerifications.length === 0) {
          throw new Error('invalid token');
        }

        const [userEmailVerification] = userEmailVerifications;

        await tx.delete(UserEmailVerifications).where(eq(UserEmailVerifications.id, userEmailVerification.id));

        const users = await tx
          .select({ id: Users.id })
          .from(Users)
          .where(and(eq(Users.email, userEmailVerification.email.toLowerCase()), eq(Users.state, 'ACTIVE')));

        if (users.length === 0) {
          const token = nanoid();

          await tx.insert(ProvisionedUsers).values({
            email: userEmailVerification.email.toLowerCase(),
            token,
          });

          return {
            kind: 'PROVISIONED_USER_TOKEN',
            token,
          };
        }

        const [session] = await tx
          .insert(UserSessions)
          .values({ userId: users[0].id })
          .returning({ id: UserSessions.id });

        const accessToken = await createAccessToken(session.id);

        return {
          kind: 'ACCESS_TOKEN',
          token: accessToken,
        };
      });
    },
  }),

  createUser: t.field({
    type: CreateUserResult,
    args: { input: t.arg({ type: CreateUserInput }) },
    resolve: async () => {
      throw new IntentionalError('지금은 회원가입을 할 수 없어요');

      // const provisionedUsers = await database
      //   .select({
      //     id: ProvisionedUsers.id,
      //     email: ProvisionedUsers.email,
      //     token: ProvisionedUsers.token,
      //     provider: ProvisionedUsers.provider,
      //     principal: ProvisionedUsers.principal,
      //   })
      //   .from(ProvisionedUsers)
      //   .where(eq(ProvisionedUsers.token, input.token));

      // if (provisionedUsers.length === 0) {
      //   throw new IntentionalError('올바르지 않은 토큰이에요.');
      // }

      // const [provisionedUser] = provisionedUsers;

      // const emailUsages = await database
      //   .select({ id: Users.id })
      //   .from(Users)
      //   .where(and(eq(Users.email, provisionedUser.email.toLowerCase()), eq(Users.state, 'ACTIVE')));

      // if (emailUsages.length > 0) {
      //   throw new IntentionalError('이미 가입된 이메일이에요.');
      // }

      // const avatarId = await directUploadImage({
      //   name: 'avatar',
      //   source: await createRandomAvatar(),
      // });

      // return await database.transaction(async (tx) => {
      //   const [profile] = await tx
      //     .insert(Profiles)
      //     .values({
      //       name: input.name ?? generateRandomName(provisionedUser.id + provisionedUser.email),
      //       avatarId,
      //     })
      //     .returning({ id: Profiles.id });

      //   const [user] = await tx
      //     .insert(Users)
      //     .values({
      //       email: provisionedUser.email,
      //       profileId: profile.id,
      //       role: 'USER',
      //       state: 'ACTIVE',
      //     })
      //     .returning({ id: Users.id });

      //   await tx.update(Images).set({ userId: user.id }).where(eq(Images.id, avatarId));

      //   if (input.marketingConsent) {
      //     await tx.insert(UserMarketingConsents).values({ userId: user.id });
      //   }

      //   if (provisionedUser.provider && provisionedUser.principal) {
      //     await tx.insert(UserSingleSignOns).values({
      //       userId: user.id,
      //       provider: provisionedUser.provider,
      //       principal: provisionedUser.principal,
      //       email: provisionedUser.email.toLowerCase(),
      //     });
      //   }

      //   await tx.delete(ProvisionedUsers).where(eq(ProvisionedUsers.id, provisionedUser.id));

      //   const [session] = await tx.insert(UserSessions).values({ userId: user.id }).returning({ id: UserSessions.id });

      //   const accessToken = await createAccessToken(session.id);
      //   context.event.cookies.set('glyph-at', accessToken, {
      //     path: '/',
      //     maxAge: dayjs.duration(1, 'year').asSeconds(),
      //   });

      //   return {
      //     token: accessToken,
      //   };
      // });
    },
  }),

  issueUserSingleSignOnAuthorizationUrl: t.field({
    type: IssueUserSingleSignOnAuthorizationUrlResult,
    args: { input: t.arg({ type: IssueUserSingleSignOnAuthorizationUrlInput }) },
    resolve: async (_, { input }, context) => {
      const provider = match(input.provider)
        .with('GOOGLE', () => google)
        .with('NAVER', () => naver)
        .with('TWITTER', () => twitter)
        .with('APPLE', () => apple)
        .exhaustive();

      return {
        url: await provider.generateAuthorizationUrl(context.event, input.type),
      };
    },
  }),

  authorizeSingleSignOnToken: t.field({
    type: AuthorizeSingleSignOnTokenResult,
    args: { input: t.arg({ type: AuthorizeSingleSignOnTokenInput }) },
    resolve: async (_, { input }, context) => {
      const externalUser = await match(input.provider)
        .with('GOOGLE', () => google.authorizeUser(context.event, input.token))
        .with('NAVER', () => naver.authorizeUser('token', input.token))
        .with('APPLE', () => apple.authorizeUser(context.event, input.token))
        .otherwise(() => null);

      if (!externalUser) {
        throw new Error('Provider not implemented');
      }

      const ssos = await database
        .select({ userId: UserSingleSignOns.userId })
        .from(UserSingleSignOns)
        .where(
          and(eq(UserSingleSignOns.provider, externalUser.provider), eq(UserSingleSignOns.principal, externalUser.id)),
        );

      if (ssos.length === 0) {
        const users = await database
          .select({ id: Users.id })
          .from(Users)
          .where(and(eq(Users.email, externalUser.email.toLowerCase()), eq(Users.state, 'ACTIVE')));

        if (users.length === 0) {
          const token = nanoid();

          await database.insert(ProvisionedUsers).values({
            email: externalUser.email.toLowerCase(),
            token,
            name: externalUser.name,
            avatarUrl: externalUser.avatarUrl,
            provider: externalUser.provider,
            principal: externalUser.id,
          });

          return {
            kind: 'PROVISIONED_USER_TOKEN',
            token,
          };
        } else {
          const [user] = users;

          await database.insert(UserSingleSignOns).values({
            userId: user.id,
            provider: externalUser.provider,
            principal: externalUser.id,
            email: externalUser.email,
          });

          const [session] = await database
            .insert(UserSessions)
            .values({ userId: ssos[0].userId })
            .returning({ id: UserSessions.id });

          const accessToken = await createAccessToken(session.id);

          return {
            kind: 'ACCESS_TOKEN',
            token: accessToken,
          };
        }
      } else {
        const [session] = await database
          .insert(UserSessions)
          .values({ userId: ssos[0].userId })
          .returning({ id: UserSessions.id });

        const accessToken = await createAccessToken(session.id);

        return {
          kind: 'ACCESS_TOKEN',
          token: accessToken,
        };
      }
    },
  }),

  updateUserEmail: t.withAuth({ user: true }).field({
    type: 'Void',
    nullable: true,
    args: { input: t.arg({ type: UpdateUserEmailInput }) },
    resolve: async (_, { input }, context) => {
      const emailUsages = await database
        .select({ id: Users.id })
        .from(Users)
        .where(and(eq(Users.email, input.email.toLowerCase()), eq(Users.state, 'ACTIVE')));

      if (emailUsages.length > 0) {
        return;
      }

      const users = await database
        .select({ profile: { name: Profiles.name } })
        .from(Users)
        .innerJoin(Profiles, eq(Users.profileId, Profiles.id))
        .where(eq(Users.id, context.session.userId));

      if (users.length === 0) {
        throw new IntentionalError('사용자를 찾을 수 없어요.');
      }

      const token = nanoid();

      await database.insert(UserEmailVerifications).values({
        userId: context.session.userId,
        kind: 'USER_EMAIL_UPDATE',
        email: input.email.toLowerCase(),
        token,
        expiresAt: dayjs().add(1, 'hour'),
      });

      await sendEmail({
        subject: '글리프 이메일 변경',
        recipient: input.email,
        template: UpdateUserEmail,
        props: {
          name: users[0].profile.name,
          email: input.email,
          url: qs.stringifyUrl({
            url: `${context.event.url.origin}/api/email`,
            query: { token },
          }),
        },
      });
    },
  }),

  updateUserProfile: t.withAuth({ user: true }).field({
    type: Profile,
    args: { input: t.arg({ type: UpdateUserProfileInput }) },
    resolve: async (_, { input }, context) => {
      const avatars = await database
        .select({ id: Images.id })
        .from(Images)
        .where(and(eq(Images.id, input.avatarId), eq(Images.userId, context.session.userId)));

      if (avatars.length === 0) {
        throw new IntentionalError('올바르지 않은 프로필 사진이에요.');
      }

      const [profile] = await database
        .update(Profiles)
        .set({ avatarId: input.avatarId, name: input.name })
        .where(eq(Profiles.id, context.session.profileId))
        .returning({ id: Profiles.id });

      return profile.id;
    },
  }),

  updateUserMarketingConsent: t.withAuth({ user: true }).field({
    type: User,
    args: { input: t.arg({ type: UpdateUserMarketingConsentInput }) },
    resolve: async (_, { input }, context) => {
      await (input.consent
        ? database.insert(UserMarketingConsents).values({ userId: context.session.userId }).onConflictDoNothing()
        : database.delete(UserMarketingConsents).where(eq(UserMarketingConsents.userId, context.session.userId)));

      return context.session.userId;
    },
  }),

  unlinkUserSingleSignOn: t.withAuth({ user: true }).field({
    type: User,
    args: { input: t.arg({ type: UnlinkUserSingleSignOnInput }) },
    resolve: async (_, { input }, context) => {
      await database
        .delete(UserSingleSignOns)
        .where(
          and(eq(UserSingleSignOns.userId, context.session.userId), eq(UserSingleSignOns.provider, input.provider)),
        );

      return context.session.userId;
    },
  }),

  updateUserNotificationPreference: t.withAuth({ user: true }).field({
    type: User,
    args: { input: t.arg({ type: UpdateUserNotificationPreferenceInput }) },
    resolve: async (_, { input }, context) => {
      await database.transaction(async (tx) => {
        if (input.category === 'ALL') {
          await tx
            .update(UserNotificationPreferences)
            .set({ opted: input.opted })
            .where(
              and(
                eq(UserNotificationPreferences.userId, context.session.userId),
                eq(UserNotificationPreferences.method, input.method),
              ),
            );
        }

        await tx
          .insert(UserNotificationPreferences)
          .values({
            userId: context.session.userId,
            category: input.category,
            method: input.method,
            opted: input.opted,
          })
          .onConflictDoUpdate({
            target: [
              UserNotificationPreferences.userId,
              UserNotificationPreferences.category,
              UserNotificationPreferences.method,
            ],
            set: { opted: input.opted },
          });
      });

      return context.session.userId;
    },
  }),

  updateUserContentFilterPreference: t.withAuth({ user: true }).field({
    type: User,
    args: { input: t.arg({ type: UpdateUserContentFilterPreferenceInput }) },
    resolve: async (_, { input }, context) => {
      if (input.category === 'ADULT' && input.action === 'EXPOSE') {
        const allowedAgeRating = await getAllowedAgeRating(context.session.userId, context);

        if (!allowedAgeRating.includes('R19')) {
          throw new IntentionalError('성인인증이 필요해요.');
        }
      }

      await database
        .insert(UserContentFilterPreferences)
        .values({
          userId: context.session.userId,
          category: input.category,
          action: input.action,
        })
        .onConflictDoUpdate({
          target: [UserContentFilterPreferences.userId, UserContentFilterPreferences.category],
          set: { action: input.action },
        });

      return context.session.userId;
    },
  }),

  deleteUser: t.withAuth({ user: true }).field({
    type: 'Void',
    nullable: true,
    args: { input: t.arg({ type: DeleteUserInput }) },
    resolve: async (_, { input }, context) => {
      const users = await database
        .select({ email: Users.email })
        .from(Users)
        .where(eq(Users.id, context.session.userId));

      if (users.length === 0) {
        throw new IntentionalError('사용자를 찾을 수 없어요.');
      }

      if (users[0].email !== input.email.toLowerCase()) {
        throw new IntentionalError('이메일이 일치하지 않아요.');
      }

      const spaceMembers = await database
        .select({ id: SpaceMembers.id })
        .from(SpaceMembers)
        .where(and(eq(SpaceMembers.userId, context.session.userId), eq(SpaceMembers.state, 'ACTIVE')));

      if (spaceMembers.length > 0) {
        throw new IntentionalError('아직 속해있는 스페이스가 있어요');
      }

      await database.transaction(async (tx) => {
        await tx.delete(UserSessions).where(eq(UserSessions.userId, context.session.userId));
        await tx.delete(UserSingleSignOns).where(eq(UserSingleSignOns.userId, context.session.userId));
        await tx.update(Users).set({ state: 'INACTIVE' }).where(eq(Users.id, context.session.userId));
      });

      context.event.cookies.delete('glyph-at', { path: '/' });
    },
  }),

  verifyPersonalIdentity: t.withAuth({ user: true }).field({
    type: UserPersonalIdentity,
    args: { input: t.arg({ type: VerifyPersonalIdentityInput }) },
    resolve: async (_, { input }, context) => {
      const resp = await portone.getCertification(input.uid);
      if (resp.code !== 0) {
        throw new Error(resp.message);
      }

      if (!resp.response.certified) {
        throw new IntentionalError('본인인증에 실패했어요');
      }

      const identities = await database
        .select({ id: UserPersonalIdentities.id, userId: UserPersonalIdentities.userId, ci: UserPersonalIdentities.ci })
        .from(UserPersonalIdentities)
        .innerJoin(Users, eq(Users.id, UserPersonalIdentities.userId))
        .where(and(eq(UserPersonalIdentities.ci, resp.response.unique_key), eq(Users.state, 'ACTIVE')));

      if (identities.length > 0) {
        if (identities[0].userId !== context.session.userId) {
          throw new IntentionalError('이미 인증된 다른 계정이 있어요');
        } else if (identities[0].ci !== resp.response.unique_key) {
          throw new IntentionalError('이전 인증과 정보가 달라요 (정보가 변경되었을 시에는 문의해주세요)');
        }
      }

      const [identity] = await database
        .insert(UserPersonalIdentities)
        .values({
          userId: context.session.userId,
          kind: 'PHONE',
          name: resp.response.name,
          birthday: dayjs.kst(resp.response.birthday, 'YYYY-MM-DD'),
          phoneNumber: resp.response.phone,
          ci: resp.response.unique_key,
          expiresAt: dayjs().add(1, 'year'),
        })
        .onConflictDoUpdate({
          target: [UserPersonalIdentities.userId],
          set: {
            kind: 'PHONE',
            name: resp.response.name,
            birthday: dayjs.kst(resp.response.birthday, 'YYYY-MM-DD'),
            phoneNumber: resp.response.phone,
            expiresAt: dayjs().add(1, 'year'),
          },
        })
        .returning({ id: UserPersonalIdentities.id });

      return identity.id;
    },
  }),

  verifySettlementIdentity: t.withAuth({ user: true }).field({
    type: UserSettlementIdentity,
    args: { input: t.arg({ type: VerifySettlementIdentityInput }) },
    resolve: async (_, { input }, context) => {
      const personalIdentities = await database
        .select({ name: UserPersonalIdentities.name, birthday: UserPersonalIdentities.birthday })
        .from(UserPersonalIdentities)
        .where(eq(UserPersonalIdentities.userId, context.session.userId));

      if (personalIdentities.length === 0) {
        throw new IntentionalError('먼저 본인인증을 해주세요');
      }

      const [personalIdentity] = personalIdentities;

      const residentRegistrationNumber = `${personalIdentity.birthday.kst().format('YYMMDD')}${
        input.residentRegistrationNumberBack
      }`;

      const rrnVerification = await coocon.verifyResidentRegistrationNumber({
        name: personalIdentity.name,
        residentRegistrationNumber,
        issuedDate: input.idCardIssuedDate,
      });

      if (!rrnVerification.success) {
        throw new IntentionalError('주민등록증 인증에 실패했어요');
      }

      const accountHolderName = await coocon.getAccountHolderName({
        bankCode: input.bankCode,
        accountNumber: input.bankAccountNumber,
      });

      if (
        !personalIdentity.name
          .replaceAll(' ', '')
          .toLowerCase()
          .startsWith(accountHolderName.replaceAll(' ', '').toLowerCase())
      ) {
        throw new IntentionalError('예금주가 일치하지 않아요');
      }

      const settlementIdentities = await database
        .select({
          encryptedResidentRegistrationNumber: UserSettlementIdentities.encryptedResidentRegistrationNumber,
          encryptedResidentRegistrationNumberNonce: UserSettlementIdentities.encryptedResidentRegistrationNumberNonce,
        })
        .from(UserSettlementIdentities)
        .where(eq(UserSettlementIdentities.userId, context.session.userId));

      if (settlementIdentities.length > 0) {
        const previousRRN = await decryptAES(
          settlementIdentities[0].encryptedResidentRegistrationNumber,
          settlementIdentities[0].encryptedResidentRegistrationNumberNonce,
        );

        if (previousRRN !== residentRegistrationNumber) {
          throw new IntentionalError('주민등록번호를 변경한 경우에는 문의를 남겨주세요');
        }

        const [settlementIdentity] = await database
          .update(UserSettlementIdentities)
          .set({ bankCode: input.bankCode, bankAccountNumber: input.bankAccountNumber })
          .where(eq(UserSettlementIdentities.userId, context.session.userId))
          .returning({ id: UserSettlementIdentities.id });

        return settlementIdentity.id;
      } else {
        const { encrypted, nonce } = await encryptAES(residentRegistrationNumber);
        const hash = Buffer.from(
          await webcrypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(`penxle_rrn_hash_${residentRegistrationNumber}`),
          ),
        ).toString('hex');

        const [settlementIdentity] = await database
          .insert(UserSettlementIdentities)
          .values({
            userId: context.session.userId,
            encryptedResidentRegistrationNumber: encrypted,
            encryptedResidentRegistrationNumberNonce: nonce,
            residentRegistrationNumberHash: hash,
            bankCode: input.bankCode,
            bankAccountNumber: input.bankAccountNumber,
            bankAccountHolderName: accountHolderName,
          })
          .returning({ id: UserSettlementIdentities.id });

        return settlementIdentity.id;
      }
    },
  }),

  verifyPassportIdentity: t.withAuth({ user: true }).field({
    type: User,
    args: { input: t.arg({ type: VerifyPassportIdentityInput }) },
    resolve: async (_, { input }, context) => {
      const passportVerification = await coocon.verifyPassportNumber({
        name: input.name,
        birthday: input.birthday,
        passportNumber: input.passportNumber,
        issuedDate: input.issuedDate,
        expirationDate: input.expirationDate,
      });

      if (!passportVerification.success) {
        throw new IntentionalError('여권 인증에 실패했어요');
      }

      const identity = await database
        .select({
          id: UserPersonalIdentities.id,
          name: UserPersonalIdentities.name,
          birthday: UserPersonalIdentities.birthday,
        })
        .from(UserPersonalIdentities)
        .where(eq(UserPersonalIdentities.userId, context.session.userId))
        .then(useFirstRow);

      if (identity && (identity.name !== input.name || !identity.birthday.isSame(dayjs.kst(input.birthday), 'day'))) {
        throw new IntentionalError('이전 인증과 정보가 달라요 (정보가 변경되었을 시에는 문의해주세요)');
      }

      await database
        .insert(UserPersonalIdentities)
        .values({
          userId: context.session.userId,
          kind: 'PASSPORT',
          name: input.name,
          birthday: dayjs.kst(input.birthday, 'YYYYMMDD'),
          ci: input.passportNumber,
          expiresAt: dayjs().add(1, 'year'),
        })
        .onConflictDoUpdate({
          target: [UserPersonalIdentities.userId],
          set: {
            kind: 'PASSPORT',
            name: input.name,
            birthday: dayjs.kst(input.birthday, 'YYYYMMDD'),
            ci: input.passportNumber,
            expiresAt: dayjs().add(1, 'year'),
          },
        });

      return context.session.userId;
    },
  }),

  registerPushNotificationToken: t.withAuth({ user: true }).field({
    type: 'Void',
    nullable: true,
    args: { input: t.arg({ type: RegisterPushNotificationTokenInput }) },
    resolve: async (_, { input }, context) => {
      await database
        .insert(UserPushNotificationTokens)
        .values({
          userId: context.session.userId,
          token: input.token,
        })
        .onConflictDoNothing();
    },
  }),

  deletePushNotificationToken: t.withAuth({ user: true }).field({
    type: 'Void',
    nullable: true,
    args: { input: t.arg({ type: DeletePushNotificationTokenInput }) },
    resolve: async (_, { input }, context) => {
      await database
        .delete(UserPushNotificationTokens)
        .where(
          and(
            eq(UserPushNotificationTokens.userId, context.session.userId),
            eq(UserPushNotificationTokens.token, input.token),
          ),
        );
    },
  }),

  completeOnboarding: t.withAuth({ user: true }).field({
    type: User,
    resolve: async (_, __, context) => {
      await database
        .insert(UserArbitraryKeyValues)
        .values({
          userId: context.session.userId,
          key: 'onboarding',
          value: {},
        })
        .onConflictDoNothing();

      return context.session.userId;
    },
  }),
}));
