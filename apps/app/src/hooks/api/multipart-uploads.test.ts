import {
  knowledgeItemWorkspaceControllerCreateV1,
  userSharedControllerUpdateProfileV1,
  workspaceControllerCreateWorkSpaceV1,
  workspaceControllerUpdateWorkSpaceV1,
} from "@repo/client";
import type { AxiosAdapter } from "axios";
import { describe, expect, it } from "vitest";

// These endpoints take a file. If the swagger doc declares a JSON body, the
// generated client serializes the File to `{}` and nothing is uploaded (#113).
describe("file upload endpoints", () => {
  const file = new File(["%PDF-1.4"], "faq.pdf", { type: "application/pdf" });

  const capture = async (
    call: (adapter: AxiosAdapter) => Promise<unknown>,
  ): Promise<unknown> => {
    let sent: unknown;
    await call(async (config) => {
      sent = config.data;
      return { data: {}, status: 200, statusText: "OK", headers: {}, config };
    });
    return sent;
  };

  it.each([
    [
      "knowledge item create",
      (adapter: AxiosAdapter) =>
        knowledgeItemWorkspaceControllerCreateV1({
          path: { workspace: "ws", knowledgeBaseId: "kb" },
          body: { title: "FAQ", type: "FILE", file } as never,
          adapter,
        }),
    ],
    [
      "workspace create",
      (adapter: AxiosAdapter) =>
        workspaceControllerCreateWorkSpaceV1({
          body: { name: "Shop", image: file } as never,
          adapter,
        }),
    ],
    [
      "workspace update",
      (adapter: AxiosAdapter) =>
        workspaceControllerUpdateWorkSpaceV1({
          path: { workspace: "ws" },
          body: { name: "Shop", image: file } as never,
          adapter,
        }),
    ],
    [
      "profile update",
      (adapter: AxiosAdapter) =>
        userSharedControllerUpdateProfileV1({
          body: { name: "Lan", image: file } as never,
          adapter,
        }),
    ],
  ])("%s sends the file as multipart form data", async (_, call) => {
    const sent = await capture(call);
    expect(sent).toBeInstanceOf(FormData);
    const form = sent as FormData;
    expect(form.get("file") ?? form.get("image")).toBeInstanceOf(File);
  });
});
