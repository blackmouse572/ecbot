import { Container, Heading } from "@medusajs/ui";
import { KnowledgeBaseActions } from "../../knowledge-base-list/components/knowledge-base-list-table";
import type { KnowledgeItemResponseDto } from "@repo/client";

type KnowledgeGeneralSectionProps = {
  item: KnowledgeItemResponseDto;
};

export const KnowledgeGeneralSection = ({
  item,
}: KnowledgeGeneralSectionProps) => {
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex flex-col gap-y-1 ">
          <Heading className="truncate">{item.title}</Heading>
        </div>
        <div>
          <KnowledgeBaseActions
            item={item}
            knowledgeBaseId={item.knowledgeBaseId}
          />
        </div>
      </div>
    </Container>
  );
};
