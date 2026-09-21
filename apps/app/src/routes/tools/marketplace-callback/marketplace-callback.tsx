import { useCompleteInstall } from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { Button, Container, Heading, Text, toast } from "@medusajs/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

const PENDING_RETURN_TO_KEY = "composio-return-to";

type CallbackState =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "success" }
  | { kind: "error"; message: string }
  | { kind: "missing-tool" };

export const MarketplaceCallback = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceSlug } = useWorkspaceParams();
  const [searchParams] = useSearchParams();

  const { completeInstall } = useCompleteInstall(workspaceSlug);

  const [state, setState] = useState<CallbackState>({ kind: "idle" });
  const hasRunRef = useRef(false);

  const code = searchParams.get("code") ?? undefined;
  const connectedAccountId =
    searchParams.get("connectedAccountId") ??
    searchParams.get("connected_account_id") ??
    undefined;
  const querySessionId = searchParams.get("sessionId") ?? undefined;

  const run = useCallback(async () => {
    const sessionId = querySessionId ?? "";

    if (!sessionId) {
      setState({ kind: "missing-tool" });
      return;
    }

    setState({ kind: "pending" });
    try {
      const res = await completeInstall({
        sessionId,
        code,
        connectedAccountId,
      });
      const created = (res?.data as A)?.data as
        { id?: string; status?: string } | undefined;
      const returnTo = sessionStorage.getItem(PENDING_RETURN_TO_KEY);
      sessionStorage.removeItem(PENDING_RETURN_TO_KEY);
      toast.success(t("tools.marketplace.installSuccessToast"));
      setState({ kind: "success" });
      if (returnTo) {
        try {
          const { pathname, search, hash } = new URL(returnTo);
          navigate(pathname + search + hash, { replace: true });
        } catch {
          navigate(returnTo, { replace: true });
        }
      } else if (created?.id) {
        navigate(`/${workspaceSlug}/tools/${created.id}`);
      } else {
        navigate(`/${workspaceSlug}/tools`);
      }
    } catch (error) {
      console.error("Error completing install:", error);
      const message =
        error instanceof Error
          ? error.message
          : t("tools.marketplace.callback.error");
      setState({ kind: "error", message });
      toast.error(t("tools.marketplace.installErrorToast"));
    }
  }, [
    completeInstall,
    code,
    connectedAccountId,
    querySessionId,
    navigate,
    t,
    workspaceSlug,
  ]);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;
    void run();
  }, [run]);

  const handleBack = () => navigate(`/${workspaceSlug}/tools/marketplace`);

  const handleRetry = () => {
    hasRunRef.current = false;
    setState({ kind: "idle" });
    void run();
  };

  return (
    <div className="flex flex-col gap-y-3">
      <Helmet>
        <title>{t("tools.marketplace.title")} - Ecbot</title>
      </Helmet>
      <Container className="p-0">
        <div className="px-6 py-6">
          {state.kind === "idle" || state.kind === "pending" ? (
            <div className="flex flex-col items-center gap-y-2 py-8 text-center">
              <Heading level="h3">
                {t("tools.marketplace.callback.installing")}
              </Heading>
              <Text size="small" className="text-ui-fg-subtle">
                {t("tools.marketplace.callback.installing")}
              </Text>
            </div>
          ) : null}

          {state.kind === "success" ? (
            <div className="flex flex-col items-center gap-y-2 py-8 text-center">
              <Heading level="h3">
                {t("tools.marketplace.callback.success")}
              </Heading>
            </div>
          ) : null}

          {state.kind === "missing-tool" ? (
            <div className="flex flex-col items-center gap-y-3 py-8 text-center">
              <Heading level="h3">
                {t("tools.marketplace.callback.error")}
              </Heading>
              <Text size="small" className="text-ui-fg-subtle max-w-md">
                No pending install found in this browser session.
              </Text>
              <Button type="button" variant="primary" onClick={handleBack}>
                {t("tools.marketplace.callback.backLink")}
              </Button>
            </div>
          ) : null}

          {state.kind === "error" ? (
            <div className="flex flex-col items-center gap-y-3 py-8 text-center">
              <Heading level="h3">
                {t("tools.marketplace.callback.error")}
              </Heading>
              <Text size="small" className="text-ui-fg-subtle max-w-md">
                {state.message}
              </Text>
              <div className="flex items-center gap-x-2">
                <Button type="button" variant="secondary" onClick={handleBack}>
                  {t("tools.marketplace.callback.backLink")}
                </Button>
                <Button type="button" variant="primary" onClick={handleRetry}>
                  {t("actions.tryAgain")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Container>
    </div>
  );
};
