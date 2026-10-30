import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HttpToolForm, type HttpToolFormProps } from "./http-tool-form";

const renderForm = (
  onTest: HttpToolFormProps["onTest"],
  defaults: HttpToolFormProps["defaultValues"] = {},
) =>
  render(
    <HttpToolForm
      defaultValues={{
        name: "Search",
        description: "Search products",
        httpMethod: "GET",
        httpUrl: "https://api.example.com/search",
        ...defaults,
      }}
      onSubmit={vi.fn()}
      onTest={onTest}
      submitLabel="Create"
    />,
  );

// #178: the test result had a tiny scroll area, and an API error showed the
// axios text instead of the reason.
describe("HttpToolForm test endpoint", () => {
  it("shows the API's reason when the test call fails", async () => {
    const onTest = vi.fn().mockRejectedValue({
      message: "Request failed with status code 400",
      response: { status: 400, data: { message: "The URL is not allowed." } },
    });
    renderForm(onTest);

    fireEvent.click(screen.getByRole("button", { name: "Run Test" }));

    expect(await screen.findByText("The URL is not allowed.")).toBeTruthy();
  });

  it("gives a long result room to read", async () => {
    const onTest = vi.fn().mockResolvedValue({
      status: "SUCCESS",
      durationMs: 12,
      result: { items: Array.from({ length: 50 }, (_, i) => ({ id: i })) },
    });
    renderForm(onTest);

    fireEvent.click(screen.getByRole("button", { name: "Run Test" }));

    const result = await screen.findByText(/"items"/);
    expect(result.className).toContain("max-h-[60vh]");
  });

  it("previews where each test argument will be sent", async () => {
    renderForm(vi.fn(), {
      httpUrl: "https://api.example.com/products/{id}",
    });

    fireEvent.change(screen.getByPlaceholderText("{}"), {
      target: { value: '{"id": 1, "lang": "vi"}' },
    });

    expect(
      await screen.findByText("GET https://api.example.com/products/1?lang=vi"),
    ).toBeTruthy();
  });

  it("previews a missing path argument before the test runs", async () => {
    renderForm(vi.fn(), {
      httpUrl: "https://api.example.com/products/{id}",
    });

    fireEvent.change(screen.getByPlaceholderText("{}"), {
      target: { value: "{}" },
    });

    expect(
      await screen.findByText(
        'Add "id" to the args: the URL needs it for {id}.',
      ),
    ).toBeTruthy();
  });
});
