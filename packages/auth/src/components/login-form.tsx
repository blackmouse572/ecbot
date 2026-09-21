import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Input } from "@repo/ui/common-components";
import { Suspense, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { HoneypotField, useHoneypot } from "./honeypot";
import { ITurnstileConfig, TurnstileField, useTurnstile } from "./turnstile";
import { ZodFormWrapper } from "./zod-form-wrapper";
interface ILoginForm {
  email: string;
  password: string;
  turnstileToken?: string;
}

interface ILoginFormProps extends Omit<
  React.HTMLProps<HTMLFormElement>,
  "onSubmit"
> {
  onSubmit: (data: ILoginForm) => Promise<void>;
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
    passwordPlaceholder: string;
  };
}

const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

type TLoginSchema = z.infer<typeof LoginSchema>;

const LoginForm: React.FC<ILoginFormProps> = (props: ILoginFormProps) => {
  const {
    onSubmit,
    messages,
    turnstile: turnstileConfig,
    onSubmittingChange,
    ...formProps
  } = props;

  const form = useForm<TLoginSchema>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    disabled: props.disabled,
  });

  const honeypot = useHoneypot();
  const turnstile = useTurnstile(turnstileConfig, "login");

  // Spans the whole submit lifecycle (honeypot check + turnstile wait +
  // onSubmit), not just the network call — that's the window a fast
  // double-click needs blocked.
  useEffect(() => {
    onSubmittingChange?.(form.formState.isSubmitting);
  }, [form.formState.isSubmitting, onSubmittingChange]);

  const handleSubmit = form.handleSubmit(async ({ email, password }) => {
    if (honeypot.isTrapped()) return;

    // Waits out a submit that races the invisible widget's own solve
    // instead of failing a too-fast click outright.
    const turnstileToken = await turnstile.waitForToken();
    if (turnstileConfig && !turnstileToken) return;

    try {
      await onSubmit({ email, password, turnstileToken });
    } catch {
      // react-hook-form's handleSubmit has no try/finally around onValid —
      // an unhandled rejection here would skip its isSubmitting=false
      // update and leave the submit button stuck loading forever. The
      // caller's own onError (toast/prompt) already surfaces the failure.
    } finally {
      turnstile.reset();
    }
  });

  return (
    <Form {...form}>
      <form
        {...formProps}
        onSubmit={handleSubmit}
        className="relative flex w-full flex-col gap-y-2"
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
        <TurnstileField turnstile={turnstile} />
      </form>
    </Form>
  );
};

const LoginFormWithLocale: React.FC<
  ILoginFormProps & React.ComponentProps<typeof ZodFormWrapper>
> = (props) => {
  const { locale, ...restProps } = props;

  return (
    <Suspense fallback={null}>
      <ZodFormWrapper locale={locale}>
        <LoginForm {...restProps} />
      </ZodFormWrapper>
    </Suspense>
  );
};

export { LoginFormWithLocale as LoginForm };
