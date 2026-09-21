/**
 * eccho website chat widget loader.
 *
 * Embedded on a customer's own page as:
 *   <script src="https://app.eccho.io/widget.js" data-widget-key="..."></script>
 *
 * Deliberately dependency-free, hand-written, and styled with inline styles
 * only. The app's Tailwind build ships a global Preflight reset — injecting it
 * into someone else's page would rewrite their typography, buttons and form
 * controls. Everything visual beyond this launcher lives inside the iframe,
 * where our CSS cannot escape and theirs cannot leak in.
 *
 * The widget key is public by design (ADR-0014). What restricts where this
 * renders is the `frame-ancestors` CSP the iframe page is served with.
 */
(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var widgetKey = script.getAttribute("data-widget-key");
  if (!widgetKey) {
    console.error("[eccho] widget.js requires a data-widget-key attribute");
    return;
  }

  // Same origin the script was served from, so a self-hosted or staging
  // deployment works without a second configuration knob.
  var origin = new URL(script.src).origin;
  var color = script.getAttribute("data-color") || "#0f766e";
  var label = script.getAttribute("data-label") || "Chat";
  var zIndex = script.getAttribute("data-z-index") || "2147483000";

  var open = false;
  var unread = 0;

  var bubble = document.createElement("button");
  bubble.type = "button";
  bubble.setAttribute("aria-label", label);
  applyStyles(bubble, {
    position: "fixed",
    right: "20px",
    bottom: "20px",
    width: "56px",
    height: "56px",
    borderRadius: "9999px",
    border: "none",
    cursor: "pointer",
    background: color,
    color: "#fff",
    boxShadow: "0 6px 24px rgba(0,0,0,.18)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: zIndex,
    padding: "0",
    // The host page's reset may have changed these; state them explicitly.
    font: "500 14px/1 system-ui, -apple-system, Segoe UI, sans-serif",
  });
  bubble.innerHTML = chatIcon();

  var badge = document.createElement("span");
  applyStyles(badge, {
    position: "absolute",
    top: "-2px",
    right: "-2px",
    minWidth: "18px",
    height: "18px",
    borderRadius: "9999px",
    background: "#dc2626",
    color: "#fff",
    font: "600 11px/18px system-ui, -apple-system, sans-serif",
    textAlign: "center",
    display: "none",
    padding: "0 5px",
    boxSizing: "border-box",
  });
  bubble.appendChild(badge);

  var frame = document.createElement("iframe");
  frame.title = label;
  // The parent page's URL travels as the Referer so the widget can check it
  // against the allowlist. It is advisory — the real gate is frame-ancestors.
  frame.src =
    origin + "/widget/" + encodeURIComponent(widgetKey);
  frame.allow = "clipboard-write";
  applyStyles(frame, {
    position: "fixed",
    right: "20px",
    bottom: "88px",
    width: "min(400px, calc(100vw - 40px))",
    height: "min(640px, calc(100vh - 120px))",
    border: "none",
    borderRadius: "16px",
    boxShadow: "0 12px 48px rgba(0,0,0,.22)",
    background: "#fff",
    zIndex: zIndex,
    display: "none",
    colorScheme: "normal",
  });

  bubble.addEventListener("click", function () {
    setOpen(!open);
  });

  window.addEventListener("message", function (event) {
    // Only trust messages from the frame we created.
    if (event.origin !== origin || event.source !== frame.contentWindow) return;
    var data = event.data;
    if (!data || typeof data !== "object") return;

    if (data.type === "eccho:close") setOpen(false);
    if (data.type === "eccho:unread" && !open) {
      unread = Number(data.count) || 0;
      renderBadge();
    }
  });

  function setOpen(next) {
    open = next;
    frame.style.display = next ? "block" : "none";
    bubble.innerHTML = next ? closeIcon() : chatIcon();
    bubble.appendChild(badge);
    if (next) {
      unread = 0;
      renderBadge();
      // Tell the frame it is visible so it can focus the composer and start
      // polling — an offscreen iframe should not be polling at all.
      post({ type: "eccho:opened" });
    } else {
      post({ type: "eccho:closed" });
    }
  }

  function post(message) {
    if (frame.contentWindow) frame.contentWindow.postMessage(message, origin);
  }

  function renderBadge() {
    badge.style.display = unread > 0 ? "block" : "none";
    badge.textContent = unread > 9 ? "9+" : String(unread);
  }

  function applyStyles(el, styles) {
    for (var key in styles) el.style[key] = styles[key];
  }

  function chatIcon() {
    return (
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l2-4.9A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/>' +
      "</svg>"
    );
  }

  function closeIcon() {
    return (
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'
    );
  }

  function mount() {
    document.body.appendChild(frame);
    document.body.appendChild(bubble);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
