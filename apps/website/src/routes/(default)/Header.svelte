<script lang="ts">
  import IconPencil from '~icons/tabler/pencil';
  import { goto } from '$app/navigation';
  import FullLogo from '$assets/logos/full.svg?component';
  import { fragment, graphql } from '$glitch';
  import { analytics } from '$lib/analytics';
  import { Button, Icon } from '$lib/components';
  import { css } from '$styled-system/css';
  import { flex } from '$styled-system/patterns';
  import NotificationMenu from './NotificationMenu.svelte';
  import SearchBar from './SearchBar.svelte';
  import UserMenu from './UserMenu.svelte';
  import type { DefaultLayout_Header_query } from '$glitch';
  import type { SystemStyleObject } from '$styled-system/types';

  let _query: DefaultLayout_Header_query;
  export { _query as $query };

  export let style: SystemStyleObject | undefined = undefined;
  export let headerEl: HTMLElement | null = null;

  $: query = fragment(
    _query,
    graphql(`
      fragment DefaultLayout_Header_query on Query {
        me {
          id
          email

          profile {
            id
            name
          }

          ...DefaultLayout_UserMenu_user
          ...DefaultLayout_NotificationMenu_user
        }
      }
    `),
  );

  $: console.log('$query', _query);

  const createPost = graphql(`
    mutation DefaultLayout_Header_CreatePost_Mutation($input: CreatePostInput!) {
      createPost(input: $input) {
        id
        permalink
      }
    }
  `);
</script>

<header
  bind:this={headerEl}
  class={css(
    {
      position: 'sticky',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      borderBottomWidth: '1px',
      borderBottomColor: 'gray.100',
      top: '0',
      backgroundColor: 'gray.0',
      height: '62px',
      zIndex: '10',
    },
    style,
  )}
>
  <nav
    class={flex({
      align: 'center',
      justify: 'space-between',
      gap: '24px',
      position: 'relative',
      paddingX: '20px',
      height: '62px',
      width: 'full',
      maxWidth: '1280px',
    })}
  >
    <a
      class={css({
        sm: { marginTop: '20px', marginBottom: '17px' },
        smDown: { marginTop: '18px', marginBottom: '13px' },
        height: '25px',
      })}
      aria-label="홈으로 이동"
      href="/"
    >
      <FullLogo class={css({ height: '25px', color: 'gray.900' })} />
    </a>

    <SearchBar
      style={css.raw({
        position: 'absolute',
        left: '[50%]',
        transform: 'translateX(-50%)',
        marginRight: '130px',
        flex: '1',
        hideBelow: 'sm',
        maxWidth: '[32%]',
        width: 'full',
      })}
    />

    <div class={flex({ align: 'center', gap: { base: '18px', sm: '24px' } })}>
      <SearchBar style={css.raw({ hideFrom: 'sm', maxWidth: 'full' })} smBelow />
      {#if $query.me}
        <Button
          style={flex.raw({
            align: 'center',
            gap: '4px',
            paddingLeft: '12px',
            paddingRight: '14px',
            hideBelow: 'sm',
          })}
          size="sm"
          type="button"
          on:click={async () => {
            const { permalink } = await createPost({ spaceId: undefined });
            analytics.track('post:create', { via: 'feed' });
            await goto(`/editor/${permalink}`);
          }}
        >
          <Icon icon={IconPencil} />
          포스트 작성
        </Button>
        <NotificationMenu $user={$query.me} />
        <UserMenu $user={$query.me} />
      {:else}
        <Button href="/login" size="sm" type="link">로그인/회원가입</Button>
      {/if}
    </div>
  </nav>
</header>
