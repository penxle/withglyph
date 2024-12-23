<script lang="ts">
  import IconBell from '~icons/tabler/bell';
  import IconX from '~icons/tabler/x';
  import { beforeNavigate } from '$app/navigation';
  import { fragment, graphql } from '$glitch';
  import { analytics } from '$lib/analytics';
  import { Button, Icon } from '$lib/components';
  import { createFloatingActions, portal, scrollLock } from '$lib/svelte/actions';
  import { css } from '$styled-system/css';
  import { center, circle, flex } from '$styled-system/patterns';
  import CommentNotification from './CommentNotification.svelte';
  import EmojiReactionNotification from './EmojiReactionNotification.svelte';
  import NewPostNotification from './NewPostNotification.svelte';
  import PurchaseNotification from './PurchaseNotification.svelte';
  import SubscribeNotification from './SubscribeNotification.svelte';
  import type { DefaultLayout_NotificationMenu_user } from '$glitch';

  let _user: DefaultLayout_NotificationMenu_user;
  export { _user as $user };

  let open = false;

  $: user = fragment(
    _user,
    graphql(`
      fragment DefaultLayout_NotificationMenu_user on User {
        id

        profile {
          id
          name

          avatar {
            id
            ...Image_image
          }
        }

        notifications {
          __typename
          id
          state

          ...CommentNotification_commentNotification
          ...SubscribeNotification_subscribeNotification
          ...PurchaseNotification_purchaseNotification
          ...EmojiReactionNotification_emojiReactionNotification
          ...NewPostNotification_newPostNotification
        }
      }
    `),
  );

  const { anchor, floating } = createFloatingActions({
    placement: 'bottom-end',
    offset: 12,
  });

  const markAllNotificationsAsRead = graphql(`
    mutation DefaultLayout_Notification_MarkAllNotificationsAsRead_Mutation {
      markAllNotificationsAsRead {
        id
        state
      }
    }
  `);

  $: checkUnreadNotification = $user.notifications.find(
    (notification: (typeof $user.notifications)[number]) => notification.state === 'UNREAD',
  );
  $: unreadNotifications = $user.notifications.filter(
    (notification: (typeof $user.notifications)[number]) => notification.state === 'UNREAD',
  );

  const readAllNotifications = () => {
    analytics.track('user:notification-state:read', { via: 'notification-popup' });
    return markAllNotificationsAsRead();
  };

  beforeNavigate(() => {
    open = false;
  });

  const backgroundStyle = {
    backgroundColor: 'gray.100',
  } as const;

  const solidStyle = {
    '& path': {
      fill: '[currentColor]',
    },
  } as const;
</script>

<div class={center({ position: 'relative' })}>
  <a
    class={circle({
      size: '28px',
      hideFrom: 'sm',
      _hover: backgroundStyle,
      _focusVisible: backgroundStyle,
    })}
    href="/me/notifications"
  >
    <Icon icon={IconBell} size={24} />
  </a>

  <button
    class={circle({
      size: '28px',
      transition: 'common',
      hideBelow: 'sm',
      _hover: solidStyle,
      _focusVisible: backgroundStyle,
      _pressed: solidStyle,
    })}
    aria-pressed={open}
    type="button"
    on:click={() => (open = true)}
    use:anchor
  >
    <Icon icon={IconBell} size={24} />
  </button>

  {#if checkUnreadNotification}
    <span
      class={circle({
        position: 'absolute',
        borderWidth: '1px',
        borderColor: 'gray.0',
        size: '8px',
        top: '4px',
        right: '4px',
        backgroundColor: 'brand.400',
      })}
    />
  {/if}
</div>

{#if open}
  <div
    class={css({ position: 'fixed', inset: '0', zIndex: '40' })}
    role="button"
    tabindex="-1"
    on:click={() => (open = false)}
    on:keypress={null}
    use:portal
  />

  <div
    class={flex({
      direction: 'column',
      position: 'absolute',
      borderWidth: '1px',
      borderColor: 'gray.600',
      width: 'full',
      maxWidth: '375px',
      backgroundColor: 'gray.0',
      zIndex: '50',
    })}
    use:floating
    use:scrollLock
  >
    <div
      class={flex({
        justify: 'space-between',
        align: 'center',
        borderBottomWidth: '1px',
        borderBottomColor: 'gray.100',
        paddingX: '16px',
        paddingY: '12px',
        height: '55px',
      })}
    >
      <p
        class={css({
          paddingLeft: '20px',
          fontSize: '16px',
          fontWeight: 'semibold',
          textAlign: 'center',
          width: 'full',
        })}
      >
        알림
      </p>

      <button type="button" on:click={() => (open = false)}>
        <Icon icon={IconX} size={20} />
      </button>
    </div>

    <div
      class={flex({
        justify: 'space-between',
        align: 'center',
        borderBottomWidth: '1px',
        borderBottomColor: 'gray.100',
        paddingX: '16px',
        paddingY: '12px',
        height: '55px',
      })}
    >
      <p>
        <span class={css({ fontWeight: 'medium' })}>새소식</span>
        {unreadNotifications.length}
      </p>

      {#if $user.notifications.length > 0}
        <Button
          style={css.raw({ fontSize: '12px', fontWeight: 'semibold' })}
          size="sm"
          variant="gray-outline"
          on:click={async () => await readAllNotifications()}
        >
          모두 읽기
        </Button>
      {/if}
    </div>

    <ul
      class={css({ minHeight: '120px', maxHeight: '440px', overflowY: 'auto', position: 'relative' })}
      data-scroll-lock-ignore
    >
      {#each $user.notifications.slice(0, 20) as notification (notification.id)}
        <li>
          {#if notification.__typename === 'CommentNotification'}
            <CommentNotification $commentNotification={notification} />
          {:else if notification.__typename === 'SubscribeNotification'}
            <SubscribeNotification $subscribeNotification={notification} />
          {:else if notification.__typename === 'PurchaseNotification'}
            <PurchaseNotification $purchaseNotification={notification} />
          {:else if notification.__typename === 'EmojiReactionNotification'}
            <EmojiReactionNotification $emojiReactionNotification={notification} via="menu" />
          {:else if notification.__typename === 'NewPostNotification'}
            <NewPostNotification $newPostNotification={notification} />
          {/if}
        </li>
      {:else}
        <li
          class={css({
            fontSize: '14px',
            fontWeight: 'medium',
            textAlign: 'center',
            color: 'gray.500',
            position: 'absolute',
            top: '[50%]',
            left: '[50%]',
            transform: 'translate(-50%, -50%)',
          })}
        >
          알림이 없어요
        </li>
      {/each}

      {#if $user.notifications.length > 20}
        <li class={css({ marginTop: '32px', padding: '20px' })}>
          <Button
            style={css.raw({
              display: 'inline-block',
              width: 'full',
            })}
            href="/me/notifications"
            type="link"
            variant="gray-sub-fill"
          >
            더보기
          </Button>
        </li>
      {/if}
    </ul>
  </div>
{/if}
