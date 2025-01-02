type PurchaseNotification = {
  category: 'PURCHASE';
  actorId: string;
  data: {
    postId: string;
  };
};

type SubscribeNotification = {
  category: 'SUBSCRIBE';
  actorId: string;
  data: {
    spaceId: string;
  };
};

type CommentNotification = {
  category: 'COMMENT';
  actorId: string;
  data: {
    commentId: string;
  };
};

type EmojiReactionNotification = {
  category: 'EMOJI_REACTION';
  actorId: string;
  data: {
    postId: string;
    emoji: string;
  };
};

type NewPostNotification = {
  category: 'NEW_POST';
  actorId: string;
  data: {
    postId: string;
  };
};

export type Notification = (
  | PurchaseNotification
  | SubscribeNotification
  | CommentNotification
  | EmojiReactionNotification
  | NewPostNotification
) & {
  userId: string;
};
