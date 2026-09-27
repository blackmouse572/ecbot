import { Button, Checkbox, Input, RadioGroup, Text, Textarea, clx } from "@medusajs/ui";
import {
  Children, createContext, isValidElement, useCallback, useContext, useEffect, useId, useRef, useState,
  type ComponentProps, type FormEvent, type KeyboardEvent, type ReactNode,
} from "react";

type QuestionnaireValue = string | string[];

type RootContextValue = { register: (name: string, check: () => boolean) => () => void; submitted: boolean };
const RootContext = createContext<RootContextValue | null>(null);

type ItemContextValue = {
  value: QuestionnaireValue;
  setValue: (v: QuestionnaireValue) => void;
  multiple: boolean;
  max?: number;
  invalid: boolean;
};
const ItemContext = createContext<ItemContextValue | null>(null);
// `refused` names the multi-select value that was just rejected for being
// past `max`, with a `nonce` so the same value can be refused twice in a
// row and still retrigger the nudge (section F.6).
type ChoicesContextValue = { toggle: (v: string) => void; refused: { value: string; nonce: number } | null };
const ChoicesContext = createContext<ChoicesContextValue | null>(null);

function useItem() {
  const ctx = useContext(ItemContext);
  if (!ctx) throw new Error("Questionnaire parts must be inside QuestionnaireItem");
  return ctx;
}

export function Questionnaire({ onSubmit, className, children }: { onSubmit: () => void; className?: string; children: ReactNode }) {
  const checks = useRef(new Map<string, () => boolean>());
  const [submitted, setSubmitted] = useState(false);
  const register = useCallback((name: string, check: () => boolean) => {
    checks.current.set(name, check);
    return () => void checks.current.delete(name);
  }, []);
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if ([...checks.current.values()].every((check) => check())) {
      setSubmitted(false);
      onSubmit();
    }
  };
  return (
    <RootContext.Provider value={{ register, submitted }}>
      <form noValidate onSubmit={handleSubmit} className={clx("flex flex-col gap-4", className)}>
        {children}
      </form>
    </RootContext.Provider>
  );
}

export function QuestionnaireItem({
  name, value, onValueChange, multiple = false, required = false, max, disabled = false, className, children,
}: {
  name: string;
  value: QuestionnaireValue;
  onValueChange: (v: QuestionnaireValue) => void;
  multiple?: boolean;
  required?: boolean;
  max?: number;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const root = useContext(RootContext);
  const empty = Array.isArray(value) ? value.length === 0 : value.trim() === "";
  const valid = !required || !empty;
  useEffect(() => (disabled ? undefined : root?.register(name, () => valid)), [root, name, valid, disabled]);
  if (disabled) return null;
  const invalid = !!root?.submitted && !valid;
  return (
    <ItemContext.Provider value={{ value, setValue: onValueChange, multiple, max, invalid }}>
      <fieldset aria-invalid={invalid || undefined} className={clx("flex min-w-0 flex-col gap-3", className)}>
        {children}
      </fieldset>
    </ItemContext.Provider>
  );
}

export function QuestionnaireTitle({ className, ...props }: ComponentProps<"legend">) {
  return <legend className={clx("txt-compact-medium-plus text-ui-fg-base mb-1", className)} {...props} />;
}

export function QuestionnaireDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={clx("txt-compact-small text-ui-fg-subtle -mt-2", className)} {...props} />;
}

export function QuestionnaireChoices({ shortcuts, className, children }: { shortcuts?: "numbers"; className?: string; children: ReactNode }) {
  const item = useItem();
  const values = Children.toArray(children)
    .filter(isValidElement)
    .map((child) => (child.props as { value: string }).value);
  const [refused, setRefused] = useState<{ value: string; nonce: number } | null>(null);

  const toggle = (v: string) => {
    if (!item.multiple) return item.setValue(v);
    const current = item.value as string[];
    if (current.includes(v)) return item.setValue(current.filter((x) => x !== v));
    if (!item.max || current.length < item.max) return item.setValue([...current, v]);
    // Past max: refuse the pick and nudge that card instead of changing the value.
    setRefused({ value: v, nonce: Date.now() });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (shortcuts !== "numbers") return;
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 1 && n <= values.length) {
      e.preventDefault();
      toggle(values[n - 1]!);
    }
  };

  const grid = clx("grid gap-2 sm:grid-cols-2", className);
  return (
    <ChoicesContext.Provider value={{ toggle, refused }}>
      {item.multiple ? (
        <div role="group" onKeyDown={onKeyDown} className={grid}>{children}</div>
      ) : (
        <RadioGroup value={item.value as string} onValueChange={item.setValue} onKeyDown={onKeyDown} className={grid}>
          {children}
        </RadioGroup>
      )}
    </ChoicesContext.Provider>
  );
}

