export const AuthScope = {
  USER: 'USER',
  STAFF: 'STAFF',
} as const;

export const AuthTokenKind = {
  ACCESS_TOKEN: 'ACCESS_TOKEN',
  PROVISIONED_USER_TOKEN: 'PROVISIONED_USER_TOKEN',
};

export const ContentFilterAction = {
  EXPOSE: 'EXPOSE',
  WARN: 'WARN',
} as const;

export const ContentFilterCategory = {
  ADULT: 'ADULT',
  CRIME: 'CRIME',
  CRUELTY: 'CRUELTY',
  GAMBLING: 'GAMBLING',
  GROSSNESS: 'GROSSNESS',
  HORROR: 'HORROR',
  INSULT: 'INSULT',
  OTHER: 'OTHER',
  PHOBIA: 'PHOBIA',
  TRAUMA: 'TRAUMA',
  VIOLENCE: 'VIOLENCE',
} as const;

export const FeatureFlag = {
  SHOW_AD: 'SHOW_AD',
} as const;

export const PaymentMethod = {
  BANK_ACCOUNT: 'BANK_ACCOUNT',
  CREDIT_CARD: 'CREDIT_CARD',
  GIFTCARD_BOOKNLIFE: 'GIFTCARD_BOOKNLIFE',
  GIFTCARD_CULTURELAND: 'GIFTCARD_CULTURELAND',
  GIFTCARD_SMARTCULTURE: 'GIFTCARD_SMARTCULTURE',
  PAYPAL: 'PAYPAL',
  PHONE_BILL: 'PHONE_BILL',
  VIRTUAL_BANK_ACCOUNT: 'VIRTUAL_BANK_ACCOUNT',
  IN_APP_PURCHASE: 'IN_APP_PURCHASE',
  DUMMY: 'DUMMY',
} as const;

export const StoreKind = {
  APP_STORE: 'APP_STORE',
  PLAY_STORE: 'PLAY_STORE',
} as const;

export const PointKind = {
  FREE: 'FREE',
  PAID: 'PAID',
} as const;

export const PointPurchaseState = {
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  PENDING: 'PENDING',
  UNDONE: 'UNDONE',
} as const;

export const PointTransactionCause = {
  EVENT_REWARD: 'EVENT_REWARD',
  EXPIRE: 'EXPIRE',
  INTERNAL: 'INTERNAL',
  PATRONIZE: 'PATRONIZE',
  PURCHASE: 'PURCHASE',
  REFUND: 'REFUND',
  UNDO_PURCHASE: 'UNDO_PURCHASE',
  UNLOCK_CONTENT: 'UNLOCK_CONTENT',
} as const;

export const PostAgeRating = {
  ALL: 'ALL',
  R15: 'R15',
  R19: 'R19',
} as const;

export const PostCategory = {
  FANFICTION: 'FANFICTION',
  NONFICTION: 'NONFICTION',
  ORIGINAL: 'ORIGINAL',
  OTHER: 'OTHER',
} as const;

export const PostCommentQualification = {
  ANY: 'ANY',
  IDENTIFIED: 'IDENTIFIED',
  NONE: 'NONE',
} as const;

export const PostCommentState = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export const PostCommentVisibility = {
  PRIVATE: 'PRIVATE',
  PUBLIC: 'PUBLIC',
} as const;

export const PostPair = {
  BL: 'BL',
  GL: 'GL',
  HL: 'HL',
  MULTIPLE: 'MULTIPLE',
  NONCP: 'NONCP',
  OTHER: 'OTHER',
} as const;

export const PostPriceCategory = {
  FREE: 'FREE',
  PAID: 'PAID',
} as const;

export const PostRevisionContentKind = {
  ARTICLE: 'ARTICLE',
  GALLERY: 'GALLERY',
} as const;

export const PostRevisionKind = {
  ARCHIVED: 'ARCHIVED',
  AUTO_SAVE: 'AUTO_SAVE',
  MANUAL_SAVE: 'MANUAL_SAVE',
  PUBLISHED: 'PUBLISHED',
} as const;

