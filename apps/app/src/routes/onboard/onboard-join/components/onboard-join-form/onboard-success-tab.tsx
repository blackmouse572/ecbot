import { getAvatarFallback } from "@/components/utils/avatar-fallback";
import { CheckCircleMiniSolid } from "@medusajs/icons";
import { Avatar, Button, Heading } from "@medusajs/ui";
import type { WorkSpaceGetResponseDto } from "@repo/client";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
export const OnboardSuccessTab = (props: {
  data: WorkSpaceGetResponseDto;
  joined?: boolean;
}) => {
  const { data, joined } = props;
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center p-16">
      <div className="flex w-full max-w-[720px] flex-col gap-y-8 justify-center items-center">
        <Avatar
          fallback={getAvatarFallback(data.name)}
          src={data.avatar}
          size="xlarge"
        />
        <Heading>{data.name}</Heading>
      </div>
      {joined && (
        <div className="mt-12 flex flex-col gap-y-4">
          <h1 className="text-lg font-bold text-ui-tag-green-text">
            <CheckCircleMiniSolid className="inline-block mr-2" />
            {t("onboard.join.success.sentRequest")}
          </h1>
          <p className="text-center text-sm text-ui-fg-subtle">
            {t("onboard.join.success.description")}
          </p>
          <Button asChild>
            <Link to={`/${data.slug}`}>{t("actions.continued")}</Link>
          </Button>
        </div>
      )}
    </div>
  );
};
