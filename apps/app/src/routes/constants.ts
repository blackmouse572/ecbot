/**
 * Application route constants
 * Used for consistent route naming throughout the application
 */
export const ROUTES = {
  Accounts: "accounts",
  Activities: "activities",
  Chatbot: "chatbot",
  Comments: "comments",
  Conversations: "conversations",
  Dashboard: "dashboard",
  KnowledgeBase: "knowledge-base",
  Login: "login",
  SignUp: "signup",
  VerifyEmail: "verify-email",
  ForgotPassword: "forgot-password",
  ResetPassword: "reset-password",
  // Public, login-free chatbot preview behind a signed share link.
  SharedPreview: "preview/:token",
  // Loaded inside the iframe that public/widget.js injects on a customer site.
  Widget: "widget/:key",
  Settings: "settings",
  Profile: "profile",
  Preferences: "preferences",
  ChangePassword: "change-password",
  Sessions: "sessions",
  CustomerTags: "customer-tags",
  ClientCredentials: "client-credentials",
  Customers: "customers",
  CustomerSuggestions: "customers/suggestions",
  Workspace: "workspace",
  WorkspaceMember: "members",
  WorkspaceRoles: "roles",
  WorkspaceSetting: "workspace-setting",
  Invitations: "invitations",
  JoinRequests: "join-requests",
  // Generic OAuth popup callback — :platform is cosmetic (facebook, zalo, …);
  // the callback page reads code/error from the query and postMessages back.
  AccountCallback: "auth/:platform/callback",
  Onboard: "onboard",
  OnboardJoin: "join",
  OnboardCreate: "create",
  Group: "group",
  Tools: "tools",
  Skills: "skills",
  Followups: "followups",
  Usage: "usage",
} as const;
