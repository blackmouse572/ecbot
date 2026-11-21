import {
  useLogout,
  useMe,
  USER_BLOCKED_FORBIDDEN_STATUS_CODE,
} from "@/hooks/api";
import {
  PolicyAbilityFactory,
  useAbility,
  type AppAbility,
  type PolicyAbility,
} from "@repo/auth";
import {
  impersonationAtom,
  useEndImpersonation,
} from "@/modules/impersonation";
import { usePrompt } from "@medusajs/ui";
import { useAtom, useAtomValue } from "jotai/react";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { loginRedirectPath } from "./login-redirect";
import { pickAuthToken } from "./pick-auth-token";
import { setAuthSessionHandlers } from "./response-interceptor";
import { tokenAtom } from "./state";

export const useAuthToken = () => {
  const impersonation = useAtomValue(impersonationAtom);
  const token = useAtomValue(tokenAtom);
  return pickAuthToken(impersonation, token);
};
export const useAuth = () => {
  return useAtom(tokenAtom);
};

// Gives the boot-time 401 interceptor (response-interceptor.ts) the React
// side of an expired session: the banned prompt, a full logout, and ending
// an impersonation. Until this mounts, the interceptor falls back to clearing
// the token and a hard redirect to /login.
export const useRefreshTokenEffect = () => {
  const logout = useLogout();
  const location = useLocation();
  const prompt = usePrompt();
  const { t } = useTranslation();
  const endImpersonation = useEndImpersonation();
  // The handlers are installed once, so they read these through refs: the
  // redirect goes back to the current page, not the first one.
  const latest = useRef({ logout, location, prompt, t, endImpersonation });
  latest.current = { logout, location, prompt, t, endImpersonation };

  useEffect(() => {
    setAuthSessionHandlers({
      onImpersonationExpired: () => {
        void latest.current.endImpersonation();
      },
      onSessionExpired: async (refreshErrorStatusCode) => {
        const { logout, location, prompt, t } = latest.current;
        if (refreshErrorStatusCode === USER_BLOCKED_FORBIDDEN_STATUS_CODE) {
          await prompt({
            title: t("app.auth.login.errors.banned.title"),
            description: t("app.auth.login.errors.banned.description"),
            confirmText: t("app.auth.login.actions.ok"),
            cancelText: t("actions.cancel"),
          });
        }
        // logout() clears the token and queries, then navigates to its own
        // `{ to }` once the server round-trip resolves; a separate navigate
        // fired right after would be clobbered by that trailing one.
        await logout({ to: loginRedirectPath(location) });
      },
    });
    return () => setAuthSessionHandlers(null);
  }, []);
};

export const useUserAbility = (): AppAbility => {
  const { user } = useMe();
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();

  return useMemo(() => {
    if (!user) {
      return PolicyAbilityFactory.createForUser([], "USER");
    }

    // Owner-ness must reach the factory: the `isWorkspaceOwner` flag defaults
    // to false, so omitting it silently strips an owner's abilities when
    // their role row is missing or stale. Prefer the explicit `isOwner` flag
    // from the workspace profile endpoint; fall back to route inference — a
    // resolved workspace profile without a membership row can only belong to
    // the owner (the endpoint 404s non-members).
    const hasMembership = "workspaceMember" in user && !!user.workspaceMember;
    const isOwner =
      "isOwner" in user && typeof user.isOwner === "boolean"
        ? user.isOwner
        : workspaceSlug !== undefined && !hasMembership;

    if ("workspaceMember" in user && !!user.workspaceMember) {
      return PolicyAbilityFactory.createForMember(
        user.workspaceMember.role.permissions,
        user.workspaceMember.role.type,
        isOwner,
      );
    } else {
      return PolicyAbilityFactory.createForUser(
        user.role.permissions,
        user.role.type,
        isOwner,
      );
    }
  }, [user, workspaceSlug]);
};

export const useCanAccess = (abilities: PolicyAbility[]) => {
  const ability = useAbility();

  return useMemo(() => {
    if (abilities.length === 0) return true;

    return PolicyAbilityFactory.handlerAbilities(ability, abilities);
  }, [abilities, ability]);
};

export const useWorkspaceAbilities = () => {
  const { user } = useMe();

  const ability = useAbility();

  return useMemo(() => {
    if (!user)
      return {
        isWorkspaceOwner: false,
        isSuperAdmin: false,
        canManageMember: false,
        canManageChatbot: false,
      };
    const isMember = "workspaceMember" in user && !!user.workspaceMember;
    const isSuperAdmin = user.role.type === "SUPER_ADMIN";

    return {
      isWorkspaceOwner: Boolean(!isMember),
      isSuperAdmin,
      canManageMember: ability.can("manage", "MEMBER"),
      canManageChatbot: ability.can("manage", "CHATBOT"),
    };
  }, [ability, user]);
};
