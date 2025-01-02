import 'package:assorted_layout_widgets/assorted_layout_widgets.dart';
import 'package:auto_route/auto_route.dart';
import 'package:flutter/material.dart';
import 'package:gap/gap.dart';
import 'package:glyph/components/btn.dart';
import 'package:glyph/components/horizontal_divider.dart';
import 'package:glyph/context/bottom_sheet.dart';
import 'package:glyph/extensions/int.dart';
import 'package:glyph/ferry/widget.dart';
import 'package:glyph/graphql/__generated__/prosemirror_widget_access_barrier_purchase_post_mutation.req.gql.dart';
import 'package:glyph/graphql/__generated__/prosemirror_widget_access_barrier_query.req.gql.dart';
import 'package:glyph/icons/tabler.dart';
import 'package:glyph/prosemirror/schema.dart';
import 'package:glyph/themes/colors.dart';
import 'package:jiffy/jiffy.dart';

class ProseMirrorWidgetAccessBarrier extends StatefulWidget {
  const ProseMirrorWidgetAccessBarrier({
    super.key,
  });

  factory ProseMirrorWidgetAccessBarrier.node(ProseMirrorNode _) {
    return const ProseMirrorWidgetAccessBarrier();
  }

  @override
  createState() => _ProseMirrorWidgetAccessBarrierState();
}

