import { InformationCircle, Trash } from "@medusajs/icons";
import {
  Button,
  Checkbox,
  Container,
  IconButton,
  Input,
  Label,
  Select,
  Switch,
  Text,
  Textarea,
  Tooltip,
} from "@medusajs/ui";
import { useEffect, useRef, useState, type FC } from "react";
import { Trans, useTranslation } from "react-i18next";

export type SchemaPropType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "array";

export type SchemaProp = {
  key: string;
  type: SchemaPropType;
  description: string;
  enum?: string[];
  required?: boolean;
};

export type JsonSchemaEditorMode = "structured" | "json";

export type JsonSchemaEditorProps = {
  rows: SchemaProp[];
  onRowsChange: (rows: SchemaProp[]) => void;
  mode: JsonSchemaEditorMode;
  onModeChange: (mode: JsonSchemaEditorMode) => void;
  showErrors?: boolean;
};

const TYPE_OPTIONS: SchemaPropType[] = [
  "string",
  "number",
  "integer",
  "boolean",
  "array",
];

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Try to decompose a JSON Schema object into the simple row model. Returns
 * `null` if the schema uses features the structured editor cannot represent
 * (nested objects, oneOf/allOf/anyOf, $ref, …).
 */
export const schemaToRows = (
  schema: Record<string, unknown>,
): SchemaProp[] | null => {
  if (!schema || Object.keys(schema).length === 0) return [];

  // Unsupported top-level features.
  if (
    "oneOf" in schema ||
    "allOf" in schema ||
    "anyOf" in schema ||
    "$ref" in schema
  ) {
    return null;
  }

  const properties = schema.properties;
  if (!isPlainObject(properties)) {
    // Empty / no properties is fine; anything else (e.g. array of properties)
    // we cannot decompose.
    return Object.keys(schema).every((k) =>
      [
        "type",
        "title",
        "description",
        "required",
        "additionalProperties",
      ].includes(k),
    )
      ? []
      : null;
  }

  const required = Array.isArray(schema.required)
    ? (schema.required as unknown[]).filter(
        (r): r is string => typeof r === "string",
      )
    : [];

  const rows: SchemaProp[] = [];
  for (const [key, raw] of Object.entries(properties)) {
    if (!isPlainObject(raw)) return null;

    const t = raw.type;
    if (typeof t !== "string" || !TYPE_OPTIONS.includes(t as SchemaPropType)) {
      // Unsupported type (e.g. "object", union types).
      return null;
    }

    if (
      "properties" in raw ||
      "oneOf" in raw ||
      "allOf" in raw ||
      "anyOf" in raw ||
      "$ref" in raw
    ) {
      return null;
    }

    const description =
      typeof raw.description === "string" ? raw.description : "";

    let enumValues: string[] | undefined;
    if (Array.isArray(raw.enum)) {
      enumValues = (raw.enum as unknown[]).map((v) => String(v));
    }

    rows.push({
      key,
      type: t as SchemaPropType,
      description,
      enum: enumValues,
      required: required.includes(key),
    });
  }

  return rows;
};

export const rowsToSchema = (rows: SchemaProp[]): Record<string, unknown> => {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const row of rows) {
    if (!row.key) continue;
    const prop: Record<string, unknown> = { type: row.type };
    if (row.description) prop.description = row.description;
    if (row.type !== "boolean" && row.enum && row.enum.length > 0) {
      prop.enum = row.enum;
    }
    properties[row.key] = prop;
    if (row.required) required.push(row.key);
  }

  const schema: Record<string, unknown> = {
    type: "object",
    properties,
  };
  if (required.length > 0) schema.required = required;
  return schema;
};

/**
 * Local-draft input for enum values.
 *
 * The enum field is comma-separated, but committing on every keystroke (split
 * + filter empties + join back) erases trailing commas / whitespace mid-typing
 * — making it impossible to type a comma. We keep the raw string in local
 * state and only parse/commit on blur.
 */
type EnumInputProps = {
  value: string[] | undefined;
  onCommit: (next: string[] | undefined) => void;
};

