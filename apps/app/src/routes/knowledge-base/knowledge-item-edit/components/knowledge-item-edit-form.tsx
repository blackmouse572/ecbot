import {
  useProcessKnowledgeItem,
  useUpdateKnowledgeItem,
} from "@/hooks/api/knowledge-base";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Textarea, toast } from "@medusajs/ui";
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
import { KB_URL_MAX_PAGES } from "../../constants";
import { KnowledgeItemEditTag } from "./knowledge-item-edit-tags";

type KnowledgeItemEditFormProps = {
  knowledgeBaseId: string;
  item: KnowledgeItemResponseDto;
};

const KnowledgeItemEditSchema = z.object({
  title: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
  content: z.string().optional(),
  maxPages: z.number().int().min(1).max(KB_URL_MAX_PAGES).optional(),
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
      content: item.content ?? "",
      maxPages: Number(item.metadata?.maxPages ?? 1),
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

  const isMedia = item.type === "MEDIA";
  const isUrl = item.type === "URL";
  const { mutateAsync: processItem } = useProcessKnowledgeItem();

  const onClose = useCallback(() => {
    navigate(
      `/${workspaceSlug}/${ROUTES.KnowledgeBase}/${knowledgeBaseId}/item/${item.id}`,
    );
  }, [navigate, workspaceSlug, knowledgeBaseId, item.id]);

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      const { content, maxPages, ...rest } = data;
      const pagesChanged =
        isUrl && maxPages !== Number(item.metadata?.maxPages ?? 1);
      await updateMutation.mutateAsync({
        ...(isMedia ? { ...rest, content } : rest),
        ...(pagesChanged && { metadata: { ...item.metadata, maxPages } }),
      });
      // A media item is searched by its title and description, and a
      // website item reads a new number of pages: index it again.
      if (
        pagesChanged ||
        (isMedia &&
          (content !== (item.content ?? "") || data.title !== item.title))
      ) {
        await processItem({ knowledgeBaseId, id: item.id });
      }
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

            {isMedia && (
              <Form.Field
                control={form.control}
                name="content"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label optional>
                      {t("knowledge_item.media.description")}
                    </Form.Label>
                    <Form.Control>
                      <Textarea {...field} rows={5} />
                    </Form.Control>
                    <Form.Hint>
                      {t("knowledge_item.media.description_hint")}
                    </Form.Hint>
                  </Form.Item>
                )}
              />
            )}

            {isUrl && (
              <Form.Field
                control={form.control}
                name="maxPages"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>{t("knowledge_item.max_pages")}</Form.Label>
                    <Form.Control>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === ""
                              ? undefined
                              : event.target.valueAsNumber,
                          )
                        }
                        type="number"
                        min={1}
                        max={KB_URL_MAX_PAGES}
                        step={1}
                      />
                    </Form.Control>
                    <Form.Hint>
                      {t("knowledge_item.max_pages_hint", {
                        max: KB_URL_MAX_PAGES,
                      })}
                    </Form.Hint>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
            )}

            <Form.Field
              control={form.control}
              name="tags"
              render={({ field }) => {
                const tags = field.value || [];
                return (
                  <Form.Item>
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
                  <Form.Item>
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
