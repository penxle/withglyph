<script lang="ts">
  import { register } from 'swiper/element/bundle';
  import IconChevronLeft from '~icons/tabler/chevron-left';
  import IconChevronRight from '~icons/tabler/chevron-right';
  import { Icon } from '$lib/components';
  import { isWebView, postFlutterMessage } from '$lib/flutter';
  import { css } from '$styled-system/css';
  import { flex } from '$styled-system/patterns';
  import Image from './Image.svelte';
  import type { SwiperContainer } from 'swiper/element-bundle';
  import type { NodeViewProps } from '$lib/tiptap';

  export let editor: NodeViewProps['editor'] | undefined;
  export let ids: string[];
  export let pages: number;
  export let size: 'full' | 'compact';
  export let viewerOpen = false;

  let swiperEl: SwiperContainer;
  let swiperNextElem: HTMLElement;
  let swiperPrevElem: HTMLElement;
  let swiperPaginationElem: HTMLElement;

  let activeIndex = 0;
  $: totalIndex = ids.length;

  $: swiperParams = {
    navigation: {
      nextEl: swiperNextElem,
      prevEl: swiperPrevElem,
    },
    pagination: {
      el: swiperPaginationElem,
      type: 'fraction',
    },
    slidesPerView: pages,
    slidesPerGroup: pages,
    grabCursor: true,
    spaceBetween: 0,
    zoom: true,
    simulateTouch: true,
    touchRatio: 1,
    touchStartPreventDefault: false,
    passiveListeners: false,

    on: {
      slideChangeTransitionEnd: () => {
        activeIndex = swiperEl.swiper.activeIndex;
      },
      zoomChange: (scale: number) => {
        if (scale > 1) {
          swiperEl.swiper.allowSlideNext = false;
          swiperEl.swiper.allowSlidePrev = false;
        } else {
          swiperEl.swiper.allowSlideNext = true;
          swiperEl.swiper.allowSlidePrev = true;
        }
      },
    },
  };

  register();

  $: if (swiperEl) {
    Object.assign(swiperEl, swiperParams);
    swiperEl.initialize();
    swiperEl.swiper.update();
  }

  let timeout: NodeJS.Timeout;

  const revealElements = () => {
    swiperPrevElem.style.display = 'flex';
    swiperNextElem.style.display = 'flex';
    swiperPaginationElem.style.display = 'flex';
  };

  const hideElements = () => {
    swiperPrevElem.style.display = 'none';
    swiperNextElem.style.display = 'none';
    swiperPaginationElem.style.display = 'none';
  };
</script>

<div
  class={css(
    {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      size: 'full',
    },
    ids.length === 0 && { display: 'none' },
  )}
  role="presentation"
  on:mouseenter={() => {
    revealElements();

    timeout = setTimeout(() => {
      hideElements();
    }, 1500);
  }}
  on:mousemove={() => {
    revealElements();

    clearTimeout(timeout);
    timeout = setTimeout(() => {
      hideElements();
    }, 1500);
  }}
  on:mouseleave={() => {
    hideElements();
    clearTimeout(timeout);
  }}
>
  <div
    bind:this={swiperPaginationElem}
    class={css(
      {
        position: 'absolute',
        top: '14px',
        left: '14px',
        display: 'none',
        gap: '1px',
        borderRadius: 'full',
        paddingY: { base: '1px', sm: '3px' },
        paddingX: { base: '8px', sm: '10px' },
        fontSize: { base: '11px', sm: '13px' },
        color: 'gray.0',
        backgroundColor: 'gray.900/30',
        zIndex: '2',
      },
      size === 'full' && { sm: { paddingY: '4px', paddingX: '10px' } },
      ids.length === 0 && { display: 'none' },
    )}
  />

  <button
    bind:this={swiperPrevElem}
    class={css(
      {
        position: 'absolute',
        top: '1/2',
        translate: 'auto',
        translateY: '-1/2',
        left: '14px',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'gray.50',
        backgroundColor: 'gray.800/40',
        size: '24px',
        zIndex: '2',
      },
      size === 'full' && { sm: { size: '34px' } },
      ids.length === 0 && { display: 'none' },
      activeIndex === 0 && { visibility: 'hidden' },
    )}
    type="button"
  >
    <Icon icon={IconChevronLeft} size={20} />
  </button>
  <swiper-container bind:this={swiperEl} class={css({ position: 'relative', size: 'full' })} init="false">
    {#each ids as id (id)}
      <swiper-slide
        role="button"
        tabindex="-1"
        on:click={() => {
          if (!editor?.isEditable) {
            if (isWebView()) {
              postFlutterMessage({ type: 'image:view', id });
            } else {
              viewerOpen = true;
            }
          }
        }}
        on:keypress={null}
      >
        <swiper-zoom-container>
          <Image {id} style={css.raw({ objectFit: 'contain', size: 'full' })} />
        </swiper-zoom-container>
      </swiper-slide>
    {/each}
  </swiper-container>
  <button
    bind:this={swiperNextElem}
    class={css(
      {
        position: 'absolute',
        top: '1/2',
        translate: 'auto',
        translateY: '-1/2',
        right: '14px',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'gray.50',
        backgroundColor: 'gray.800/40',
        size: '24px',
        zIndex: '2',
      },
      size === 'full' && { sm: { size: '34px' } },
      ids.length === 0 && { display: 'none' },
      activeIndex === ids.length - pages && { visibility: 'hidden' },
    )}
    type="button"
  >
    <Icon icon={IconChevronRight} size={20} />
  </button>

  <div
    class={flex({
      align: 'center',
      gap: '6px',
      marginTop: '2px',
      paddingTop: '8px',
      paddingX: '4px',
      paddingBottom: '10px',
    })}
  >
    <!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
    {#each Array.from({ length: Math.ceil(totalIndex / pages) > 5 ? 5 : Math.ceil(totalIndex / pages) }) as _, i (i)}
      {@const index = i * pages}
      {@const minus = Math.floor(totalIndex / pages) > 5 ? 5 : Math.floor(totalIndex / pages)}
      <div
        class={css(
          { size: '6px', backgroundColor: 'gray.300', borderRadius: 'full' },
          ((i < 2 && index === activeIndex) ||
            (i === 2 && activeIndex - index >= 0 && activeIndex - index <= totalIndex - minus) ||
            (i === 3 && activeIndex - index >= 0 && activeIndex - index === totalIndex - minus) ||
            (i === 4 && activeIndex - index >= 0 && activeIndex - index === totalIndex - minus)) && {
            size: '8px',
            backgroundColor: 'gray.800',
          },
        )}
      />
    {/each}
  </div>
</div>

<style>
  swiper-slide {
    height: auto;
  }
</style>
