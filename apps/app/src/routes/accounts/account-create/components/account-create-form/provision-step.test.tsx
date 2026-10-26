import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProvisionStep } from "./provision-step";

vi.mock("@/hooks/api/accounts", () => ({
  useProvisionApiChannel: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useProvisionWebsiteWidget: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("ProvisionStep: name placeholder (#257)", () => {
  it.each([
    [
      "WEBSITE_WIDGET",
      "accounts.create.provision.websiteWidget.namePlaceholder",
    ],
    ["API_CHANNEL", "accounts.create.provision.apiChannel.namePlaceholder"],
  ] as const)("gives %s its own example name", (platform, placeholder) => {
    render(
      <ProvisionStep platform={platform} onBack={vi.fn()} onIssued={vi.fn()} />,
    );
    expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument();
  });
});
