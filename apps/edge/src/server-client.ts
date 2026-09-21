import { env } from "./env";

export async function postToServer(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<Response> {
  return fetch(`${env.SERVER_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.SERVER_API_KEY,
    },
    body: JSON.stringify(body),
    signal,
  });
}
