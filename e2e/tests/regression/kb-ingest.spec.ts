// e2e/tests/regression/kb-ingest.spec.ts
import path from "path";
import { test, expect } from "../../fixtures/index";
import { uploadKbFile, pollIngestStatus } from "../../fixtures/kb.fixture";

const SAMPLE_FILE = path.resolve(__dirname, "../../fixtures/sample.txt");

test.describe("Knowledge base ingest", () => {
  test("upload file → ingest completes → item visible in list", async ({
    authedPage,
    api,
  }) => {
    const { page, accessToken, workspaceId } = authedPage;

    // Create a KB first via UI
    await page.goto("/knowledge-base");
    await page.getByRole("button", { name: /create|new/i }).click();
    await page.getByLabel(/name/i).fill(`E2E KB ${Date.now()}`);
    await page.getByRole("button", { name: /create|save/i }).click();

    // Get kbId from URL after creation
    await page.waitForURL(/knowledge-base\/.+/);
    const kbId = page.url().split("/knowledge-base/")[1].split("/")[0];

    // Upload file via API (faster than UI file picker in headless)
    const itemId = await uploadKbFile(
      api,
      accessToken,
      workspaceId,
      kbId,
      SAMPLE_FILE,
    );

    // Poll until ingest completes
    const status = await pollIngestStatus(
      api,
      accessToken,
      workspaceId,
      kbId,
      itemId,
    );
    expect(status).toBe("completed");

    // Reload page and verify item visible
    await page.reload();
    await expect(page.getByText("sample.txt")).toBeVisible({ timeout: 10_000 });
  });
});
