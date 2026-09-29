import { toWorkspaceSlug } from '@app/modules/workspace/utils/workspace-slug.util';

describe('toWorkspaceSlug', () => {
    it('lowercases, so the edit form (lowercase only) accepts the slug', () => {
        expect(toWorkspaceSlug('QA 2026-09-29 Bep Nha Mo')).toBe(
            'qa-2026-09-29-bep-nha-mo'
        );
    });

    it('strips Vietnamese diacritics and symbols', () => {
        expect(toWorkspaceSlug('Bếp Nhà Mơ & Đồ uống!')).toBe(
            'bep-nha-mo-and-do-uong'
        );
    });

    it('returns an empty string when nothing slug-safe is left', () => {
        expect(toWorkspaceSlug('!!!')).toBe('');
    });
});
