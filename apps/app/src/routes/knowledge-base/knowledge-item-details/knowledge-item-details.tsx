import { useKnowledgeItem } from "@/hooks/api/knowledge-base";
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

  const { item, isLoading, isError, error } = useKnowledgeItem(
    knowledgeBaseId || "",
    id || "",
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
