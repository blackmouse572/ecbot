import { RouteFocusModal, useRouteModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import { readApiError } from "@/libs/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, toast } from "@medusajs/ui";
import { ChipGroup, Form } from "@repo/ui/common-components";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useMemo, useRef, useState, type FC } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";
import {
  useCreateKnowledgeItem,
  useLinkKnowledgeItemToChatbots,
  useProcessKnowledgeItem,
} from "../../../../hooks/api";
import { FileForm, MediaForm, TextForm, UrlForm } from "./forms";
import { fileTitle } from "./forms/file-title";
import { KnowledgeItemTypeSelector } from "./knowledge-item-type-selector/index";
import { KnowledgeItemTypeEnum } from "./knowledge-item-type-selector/knowledge-item-type-selector";
import {
  createFileSchema,
  createMediaSchema,
  createTextSchema,
  createUrlSchema,
  type KnowledgeItemCreateFormValues,
} from "./schema";
import { runWithLimit } from "./run-with-limit";
import { KB_MEDIA_UPLOAD_CONCURRENCY } from "../../constants";
import { KnowledgeItemEditTag } from "../../knowledge-item-edit/components/knowledge-item-edit-tags";

interface KnowledgeItemCreateFormProps {
  workspaceSlug: string;
  knowledgeBaseId: string;
  /** The agent the form was opened from; the new item is linked to it. */
  agentId?: string;
}