// Selected-state transition + refused-nudge shared by both card kinds
// (section F.5, F.6). Medusa's RadioGroup.Item / Checkbox own their own
// check/dot indicator internally, so the fade-in-on-select treatment is
// applied to the card's selected styling instead, per the brief's fallback.
const CARD_CLASSES = clx(
  "bg-ui-bg-base hover:bg-ui-bg-base-hover shadow-borders-base flex cursor-pointer items-start gap-x-2 rounded-lg border border-transparent px-3 py-2",
  "transition-[box-shadow,background-color] duration-150 ease-out motion-reduce:transition-[background-color]",
  "data-[refused]:animate-refused-nudge motion-reduce:data-[refused]:animate-none",
  "motion-reduce:data-[refused]:border-ui-border-error motion-reduce:data-[refused]:transition-colors motion-reduce:data-[refused]:duration-150 motion-reduce:data-[refused]:ease-out",
);

/** How long the `data-refused` attribute stays on a nudged card, matching
 * the longer of the two nudge/flash durations (F.6) so it resets after
 * either has finished playing, and can retrigger on the next refusal. */
const REFUSED_ATTR_MS = 200;

function useRefusedNudge(value: string) {
  const choices = useContext(ChoicesContext);
  const [nudging, setNudging] = useState(false);
  const lastNonce = useRef(0);
  useEffect(() => {
    if (choices?.refused?.value !== value || choices.refused.nonce === lastNonce.current) return;
    lastNonce.current = choices.refused.nonce;
    setNudging(true);
    const timer = setTimeout(() => setNudging(false), REFUSED_ATTR_MS);
    return () => clearTimeout(timer);
  }, [choices?.refused, value]);
  return nudging;
}

export function QuestionnaireChoice({
  value, label, description, icon,
}: { value: string; label: string; description?: string; icon?: ReactNode }) {
  const item = useItem();
  const choices = useContext(ChoicesContext);
  const id = useId();
  const nudging = useRefusedNudge(value);
  const checked = item.multiple ? (item.value as string[]).includes(value) : item.value === value;
  return (
    <label
      htmlFor={id}
      data-refused={nudging ? "" : undefined}
      className={clx(CARD_CLASSES, checked && "shadow-borders-interactive-with-active")}
    >
      {item.multiple ? (
        <Checkbox id={id} checked={checked} onCheckedChange={() => choices?.toggle(value)} />
      ) : (
        <RadioGroup.Item value={value} id={id} />
      )}
      {icon && <span className="text-ui-fg-subtle mt-0.5 shrink-0">{icon}</span>}
      <span className="flex flex-col">
        <Text size="small" weight="plus">{label}</Text>
        {description && <Text size="small" className="text-ui-fg-subtle">{description}</Text>}
      </span>
    </label>
  );
}

export function QuestionnaireInput({
  placeholder, multiline, maxLength, "aria-label": ariaLabel,
}: { placeholder?: string; multiline?: boolean; maxLength?: number; "aria-label": string }) {
  const item = useItem();
  const common = {
    value: item.value as string,
    placeholder,
    maxLength,
    "aria-label": ariaLabel,
    "aria-invalid": item.invalid || undefined,
    autoFocus: true,
  };
  return multiline ? (
    <Textarea rows={3} {...common} onChange={(e) => item.setValue(e.target.value)} />
  ) : (
    <Input {...common} onChange={(e) => item.setValue(e.target.value)} />
  );
}

export function QuestionnaireError({ children }: { children: ReactNode }) {
  const item = useItem();
  return item.invalid ? <Text size="small" role="alert" className="text-ui-fg-error">{children}</Text> : null;
}

export function QuestionnaireActions({ className, ...props }: ComponentProps<"div">) {
  return <div className={clx("flex items-center justify-end gap-2", className)} {...props} />;
}

export function QuestionnaireNext({ children, ...props }: Omit<ComponentProps<typeof Button>, "type">) {
  return <Button type="submit" size="small" {...props}>{children}</Button>;
}

export function QuestionnaireSkip({ children, ...props }: Omit<ComponentProps<typeof Button>, "type">) {
  return <Button type="button" size="small" variant="transparent" {...props}>{children}</Button>;
}

export function QuestionnaireProgress({ current, total, render }: { current: number; total: number; render?: (p: { current: number; total: number }) => ReactNode }) {
  return <Text size="xsmall" className="text-ui-fg-muted">{render ? render({ current, total }) : `${current}/${total}`}</Text>;
}
