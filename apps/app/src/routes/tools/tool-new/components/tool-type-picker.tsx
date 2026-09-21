import { Globe, SquareBlueSolid, SquarePurpleSolid } from "@medusajs/icons";
import { Heading, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

export type ToolType = "http" | "mcp" | "marketplace";

type PickerCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
};

const PickerCard = ({ icon, title, description, onClick }: PickerCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className="flex flex-col items-start gap-y-3 rounded-lg border bg-ui-bg-field p-6 text-left transition-[shadow,background] hover:shadow-sm hover:bg-ui-bg-base-hover focus:outline-none focus:ring-2 focus:ring-ui-border-interactive w-full"
  >
    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ui-bg-subtle text-ui-fg-base">
      {icon}
    </div>
    <div className="flex flex-col gap-y-1">
      <Heading level="h3">{title}</Heading>
      <Text size="small" className="text-ui-fg-subtle">
        {description}
      </Text>
    </div>
  </button>
);

type ToolTypePickerProps = {
  onSelect: (type: ToolType) => void;
};

export const ToolTypePicker = ({ onSelect }: ToolTypePickerProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-y-6 w-full max-w-2xl">
      <div>
        <Heading level="h1">{t("tools.new.picker.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          {t("tools.new.picker.subtitle")}
        </Text>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PickerCard
          icon={<SquareBlueSolid />}
          title={t("tools.new.picker.http.title")}
          description={t("tools.new.picker.http.description")}
          onClick={() => onSelect("http")}
        />
        <PickerCard
          icon={<SquarePurpleSolid />}
          title={t("tools.new.picker.mcp.title")}
          description={t("tools.new.picker.mcp.description")}
          onClick={() => onSelect("mcp")}
        />
        <PickerCard
          icon={<Globe />}
          title={t("tools.new.picker.marketplace.title")}
          description={t("tools.new.picker.marketplace.description")}
          onClick={() => onSelect("marketplace")}
        />
      </div>
    </div>
  );
};
