---
applyTo: "apps/app/**/*.{ts,tsx}"
description: "Form patterns for apps/app: React Hook Form + Zod (zodResolver) and the @repo/ui Form components"
---

# Form Handling

Forms use **React Hook Form** + **Zod** validation, wired with **`zodResolver`**, and rendered with the `Form` primitives from `@repo/ui/common-components`.

## Resolver: use `zodResolver`

Use `zodResolver` from `@hookform/resolvers/zod`. This is the pattern used everywhere in `apps/app` (chatbot, knowledge-base, workspace, orders, members, …).

```typescript
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const form = useForm<WorkspaceEditFormData>({
  resolver: zodResolver(WorkspaceEditSchema),
  defaultValues,
});
```

> Schemas are authored with the `zod/v4` import (`import { z } from "zod/v4"`), and `zodResolver` works with them directly. Do **not** reach for `standardSchemaResolver` — it is not used in this codebase.

### Coercing or defaulting schemas need three generics

The one-generic form above only holds when the schema's input and output types
match. `z.coerce.*`, `.default()`, `.transform()`, `.catch()` and
`z.preprocess()` all make them differ: the field holds a raw string while the
parsed payload holds a number, or the field may be absent while the payload
guarantees a value. `zodResolver` is typed `Resolver<z.input<T>, TContext,
z.output<T>>`, so `useForm<z.infer<T>>` fails to compile with a `Resolver` is
not assignable error naming the mismatched field.

Spell out all three generics instead — `TFieldValues` is what the inputs hold,
`TTransformedValues` is what `handleSubmit` receives:

```typescript
export type ChatbotFormData = z.infer<typeof createChatbotSchema>; // submitted
export type ChatbotFormInput = z.input<typeof createChatbotSchema>; // in the fields

const form = useForm<ChatbotFormInput, unknown, ChatbotFormData>({
  resolver: zodResolver(createChatbotSchema),
  defaultValues,
});
```

`defaultValues`, `reset()` and `onSubmit` callbacks keep working unchanged —
output values are assignable to the wider input type. What does change is
`watch()` and `getValues()`: they now return the **input** type, so a coerced
field reads back as `unknown`. Parse before handing those values to anything
expecting the output type:

```typescript
onTest(createHttpToolSchema.parse(form.getValues()), args);
```

## Schema convention

Co-locate schemas in a `schemas.ts` next to the feature and export the inferred type. `t()` from `i18next` can be used inline for validation messages:

```typescript
// routes/chatbot/schemas.ts
import { t } from "i18next";
import { z } from "zod/v4";

export const createChatbotSchema = z.object({
  name: z.string().min(1, t("errors.chatbot.nameRequired")).max(255),
  generalKnowledge: z.string().max(10000).default(""),
  accounts: z.array(z.string()).default([]),
  type: z.string().default("beauty"),
  modelTemperature: z.coerce.number().min(0).max(2).default(1.0),
  maxTokens: z.coerce.number().int().positive().nullish(),
});

export type ChatbotFormData = z.infer<typeof createChatbotSchema>;
```

## Form components from `@repo/ui`

Always render fields with the `Form` primitives. Inputs come from `@medusajs/ui` (`Input`, `Select`, …) or `@repo/ui` helpers (`SwitchBox`, `SingleAccordion`, `ChipGroup`).

```typescript
import { Form } from "@repo/ui/common-components";
import { Input } from "@medusajs/ui";

<Form.Field
  control={form.control}
  name="name"
  render={({ field }) => (
    <Form.Item>
      <Form.Label>{nameLabel}</Form.Label>
      <Form.Hint>Optional helper text.</Form.Hint>
      <Form.Control>
        <Input {...field} className="w-full" />
      </Form.Control>
      <Form.ErrorMessage />
    </Form.Item>
  )}
/>;
```

Field anatomy:

1. `<Form.Field control={form.control} name="…" render={({ field }) => …} />`
2. `<Form.Item>` — spacing/layout wrapper
3. `<Form.Label>` (`optional` prop renders an "optional" hint) and optional `<Form.Hint>`
4. `<Form.Control>` — wraps the actual input, spread `{...field}`
5. `<Form.ErrorMessage />` — renders the resolver's validation error

For boolean fields prefer `<SwitchBox control={form.control} name="…" label description />`, which wires itself to the form directly.

## Submitting

Wrap the fields in `KeyboundForm` (submits on ⌘/Ctrl+Enter) and drive submission through the parent-provided `onSubmit`. The form component itself is presentational and reused by both create and edit pages — see `routing-and-modals.instructions.md` for how the modal wrappers (`RouteFocusModal.Form` / `RouteDrawer.Form`) connect it.

```typescript
const handleSubmit = form.handleSubmit(
  async (data) => {
    await onSubmit(data);
  },
  (errors) => console.error(errors),
);
```
