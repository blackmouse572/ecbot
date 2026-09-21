import { zodResolver } from "@hookform/resolvers/zod";

import { Select } from "@medusajs/ui";
import { Input, Form, CircularLoading } from "@repo/ui/common-components";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { HoneypotField, useHoneypot } from "./honeypot";
import { ITurnstileConfig, TurnstileField, useTurnstile } from "./turnstile";
import { ZodFormWrapper } from "./zod-form-wrapper";
import { Suspense, useEffect } from "react";

interface IRegisterFormProps extends Omit<
  React.HTMLProps<HTMLFormElement>,
  "onSubmit"
> {
  onSubmit: (data: TRegisterForm) => Promise<void>;
  countries?: { label: string; value: string }[];
  /** Omit to render no widget — the form behaves exactly as before. */
  turnstile?: ITurnstileConfig;
  /**
   * Fires whenever the form's own submit lifecycle starts/ends — covers the
   * turnstile wait too, not just the network call. Wire this to the page's
   * external submit button so a too-fast double-click can't fire twice.
   */
  onSubmittingChange?: (isSubmitting: boolean) => void;
  messages: {
    emailPlaceholder: string;
    namePlaceholder: string;
    referralCodePlaceholder: string;
    countryPlaceholder: string;
    passwordPlaceholder: string;
    confirmPassword: {
      placeholder: string;
      error: {
        notMatchPassword: string;
      };
    };
  };
}

const RegisterSchema = z.object({
  email: z.email(),
  name: z.string(),
  referralCode: z.string().optional(),
  country: z.string(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
});

type TRegisterSchema = z.infer<typeof RegisterSchema>;
type TRegisterForm = Omit<TRegisterSchema, "confirmPassword"> & {
  turnstileToken?: string;
};

const RegisterForm: React.FC<IRegisterFormProps> = (
  props: IRegisterFormProps,
) => {
  const {
    onSubmit,
    messages,
    countries,
    turnstile: turnstileConfig,
    onSubmittingChange,
    ...formProps
  } = props;

  const form = useForm<TRegisterSchema>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const honeypot = useHoneypot();
  const turnstile = useTurnstile(turnstileConfig, "sign-up");

  // Spans the whole submit lifecycle (honeypot/password check + turnstile
  // wait + onSubmit), not just the network call — that's the window a fast
  // double-click needs blocked.
  useEffect(() => {
    onSubmittingChange?.(form.formState.isSubmitting);
  }, [form.formState.isSubmitting, onSubmittingChange]);

  const handleSubmit = form.handleSubmit(
    async ({
      email,
      name,
      password,
      referralCode,
      confirmPassword,
      country,
    }) => {
      if (honeypot.isTrapped()) return;
      if (password !== confirmPassword) {
        form.setError("confirmPassword", {
          type: "manual",
          message: messages.confirmPassword.error.notMatchPassword,
        });
        return;
      }
      // Waits out a submit that races the invisible widget's own solve
      // instead of failing a too-fast click outright.
      const turnstileToken = await turnstile.waitForToken();
      if (turnstileConfig && !turnstileToken) return;

      try {
        await onSubmit({
          email,
          name,
          password,
          referralCode,
          country,
          turnstileToken,
        });
      } catch {
        // react-hook-form's handleSubmit has no try/finally around onValid —
        // an unhandled rejection here would skip its isSubmitting=false
        // update and leave the submit button stuck loading forever. The
        // caller's own onError (toast/prompt) already surfaces the failure.
      } finally {
        turnstile.reset();
      }
    },
  );

  return (
    <Form {...form}>
      <form
        {...formProps}
        onSubmit={handleSubmit}
        className="relative flex w-full flex-col gap-y-3"
      >
        <HoneypotField ref={honeypot.ref} />
        <Form.Field
          control={form.control}
          name="email"
          render={({ field, fieldState }) => {
            return (
              <Form.Item>
                <Form.Control>
                  <Input
                    autoComplete="email"
                    errorMessage={fieldState.error?.message}
                    {...field}
                    className="bg-ui-bg-field-component"
                    placeholder={messages.emailPlaceholder}
                  />
                </Form.Control>
              </Form.Item>
            );
          }}
        />
        <Form.Field
          control={form.control}
          name="name"
          render={({ field, fieldState }) => {
            return (
              <Form.Item>
                <Form.Control>
                  <Input
                    autoComplete="name"
                    errorMessage={fieldState.error?.message}
                    {...field}
                    className="bg-ui-bg-field-component"
                    placeholder={messages.namePlaceholder}
                  />
                </Form.Control>
              </Form.Item>
            );
          }}
        />
        {countries && countries.length > 0 && (
          <Form.Field
            control={form.control}
            name="country"
            render={({ field }) => {
              return (
                <Form.Item>
                  <Form.Control>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                      }}
                      value={field.value}
                    >
                      <Select.Trigger>
                        <Select.Value
                          placeholder={messages.countryPlaceholder}
                        />
                      </Select.Trigger>
                      <Select.Content>
                        {countries.map((item) => (
                          <Select.Item key={item.value} value={item.value}>
                            {item.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </Form.Control>
                </Form.Item>
              );
            }}
          />
        )}
        <Form.Field
          control={form.control}
          name="referralCode"
          render={({ field, fieldState }) => {
            return (
              <Form.Item>
                <Form.Control>
                  <Input
                    type="number"
                    errorMessage={fieldState.error?.message}
                    {...field}
                    className="bg-ui-bg-field-component"
                    placeholder={messages.referralCodePlaceholder}
                  />
                </Form.Control>
              </Form.Item>
            );
          }}
        />
        <Form.Field
          control={form.control}
          name="password"
          render={({ field, fieldState }) => {
            return (
              <Form.Item>
                <Form.Control>
                  <Input
                    type="password"
                    errorMessage={fieldState.error?.message}
                    autoComplete="current-password"
                    {...field}
                    className="bg-ui-bg-field-component"
                    placeholder={messages.passwordPlaceholder}
                  />
                </Form.Control>
              </Form.Item>
            );
          }}
        />
        <Form.Field
          control={form.control}
          name="confirmPassword"
          render={({ field, fieldState }) => {
            return (
              <Form.Item>
                <Form.Control>
                  <Input
                    type="password"
                    errorMessage={fieldState.error?.message}
                    {...field}
                    className="bg-ui-bg-field-component"
                    placeholder={messages.confirmPassword.placeholder}
                  />
                </Form.Control>
              </Form.Item>
            );
          }}
        />
        <TurnstileField turnstile={turnstile} />
      </form>
    </Form>
  );
};

const RegisterFormWithLocale: React.FC<
  IRegisterFormProps & React.ComponentProps<typeof ZodFormWrapper>
> = (props) => {
  const { locale, ...restProps } = props;

  return (
    <Suspense fallback={<CircularLoading />}>
      <ZodFormWrapper locale={locale}>
        <RegisterForm {...restProps} />
      </ZodFormWrapper>
    </Suspense>
  );
};

export { RegisterFormWithLocale as RegisterForm };
