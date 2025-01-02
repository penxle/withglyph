<script lang="ts">
  import { validator } from '@felte/validator-zod';
  import dayjs from 'dayjs';
  import { createForm } from 'felte';
  import { tick } from 'svelte';
  import { z } from 'zod';
  import IconAlertTriangle from '~icons/tabler/alert-triangle-filled';
  import IconFolder from '~icons/tabler/folder';
  import IconGripVertical from '~icons/tabler/grip-vertical';
  import IconPhoto from '~icons/tabler/photo';
  import IconTextRecognition from '~icons/tabler/text-recognition';
  import { browser } from '$app/environment';
  import { afterNavigate } from '$app/navigation';
  import { graphql } from '$glitch';
  import { analytics } from '$lib/analytics';
  import { Button, Icon, LoginRequireAlert, Modal, Tooltip } from '$lib/components';
  import { isWebView, onFlutterMessage, postFlutterMessage } from '$lib/flutter';
  import { createFloatingActions, portal } from '$lib/svelte/actions';
  import { NodeView } from '$lib/tiptap';
  import { comma } from '$lib/utils';
  import { css, cx } from '$styled-system/css';
  import { center, flex } from '$styled-system/patterns';
  import type { NodeViewProps } from '$lib/tiptap';

  type $$Props = NodeViewProps;
  $$restProps;

  export let node: NodeViewProps['node'];
  export let getPos: NodeViewProps['getPos'];
  export let selected: NodeViewProps['selected'];
  export let editor: NodeViewProps['editor'] | undefined;
  export let updateAttributes: NodeViewProps['updateAttributes'];

  $: permalink = editor?.storage.permalink;
  $: revisionId = editor?.storage.revisionId;

  $: isLastChild = editor?.state.doc.firstChild?.lastChild?.eq(node) ?? false;

  $: if (isLastChild) {
    updateAttributes({ price: null });
  }

  let priceOpen = false;
  let loginRequireOpen = false;
  let postPurchaseOpen = false;

  let priceInputEl: HTMLInputElement | undefined;

  const query = graphql(`
    query AccessBarrier_Query($permalink: String!, $revisionId: ID!) @_manual {
      me {
        id
        point
      }

      post(permalink: $permalink) {
        id
        purchasedAt

        revision(id: $revisionId) {
          id

          paidContent {
            id
            characters
            images
            files
          }
        }

        space @_required {
          id

          meAsMember {
            id
          }
        }
      }
    }
  `);

  const purchasePost = graphql(`
    mutation TiptapAccessBarrier_PurchasePost_Mutation($input: PurchasePostInput!) {
      purchasePost(input: $input) {
        id

        publishedRevision {
          id
          content
        }
      }
    }
  `);

  let fetchable = false;
  $: if (permalink && revisionId) {
    fetchable = true;
    query.refetch({ permalink, revisionId });
  }

  const { anchor, floating } = createFloatingActions({
    placement: 'bottom',
    offset: 8,
  });

  const { form, isSubmitting, setInitialValues, errors } = createForm({
    extend: [
      validator({
        schema: z.object({
          price: z
            .string()
            .transform((value) => Number.parseInt(value.replaceAll(',', '')))
            .pipe(
              z
                .number({ invalid_type_error: '가격을 입력해 주세요' })
                .min(100, '100P 이상의 값으로 설정해야 해요')
                .max(1_000_000, '1,000,000P 이하의 값으로 설정해야 해요')
                .multipleOf(100, '100P 단위로 설정해 주세요'),
            ),
        }),
      }),
    ],
    onSubmit: ({ price }: { price: string }) => {
      const parsed = Number.parseInt(price.replaceAll(',', ''));
      if (Number.isNaN(parsed)) throw new Error('Unexpected invalid price');

      updateAttributes({ price: parsed });
    },
  });

  let isSubmitted = false;
  $: if ($isSubmitting && !isSubmitted) {
    isSubmitted = true;
  }

  $: invalidPrice = isSubmitted && !!$errors.price;
  $: priceErrorDetailTooltipId = invalidPrice ? 'price-error' : undefined;

  $: setInitialValues({ price: node.attrs.price ? comma(node.attrs.price) : '' });

  $: if (priceOpen) {
    // eslint-disable-next-line unicorn/prefer-top-level-await
    tick().then(() => {
      priceInputEl?.focus();
    });
  } else {
    isSubmitted = false;
  }

  afterNavigate(() => {
    priceOpen = false;
  });

  onFlutterMessage(async (message) => {
    if (message.type === 'purchase:proceed') {
      await purchasePost({
        postId: $query?.post.id ?? '',
        revisionId,
      });

      analytics.track('post:purchase', {
        postId: $query?.post.id,
        price: node.attrs.price,
      });
    }
  });
