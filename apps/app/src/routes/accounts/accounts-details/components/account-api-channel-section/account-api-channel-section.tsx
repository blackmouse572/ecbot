import { CopyField } from "@/routes/accounts/account-create/components/account-create-form/copy-field";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { PencilSquare } from "@medusajs/icons";
import { Container, Heading } from "@medusajs/ui";
import type { AccountGetDetailResponseDto } from "@repo/client";
import { ActionMenu, Section, SectionRow } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

type AccountApiChannelSectionProps = {
  item: AccountGetDetailResponseDto;
};

/** API_CHANNEL only — the fields a partner integration needs: account key and callback URL. */
export const AccountApiChannelSection = ({
  item,
}: AccountApiChannelSectionProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceSlug } = useWorkspaceParams();

  if (item.type !== "API_CHANNEL") return null;

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("accounts.details.apiChannel.title")}</Heading>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  icon: <PencilSquare />,
                  label: t("actions.edit"),
                  onClick: () =>
                    navigate(
                      `/${workspaceSlug}/${ROUTES.Accounts}/${item.id}/callback-url/edit`,
                    ),
                },
              ],
            },
          ]}
        />
      </div>
      <Section variant="spaced">
        <SectionRow
          title={t("accounts.details.apiChannel.callbackLabel")}
          value={
            item.callbackUrl ? (
              <span className="break-all font-mono text-xs">
                {item.callbackUrl}
              </span>
            ) : (
              "-"
            )
          }
        />
      </Section>
      {item.accountKey && (
        <div className="px-6 py-4">
          <CopyField
            label={t("accounts.details.apiChannel.accountKeyLabel")}
            value={item.accountKey}
            hint={t("accounts.details.apiChannel.accountKeyHint")}
          />
        </div>
      )}
    </Container>
  );
};
