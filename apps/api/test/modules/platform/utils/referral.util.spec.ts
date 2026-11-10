import {
    trackedLinkCode,
    widgetReferral,
} from '../../../../src/modules/platform/utils/referral.util';

describe('trackedLinkCode', () => {
    it('gives every channel the lowercase code we store', () => {
        expect(trackedLinkCode(' To-Roi-Tet ')).toBe('to-roi-tet');
    });

    it('drops a value that cannot be one of our codes', () => {
        expect(trackedLinkCode(undefined)).toBeUndefined();
        expect(trackedLinkCode('')).toBeUndefined();
        expect(trackedLinkCode('ads_campaign')).toBeUndefined();
        expect(trackedLinkCode('<script>')).toBeUndefined();
        expect(trackedLinkCode('a'.repeat(65))).toBeUndefined();
    });
});

describe('widgetReferral', () => {
    it('reads the tracked link code the widget sends', () => {
        expect(widgetReferral('trang-khuyen-mai')).toEqual({
            code: 'trang-khuyen-mai',
            source: 'link',
        });
    });

    it('ignores a missing or malformed code rather than failing the message', () => {
        expect(widgetReferral(undefined)).toBeUndefined();
        expect(widgetReferral('')).toBeUndefined();
        expect(widgetReferral('<script>')).toBeUndefined();
        expect(widgetReferral('a'.repeat(65))).toBeUndefined();
    });
});
