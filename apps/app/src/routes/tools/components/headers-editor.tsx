import { Trash } from "@medusajs/icons";
import {
  Button,
  Container,
  IconButton,
  Input,
  Label,
  Switch,
  Text,
  Textarea,
} from "@medusajs/ui";
import { useEffect, useMemo, useRef, useState, type FC } from "react";
import { useTranslation } from "react-i18next";

export type HeadersEditorMode = "structured" | "json";

export type HeadersEditorProps = {
  value: Record<string, string> | undefined;
  onChange: (value: Record<string, string> | undefined) => void;
  mode: HeadersEditorMode;
  onModeChange: (mode: HeadersEditorMode) => void;
  showErrors?: boolean;
};

type HeaderRow = { key: string; value: string };

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const recordToRows = (rec: Record<string, string> | undefined): HeaderRow[] => {
  if (!rec) return [];
  return Object.entries(rec).map(([key, value]) => ({ key, value }));
};

const rowsToRecord = (
  rows: HeaderRow[],
): Record<string, string> | undefined => {
  const out: Record<string, string> = {};
  for (const row of rows) {
    if (!row.key) continue;
    out[row.key] = row.value ?? "";
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

export const HeadersEditor: FC<HeadersEditorProps> = ({
  value,
  onChange,
  mode,
  onModeChange,
  showErrors = false,
}) => {
  const { t } = useTranslation();

  const initialRows = useMemo(() => recordToRows(value), []);
  const [rows, setRows] = useState<HeaderRow[]>(initialRows);

  // Store as JSON string so RHF's new object references don't break the
  // equality check and wipe in-flight rows with empty keys.
  const lastCommittedRef = useRef<string>(
    JSON.stringify(rowsToRecord(initialRows) ?? null),
  );

  const [jsonText, setJsonText] = useState(() =>
    value ? JSON.stringify(value, null, 2) : "",
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "json") return;
    if (JSON.stringify(value ?? null) === lastCommittedRef.current) return;
    setRows(recordToRows(value));
    setJsonText(value ? JSON.stringify(value, null, 2) : "");
  }, [value, mode]);

  const commitRows = (next: HeaderRow[]) => {
    setRows(next);
    const record = rowsToRecord(next);
    lastCommittedRef.current = JSON.stringify(record ?? null);
    onChange(record);
    setJsonText(record ? JSON.stringify(record, null, 2) : "");
  };

  const handleAddHeader = () => {
    commitRows([...rows, { key: "", value: "" }]);
  };

  const handleUpdateRow = (index: number, patch: Partial<HeaderRow>) => {
    commitRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const handleRemoveRow = (index: number) => {
    commitRows(rows.filter((_, i) => i !== index));
  };

  const handleJsonChange = (text: string) => {
    setJsonText(text);
    if (!text.trim()) {
      setJsonError(null);
      onChange(undefined);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      if (!isPlainObject(parsed)) {
        setJsonError(
          t("tools.headersEditor.invalidJson", {
            message: "expected an object",
          }),
        );
        return;
      }
      // Coerce all values to strings.
      const record: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        record[k] = typeof v === "string" ? v : JSON.stringify(v);
      }
      setJsonError(null);
      onChange(Object.keys(record).length > 0 ? record : undefined);
    } catch (err) {
      setJsonError(
        t("tools.headersEditor.invalidJson", {
          message: (err as Error).message,
        }),
      );
    }
  };

  const handleModeChange = (checked: boolean) => {
    const nextMode: HeadersEditorMode = checked ? "json" : "structured";
    if (nextMode === "structured") {
      try {
        const parsed = JSON.parse(jsonText || "{}");
        if (isPlainObject(parsed)) {
          const record: Record<string, string> = {};
          for (const [k, v] of Object.entries(parsed)) {
            record[k] = typeof v === "string" ? v : JSON.stringify(v);
          }
          setRows(recordToRows(record));
          onChange(Object.keys(record).length > 0 ? record : undefined);
        }
        setJsonError(null);
      } catch {
        // Keep current rows; user can edit them.
      }
    } else {
      setJsonText(
        rowsToRecord(rows) ? JSON.stringify(rowsToRecord(rows), null, 2) : "",
      );
      setJsonError(null);
    }
    onModeChange(nextMode);
  };

  return (
    <Container className="bg-ui-bg-field p-3 flex flex-col gap-y-3">
      <div className="flex items-center justify-between">
        <Text size="small" weight="plus">
          {t("tools.headersEditor.title")}
        </Text>
        <div className="flex items-center gap-x-2">
          <Text
            size="small"
            className={
              mode === "structured" ? "text-ui-fg-base" : "text-ui-fg-muted"
            }
          >
            {t("tools.headersEditor.modeStructured")}
          </Text>
          <Switch
            checked={mode === "json"}
            onCheckedChange={handleModeChange}
          />
          <Text
            size="small"
            className={mode === "json" ? "text-ui-fg-base" : "text-ui-fg-muted"}
          >
            {t("tools.headersEditor.modeJson")}
          </Text>
        </div>
      </div>

      {mode === "structured" ? (
        <div className="flex flex-col gap-y-2">
          {rows.length === 0 && (
            <Text size="small" className="text-ui-fg-muted">
              {t("tools.headersEditor.emptyHint")}
            </Text>
          )}
          {rows.map((row, index) => (
            <Container
              key={index}
              className="flex flex-col p-3 bg-ui-bg-field-component"
            >
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <Label size="xsmall" className="text-ui-fg-subtle">
                    {t("tools.headersEditor.keyLabel")}
                  </Label>
                  <Input
                    value={row.key}
                    onChange={(e) =>
                      handleUpdateRow(index, { key: e.target.value })
                    }
                    placeholder="X-Source"
                    className={
                      showErrors && !row.key
                        ? "border-ui-border-error"
                        : undefined
                    }
                  />
                </div>
                <div className="col-span-6">
                  <Label size="xsmall" className="text-ui-fg-subtle">
                    {t("tools.headersEditor.valueLabel")}
                  </Label>
                  <Input
                    value={row.value}
                    onChange={(e) =>
                      handleUpdateRow(index, { value: e.target.value })
                    }
                    placeholder="eccho"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <IconButton
                    type="button"
                    variant="transparent"
                    onClick={() => handleRemoveRow(index)}
                    aria-label={t("tools.headersEditor.removeHeader")}
                  >
                    <Trash />
                  </IconButton>
                </div>
              </div>
              {showErrors && !row.key && (
                <p className="txt-compact-xsmall text-ui-fg-error mt-1">
                  {t("tools.headersEditor.keyEmptyError")}
                </p>
              )}
            </Container>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={handleAddHeader}
            className="self-start"
          >
            {t("tools.headersEditor.addHeader")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-y-1">
          <Textarea
            rows={6}
            className="font-mono text-xs"
            value={jsonText}
            onChange={(e) => handleJsonChange(e.target.value)}
            placeholder={'{\n  "X-Source": "eccho"\n}'}
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
