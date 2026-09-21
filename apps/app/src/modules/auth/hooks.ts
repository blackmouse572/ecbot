import {
  useLogout,
  useMe,
  useRefreshToken,
  USER_BLOCKED_FORBIDDEN_STATUS_CODE,
} from "@/hooks/api";
import {
  PolicyAbilityFactory,
  useAbility,
  type AppAbility,
  type PolicyAbility,
} from "@repo/auth";
import { client, type AuthRefreshResponseDto } from "@repo/client";
import { usePrompt } from "@medusajs/ui";
import { useAtom, useAtomValue } from "jotai/react";
import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { logoutGuard, tokenAtom } from "./state";

// Module-level singletons: ensure only one refresh request is in-flight at a
// time (concurrent 401s wait on this promise instead of each firing their own
// refresh), and let the caller see *why* the last refresh failed.
let pendingRefresh: Promise<AuthRefreshResponseDto | null> | null = null;
let lastRefreshErrorStatusCode: number | null = null;

export const useAuthToken = () => {
  const token = useAtomValue(tokenAtom);
  return token;
};
export const useAuth = () => {
  return useAtom(tokenAtom);
};

export const useRefreshTokenEffect = () => {
  const [_, setToken] = useAuth();
  const logout = useLogout();
  const { mutateAsync: refreshToken } = useRefreshToken();
  const location = useLocation();
  const prompt = usePrompt();
  const { t } = useTranslation();
  const getRefreshToken: () => Promise<AuthRefreshResponseDto | null> =
    async () => {
      try {
        return await refreshToken().then((data) => {
          const res = data.data as unknown as {
            data: AuthRefreshResponseDto;
          } | null;
          if (res) {
            lastRefreshErrorStatusCode = null;
            return res.data;
          }
          // throwOnError is false, so a 403 (e.g. banned user) lands here as
          // `data.error`, not as a thrown error — capture it for the caller.
          lastRefreshErrorStatusCode = (data.error as A)?.statusCode ?? null;
          return null;
        });
      } catch (error) {
        console.error("Failed to refresh token:", error);
        lastRefreshErrorStatusCode =
          (error as A)?.response?.data?.statusCode ?? null;
        return null;
      }
    };

  const interceptResponse = useCallback(async (error: A) => {
    if (!pendingRefresh) {
      pendingRefresh = getRefreshToken().finally(() => {
        pendingRefresh = null;
      });
    }

    const token = await pendingRefresh;
    if (token !== null) {
      setToken(token.accessToken);
      return client.instance.request({
        ...error.config,
        headers: {
          ...error.config.headers,
          Authorization: `Bearer ${token.accessToken}`,
        },
      });
    } else {
      console.error("Token refresh failed, logging out");
      if (lastRefreshErrorStatusCode === USER_BLOCKED_FORBIDDEN_STATUS_CODE) {
        await prompt({
          title: t("app.auth.login.errors.banned.title"),
          description: t("app.auth.login.errors.banned.description"),
          confirmText: t("app.auth.login.actions.ok"),
        });
      }
      // logout() navigates to "/login" itself once its server round-trip
      // resolves — a separate go(...) fired right after it would win the
      // race and then get clobbered by that trailing navigation. Route the
      // redirect through logout's own `{ to }` instead of a second call.
      await logout({ to: `/login?redirect=${location.pathname}` });
      return Promise.reject(error);
    }
  }, []);

  useEffect(() => {
    const intercept = client.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        // logoutGuard: while a logout is in flight, client.clear() causes
        // mounted queries to refetch without an Authorization header — this
        // must not resurrect the session via a silent refresh.
        if (
          error.response?.status === 401 &&
          !error.request?.responseURL?.includes("/shared/auth/refresh") &&
          !logoutGuard.current
        ) {
          // Deduplicate concurrent refresh calls: if a refresh is already
          // in-flight, reuse its promise instead of firing another request.
          return interceptResponse(error);
        }
        return Promise.reject(error);
      },
    );

    return () => {
      client.instance.interceptors.response.eject(intercept);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
