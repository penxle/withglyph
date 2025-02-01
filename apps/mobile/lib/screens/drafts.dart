import 'package:assorted_layout_widgets/assorted_layout_widgets.dart';
import 'package:auto_route/auto_route.dart';
import 'package:flutter/material.dart';
import 'package:gap/gap.dart';
import 'package:get_it/get_it.dart';
import 'package:glyph/components/btn.dart';
import 'package:glyph/components/empty_state.dart';
import 'package:glyph/components/horizontal_divider.dart';
import 'package:glyph/components/pressable.dart';
import 'package:glyph/context/dialog.dart';
import 'package:glyph/ferry/widget.dart';
import 'package:glyph/graphql/__generated__/drafts_screen_delete_post_mutation.req.gql.dart';
import 'package:glyph/graphql/__generated__/drafts_screen_query.req.gql.dart';
import 'package:glyph/icons/tabler.dart';
import 'package:glyph/icons/tabler_bold.dart';
import 'package:glyph/routers/app.gr.dart';
import 'package:glyph/shells/default.dart';
import 'package:glyph/themes/colors.dart';
import 'package:jiffy/jiffy.dart';
import 'package:mixpanel_flutter/mixpanel_flutter.dart';
import 'package:sliver_tools/sliver_tools.dart';

@RoutePage()
class DraftsScreen extends StatefulWidget {
  const DraftsScreen({super.key});

  @override
  createState() => _DraftsScreenState();
}

class _DraftsScreenState extends State<DraftsScreen> {
  final _mixpanel = GetIt.I<Mixpanel>();

  final selectedPosts = <String>{};

  @override
  Widget build(BuildContext context) {
    return DefaultShell(
      bottomBorder: false,
      useSafeArea: true,
      title: '임시보관함',
      child: GraphQLOperation(
        operation: GDraftsScreen_QueryReq(),
        builder: (context, client, data) {
          final posts = data.me!.posts;
          final selectedAll = selectedPosts.length == posts.length;

          if (posts.isEmpty) {
            return const EmptyState(
              icon: TablerBold.notes_off,
              title: '아직 임시저장한 포스트가 없어요',
              description: '새 포스트를 작성해보세요!',
            );
          }

          return Stack(
            children: [
              CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                slivers: [
                  SliverPadding(
                    padding: const Pad(horizontal: 20, vertical: 16),
                    sliver: MultiSliver(
                      children: [
                        SliverToBoxAdapter(
                          child: Pressable(
                            child: Row(
                              children: [
                                Icon(
                                  Tabler.circle_check_filled,
                                  color: selectedAll ? BrandColors.gray_900 : BrandColors.gray_200,
                                ),
                                const Gap(8),
                                const Text('전체 선택', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                              ],
                            ),
                            onPressed: () {
                              if (selectedAll) {
                                selectedPosts.clear();
                              } else {
                                for (final post in posts) {
                                  selectedPosts.add(post.id);
                                }
                              }

                              setState(() {});
                            },
                          ),
                        ),
                        const SliverGap(8),
                        SliverList.separated(
                          itemCount: posts.length,
                          itemBuilder: (context, index) {
                            final post = posts[index];

                            return Padding(
                              padding: const Pad(vertical: 18),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Pressable(
                                    child: Icon(
                                      Tabler.circle_check_filled,
                                      color:
                                          selectedPosts.contains(post.id) ? BrandColors.gray_900 : BrandColors.gray_200,
                                    ),
                                    onPressed: () {
                                      if (selectedPosts.contains(post.id)) {
                                        selectedPosts.remove(post.id);
                                      } else {
                                        selectedPosts.add(post.id);
                                      }

                                      setState(() {});
                                    },
                                  ),
                                  const Gap(10),
                                  Expanded(
                                    child: Pressable(
                                      child: Row(
                                        children: [
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  Jiffy.parse(post.contentState.updatedAt.value, isUtc: true)
                                                      .format(pattern: 'yyyy.MM.dd HH:mm'),
                                                  style: const TextStyle(
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.w500,
                                                    color: BrandColors.gray_400,
                                                  ),
                                                ),
                                                const Gap(4),
                                                Text(
                                                  post.contentState.title ?? '(제목 없음)',
                                                  overflow: TextOverflow.ellipsis,
                                                  style: const TextStyle(
                                                    fontSize: 15,
                                                    fontWeight: FontWeight.w700,
                                                  ),
                                                ),
                                                Text(
                                                  post.contentState.previewText,
                                                  overflow: TextOverflow.ellipsis,
                                                  style: const TextStyle(
                                                    fontSize: 13,
                                                    fontWeight: FontWeight.w500,
                                                    color: BrandColors.gray_800,
                                                  ),
                                                ),
                                                const Gap(6),
                                                Row(
                                                  children: [
                                                    const Icon(
                                                      Tabler.text_recognition,
                                                      size: 14,
                                                      color: BrandColors.gray_500,
                                                    ),
                                                    const Gap(2),
                                                    Text(
                                                      '${post.contentState.characters}자',
                                                      style: const TextStyle(fontSize: 12, color: BrandColors.gray_500),
                                                    ),
                                                    const Gap(8),
                                                    const Icon(
                                                      Tabler.photo,
                                                      size: 14,
                                                      color: BrandColors.gray_500,
                                                    ),
                                                    const Gap(2),
                                                    Text(
                                                      '${post.contentState.images}장',
                                                      style: const TextStyle(fontSize: 12, color: BrandColors.gray_500),
                                                    ),
                                                    const Gap(8),
                                                    const Icon(
                                                      Tabler.folder,
                                                      size: 14,
                                                      color: BrandColors.gray_500,
                                                    ),
                                                    const Gap(2),
                                                    Text(
                                                      '${post.contentState.files}개',
                                                      style: const TextStyle(fontSize: 12, color: BrandColors.gray_500),
                                                    ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          ),
                                          const Gap(16),
                                          const Icon(Tabler.chevron_right, size: 20, color: BrandColors.gray_500),
                                        ],
                                      ),
                                      onPressed: () async {
                                        await context.router.push(
                                          EditorRoute(permalink: post.permalink),
                                        );
                                      },
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                          separatorBuilder: (context, index) {
                            return const HorizontalDivider(color: BrandColors.gray_50);
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (selectedPosts.isNotEmpty)
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: Box(
                    color: BrandColors.gray_0,
                    padding: const Pad(horizontal: 20, top: 16, bottom: 10),
                    child: SafeArea(
                      top: false,
                      child: Btn(
                        '선택한 포스트 삭제',
                        size: BtnSize.large,
                        onPressed: () async {
                          await context.showDialog(
                            title: '삭제하시겠어요?',
                            content: '삭제된 포스트는 복구되지 않아요',
                            onConfirmed: () async {
                              await Future.wait(
                                selectedPosts.map(
                                  (postId) async {
                                    _mixpanel.track(
                                      'post:delete',
                                      properties: {
                                        'postId': postId,
                                        'via': 'drafts-screen',
                                      },
                                    );

                                    final req = GDraftsScreen_DeletePost_MutationReq(
                                      (b) => b..vars.input.postId = postId,
                                    );
                                    await client.request(req);
                                  },
                                ),
                              );

                              selectedPosts.clear();

                              await client.request(GDraftsScreen_QueryReq());

                              setState(() {});
                            },
                          );
                        },
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
