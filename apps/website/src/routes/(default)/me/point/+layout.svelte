<script lang="ts">
  import { graphql } from '$glitch';
  import { TabHead, TabHeadItem } from '$lib/components/tab';
  import { comma } from '$lib/utils';
  import { css } from '$styled-system/css';
  import { flex } from '$styled-system/patterns';

  $: query = graphql(`
    query PointHistoryLayout_Query {
      auth(scope: USER)

      me @_required {
        id
        point
        freePoint: point(kind: FREE)
        paidPoint: point(kind: PAID)
      }
    }
  `);
</script>

<h1 class={css({ marginBottom: '12px', fontSize: '24px', fontWeight: 'bold', hideBelow: 'sm' })}>포인트</h1>

<div class={css({ smDown: { paddingTop: '20px', backgroundColor: 'gray.50' } })}>
  <div
    class={flex({
      flexDirection: 'column',
      justify: 'space-between',
      backgroundColor: 'gray.50',
      width: { base: 'full', sm: 'fit' },
      padding: '20px',
      smDown: { paddingTop: '0' },
    })}
  >
    <div class={flex({ align: 'center', justify: { base: 'space-between', sm: 'flex-start' }, gap: '70px' })}>
      <div>
        <div class={flex({ align: 'center', gap: '4px', fontWeight: 'medium' })}>보유중인 포인트</div>
        <p class={css({ fontSize: { base: '20px', sm: '22px' }, fontWeight: 'bold' })}>
          {comma($query.me.point)}P
        </p>
      </div>
    </div>

    <hr class={css({ border: 'none', marginY: '14px', height: '1px', backgroundColor: 'gray.150' })} />

    <div class={css({ marginBottom: '8px', fontSize: '14px', fontWeight: 'medium', color: 'gray.600' })}>
      <span class={css({ display: 'inline-block', width: '78px' })}>충전한 포인트</span>
      <span>{comma($query.me.paidPoint)}P</span>
    </div>

    <div class={css({ fontSize: '14px', fontWeight: 'medium', color: 'gray.600' })}>
      <span class={css({ display: 'inline-block', width: '78px' })}>무료 포인트</span>
      <span>{comma($query.me.freePoint)}P</span>
    </div>
  </div>
</div>

<div
  class={flex({
    direction: 'column',
    grow: '1',
    marginTop: { base: '34px', sm: '60px' },
    smDown: { paddingX: '20px' },
  })}
>
  <h1 class={css({ fontSize: { base: '18px', sm: '24px' }, fontWeight: { base: 'semibold', sm: 'bold' } })}>
    포인트 사용/충전 내역
  </h1>

  <TabHead style={css.raw({ marginTop: { sm: '20px' }, paddingY: { base: '12px', sm: '0' } })}>
    <TabHeadItem id={1} pathname="/me/point">전체</TabHeadItem>
    <TabHeadItem id={1} pathname="/me/point/usage">사용</TabHeadItem>
    <TabHeadItem id={2} pathname="/me/point/charge">충전</TabHeadItem>
  </TabHead>

  <slot />
</div>