const EnumInput: FC<EnumInputProps> = ({ value, onCommit }) => {
  const { t } = useTranslation();
  const joined = (value ?? []).join(", ");
  const [draft, setDraft] = useState<string>(joined);

  // Re-sync local draft when the external value changes (mode switch, row
  // removed/reset, etc.) — but only if the canonical join differs from what
  // the user is currently typing, so we don't clobber in-flight edits.
  useEffect(() => {
    const parsedDraft = draft
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const incoming = value ?? [];
    const sameAsDraft =
      parsedDraft.length === incoming.length &&
      parsedDraft.every((v, i) => v === incoming[i]);
    if (!sameAsDraft) {
      setDraft(joined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);

  const commit = () => {
    const parsed = draft
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    onCommit(parsed.length > 0 ? parsed : undefined);
  };

  return (
    <div>
      <div className="flex items-center gap-x-1 mb-1">
        <Label size="xsmall" className="text-ui-fg-subtle">
          {t("tools.schemaEditor.enumLabel")}
        </Label>
        <Tooltip
          maxWidth={280}
          content={
            <div className="flex flex-col gap-y-2 p-1">
              <p className="font-medium text-ui-fg-base">
                {t("tools.schemaEditor.enumLabel")}
              </p>
              <p className="text-ui-fg-subtle">
                <Trans
                  i18nKey="tools.schemaEditor.enumTooltip.body"
                  components={{
                    bold: <strong className="font-medium text-ui-fg-base" />,
                  }}
                />
              </p>
              <div className="flex flex-col gap-y-1">
                <p
                  className="text-ui-fg-muted uppercase tracking-wide"
                  style={{ fontSize: "10px" }}
                >
                  {t("tools.schemaEditor.enumTooltip.exampleLabel")}
                </p>
                <code className="font-mono text-ui-tag-blue-text bg-ui-tag-blue-bg rounded px-1 py-0.5 text-xs">
                  {t("tools.schemaEditor.enumTooltip.example")}
                </code>
              </div>
              <p
                className="text-ui-fg-muted italic"
                style={{ fontSize: "11px" }}
              >
                {t("tools.schemaEditor.enumTooltip.hint")}
              </p>
            </div>
          }
        >
          <InformationCircle className="text-ui-fg-muted w-3 h-3 cursor-help" />
        </Tooltip>
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        placeholder={t("tools.schemaEditor.enumPlaceholder")}
      />
    </div>
  );
};

export const JsonSchemaEditor: FC<JsonSchemaEditorProps> = ({
  rows,
  onRowsChange,
  mode,
  onModeChange,
  showErrors = false,
}) => {
  const { t } = useTranslation();

  // JSON-mode local text state so the user can type freely without us
  // round-tripping through JSON.parse on every keystroke.
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(rowsToSchema(rows), null, 2),
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Track last rows we serialised so we can keep the JSON-mode mirror in sync
  // when the parent updates rows externally (e.g. defaultValues reset), but
  // only while not actively editing in JSON mode.
  const lastRowsRef = useRef<string>(JSON.stringify(rows));
  useEffect(() => {
    if (mode === "json") return;
    const next = JSON.stringify(rows);
    if (next === lastRowsRef.current) return;
    lastRowsRef.current = next;
    setJsonText(JSON.stringify(rowsToSchema(rows), null, 2));
  }, [rows, mode]);

  const commitRows = (next: SchemaProp[]) => {
    lastRowsRef.current = JSON.stringify(next);
    onRowsChange(next);
    setJsonText(JSON.stringify(rowsToSchema(next), null, 2));
  };

  const handleAddProperty = () => {
    commitRows([
      ...rows,
      { key: "", type: "string", description: "", required: false },
    ]);
  };

  const handleUpdateRow = (index: number, patch: Partial<SchemaProp>) => {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    commitRows(next);
  };

  const handleRemoveRow = (index: number) => {
    commitRows(rows.filter((_, i) => i !== index));
  };

  const handleJsonChange = (text: string) => {
    setJsonText(text);
    if (!text.trim()) {
      setJsonError(null);
      lastRowsRef.current = JSON.stringify([]);
      onRowsChange([]);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      if (!isPlainObject(parsed)) {
        setJsonError(
          t("tools.schemaEditor.invalidJson", {
            message: "expected an object",
          }),
        );
        return;
      }
      setJsonError(null);
      const decomposed = schemaToRows(parsed);
      if (decomposed !== null) {
        // Update lastRowsRef but DON'T overwrite jsonText (user is typing).
        const nextRows = decomposed;
        lastRowsRef.current = JSON.stringify(nextRows);
        onRowsChange(nextRows);
      }
      // If decomposed is null the schema uses unsupported features; we still
      // keep the JSON valid but cannot mirror to rows. Submit will then use
      // an empty rows array — acceptable for the structured editor's MVP.
    } catch (err) {
      setJsonError(
        t("tools.schemaEditor.invalidJson", {
          message: (err as Error).message,
        }),
      );
    }
  };

  const handleModeChange = (checked: boolean) => {
    const nextMode: JsonSchemaEditorMode = checked ? "json" : "structured";
    if (nextMode === "structured") {
      // Try to decompose the current JSON text first.
      let parsed: Record<string, unknown> | null = null;
      try {
        const p = JSON.parse(jsonText || "{}");
        if (isPlainObject(p)) parsed = p;
      } catch {
        parsed = null;
      }
      if (parsed) {
        const decomposed = schemaToRows(parsed);
        if (decomposed === null) {
          if (!window.confirm(t("tools.schemaEditor.complexSchemaWarning"))) {
            return;
          }
          commitRows([]);
        } else {
          commitRows(decomposed);
        }
      }
      setJsonError(null);
    } else {
      // structured -> json: serialize current rows.
      setJsonText(JSON.stringify(rowsToSchema(rows), null, 2));
      setJsonError(null);
    }
    onModeChange(nextMode);
  };

  return (
    <Container className="bg-ui-bg-field p-3 flex flex-col gap-y-3">
      <div className="flex items-center justify-between">
        <Text size="small" weight="plus">
          {t("tools.schemaEditor.title")}
        </Text>
        <div className="flex items-center gap-x-2">
          <Text
            size="small"
            className={
              mode === "structured" ? "text-ui-fg-base" : "text-ui-fg-muted"
            }
          >
            {t("tools.schemaEditor.modeStructured")}
          </Text>
          <Switch
            checked={mode === "json"}
            onCheckedChange={handleModeChange}
          />
          <Text
            size="small"
            className={mode === "json" ? "text-ui-fg-base" : "text-ui-fg-muted"}
          >
            {t("tools.schemaEditor.modeJson")}
          </Text>
        </div>
      </div>

      {mode === "structured" ? (
        <div className="flex flex-col gap-y-2">
          {rows.length === 0 && (
            <Text size="small" className="text-ui-fg-muted">
              {t("tools.schemaEditor.emptyHint")}
            </Text>
          )}
          {rows.map((row, index) => (
            <Container
              key={index}
              className="bg-ui-bg-field-component p-3 flex flex-col gap-y-2"
            >
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <div className="flex items-center gap-x-1 mb-1">
                    <Label size="xsmall" className="text-ui-fg-subtle">
                      {t("tools.schemaEditor.keyLabel")}
                    </Label>
                    <Tooltip
                      maxWidth={260}
                      content={
                        <div className="flex flex-col gap-y-2 p-1">
                          <p className="font-medium text-ui-fg-base">
                            {t("tools.schemaEditor.keyLabel")}
                          </p>
                          <p className="text-ui-fg-subtle">
                            {t("tools.schemaEditor.keyTooltip.body")}
                          </p>
                          <div className="flex flex-col gap-y-1">
                            <p
                              className="text-ui-fg-muted uppercase tracking-wide"
                              style={{ fontSize: "10px" }}
                            >
                              {t("tools.schemaEditor.keyTooltip.formatLabel")}
                            </p>
                            <p className="text-ui-fg-subtle">
                              {t("tools.schemaEditor.keyTooltip.format")}
                            </p>
                          </div>
                          <div className="flex flex-col gap-y-1">
                            <p
                              className="text-ui-fg-muted uppercase tracking-wide"
                              style={{ fontSize: "10px" }}
                            >
                              {t("tools.schemaEditor.keyTooltip.examplesLabel")}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {["search_query", "user_id", "limit"].map(
                                (ex) => (
                                  <code
                                    key={ex}
                                    className="font-mono text-ui-tag-green-text bg-ui-tag-green-bg rounded px-1 py-0.5 text-xs"
                                  >
                                    {ex}
                                  </code>
                                ),
                              )}
                            </div>
                          </div>
                        </div>
                      }
                    >
                      <InformationCircle className="text-ui-fg-muted w-3 h-3 cursor-help" />
                    </Tooltip>
                  </div>
                  <Input
                    value={row.key}
                    onChange={(e) =>
                      handleUpdateRow(index, { key: e.target.value })
                    }
                    placeholder="query"
                    className={
                      showErrors && !row.key
                        ? "border-ui-border-error"
                        : undefined
                    }
                  />
                  {showErrors && !row.key && (
                    <p className="txt-compact-xsmall text-ui-fg-error mt-1">
                      {t("tools.schemaEditor.keyEmptyError")}
                    </p>
                  )}
                </div>
                <div className="col-span-3">
                  <Label size="xsmall" className="text-ui-fg-subtle mb-1 block">
                    {t("tools.schemaEditor.typeLabel")}
                  </Label>
                  <Select
                    value={row.type}
                    onValueChange={(v) =>
                      handleUpdateRow(index, {
                        type: v as SchemaPropType,
                        ...(v === "boolean" ? { enum: undefined } : {}),
                      })
                    }
                  >
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      {TYPE_OPTIONS.map((tt) => (
                        <Select.Item key={tt} value={tt}>
                          {tt}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
                <div className="col-span-4 flex items-center gap-x-2 pb-1">
                  <Checkbox
                    id={`required-${index}`}
                    checked={row.required ?? false}
                    onCheckedChange={(checked) =>
                      handleUpdateRow(index, { required: checked === true })
                    }
                  />
                  <Label htmlFor={`required-${index}`} size="small">
                    {t("tools.schemaEditor.requiredLabel")}
                  </Label>
                </div>
                <div className="col-span-1 flex justify-end pb-1">
                  <IconButton
                    type="button"
                    variant="transparent"
                    onClick={() => handleRemoveRow(index)}
                    aria-label={t("tools.schemaEditor.removeProperty")}
                  >
                    <Trash />
                  </IconButton>
                </div>
              </div>
              <div>
                <Label size="xsmall" className="text-ui-fg-subtle mb-1 block">
                  {t("tools.schemaEditor.descriptionLabel")}
                </Label>
                <Textarea
                  rows={2}
                  value={row.description ?? ""}
                  onChange={(e) =>
                    handleUpdateRow(index, { description: e.target.value })
                  }
                  className={
                    showErrors && !row.description
                      ? "border-ui-border-error"
                      : undefined
                  }
                />
                {showErrors && !row.description && (
                  <p className="txt-compact-xsmall text-ui-fg-error mt-1">
                    {t("tools.errors.schemaRowDescriptionRequired")}
                  </p>
                )}
              </div>
              {row.type !== "boolean" && (
                <EnumInput
                  value={row.enum}
                  onCommit={(next) => handleUpdateRow(index, { enum: next })}
                />
              )}
            </Container>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={handleAddProperty}
            className="self-start"
          >
            {t("tools.schemaEditor.addProperty")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-y-1">
          <Textarea
            rows={10}
            className="font-mono text-xs"
            value={jsonText}
            onChange={(e) => handleJsonChange(e.target.value)}
          />
          {jsonError && (
            <Text size="small" className="text-ui-fg-error">
              {jsonError}
            </Text>
          )}
        </div>
      )}
    </Container>
  );
};
