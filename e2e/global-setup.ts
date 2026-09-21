// e2e/global-setup.ts
import { waitForServices } from "./helpers/wait-for-services";

export default async function globalSetup() {
  // In CI, Docker Compose starts services before Playwright — wait for them.
  // In local dev, assume services are already running; skip the health wait.
  if (process.env.CI) {
    await waitForServices(90_000);
  }
}
