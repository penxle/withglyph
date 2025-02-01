<script lang="ts">
  import './toolbar-preview.css';

  import { production } from '@withglyph/lib/environment';
  import { onMount } from 'svelte';
  import IconHorizontalRule from '~icons/glyph/horizontal-rule';
  import IconRuby from '~icons/glyph/ruby';
  import IconArrowBackUp from '~icons/tabler/arrow-back-up';
  import IconArrowForwardUp from '~icons/tabler/arrow-forward-up';
  import IconArrowLeft from '~icons/tabler/arrow-left';
  import IconBug from '~icons/tabler/bug';
  import IconChevronLeft from '~icons/tabler/chevron-left';
  import IconClipboard from '~icons/tabler/clipboard';
  import IconClockPlay from '~icons/tabler/clock-play';
  import IconCode from '~icons/tabler/code';
  import IconFolder from '~icons/tabler/folder';
  import IconHtml from '~icons/tabler/html';
  import IconLink from '~icons/tabler/link';
  import IconListNumbers from '~icons/tabler/list-numbers';
  import IconPhoto from '~icons/tabler/photo';
  import IconQuote from '~icons/tabler/quote';
  import FullLogo from '$assets/logos/full.svg?component';
  import { fragment, graphql } from '$glitch';
  import { Alert, Button, Icon } from '$lib/components';
  import { Menu, MenuItem } from '$lib/components/menu';
  import { createFloatingActions, portal } from '$lib/svelte/actions';
  import { values } from '$lib/tiptap/values';
  import { validImageMimes } from '$lib/utils';
  import { css, cx } from '$styled-system/css';
  import { center, flex } from '$styled-system/patterns';
  import CharacterCountWidget from './CharacterCountWidget.svelte';
  import { getEditorContext } from './context';
  import DebugModal from './DebugModal.svelte';
  import DraftListModal from './DraftListModal.svelte';
  import GalleryEditToolbar from './GalleryEditToolbar.svelte';
  import ImageEditToolbar from './ImageEditToolbar.svelte';
  import LinkModal from './LinkModal.svelte';
  import MobileEditMenu from './MobileEditMenu.svelte';
  import PublishMenu from './PublishMenu.svelte';
  import RubyModal from './RubyModal.svelte';
  import TextEditToolbar from './TextEditToolbar.svelte';
  import ToolbarButton from './ToolbarButton.svelte';
  import ToolbarButtonTooltip from './ToolbarButtonTooltip.svelte';
  import type { EditorPage_Header_post, EditorPage_Header_query } from '$glitch';

  export { _post as $post, _query as $query };
  let _query: EditorPage_Header_query;
  let _post: EditorPage_Header_post;

  const { state, forceSynchronize } = getEditorContext();
  $: editor = $state.editor;

  $: query = fragment(
    _query,
    graphql(`
      fragment EditorPage_Header_query on Query {
        me @_required {
          id

          posts(state: DRAFT) {
            id
          }

          ...EditorPage_DraftListModal_user
        }

        ...EditorPage_PublishMenu_query
      }
    `),
  );

  $: post = fragment(
    _post,
    graphql(`
      fragment EditorPage_Header_post on Post {
        id
        permalink

        ...EditorPage_PublishMenu_post
        ...EditorPage_DraftListModal_post
      }
    `),
  );

  const menuOffset = 4;

  let publishMenuOpen = false;
  let draftListOpen = false;
  let timeTravelOpen = false;
  let linkOpen = false;
  let rubyOpen = false;

  let debugModalOpen = false;

  let isTemplate = true;

  const { anchor: publishAnchor, floating: publishFloating } = createFloatingActions({
    placement: 'bottom-end',
    offset: 13,
  });

  const { anchor: linkAnchor, floating: linkFloating } = createFloatingActions({
    placement: 'bottom',
    offset: 13,
  });

  const { anchor: rubyAnchor, floating: rubyFloating } = createFloatingActions({
    placement: 'bottom',
    offset: 13,
  });

  let vvOffset: number | undefined;

  const handleVisualViewportChange = () => {
    vvOffset = window.visualViewport?.offsetTop;
  };

  onMount(() => {
    handleVisualViewportChange();

    window.visualViewport?.addEventListener('resize', handleVisualViewportChange);
    window.visualViewport?.addEventListener('scroll', handleVisualViewportChange);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleVisualViewportChange);
      window.visualViewport?.addEventListener('scroll', handleVisualViewportChange);
    };
  });
</script>

