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
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

type Model = ReturnType<typeof useChatbotModels>["models"][number];

type ChatbotModelComboboxProps = {
  value?: string;
  onChange: (modelId: string) => void;
  onBlur?: () => void;
  name?: string;
  id?: string;
  invalid?: boolean;
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
  onBlur,
  name,
  id,
  invalid,
}: ChatbotModelComboboxProps) {
  const { t } = useTranslation();
  const { models, isLoading } = useChatbotModels();

  const groups = useMemo(() => {
    const byProvider = new Map<string, Model[]>();
    for (const m of models) {
      byProvider.set(m.provider, [...(byProvider.get(m.provider) ?? []), m]);
    }
    return [...byProvider].map(([provider, items]) => ({
      value: provider,
      items,
    }));
  }, [models]);

  const selected = models.find((m) => m.id === value) ?? null;

  return (
    <Combobox<Model>
      items={groups}
      value={selected}
      onValueChange={(m) => m && onChange(m.id)}
      itemToStringLabel={(m) => m.name}
      isItemEqualToValue={(a, b) => a.id === b.id}
      filter={matches}
      autoHighlight
      name={name}
    >
      <ComboboxInput
        id={id}
        onBlur={onBlur}
        placeholder={t("chatbot.create.modelSearch")}
        aria-invalid={invalid || undefined}
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
              <ComboboxGroupLabel>{group.value}</ComboboxGroupLabel>
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
