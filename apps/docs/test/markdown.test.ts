import { describe, expect, it } from "vitest";
import { absoluteLinks, screenshotsToMarkdown } from "../lib/markdown";

describe("screenshotsToMarkdown", () => {
  it("turns a screenshot into an image and a numbered callout list", () => {
    const md = `Intro.

<Screenshot name="knowledge-base" alt="The list">
  <Mark id="create">
    **Create**

     adds a new item.
  </Mark>

  <Mark id="status">Status shows readiness.</Mark>
</Screenshot>

After.`;
    expect(screenshotsToMarkdown(md, "vi")).toBe(`Intro.

![The list](https://ecbot.dev/_docs/screenshots/vi/knowledge-base.png)

1. **Create** adds a new item.
2. Status shows readiness.

After.`);
  });
});

describe("absoluteLinks", () => {
  it("prefixes root-relative links with the site URL", () => {
    expect(absoluteLinks("- [Tools](/en/docs/tools): x")).toBe(
      "- [Tools](https://ecbot.dev/en/docs/tools): x",
    );
  });
});
