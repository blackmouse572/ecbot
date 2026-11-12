import "@/i18n";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/modals", () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;

  return {
    RouteFocusModal: Object.assign(Pass, {
      Body: Pass,
      Footer: Pass,
      Close: Pass,
    }),
  };
});

import { ImportFileStep } from "./import-file-step";

describe("ImportFileStep", () => {
  it("offers the sample file as a CSV download", () => {
    const { container } = render(<ImportFileStep onFile={vi.fn()} />);
    const link = container.querySelector("a[download]");

    expect(link?.getAttribute("download")).toBe("order-import-template.csv");
    expect(decodeURIComponent(link?.getAttribute("href") ?? "")).toContain(
      "Order code,Phone,Customer name",
    );
  });
});
