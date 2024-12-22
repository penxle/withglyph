import 'package:assorted_layout_widgets/assorted_layout_widgets.dart';
import 'package:auto_route/auto_route.dart';
import 'package:flutter/material.dart';
import 'package:flutter/widgets.dart';
import 'package:gap/gap.dart';
import 'package:get_it/get_it.dart';
import 'package:glyph/components/btn.dart';
import 'package:glyph/context/alert.dart';
import 'package:glyph/ferry/error.dart';
import 'package:glyph/ferry/widget.dart';
import 'package:glyph/graphql/__generated__/identification_screen_query.req.gql.dart';
import 'package:glyph/graphql/__generated__/identification_screen_verify_personal_identity_mutation.req.gql.dart';
import 'package:glyph/routers/app.gr.dart';
import 'package:glyph/shells/default.dart';
import 'package:glyph/themes/colors.dart';
import 'package:jiffy/jiffy.dart';
import 'package:mixpanel_flutter/mixpanel_flutter.dart';

@RoutePage()
class IdentificationScreen extends StatelessWidget {
  IdentificationScreen({super.key});

  final _mixpanel = GetIt.I<Mixpanel>();

  @override
  Widget build(BuildContext context) {
    return DefaultShell(
      useSafeArea: true,
      title: '본인인증',
      child: GraphQLOperation(
        operation: GIdentificationScreen_QueryReq(),
        builder: (context, client, data) {
          final identified = data.me?.personalIdentity != null &&
              Jiffy.parse(data.me!.personalIdentity!.expiresAt!.value).isAfter(Jiffy.now());

          return Padding(
            padding: const Pad(horizontal: 20, top: 20, bottom: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  identified ? '본인인증이\n완료되었어요' : '본인인증을\n진행해주세요',
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                ),
                const Gap(8),
                const Text(
                  '- 본인인증은 개인당 1개의 계정에만 가능해요.\n'
                  '- 계정을 분실한 경우, 본인인증을 통해 계정을 찾을 수 있어요.\n'
                  '- 본인인증을 통해 연령제한 콘텐츠를 이용할 수 있어요.\n',
                  style: TextStyle(fontSize: 12, color: BrandColors.gray_500),
                ),
                if (identified) ...[
                  const Gap(24),
                  Container(
                    width: double.infinity,
                    padding: const Pad(horizontal: 16, top: 32, bottom: 28),
                    decoration: BoxDecoration(
                      color: BrandColors.gray_50,
                      borderRadius: BorderRadius.circular(2),
                    ),
                    child: Column(
                      children: [
                        const Text(
                          '이용가능 콘텐츠',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: BrandColors.gray_500,
                          ),
                        ),
                        const Gap(2),
                        Text(
                          data.me!.isAdulthood ? '15세 / 성인' : '15세',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const Gap(20),
                        Text(
                          '유효기간: ${Jiffy.parse(data.me!.personalIdentity!.expiresAt!.value, isUtc: true).format(pattern: 'yyyy.MM.dd')}까지',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: BrandColors.gray_400,
                          ),
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  const Spacer(),
                  Btn(
                    '본인인증하기',
                    size: BtnSize.large,
                    onPressed: () async {
                      final dynamic result = await context.router.push(const IdentificationIamportRoute());
                      if (result == null || result['imp_uid'] == null) {
                        if (context.mounted) {
                          await context.showAlert(title: '본인인증 오류', content: '본인인증에 실패했어요.');
                        }

                        return;
                      }

                      try {
                        _mixpanel.track('user:personal-identity-verification:start');

                        final req = GIdentificationScreen_VerifyPersonalIdentity_MutationReq(
                          (b) => b..vars.input.uid = result['imp_uid'],
                        );
                        await client.request(req);
                      } on IntentionalError catch (e) {
                        if (context.mounted) {
                          await context.showAlert(title: '본인인증 오류', content: e.message);
                        }

                        return;
                      }

                      await client.refetch(GIdentificationScreen_QueryReq());
                    },
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}
