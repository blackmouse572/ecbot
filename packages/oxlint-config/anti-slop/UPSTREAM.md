# anti-slop (vendored)

- Source: https://github.com/dmmulroy/anti-slop, `skills/install-anti-slop/assets/anti-slop/`
- Commit: 13909c9e07590f5a85d93c62712259fe14a883f7 (2026-10-13)
- Installed path: `packages/oxlint-config/anti-slop/`, enabled through `packages/oxlint-config/anti-slop.json`
- Deviations: the opt-in `effect/` rules were left out (no workspace depends on `effect`). One rule source change: a `nosemgrep` comment on the `new RegExp` in `rules/require-safety-comment-for-type-assertion.ts`. Semgrep flags a non-literal RegExp, but the markers come from our config and are escaped.

This code is ours to maintain. Severities live in `anti-slop.json`: rules with no findings in our code are errors, the rest are warnings until their findings are fixed.
