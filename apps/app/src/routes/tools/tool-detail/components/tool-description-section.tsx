import { Container, Divider, Heading, Text } from "@medusajs/ui";
import type { ToolResponseDto } from "@repo/client";
import { useTranslation } from "react-i18next";

type ToolDescriptionSectionProps = {
  item: ToolResponseDto;
};

export const ToolDescriptionSection = ({
  item,
}: ToolDescriptionSectionProps) => {
  const { t } = useTranslation();

  if (!item.description) return null;

  return (
    <Container className="p-0">
      <div className="flex flex-col gap-y-1 px-6 py-4">
        <Heading>{t("tools.details.sections.description")}</Heading>
      </div>
      <Divider variant="dashed" />
      <div className="px-6 py-4">
        <Text
          size="small"
          className="text-ui-fg-subtle whitespace-pre-wrap break-words"
        >
          {item.description}
        </Text>
      </div>
    </Container>
  );
};
