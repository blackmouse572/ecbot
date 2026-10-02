import "@/i18n";
import { Form } from "@repo/ui/common-components";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  create: (async () => ({})) as (body: unknown) => Promise<unknown>,
  success: [] as string[],
}));
const toast = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock("@/hooks/api/workspace", () => ({
  useCreateWorkspace: () => ({
    mutateAsync: (body: unknown) => state.create(body),
  }),
}));

vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return { ...actual, toast };
});

vi.mock("@/components/modals", () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return {
    useRouteModal: () => ({
      handleSuccess: (to: string) => state.success.push(to),
    }),
    RouteFocusModal: Object.assign(Pass, {
      Form: ({ form, children }: { form: never; children: ReactNode }) => (
        <Form {...(form as object)}>{children}</Form>
      ),
      Header: Pass,
      Body: Pass,
      Footer: Pass,
      Close: Pass,
    }),
  };
});

import { OnboardCreateForm } from "./onboard-create-form";

const submit = (container: HTMLElement) => {
  fireEvent.change(container.querySelector('input[name="name"]')!, {
    target: { value: "Kunmart" },
  });
  fireEvent.submit(container.querySelector("form")!);
};

const renderForm = () =>
  render(
    <MemoryRouter>
      <OnboardCreateForm />
    </MemoryRouter>,
  );

describe("OnboardCreateForm", () => {
  beforeEach(() => {
    toast.error.mockReset();
    toast.success.mockReset();
    state.success = [];
  });

  it("opens the new workspace after creating it", async () => {
    state.create = async () => ({ data: { data: { slug: "kunmart" } } });
    const { container } = renderForm();

    submit(container);

    await waitFor(() => expect(state.success).toEqual(["/kunmart"]));
    expect(toast.success).toHaveBeenCalled();
  });

  it("shows the API's reason when creating fails", async () => {
    state.create = async () => {
      throw Object.assign(new Error("Request failed with status code 500"), {
        status: 500,
        response: {
          status: 500,
          data: { statusCode: 5000, message: "Storage is not available" },
        },
      });
    };
    const { container } = renderForm();

    submit(container);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Storage is not available"),
    );
  });

  it("calls the slug a web address and previews it from the name", () => {
    const { container } = renderForm();

    expect(screen.getByText("Web address")).toBeInTheDocument();
    expect(screen.queryByText(/slug/i)).not.toBeInTheDocument();

    fireEvent.change(container.querySelector('input[name="name"]')!, {
      target: { value: "Cửa hàng Kunmart" },
    });

    expect(
      screen.getByText(`${window.location.origin}/cua-hang-kunmart`),
    ).toBeInTheDocument();
  });

  it("previews the typed web address over the one from the name", () => {
    const { container } = renderForm();

    fireEvent.change(container.querySelector('input[name="name"]')!, {
      target: { value: "Kunmart" },
    });
    fireEvent.change(container.querySelector('input[name="handler"]')!, {
      target: { value: "kun-shop" },
    });

    expect(
      screen.getByText(`${window.location.origin}/kun-shop`),
    ).toBeInTheDocument();
  });
});
