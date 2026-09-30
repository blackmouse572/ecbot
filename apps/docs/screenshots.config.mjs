// App screenshots used in the docs. `pnpm --filter docs shots` captures each
// one in English and Vietnamese against a running app with demo data (see
// README.md, "Screenshots").
//
// Each shot opens `path` (":ws" and ":agent" come from SHOTS_WORKSPACE and
// SHOTS_AGENT), runs `setup`, and records where each mark's element is. Marks
// hold positions only; their numbered labels live in the MDX next to the text
// that explains them:
//
//   <Screenshot name="knowledge-base" alt="…">
//     <Mark id="create">Add a file, a web page or a note.</Mark>
//   </Screenshot>
//
// Targets are Playwright selectors. The same selector runs in both languages,
// so match text with an alternation such as /^(Create|Tạo mới)$/. `up: n`
// widens the box to the n-th parent, `to` stretches it over a second element,
// `pad` adds space around it.

/** @typedef {{ id: string, target: string, up?: number, pad?: number, nth?: number, to?: string }} Mark */
/** @typedef {{ name: string, path: string, marks: Mark[], setup?: (page: import('playwright').Page) => Promise<void> }} Shot */

/** @type {Shot[]} */
export const shots = [
  {
    name: "builder-start",
    path: "/:ws/chatbot/create",
    marks: [
      { id: "describe", target: "textarea:visible", pad: 4 },
      {
        id: "templates",
        target: "role=button[name=/Restaurant|Nhà hàng/]",
        to: "role=button[name=/Scheduling|lịch hẹn|Lịch hẹn/]",
        pad: 6,
      },
    ],
  },
  {
    name: "builder-question",
    path: "/:ws/chatbot/create",
    setup: async (page) => {
      await page
        .locator("textarea:visible")
        .first()
        .fill(
          "Kunmart is an online baby store in Ho Chi Minh City. We sell formula milk, diapers and bottles.",
        );
      await page.keyboard.press("Enter");
      await page.waitForTimeout(6000);
    },
    marks: [
      { id: "answer", target: "text=/^(Question|Câu) \\d+/", up: 1, pad: 2 },
      { id: "progress", target: "text=/^(Question|Câu) \\d+/", pad: 4 },
      { id: "next", target: "role=button[name=/^(Next|Tiếp|Sau)$/]", pad: 4 },
    ],
  },
  {
    name: "agent-page",
    path: "/:ws/chatbot/:agent",
    setup: async (page) => {
      // Center the knowledge section so the test chat header stays in view.
      await page
        .getByRole("heading", { name: /^(Knowledge Base|Nền tảng kiến thức|Cơ sở kiến thức)$/ })
        .evaluate((el) => el.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(500);
    },
    marks: [
      { id: "knowledge", target: "role=heading[name=/^(Knowledge Base|Nền tảng kiến thức|Cơ sở kiến thức)$/]", up: 3, pad: 2 },
      { id: "tools", target: "role=heading[name=/^(Tools|Công cụ)$/]", up: 2, pad: 2 },
      { id: "test-chat", target: "role=heading[name=/^(Test Chat|Chat Thử)/]", up: 3, pad: 2 },
    ],
  },
  {
    name: "knowledge-base",
    path: "/:ws/knowledge-base",
    marks: [
      { id: "create", target: "text=/^(Create|Tạo mới)$/", pad: 6 },
      { id: "status", target: "role=columnheader[name=/^(Status|Trạng thái)$/]", to: "text=/^(Completed|Hoàn thành)$/", pad: 2 },
      { id: "draft", target: "text=/^(Draft|Bản nháp)$/", pad: 6 },
    ],
  },
  {
    name: "knowledge-base-create",
    path: "/:ws/knowledge-base",
    setup: async (page) => {
      await page.getByText(/^(Create|Tạo mới)$/).first().click();
      await page.waitForTimeout(1500);
    },
    marks: [
      { id: "type", target: "[role=dialog] >> text=/^(File|Tệp)$/", up: 3, pad: 4 },
      { id: "formats", target: "text=/PDF, DOCX/", pad: 4 },
    ],
  },
  {
    name: "channel-platforms",
    path: "/:ws/accounts/create",
    marks: [
      { id: "facebook", target: "text=/^Facebook$/", up: 2, pad: 2 },
      { id: "roadmap", target: "text=/^Instagram$/", up: 2, pad: 2 },
      { id: "website", target: "text=/^Website$/", up: 2, pad: 2 },
    ],
  },
  {
    name: "tool-types",
    path: "/:ws/tools/new",
    marks: [
      { id: "http", target: "text=/^(HTTP Tool|Công cụ HTTP)$/", up: 2, pad: 2 },
      { id: "mcp", target: "text=/^(Custom MCP|MCP tự cấu hình)$/", up: 2, pad: 2 },
      { id: "marketplace", target: "text=/^(Marketplace|Kho công cụ)$/", nth: 0, up: 2, pad: 2 },
    ],
  },
  {
    name: "customer-tags",
    path: "/:ws/customer-tags",
    marks: [
      { id: "create", target: "role=button[name=/^(Create tag|Tạo nhãn)$/]", pad: 4 },
      { id: "handoff", target: "th >> text=/^(Triggers handoff|Chuyển cho nhân viên)$/", up: 1, pad: 2 },
    ],
  },
];
