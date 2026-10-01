import "@/i18n";
import type { ChatToolCall } from "@/types/chat-message";
import { TooltipProvider } from "@medusajs/ui";
import {
  fireEvent,
  render as rtlRender,
  screen,
  within,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { ToolTrace } from "./tool-trace";

const call = (over: Partial<ChatToolCall> = {}): ChatToolCall => ({
  invocationId: "r1",
  toolName: "lookup_order",
  args: { orderId: "10482" },
  status: "success",
  result: { status: "shipped" },
  durationMs: 312,
  kind: "http",
  ...over,
});

// The copy button's tooltip needs the app-wide provider.
const render = (ui: ReactElement) =>
  rtlRender(ui, {
    wrapper: ({ children }) => <TooltipProvider>{children}</TooltipProvider>,
  });

const row = (name: RegExp) => screen.getByRole("button", { name });

describe("ToolTrace", () => {
  it("says Calling while a call runs and Called with its time once it returns", async () => {
    const { rerender } = render(
      <ToolTrace
        toolCalls={[call({ status: "running", durationMs: undefined })]}
        running
      />,
    );
    expect(row(/Calling lookup_order/)).toBeInTheDocument();

    rerender(<ToolTrace toolCalls={[call()]} running={false} />);
    expect(
      await screen.findByRole("button", { name: /Called lookup_order/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("312ms")).toBeInTheDocument();
  });

  it("names each kind of step", () => {
    render(
      <ToolTrace
        running={false}
        knowledgeCount={3}
        toolCalls={[
          call({
            invocationId: "a",
            kind: "skill",
            toolName: "load_skill",
            args: { slug: "refunds" },
          }),
          call({
            invocationId: "b",
            status: "error",
            error: "HTTP 409",
            toolName: "update_address",
          }),
          call({
            invocationId: "c",
            kind: "handoff",
            toolName: "apply_customer_tag",
            args: { name: "vip" },
          }),
        ]}
      />,
    );
    expect(row(/Loaded skill refunds/)).toBeInTheDocument();
    expect(row(/Failed update_address/)).toBeInTheDocument();
    expect(row(/Handed over to staff/)).toBeInTheDocument();
    expect(screen.getByText("Searched knowledge base")).toBeInTheDocument();
    expect(screen.getByText("3 sources")).toBeInTheDocument();
  });

  it("sums the turn up and ends with Done once it finishes", () => {
    const calls = [
      call({ invocationId: "a" }),
      call({ invocationId: "b", kind: "mcp", status: "error", error: "x" }),
    ];
    const { rerender } = render(<ToolTrace toolCalls={calls} running />);
    expect(screen.queryByText("Done")).not.toBeInTheDocument();

    rerender(<ToolTrace toolCalls={calls} running={false} />);
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /2 tools, 1 failed/ }),
    ).toBeInTheDocument();
  });

  it("opens a finished call's arguments and result", () => {
    render(<ToolTrace toolCalls={[call()]} running={false} />);
    const step = row(/Called lookup_order/);
    expect(step).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(step);
    expect(step).toHaveAttribute("aria-expanded", "true");
    const detail = screen.getByRole("region", { name: /lookup_order/ });
    expect(within(detail).getByText("Arguments")).toBeInTheDocument();
    expect(within(detail).getByText("Result")).toBeInTheDocument();
    expect(within(detail).getByText('"shipped"')).toBeInTheDocument();
  });

  it("shows a failed call's error instead of a result", () => {
    render(
      <ToolTrace
        toolCalls={[
          call({ status: "error", result: undefined, error: "HTTP 409" }),
        ]}
        running={false}
      />,
    );
    fireEvent.click(row(/Failed lookup_order/));
    const detail = screen.getByRole("region", { name: /lookup_order/ });
    expect(within(detail).getByText("Error")).toBeInTheDocument();
    expect(within(detail).getByText('"HTTP 409"')).toBeInTheDocument();
  });
});
