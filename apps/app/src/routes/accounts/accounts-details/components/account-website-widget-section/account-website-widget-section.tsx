import { CopyField } from "@/routes/accounts/account-create/components/account-create-form/copy-field";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { PencilSquare } from "@medusajs/icons";
import { Container, Heading } from "@medusajs/ui";
import type { AccountGetDetailResponseDto } from "@repo/client";
import { ActionMenu, Section, SectionRow } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

type AccountWebsiteWidgetSectionProps = {
  item: AccountGetDetailResponseDto;
};

/** WEBSITE_WIDGET only — the widget key and the sites allowed to embed it. */
export const AccountWebsiteWidgetSection = ({
  item,
}: AccountWebsiteWidgetSectionProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceSlug } = useWorkspaceParams();

  if (item.type !== "WEBSITE_WIDGET") return null;

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">
          {t("accounts.details.websiteWidget.title")}
        </Heading>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  icon: <PencilSquare />,
                  label: t("actions.edit"),
                  onClick: () =>
                    navigate(
                      `/${workspaceSlug}/${ROUTES.Accounts}/${item.id}/allowed-origins/edit`,
                    ),
                },
              ],
            },
          ]}
        />
      </div>
      <Section variant="spaced">
        <SectionRow
          title={t("accounts.details.websiteWidget.originsLabel")}
          value={item.allowedOrigins?.join(", ")}
        />
      </Section>
      {item.accountKey && (
        <div className="px-6 py-4">
          <CopyField
            label={t("accounts.details.websiteWidget.keyLabel")}
            value={item.accountKey}
          />
        </div>
      )}
    </Container>
  );
};
