// e2e/fixtures/helpers.fixture.ts
import { APIRequestContext } from "@playwright/test";
import { API_URL } from "../config";

export class TestHelpersClient {
  constructor(private readonly api: APIRequestContext) {}

  private headers() {
    const key = process.env.E2E_TEST_KEY;
    if (!key)
      throw new Error(
        "E2E_TEST_KEY env var is required for test-helpers endpoints",
      );
    return { "x-test-key": key };
  }

  async confirmEmail(userId: string): Promise<void> {
    const res = await this.api.post(
      `${API_URL}/api/v1/test-helpers/confirm-email/${userId}`,
      { headers: this.headers() },
    );
    if (!res.ok()) throw new Error(`confirmEmail failed: ${res.status()}`);
  }

  async getResetToken(email: string): Promise<{ token: string; otp: string }> {
    const res = await this.api.get(
      `${API_URL}/api/v1/test-helpers/reset-password-token/${encodeURIComponent(email)}`,
      { headers: this.headers() },
    );
    if (!res.ok()) throw new Error(`getResetToken failed: ${res.status()}`);
    const body = await res.json();
    return { token: body.token as string, otp: body.otp as string };
  }

  async getInviteToken(workspaceId: string): Promise<string> {
    const res = await this.api.get(
      `${API_URL}/api/v1/test-helpers/invite-token/${workspaceId}`,
      { headers: this.headers() },
    );
    if (!res.ok()) throw new Error(`getInviteToken failed: ${res.status()}`);
    const body = await res.json();
    return body.token as string;
  }
}