class _ProseMirrorWidgetAccessBarrierState extends State<ProseMirrorWidgetAccessBarrier>
    with AutomaticKeepAliveClientMixin {
  @override
  Widget build(BuildContext context) {
    super.build(context);

    final parentData = ProseMirrorWidgetAccessBarrierData.of(context);

    return GraphQLOperation(
      operation: GProseMirrorWidgetAccessBarrier_QueryReq(
        (b) => b
          ..vars.permalink = parentData.permalink
          ..vars.revisionId = parentData.revisionId,
      ),
      builder: (context, client, data) {
        return Column(
          children: [
            const Gap(24),
            Row(
              children: [
                const Expanded(child: HorizontalDivider(color: BrandColors.gray_200)),
                const Gap(16),
                Column(
                  children: [
                    if (data.post.purchasedAt != null) ...[
                      Text(
                        '${Jiffy.parse(data.post.purchasedAt!.value, isUtc: true).format(pattern: 'yyyy.MM.dd')} 결제완료 (${data.post.revision.price!.comma}P)',
                        style: const TextStyle(
                          fontSize: 13,
                          color: BrandColors.gray_400,
                        ),
                      ),
                      const Gap(3),
                    ] else if (data.post.space!.meAsMember != null) ...[
                      Text(
                        '${data.post.revision.price!.comma}P',
                        style: const TextStyle(
                          fontSize: 13,
                          color: BrandColors.gray_400,
                        ),
                      ),
                      const Gap(3),
                    ],
                    const Text(
                      '이 지점부터 유료분량이 시작됩니다',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: BrandColors.gray_500,
                      ),
                    ),
                  ],
                ),
                const Gap(16),
                const Expanded(child: HorizontalDivider(color: BrandColors.gray_200)),
              ],
            ),
            const Gap(24),
            if (data.post.purchasedAt == null && data.post.space!.meAsMember == null)
              Container(
                width: double.infinity,
                margin: const Pad(horizontal: 20),
                padding: const Pad(all: 20),
                decoration: BoxDecoration(
                  border: Border.all(color: BrandColors.gray_200),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${data.post.revision.price!.comma}P',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const Gap(6),
                    Row(
                      children: [
                        const Icon(
                          Tabler.text_recognition,
                          size: 18,
                          color: BrandColors.gray_500,
                        ),
                        const Gap(2),
                        Text(
                          '${data.post.revision.paidContent!.characters.comma}자',
                          style: const TextStyle(fontSize: 13, color: BrandColors.gray_500),
                        ),
                        const Gap(8),
                        const Icon(
                          Tabler.photo,
                          size: 18,
                          color: BrandColors.gray_500,
                        ),
                        const Gap(2),
                        Text(
                          '${data.post.revision.paidContent!.images.comma}장',
                          style: const TextStyle(fontSize: 13, color: BrandColors.gray_500),
                        ),
                        const Gap(8),
                        const Icon(
                          Tabler.folder,
                          size: 18,
                          color: BrandColors.gray_500,
                        ),
                        const Gap(2),
                        Text(
                          '${data.post.revision.paidContent!.files.comma}개',
                          style: const TextStyle(fontSize: 13, color: BrandColors.gray_500),
                        ),
                      ],
                    ),
                    const Gap(18),
                    Btn(
                      '구매하기',
                      onPressed: () async {
                        await context.showBottomSheet(
                          title: '포스트 구매',
                          builder: (context) {
                            final purchasable = data.me!.point >= data.post.revision.price!;

                            return Padding(
                              padding: const Pad(horizontal: 20),
                              child: Column(
                                children: [
                                  Padding(
                                    padding: const Pad(vertical: 20),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.stretch,
                                      children: [
                                        Row(
                                          children: [
                                            const Icon(Tabler.notes, size: 16),
                                            const Gap(3),
                                            Expanded(
                                              child: Text(
                                                data.post.revision.title ?? '(제목 없음)',
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(
                                                  color: BrandColors.gray_500,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const Gap(4),
                                        Text(
                                          '${data.post.revision.price!.comma}P',
                                          style: const TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const HorizontalDivider(),
                                  const Gap(8),
                                  Padding(
                                    padding: const Pad(vertical: 12),
                                    child: Row(
                                      children: [
                                        const Text(
                                          '보유 포인트',
                                          style: TextStyle(
                                            fontWeight: FontWeight.w600,
                                            color: BrandColors.gray_900,
                                          ),
                                        ),
                                        const Spacer(),
                                        Text(
                                          '${data.me!.point.comma}P',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w800,
                                            color: BrandColors.gray_400,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Padding(
                                    padding: const Pad(vertical: 12),
                                    child: Row(
                                      children: [
                                        const Text(
                                          '사용할 포인트',
                                          style: TextStyle(
                                            fontWeight: FontWeight.w600,
                                            color: BrandColors.gray_900,
                                          ),
                                        ),
                                        const Spacer(),
                                        Text(
                                          '${data.post.revision.price!.comma}P',
                                          style: TextStyle(
                                            fontWeight: FontWeight.w800,
                                            color: (purchasable ? BrandColors.brand_400 : BrandColors.gray_400),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (purchasable) ...[
                                    const Gap(24),
                                    Btn(
                                      '구매하기',
                                      theme: BtnTheme.accent,
                                      onPressed: () async {
                                        final req = GProseMirrorWidgetAccessBarrier_PurchasePost_MutationReq(
                                          (b) => b
                                            ..vars.input.postId = data.post.id
                                            ..vars.input.revisionId = parentData.revisionId,
                                        );
                                        await client.request(req);

                                        if (context.mounted) {
                                          await context.router.maybePop();
                                        }
                                      },
                                    ),
                                  ] else ...[
                                    Padding(
                                      padding: const Pad(vertical: 12),
                                      child: Row(
                                        children: [
                                          const Text(
                                            '필요한 포인트',
                                            style: TextStyle(
                                              fontWeight: FontWeight.w600,
                                              color: BrandColors.brand_400,
                                            ),
                                          ),
                                          const Spacer(),
                                          Text(
                                            '${(data.post.revision.price! - data.me!.point).comma}P',
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w800,
                                              color: BrandColors.brand_400,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const Gap(8),
                                    const DecoratedBox(
                                      decoration: BoxDecoration(
                                        color: BrandColors.gray_50,
                                        borderRadius: BorderRadius.all(
                                          Radius.circular(4),
                                        ),
                                      ),
                                      child: Padding(
                                        padding: Pad(all: 10),
                                        child: Row(
                                          children: [
                                            Icon(
                                              Tabler.coin_filled,
                                              size: 16,
                                              color: Color(0xFFFCC04B),
                                            ),
                                            Gap(4),
                                            Text(
                                              '해당 포스트를 구매하려면 포인트가 필요해요',
                                              style: TextStyle(
                                                color: BrandColors.gray_800,
                                                fontSize: 12,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ],
                ),
              ),
          ],
        );
      },
    );
  }

  @override
  bool get wantKeepAlive => true;
}

class ProseMirrorWidgetAccessBarrierData extends InheritedWidget {
  const ProseMirrorWidgetAccessBarrierData({
    required this.permalink,
    required this.revisionId,
    required super.child,
    super.key,
  });

  factory ProseMirrorWidgetAccessBarrierData.of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<ProseMirrorWidgetAccessBarrierData>()!;
  }

  final String permalink;
  final String revisionId;

  @override
  bool updateShouldNotify(ProseMirrorWidgetAccessBarrierData oldWidget) {
    return permalink != oldWidget.permalink || revisionId != oldWidget.revisionId;
  }
}
