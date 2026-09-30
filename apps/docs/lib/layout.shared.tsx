import { uiTranslations } from "fumadocs-ui/i18n";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { i18n } from "./i18n";
import { repoUrl, SITE_URL } from "./urls";

export const translations = i18n
  .translations()
  .extend(uiTranslations())
  .add({
    en: { displayName: "English" },
    vi: {
      displayName: "Tiếng Việt",
      "Search(search trigger)": "Tìm kiếm",
      "Search(search dialog)": "Tìm trong tài liệu",
      "No results found(search dialog)": "Không tìm thấy kết quả",
      "On this page(table of contents)": "Trong trang này",
      "No Headings(table of contents)": "Không có mục nào",
      "Last updated on(page footer)": "Cập nhật lần cuối",
      "Next Page(pagination)": "Trang sau",
      "Previous Page(pagination)": "Trang trước",
      "Choose a language(language switcher)": "Chọn ngôn ngữ",
      "Copy Markdown(page actions)": "Sao chép Markdown",
      "Copied Markdown(page actions)": "Đã sao chép",
      "Open(page actions)": "Mở",
      "Open in ChatGPT(page actions)": "Mở bằng ChatGPT",
      "Open in Claude(page actions)": "Mở bằng Claude",
      "Open in GitHub(page actions)": "Xem trên GitHub",
      "View as Markdown(page actions)": "Xem dạng Markdown",
      "Read {url}, I want to ask questions about it.(page actions)":
        "Đọc {url}, tôi muốn hỏi về nội dung này.",
      "Edit on GitHub(edit page)": "Sửa trên GitHub",
      "Page Not Found(404 not found page)": "Không tìm thấy trang",
      "Back to Home(404 not found page)": "Về trang chủ",
    },
  });

export function baseOptions(lang: string): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="font-display font-medium">
          Ecbot <span className="text-fd-muted-foreground">Docs</span>
        </span>
      ),
      url: `/${lang}/docs`,
    },
    links: [
      {
        text: lang === "vi" ? "Trang chủ" : "Home",
        url: `${SITE_URL}/${lang}`,
        external: true,
      },
    ],
    githubUrl: repoUrl,
  };
}
