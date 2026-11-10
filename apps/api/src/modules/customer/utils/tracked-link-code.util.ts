import { TRACKED_LINK_CODE_MAX_LENGTH } from '../constants/tracked-link.constant';

/**
 * A readable code from a source name, e.g. "Tờ rơi Tết" -> "to-roi-tet".
 * Only a-z, 0-9 and "-", which every channel's ref or start payload accepts.
 */
export function trackedLinkCodeFromName(name: string): string {
    const code = name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/gi, 'd')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, TRACKED_LINK_CODE_MAX_LENGTH)
        .replace(/-+$/, '');

    return code || 'link';
}
