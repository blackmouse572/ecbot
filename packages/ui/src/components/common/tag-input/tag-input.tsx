import { Fragment, useMemo, useState } from "react";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "../../ui/combobox";

type TagInputProps = {
  value: string[];
  onChange: (value: string[]) => void;
  /** Existing tags to pick from. Anything typed can still be added. */
  suggestions?: string[];
  placeholder?: string;
  /** Label for the add row, given the typed text. */
  createLabel?: (text: string) => string;
  id?: string;
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
};

const sameTag = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Free-form tag input on the shadcn chips combobox: pick a suggestion, or type
 * a new tag and press Enter or a comma. Backspace on an empty field removes the
 * last tag. Pass a controlled `value` of tag names.
 */
export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder,
  createLabel = (text) => `Add "${text}"`,
  id,
  name,
  disabled,
  invalid,
  className,
}: TagInputProps) {
  const anchor = useComboboxAnchor();
  const [input, setInput] = useState("");
  const typed = input.trim();

  // The typed text is offered as its own row, so Enter on it adds it.
  const items = useMemo(() => {
    const all = [...new Set([...value, ...suggestions])];
    return typed && !all.some((tag) => sameTag(tag, typed))
      ? [...all, typed]
      : all;
  }, [value, suggestions, typed]);

  const add = (tag: string) => {
    const clean = tag.trim();
    if (clean && !value.some((v) => sameTag(v, clean))) {
      onChange([...value, clean]);
    }
    setInput("");
  };

  return (
    <Combobox
      multiple
      autoHighlight
      items={items}
      value={value}
      onValueChange={(next: string[]) => {
        onChange(next);
        setInput("");
      }}
      inputValue={input}
      onInputValueChange={setInput}
      disabled={disabled}
      name={name}
    >
      <ComboboxChips ref={anchor} className={className}>
        <ComboboxValue>
          {(values: string[]) => (
            <Fragment>
              {values.map((tag) => (
                <ComboboxChip key={tag}>{tag}</ComboboxChip>
              ))}
              <ComboboxChipsInput
                id={id}
                placeholder={values.length ? undefined : placeholder}
                aria-invalid={invalid || undefined}
                onKeyDown={(e) => {
                  if (e.key === "," && typed) {
                    e.preventDefault();
                    add(typed);
                  }
                }}
              />
            </Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {value.some((v) => sameTag(v, item)) ||
              suggestions.some((s) => sameTag(s, item))
                ? item
                : createLabel(item)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
