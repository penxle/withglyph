import 'dart:io';
import 'dart:ui';

import 'package:assorted_layout_widgets/assorted_layout_widgets.dart';
import 'package:auto_route/auto_route.dart';
import 'package:built_value/json_object.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_form_builder/flutter_form_builder.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:form_builder_validators/form_builder_validators.dart';
import 'package:gap/gap.dart';
import 'package:get_it/get_it.dart';
import 'package:glyph/components/btn.dart';
import 'package:glyph/components/forms/form_text_field.dart';
import 'package:glyph/components/heading.dart';
import 'package:glyph/components/horizontal_divider.dart';
import 'package:glyph/components/img.dart';
import 'package:glyph/components/pressable.dart';
import 'package:glyph/components/rectangle_chip.dart';
import 'package:glyph/components/svg_image.dart';
import 'package:glyph/const.dart';
import 'package:glyph/context/modal.dart';
import 'package:glyph/context/toast.dart';
import 'package:glyph/extensions/build_context.dart';
import 'package:glyph/extensions/int.dart';
import 'package:glyph/ferry/error.dart';
import 'package:glyph/ferry/widget.dart';
import 'package:glyph/graphql/__generated__/me_screen_create_space_mutation.req.gql.dart';
import 'package:glyph/graphql/__generated__/me_screen_finalize_image_upload_mutation.req.gql.dart';
import 'package:glyph/graphql/__generated__/me_screen_prepare_image_upload_mutation.req.gql.dart';
import 'package:glyph/graphql/__generated__/me_screen_query.req.gql.dart';
import 'package:glyph/icons/tabler.dart';
import 'package:glyph/icons/tabler_bold.dart';
import 'package:glyph/routers/app.gr.dart';
import 'package:glyph/shells/default.dart';
import 'package:glyph/themes/colors.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:mixpanel_flutter/mixpanel_flutter.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:transparent_image/transparent_image.dart';
import 'package:url_launcher/url_launcher.dart';

@RoutePage()
class MeScreen extends ConsumerStatefulWidget {
  const MeScreen({super.key});

  @override
  ConsumerState<ConsumerStatefulWidget> createState() => _MeScreenState();
}

