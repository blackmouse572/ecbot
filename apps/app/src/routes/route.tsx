import { AuthLayout } from "@/components/layout/auth-layout/auth-layout";
import { MainLayout } from "@/components/layout/main-layout";
import { SettingsLayout } from "@/components/layout/main-layout/setting-layout";
import { WorkspaceSettingsLayout } from "@/components/layout/main-layout/workspace-setting-layout";
import type {
  AccountGetDetailResponseDto,
  ChatbotGetDetailResponseDto,
  KnowledgeItemResponseDto,
  RoleGetResponseDto,
} from "@repo/client";
import { t } from "i18next";
import { Navigate, type RouteObject, type UIMatch } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/protected-routes";
import { ErrorBoundary } from "../components/error";
import { ROUTES } from "./constants";
import { enterpriseRoutes } from "./enterprise.routes";
import { RootRedirect } from "./root/root-redirect";

const membersBreadcrumb = () => t("app.nav.members.header");
const loadMembersList = () => import("./members/members-list");

const workspaceMemberChildren: RouteObject[] = [
  {
    path: "",
    loader: (params) =>
      loadMembersList().then((res) => res.membersLoader(params)),
    lazy: loadMembersList,
  },
  {
    path: ROUTES.Invitations,
    handle: {
      breadcrumb: () => t("members.invitations.title"),
    },
    ErrorBoundary: ErrorBoundary,
    lazy: () => import("./members/invitations"),
  },
  {
    path: ROUTES.JoinRequests,
    handle: {
      breadcrumb: () => t("members.joinRequests.title"),
    },
    ErrorBoundary: ErrorBoundary,
    lazy: () => import("./members/join-requests"),
  },
  {
    path: ":id",
    ErrorBoundary: ErrorBoundary,
    lazy: async function () {
      const { loader, Breadcrumb, Component } =
        await import("./members/members-details");
      return {
        Component,
        loader,
        handle: {
          breadcrumb: (match: UIMatch<AccountGetDetailResponseDto>) => (
            <Breadcrumb {...match} />
          ),
        },
      };
    },
    children: [
      {
        path: "assign",
        lazy: () => import("./members/members-assign-role"),
      },
    ],
  },
];

