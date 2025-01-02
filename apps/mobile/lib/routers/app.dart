import 'package:auto_route/auto_route.dart';
import 'package:glyph/routers/app.gr.dart';

@AutoRouterConfig()
class AppRouter extends RootStackRouter {
  @override
  RouteType get defaultRouteType => const RouteType.cupertino();

  @override
  final List<AutoRoute> routes = [
    AutoRoute(
      page: RootRouter.page,
      path: '/',
      initial: true,
      children: [
        CustomRoute(
          page: SplashRoute.page,
          initial: true,
          transitionsBuilder: TransitionsBuilders.fadeIn,
        ),
        CustomRoute(
          page: AuthRouter.page,
          path: '',
          transitionsBuilder: TransitionsBuilders.fadeIn,
          children: [
            AutoRoute(page: LoginRoute.page, initial: true),
            AutoRoute(page: LoginWithEmailRoute.page),
            AutoRoute(page: LoginWithEmailNextRoute.page),
            AutoRoute(page: LoginWithCodeRoute.page),
            AutoRoute(page: LoginWithTokenRoute.page, path: 'api/email'),
          ],
        ),
        CustomRoute(
          page: MainRouter.page,
          path: '',
          transitionsBuilder: TransitionsBuilders.fadeIn,
          children: [
            AutoRoute(
              page: LobbyShell.page,
              initial: true,
              children: [
                AutoRoute(
                  page: FeedRoute.page,
                  children: [
                    AutoRoute(page: FeedRecommendRoute.page),
                    AutoRoute(page: FeedFollowingRoute.page),
                    AutoRoute(page: FeedChallengeRoute.page),
                  ],
                ),
                AutoRoute(page: SearchRoute.page),
                AutoRoute(
                  page: ArchiveRoute.page,
                  children: [
                    AutoRoute(page: ArchiveBookmarksRoute.page),
                    AutoRoute(page: ArchivePurchasesRoute.page),
                    AutoRoute(page: ArchiveRecentsRoute.page),
                    AutoRoute(page: ArchiveEmojisRoute.page),
                    AutoRoute(page: ArchiveCommentsRoute.page),
                  ],
                ),
                AutoRoute(page: MeRoute.page),
              ],
            ),
            AutoRoute(page: ContentFiltersRoute.page),
            AutoRoute(page: DeactivateRoute.page),
            AutoRoute(page: DeveloperRoute.page),
            AutoRoute(page: DraftsRoute.page),
            AutoRoute(page: EditorRoute.page, fullscreenDialog: true),
            AutoRoute(page: EmailRoute.page),
            AutoRoute(page: IdentificationIamportRoute.page),
            AutoRoute(page: IdentificationRoute.page),
            AutoRoute(page: OnboardingCurationRoute.page, fullscreenDialog: true),
            AutoRoute(page: OssLicensesDetailsRoute.page),
            AutoRoute(page: OssLicensesRoute.page),
            AutoRoute(page: ProfileRoute.page),
            AutoRoute(page: RedeemRoute.page),
            AutoRoute(page: SearchResultRoute.page),
            AutoRoute(page: SettingsRoute.page),
            AutoRoute(page: SpaceDashboardRoute.page),
            AutoRoute(page: SubscribesRoute.page),
            AutoRoute(page: WebViewRoute.page),

            // 딥링크 페이지들
            AutoRoute(page: PostShortlinkRoute.page, path: 'api/shortlink/:shortlink'),
            AutoRoute(page: NotificationsRoute.page, path: 'me/notifications'),
            AutoRoute(page: RevenueRoute.page, path: 'me/revenue'),
            AutoRoute(page: TagRoute.page, path: 'tag/:name'),
            AutoRoute(page: SpaceCollectionRoute.page, path: ':space/collections/:id'),
            AutoRoute(page: PostRoute.page, path: ':space/:permalink'),
            AutoRoute(
              page: SpaceRoute.page,
              path: ':slug',
              children: [
                AutoRoute(page: SpaceCollectionsRoute.page),
                AutoRoute(page: SpacePostsRoute.page),
              ],
            ),
          ],
        ),
      ],
    ),
  ];
}