class _MeScreenState extends ConsumerState<MeScreen> {
  @override
  Widget build(BuildContext context) {
    return GraphQLOperation(
      operation: GMeScreen_QueryReq(),
      builder: (context, client, data) {
        return DefaultShell(
          appBar: Heading.empty(backgroundColor: BrandColors.gray_0),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(
              parent: BouncingScrollPhysics(),
            ),
            child: Column(
              children: [
                Padding(
                  padding: const Pad(horizontal: 20, vertical: 28),
                  child: Pressable(
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 27,
                          child: ClipOval(
                            child: Img(
                              data.me!.profile.avatar,
                              width: 54,
                              height: 54,
                            ),
                          ),
                        ),
                        const Gap(14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      data.me!.profile.name,
                                      maxLines: 3,
                                      style: const TextStyle(
                                        fontSize: 22,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                                  const Gap(6),
                                  const Icon(
                                    TablerBold.chevron_right,
                                    size: 16,
                                  ),
                                ],
                              ),
                              Text(
                                data.me!.email,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: BrandColors.gray_500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    onPressed: () async {
                      await context.router.push(const ProfileRoute());
                    },
                  ),
                ),
                const HorizontalDivider(height: 6, color: BrandColors.gray_50),
                Padding(
                  padding: const Pad(horizontal: 20, vertical: 18),
                  child: Row(
                    children: [
                      const Icon(Tabler.planet, size: 20),
                      const Gap(8),
                      const Text(
                        '스페이스',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const Spacer(),
                      Pressable(
                        child: const Icon(
                          TablerBold.plus,
                          size: 16,
                          color: BrandColors.gray_800,
                        ),
                        onPressed: () async {
                          await context.showFullScreenModal(
                            title: '스페이스 만들기',
                            builder: (context) {
                              return const _CreateSpace();
                            },
                          );
                        },
                      ),
                    ],
                  ),
                ),
                SizedBox(
                  height: 150,
                  child: data.me!.spaces.isEmpty
                      ? const Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              '아직 스페이스가 없어요',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: BrandColors.gray_400),
                            ),
                            Gap(4),
                            Text(
                              '+ 아이콘을 눌러 스페이스를 만들어보세요',
                              style: TextStyle(fontSize: 13, color: BrandColors.gray_400),
                            ),
                          ],
                        )
                      : ListView.separated(
                          physics: const AlwaysScrollableScrollPhysics(
                            parent: BouncingScrollPhysics(),
                          ),
                          scrollDirection: Axis.horizontal,
                          padding: const Pad(horizontal: 20),
                          clipBehavior: Clip.none,
                          itemCount: data.me!.spaces.length,
                          itemBuilder: (context, index) {
                            final space = data.me!.spaces[index];

                            return Pressable(
                              child: Container(
                                width: 150,
                                decoration: BoxDecoration(
                                  color: BrandColors.gray_0,
                                  borderRadius: BorderRadius.circular(4),
                                  boxShadow: [
                                    BoxShadow(
                                      color: BrandColors.gray_900.withOpacity(0.1),
                                      offset: const Offset(1, 1),
                                      blurRadius: 8,
                                    ),
                                  ],
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: [
                                    Stack(
                                      children: [
                                        Container(
                                          height: 100,
                                          clipBehavior: Clip.antiAlias,
                                          decoration: const BoxDecoration(
                                            color: BrandColors.gray_50,
                                            borderRadius: BorderRadius.vertical(top: Radius.circular(4)),
                                          ),
                                          child: ColorFiltered(
                                            colorFilter: ColorFilter.mode(
                                              BrandColors.gray_900.withOpacity(0.05),
                                              BlendMode.srcATop,
                                            ),
                                            child: ImageFiltered(
                                              imageFilter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
                                              child: Img(space.icon, width: 150, height: 100),
                                            ),
                                          ),
                                        ),
                                        Positioned(
                                          left: 10,
                                          bottom: 12,
                                          child: Stack(
                                            clipBehavior: Clip.none,
                                            children: [
                                              Img(space.icon, width: 32, height: 32, borderWidth: 1),
                                              Positioned(
                                                right: -4,
                                                bottom: -4,
                                                child: Img(
                                                  space.meAsMember!.profile.avatar,
                                                  width: 20,
                                                  height: 20,
                                                  borderWidth: 1,
                                                  borderRadius: 10,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                    Expanded(
                                      child: Padding(
                                        padding: const Pad(horizontal: 10, vertical: 6),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              space.name,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                            ),
                                            Text(
                                              'by ${space.meAsMember!.profile.name}',
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(fontSize: 11, color: BrandColors.gray_500),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              onPressed: () async {
                                await context.router.push(SpaceRoute(slug: space.slug));
                              },
                            );
                          },
                          separatorBuilder: (context, index) => const Gap(12),
                        ),
                ),
                const Gap(20),
                const HorizontalDivider(color: BrandColors.gray_50),
                _Section(
                  children: [
                    _MenuItem(
                      icon: Tabler.clipboard_text,
                      title: '임시저장함',
                      onPressed: () async {
                        await context.router.push(const DraftsRoute());
                      },
                    ),
                  ],
                ),
                const HorizontalDivider(height: 6, color: BrandColors.gray_50),
                _Section(
                  children: [
                    _MenuItem(
                      icon: Tabler.coin,
                      title: '포인트',
                      trailing: Padding(
                        padding: const Pad(right: 6),
                        child: Text(
                          '${data.me!.point.comma}P',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: BrandColors.gray_400,
                          ),
                        ),
                      ),
                      onPressed: () {},
                    ),
                    _MenuItem(
                      icon: Tabler.pig_money,
                      title: '수익/출금',
                      onPressed: () async {
                        await context.router.push(const RevenueRoute());
                      },
                    ),
                    if (Platform.isAndroid)
                      _MenuItem(
                        icon: Tabler.scan,
                        title: '리딤코드',
                        onPressed: () async {
                          await context.router.push(
                            const RedeemRoute(),
                          );
                        },
                      ),
                  ],
                ),
                const HorizontalDivider(height: 6, color: BrandColors.gray_50),
                _Section(
                  children: [
                    _MenuItem(
                      icon: Tabler.star,
                      title: '구독 관리',
                      onPressed: () async {
                        await context.router.push(const SubscribesRoute());
                      },
                    ),
                    _MenuItem(
                      icon: Tabler.filter_cog,
                      title: '뮤트/쿠션 관리',
                      onPressed: () async {
                        await context.router.push(const ContentFiltersRoute());
                      },
                    ),
                  ],
                ),
                const HorizontalDivider(height: 6, color: BrandColors.gray_50),
                _Section(
                  children: [
                    _MenuItem(
                      icon: Tabler.settings,
                      title: '설정',
                      onPressed: () async {
                        await context.router.push(const SettingsRoute());
                      },
                    ),
                    _MenuItem(
                      icon: Tabler.headset,
                      title: '고객센터',
                      onPressed: () async {
                        await launchUrl(
                          Uri.parse('https://penxle.channel.io'),
                          mode: LaunchMode.externalApplication,
                        );
                      },
                    ),
                  ],
                ),
                const Gap(80),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const Pad(horizontal: 20),
      child: Column(
        children: children,
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  const _MenuItem({
    required this.icon,
    required this.title,
    required this.onPressed,
    this.trailing,
  });

  final IconData icon;
  final String title;
  final Widget? trailing;
  final Function() onPressed;

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onPressed: onPressed,
      child: Padding(
        padding: const Pad(vertical: 18),
        child: Row(
          children: [
            Icon(icon, size: 20),
            const Gap(8),
            Text(
              title,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
            const Spacer(),
            if (trailing != null) trailing!,
            const Icon(
              TablerBold.chevron_right,
              size: 16,
              color: BrandColors.gray_800,
            ),
          ],
        ),
      ),
    );
  }
}

class _CreateSpace extends ConsumerStatefulWidget {
  const _CreateSpace();

  @override
  ConsumerState<ConsumerStatefulWidget> createState() => _CreateSpaceState();
}

class _CreateSpaceState extends ConsumerState<_CreateSpace> {
  final _mixpanel = GetIt.I<Mixpanel>();
  final _formKey = GlobalKey<FormBuilderState>();
  final _imagePicker = ImagePicker();

  String? _iconFilename;
  Uint8List? _iconBytes;
  Rect? _iconBounds;

  String? _avatarFilename;
  Uint8List? _avatarBytes;
  Rect? _avatarBounds;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
      child: GraphQLOperation(
        operation: GMeScreen_QueryReq(),
        builder: (context, client, data) {
          return FormBuilder(
            key: _formKey,
            onChanged: () {
              setState(() {});
            },
            child: Column(
              children: [
                Container(
                  padding: const Pad(
                    horizontal: 20,
                    top: 24,
                    bottom: 20,
                  ),
                  child: Column(
                    children: [
                      Center(
                        child: Stack(
                          children: [
                            Pressable(
                              child: Padding(
                                padding: const Pad(all: 1),
                                child: _iconBytes == null
                                    ? Container(
                                        width: 118,
                                        height: 118,
                                        decoration: BoxDecoration(
                                          color: BrandColors.gray_50,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: const Center(
                                          child: FractionallySizedBox(
                                            widthFactor: 1 / 4,
                                            child: SvgImage(
                                              'logos/compact',
                                              color: BrandColors.gray_400,
                                            ),
                                          ),
                                        ),
                                      )
                                    : ClipRRect(
                                        borderRadius: BorderRadius.circular(4),
                                        child: FadeInImage(
                                          width: 118,
                                          height: 118,
                                          placeholder: MemoryImage(kTransparentImage),
                                          image: MemoryImage(_iconBytes!),
                                          fit: BoxFit.cover,
                                          fadeInDuration: const Duration(milliseconds: 150),
                                        ),
                                      ),
                              ),
                              onPressed: () async {
                                if (!await Permission.photos.request().isGranted) {
                                  await openAppSettings();
                                  return;
                                }

                                final file = await _imagePicker.pickImage(
                                  source: ImageSource.gallery,
                                );

                                if (file == null) {
                                  return;
                                }

                                final bytes = await file.readAsBytes();
                                final image = await decodeImageFromList(bytes);
                                final imageSize = Size(image.width.toDouble(), image.height.toDouble());

                                setState(() {
                                  _iconFilename = file.name;
                                  _iconBytes = bytes;
                                  _iconBounds = Rect.fromCenter(
                                    center: imageSize.center(Offset.zero),
                                    width: imageSize.shortestSide,
                                    height: imageSize.shortestSide,
                                  );
                                });
                              },
                            ),
                            Positioned.fill(
                              child: IgnorePointer(
                                child: Center(
                                  child: Container(
                                    width: 32,
                                    height: 32,
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: BrandColors.gray_900.withOpacity(0.4),
                                    ),
                                    child: const Icon(
                                      Tabler.camera,
                                      size: 16,
                                      color: BrandColors.gray_0,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Gap(20),
                      const Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Padding(
                            padding: Pad(top: 2),
                            child: RectangleChip('TIP', theme: RectangleChipTheme.purple),
                          ),
                          Gap(8),
                          Flexible(
                            child: Text(
                              '스페이스는 일종의 채널이에요.\n한 계정으로 여러 스페이스를 관리할 수 있어요. 또한 구독자들은 각 스페이스가 같은 창작자인지 알 수 없어요.',
                              style: TextStyle(
                                fontSize: 12,
                                color: BrandColors.gray_600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const HorizontalDivider(height: 8),
                Container(
                  padding: const Pad(
                    horizontal: 20,
                    vertical: 32,
                  ),
                  child: Column(
                    children: [
                      FormTextField(
                        name: 'name',
                        labelText: '스페이스명',
                        hintText: '스페이스명을 입력해주세요',
                        textInputAction: TextInputAction.done,
                        validators: [
                          FormBuilderValidators.required(errorText: '스페이스명을 입력해주세요'),
                          FormBuilderValidators.maxLength(20, errorText: '스페이스명은 20글자를 넘을 수 없어요'),
                        ],
                      ),
                      const Gap(42),
                      FormTextField(
                        name: 'slug',
                        labelText: '스페이스URL',
                        hintText: 'URL을 입력해주세요',
                        validators: [
                          FormBuilderValidators.required(errorText: 'URL을 입력해주세요'),
                          FormBuilderValidators.maxLength(20, errorText: 'URL은 20글자를 넘을 수 없어요'),
                          FormBuilderValidators.match(
                            RegExp(r'^[\d._a-z]+$'),
                            errorText: '영문 소문자, 숫자, ., _만 사용할 수 있어요',
                          ),
                          (value) {
                            if (value != null) {
                              if (value.startsWith('.') || value.endsWith('.')) {
                                return 'URL은 .로 시작하거나 끝날 수 없어요';
                              }

                              if (value.contains('..')) {
                                return '.은 연속으로 사용할 수 없어요';
                              }

                              if (kUnavailableSpaceSlugs['EXACT']!.contains(value) ||
                                  kUnavailableSpaceSlugs['CONTAIN']!.any((slug) => value.contains(slug))) {
                                return '사용할 수 없는 URL이에요';
                              }
                            }
                            return null;
                          }
                        ],
                      ),
                      const Gap(22),
                      Row(
                        children: [
                          const Icon(
                            Tabler.chevron_down_left,
                            color: BrandColors.gray_300,
                          ),
                          Expanded(
                            child: Container(
                              padding: const Pad(
                                horizontal: 8,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: BrandColors.gray_50,
                                borderRadius: BorderRadius.circular(2),
                              ),
                              child: Text(
                                'URL: withglyph.com/${_formKey.currentState?.instantValue['slug'] ?? ''}',
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: BrandColors.gray_500,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const HorizontalDivider(height: 8),
                Container(
                  padding: const Pad(
                    horizontal: 20,
                    top: 32,
                    bottom: 60,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '스페이스 전용 프로필 설정',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const Gap(40),
                      Center(
                        child: Stack(
                          children: [
                            Pressable(
                              child: CircleAvatar(
                                radius: 50,
                                backgroundColor: BrandColors.gray_100,
                                child: Padding(
                                  padding: const Pad(all: 1),
                                  child: ClipOval(
                                    child: FadeInImage(
                                      width: 98,
                                      height: 98,
                                      placeholder: MemoryImage(kTransparentImage),
                                      image: _avatarBytes == null
                                          ? CachedNetworkImageProvider(data.me!.profile.avatar.url)
                                          : MemoryImage(_avatarBytes!),
                                      fit: BoxFit.cover,
                                      fadeInDuration: const Duration(milliseconds: 150),
                                    ),
                                  ),
                                ),
                              ),
                              onPressed: () async {
                                if (!await Permission.photos.request().isGranted) {
                                  await openAppSettings();
                                  return;
                                }

                                final file = await _imagePicker.pickImage(
                                  source: ImageSource.gallery,
                                );

                                if (file == null) {
                                  return;
                                }

                                final bytes = await file.readAsBytes();
                                final image = await decodeImageFromList(bytes);
                                final imageSize = Size(image.width.toDouble(), image.height.toDouble());

                                setState(() {
                                  _avatarFilename = file.name;
                                  _avatarBytes = bytes;
                                  _avatarBounds = Rect.fromCenter(
                                    center: imageSize.center(Offset.zero),
                                    width: imageSize.shortestSide,
                                    height: imageSize.shortestSide,
                                  );
                                });
                              },
                            ),
                            Positioned.fill(
                              child: IgnorePointer(
                                child: Center(
                                  child: Container(
                                    width: 32,
                                    height: 32,
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: BrandColors.gray_900.withOpacity(0.4),
                                    ),
                                    child: const Icon(
                                      Tabler.camera,
                                      size: 16,
                                      color: BrandColors.gray_0,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Gap(20),
                      FormTextField(
                        name: 'profileName',
                        labelText: '이름',
                        hintText: '이름을 입력해주세요',
                        initialValue: data.me!.profile.name,
                        textInputAction: TextInputAction.done,
                        validators: [
                          FormBuilderValidators.required(errorText: '이름을 입력해주세요'),
                          FormBuilderValidators.maxLength(20, errorText: '이름은 20글자를 넘을 수 없어요'),
                        ],
                      ),
                      const Gap(22),
                      const Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Padding(
                            padding: Pad(top: 2),
                            child: RectangleChip('TIP', theme: RectangleChipTheme.purple),
                          ),
                          Gap(8),
                          Flexible(
                            child: Text(
                              '프로필은 기본 프로필과 스페이스 프로필로 나뉘어요.\n스페이스 프로필을 이용할 경우 다른 이용자들은 각 프로필이 같은 사람인지 알 수 없어요.',
                              style: TextStyle(
                                fontSize: 12,
                                color: BrandColors.gray_600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const Pad(
                    top: 20,
                    horizontal: 20,
                  ),
                  child: Btn(
                    '완료',
                    size: BtnSize.large,
                    enabled: _formKey.currentState?.isValid == true,
                    onPressed: () async {
                      if (!_formKey.currentState!.saveAndValidate()) {
                        return;
                      }

                      final values = _formKey.currentState!.value;

                      String? iconId;
                      var avatarId = data.me!.profile.avatar.id;

                      if (_iconBytes != null) {
                        final req1 = GMeScreen_PrepareImageUpload_MutationReq();
                        final resp1 = await client.request(req1);

                        await http.put(
                          Uri.parse(resp1.prepareImageUpload.presignedUrl),
                          body: _iconBytes,
                        );

                        final req2 = GMeScreen_FinalizeImageUpload_MutationReq(
                          (b) => b
                            ..vars.input.key = resp1.prepareImageUpload.key
                            ..vars.input.name = _iconFilename
                            ..vars.input.bounds = JsonObject({
                              'left': _iconBounds!.left,
                              'top': _iconBounds!.top,
                              'width': _iconBounds!.width,
                              'height': _iconBounds!.height,
                            }),
                        );
                        final resp2 = await client.request(req2);

                        iconId = resp2.finalizeImageUpload.id;
                      }

                      if (_avatarBytes != null) {
                        final req1 = GMeScreen_PrepareImageUpload_MutationReq();
                        final resp1 = await client.request(req1);

                        await http.put(
                          Uri.parse(resp1.prepareImageUpload.presignedUrl),
                          body: _avatarBytes,
                        );

                        final req2 = GMeScreen_FinalizeImageUpload_MutationReq(
                          (b) => b
                            ..vars.input.key = resp1.prepareImageUpload.key
                            ..vars.input.name = _avatarFilename
                            ..vars.input.bounds = JsonObject({
                              'left': _avatarBounds!.left,
                              'top': _avatarBounds!.top,
                              'width': _avatarBounds!.width,
                              'height': _avatarBounds!.height,
                            }),
                        );
                        final resp2 = await client.request(req2);

                        avatarId = resp2.finalizeImageUpload.id;
                      }

                      _mixpanel.track('space:create', properties: {'via': 'me-screen'});

                      try {
                        final req = GMeScreen_CreateSpace_MutationReq(
                          (b) => b
                            ..vars.input.iconId = iconId
                            ..vars.input.isPublic = true
                            ..vars.input.name = values['name']
                            ..vars.input.profileName = values['profileName']
                            ..vars.input.profileAvatarId = avatarId
                            ..vars.input.slug = values['slug'],
                        );

                        final resp = await client.request(req);
                        await client.refetch(GMeScreen_QueryReq());

                        if (context.mounted) {
                          context.toast.show('스페이스가 생성되었어요');
                          await context.popWaitAndPush(SpaceRoute(slug: resp.createSpace.slug));
                        }
                      } on FormValidationError catch (e) {
                        if (context.mounted) {
                          context.toast.show(e.message, type: ToastType.error);
                        }
                      }
                    },
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
