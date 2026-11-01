# anti-slop (vendored)

- Source: https://github.com/dmmulroy/anti-slop, `skills/install-anti-slop/assets/anti-slop/`
- Commit: 13909c9e07590f5a85d93c62712259fe14a883f7 (2026-10-13)
- Installed path: `packages/oxlint-config/anti-slop/`, enabled through `packages/oxlint-config/anti-slop.json`
- Deviations: the opt-in `effect/` rules were left out (no workspace depends on `effect`). No rule source was changed.

This code is ours to maintain. Severities live in `anti-slop.json`: rules with no findings in our code are errors, the rest are warnings until their findings are fixed.
