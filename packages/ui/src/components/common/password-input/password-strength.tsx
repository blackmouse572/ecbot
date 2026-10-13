import { CheckMini, XMarkMini } from "@medusajs/icons";
import { clx } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { PASSWORD_REQUIREMENTS } from "../../../utils/password";

const TOTAL = PASSWORD_REQUIREMENTS.length;

const barColor = (score: number) => {
  if (score <= 1) return "bg-ui-tag-red-icon";
  if (score < TOTAL) return "bg-ui-tag-orange-icon";
  return "bg-ui-tag-green-icon";
};

const strengthKey = (score: number) => {
  if (score === 0) return "empty";
  if (score <= 2) return "weak";
  if (score < TOTAL) return "medium";
  return "strong";
};

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

const PasswordStrength: FC<PasswordStrengthProps> = ({
  password,
  className,
}) => {
  const { t } = useTranslation();
  const requirements = PASSWORD_REQUIREMENTS.map(({ key, regex }) => ({
    key,
    met: regex.test(password),
  }));
  const score = requirements.filter(({ met }) => met).length;

  return (
    <div className={clx("flex flex-col gap-y-2", className)}>
      <div
        role="progressbar"
        aria-label={t("password.strength.label")}
        aria-valuemin={0}
        aria-valuemax={TOTAL}
        aria-valuenow={score}
        className="flex gap-1"
      >
        {requirements.map(({ key }, index) => (
          <div
            key={key}
            className={clx(
              "h-1 flex-1 rounded-full transition-colors duration-500",
              index < score ? barColor(score) : "bg-ui-border-base",
            )}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="txt-compact-small-plus text-ui-fg-base">
          {t(`password.strength.${strengthKey(score)}`)}
        </p>
        <span className="txt-compact-xsmall text-ui-fg-muted">
          {t("password.strength.count", { count: score, total: TOTAL })}
        </span>
      </div>

      <ul
        aria-label={t("password.requirements.label")}
        className="flex flex-col gap-y-1"
      >
        {requirements.map(({ key, met }) => (
          <li key={key} className="flex items-center gap-x-1">
            {met ? (
              <CheckMini aria-hidden className="text-ui-tag-green-icon" />
            ) : (
              <XMarkMini aria-hidden className="text-ui-fg-muted" />
            )}
            <span
              className={clx(
                "txt-compact-xsmall transition-fg",
                met ? "text-ui-tag-green-text" : "text-ui-fg-muted",
              )}
            >
              {t(`password.requirements.${key}`)}
              <span className="sr-only">
                {" "}
                {met
                  ? t("password.strength.met")
                  : t("password.strength.notMet")}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export { PasswordStrength };
