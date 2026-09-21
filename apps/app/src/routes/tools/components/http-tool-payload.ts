import type {
  CreateHttpToolRequestDto,
  UpdateToolRequestDto,
} from "@repo/client";
import type { SchemaProp } from "./json-schema-editor";
import type { HttpToolFormData } from "./http-tool-schema";

export const rowsToSchemaPayload = (
  rows: SchemaProp[] | undefined,
): Record<string, unknown> => {
  if (!rows || rows.length === 0) {
    return { type: "object", properties: {} };
  }
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const row of rows) {
    // After Zod validation, all rows have key + description.
    const prop: Record<string, unknown> = {
      type: row.type,
      description: row.description,
    };
    if (row.type !== "boolean" && row.enum && row.enum.length > 0) {
      prop.enum = row.enum;
    }
    properties[row.key] = prop;
    if (row.required) required.push(row.key);
  }
  const schema: Record<string, unknown> = { type: "object", properties };
  if (required.length > 0) schema.required = required;
  return schema;
};

export const toCreateHttpPayload = (
  data: HttpToolFormData,
): CreateHttpToolRequestDto => {
  return {
    name: data.name,
    description: data.description,
    httpMethod: data.httpMethod,
    httpUrl: data.httpUrl,
    inputSchema: rowsToSchemaPayload(data.inputSchemaRows),
    headers: data.headers,
    auth: data.auth,
    credential: data.credential ? data.credential : undefined,
    timeoutMs: data.timeoutMs,
    maxRetries: data.maxRetries,
  };
};

export const toUpdateHttpPayload = (
  data: HttpToolFormData,
): UpdateToolRequestDto => {
  return {
    name: data.name,
    description: data.description,
    inputSchema: rowsToSchemaPayload(data.inputSchemaRows),
    headers: data.headers,
    auth: data.auth,
    // Empty credential = leave existing untouched (write-only field).
    credential: data.credential ? data.credential : undefined,
    timeoutMs: data.timeoutMs,
    maxRetries: data.maxRetries,
  };
};