</script>

<NodeView data-drag-handle draggable>
  {#if !browser}
    <!-- empty -->
  {:else if editor?.isEditable}
    <div
      class={css(
        {
          position: 'relative',
          display: 'flex',
          justifyContent: 'flex-end',
          paddingY: '10px',
        },
        selected && { outlineWidth: '2px', outlineColor: 'brand.400' },
      )}
    >
      <div class={center({ position: 'absolute', inset: '0' })}>
        <div class={cx('line', css({ width: 'full', height: '[1.5px]', color: 'gray.300' }))}></div>
      </div>

      <div
        class={center({
          position: 'relative',
          gap: '8px',
          borderWidth: '1px',
          borderColor: 'gray.200',
          padding: '8px',
          marginRight: '20px',
          width: 'fit',
          color: 'gray.600',
          backgroundColor: 'gray.0',
          boxShadow: '[0 2px 10px 0 {colors.gray.900/4}]',
          fontSize: '13px',
        })}
      >
        {#if isLastChild}
          <button
            class={css({
              paddingX: '6px',
              paddingY: '4px',
              transition: 'common',
              _hover: { backgroundColor: 'gray.100' },
            })}
            type="button"
            on:click={() =>
              editor
                ?.chain()
                .insertContentAt(getPos() + node.nodeSize, { type: 'paragraph' })
                .focus()
                .run()}
          >
            여기서부터 유료 분량 만들기
          </button>
        {:else}
          <div
            class={css({
              paddingX: '6px',
              paddingY: '4px',
              whiteSpace: 'nowrap',
            })}
          >
            여기서부터 유료 분량
          </div>

          <div class={css({ width: '1px', height: '14px', backgroundColor: 'gray.200' })} />

          <button
            class={center({
              gap: '4px',
              paddingX: '6px',
              paddingY: '4px',
              fontWeight: node.attrs.price ? 'medium' : 'normal',
              color: node.attrs.price ? 'brand.400' : 'red.600',
              backgroundColor: { _hover: 'gray.50', _pressed: 'gray.50' },
              transition: 'common',
              whiteSpace: 'nowrap',
            })}
            aria-pressed={priceOpen}
            type="button"
            on:click={() => (priceOpen = true)}
            use:anchor
          >
            {#if node.attrs.price}
              {comma(node.attrs.price)} P
            {:else}
              <Icon icon={IconAlertTriangle} />
              가격설정
            {/if}
          </button>

          <div class={css({ width: '1px', height: '14px', backgroundColor: 'gray.200' })} />

          <button
            class={css({
              paddingX: '6px',
              paddingY: '4px',
              whiteSpace: 'nowrap',
              transition: 'common',
              _hover: { backgroundColor: 'gray.100' },
            })}
            type="button"
            on:click={async () => {
              await updateAttributes({ price: null });
              if (editor) {
                const pos = editor.state.doc.resolve(getPos());
                editor.commands.cut({ from: getPos(), to: getPos() + node.nodeSize }, pos.end(pos.depth));
              }
            }}
          >
            해제
          </button>
        {/if}

        <div class={css({ width: '1px', height: '14px', backgroundColor: 'gray.200' })} />

        <div
          class={css({
            flex: 'none',
            padding: '4px',
            transition: 'common',
            _hover: { backgroundColor: 'gray.100' },
          })}
        >
          <Icon icon={IconGripVertical} size={20} />
        </div>
      </div>

      {#if priceOpen}
        <div
          class={css({ position: 'fixed', inset: '0', zIndex: '40' })}
          role="button"
          tabindex="-1"
          on:click={() => (priceOpen = false)}
          on:keypress={null}
          use:portal
        />

        <div
          class={flex({
            direction: 'column',
            gap: '6px',
            borderWidth: '1px',
            borderColor: 'gray.200',
            paddingX: '10px',
            paddingTop: '8px',
            paddingBottom: '10px',
            backgroundColor: 'gray.0',
            zIndex: '50',
          })}
          use:floating
        >
          <form class={css({ display: 'contents' })} use:form>
            <Tooltip enabled={invalidPrice} keepShowing offset={8} placement="top">
              <span id={priceErrorDetailTooltipId} slot="message" aria-live="assertive">
                {#if $errors.price}
                  {@html $errors.price.join('<br />')}
                {/if}
              </span>
              <div class={css({ position: 'relative' })}>
                <input
                  bind:this={priceInputEl}
                  name="price"
                  class={css({
                    borderWidth: '1px',
                    borderColor: 'gray.200',
                    paddingLeft: '12px',
                    paddingRight: '24px',
                    paddingY: '10px',
                    width: '110px',
                    backgroundColor: 'gray.0',
                    _invalid: {
                      borderColor: 'red.600',
                      backgroundColor: 'red.50',
                    },
                  })}
                  aria-errormessage={priceErrorDetailTooltipId}
                  aria-invalid={invalidPrice}
                  inputmode="numeric"
                  placeholder="1,000"
                  on:input={(event) => {
                    const parsed = Number.parseInt(event.currentTarget.value.replaceAll(/\D/g, ''));

                    event.currentTarget.value = Number.isNaN(parsed) ? '' : comma(parsed);
                  }}
                />
                <span class={center({ position: 'absolute', right: '0', insetY: '0', paddingRight: '12px' })}>P</span>
              </div>
            </Tooltip>

            <Button size="sm" type="submit" variant="brand-fill">설정</Button>
          </form>
        </div>
      {/if}
    </div>
  {:else if $query && $query.post.revision.paidContent && !$query.post.space.meAsMember && !$query.post.purchasedAt}
    <div class={center({ paddingY: '20px' })}>
      <div
        class={css({
          borderTopWidth: '1px',
          borderTopColor: 'gray.100',
          paddingTop: '34px',
          width: 'full',
          pointerEvents: 'auto',
        })}
      >
        <div class={css({ fontSize: '18px', fontWeight: 'bold', textAlign: 'center' })}>
          다음 내용을 감상해보시겠어요?
        </div>
        <div class={css({ marginTop: '4px', fontSize: '14px', color: 'gray.500', textAlign: 'center' })}>
          구매한 포스트는 영구 소장이 가능해요
        </div>

        <div
          class={css({
            borderWidth: '1px',
            borderColor: 'gray.200',
            marginTop: '24px',
            marginX: 'auto',
            padding: '24px',
            width: 'full',
            maxWidth: '324px',
          })}
        >
          <div class={flex({ align: 'center', gap: '24px' })}>
            <div class={css({ flexGrow: '1' })}>
              <span class={css({ fontSize: '18px', fontWeight: 'bold' })}>
                {comma(node.attrs.price)}P
              </span>

              <div class={flex({ align: 'center', gap: '6px', wrap: 'wrap', marginTop: '2px' })}>
                <div class={flex({ align: 'center', gap: '2px' })}>
                  <Icon style={css.raw({ color: 'gray.600' })} icon={IconTextRecognition} />
                  <span class={css({ fontSize: '14px', color: 'gray.500' })}>
                    {comma($query.post.revision.paidContent.characters)}자
                  </span>
                </div>

                {#if $query.post.revision.paidContent.images}
                  <div class={flex({ align: 'center', gap: '2px' })}>
                    <Icon style={css.raw({ color: 'gray.600' })} icon={IconPhoto} />
                    <span class={css({ fontSize: '14px', color: 'gray.500' })}>
                      {comma($query.post.revision.paidContent.images)}개
                    </span>
                  </div>
                {/if}

                {#if $query.post.revision.paidContent.files}
                  <div class={flex({ align: 'center', gap: '2px' })}>
                    <Icon style={css.raw({ color: 'gray.600' })} icon={IconFolder} />
                    <span class={css({ fontSize: '14px', color: 'gray.500' })}>
                      {comma($query.post.revision.paidContent.files)}개
                    </span>
                  </div>
                {/if}
              </div>
            </div>
            <Button
              style={css.raw({ width: 'full', maxWidth: '96px' })}
              size="md"
              on:click={() => {
                if (isWebView()) {
                  postFlutterMessage({ type: 'purchase' });
                  return;
                }

                if (!$query?.me) {
                  loginRequireOpen = true;
                  return;
                }

                postPurchaseOpen = true;
              }}
            >
              구매하기
            </Button>
          </div>
        </div>
      </div>
    </div>

    {#if $query.me}
      <Modal bind:open={postPurchaseOpen}>
        <svelte:fragment slot="title">
          {$query.me.point < node.attrs.price ? '포인트 충전' : '포스트 구매'}
        </svelte:fragment>

        <div
          class={flex({
            justify: 'space-between',
            align: 'center',
            paddingY: '6px',
          })}
        >
          <p class={css({ color: 'gray.600' })}>현재 보유한 포인트</p>

          <p
            class={css({
              paddingX: '10px',
              paddingY: '8px',
              fontWeight: 'semibold',
              width: '120px',
              color: 'gray.500',
            })}
          >
            {comma($query.me.point)}
            P
          </p>
        </div>

        <hr class={css({ border: 'none', height: '1px', backgroundColor: 'gray.100', marginY: '6px' })} />

        <div
          class={flex({
            justify: 'space-between',
            align: 'center',
            paddingY: '6px',
          })}
        >
          <p class={css({ color: 'gray.600' })}>사용할 포인트</p>

          <p
            class={css({
              paddingX: '10px',
              paddingY: '8px',
              fontWeight: 'semibold',
              width: '120px',
              backgroundColor: 'gray.100',
            })}
          >
            {comma(node.attrs.price)}
            P
          </p>
        </div>

        <p class={css({ marginBottom: '32px', textAlign: 'right', fontSize: '13px', color: 'gray.400' })}>
          {#if $query.me.point < node.attrs.price}
            필요한 포인트
            <mark class={css({ fontSize: '13px', fontWeight: 'medium', color: 'red.600' })}>
              {comma(Math.abs($query.me.point - node.attrs.price))}P
            </mark>
          {/if}
        </p>

        <svelte:fragment slot="action">
          <Button
            style={css.raw({ width: 'full' })}
            size="lg"
            on:click={async () => {
              await purchasePost({
                postId: $query?.post.id ?? '',
                revisionId,
              });

              analytics.track('post:purchase', {
                postId: $query?.post.id,
                price: node.attrs.price,
              });

              postPurchaseOpen = false;
            }}
          >
            구매하기
          </Button>
        </svelte:fragment>
      </Modal>
    {:else}
      <LoginRequireAlert bind:open={loginRequireOpen} />
    {/if}
  {:else if !fetchable || $query?.post.space.meAsMember || $query?.post.purchasedAt}
    <div
      class={css({
        position: 'relative',
        display: 'flex',
        justifyContent: 'flex-end',
        paddingY: '10px',
        pointerEvents: 'auto',
      })}
    >
      <div class={center({ position: 'absolute', inset: '0' })}>
        <div
          class={cx(
            'line',
            css({
              width: 'full',
              height: '[1.5px]',
              color: 'gray.300',
            }),
          )}
        ></div>
      </div>

      <div
        class={center({
          position: 'relative',
          gap: '8px',
          borderWidth: '1px',
          borderColor: 'gray.200',
          marginRight: '20px',
          padding: '8px',
          width: 'fit',
          color: 'gray.600',
          backgroundColor: 'gray.0',
          boxShadow: '[0 2px 10px 0 {colors.gray.900/4}]',
        })}
      >
        <div class={css({ paddingX: '6px', paddingY: '4px', fontSize: '14px', fontWeight: 'medium' })}>
          이 지점부터 유료 분량이 시작됩니다
        </div>

        <div class={css({ width: '1px', height: '14px', backgroundColor: 'gray.200' })} />

        <div
          class={center({
            paddingX: '6px',
            paddingY: '4px',
            fontSize: '14px',
            fontWeight: 'medium',
            color: 'brand.400',
          })}
        >
          {comma(node.attrs.price)}P
        </div>

        {#if $query?.post.purchasedAt}
          <div
            class={css({
              position: 'absolute',
              top: '0',
              right: '0',
              paddingBottom: '4px',
              fontSize: '13px',
              color: 'gray.400',
              translate: 'auto',
              translateY: '-full',
            })}
          >
            {dayjs($query.post.purchasedAt).formatAsDate()} (결제 완료)
          </div>
        {/if}
      </div>
    </div>
  {/if}
</NodeView>

<style>
  .line {
    background: repeating-linear-gradient(to right, transparent 0 4px, currentColor 4px 8px);
  }
</style>
