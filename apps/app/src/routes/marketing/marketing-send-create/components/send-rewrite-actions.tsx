import type { MarketingSendDraftRequestDto } from "@/hooks/api/marketing-sends";
import { ChevronDownMini, Sparkles } from "@medusajs/icons";
import { Button, DropdownMenu } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import {
  MARKETING_DRAFT_LENGTHS,
  MARKETING_DRAFT_TONES,
} from "../../constants";

type Rewrite = NonNullable<MarketingSendDraftRequestDto["rewrite"]>;
type Tone = (typeof MARKETING_DRAFT_TONES)[number];

type SendRewriteActionsProps = {
  tone: Tone;
  disabled: boolean;
  /** A tone picked from Viết lại comes with it; Dài hơn / Ngắn hơn keep it. */
  onRewrite: (rewrite: Rewrite, tone?: Tone) => void;
};

/** Viết lại (in a tone), Dài hơn, Ngắn hơn: the editor's AI buttons. */
export const SendRewriteActions: FC<SendRewriteActionsProps> = ({
  tone,
  disabled,
  onRewrite,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Viết lại only asks how: each tone rewrites in it. */}
      <DropdownMenu>
        <DropdownMenu.Trigger asChild>
          <Button
            size="small"
            variant="transparent"
            type="button"
            disabled={disabled}
          >
            <Sparkles />
            {t("marketing.send.message.rewrite.DIFFERENT")}
            <ChevronDownMini />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="start">
          <DropdownMenu.Label className="px-2 py-1.5">
            {t("marketing.send.message.tone")}
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={tone}>
            {MARKETING_DRAFT_TONES.map((value) => (
              <DropdownMenu.RadioItem
                key={value}
                value={value}
                // onSelect, not onValueChange: the current tone rewrites too.
                onSelect={() => onRewrite("DIFFERENT", value)}
              >
                {t(`marketing.send.message.tones.${value}`)}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu>
      {MARKETING_DRAFT_LENGTHS.map((rewrite) => (
        <Button
          key={rewrite}
          size="small"
          variant="transparent"
          type="button"
          disabled={disabled}
          onClick={() => onRewrite(rewrite)}
        >
          {t(`marketing.send.message.rewrite.${rewrite}`)}
        </Button>
      ))}
    </>
  );
};
