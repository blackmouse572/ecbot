import { clx } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

// Flat exports from Figma — headline and agent tags are baked into the artwork.
const HERO_SRC = {
  login: "/images/auth/auth-hero-login.webp",
  signup: "/images/auth/auth-hero-signup.webp",
} as const;

function AuthHero({
  variant,
  className,
}: {
  variant: keyof typeof HERO_SRC;
  className?: string;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: "app.auth.hero" });

  return (
    <img
      src={HERO_SRC[variant]}
      alt={t(`${variant}.alt`)}
      className={clx(
        "h-full min-w-0 flex-1 rounded-[10px] object-cover",
        className,
      )}
    />
  );
}

export { AuthHero };