export const KnowledgeItemCreateForm: FC<KnowledgeItemCreateFormProps> = ({
  knowledgeBaseId,
  agentId,
}) => {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();
  const [selectedType, setSelectedType] = useQueryState(
    "t",
    parseAsStringLiteral(KnowledgeItemTypeEnum).withDefault("FILE"),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedIds, setUploadedIds] = useState<string[]>([]);

  // Dynamic schema based on type
  const schema = useMemo(() => {
    switch (selectedType) {
      case "FILE":
        return createFileSchema();
      case "URL":
        return createUrlSchema();
      case "TEXT":
        return createTextSchema();
      case "MEDIA":
        return createMediaSchema();
      default:
        return z.object({ type: z.enum(["FILE", "URL", "TEXT", "MEDIA"]) });
    }
  }, [selectedType]);

  const keepTitleSelection = useRef(false);
  const form = useForm<KnowledgeItemCreateFormValues>({
    // The schema swaps with the selected type, so it can't be tied to the
    // form's static shape — this is the one place that gap is bridged.
    resolver: zodResolver(schema) as Resolver<KnowledgeItemCreateFormValues>,
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
  const { mutateAsync: linkAgents } = useLinkKnowledgeItemToChatbots();

  // Link before processing: ingestion tags the item's content with the
  // agents linked at that moment. Returns how many agent links failed.
  const linkAndProcess = async (createdId: string) => {
    let linkFailed = 0;
    if (agentId) {
      ({ failed: linkFailed } = await linkAgents({
        knowledgeItemId: createdId,
        chatbotIds: [agentId],
      }));
    }
    await processItem({ knowledgeBaseId, id: createdId });
    return linkFailed;
  };

  // Each media file becomes its own item named after it; a few upload at
  // once, and one failing upload does not stop the rest. Failed files stay in
  // the form to try again; the uploaded ones leave it.
  const createMedia = async (data: KnowledgeItemCreateFormValues) => {
    const files = data.files ?? [];
    const uploaded: string[] = [];
    let linkFailed = 0;
    let processFailed = 0;
    setUploadedIds([]);
    await runWithLimit(
      files,
      KB_MEDIA_UPLOAD_CONCURRENCY,
      async ({ id, file }) => {
        const created = await mutateAsync({
          type: "MEDIA",
          title: fileTitle(file.name),
          tags: data.tags,
          file,
        });
        uploaded.push(id);
        setUploadedIds([...uploaded]);
        const createdId = created.data?.data?.id;
        if (!createdId) return;
        // The item exists now: a processing hiccup is not a failed upload, or
        // trying again would create it twice.
        try {
          linkFailed += await linkAndProcess(createdId);
        } catch (processError) {
          console.error("Error auto-processing media item:", processError);
          processFailed += 1;
        }
      },
    );

    if (linkFailed) {
      toast.info(
        t("knowledge_item.link_after_create_error", { count: linkFailed }),
      );
    }
    if (processFailed)
      toast.info(t("knowledge_item.process_after_create_error"));

    const failed = files.filter(({ id }) => !uploaded.includes(id));
    if (failed.length === 0) {
      toast.success(
        t("knowledge_item.media.create_success", { count: uploaded.length }),
      );
      handleSuccess();
    } else if (uploaded.length > 0) {
      form.setValue("files", failed);
      toast.info(
        t("knowledge_item.media.create_partial", {
          added: uploaded.length,
          failed: failed.length,
          count: files.length,
        }),
      );
    } else {
      toast.error(t("knowledge_item.create_error"));
    }
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    if (selectedType === "MEDIA") {
      setIsLoading(true);
      try {
        await createMedia(data);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    try {
      setIsLoading(true);
      setUploadProgress(0);

      // Extract file from data for FILE type
      const fileData = selectedType === "FILE" ? data.file : undefined;
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

      // Every item starts as DRAFT, which the agent never uses. Kick off
      // ingestion right away, for every type, instead of making the user find
      // the "Process" action in the list.
      const createdId = created.data?.data?.id;
      // Link before processing: ingestion tags the item's content with the
      // agents linked at that moment.
      if (createdId && agentId) {
        const { failed } = await linkAgents({
          knowledgeItemId: createdId,
          chatbotIds: [agentId],
        });
        if (failed) {
          toast.info(
            t("knowledge_item.link_after_create_error", { count: failed }),
          );
        }
      }
      if (createdId) {
        try {
          await processItem({ knowledgeBaseId, id: createdId });
        } catch (processError) {
          console.error("Error auto-processing knowledge item:", processError);
          toast.info(t("knowledge_item.process_after_create_error"));
        }
      }
    } catch (error) {
      console.error("Error creating knowledge item:", error);
      // Show the API's reason (an empty file, a file that is not really a
      // PDF, ...) over the generic message.
      toast.error(
        readApiError(error).message ?? t("knowledge_item.create_error"),
      );
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
                  {selectedType !== "MEDIA" && (
                    <Form.Field
                      control={form.control}
                      name="title"
                      render={({ field, fieldState }) => (
                        <Form.Item>
                          <Form.Label>{t("knowledge_item.title")}</Form.Label>
                          <Form.Control>
                            <Input
                              {...field}
                              onFocus={(e) => {
                                // A title filled in from the file name is a
                                // suggestion: select it so typing replaces it.
                                const file = form.getValues("file");
                                if (
                                  file &&
                                  field.value === fileTitle(file.file.name)
                                ) {
                                  e.currentTarget.select();
                                  keepTitleSelection.current = true;
                                }
                              }}
                              onMouseUp={(e) => {
                                // The click that focused the field would
                                // otherwise drop the caret and undo the select.
                                if (keepTitleSelection.current)
                                  e.preventDefault();
                                keepTitleSelection.current = false;
                              }}
                              placeholder={t(
                                "knowledge_item.title_placeholder",
                              )}
                              aria-invalid={!!fieldState.error}
                              aria-errormessage={fieldState.error?.message}
                            />
                          </Form.Control>
                          <Form.ErrorMessage />
                        </Form.Item>
                      )}
                    />
                  )}
                  {/* One field: the label sits on the input, chosen tags below. */}
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
                          {tags.length > 0 && (
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
                          )}
                        </Form.Item>
                      );
                    }}
                  />
                  {selectedType === "FILE" && (
                    <FileForm
                      form={form}
                      isLoading={isLoading}
                      uploadProgress={uploadProgress}
                    />
                  )}
                  {selectedType === "URL" && <UrlForm form={form} />}
                  {selectedType === "MEDIA" && (
                    <MediaForm
                      form={form}
                      isLoading={isLoading}
                      uploadedIds={uploadedIds}
                    />
                  )}
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
