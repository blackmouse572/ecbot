/**
 * Lowercase, without Vietnamese diacritics: "Tờ rơi Tết" reads as
 * "to roi tet". Text typed on a keyboard without them ("gap nhan vien")
 * then matches the same words typed with them ("gặp nhân viên").
 */
export function plainText(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/gi, 'd')
        .toLowerCase();
}
