import { Eye, EyeSlash } from "@medusajs/icons";
import { clx } from "@medusajs/ui";
import { useId, useState, type ComponentProps } from "react";
import { useTranslation } from "react-i18next";

interface PasswordInputProps extends Omit<ComponentProps<"input">, "type"> {
  errorMessage?: string;
}

// A plain <input> with Medusa's field styles: @medusajs/ui's Input adds its own
// untranslated toggle whenever type="password".
const PasswordInput = ({
  errorMessage,
  className,
  disabled,
  "aria-describedby": ariaDescribedBy,
  ...props
}: PasswordInputProps) => {
  const { t } = useTranslation();
  const errorId = useId();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div>
      <div className="relative">
        <input
          {...props}
          type={isVisible ? "text" : "password"}
          disabled={disabled}
          aria-invalid={!!errorMessage}
          aria-describedby={errorMessage ? errorId : ariaDescribedBy}
          className={clx(
            "caret-ui-fg-base bg-ui-bg-field hover:bg-ui-bg-field-hover shadow-borders-base placeholder-ui-fg-muted text-ui-fg-base transition-fg txt-compact-small relative h-8 w-full appearance-none rounded-md py-1.5 ps-2 pe-9 outline-none",
            "focus-visible:shadow-borders-interactive-with-active",
            "disabled:text-ui-fg-disabled disabled:!bg-ui-bg-disabled disabled:placeholder-ui-fg-disabled disabled:cursor-not-allowed",
            "aria-[invalid=true]:!shadow-borders-error",
            className,
          )}
        />
        <button
          type="button"
          aria-label={isVisible ? t("password.hide") : t("password.show")}
          aria-pressed={isVisible}
          disabled={disabled}
          onClick={() => setIsVisible((visible) => !visible)}
          className="text-ui-fg-muted hover:text-ui-fg-base focus-visible:text-ui-fg-base focus-visible:shadow-borders-focus transition-fg absolute inset-y-0 end-0 flex w-9 items-center justify-center rounded-e-md outline-none disabled:pointer-events-none disabled:text-ui-fg-disabled"
        >
          {isVisible ? <EyeSlash aria-hidden /> : <Eye aria-hidden />}
        </button>
      </div>
      {errorMessage && (
        <p
          id={errorId}
          role="alert"
          className="txt-compact-xsmall text-ui-fg-error mt-1"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export { PasswordInput };
