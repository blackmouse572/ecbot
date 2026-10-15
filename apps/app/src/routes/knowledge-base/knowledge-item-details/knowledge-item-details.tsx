import {
  KNOWLEDGE_ITEM_PENDING_STATUSES,
  pollWhileKnowledgeItemPending,
  useKnowledgeItem,
} from "@/hooks/api/knowledge-base";
import { useSoundOnChange } from "@/modules/sound";
import { toast } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { TwoColumnPageSkeleton } from "@repo/ui/common-components";
import { SingleColumnPage, TwoColumnPage } from "@repo/ui/layout";
import {
  KnowledgeGeneralSection,
  KnowledgeContentSection,
  KnowledgeMetadataSection,
} from "./components";

export function KnowledgeItemDetails() {
  const { knowledgeBaseId, id } = useParams<{
    knowledgeBaseId: string;
    id: string;
  }>();

  const { t } = useTranslation();
  const { item, isLoading, isError, error } = useKnowledgeItem(
    knowledgeBaseId || "",
    id || "",
    // Only this page watches processing, so only it polls.
    { refetchInterval: pollWhileKnowledgeItemPending },
  );

  // Processing finished (or failed) while the user is on this page.
  useSoundOnChange(
    item?.status,
    (previous, next) => {
      if (!KNOWLEDGE_ITEM_PENDING_STATUSES.includes(previous)) return null;
      if (next === "COMPLETED") {
        toast.success(t("knowledge_item.processingDone"), {
          position: "top-right",
        });
        return "success";
      }
      if (next === "FAILED") {
        toast.error(t("knowledge_item.processingFailed"), {
          position: "top-right",
          duration: Infinity,
          dismissable: true,
        });
        return "error";
      }
      return null;
    },
    id,
  );

  if (isLoading || !item) {
    return <TwoColumnPageSkeleton mainSections={3} sidebarSections={1} />;
  }

  if (isError) {
    throw error;
  }

  return (
    <TwoColumnPage>
      <SingleColumnPage hasOutlet={false}>
        <KnowledgeGeneralSection item={item} />
        <KnowledgeContentSection item={item} />
      </SingleColumnPage>
      <KnowledgeMetadataSection item={item} />
    </TwoColumnPage>
  );
}
