export type JsonSchemaProperty = {
  type: "string" | "number" | "integer" | "boolean" | "array";
  description?: string;
  enum?: (string | number)[];
};

export type JsonSchema = {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
};