export const PostState = {
  DELETED: 'DELETED',
  DRAFT: 'DRAFT',
  EPHEMERAL: 'EPHEMERAL',
  PUBLISHED: 'PUBLISHED',
} as const;

export const PostSynchronizationKind = {
  PING: 'PING',
  UPDATE: 'UPDATE',
  SYNCHRONIZE_1: 'SYNCHRONIZE_1',
  SYNCHRONIZE_2: 'SYNCHRONIZE_2',
  SYNCHRONIZE_3: 'SYNCHRONIZE_3',
  AWARENESS: 'AWARENESS',
} as const;

export const PostTagKind = {
  CHARACTER: 'CHARACTER',
  COUPLING: 'COUPLING',
  EXTRA: 'EXTRA',
  TITLE: 'TITLE',
  TRIGGER: 'TRIGGER',
  CHALLENGE: 'CHALLENGE',
} as const;

export const PostVisibility = {
  PUBLIC: 'PUBLIC',
  SPACE: 'SPACE',
  UNLISTED: 'UNLISTED',
} as const;

export const PreferenceType = {
  FAVORITE: 'FAVORITE',
  MUTE: 'MUTE',
} as const;

export const RedeemCodeGroupState = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export const RedeemCodeState = {
  AVAILABLE: 'AVAILABLE',
  USED: 'USED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
} as const;

export const RevenueKind = {
  POST_PATRONAGE: 'POST_PATRONAGE',
  POST_PURCHASE: 'POST_PURCHASE',
} as const;

export const RevenueState = {
  INVOICED: 'INVOICED',
  PAID: 'PAID',
  PENDING: 'PENDING',
} as const;

export const RevenueWithdrawalKind = {
  INSTANT: 'INSTANT',
  MONTHLY: 'MONTHLY',
} as const;

export const RevenueWithdrawalState = {
  FAILED: 'FAILED',
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
} as const;

export const SpaceCollectionState = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export const SpaceMemberInvitationState = {
  ACCEPTED: 'ACCEPTED',
  IGNORED: 'IGNORED',
  PENDING: 'PENDING',
} as const;

export const SpaceMemberRole = {
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
} as const;

export const SpaceMemberState = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export const SpaceState = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export const SpaceVisibility = {
  PRIVATE: 'PRIVATE',
  PUBLIC: 'PUBLIC',
} as const;

export const UserEmailVerificationKind = {
  USER_EMAIL_UPDATE: 'USER_EMAIL_UPDATE',
  USER_LOGIN: 'USER_LOGIN',
} as const;

export const UserNotificationCategory = {
  ALL: 'ALL',
  COMMENT: 'COMMENT',
  DONATE: 'DONATE',
  EMOJI_REACTION: 'EMOJI_REACTION',
  NEW_POST: 'NEW_POST',
  PURCHASE: 'PURCHASE',
  REPLY: 'REPLY',
  SUBSCRIBE: 'SUBSCRIBE',
  TAG_EDIT: 'TAG_EDIT',
  TAG_WIKI_EDIT: 'TAG_WIKI_EDIT',
  TREND: 'TREND',
} as const;

export const UserNotificationMethod = {
  EMAIL: 'EMAIL',
  WEBSITE: 'WEBSITE',
} as const;

export const UserNotificationState = {
  READ: 'READ',
  UNREAD: 'UNREAD',
} as const;

export const UserPersonalIdentityKind = {
  PASSPORT: 'PASSPORT',
  PHONE: 'PHONE',
  FOREIGN_PASSPORT: 'FOREIGN_PASSPORT',
} as const;

export const UserSingleSignOnAuthorizationType = {
  LINK: 'LINK',
  LOGIN: 'LOGIN',
} as const;

export const UserSingleSignOnProvider = {
  GOOGLE: 'GOOGLE',
  NAVER: 'NAVER',
  APPLE: 'APPLE',
  TWITTER: 'TWITTER',
} as const;

export const UserState = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export const UserRole = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;