<header
  style:transform={`translateY(${vvOffset ?? 0}px)`}
  class={css({
    position: 'absolute',
    top: '0',
    width: 'full',
    backgroundColor: 'gray.0',
    transition: 'common',
    zIndex: '100',
  })}
>
  <div
    class={flex({
      justify: 'space-between',
      align: 'center',
      borderBottomWidth: '1px',
      borderBottomColor: 'gray.100',
      paddingX: '20px',
      width: 'full',
      height: { base: '56px', sm: '62px' },
    })}
  >
    {#if isTemplate}
      <div class={flex({ align: 'center', gap: '8px' })}>
        <a href="/me/templates">
          <Icon icon={IconArrowLeft} size={24} />
        </a>
        <p class={css({ fontSize: '20px', fontWeight: 'bold' })}>템플릿 만들기</p>
      </div>
    {:else}
      <a class={flex({ align: 'center', gap: '8px' })} href="/">
        <FullLogo
          class={css({
            marginTop: '20px',
            marginBottom: '17px',
            color: 'gray.900',
            height: '25px',
            hideBelow: 'sm',
          })}
        />
        <Icon style={css.raw({ hideFrom: 'sm' })} icon={IconChevronLeft} size={24} />
      </a>
    {/if}
    <div class={flex({ flex: '1', justify: 'flex-end', align: 'flex-end' })}>
      {#if $state.timeTravel}
        <div class={flex({ gap: '10px' })} role="group">
          <Button size="sm" variant="brand-fill" on:click={() => (timeTravelOpen = true)}>이 시점으로 복구</Button>
          <Button size="sm" variant="gray-outline" on:click={() => ($state.timeTravel = false)}>시간여행 종료</Button>
        </div>
      {:else}
        <div
          class={flex({
            direction: 'column',
            marginRight: '8px',
            textAlign: 'right',
            fontSize: '12px',
            alignSelf: 'flex-start',
          })}
        >
          <CharacterCountWidget {editor} offset={8} placement="bottom-end" />
          <span
            class={css(
              { transition: 'common', fontSize: '12px' },
              $state.connectionState === 'connecting' || $state.connectionState === 'synchronizing'
                ? { color: 'gray.600' }
                : $state.connectionState === 'synchronized'
                  ? { fontWeight: 'medium', color: 'brand.400' }
                  : { fontWeight: 'bold', color: 'red.600' },
            )}
          >
            {#if $state.connectionState === 'connecting'}
              서버 연결 중
            {:else if $state.connectionState === 'synchronizing'}
              포스트 동기화 중
            {:else if $state.connectionState === 'synchronized'}
              실시간 저장 중
            {:else}
              서버 연결 끊김
            {/if}
          </span>
        </div>

        <div class={flex({ gap: '10px' })} role="group">
          {#if isTemplate}
            <Button
              style={css.raw({ width: '68px' })}
              size="sm"
              variant="gray-outline"
              on:click={() => forceSynchronize()}
            >
              저장
            </Button>
          {:else}
            <Button
              style={flex.raw({ alignItems: 'center', padding: '0!', backgroundColor: 'transparent!' })}
              role="presentation"
              size="sm"
              tabindex={-1}
              type="link"
              variant="gray-outline"
            >
              <button
                class={css({
                  paddingLeft: '12px',
                  paddingRight: '8px',
                  paddingY: '9px',
                  backgroundColor: { _hover: 'gray.100', _focusVisible: 'gray.100' },
                })}
                disabled={false}
                type="button"
                on:click={() => forceSynchronize()}
              >
                저장
              </button>
              <hr class={css({ width: '1px', height: '8px', backgroundColor: 'gray.300' })} />
              <button
                class={css({
                  paddingLeft: '8px',
                  paddingRight: '12px',
                  paddingY: '9px',
                  fontWeight: 'bold',
                  color: 'gray.400',
                  backgroundColor: { _hover: 'gray.100', _focusVisible: 'gray.100' },
                })}
                disabled={$query.me.posts.length === 0}
                type="button"
                on:click={() => (draftListOpen = true)}
              >
                {$query.me.posts?.length ?? 0}
              </button>
            </Button>
          {/if}

          <div class={css({ width: 'fit' })} use:publishAnchor>
            <Button
              style={css.raw({ width: '68px' }, isTemplate && { width: 'fit' })}
              aria-pressed={publishMenuOpen}
              size="sm"
              on:click={() => {
                publishMenuOpen = true;
                forceSynchronize();
              }}
            >
              {isTemplate ? '발행 옵션 설정' : '발행'}
            </Button>
          </div>
        </div>

        {#if publishMenuOpen}
          <div
            class={css({ position: 'fixed', inset: '0', zIndex: '40', smDown: { backgroundColor: 'gray.900/50' } })}
            role="button"
            tabindex="-1"
            on:click={() => (publishMenuOpen = false)}
            on:keypress={null}
            use:portal
          />
        {/if}

        <div
          class={css({ position: 'fixed', left: '0', bottom: '0', width: 'full', zIndex: '50', hideFrom: 'sm' })}
          use:portal
        >
          <PublishMenu {$post} {$query} bind:open={publishMenuOpen} />
        </div>

        <div class={css({ zIndex: '50', hideBelow: 'sm' })} use:publishFloating>
          <PublishMenu {$post} {$query} bind:open={publishMenuOpen} />
        </div>
      {/if}
    </div>
  </div>

  {#if !$state.timeTravel}
    <div
      class={flex({
        justify: 'space-between',
        marginX: 'auto',
        paddingY: '4px',
        width: 'full',
        maxWidth: '940px',
        hideBelow: 'sm',
      })}
    >
      <div class={flex({ align: 'center', gap: '8px' })}>
        <ToolbarButton
          icon={IconPhoto}
          label="이미지"
          size="lg"
          on:click={() => {
            const picker = document.createElement('input');
            picker.type = 'file';
            picker.accept = validImageMimes.join(',');
            picker.multiple = true;
            picker.addEventListener('change', () => {
              if (picker.files?.length) {
                $state.fileHandler?.('image', [...picker.files]);
              }
            });
            picker.click();
          }}
        />
        <ToolbarButton
          icon={IconFolder}
          label="파일"
          size="lg"
          on:click={() => {
            const picker = document.createElement('input');
            picker.type = 'file';
            picker.multiple = true;
            picker.addEventListener('change', () => {
              if (picker.files?.length) {
                $state.fileHandler?.('file', [...picker.files]);
              }
            });
            picker.click();
          }}
        />

        <div use:linkAnchor>
          <ToolbarButton
            slot="value"
            aria-pressed={editor?.isActive('link') || linkOpen}
            icon={IconLink}
            label="링크"
            size="lg"
            on:click={() => (linkOpen = true)}
          />
        </div>

        {#if linkOpen}
          <div use:linkFloating>
            <LinkModal bind:open={linkOpen} />
          </div>
        {/if}

        <div use:rubyAnchor>
          <ToolbarButton
            aria-pressed={editor?.isActive('ruby') || rubyOpen}
            disabled={editor?.state.selection.empty && !editor?.isActive('ruby')}
            icon={IconRuby}
            label="루비"
            size="lg"
            on:click={() => (rubyOpen = true)}
          />
        </div>

        {#if rubyOpen}
          <div use:rubyFloating>
            <RubyModal bind:open={rubyOpen} />
          </div>
        {/if}

        <Menu as="div" offset={menuOffset} placement="bottom">
          <ToolbarButton slot="value" aria-pressed={open} icon={IconHorizontalRule} label="구분선" size="lg" let:open />

          {#each values.horizontalRule as hr (hr.value)}
            <MenuItem
              style={center.raw({ gap: '8px' })}
              on:click={() => {
                editor?.chain().focus().setHorizontalRule(hr.value).run();
              }}
            >
              <hr
                class={cx('divider-preview', css({ width: '176px' }))}
                aria-label={`${hr.value}번째 구분선`}
                data-kind={hr.value}
              />
            </MenuItem>
          {/each}
        </Menu>

        <Menu as="div" offset={menuOffset} placement="bottom">
          <ToolbarButton slot="value" aria-pressed={open} icon={IconQuote} label="인용" size="lg" let:open />

          {#each values.blockquote as blockquote (blockquote.value)}
            <MenuItem
              style={center.raw({ gap: '8px' })}
              on:click={() => {
                editor?.chain().focus().setBlockquote(blockquote.value).run();
              }}
            >
              <blockquote
                class={cx('blockquote-preview', css({ color: 'gray.400', fontSize: '[12px!]' }))}
                aria-label={`${blockquote.value}번째 인용구`}
                data-kind={blockquote.value}
              >
                내용을 입력해주세요
              </blockquote>
            </MenuItem>
          {/each}
        </Menu>

        <Menu as="div" menuStyle={css.raw({ minWidth: '[initial]' })} offset={menuOffset} placement="bottom">
          <ToolbarButton slot="value" aria-pressed={open} icon={IconListNumbers} label="리스트" size="lg" let:open />

          {#each values.list as list (list.value)}
            <MenuItem
              style={css.raw({ _pressed: { color: 'brand.400' } })}
              aria-label={list.label}
              aria-pressed={editor?.isActive(list.value)}
              on:click={() => {
                editor?.chain().focus().toggleList(list.value, 'list_item').run();
              }}
            >
              <Icon icon={list.icon} size={24} />
            </MenuItem>
          {/each}
        </Menu>

        <ToolbarButton
          disabled={editor?.isActive('code_block')}
          icon={IconCode}
          label="코드블럭"
          size="lg"
          on:click={() => editor?.chain().focus().setCodeBlock().run()}
        />
        <ToolbarButton
          disabled={editor?.isActive('html')}
          icon={IconHtml}
          label="HTML블럭"
          size="lg"
          on:click={() => editor?.chain().focus().setHtml().run()}
        />
      </div>

      <div class={flex({ align: 'center', gap: '8px' })}>
        {#if !production}
          <ToolbarButton icon={IconBug} label="디버그" size="lg" on:click={() => (debugModalOpen = true)} />
        {/if}
        <ToolbarButton icon={IconClockPlay} label="시간여행" size="lg" on:click={() => ($state.timeTravel = true)} />
        <ToolbarButton
          style={css.raw({ _hover: { backgroundColor: 'gray.100' } })}
          external
          href={`/editor/${$post.permalink}/preview`}
          icon={IconClipboard}
          label="미리보기"
          size="lg"
          type="link"
        />
      </div>
    </div>

    <div
      class={css(
        {
          borderYWidth: '1px',
          borderYColor: 'gray.100',
          hideBelow: 'sm',
        },
        (editor?.isActive('image') || editor?.isActive('gallery')) && {
          borderYColor: 'gray.50',
          backgroundColor: '[#F3F0FD]',
        },
      )}
    >
      <div
        class={flex({
          align: 'center',
          marginX: 'auto',
          paddingX: '8px',
          height: '44px',
          width: 'full',
          maxWidth: '940px',
        })}
      >
        <div class={flex({ align: 'center', gap: '10px', color: 'gray.800', pointerEvents: 'auto' })}>
          <div class={center({ gap: '6px', height: '24px' })}>
            <ToolbarButtonTooltip message="실행 취소">
              <ToolbarButton
                disabled={!editor?.can().undo()}
                icon={IconArrowBackUp}
                on:click={() => editor?.chain().focus().undo().run()}
              />
            </ToolbarButtonTooltip>

            <ToolbarButtonTooltip message="다시 실행">
              <ToolbarButton
                disabled={!editor?.can().redo()}
                icon={IconArrowForwardUp}
                on:click={() => editor?.chain().focus().redo().run()}
              />
            </ToolbarButtonTooltip>
          </div>

          {#if editor?.isActive('image')}
            <ImageEditToolbar />
          {:else if editor?.isActive('gallery')}
            <GalleryEditToolbar />
          {:else}
            <TextEditToolbar />
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <MobileEditMenu />
</header>

<DraftListModal {$post} $user={$query.me} bind:open={draftListOpen} />

<Alert bind:open={timeTravelOpen}>
  <p slot="title" class={css({ textAlign: 'left' })}>이 시점으로 돌아가시겠어요?</p>
  <p slot="content" class={css({ textAlign: 'left' })}>
    시간 여행은 몇 번이고 가능해요. 다시 시간여행을 하면 언제든 원하는 시점으로 돌아갈 수 있으니 안심하세요.
  </p>

  <svelte:fragment slot="action">
    <Button
      style={css.raw({ hideFrom: 'sm' })}
      size="lg"
      variant="gray-sub-fill"
      on:click={() => (timeTravelOpen = false)}
    >
      취소
    </Button>
    <Button
      style={css.raw({ hideBelow: 'sm' })}
      size="lg"
      variant="gray-outline"
      on:click={() => (timeTravelOpen = false)}
    >
      취소
    </Button>
    <Button
      size="lg"
      on:click={() => {
        $state.doTimeTravel?.();
        $state.timeTravel = false;
        timeTravelOpen = false;
      }}
    >
      복구
    </Button>
  </svelte:fragment>
</Alert>

{#if !production}
  <DebugModal bind:open={debugModalOpen} />
{/if}
