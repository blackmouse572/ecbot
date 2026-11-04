import { ProviderLogo } from "@/components/provider-logo/provider-logo";
import { useChatbotModels } from "@/hooks/api/chatbot";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@repo/ui/components";
import { type ComponentProps, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type Model = ReturnType<typeof useChatbotModels>["models"][number];

type ChatbotModelComboboxProps = Omit<
  ComponentProps<typeof ComboboxInput>,
  "value" | "onChange"
> & {
  value?: string;
  onChange: (modelId: string) => void;
};

const matches = (model: Model, query: string) => {
  const q = query.trim().toLowerCase();
  return (
    !q ||
    model.name.toLowerCase().includes(q) ||
    model.provider.toLowerCase().includes(q) ||
    model.id.toLowerCase().includes(q)
  );
};

/** Searchable model picker, one group per provider. Typing matches the model or provider name. */
export function ChatbotModelCombobox({
  value,
  onChange,
  name,
  ...inputProps
}: ChatbotModelComboboxProps) {
  const { t } = useTranslation();
  const { models, isLoading } = useChatbotModels();

  const groups = useMemo(() => {
    const byProvider = new Map<string, Model[]>();
    for (const m of models) {
      const bucket = byProvider.get(m.provider);
      if (bucket) bucket.push(m);
      else byProvider.set(m.provider, [m]);
    }
    return [...byProvider].map(([provider, items]) => ({
      value: provider,
      items,
    }));
  }, [models]);

  const selected = models.find((m) => m.id === value) ?? null;
  // What the person typed; null shows the picked model's name.
  const [query, setQuery] = useState<string | null>(null);

  return (
    <Combobox<Model>
      items={groups}
      value={selected}
      // A model is required, so clearing the text never clears the field:
      // drop the null and show the picked model again on close or blur.
      onValueChange={(m) => m && onChange(m.id)}
      inputValue={query ?? selected?.name ?? ""}
      onInputValueChange={setQuery}
      onOpenChange={(open) => !open && setQuery(null)}
      itemToStringLabel={(m) => m.name}
      isItemEqualToValue={(a, b) => a.id === b.id}
      filter={matches}
      autoHighlight
      name={name}
    >
      <ComboboxInput
        placeholder={t("chatbot.create.modelSearch")}
        triggerLabel={t("chatbot.create.modelOpen")}
        {...inputProps}
        onBlur={(e) => {
          setQuery(null);
          inputProps.onBlur?.(e);
        }}
        startAddon={selected && <ProviderLogo provider={selected.provider} />}
      />
      <ComboboxContent>
        {isLoading ? (
          <div className="txt-compact-small text-ui-fg-muted px-3 py-2">
            {t("chatbot.create.modelsLoading")}
          </div>
        ) : (
          <ComboboxEmpty>{t("chatbot.create.modelsEmpty")}</ComboboxEmpty>
        )}
        <ComboboxList>
          {(group: { value: string; items: Model[] }) => (
            <ComboboxGroup key={group.value} items={group.items}>
              <ComboboxGroupLabel>
                <ProviderLogo provider={group.value} />
                {group.value}
              </ComboboxGroupLabel>
              <ComboboxCollection>
                {(m: Model) => (
                  <ComboboxItem key={m.id} value={m}>
                    {m.name}
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxGroup>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
