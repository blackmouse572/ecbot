# Security Policy

## Reporting a vulnerability

**Do not open a public issue.**

Report privately through GitHub's [private vulnerability reporting](../../security/advisories/new). If that is unavailable to you, email **security@ecbot.dev**.

Please include:

- what the issue is, and which component it affects
- how to reproduce it
- what an attacker gains

We will acknowledge within 5 working days and keep you informed while we work on a fix. We will credit you in the advisory unless you prefer otherwise.

## Scope

In scope: this repository's source, and Ecbot Cloud.

Out of scope: findings that require a self-hosted operator to have misconfigured their own deployment — for example running `pnpm db:seed` against a production database, exposing an instance without setting the documented secrets, or leaving debug/test flags enabled. Those are documented behaviours, not vulnerabilities. See SUPPORT.md.

## Supported versions

Security fixes land on `main`. There are no maintained release branches yet.
