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

// Moves to a sub-page in the app without reloading, so the routes a setup
// mocked and the capture styles stay in place.
async function navigate(page, suffix) {
  await page.evaluate(
    (url) => {
      history.pushState({}, "", url);
      dispatchEvent(new PopStateEvent("popstate"));
    },
    new URL(page.url()).pathname + suffix,
  );
}

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
        .getByRole("heading", {
          name: /^(Knowledge Base|Nền tảng kiến thức|Cơ sở kiến thức)$/,
        })
        .evaluate((el) => el.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(500);
    },
    marks: [
      {
        id: "knowledge",
        target:
          "role=heading[name=/^(Knowledge Base|Nền tảng kiến thức|Cơ sở kiến thức)$/]",
        up: 3,
        pad: 2,
      },
      {
        id: "tools",
        target: "role=heading[name=/^(Tools|Công cụ)$/]",
        up: 2,
        pad: 2,
      },
      {
        id: "test-chat",
        target: "role=heading[name=/^(Test Chat|Chat Thử)/]",
        up: 3,
        pad: 2,
      },
    ],
  },
  {
    name: "knowledge-base",
    path: "/:ws/knowledge-base",
    marks: [
      { id: "create", target: "text=/^(Create|Tạo mới)$/", pad: 6 },
      {
        id: "status",
        target: "role=columnheader[name=/^(Status|Trạng thái)$/]",
        to: "text=/^(Completed|Hoàn thành)$/",
        pad: 2,
      },
      { id: "draft", target: "text=/^(Draft|Bản nháp)$/", pad: 6 },
    ],
  },
  {
    name: "knowledge-base-create",
    path: "/:ws/knowledge-base",
    setup: async (page) => {
      await page
        .getByText(/^(Create|Tạo mới)$/)
        .first()
        .click();
      await page
        .getByRole("dialog")
        .getByText(/^Media$/)
        .click();
      await page.waitForTimeout(1000);
    },
    marks: [
      {
        id: "type",
        target: "[role=dialog] >> text=/^(File|Tệp)$/",
        up: 3,
        pad: 4,
      },
      { id: "formats", target: "text=/JPG, PNG, WEBP/", pad: 4 },
    ],
  },
  {
    name: "agent-knowledge-add",
    path: "/:ws/chatbot/:agent",
    setup: async (page) => {
      // The Knowledge tab of the Capabilities section is open by default.
      const intro = page.getByText(
        /^(Documents and pages the agent reads to answer\.|Tài liệu và trang agent đọc để trả lời\.)$/,
      );
      await intro.evaluate((el) => el.scrollIntoView({ block: "start" }));
      await intro
        .locator("xpath=..")
        .getByRole("button", { name: /^(Add|Thêm)$/ })
        .click();
      await page.getByRole("dialog").getByRole("row").nth(1).waitFor();
      // Tick a processed item so the selection and the save button show.
      await page
        .getByRole("dialog")
        .getByRole("row")
        .filter({ hasText: /menu-dich-vu/ })
        .getByRole("checkbox")
        .click();
    },
    marks: [
      { id: "items", target: "[role=dialog] >> role=table", pad: 2 },
      {
        id: "save",
        target: "[role=dialog] >> role=button[name=/^(Add|Thêm)/] >> nth=-1",
        pad: 4,
      },
    ],
  },
  {
    name: "agent-followup-rules",
    path: "/:ws/chatbot/:agent",
    setup: async (page) => {
      // A local API lists no models without OpenRouter: show the agent's one.
      const models = [
        {
          id: "deepseek-v4-flash",
          name: "DeepSeek V4 Flash",
          provider: "deepseek",
          contextLength: null,
        },
      ];
      await page.route(/\/chatbots\/models/, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ statusCode: 200, data: models }),
        }),
      );
      await navigate(page, "/edit/settings");
      const rules = page.locator("textarea[name=followupRules]");
      await rules.waitFor();
      const cookies = await page.context().cookies();
      if (
        !cookies.some(
          (c) => c.name === "medusa_admin_language" && c.value === "vi",
        )
      ) {
        await rules.fill(
          "- If the customer asks for a reminder, set it for that time.\n" +
            "- If a booking has no deposit yet, remind after 24 hours.\n" +
            "- Never remind twice about the same thing.",
        );
      }
    },
    marks: [
      {
        id: "rules",
        target: "[role=dialog] >> text=/^(Follow-up rules|Quy tắc nhắc hẹn)/",
        up: 1,
        to: "textarea[name=followupRules]",
        pad: 6,
      },
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
      {
        id: "http",
        target: "text=/^(HTTP Tool|Công cụ HTTP)$/",
        up: 2,
        pad: 2,
      },
      {
        id: "mcp",
        target: "text=/^(Custom MCP|MCP tự cấu hình)$/",
        up: 2,
        pad: 2,
      },
      {
        id: "marketplace",
        target: "text=/^(Marketplace|Kho công cụ)$/",
        nth: 0,
        up: 2,
        pad: 2,
      },
    ],
  },
  {
    name: "tool-http-form",
    path: "/:ws/tools/new",
    setup: async (page) => {
      await page.getByText(/^(HTTP Tool|Công cụ HTTP)$/).click();
      await page.getByText(/^(Auth type|Loại xác thực)$/).waitFor();
    },
    marks: [
      {
        id: "about",
        target: "text=/^(Name|Tên)$/",
        up: 1,
        to: "textarea >> nth=0",
        pad: 6,
      },
      {
        id: "request",
        target: "text=/^(Method|Phương thức)$/",
        up: 1,
        to: "input[placeholder*='api.example.com']",
        pad: 6,
      },
      {
        id: "schema",
        target: "text=/^(Input schema \\(JSON\\)|Lược đồ đầu vào \\(JSON\\))$/",
        up: 1,
        pad: 4,
      },
      { id: "headers", target: "text=/^Headers \\(JSON\\)/", up: 1, pad: 4 },
      {
        id: "auth",
        target: "text=/^(Auth type|Loại xác thực)$/",
        up: 1,
        pad: 4,
      },
    ],
  },
  {
    name: "tool-mcp-form",
    path: "/:ws/tools/new",
    setup: async (page) => {
      await page.getByText(/^(Custom MCP|MCP tự cấu hình)$/).click();
      // Bearer token shows the credential field.
      await page.getByRole("combobox").last().click();
      await page.getByRole("option", { name: "Bearer token" }).click();
      await page.waitForTimeout(500);
    },
    marks: [
      {
        id: "url",
        target: "text=/^(MCP server URL|URL máy chủ MCP)$/",
        up: 1,
        pad: 4,
      },
      {
        id: "auth",
        target: "text=/^(Auth type|Loại xác thực)$/",
        up: 1,
        to: "input[type=password]",
        pad: 6,
      },
    ],
  },
  {
    name: "tool-marketplace-install",
    path: "/:ws/tools",
    setup: async (page) => {
      // Demo data: a Composio app, since a local API has no Composio key.
      const toolkit = {
        slug: "googlesheets",
        name: "Google Sheets",
        meta: {
          description:
            "Google Sheets is a cloud spreadsheet tool for creating, editing and sharing spreadsheets.",
          logo: "",
          categories: [{ id: "productivity", name: "Productivity" }],
        },
      };
      const access = {
        provider: "composio",
        requiresSignIn: true,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        actions: [
          {
            name: "GOOGLESHEETS_BATCH_GET",
            label: "Batch get spreadsheet",
            description:
              "Read values from one or more ranges of a spreadsheet.",
            destructive: false,
          },
          {
            name: "GOOGLESHEETS_LOOKUP_SPREADSHEET_ROW",
            label: "Look up spreadsheet row",
            description: "Find the first row where a column matches a value.",
            destructive: false,
          },
          {
            name: "GOOGLESHEETS_SPREADSHEETS_VALUES_APPEND",
            label: "Append values",
            description: "Add rows of values after the last row of a sheet.",
            destructive: false,
          },
          {
            name: "GOOGLESHEETS_CLEAR_VALUES",
            label: "Clear values",
            description: "Clear the values of a range, keeping its formatting.",
            destructive: true,
          },
        ],
      };
      const ok = (data) => ({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ statusCode: 200, data }),
      });
      await page.route(
        /\/marketplace\/toolkits\/googlesheets\/access/,
        (route) => route.fulfill(ok(access)),
      );
      await page.route(/\/marketplace\/toolkits\/googlesheets(\?|$)/, (route) =>
        route.fulfill(ok(toolkit)),
      );
      await navigate(page, "/marketplace/googlesheets");
      await page
        .getByText(/Batch get spreadsheet/)
        .first()
        .waitFor();
    },
    marks: [
      {
        id: "scopes",
        target: "text=/^(Access it asks for|Quyền truy cập được yêu cầu)$/",
        up: 1,
        pad: 2,
      },
      {
        id: "actions",
        target: "text=/^(What it can do|Công cụ này làm được gì)/",
        up: 1,
        pad: 2,
      },
      {
        id: "install",
        target: "role=button[name=/^(Install|Cài đặt)$/]",
        pad: 4,
      },
    ],
  },
  {
    name: "customer-tags",
    path: "/:ws/customer-tags",
    marks: [
      {
        id: "create",
        target: "role=button[name=/^(Create tag|Tạo nhãn)$/]",
        pad: 4,
      },
      {
        id: "handoff",
        target: "th >> text=/^(Triggers handoff|Chuyển cho nhân viên)$/",
        up: 1,
        pad: 2,
      },
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
      {
        id: "templates",
        target: "text=/^(Get started with|Bắt đầu với)$/",
        up: 1,
        pad: 6,
      },
    ],
  },
  {
    name: "skill-steps",
    path: "/:ws/skills/create",
    setup: async (page) => {
      await page
        .getByRole("button", { name: /^(Order status|Tình trạng đơn hàng)$/ })
        .click();
      // The steps sit below the fold: bring them to the top of the modal.
      await page
        .getByText(/^(Instructions|Hướng dẫn)$/)
        .evaluate((el) => el.scrollIntoView());
    },
    marks: [
      { id: "step", target: "text=/^(Ask|Hỏi)$/", up: 2, pad: 4 },
      { id: "if", target: "text=/^(If|Nếu)$/", up: 2, pad: 4 },
      // Scoped to the modal: the sidebar also has a "Công cụ" link.
      {
        id: "tool",
        target: "[role=dialog] >> text=/^(Tool|Công cụ)$/",
        up: 2,
        pad: 4,
      },
      {
        id: "add",
        target: "role=button[name=/^(Add step|Thêm bước)$/]",
        pad: 4,
      },
    ],
  },
  {
    // The cookbook tutorial's spa booking skill, filled in through the
    // "Book an appointment" template.
    name: "skill-tutorial",
    path: "/:ws/skills/create",
    setup: async (page) => {
      const cookies = await page.context().cookies();
      const vi = cookies.some(
        (c) => c.name === "medusa_admin_language" && c.value === "vi",
      );
      const t = vi
        ? {
            name: "Đặt lịch spa",
            description:
              "Dùng khi khách muốn đặt một dịch vụ hoặc hỏi giờ còn trống.",
            rule: "Không bao giờ hứa giảm giá hay một mức giá chưa kiểm tra.",
            steps: [
              "Dịch vụ khách muốn làm.",
              "Ngày và giờ.",
              "Giờ hẹn ngoài 9:00 đến 18:00.",
              "Giờ mở cửa.",
              "Giờ khác.",
              "Tên và số điện thoại.",
              "Tóm tắt lịch hẹn để khách xác nhận.",
              "Dịch vụ là gói trên 1.000.000đ.",
              "Bạn vui lòng chuyển khoản cọc 100.000đ vào tài khoản 0123456789, Spa Hoa Xinh. Lịch của bạn được giữ khi spa nhận được cọc.",
              "Lịch mới",
            ],
          }
        : {
            name: "Spa booking",
            description:
              "Use when the customer wants to book a service or asks for a free time.",
            rule: "Never promise a discount or a price you have not checked.",
            steps: [
              "The service they want.",
              "The day and time.",
              "The time is outside 9:00 to 18:00.",
              "The opening hours.",
              "Another time.",
              "Their name and phone number.",
              "A summary of the booking to confirm.",
              "The service is a package over 1,000,000đ.",
              "Please transfer a 100,000đ deposit to account 0123456789, Spa Hoa Xinh. Your booking is held once we receive it.",
              "New booking",
            ],
          };
      const s = t.steps;
      const skill = {
        name: t.name,
        description: t.description,
        guardrails: [t.rule],
        format: "STEPS",
        steps: [
          { id: "service", type: "ask", text: s[0] },
          { id: "time", type: "ask", text: s[1] },
          {
            id: "hours",
            type: "if",
            branches: [
              {
                id: "hours-out",
                condition: s[2],
                steps: [
                  { id: "hours-tell", type: "tell", text: s[3] },
                  { id: "hours-ask", type: "ask", text: s[4] },
                ],
              },
            ],
          },
          { id: "name", type: "ask", text: s[5] },
          { id: "confirm", type: "tell", text: s[6] },
          {
            id: "deposit",
            type: "if",
            branches: [
              {
                id: "deposit-yes",
                condition: s[7],
                steps: [{ id: "deposit-say", type: "say", text: s[8] }],
              },
            ],
          },
          { id: "tag", type: "tool", toolId: "system:add_tag", action: s[9] },
        ],
      };
      await page.route(/\/skill\/[0-9a-f-]{36}(\?|$)/, async (route) => {
        const response = await route.fetch();
        const json = await response.json();
        json.data = { ...json.data, ...skill };
        await route.fulfill({ response, json });
      });
      await page
        .getByRole("button", { name: /^(Book an appointment|Đặt lịch hẹn)$/ })
        .click();
      await page.getByText(s[8]).waitFor();
      // Start at the instructions, so all seven steps fit.
      await page
        .getByText(/^(Instructions|Hướng dẫn)$/)
        .evaluate((el) => el.scrollIntoView());
    },
    marks: [
      { id: "if", target: "[role=dialog] >> text=/^(If|Nếu)$/", up: 2, pad: 4 },
      {
        id: "say",
        target: "[role=dialog] >> text=/^(Say|Nói)$/",
        up: 2,
        pad: 4,
      },
      {
        id: "tool",
        target: "[role=dialog] >> text=/^(Tool|Công cụ)$/",
        up: 2,
        pad: 4,
      },
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
      const template = page.getByRole("button", {
        name: /^(Talk to a person|Gặp nhân viên)$/,
      });
      await template.waitFor();
      await template.click();
      await page
        .getByRole("button", { name: /^(Add step|Thêm bước)$/ })
        .last()
        .click();
      await page
        .getByRole("menuitem")
        .filter({ hasText: /Tool|Công cụ/ })
        .click();
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
      {
        id: "tools",
        target: "role=option[name=/HTTP/] >> nth=0",
        to: "role=option[name=/Google Calendar/]",
        pad: 2,
      },
    ],
  },
  {
    name: "usage",
    path: "/:ws/usage",
    setup: async (page) => {
      // The debug card only exists in development builds.
      await page.evaluate(() => {
        const heading = [...document.querySelectorAll("main *")].find(
          (el) =>
            el.childElementCount === 0 && /^Debug/.test(el.textContent ?? ""),
        );
        heading
          ?.closest("section, [class*=shadow], [class*=rounded]")
          ?.remove();
      });
    },
    marks: [
      { id: "range", target: "role=combobox", pad: 4 },
      { id: "plan", target: "text=/^(Plan)$/", up: 3, pad: 2 },
      {
        id: "breakdown",
        target: "text=/^(Daily usage|Usage theo ngày)$/",
        up: 1,
        to: "text=/^(By platform|Theo platform)$/",
        pad: 4,
      },
      {
        id: "alerts",
        target: "text=/^(Alert settings|Cấu hình cảnh báo)$/",
        up: 0,
        pad: 6,
      },
    ],
  },
  {
    name: "api-keys",
    path: "/:ws/settings/client-credentials",
    marks: [
      { id: "nav", target: "role=link[name=/^API keys?$/]", pad: 4 },
      {
        id: "quickstart",
        target: "main >> text=/^(Quick start|Bắt đầu nhanh)$/",
        up: 2,
        pad: 2,
      },
      {
        id: "create",
        target: "main >> role=button[name=/^(Create API key|Tạo API key)$/]",
        pad: 4,
      },
    ],
  },
  {
    // Creates a key each run, so capture it after "api-keys".
    name: "api-key-created",
    path: "/:ws/settings/client-credentials",
    setup: async (page) => {
      await page
        .getByRole("main")
        .getByRole("button", { name: /^(Create API key|Tạo API key)$/ })
        .click();
      const drawer = page.getByRole("dialog");
      await drawer.locator("input").first().fill("Claude Code");
      await drawer.getByRole("button", { name: /^(Create|Tạo mới)$/ }).click();
      await drawer.getByText(/^(MCP config|Cấu hình MCP)$/).waitFor();
      // The success toast covers the drawer title until it closes.
      await page
        .getByText(/^(API key created\.|Đã tạo API key\.)$/)
        .waitFor({ state: "hidden", timeout: 15000 });
    },
    marks: [
      {
        id: "warning",
        target: "[role=dialog] >> text=/^(Copy it now|Hãy sao chép ngay)/",
        pad: 4,
      },
      {
        id: "copy",
        target: "[role=dialog] >> text=/^API key$/",
        up: 2,
        pad: 4,
      },
      {
        id: "config",
        target: "[role=dialog] >> text=/^(MCP config|Cấu hình MCP)$/",
        up: 2,
        pad: 4,
      },
      { id: "saved", target: "[role=dialog] >> role=checkbox", up: 1, pad: 4 },
    ],
  },
];
