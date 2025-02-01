<script lang="ts">
  import { onMount } from 'svelte';
  import IconCheck from '~icons/tabler/check';
  import IconFileBroken from '~icons/tabler/file-broken';
  import IconPlus from '~icons/tabler/plus';
  import IconSettings from '~icons/tabler/settings';
  import IconTemplate from '~icons/tabler/template';
  import { Button, Icon, Modal } from '$lib/components';
  import { TiptapEditor } from '$lib/tiptap/components';
  import { css } from '$styled-system/css';
  import { center, flex } from '$styled-system/patterns';
  import { getEditorContext } from './context';
  import type { Writable } from 'svelte/store';
  import type * as Y from 'yjs';

  const { state, forceSynchronize } = getEditorContext();

  let templateOpen = false;

  let isTemplate = false;
  let isPost = false;
  let templateLength = 1;

  const createStore = (doc: Y.Doc, name: string) => {
    const yText = doc.getText(name);

    const store: Writable<string> = {
      subscribe: (run) => {
        const handler = () => {
          run(yText.toString());
        };

        yText.observe(handler);
        handler();

        return () => {
          yText.unobserve(handler);
        };
      },
      set: (value: string) => {
        doc.transact(() => {
          yText.delete(0, yText.length);
          yText.insert(0, value);
        });
      },
      update: (fn: (value: string) => string) => {
        doc.transact(() => {
          yText.delete(0, yText.length);
          yText.insert(0, fn(yText.toString()));
        });
      },
    };

    return store;
  };

  const title = createStore($state.document, 'title');
  const subtitle = createStore($state.document, 'subtitle');

  onMount(() => {
    const saveEventHandler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        forceSynchronize();
      }
    };

    document.addEventListener('keydown', saveEventHandler);

    return () => {
      document.removeEventListener('keydown', saveEventHandler);
    };
  });
</script>

