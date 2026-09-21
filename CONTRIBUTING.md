# Contributing to Ecbot

Thanks for being here. Bug reports, adapters, docs fixes and features are all welcome.

## Before you start

- **Small fix?** Just open a pull request.
- **Anything larger?** Open an issue first and describe the approach. It is much cheaper to disagree about a design in an issue than in a finished branch.
- **Looking for somewhere to start?** Three channel adapters are specced and unimplemented — Instagram, TikTok Shop, Shopee. They are labelled `good first issue` and each has an issue describing the interface, the platform docs, and what "done" means.

## Contributor Licence Agreement

Your first pull request will ask you to sign a CLA. It lets Ecbot distribute your contribution under the AGPL-3.0 *and* in Ecbot Cloud. It does not take your copyright — you keep it. The bot handles it; it takes a click.

## Getting set up

See the [README](./README.md). If it does not get you to a running system, that is a bug worth reporting on its own.

## How we work

Conventions are already written down. Read the one that matches what you are touching:

- [`AGENTS.md`](./AGENTS.md) — repository structure and the rules that apply everywhere. **Start here.**
- [`CONTEXT.md`](./CONTEXT.md) — the domain vocabulary. Read it before you name anything. Using the wrong word for an existing concept is the most common thing we ask contributors to change.
- `.github/instructions/` — per-area detail: API architecture, auth, database and migrations, jobs, responses and i18n; React, data fetching, forms, routing, state; shared packages.

### Working with a coding agent

Much of Ecbot was written with one, and the repository is set up for it. If you use [Claude Code](https://claude.com/claude-code), the project skills in `.agents/skills/` load automatically and will route you to the right conventions for whatever you are touching — `eccho-backend`, `eccho-frontend`, `eccho-platform-adapters`.

Two plugins we recommend on top of that, both from the official marketplace — install with `/plugin` inside Claude Code:

- **`superpowers@claude-plugins-official`** — process skills. `brainstorming` before you build anything non-trivial, `test-driven-development` for the red→green loop `AGENTS.md` asks for, `systematic-debugging` instead of guessing at a failure, `requesting-code-review` before you open the PR.
- **`mattpocock-skills@claude-plugins-official`** — TypeScript-leaning craft skills. `domain-modeling` and `codebase-design` are the useful ones here; `resolving-merge-conflicts` earns its keep on long-running branches.

None of this is required. Nothing in review depends on how you wrote the code, only on what you wrote. But `AGENTS.md` is written assuming an agent reads it, so if you use one, point it there first.

Points worth repeating:

- **Keep changes minimal.** The smallest change that solves the problem. No speculative abstraction, no configurability nobody asked for, no error handling for impossible states.
- **Tests first** for behaviour changes. `pnpm test:api` for the backend.
- **Regenerate the client** after changing API DTOs or routes: `pnpm generate:client`.
- **Migrations are hand-checked.** Review what MikroORM generates before committing it; do not commit a wholesale regenerated snapshot.

## Pull requests

Run these before pushing:

```bash
pnpm lint
pnpm check-types
pnpm test:api
```

Write a description that says what changed and why. Link the issue. If it changes behaviour a user can see, say what they will now experience.

Commit messages follow Conventional Commits — `feat(api): …`, `fix(app): …`, `docs: …`.

## Adding a channel adapter

Adapters live in `apps/api/src/modules/platform/adapters/`, one directory each, extending `PlatformAdapter`. Look at `telegram/` first — it is the smallest complete one. `messenger/` is the most thorough. Register the adapter in the `ADAPTERS` array in `platform.module.ts` and add its type to `ENUM_ACCOUNT_TYPE`.

An adapter is done when it can verify a webhook signature, parse inbound events, fetch a sender profile, and send a reply — with tests that do not call the live platform.

## Reporting bugs and vulnerabilities

Bugs: [open an issue](../../issues/new). Vulnerabilities: **do not** — see [SECURITY.md](./SECURITY.md).

Support expectations for self-hosting are in [SUPPORT.md](./SUPPORT.md).

## Licence

Contributions are licensed under the [AGPL-3.0](./LICENSE). The Ecbot name and logo are not — see [TRADEMARK.md](./TRADEMARK.md).
