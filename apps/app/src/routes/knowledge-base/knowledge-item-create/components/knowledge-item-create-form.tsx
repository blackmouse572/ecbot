import { RouteFocusModal, useRouteModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, toast } from "@medusajs/ui";
import type { KnowledgeItemCreateRequestDto } from "@repo/client";
import { ChipGroup, Form } from "@repo/ui/common-components";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useMemo, useState, type FC } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";
import {
  useCreateKnowledgeItem,
  useProcessKnowledgeItem,
} from "../../../../hooks/api";
import { FileForm, TextForm, UrlForm } from "./forms";
import { KnowledgeItemTypeSelector } from "./knowledge-item-type-selector/index";
import { KnowledgeItemTypeEnum } from "./knowledge-item-type-selector/knowledge-item-type-selector";
import { createFileSchema, createTextSchema, createUrlSchema } from "./schema";
import { KnowledgeItemEditTag } from "../../knowledge-item-edit/components/knowledge-item-edit-tags";

interface KnowledgeItemCreateFormProps {
  workspaceSlug: string;
  knowledgeBaseId: string;
}

export const KnowledgeItemCreateForm: FC<KnowledgeItemCreateFormProps> = ({
  knowledgeBaseId,
}) => {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();
  const [selectedType, setSelectedType] = useQueryState(
    "t",
    parseAsStringLiteral(KnowledgeItemTypeEnum).withDefault("FILE"),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Dynamic schema based on type
  const schema = useMemo(() => {
    switch (selectedType) {
      case "FILE":
        return createFileSchema();
      case "URL":
        return createUrlSchema();
      case "TEXT":
        return createTextSchema();
      default:
        return z.object({ type: z.enum(["FILE", "URL", "TEXT"]) });
    }
  }, [selectedType]);

  const form = useForm<KnowledgeItemCreateRequestDto>({
    resolver: zodResolver(schema) as A,
    defaultValues: {
      title: "",
      content: "",
      tags: [],
    },
  });
  const { remove, append } = useFieldArray({
    control: form.control,
    // @ts-expect-error - This is a known issue with react-hook-form's useFieldArray and TypeScript
    name: "tags",
  });

  const { mutateAsync } = useCreateKnowledgeItem(knowledgeBaseId, {
    onUploadProgress: (progress) => {
      setUploadProgress(progress);
    },
  });
  const { mutateAsync: processItem } = useProcessKnowledgeItem();
  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      setIsLoading(true);
      setUploadProgress(0);

      // Extract file from data for FILE type
      const fileData =
        selectedType === "FILE" && "file" in data
          ? (data as A).file
          : undefined;
      const formData = {
        ...data,
        type: selectedType,
        ...(fileData && { file: fileData.file }), // Extract actual File object
      };

      const created = await mutateAsync(formData);

      // Item exists now — report success and leave the form regardless of
      // what happens next, so a processing hiccup can't look like a failed
      // create and cause the user to resubmit (creating a duplicate item).
      toast.success(t("knowledge_item.create_success"));
      handleSuccess();

      // URL items start as DRAFT — kick off ingestion right away instead of
      // making the user find the "Process" action in the list.
      const createdId = created.data?.data?.id;
      if (selectedType === "URL" && createdId) {
        try {
          await processItem({ knowledgeBaseId, id: createdId });
        } catch (processError) {
          console.error("Error auto-processing URL item:", processError);
          toast.info(t("knowledge_item.process_after_create_error"));
        }
      }
    } catch (error) {
      console.error("Error creating knowledge item:", error);
      toast.error(t("knowledge_item.create_error"));
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  });

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col max-h-screen"
      >
        <RouteFocusModal.Header>
          <div className="flex items-center justify-end gap-x-2">
            <Button
              type="button"
              onClick={() => window.history.back()}
              variant="secondary"
            >
              {t("knowledge_item.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!selectedType || isLoading}
              isLoading={isLoading}
            >
              {t("knowledge_item.create_button")}
            </Button>
          </div>
        </RouteFocusModal.Header>

        <RouteFocusModal.Body className="flex flex-col items-center p-16 overflow-auto">
          <div className="flex w-full items-center max-w-[720px] flex-col gap-y-8 justify-center">
            <div className="space-y-6 w-full">
              {/* Type Selector */}
              <Form.Field
                name="type"
                control={form.control}
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>
                      {t("knowledge_item.select_type_label")}
                    </Form.Label>
                    <Form.Control>
                      <KnowledgeItemTypeSelector
                        value={selectedType}
                        onChange={(type) => {
                          setSelectedType(type);
                          field.onChange(type);
                        }}
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />

              {/* Conditional Form Based on Type */}
              {selectedType && (
                <div className="border-t pt-6 space-y-4">
                  {/* Title */}
                  <Form.Field
                    control={form.control}
                    name="title"
                    render={({ field, fieldState }) => (
                      <Form.Item>
                        <Form.Label>{t("knowledge_item.title")}</Form.Label>
                        <Form.Control>
                          <Input
                            {...field}
                            placeholder={t("knowledge_item.title_placeholder")}
                            aria-invalid={!!fieldState.error}
                            aria-errormessage={fieldState.error?.message}
                          />
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
                          <Form.Label>{t("knowledge_item.addTag")}</Form.Label>
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
                  {selectedType === "FILE" && (
                    <FileForm
                      form={form as A}
                      isLoading={isLoading}
                      uploadProgress={uploadProgress}
                    />
                  )}
                  {selectedType === "URL" && <UrlForm form={form} />}
                  {selectedType === "TEXT" && <TextForm form={form} />}
                </div>
              )}
            </div>
          </div>
        </RouteFocusModal.Body>
      </KeyboundForm>
    </RouteFocusModal.Form>
  );
};
