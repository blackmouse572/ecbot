export type ApiErrorDetails = {
  /** The API's localized summary message, when the error carries one. */
  message?: string;
  /** First validation message per request property. */
  fields: Record<string, string>;
};

export type ApiErrorBody = {
  message?: unknown;
  errors?: Array<{ property?: unknown; message?: unknown }>;
};