<main class={flex({ direction: 'column', grow: '1', backgroundColor: isTemplate ? 'gray.900' : 'gray.50' })}>
  <div
    class={flex({
      direction: 'column',
      grow: '1',
      marginX: 'auto',
      paddingY: '20px',
      width: 'full',
      maxWidth: '940px',
      backgroundColor: 'gray.0',
      sm: { paddingTop: '34px' },
    })}
  >
    <div
      class={css({
        borderBottomWidth: '1px',
        borderBottomColor: 'gray.200',
        marginX: { base: '20px', sm: '40px' },
        marginBottom: '20px',
        paddingBottom: '10px',
      })}
    >
      <input
        class={css({ width: 'full', fontSize: { base: '22px', sm: '28px' }, fontWeight: 'bold' })}
        maxlength="100"
        placeholder="제목을 입력하세요"
        type="text"
        bind:value={$title}
      />

      <input
        class={css({ marginTop: '4px', width: 'full', fontSize: '16px', fontWeight: 'medium' })}
        maxlength="100"
        placeholder="부제목을 입력하세요"
        type="text"
        bind:value={$subtitle}
      />
    </div>

    <div class={flex({ direction: 'column', grow: '1', paddingX: { base: '20px', sm: '40px' }, width: 'full' })}>
      {#if isTemplate || isPost}
        <TiptapEditor
          style={css.raw({ flexGrow: '1', paddingBottom: '100px', maxWidth: 'full' })}
          awareness={$state.awareness}
          document={$state.document}
          bind:editor={$state.editor}
          on:file={(event) => $state.fileHandler?.('auto', event.detail.files, event.detail.pos)}
        />
      {:else}
        <p class={css({ marginBottom: '28px', fontSize: '14px', fontWeight: 'medium', color: 'gray.400' })}>
          포스트 작성 아이콘을 눌러 새 포스트를 작성하거나 원하는 구조의 템플릿을 선택해 작성해 보세요
        </p>

        <button
          class={flex({
            align: 'center',
            gap: '6px',
            fontSize: '14px',
            fontWeight: 'medium',
            color: 'gray.400',
            width: 'fit',
          })}
          type="button"
          on:click={() => (isPost = true)}
        >
          <Icon icon={IconFileBroken} size={20} />
          포스트 작성
        </button>
        <button
          class={flex({
            align: 'center',
            gap: '6px',
            marginTop: '14px',
            fontSize: '14px',
            fontWeight: 'medium',
            color: 'gray.400',
            width: 'fit',
          })}
          type="button"
          on:click={() => (templateOpen = true)}
        >
          <Icon icon={IconTemplate} size={20} />
          템플릿
        </button>
      {/if}
    </div>
  </div>
</main>

<Modal
  style={flex.raw({ direction: 'column', grow: '1', paddingTop: '0', paddingX: '0', paddingBottom: '0' })}
  actionStyle={css.raw({ borderStyle: 'none', sm: { padding: '0' } })}
  size="lg"
  bind:open={templateOpen}
>
  <svelte:fragment slot="title">템플릿</svelte:fragment>

  {#if templateLength > 0}
    <div class={flex({ height: 'full', smDown: { flexDirection: 'column' } })}>
      <div
        class={css({
          truncate: true,
          sm: { borderRightWidth: '1px', borderRightColor: 'gray.100', paddingX: '20px', width: '220px', flex: 'none' },
        })}
      >
        <ul class={css({ sm: { marginX: '-20px' } })}>
          <li class={css({ '& + &': { borderTopWidth: '1px', borderTopColor: 'gray.100' } })}>
            <button
              class={flex({
                align: 'center',
                gap: '8px',
                paddingX: '20px',
                paddingY: '12px',
                fontSize: '13px',
                color: 'gray.800',
                width: 'full',
                truncate: true,
                _pressed: {
                  paddingRight: '16px',
                  backgroundColor: 'brand.50',
                },
              })}
              aria-pressed={false}
              type="button"
            >
              <span class={css({ truncate: true })}>
                템플릿 포스트 제목1 템플릿 포스트 제목1 템플릿 포스트 제목1 템플릿 포스트 제목1
              </span>
            </button>
          </li>
          <li class={css({ '& + &': { borderTopWidth: '1px', borderTopColor: 'gray.100' } })}>
            <button
              class={flex({
                align: 'center',
                justify: 'space-between',
                gap: '8px',
                paddingX: '20px',
                paddingY: '12px',
                fontSize: '13px',
                color: 'gray.800',
                width: 'full',
                truncate: true,
                _pressed: {
                  paddingRight: '16px',
                  backgroundColor: 'brand.50',
                },
              })}
              aria-pressed={true}
              type="button"
            >
              <span class={css({ truncate: true })}>
                템플릿 포스트 제목2 템플릿 포스트 제목2 템플릿 포스트 제목2 템플릿 포스트 제목2
              </span>
              <Icon style={css.raw({ color: 'brand.400' })} icon={IconCheck} />
            </button>
          </li>
        </ul>

        <Button
          style={center.raw({
            gap: '4px',
            marginTop: '10px',
            width: 'full',
            hideBelow: 'sm',
          })}
          href="/me/templates"
          size="sm"
          type="link"
          variant="gray-outline"
        >
          <Icon style={css.raw({ color: 'gray.600' })} icon={IconPlus} />
          관리
        </Button>
      </div>

      <div
        class={css({ position: 'relative', width: 'full', overflowY: 'auto', scrollbar: 'hidden', hideBelow: 'sm' })}
      >
        <div class={css({ height: '1000px' })}>미리보기</div>

        <div
          class={css({
            position: 'sticky',
            bottom: '0',
            borderTopWidth: '1px',
            borderTopColor: 'gray.100',
            paddingX: '20px',
            paddingY: '16px',
            textAlign: 'right',
          })}
        >
          <Button
            style={css.raw({ width: '140px' })}
            variant="brand-fill"
            on:click={() => {
              isTemplate = true;
              templateOpen = false;
            }}
          >
            사용
          </Button>
        </div>
      </div>
    </div>
  {:else}
    <div class={center({ flexDirection: 'column', marginY: 'auto' })}>
      <p class={css({ fontSize: { base: '22px', sm: '30px' }, fontWeight: '[800]', textAlign: 'center' })}>
        템플릿 만들기
      </p>

      <p class={css({ marginTop: '4px', fontSize: '13px', color: 'gray.500', textAlign: 'center' })}>
        템플릿 관리 페이지에서 자주 사용하는 포스트의
        <br />
        텍스트 서식과 발행 옵션을 템플릿으로 저장해서 사용할 수 있습니다
      </p>
      <Button
        style={css.raw({ marginTop: '24px', width: '154px', hideBelow: 'sm' })}
        href="/me/templates"
        type="link"
        variant="gray-sub-fill"
      >
        템플릿 관리이동
      </Button>
    </div>
  {/if}

  <div slot="action" class={flex({ align: 'center', gap: '6px', width: 'full', hideFrom: 'sm' })}>
    {#if templateLength > 0}
      <a class={css({ padding: '8px', color: 'gray.600' })} href="/me/templates">
        <Icon icon={IconSettings} size={28} />
      </a>
      <Button
        style={css.raw({ width: 'full' })}
        size="lg"
        variant="brand-fill"
        on:click={() => {
          isTemplate = true;
          templateOpen = false;
        }}
      >
        사용
      </Button>
    {:else}
      <Button style={css.raw({ width: 'full' })} href="/me/templates" size="lg" type="link" variant="gray-sub-fill">
        템플릿 관리이동
      </Button>
    {/if}
  </div>
</Modal>
