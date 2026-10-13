import { useLogout } from "@/hooks/api";
import { useCreateWorkspace } from "@/hooks/api/workspace";
import { readApiError } from "@/libs/api-error";
import { ROUTES } from "@/routes/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { businessTypeIcon } from "@/routes/chatbot/chatbot-create/agent-builder/components/business-type-icon";
import { EllipsisHorizontal } from "@medusajs/icons";
import { Button, Heading, Input, RadioGroup, Text, toast } from "@medusajs/ui";
import { TEMPLATE_TYPES } from "@repo/agent-blueprint";
import { Form, LogoBox } from "@repo/ui/common-components";
import type { FC } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { OTHER_BUSINESS_TYPE } from "../../constants";
import { onboardWelcomeSchema, type OnboardWelcomeValues } from "../../schemas";
import { suffixedWorkspaceSlug } from "../../utils/suffixed-workspace-slug";

type Props = {
  /** Called before the workspace is created, so the page stops redirecting
   * to the dashboard the moment the new workspace appears in the list. */
  onStart?: () => void;
};

const slugOf = (res: unknown) =>
  (res as { data?: { data?: { slug?: string } } })?.data?.data?.slug;

/**
 * The first screen after signup: the business name and type. The workspace is
 * created from the name (address generated, avatar later) and the owner lands
 * straight in the agent builder with that type's template.
 */
export const OnboardWelcomeForm: FC<Props> = ({ onStart }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useLogout();
  const { mutateAsync: createWorkspace } = useCreateWorkspace();
  const form = useForm<OnboardWelcomeValues>({
    resolver: zodResolver(onboardWelcomeSchema),
    defaultValues: { name: "", type: "" },
  });

  // The name's address may be taken by another workspace: try once more with
  // a short random suffix rather than asking the owner to pick one.
  const create = async (name: string) => {
    try {
      return slugOf(await createWorkspace({ name }));
    } catch (e) {
      if ((e as { status?: number })?.status !== 409) throw e;
      return slugOf(
        await createWorkspace({ name, slug: suffixedWorkspaceSlug(name) }),
      );
    }
  };

  const handleSubmit = form.handleSubmit(async ({ name, type }) => {
    onStart?.();
    try {
      const slug = await create(name);
      if (!slug) throw new Error("missing workspace slug");
      const params = new URLSearchParams();
      if (type && type !== OTHER_BUSINESS_TYPE) params.set("template", type);
      params.set("businessName", name);
      navigate(`/${slug}/${ROUTES.Chatbot}/create?${params}`);
    } catch (e) {
      toast.error(readApiError(e).message ?? t("onboard.create.toast.error"));
    }
  });

  const choices = [
    ...TEMPLATE_TYPES.map((type) => ({
      value: type,
      label: t(`agentBuilder.types.${type}`),
      icon: businessTypeIcon(type),
    })),
    {
      value: OTHER_BUSINESS_TYPE,
      label: t("onboard.welcome.other"),
      icon: <EllipsisHorizontal />,
    },
  ];

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-8 px-4 py-8"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <LogoBox />
          <div>
            <Heading className="font-bold">
              {t("onboard.welcome.title")}
            </Heading>
            <Text size="small" leading="normal" className="text-ui-fg-subtle">
              {t("onboard.welcome.description")}
            </Text>
          </div>
        </div>
        <div className="flex w-full flex-col gap-6">
          <Form.Field
            name="name"
            control={form.control}
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("onboard.welcome.fields.name")}</Form.Label>
                <Form.Control>
                  <Input
                    placeholder={t("onboard.welcome.placeholders.name")}
                    {...field}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            name="type"
            control={form.control}
            render={({ field }) => (
              <Form.Item>
                <Form.Label optional>
                  {t("onboard.welcome.fields.type")}
                </Form.Label>
                <Form.Control>
                  <RadioGroup
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    {choices.map((choice) => (
                      <label
                        key={choice.value}
                        className="shadow-borders-base bg-ui-bg-base hover:bg-ui-bg-base-hover has-[[data-state=checked]]:shadow-borders-interactive-with-active flex cursor-pointer items-center gap-x-3 rounded-lg px-3 py-2.5 transition-[color,background-color,box-shadow]"
                      >
                        <RadioGroup.Item value={choice.value} />
                        <span className="text-ui-fg-subtle flex shrink-0">
                          {choice.icon}
                        </span>
                        <Text size="small" weight="plus" leading="compact">
                          {choice.label}
                        </Text>
                      </label>
                    ))}
                  </RadioGroup>
                </Form.Control>
              </Form.Item>
            )}
          />
        </div>
        <div className="flex w-full max-w-[300px] flex-col items-center gap-3">
          <Button
            type="submit"
            className="w-full"
            isLoading={form.formState.isSubmitting}
          >
            {t("onboard.welcome.submit")}
          </Button>
          <Text size="small" className="text-ui-fg-subtle text-center">
            {t("onboard.welcome.invited")}{" "}
            <Link
              to={`/${ROUTES.Onboard}/${ROUTES.OnboardJoin}`}
              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover whitespace-nowrap"
            >
              {t("onboard.welcome.joinLink")}
            </Link>
          </Text>
          <Button
            type="button"
            variant="transparent"
            size="small"
            onClick={() => logout()}
          >
            {t("app.menus.actions.logout")}
          </Button>
        </div>
      </form>
    </Form>
  );
};
