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
import { afterEach, describe, expect, it, vi } from "vitest";
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
  afterEach(() => vi.restoreAllMocks());

  it("says Calling while a call runs and Called with its time once it returns", async () => {
    // Real time must not pass the reported 312ms while the test renders.
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-01T10:00:00Z"));
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

  describe("step timer", () => {
    afterEach(() => vi.useRealTimers());

    it("holds its count when the server reports a shorter time", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-10-01T10:00:00.000Z"));
      const running = call({ status: "running", durationMs: undefined });
      const { rerender } = render(<ToolTrace toolCalls={[running]} running />);

      vi.setSystemTime(new Date("2026-10-01T10:00:00.600Z"));
      rerender(<ToolTrace toolCalls={[call({ durationMs: 274 })]} running />);
      expect(screen.getByText("600ms")).toBeInTheDocument();
    });

    it("uses the server's time when it is the longer one", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-10-01T10:00:00.000Z"));
      const running = call({ status: "running", durationMs: undefined });
      const { rerender } = render(<ToolTrace toolCalls={[running]} running />);

      vi.setSystemTime(new Date("2026-10-01T10:00:00.100Z"));
      rerender(<ToolTrace toolCalls={[call({ durationMs: 312 })]} running />);
      expect(screen.getByText("312ms")).toBeInTheDocument();
    });
  });

  it("stops a call the turn ended without an answer for", () => {
    render(
      <ToolTrace
        toolCalls={[call({ status: "running", durationMs: undefined })]}
        running={false}
      />,
    );
    expect(row(/Failed lookup_order/)).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("never counts more failures than tools", () => {
    render(
      <ToolTrace
        running={false}
        toolCalls={[
          call({ invocationId: "a" }),
          call({
            invocationId: "b",
            kind: "skill",
            toolName: "load_skill",
            status: "error",
            error: "x",
          }),
          call({ invocationId: "c", status: "error", error: "x" }),
        ]}
      />,
    );
    expect(
      screen.getByRole("button", { name: /^3 tools, 2 failed/ }),
    ).toBeInTheDocument();
  });

  it("shows a long call in seconds", () => {
    render(
      <ToolTrace toolCalls={[call({ durationMs: 28734 })]} running={false} />,
    );
    expect(screen.getByText("28.7s")).toBeInTheDocument();
  });

  it("names an HTTP tool by its display name and an MCP action by the action", () => {
    render(
      <ToolTrace
        running={false}
        toolCalls={[
          call({
            invocationId: "a",
            toolName: "search-products",
            label: "Product search",
          }),
          call({
            invocationId: "b",
            kind: "mcp",
            toolName: "get_order",
            label: "Shopify",
          }),
        ]}
      />,
    );
    expect(row(/Called Product search HTTP/)).toBeInTheDocument();
    expect(row(/Called get_order Shopify/)).toBeInTheDocument();
  });
});
