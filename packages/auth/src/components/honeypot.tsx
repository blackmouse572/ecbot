import { forwardRef, useRef } from "react";

/**
 * Bot trap for public auth forms.
 *
 * The field is a decoy: people never see or reach it, but scripted form-fillers
 * populate every input they find in the DOM. A non-empty value therefore means
 * the submission did not come from a person.
 *
 * It is deliberately *not* `type="hidden"` or `display: none` — the well-known
 * bots skip both. Off-screen positioning keeps it in the accessibility-free,
 * keyboard-unreachable zone while staying a normal text input to a scraper.
 *
 * Browsers and password managers must never fill it: a filled decoy drops the
 * submit silently, so a person whose autofill touched it clicks and nothing
 * happens. Chrome ignores `autocomplete="off"` for names its heuristics know
 * (website, url, email, phone, ...), so the name avoids them, and the data-*
 * attributes opt out of 1Password, LastPass, Bitwarden and Dashlane.
 */

/** Not a name autofill recognises. Never call it "honeypot" in the DOM. */
const HONEYPOT_FIELD_NAME = "referrer_note";

const HoneypotField = forwardRef<HTMLInputElement, { name?: string }>(
  ({ name = HONEYPOT_FIELD_NAME }, ref) => (
    <div
      aria-hidden="true"
      className="absolute left-[-9999px] top-0 h-px w-px overflow-hidden"
    >
      <input
        ref={ref}
        type="text"
        name={name}
        defaultValue=""
        tabIndex={-1}
        autoComplete="off"
        data-1p-ignore=""
        data-lpignore="true"
        data-bwignore=""
        data-form-type="other"
      />
    </div>
  ),
);

HoneypotField.displayName = "HoneypotField";

/**
 * Pairs with {@link HoneypotField}. Call `isTrapped()` at the top of a submit
 * handler and bail out silently when it returns true — surfacing an error would
 * only teach the bot which field gave it away.
 */
const useHoneypot = () => {
  const ref = useRef<HTMLInputElement>(null);

  return {
    ref,
    isTrapped: () => Boolean(ref.current?.value),
  };
};

export { HoneypotField, useHoneypot, HONEYPOT_FIELD_NAME };
