import { BuildingLoader } from "@/components/ai-chat/ai-loader";
import { TEMPLATE_TYPES, type BusinessTypeId } from "@repo/agent-blueprint";
import { Heading, Text, clx } from "@medusajs/ui";
import {
  PromptInput, PromptInputBody, PromptInputFooter, PromptInputSubmit, PromptInputTextarea,
} from "@repo/ui/common-components";
import { ScrollArea } from "@repo/ui/components";
import { useTranslation } from "react-i18next";
import { businessTypeIcon } from "./business-type-icon";

type Props = { loading: boolean; onDescribe: (text: string) => void; onTemplate: (type: BusinessTypeId) => void };

// F.5's card transitions (colour/shadow only, no scale pop) applied to the
// template cards (wireframe delta section 1).
const CARD_CLASSES = clx(
  "flex flex-col items-center gap-2 rounded-lg bg-ui-bg-base shadow-borders-base px-4 py-3",
  "hover:bg-ui-bg-base-hover",
  "transition-[box-shadow,background-color] duration-150 ease-out motion-reduce:transition-[background-color]",
);

/**
 * Step 0: a centered hero with a large describe input and template cards
 * (wireframe delta section 1, replaces the in-thread step-0 card).
 */
export function Hero({ loading, onDescribe, onTemplate }: Props) {
  const { t } = useTranslation();
  return (
    // The viewport's inner wrapper fills the height so the hero centers
    // vertically; taller content still scrolls.
    <ScrollArea className="h-full min-h-0 flex-1" viewportClassName="[&>div]:!h-full">
      <div className="flex min-h-full flex-col items-center justify-center p-4 md:p-8">
        <div className="flex w-full max-w-[640px] flex-col items-center gap-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <Heading level="h1">{t("agentBuilder.ui.heroTitle")}</Heading>
            <Text className="text-ui-fg-subtle">{t("agentBuilder.ui.heroSubtitle")}</Text>
          </div>
          <PromptInput
            className="w-full"
            onSubmit={({ text }) => {
              if (text.trim() && !loading) onDescribe(text.trim());
            }}
          >
            <PromptInputBody>
              <PromptInputTextarea
                placeholder={t("agentBuilder.ui.startPlaceholder")}
                maxLength={1000}
                disabled={loading}
                rows={4}
                className="min-h-32"
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputSubmit className="ml-auto" status={loading ? "submitted" : "idle"} disabled={loading} />
            </PromptInputFooter>
          </PromptInput>
          {loading && <BuildingLoader state={t("agentBuilder.ui.suggesting")} />}
          <div className={clx("flex flex-wrap items-center justify-center gap-2", loading && "pointer-events-none opacity-60")}>
            {TEMPLATE_TYPES.map((type) => (
              <button key={type} type="button" className={CARD_CLASSES} disabled={loading} onClick={() => onTemplate(type)}>
                {businessTypeIcon(type)}
                <Text size="small" weight="plus">{t(`agentBuilder.types.${type}`)}</Text>
              </button>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
