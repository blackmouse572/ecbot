import { useUpdateKnowledgeItem } from "@/hooks/api/knowledge-base";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, toast } from "@medusajs/ui";
import type { KnowledgeItemResponseDto } from "@repo/client";
import { ChipGroup, Form } from "@repo/ui/common-components";
import { useCallback } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import z from "zod";
import { RouteDrawer, useRouteModal } from "../../../../components/modals";
import { KeyboundForm } from "../../../../components/utils/keybound-form";
import { ROUTES } from "../../../constants";
import { KnowledgeItemEditTag } from "./knowledge-item-edit-tags";

type KnowledgeItemEditFormProps = {
  knowledgeBaseId: string;
  item: KnowledgeItemResponseDto;
};

const KnowledgeItemEditSchema = z.object({
  title: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
});

export type KnowledgeItemEditFormValues = z.infer<
  typeof KnowledgeItemEditSchema
>;

export function KnowledgeItemEditForm({
  knowledgeBaseId,
  item,
}: KnowledgeItemEditFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceSlug } = useWorkspaceParams();
  const { handleSuccess } = useRouteModal();

  const form = useForm({
    resolver: zodResolver(KnowledgeItemEditSchema),
    defaultValues: {
      tags: item.tags,
      title: item.title,
    },
  });
  const { remove, append } = useFieldArray({
    control: form.control,
    // @ts-expect-error - This is a known issue with react-hook-form's useFieldArray and TypeScript
    name: "tags",
  });

  // Update mutation
  const updateMutation = useUpdateKnowledgeItem(
    workspaceSlug!,
    knowledgeBaseId,
    item.id,
  );

  const onClose = useCallback(() => {
    navigate(
      `/${workspaceSlug}/${ROUTES.KnowledgeBase}/${knowledgeBaseId}/item/${item.id}`,
    );
  }, [navigate, workspaceSlug, knowledgeBaseId, item.id]);

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await updateMutation.mutateAsync(data);
      handleSuccess();
      toast.success(t("knowledge_item.edit.success"));
      onClose();
    } catch (error) {
      console.error("Error updating knowledge item:", error);
      toast.error(t("knowledge_item.edit.error"));
    }
  });

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-8 overflow-y-auto">
          <div className="flex flex-col gap-y-4">
            <Form.Field
              control={form.control}
              name="title"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>{t("knowledge_item.title")}</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />

            <Form.Field
              control={form.control}
              name="tags"
              render={({ field }) => {
                const tags = field.value || [];
                return (
                  <Form.Item className="flex flex-col gap-2">
                    <Form.Label>{t("knowledge_item.currentTags")}</Form.Label>
                    <ChipGroup
                      onRemove={(index) => {
                        remove(index);
                      }}
                      onClearAll={() => {
                        remove();
                      }}
                    >
                      {tags.map((tag, index) => (
                        <ChipGroup.Chip key={`${tag}`} index={index}>
                          {tag}
                        </ChipGroup.Chip>
                      ))}
                    </ChipGroup>
                    <Form.Hint>{t("knowledge_item.tagHint")}</Form.Hint>
                  </Form.Item>
                );
              }}
            />

            <Form.Field
              control={form.control}
              name="tags"
              render={({ field }) => {
                const tags = field.value || [];
                return (
                  <Form.Item className="flex flex-col gap-2">
                    <Form.Label>{t("knowledge_item.addTag")}</Form.Label>
                    <KnowledgeItemEditTag
                      defaultValues={tags}
                      knowledgeBaseId={knowledgeBaseId}
                      onAdd={(tag) => {
                        if (!tags.includes(tag)) {
                          append(tag);
                        }
                      }}
                    />
                  </Form.Item>
                );
              }}
            />
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <Button variant="secondary" onClick={onClose}>
            {t("actions.cancel")}
          </Button>
          <Button type="submit" isLoading={updateMutation.isPending}>
            {t("actions.save")}
          </Button>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  );
}
