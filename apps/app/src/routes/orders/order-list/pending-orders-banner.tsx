import { useOrders } from "@/hooks/api/orders";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ChatBubble } from "@medusajs/icons";
import { Button, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

const PENDING_CHAT = { status: "PENDING", source: "CHAT" } as const;

/** Frame 14's orange strip: chat orders that wait for staff to confirm them. */
export const PendingOrdersBanner = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const [params, setParams] = useSearchParams();
  const { count } = useOrders(workspaceSlug, { ...PENDING_CHAT, perPage: 1 });

  if (!count) return null;

  const showing =
    params.get("status") === PENDING_CHAT.status &&
    params.get("source") === PENDING_CHAT.source;

  return (
    <div className="bg-ui-tag-orange-bg flex flex-wrap items-center justify-between gap-3 px-6 py-3">
      <Text
        size="small"
        className="text-ui-tag-orange-text flex items-start gap-x-2"
      >
        <ChatBubble className="text-ui-tag-orange-icon mt-0.5 shrink-0" />
        <span>
          <span className="txt-compact-small-plus">
            {t("orders.pending.title", { count })}
          </span>{" "}
          {t("orders.pending.description")}
        </span>
      </Text>
      {!showing && (
        <Button
          size="small"
          variant="secondary"
          type="button"
          onClick={() =>
            setParams((current) => {
              const next = new URLSearchParams(current);
              next.set("status", PENDING_CHAT.status);
              next.set("source", PENDING_CHAT.source);
              next.delete("page");

              return next;
            })
          }
        >
          {t("orders.pending.show")}
        </Button>
      )}
    </div>
  );
};
