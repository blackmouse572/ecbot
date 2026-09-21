import { Combobox } from "@repo/ui/common-components";
import { useKnowledgeTags } from "../../../../hooks/api";
import { useMemo } from "react";

export type KnowledgeItemEditTag = {
  defaultValues: string[];
  onAdd: (value: string) => void;
  knowledgeBaseId: string;
} & React.HTMLAttributes<HTMLDivElement>;
export function KnowledgeItemEditTag(props: KnowledgeItemEditTag) {
  const { defaultValues, onAdd, knowledgeBaseId, ...rest } = props;
  const { tags, isLoading } = useKnowledgeTags(knowledgeBaseId);
  const options = useMemo(() => {
    if (isLoading) return [];
    const filteredTags = tags.filter((tag) => !defaultValues.includes(tag));
    return filteredTags.map((tag) => ({ label: tag, value: tag }));
  }, [defaultValues, isLoading, tags]);

  return (
    <Combobox
      {...rest}
      isFetchingNextPage={isLoading}
      options={options}
      onChange={(v?: string) => {
        if (v) onAdd(v);
      }}
      onCreateOption={() => {
        // no need to create tag in backend, just add to current item
      }}
    />
  );
}
