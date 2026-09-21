import { useLanguagePreferences } from "@/hooks/use-language-preferences";
import { languages } from "@/i18n/languages";
import { useTheme } from "@/providers/theme-provider";
import { Container, Heading, Select, Text } from "@medusajs/ui";
import { RadioGroup } from "radix-ui";
import { useTranslation } from "react-i18next";

export const PreferenceGeneralSection = () => {
  const { t } = useTranslation();
  return (
    <Container>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("preferences.general.domain")}</Heading>
          <Text>{t("preferences.general.description")}</Text>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_minmax(200px,300px)] items-center px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("preferences.general.fields.language")}
        </Text>
        <LanguageSelect />
      </div>
      <div className="px-6 py-4 space-y-4">
        <Text size="small" leading="compact" weight="plus">
          {t("preferences.general.fields.theme")}
        </Text>
        <div className="flex justify-end">
          <ThemeSelect />
        </div>
      </div>
    </Container>
  );
};

export const LanguageSelect = () => {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguagePreferences();

  const handleLanguageChange = (value: string) => {
    changeLanguage(value);
  };

  return (
    <Select onValueChange={handleLanguageChange} defaultValue={currentLanguage}>
      <Select.Trigger>
        <Select.Value placeholder={t("preferences.general.fields.language")} />
      </Select.Trigger>
      <Select.Content>
        {languages.map((option) => (
          <Select.Item key={option.code} value={option.code}>
            {option.display_name}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  );
};

export const ThemeSelect = () => {
  const { t } = useTranslation();
  const { setTheme, theme } = useTheme();

  const handleThemeChange = (value: string) => {
    setTheme(value as "light" | "dark" | "system");
  };

  return (
    <RadioGroup.Root
      onValueChange={handleThemeChange}
      defaultValue={theme}
      className="flex gap-x-4"
    >
      <RadioGroup.Item
        value="light"
        className="w-[200px] p-2 border border-ui-border-strong rounded-sm aria-checked:border-ui-border-interactive bg-[#f8f8f8] space-y-2"
      >
        <div className="space-y-2 px-2 py-1.5 rounded-md border w-full bg-neutral-100 shadow border-neutral-200">
          <div className="h-3 bg-neutral-400 rounded-md w-full" />
          <div className="h-5 bg-neutral-400 rounded-md w-full" />
        </div>
        <div className="px-2 py-1.5 rounded-md border w-full bg-neutral-100 shadow border-neutral-200 flex gap-4 items-center justify-center">
          <div className="size-5 rounded-full bg-neutral-400 " />
          <div className="h-5 flex-1 bg-neutral-400 rounded-md w-full" />
        </div>
        <Text
          size="small"
          className="text-ui-fg-subtle"
          leading="compact"
          weight="plus"
        >
          {t("app.menus.user.theme.light")}
        </Text>
      </RadioGroup.Item>
      <RadioGroup.Item
        value="dark"
        className="w-[200px] p-2 border border-ui-border-strong rounded-sm aria-checked:border-ui-border-interactive space-y-2 bg-[#1a1a1a]"
      >
        <div className="space-y-2 px-2 py-1.5 rounded-md  border w-full shadow border-neutral-600">
          <div className="h-3 bg-neutral-600  rounded-md w-full" />
          <div className="h-5 bg-neutral-600  rounded-md w-full" />
        </div>
        <div className="px-2 py-1.5 rounded-md border w-full  shadow  flex gap-4 items-center justify-center border-neutral-600">
          <div className="size-5 rounded-full bg-neutral-600 " />
          <div className="h-5 flex-1 bg-neutral-600 rounded-md w-full" />
        </div>
        <Text
          size="small"
          className="text-ui-fg-subtle"
          leading="compact"
          weight="plus"
        >
          {t("app.menus.user.theme.dark")}
        </Text>
      </RadioGroup.Item>
      <RadioGroup.Item
        value="system"
        className="w-[200px] p-2 border border-ui-border-strong rounded-sm aria-checked:border-ui-border-interactive bg-ui-bg-base space-y-2"
      >
        <div className="space-y-2 px-2 py-1.5 rounded-md border w-full bg-ui-bg-subtle shadow border-ui-border-base">
          <div className="h-3 bg-ui-fg-muted rounded-md w-full" />
          <div className="h-5 bg-ui-fg-muted rounded-md w-full" />
        </div>
        <div className="px-2 py-1.5 rounded-md border w-full bg-ui-bg-subtle shadow border-ui-border-base flex gap-4 items-center justify-center">
          <div className="size-5 rounded-full bg-ui-fg-muted" />
          <div className="h-5 flex-1 bg-ui-fg-muted rounded-md w-full" />
        </div>
        <Text
          size="small"
          className="text-ui-fg-subtle"
          leading="compact"
          weight="plus"
        >
          {t("app.menus.user.theme.system")}
        </Text>
      </RadioGroup.Item>
    </RadioGroup.Root>
  );
};
