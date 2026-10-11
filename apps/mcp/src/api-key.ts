// Users connect with their client credential (`key:secret`). Clients that
// can set a custom header send x-api-key; clients that only take a bearer
// token (e.g. Codex's --bearer-token-env-var) send Authorization: Bearer.
export function readApiKey(headers: Headers): string | null {
  const apiKey = headers.get("x-api-key");
  if (apiKey) return apiKey;

  const bearer = /^bearer\s+(.+)$/i.exec(headers.get("authorization") ?? "");
  return bearer?.[1] ?? null;
}
