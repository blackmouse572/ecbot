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
  {
    name: "customer-suggestions",
    path: "/:ws/customers/suggestions",
    marks: [
      { id: "nav", target: "role=link[name=/^(Suggestion|Gợi ý)/]", pad: 4 },
      { id: "status", target: "text=/^(Pending|Chờ xử lý)$/", pad: 6 },
    ],
  },
  {
    name: "skills",
    path: "/:ws/skills",
    marks: [
      { id: "create", target: "text=/^(Create|Tạo mới)$/", up: 1, pad: 2 },
      { id: "skill", target: "text=/^Refund policy$/", up: 1, pad: 4 },
    ],
  },
  {
    name: "skill-create",
    path: "/:ws/skills/create",
    marks: [
      { id: "templates", target: "text=/^(Get started with|Bắt đầu với)$/", up: 1, pad: 6 },
    ],
  },
  {
    name: "skill-steps",
    path: "/:ws/skills/create",
    setup: async (page) => {
      await page.getByRole("button", { name: /^(Order status|Tình trạng đơn hàng)$/ }).click();
      // The steps sit below the fold: bring them to the top of the modal.
      await page.getByText(/^(Instructions|Hướng dẫn)$/).evaluate((el) => el.scrollIntoView());
    },
    marks: [
      { id: "step", target: "text=/^(Ask|Hỏi)$/", up: 2, pad: 4 },
      { id: "if", target: "text=/^(If|Nếu)$/", up: 2, pad: 4 },
      { id: "tool", target: "text=/^(Tool|Công cụ)$/", up: 2, pad: 4 },
      { id: "add", target: "role=button[name=/^(Add step|Thêm bước)$/]", pad: 4 },
    ],
  },
  {
    name: "skill-tool-picker",
    path: "/:ws/skills/create",
    setup: async (page) => {
      // Demo data: an MCP tool next to the workspace's HTTP tools.
      const mcp = {
        id: "00000000-0000-4000-8000-000000000001",
        kind: "MCP",
        name: "google-calendar",
        slug: "google-calendar",
        displayName: "Google Calendar",
        status: "ACTIVE",
      };
      await page.route(/\/tool\?/, async (route) => {
        const response = await route.fetch();
        const json = await response.json();
        json.data = [...(json.data ?? []), mcp];
        await route.fulfill({ response, json });
      });
      const template = page.getByRole("button", { name: /^(Talk to a person|Gặp nhân viên)$/ });
      await template.waitFor();
      await template.click();
      await page.getByRole("button", { name: /^(Add step|Thêm bước)$/ }).last().click();
      await page.getByRole("menuitem").filter({ hasText: /Tool|Công cụ/ }).click();
      const picker = page.getByRole("combobox").last();
      // Near the top, so the list opens below the picker.
      await picker.evaluate((el) => el.scrollIntoView({ block: "start" }));
      await picker.click();
      const calendar = page.getByRole("option", { name: /Google Calendar/ });
      await calendar.waitFor();
      // Built-in actions come first: scroll the list to the workspace's tools.
      await calendar.evaluate((el) => el.scrollIntoView({ block: "end" }));
    },
    marks: [
      { id: "search", target: "role=combobox >> nth=-1", up: 1, pad: 2 },
      { id: "tools", target: "role=option[name=/HTTP/] >> nth=0", to: "role=option[name=/Google Calendar/]", pad: 2 },
    ],
  },
  {
    name: "usage",
    path: "/:ws/usage",
    setup: async (page) => {
      // The debug card only exists in development builds.
      await page.evaluate(() => {
        const heading = [...document.querySelectorAll("main *")].find(
          (el) => el.childElementCount === 0 && /^Debug/.test(el.textContent ?? ""),
        );
        heading?.closest("section, [class*=shadow], [class*=rounded]")?.remove();
      });
    },
    marks: [
      { id: "range", target: "role=combobox", pad: 4 },
      { id: "plan", target: "text=/^(Plan)$/", up: 3, pad: 2 },
      { id: "breakdown", target: "text=/^(Daily usage|Usage theo ngày)$/", up: 1, to: "text=/^(By platform|Theo platform)$/", pad: 4 },
      { id: "alerts", target: "text=/^(Alert settings|Cấu hình cảnh báo)$/", up: 0, pad: 6 },
    ],
  },
  {
    name: "api-keys",
    path: "/:ws/settings/client-credentials",
    marks: [
      { id: "nav", target: "role=link[name=/^API key$/]", pad: 4 },
      { id: "create", target: "main >> role=button[name=/^(Create|Tạo mới)$/]", pad: 4 },
    ],
  },
  {
    // Creates a real key each run, so capture it after "api-keys".
    name: "api-key-created",
    path: "/:ws/settings/client-credentials",
    setup: async (page) => {
      await page.getByRole("main").getByRole("button", { name: /^(Create|Tạo mới)$/ }).click();
      const drawer = page.getByRole("dialog");
      await drawer.locator("input").first().fill("Claude Code");
      await drawer.getByRole("button", { name: /^(Create|Tạo mới)$/ }).click();
      await drawer.getByText(/^x-api-key$/).waitFor();
      // The success toast covers the drawer title until it closes.
      await page.getByText(/^(Credential created\.|Đã tạo credential\.)$/).waitFor({ state: "hidden", timeout: 15000 });
    },
    marks: [
      { id: "warning", target: "[role=dialog] >> text=/^(Copy the secret now|Sao chép secret ngay)/", pad: 4 },
      { id: "copy", target: "[role=dialog] >> text=/^x-api-key$/", up: 1, pad: 4 },
    ],
  },
];
