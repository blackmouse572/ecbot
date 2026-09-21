import {
  useConfirmMerge,
  useDismissMerge,
  type CustomerMergeFieldResolutionSide,
  type CustomerMergeSuggestionConfirmRequestDto,
  type CustomerMergeSuggestionCustomerSummaryDto,
  type CustomerMergeSuggestionGetResponseDto,
} from "@/hooks/api/customer-merge-suggestions";
import { Button, Drawer, Heading, RadioGroup, Text, toast } from "@medusajs/ui";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type FieldKey =
  | "name"
  | "phone"
  | "email"
  | "language"
  | "notes"
  | "profileSummary";

const FIELDS: FieldKey[] = [
  "name",
  "phone",
  "email",
  "language",
  "notes",
  "profileSummary",
];

interface Props {
  suggestion: CustomerMergeSuggestionGetResponseDto | null;
  onClose: () => void;
}

export function MergeSuggestionDialog({ suggestion, onClose }: Props) {
  const { t } = useTranslation();
  const isOpen = suggestion !== null;

  const confirm = useConfirmMerge(suggestion?.id ?? null);
  const dismiss = useDismissMerge(suggestion?.id ?? null);

  const [survivor, setSurvivor] = useState<"A" | "B">("A");
  const [resolutions, setResolutions] = useState<
    Partial<Record<FieldKey, CustomerMergeFieldResolutionSide>>
  >({});

  useEffect(() => {
    if (!isOpen || !suggestion) return;
    setSurvivor("A");
    // Auto-resolve each field to whichever side has a non-empty value (default
    // to A if both or neither).
    const next: Partial<Record<FieldKey, CustomerMergeFieldResolutionSide>> =
      {};
    for (const field of FIELDS) {
      const av = (suggestion.customerA as A)?.[field];
      const bv = (suggestion.customerB as A)?.[field];
      if (av && !bv) next[field] = "A";
      else if (!av && bv) next[field] = "B";
      else next[field] = "A";
    }
    setResolutions(next);
  }, [isOpen, suggestion]);

  const survivorId = useMemo(() => {
    if (!suggestion) return undefined;
    return survivor === "A" ? suggestion.customerA.id : suggestion.customerB.id;
  }, [survivor, suggestion]);

  if (!suggestion) return null;

  const handleConfirm = async () => {
    if (!survivorId) return;
    const body: CustomerMergeSuggestionConfirmRequestDto = {
      survivorId,
      fieldResolutions: resolutions,
    };
    try {
      await confirm.mutateAsync(body);
      toast.success(t("customers.suggestions.toast.merged"));
      onClose();
    } catch (e) {
      toast.error(t("customers.suggestions.toast.mergeFailed"));
    }
  };

  const handleDismiss = async () => {
    try {
      await dismiss.mutateAsync();
      toast.success(t("customers.suggestions.toast.dismissed"));
      onClose();
    } catch (e) {
      toast.error(t("customers.suggestions.toast.dismissFailed"));
    }
  };

  const isPending = confirm.isPending || dismiss.isPending;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("customers.suggestions.dialog.title")}</Drawer.Title>
          <Drawer.Description>
            {t("customers.suggestions.dialog.description", {
              field: suggestion.matchField,
              value: suggestion.matchValue,
            })}
          </Drawer.Description>
        </Drawer.Header>
        <Drawer.Body className="overflow-y-auto">
          <div className="flex flex-col gap-y-4">
            <section>
              <Heading level="h3">
                {t("customers.suggestions.dialog.survivor.label")}
              </Heading>
              <RadioGroup
                value={survivor}
                onValueChange={(v) => setSurvivor(v as "A" | "B")}
                className="mt-2 flex gap-x-4"
              >
                <SurvivorOption
                  value="A"
                  label={
                    suggestion.customerA?.name?.trim() ||
                    suggestion.customerA?.id
                  }
                />
                <SurvivorOption
                  value="B"
                  label={
                    suggestion.customerB?.name?.trim() ||
                    suggestion.customerB?.id
                  }
                />
              </RadioGroup>
            </section>

            <section className="grid grid-cols-2 gap-x-4">
              <CustomerCard
                title={t("customers.suggestions.dialog.side.A")}
                customer={suggestion.customerA}
              />
              <CustomerCard
                title={t("customers.suggestions.dialog.side.B")}
                customer={suggestion.customerB}
              />
            </section>

            <section>
              <Heading level="h3" className="mb-2">
                {t("customers.suggestions.dialog.fields.title")}
              </Heading>
              <div className="flex flex-col gap-y-3">
                {FIELDS.map((field) => {
                  const av = (suggestion.customerA as A)?.[field] ?? "";
                  const bv = (suggestion.customerB as A)?.[field] ?? "";
                  if (!av && !bv) return null;
                  return (
                    <div
                      key={field}
                      className="border-ui-border-base rounded border px-3 py-2"
                    >
                      <Text size="small" weight="plus" leading="compact">
                        {t(`customers.suggestions.dialog.fields.${field}`)}
                      </Text>
                      <RadioGroup
                        value={resolutions[field] ?? "A"}
                        onValueChange={(v) =>
                          setResolutions((prev) => ({
                            ...prev,
                            [field]: v as "A" | "B",
                          }))
                        }
                        className="mt-1 grid grid-cols-2 gap-x-2"
                      >
                        <FieldOption value="A" text={String(av || "—")} />
                        <FieldOption value="B" text={String(bv || "—")} />
                      </RadioGroup>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex items-center justify-between w-full">
            <Button
              type="button"
              variant="danger"
              size="small"
              onClick={handleDismiss}
              isLoading={dismiss.isPending}
              disabled={isPending}
            >
              {t("customers.suggestions.actions.dismiss")}
            </Button>
            <div className="flex items-center gap-x-2">
              <Drawer.Close asChild>
                <Button type="button" variant="secondary" size="small">
                  {t("customers.suggestions.actions.cancel")}
                </Button>
              </Drawer.Close>
              <Button
                type="button"
                variant="primary"
                size="small"
                onClick={handleConfirm}
                isLoading={confirm.isPending}
                disabled={isPending}
              >
                {t("customers.suggestions.actions.confirmMerge")}
              </Button>
            </div>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}

function SurvivorOption({ value, label }: { value: "A" | "B"; label: string }) {
  return (
    <label className="flex items-center gap-x-2">
      <RadioGroup.Item value={value} />
      <Text size="small">{label}</Text>
    </label>
  );
}

function FieldOption({ value, text }: { value: "A" | "B"; text: string }) {
  return (
    <label className="flex items-start gap-x-2">
      <RadioGroup.Item value={value} className="mt-0.5" />
      <Text size="small" className="break-words">
        {text}
      </Text>
    </label>
  );
}

function CustomerCard({
  title,
  customer,
}: {
  title: string;
  customer: CustomerMergeSuggestionCustomerSummaryDto;
}) {
  const { t } = useTranslation();
  return (
    <div className="border-ui-border-base bg-ui-bg-subtle rounded border p-3">
      <Text size="xsmall" className="text-ui-fg-muted">
        {title}
      </Text>
      <Text size="small" weight="plus">
        {customer.name?.trim() || `#${customer.id?.slice(0, 8)}`}
      </Text>
      <dl className="mt-2 grid grid-cols-1 gap-y-1">
        <Row
          label={t("customers.suggestions.dialog.fields.phone")}
          value={customer.phone}
        />
        <Row
          label={t("customers.suggestions.dialog.fields.email")}
          value={customer.email}
        />
        <Row
          label={t("customers.suggestions.dialog.fields.language")}
          value={customer.language}
        />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-x-2">
      <Text size="xsmall" className="text-ui-fg-muted shrink-0">
        {label}:
      </Text>
      <Text size="xsmall" className="truncate">
        {value}
      </Text>
    </div>
  );
}
