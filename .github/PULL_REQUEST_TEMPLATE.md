## What and why

<!-- One paragraph. Link the issue if there is one. -->

## How it was verified

<!-- Commands you ran and their result, e.g. `pnpm check-types`, `pnpm --filter api test`, `pnpm --filter app test`, a manual run on the compose stack. -->

## Checklist

- [ ] `pnpm check-types` and `pnpm lint` pass
- [ ] Tests added or updated for the change; existing suites green
- [ ] API DTOs or routes changed → `pnpm generate:client` run and `packages/client` committed
- [ ] User-visible strings added to both `en.json` and `vi.json`
- [ ] I have signed the CLA (the bot will ask on this PR if not)
