import { useLogout } from "@/hooks/api";
import i18n from "@/i18n";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Heading, RadioGroup, Text } from "@medusajs/ui";
import { Form, LogoBox } from "@repo/ui/common-components";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import z from "zod/v4";

// Define the schema for workspace creation/select
const onboardSelectWorkspaceSchema = z.object({
  workspace: z.string().min(1, "Workspace is required"),
});

type OnboardSelectWorkspaceFormValues = z.infer<
  typeof onboardSelectWorkspaceSchema
>;

const workspaces = [
  {
    label: i18n.t("onboard.select.create.label"),
    value: "new",
    description: i18n.t("onboard.select.create.description"),
  },
  {
    label: i18n.t("onboard.select.join.label"),
    value: "join",
    description: i18n.t("onboard.select.join.description"),
  },
];

export const OnboardSelectWorkspaceForm = ({
  onSubmit,
  onBack,
}: {
  onSubmit: (data: OnboardSelectWorkspaceFormValues) => void;
  onBack?: () => void;
}) => {
  const { t } = useTranslation();
  const form = useForm<OnboardSelectWorkspaceFormValues>({
    resolver: zodResolver(onboardSelectWorkspaceSchema),
    defaultValues: { workspace: "new" },
    mode: "onChange",
  });
  const logout = useLogout();

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex size-full flex-col max-w-[720px] mx-auto items-center justify-center gap-12"
      >
        <div className="space-y-4 flex flex-col items-center justify-center">
          <LogoBox />
          <div className="text-center">
            <Heading className="font-bold">
              {t("onboard.select.welcome")}
            </Heading>
            <Text size="small" leading="normal" className="text-ui-fg-subtle">
              {t("onboard.select.description")}
            </Text>
          </div>
        </div>
        <div className="w-full space-y-8">
          <Form.Field
            control={form.control}
            name="workspace"
            render={({ field }) => {
              return (
                <Form.Item>
                  <Form.Control>
                    <RadioGroup
                      key={"workspace"}
                      className="flex gap-8"
                      {...field}
                      onValueChange={field.onChange}
                    >
                      {workspaces.map((workspace) => {
                        return (
                          <RadioGroup.ChoiceBox
                            className="flex-1"
                            key={workspace.value}
                            value={workspace.value}
                            label={workspace.label}
                            description={workspace.description}
                          />
                        );
                      })}
                    </RadioGroup>
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              );
            }}
          />
          <div className="mx-auto max-w-[300px] space-y-2">
            <Button type="submit" variant="primary" className="w-full">
              {t("actions.continued")}
            </Button>
            {onBack ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={onBack}
              >
                {t("actions.back")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="transparent"
                className="w-full underline"
                onClick={() => logout()}
              >
                {t("app.menus.actions.logout")}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
};
