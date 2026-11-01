# anti-slop (vendored)

- Source: https://github.com/dmmulroy/anti-slop, `skills/install-anti-slop/assets/anti-slop/`
- Commit: 13909c9e07590f5a85d93c62712259fe14a883f7 (2026-10-13)
- Installed path: `packages/oxlint-config/anti-slop/`, enabled through `packages/oxlint-config/anti-slop.json`
- Deviations: the opt-in `effect/` rules were left out (no workspace depends on `effect`). One rule source change: a `nosemgrep` comment on the `new RegExp` in `rules/require-safety-comment-for-type-assertion.ts`. Semgrep flags a non-literal RegExp, but the markers come from our config and are escaped.

This code is ours to maintain. Severities live in `anti-slop.json`: rules with no findings in our code are errors, the rest are warnings until their findings are fixed.

Upstream's rule tests were not copied: the asset bundle at this commit ships none, so the reference to `rules/require-readable-spacing.test.ts` in `vendor/eslint-stylistic/UPSTREAM.md` points at a file that only exists upstream.

`oxlint` is pinned to exactly the `@oxlint/plugins` version (root `pnpm.overrides`), so the plugin API and the runtime that loads it move together.

## License

The vendored code is MIT licensed by its author:

```
MIT License

Copyright (c) 2026 Dillon Mulroy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
