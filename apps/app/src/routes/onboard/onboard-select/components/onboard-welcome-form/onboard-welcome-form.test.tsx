import "@/i18n";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  bodies: [] as { name: string; slug?: string }[],
  create: (async () => ({})) as (body: {
    name: string;
    slug?: string;
  }) => Promise<unknown>,
  navigated: [] as string[],
}));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock("@/hooks/api/workspace", () => ({
  useCreateWorkspace: () => ({
    mutateAsync: (body: { name: string; slug?: string }) => {
      state.bodies.push(body);
      return state.create(body);
    },
  }),
}));
vi.mock("@/hooks/api", () => ({ useLogout: () => () => {} }));
vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return { ...actual, toast };
});
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return { ...actual, useNavigate: () => (to: string) => state.navigated.push(to) };
});

import { OnboardWelcomeForm } from "./onboard-welcome-form";

const created = (slug: string) => async () => ({ data: { data: { slug } } });

const renderForm = () =>
  render(
    <MemoryRouter>
      <OnboardWelcomeForm />
    </MemoryRouter>,
  );

const typeName = (value: string) =>
  fireEvent.change(screen.getByRole("textbox"), { target: { value } });

describe("OnboardWelcomeForm", () => {
  beforeEach(() => {
    state.bodies = [];
    state.navigated = [];
    toast.error.mockReset();
  });

  it("creates the workspace from the shop name and opens the builder on the picked type", async () => {
    state.create = created("tiem-banh-may");
    renderForm();

    typeName("Tiệm bánh Mây");
    fireEvent.click(screen.getByRole("radio", { name: /Restaurant/ }));
    fireEvent.click(screen.getByRole("button", { name: /Create my first agent/ }));

    await waitFor(() =>
      expect(state.navigated).toEqual([
        "/tiem-banh-may/chatbot/create?template=restaurant&businessName=Ti%E1%BB%87m+b%C3%A1nh+M%C3%A2y",
      ]),
    );
    expect(state.bodies).toEqual([{ name: "Tiệm bánh Mây" }]);
  });

  it("opens the builder's describe step when the type is Other", async () => {
    state.create = created("kunmart");
    renderForm();

    typeName("Kunmart");
    fireEvent.click(screen.getByRole("radio", { name: /Other/ }));
    fireEvent.click(screen.getByRole("button", { name: /Create my first agent/ }));

    await waitFor(() =>
      expect(state.navigated).toEqual([
        "/kunmart/chatbot/create?businessName=Kunmart",
      ]),
    );
  });

  it("retries with a suffixed address when the name's address is taken", async () => {
    state.create = async (body) => {
      if (!body.slug) throw { status: 409 };
      return { data: { data: { slug: body.slug } } };
    };
    renderForm();

    typeName("Kunmart");
    fireEvent.click(screen.getByRole("button", { name: /Create my first agent/ }));

    await waitFor(() => expect(state.navigated).toHaveLength(1));
    expect(state.bodies[1].slug).toMatch(/^kunmart-[a-z0-9]{4}$/);
    expect(state.navigated[0]).toMatch(/^\/kunmart-[a-z0-9]{4}\/chatbot\/create\?/);
  });

  it("asks for the shop name before creating anything", async () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: /Create my first agent/ }));

    expect(await screen.findByText("Please fill out this field")).toBeInTheDocument();
    expect(state.bodies).toEqual([]);
  });

  it("links invited people to joining an existing workspace", () => {
    renderForm();

    expect(screen.getByRole("link", { name: /Join with a code/ })).toHaveAttribute(
      "href",
      "/onboard/join",
    );
  });
});
