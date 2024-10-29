<script lang="ts">
  import IconDotsVertical from '~icons/tabler/dots-vertical';
  import IconPlus from '~icons/tabler/plus';
  import { Button, Helmet, Icon, Tag } from '$lib/components';
  import { Menu, MenuItem } from '$lib/components/menu';
  import { css } from '$styled-system/css';
  import { flex } from '$styled-system/patterns';

  const templates = [
    { id: 1, title: '템플릿 1', subtitle: '부제목 1', tags: ['1', '2', '3'], description: '템플릿 설명 1' },
    { id: 2, title: '템플릿 2', subtitle: '부제목 2', tags: ['4', '5', '6'], description: '템플릿 설명 2' },
  ];
</script>

<Helmet description="템플릿을 설정해요" title="템플릿" />

<h1 class={css({ marginBottom: '32px', fontSize: '24px', fontWeight: 'bold', hideBelow: 'sm' })}>템플릿</h1>

<div
  class={flex({
    align: 'center',
    justify: 'space-between',
    paddingBottom: '16px',
    smDown: { paddingTop: '20px', paddingX: '20px' },
  })}
>
  <p class={css({ fontSize: '15px', color: 'gray.500' })}>총 {templates.length}개의 템플릿</p>

  <Button style={flex.raw({ align: 'center', gap: '4px' })} size="sm" variant="gray-sub-fill">
    <Icon icon={IconPlus} />
    템플릿 만들기
  </Button>
</div>

<ul class={flex({ direction: 'column', gap: { sm: '8px' } })}>
  {#each templates as template (template.id)}
    <li
      class={css({
        padding: { base: '20px', sm: '16px' },
        smDown: {
          '& + &': { borderTopWidth: '1px', borderColor: 'gray.50' },
        },
        sm: { borderWidth: '1px', borderColor: 'gray.100' },
      })}
    >
      <div class={flex({ align: 'flex-start', justify: 'space-between', gap: { base: '16px', sm: '38px' } })}>
        <div class={flex({ gap: { base: '8px', sm: '12px' }, truncate: true })}>
          <div
            class={css({
              backgroundColor: 'gray.200',
              flex: 'none',
              width: '108px',
              aspectRatio: '16/10',
              objectFit: 'cover',
            })}
          />

          <div class={css({ width: 'full', truncate: true })}>
            <h2 class={css({ fontSize: '15px', fontWeight: 'semibold', truncate: true })}>
              {template?.title ?? '(제목 없음)'}
            </h2>
            <h3
              class={css({ marginBottom: '6px', fontSize: '13px', color: 'gray.600', height: '19px', truncate: true })}
            >
              {template?.subtitle ?? ''}
            </h3>

            <ul class={flex({ align: 'center', gap: '4px', height: '21px', overflowX: 'auto', scrollbar: 'hidden' })}>
              {#each template.tags as tag (tag)}
                <li><Tag as="div" size="sm">{tag}</Tag></li>
              {/each}
            </ul>
          </div>
        </div>

        <Menu>
          <Icon slot="value" style={css.raw({ margin: '3px' })} icon={IconDotsVertical} size={20} />

          <MenuItem>삭제</MenuItem>
        </Menu>
      </div>

      <div class={flex({ align: 'center', gap: '8px', marginTop: { base: '24px', sm: '14px' } })}>
        <Button
          style={css.raw({ marginLeft: 'auto', width: { base: 'full', sm: '68px' } })}
          size="sm"
          variant="gray-outline"
        >
          수정
        </Button>
        <Button
          style={css.raw({ width: { base: 'full', sm: '68px' }, color: 'brand.400!' })}
          size="sm"
          variant="gray-outline"
        >
          사용
        </Button>
      </div>
    </li>
  {:else}
    <li class={css({ marginY: 'auto', paddingY: '60px', fontSize: '14px', color: 'gray.500', textAlign: 'center' })}>
      생성한 템플릿이 없어요
    </li>
  {/each}
</ul>
