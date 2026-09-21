// e2e/fixtures/kb.fixture.ts
import path from "path";
import fs from "fs";
import { APIRequestContext } from "@playwright/test";
import { API_URL, API_KEY } from "../config";

export async function uploadKbFile(
  api: APIRequestContext,
  accessToken: string,
  workspaceId: string,
  kbId: string,
  filePath: string,
): Promise<string> {
  const fileName = path.basename(filePath);
  const res = await api.post(
    `${API_URL}/api/v1/workspace/${workspaceId}/knowledge-bases/${kbId}/items/create`,
    {
      headers: { Authorization: `Bearer ${accessToken}`, "x-api-key": API_KEY },
      multipart: {
        type: "FILE",
        title: fileName,
        file: {
          name: fileName,
          mimeType: "text/plain",
          buffer: fs.readFileSync(filePath),
        },
      },
    },
  );
  if (!res.ok()) throw new Error(`uploadKbFile failed: ${await res.text()}`);
  const body = await res.json();
  return body.data.id as string;
}

export async function pollIngestStatus(
  api: APIRequestContext,
  accessToken: string,
  workspaceId: string,
  kbId: string,
  itemId: string,
  timeoutMs = 30_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await api.get(
      `${API_URL}/api/v1/workspace/${workspaceId}/knowledge-bases/${kbId}/items/${itemId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-api-key": API_KEY,
        },
      },
    );
    const body = await res.json();
    const status = body.data?.status as string;
    if (status === "completed" || status === "failed") return status;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Ingest did not complete within timeout");
}
