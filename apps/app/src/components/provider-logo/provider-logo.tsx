import { clx } from "@medusajs/ui";
import { PROVIDER_LOGO_ALIASES, PROVIDER_LOGOS } from "./provider-logos";

type ProviderLogoProps = {
  /** OpenRouter provider slug, the part of a model id before the slash. */
  provider: string;
  size?: number; // px, default 16
  className?: string;
};

/**
 * A model provider's logo, or its first letter when we have no logo. Decorative:
 * always show the provider or model name next to it.
 */
export const ProviderLogo = ({
  provider,
  size = 16,
  className,
}: ProviderLogoProps) => {
  const slug = PROVIDER_LOGO_ALIASES[provider] ?? provider;
  const mono = PROVIDER_LOGOS[slug];
  const style = { width: size, height: size };

  if (mono === undefined) {
    return (
      <span
        aria-hidden
        className={clx(
          "bg-ui-bg-component text-ui-fg-subtle shadow-borders-base inline-flex shrink-0 items-center justify-center rounded-[4px] text-[10px] leading-none font-medium",
          className,
        )}
        style={style}
      >
        {provider.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={`/icons/providers/${slug}.svg`}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={clx("shrink-0", mono && "dark:invert", className)}
      style={style}
    />
  );
};