function getRouteMaps(): RouteObject[] {
  return [
    {
      path: "/",
      Component: ProtectedRoute,
      children: [
        {
          index: true,
          Component: RootRedirect,
        },
      ],
    },
    {
      Component: ProtectedRoute,
      ErrorBoundary: ErrorBoundary,
      children: [
        {
          path: ":workspaceSlug",
          Component: MainLayout,
          children: [
            {
              path: "",
              element: <Navigate to={ROUTES.Dashboard} replace />,
            },
            {
              path: ROUTES.Dashboard,
              handle: {
                breadcrumb: () => t("app.nav.dashboard.header"),
              },
              lazy: () => import("./dashboard"),
            },
            {
              path: ROUTES.Activities,
              handle: {
                breadcrumb: () => t("app.nav.activity.header"),
              },
              loader: (params) =>
                import("./activity/activity-list/loader").then((res) =>
                  res.activityLoader(params),
                ),
              lazy: () => import("./activity/activity-list"),
            },
            {
              path: ROUTES.Accounts,
              handle: {
                breadcrumb: () => t("app.nav.accounts.header"),
              },
              children: [
                {
                  index: true,
                  loader: (params) =>
                    import("./accounts/accounts-list").then((res) =>
                      res.accountLoader(params),
                    ),
                  lazy: () => import("./accounts/accounts-list"),
                },
                {
                  path: "create",
                  lazy: () => import("./accounts/account-create"),
                },
                {
                  path: "import",
                  lazy: () => import("./accounts/account-imports"),
                },
                {
                  path: ":id",
                  ErrorBoundary: ErrorBoundary,
                  lazy: async function () {
                    const { loader, Breadcrumb, Component } =
                      await import("./accounts/accounts-details");
                    return {
                      Component,
                      loader,
                      handle: {
                        breadcrumb: (
                          match: UIMatch<AccountGetDetailResponseDto>,
                        ) => <Breadcrumb {...match} />,
                      },
                    };
                  },
                  children: [
                    {
                      path: "callback-url/edit",
                      ErrorBoundary: ErrorBoundary,
                      lazy: () =>
                        import("./accounts/account-callback-url-edit"),
                    },
                    {
                      path: "allowed-origins/edit",
                      ErrorBoundary: ErrorBoundary,
                      lazy: () =>
                        import("./accounts/account-allowed-origins-edit"),
                    },
                  ],
                },
              ],
            },
            {
              path: ROUTES.Conversations,
              handle: {
                breadcrumb: () => t("conversations.title"),
              },
              ErrorBoundary: ErrorBoundary,
              lazy: () => import("./conversations/conversations-shell"),
              children: [
                {
                  index: true,
                  lazy: () => import("./conversations/conversation-empty"),
                },
                {
                  path: ":id",
                  ErrorBoundary: ErrorBoundary,
                  lazy: () => import("./conversations/conversation-detail"),
                },
              ],
            },
            {
              path: ROUTES.Chatbot,
              handle: {
                breadcrumb: () => t("chatbot.title"),
              },
              ErrorBoundary: ErrorBoundary,
              children: [
                {
                  path: "",
                  lazy: () => import("./chatbot/chatbot-list"),
                },
                {
                  path: "create",
                  lazy: () => import("./chatbot/chatbot-create"),
                },
                {
                  path: ":id",
                  ErrorBoundary: ErrorBoundary,
                  lazy: async function () {
                    const { loader, Breadcrumb, Component } =
                      await import("./chatbot/chatbot-details");
                    return {
                      Component,
                      loader,
                      handle: {
                        breadcrumb(
                          match: UIMatch<ChatbotGetDetailResponseDto>,
                        ) {
                          return <Breadcrumb {...match} />;
                        },
                      },
                    };
                  },
                },
                {
                  path: ":id/edit",
                  ErrorBoundary: ErrorBoundary,
                  lazy: () => import("./chatbot/chatbot-edit"),
                },
                {
                  path: ":id/clone",
                  ErrorBoundary: ErrorBoundary,
                  lazy: () => import("./chatbot/chatbot-clone"),
                },
              ],
            },
            {
              path: ROUTES.Followups,
              handle: {
                breadcrumb: () => t("followups.title"),
              },
              ErrorBoundary: ErrorBoundary,
              loader: (params) =>
                import("./followups/followups-list/loader").then((res) =>
                  res.followupsLoader(params),
                ),
              lazy: () => import("./followups/followups-list"),
            },
            {
              path: ROUTES.KnowledgeBase,
              handle: {
                breadcrumb: () => t("knowledgeBase.title"),
              },
              ErrorBoundary: ErrorBoundary,
              children: [
                {
                  path: "",
                  lazy: () => import("./knowledge-base/knowledge-base-list"),
                  loader: async (args) => {
                    const { knowledgeBaseListLoader } =
                      await import("./knowledge-base/knowledge-base-list/loader");
                    return knowledgeBaseListLoader(args);
                  },
                },
                {
                  path: ":knowledgeBaseId/item/create",
                  ErrorBoundary: ErrorBoundary,
                  lazy: () => import("./knowledge-base/knowledge-item-create"),
                },
                {
                  path: ":knowledgeBaseId/item/:id",
                  ErrorBoundary: ErrorBoundary,
                  lazy: async function () {
                    const { Breadcrumb, loader, Component } =
                      await import("./knowledge-base/knowledge-item-details");
                    return {
                      Component,
                      loader,
                      handle: {
                        breadcrumb: (
                          match: UIMatch<KnowledgeItemResponseDto>,
                        ) => <Breadcrumb {...match} />,
                      },
                    };
                  },
                  children: [
                    {
                      path: "edit",
                      ErrorBoundary: ErrorBoundary,
                      lazy: () =>
                        import("./knowledge-base/knowledge-item-edit"),
                    },
                  ],
                },
              ],
            },
            {
              path: ROUTES.Tools,
              handle: {
                breadcrumb: () => t("tools.title"),
              },
              ErrorBoundary: ErrorBoundary,
              children: [
                {
                  index: true,
                  lazy: () => import("./tools/tools-list"),
                },
                {
                  path: "new",
                  ErrorBoundary: ErrorBoundary,
                  lazy: () => import("./tools/tool-new"),
                },
                {
                  path: "new/http",
                  ErrorBoundary: ErrorBoundary,
                  lazy: () => import("./tools/tool-new-http"),
                },
                {
                  path: "new/mcp",
                  ErrorBoundary: ErrorBoundary,
                  lazy: () => import("./tools/tool-new-mcp"),
                },
                {
                  path: "marketplace",
                  ErrorBoundary: ErrorBoundary,
                  handle: {
                    breadcrumb: () => t("tools.marketplace.title"),
                  },
                  children: [
                    {
                      index: true,
                      lazy: () => import("./tools/marketplace"),
                    },
                    {
                      path: "callback",
                      ErrorBoundary: ErrorBoundary,
                      lazy: () => import("./tools/marketplace-callback"),
                    },
                    {
                      path: ":slug",
                      ErrorBoundary: ErrorBoundary,
                      lazy: async function () {
                        const { loader, Breadcrumb, Component } =
                          await import("./tools/marketplace-install");
                        return {
                          Component,
                          loader,
                          handle: {
                            breadcrumb: (match: UIMatch) => (
                              <Breadcrumb {...match} />
                            ),
                          },
                        };
                      },
                    },
                  ],
                },
                {
                  path: ":toolId",
                  ErrorBoundary: ErrorBoundary,
                  lazy: async function () {
                    const { loader, Breadcrumb, Component } =
                      await import("./tools/tool-detail");
                    return {
                      Component,
                      loader,
                      handle: {
                        breadcrumb: (match: UIMatch) => (
                          <Breadcrumb {...match} />
                        ),
                      },
                    };
                  },
                  children: [
                    {
                      path: "edit",
                      ErrorBoundary: ErrorBoundary,
                      lazy: () => import("./tools/tool-edit"),
                    },
                  ],
                },
              ],
            },
            {
              path: ROUTES.Skills,
              handle: {
                breadcrumb: () => t("skills.title"),
              },
              ErrorBoundary: ErrorBoundary,
              children: [
                {
                  index: true,
                  lazy: () => import("./skills/skills-list"),
                },
                {
                  path: "create",
                  ErrorBoundary: ErrorBoundary,
                  lazy: () => import("./skills/skill-create"),
                },
                {
                  path: "browse",
                  ErrorBoundary: ErrorBoundary,
                  lazy: () => import("./skills/skill-browse"),
                },
                {
                  path: ":skillId",
                  ErrorBoundary: ErrorBoundary,
                  lazy: async function () {
                    const { loader, Breadcrumb, Component } =
                      await import("./skills/skill-detail");
                    return {
                      Component,
                      loader,
                      handle: {
                        breadcrumb: (match: UIMatch) => (
                          <Breadcrumb {...match} />
                        ),
                      },
                    };
                  },
                  children: [
                    {
                      path: "edit",
                      ErrorBoundary: ErrorBoundary,
                      lazy: () => import("./skills/skill-edit"),
                    },
                    {
                      path: "copy",
                      ErrorBoundary: ErrorBoundary,
                      lazy: () => import("./skills/skill-copy"),
                    },
                  ],
                },
              ],
            },
            {
              path: ROUTES.CustomerSuggestions,
              handle: {
                breadcrumb: () => t("customers.suggestions.title"),
              },
              ErrorBoundary: ErrorBoundary,
              lazy: () => import("./customers/suggestions"),
            },
            {
              path: ROUTES.CustomerTags,
              handle: {
                breadcrumb: () => t("settings.customerTags.title"),
              },
              ErrorBoundary: ErrorBoundary,
              lazy: () => import("./customers/tags"),
            },
            // Enterprise overlay routes (src/ee/**/routes.tsx) — {} when absent.
            ...enterpriseRoutes(),
          ],
        },
        {
          // Workspace-scoped settings — own sidebar, sibling of the main layout
          path: `:workspaceSlug/${ROUTES.Settings}`,
          Component: WorkspaceSettingsLayout,
          ErrorBoundary: ErrorBoundary,
          children: [
            {
              index: true,
              // Relative on purpose: resolves against :workspaceSlug/settings.
              // Only valid while ROUTES.Workspace stays a leading-slash-less
              // segment — a leading slash would escape to /workspace.
              element: <Navigate to={ROUTES.Workspace} replace />,
            },
            {
              path: ROUTES.Workspace,
              ErrorBoundary: ErrorBoundary,
              lazy: async function () {
                const { loader, Breadcrumb, Component } =
                  await import("./workspace/workspace-details");
                return {
                  Component,
                  loader,
                  handle: {
                    breadcrumb: () => <Breadcrumb />,
                  },
                };
              },
              children: [
                {
                  path: "edit",
                  handle: {
                    breadcrumb: () => t("workspace.edit.title"),
                  },
                  ErrorBoundary: ErrorBoundary,
                  lazy: async function () {
                    const { loader, Breadcrumb, Component } =
                      await import("./workspace/workspace-edit");
                    return {
                      Component,
                      loader,
                      handle: {
                        breadcrumb: () => <Breadcrumb />,
                      },
                    };
                  },
                },
              ],
            },
            {
              path: ROUTES.WorkspaceMember,
              handle: { breadcrumb: membersBreadcrumb },
              children: workspaceMemberChildren,
            },
            {
              path: ROUTES.WorkspaceRoles,
              handle: {
                breadcrumb: () => t("app.nav.roles.header"),
              },
              children: [
                {
                  index: true,
                  loader: (params) =>
                    import("./members/role-list").then((res) =>
                      res.roleListLoader(params),
                    ),
                  lazy: () => import("./members/role-list"),
                },
                {
                  path: "create",
                  lazy: () => import("./members/role-create"),
                },
                {
                  path: ":id",
                  ErrorBoundary: ErrorBoundary,
                  lazy: async function () {
                    const { loader, Breadcrumb, Component } =
                      await import("./members/role-detail");
                    return {
                      Component,
                      loader,
                      handle: {
                        breadcrumb: (match: UIMatch<RoleGetResponseDto>) => (
                          <Breadcrumb {...match} />
                        ),
                      },
                    };
                  },
                },
              ],
            },
            {
              path: ROUTES.ClientCredentials,
              handle: {
                breadcrumb: () => t("settings.clientCredentials.title"),
              },
              ErrorBoundary: ErrorBoundary,
              lazy: () => import("./settings/client-credentials"),
            },
          ],
        },
      ],
    },
    {
      // Settings routes - not nested under workspace slug
      Component: ProtectedRoute,
      ErrorBoundary: ErrorBoundary,
      children: [
        {
          path: ROUTES.Settings,
          handle: {
            breadcrumb: () => t("app.nav.settings.header"),
          },
          ErrorBoundary: ErrorBoundary,
          Component: SettingsLayout,
          children: [
            {
              path: ROUTES.Profile,
              handle: {
                breadcrumb: () => t("app.nav.settings.myAccount"),
              },
              children: [
                {
                  index: true,
                  lazy: () => import("./profile/profile-detail"),
                },
              ],
            },
            {
              path: ROUTES.Preferences,
              handle: {
                breadcrumb: () => t("app.nav.settings.preferences"),
              },
              lazy: () => import("./profile/preferences"),
            },
            {
              path: ROUTES.ChangePassword,
              handle: {
                breadcrumb: () => t("app.nav.settings.changePassword"),
              },
              lazy: () => import("./profile/change-password"),
            },
            {
              path: ROUTES.Sessions,
              handle: {
                breadcrumb: () => t("app.nav.settings.sessions"),
              },
              lazy: () => import("./profile/sessions"),
            },
          ],
        },
      ],
    },
    {
      // OAuth popup callback — opened in a fresh window/tab that doesn't
      // share the in-memory access token with the opener, so it must not
      // sit behind ProtectedRoute. It only reads code/error from the query
      // and postMessages back to window.opener (see account-callback.tsx).
      path: ROUTES.AccountCallback,
      lazy: () => import("./accounts/account-callback"),
    },
    // Onboard routes
    {
      Component: ProtectedRoute,
      children: [
        {
          path: ROUTES.Onboard,
          children: [
            {
              index: true,
              lazy: () => import("./onboard/onboard-select"),
            },
            {
              path: ROUTES.OnboardJoin,
              lazy: () => import("./onboard/onboard-join"),
            },
            {
              path: ROUTES.OnboardCreate,
              lazy: () => import("./onboard/onboard-create"),
            },
          ],
        },
        {
          path: ROUTES.OnboardJoin,
          children: [
            {
              index: true,
              lazy: () => import("./join"),
            },
          ],
        },
      ],
    },
    {
      Component: AuthLayout,
      children: [
        {
          path: ROUTES.Login,
          lazy: () => import("./auth/login"),
        },
        { path: ROUTES.SignUp, lazy: () => import("./auth/signup") },
        {
          path: ROUTES.VerifyEmail,
          lazy: () => import("./auth/verify-email"),
        },
        {
          path: ROUTES.ForgotPassword,
          lazy: () => import("./auth/forgot-password"),
        },
        {
          path: ROUTES.ResetPassword,
          lazy: () => import("./auth/reset-password"),
        },
      ],
    },
    // Outside ProtectedRoute (no session) and outside AuthLayout (which
    // redirects signed-in users away — an operator must be able to open the
    // link they just shared).
    {
      path: ROUTES.SharedPreview,
      ErrorBoundary: ErrorBoundary,
      lazy: () => import("./preview"),
    },
    // Also outside ProtectedRoute: the visitor is anonymous and this renders
    // inside an iframe on the customer's own site.
    {
      path: ROUTES.Widget,
      ErrorBoundary: ErrorBoundary,
      lazy: () => import("./widget"),
    },
    {
      path: "*",
      lazy: () => import("./not-found"),
    },
  ];
}

// Export only the route map function for Fast Refresh compatibility
export { getRouteMaps };
