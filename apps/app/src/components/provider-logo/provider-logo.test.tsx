import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProviderLogo } from "./provider-logo";

const logoSrc = (provider: string) =>
  render(<ProviderLogo provider={provider} />)
    .container.querySelector("img")
    ?.getAttribute("src");

describe("ProviderLogo", () => {
  it("renders the provider's logo file", () => {
    expect(logoSrc("openai")).toBe("/icons/providers/openai.svg");
  });

  it("reuses a shared logo for aliased providers", () => {
    expect(logoSrc("meta-llama")).toBe("/icons/providers/meta.svg");
  });

  it("falls back to the provider's first letter", () => {
    expect(logoSrc("sakana")).toBeUndefined();
    expect(screen.getByText("S")).toBeInTheDocument();
  });
});
