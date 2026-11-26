import { clx, DropdownMenu, IconButton, Tooltip } from "@medusajs/ui";
import { IconBraces } from "@tabler/icons-react";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState, type FC, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  matchVariables,
  MESSAGE_VARIABLES,
  MessageVariableNode,
  toMessageDoc,
  toMessageText,
  typedVariable,
  type MessageVariable,
} from "../utils/message-variables";
import { SendVariableSuggest } from "./send-variable-suggest";

type SendMessageEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  /** Sits in the editor's bottom bar, before the placeholder menu. */
  actions?: ReactNode;
};

type Suggest = {
  from: number;
  to: number;
  items: MessageVariable[];
  active: number;
  left: number;
  top: number;
};

const LABEL_KEY: Record<MessageVariable, string> = {
  name: "marketing.send.message.tokenName",
  product: "marketing.send.message.tokenProduct",
};

/**
 * The send text, typed in place. Chat channels send plain text, so there
 * is no formatting: lines, and {name} / {product} as chips. Typing `{`
 * suggests them; typing one out in full turns it into its chip.
 */
export const SendMessageEditor: FC<SendMessageEditorProps> = ({
  value,
  onChange,
  onBlur,
  disabled,
  invalid,
  placeholder,
  actions,
}) => {
  const { t } = useTranslation();
  const label = (key: MessageVariable) => t(LABEL_KEY[key]);

  const boxRef = useRef<HTMLDivElement>(null);
  const [suggest, setSuggest] = useState<Suggest | null>(null);
  // The editor's key handler is set once; it reads the list through refs.
  const suggestRef = useRef<Suggest | null>(null);
  const pickRef = useRef<(key: MessageVariable) => void>(() => {});

  useEffect(() => {
    suggestRef.current = suggest;
  }, [suggest]);

  // Escape closes the list, not the drawer: the drawer hears Escape on the
  // document, so the list catches it first, on the window.
  useEffect(() => {
    if (!suggest) return;

    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.preventDefault();
      event.stopPropagation();
      setSuggest(null);
    };

    window.addEventListener("keydown", close, true);

    return () => window.removeEventListener("keydown", close, true);
  }, [suggest]);

  /** Opens the list while the cursor follows a `{` and a fitting word. */
  const readSuggest = (current: Editor) => {
    const { selection } = current.state;
    const { $from } = selection;

    const typed = selection.empty
      ? typedVariable(
          $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc"),
        )
      : null;

    const items = typed ? matchVariables(typed.query, label) : [];
    const box = boxRef.current?.getBoundingClientRect();

    if (!typed || !items.length || !box) {
      setSuggest(null);

      return;
    }

    const from = $from.pos - typed.length;
    const at = current.view.coordsAtPos(from);

    setSuggest({
      from,
      to: $from.pos,
      items,
      active: 0,
      left: at.left - box.left,
      top: at.bottom - box.top + 4,
    });
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bold: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        italic: false,
        link: false,
        listItem: false,
        listKeymap: false,
        orderedList: false,
        strike: false,
        underline: false,
      }),
      Placeholder.configure({ placeholder }),
      MessageVariableNode.configure({ label: (key) => t(LABEL_KEY[key]) }),
    ],
    content: toMessageDoc(value),
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(toMessageText(editor.getJSON()));
      readSuggest(editor);
    },
    onSelectionUpdate: ({ editor }) => readSuggest(editor),
    onBlur: () => {
      setSuggest(null);
      onBlur();
    },
    editorProps: {
      handleKeyDown: (_view, event) => {
        const open = suggestRef.current;

        if (!open) return false;

        const move = (step: number) =>
          setSuggest({
            ...open,
            active:
              (open.active + step + open.items.length) % open.items.length,
          });

        if (event.key === "ArrowDown") move(1);
        else if (event.key === "ArrowUp") move(-1);
        else if (event.key === "Enter" || event.key === "Tab")
          pickRef.current(open.items[open.active]);
        else return false;

        return true;
      },
      attributes: {
        "data-testid": "send-editor",
        "aria-label": t("marketing.send.message.text"),
        class: "txt-small min-h-24 whitespace-pre-wrap px-3 py-2 outline-none",
      },
    },
  });

  // A draft from the AI replaces the text; the shop's own typing is already in.
  useEffect(() => {
    if (!editor || toMessageText(editor.getJSON()) === value) return;

    editor.commands.setContent(toMessageDoc(value), { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const insert = (key: MessageVariable) =>
    editor
      ?.chain()
      .focus()
      .insertContent({ type: "variable", attrs: { key } })
      .run();

  /** Swaps the typed `{word` for its chip. */
  const pick = (key: MessageVariable) => {
    const open = suggestRef.current;

    if (!editor || !open) return;

    editor
      .chain()
      .focus()
      .insertContentAt(
        { from: open.from, to: open.to },
        { type: "variable", attrs: { key } },
      )
      .run();
    setSuggest(null);
  };

  useEffect(() => {
    pickRef.current = pick;
  });

  return (
    <div
      ref={boxRef}
      className={clx(
        "bg-ui-bg-field shadow-borders-base relative focus-within:shadow-borders-interactive-with-active flex flex-col rounded-md transition-shadow",
        invalid && "shadow-borders-error",
        disabled && "bg-ui-bg-disabled",
      )}
    >
      <EditorContent editor={editor} />
      {suggest && (
        <SendVariableSuggest
          items={suggest.items}
          active={suggest.active}
          label={label}
          left={suggest.left}
          top={suggest.top}
          onPick={pick}
        />
      )}
      <div className="border-ui-border-base flex items-center gap-1 border-t px-2 py-1.5">
        <div className="flex flex-1 flex-wrap items-center gap-1">
          {actions}
        </div>
        <DropdownMenu>
          <Tooltip content={t("marketing.send.message.insert")}>
            <DropdownMenu.Trigger asChild>
              <IconButton
                type="button"
                size="small"
                variant="primary"
                disabled={disabled}
                aria-label={t("marketing.send.message.insert")}
              >
                <IconBraces size={16} stroke={1.5} />
              </IconButton>
            </DropdownMenu.Trigger>
          </Tooltip>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Label className="px-2 py-1.5">
              {t("marketing.send.message.insertHint")}
            </DropdownMenu.Label>
            {MESSAGE_VARIABLES.map((key) => (
              <DropdownMenu.Item key={key} onSelect={() => insert(key)}>
                {`{${label(key)}}`}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu>
      </div>
    </div>
  );
};
