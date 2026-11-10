import { widgetReferral } from '../../../../src/modules/platform/utils/widget-referral.util';

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
