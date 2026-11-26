import { RouteDrawer } from "@/components/modals";
import type { MarketingOverviewTodoDto } from "@/hooks/api/marketing-overview";
import { clx, Heading } from "@medusajs/ui";
import { NoRecords } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { TODO_STAGE } from "../constants";
import { SendForm } from "./components/send-form";

type Preset = MarketingOverviewTodoDto["key"];

const isPreset = (value?: string): value is Preset =>
  !!value && Object.hasOwn(TODO_STAGE, value);

/**
 * Gửi theo giai đoạn: one "Việc nên làm" row opens this drawer. Ecbot has
 * picked the customers and drafts the text; the shop reads, edits and sends.
 */
export const MarketingSendCreate = () => {
  const { t } = useTranslation();
  const { preset } = useParams<{ preset: string }>();

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>
            {isPreset(preset)
              ? t(`marketing.send.preset.${preset}.title`)
              : t("marketing.send.notFoundTitle")}
          </Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className={clx(isPreset(preset) && "sr-only")}>
          {isPreset(preset)
            ? t("marketing.send.description")
            : t("marketing.send.notFoundMessage")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      {isPreset(preset) ? (
        <SendForm preset={preset} />
      ) : (
        <RouteDrawer.Body className="p-6">
          <NoRecords
            title={t("marketing.send.notFoundTitle")}
            message={t("marketing.send.notFoundMessage")}
          />
        </RouteDrawer.Body>
      )}
    </RouteDrawer>
  );
};
