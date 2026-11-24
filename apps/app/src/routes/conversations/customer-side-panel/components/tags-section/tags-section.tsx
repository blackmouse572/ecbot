import {
  useApplyCustomerTag,
  useCustomerTagAssignments,
  useRemoveCustomerTag,
  type CustomerTagAssignmentGetResponseDto,
} from "@/hooks/api/customer-tag-assignments";
import {
  useCustomerTagList,
  type CustomerTagGetResponseDto,
} from "@/hooks/api/customer-tags";
import { XMarkMini } from "@medusajs/icons";
import { Badge, Text } from "@medusajs/ui";
import { NoRecords } from "@repo/ui/common-components";
import { IconTag } from "@tabler/icons-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CustomerTagPicker } from "../customer-tag-picker";

export function TagsSection({ customerId }: { customerId: string }) {
  const { t } = useTranslation();
  const { assignments, isError } = useCustomerTagAssignments(customerId);
  const { tags: catalog } = useCustomerTagList();
  const apply = useApplyCustomerTag(customerId);
  const remove = useRemoveCustomerTag(customerId);

  const appliedTagIds = useMemo(
    () =>
      new Set(assignments.map((a) => a.tag?.id).filter(Boolean) as string[]),
    [assignments],
  );

  const isBusy = apply.isPending || remove.isPending;

  return (
    <div className="flex flex-col gap-y-2">
      {isError ? (
        <Text size="small" className="text-ui-fg-error">
          {t("general.loadFailed")}
        </Text>
      ) : assignments.length === 0 ? (
        <NoRecords
          size="small"
          title={t("conversations.customer.panel.tags.empty")}
          message={t("conversations.customer.panel.tags.emptyHint")}
          icon={<IconTag />}
        />
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {assignments.map((assignment) => (
            <TagChip
              key={assignment.id}
              assignment={assignment}
              onRemove={() => {
                if (!assignment.tag?.id) return;
                remove.mutate(assignment.tag.id);
              }}
              disabled={isBusy}
            />
          ))}
        </ul>
      )}

      <div>
        <CustomerTagPicker
          tags={catalog}
          appliedTagIds={appliedTagIds}
          onApply={(tagId) => apply.mutate(tagId)}
          onRemove={(tagId) => remove.mutate(tagId)}
          disabled={isBusy}
        />
      </div>
    </div>
  );
}

function TagLabel({ tag }: { tag: CustomerTagGetResponseDto }) {
  return (
    <span className="flex items-center gap-x-1.5">
      {tag.emoji ? <span aria-hidden>{tag.emoji}</span> : null}
      <span>{tag.name}</span>
    </span>
  );
}

function TagChip({
  assignment,
  onRemove,
  disabled,
}: {
  assignment: CustomerTagAssignmentGetResponseDto;
  onRemove: () => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const tag = assignment.tag;

  if (!tag) return null;

  return (
    <li>
      <Badge size="small" className="flex items-center gap-x-1">
        <TagLabel tag={tag} />
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={t("conversations.customer.panel.tags.remove")}
          className="text-ui-fg-subtle hover:text-ui-fg-base disabled:opacity-50"
        >
          <XMarkMini />
        </button>
      </Badge>
    </li>
  );
}
