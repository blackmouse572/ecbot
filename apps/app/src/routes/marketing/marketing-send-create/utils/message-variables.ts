import {
  mergeAttributes,
  Node,
  nodeInputRule,
  type JSONContent,
} from "@tiptap/react";

/** The placeholders the API fills in for each customer. */
export const MESSAGE_VARIABLES = ["name", "product"] as const;

export type MessageVariable = (typeof MESSAGE_VARIABLES)[number];

/** Splits a send text so each placeholder is a part of its own. */
export const MESSAGE_TOKENS = /(\{name\}|\{product\})/g;

/** The i18n key of each placeholder's chip label. */
export const MESSAGE_VARIABLE_LABEL_KEY: Record<MessageVariable, string> = {
  name: "marketing.send.message.tokenName",
  product: "marketing.send.message.tokenProduct",
};

export const isVariable = (value: unknown): value is MessageVariable =>
  MESSAGE_VARIABLES.some((key) => key === value);

/**
 * {name} and {product} as one chip each in the editor, so a shop can't
 * break one by typing inside it. It copies out as the placeholder text.
 */
export const MessageVariableNode = Node.create<{
  label: (key: MessageVariable) => string;
}>({
  name: "variable",
  group: "inline",
  inline: true,
  atom: true,

  addOptions() {
    return { label: (key) => key };
  },

  addAttributes() {
    return { key: { default: "name" } };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-variable]",
        getAttrs: (element) => ({
          key: element.getAttribute("data-variable"),
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const key = isVariable(node.attrs.key) ? node.attrs.key : "name";

    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-variable": key,
        class:
          "bg-ui-tag-blue-bg text-ui-tag-blue-text shadow-borders-base txt-compact-small-plus mx-px rounded px-1 py-px",
      }),
      `{${this.options.label(key)}}`,
    ];
  },

  // Typing {name} or {product} in full turns it into its chip.
  addInputRules() {
    return [
      // No capture group: with one, the rule would swap only the word and
      // leave the braces around the chip.
      nodeInputRule({
        find: /\{(?:name|product)\}$/,
        type: this.type,
        getAttributes: (match) => ({ key: match[0].slice(1, -1) }),
      }),
    ];
  },

  renderText({ node }) {
    return `{${node.attrs.key}}`;
  },
});

/** A send text as editor content: a paragraph a line, a chip a placeholder. */
export const toMessageDoc = (text: string): JSONContent => ({
  type: "doc",
  content: text.split("\n").map((line) => {
    const parts = line.split(MESSAGE_TOKENS).filter(Boolean);

    return {
      type: "paragraph",
      content: parts.map((part) => {
        const key = part.slice(1, -1);

        return isVariable(key) && part === `{${key}}`
          ? { type: "variable", attrs: { key } }
          : { type: "text", text: part };
      }),
    };
  }),
});

/** Editor content back to the text the API sends. */
export const toMessageText = (doc: JSONContent): string =>
  (doc.content ?? [])
    .map((paragraph) =>
      (paragraph.content ?? [])
        .map((node) => {
          if (node.type === "variable") return `{${node.attrs?.key}}`;

          if (node.type === "hardBreak") return "\n";

          return node.text ?? "";
        })
        .join(""),
    )
    .join("\n");

/** The `{` being typed before the cursor, and what follows it, if any. */
export const typedVariable = (
  textBefore: string,
): { query: string; length: number } | null => {
  const match = /\{([^{}\s]*)$/.exec(textBefore);

  return match ? { query: match[1], length: match[0].length } : null;
};

const plain = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();

/** The placeholders whose key or label holds what the shop typed. */
export const matchVariables = (
  query: string,
  label: (key: MessageVariable) => string,
): MessageVariable[] => {
  const typed = plain(query);

  return MESSAGE_VARIABLES.filter(
    (key) => key.startsWith(typed) || plain(label(key)).includes(typed),
  );
};
