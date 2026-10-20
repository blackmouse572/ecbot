import type { BusinessTypeId } from "./business-types";

// Plain words that name a kind of business, VI and EN. Used when the model
// gives no suggestion, so a clear description still picks the type (#256).
const KEYWORDS: [BusinessTypeId, RegExp][] = [
  ["restaurant", /cà phê|cafe|café|coffee|quán ăn|nhà hàng|quán nhậu|trà sữa|tiệm bánh|bakery|restaurant|\bbistro\b|\bquán (?:lẩu|nướng|phở|bún|cơm|chay)/iu],
  ["beauty", /\bspa\b|\bnail|salon|thẩm mỹ viện|làm tóc|cắt tóc|gội đầu|barber|làm đẹp/iu],
  ["healthcare", /phòng khám|nha khoa|bệnh viện|\bclinic\b|dental|\bdentist/iu],
  ["fashion", /quần áo|thời trang|giày dép|túi xách|\bfashion\b|clothing|\bclothes\b/iu],
  ["cosmetics", /mỹ phẩm|skincare|chăm sóc da|cosmetics/iu],
  ["education", /trung tâm (?:tiếng|anh ngữ|ngoại ngữ|gia sư|luyện thi)|khoá học|khóa học|\bcourses?\b|language (?:centre|center|school)|tutoring/iu],
  ["hotel", /khách sạn|homestay|resort|\bhotel\b|\bhostel\b|nhà nghỉ/iu],
  ["fitness", /\bgym\b|\byoga\b|fitness|thể hình|pilates/iu],
  ["real_estate", /bất động sản|real estate|căn hộ dự án/iu],
  ["travel", /du lịch|\btours?\b|travel agency|lữ hành/iu],
  ["automotive", /ô tô|xe máy|garage|gara|showroom xe|car dealer/iu],
];

/** The one business type the text clearly names, or null when none or several do. */
export function guessBusinessType(text: string): BusinessTypeId | null {
  const hits = KEYWORDS.filter(([, re]) => re.test(text)).map(([id]) => id);
  return hits.length === 1 ? hits[0]! : null;
}
