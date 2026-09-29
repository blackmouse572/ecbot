import en from '@app/languages/en/request.json';
import vi from '@app/languages/vi/request.json';

// forbidNonWhitelisted reports the `whitelistValidation` constraint; without
// a string the client sees the raw key `request.whitelistValidation`.
describe('request.whitelistValidation message', () => {
    it.each([
        ['en', en],
        ['vi', vi],
    ])('is translated in %s', (_lang, messages) => {
        const message = (messages as Record<string, string>)
            .whitelistValidation;

        expect(message).toContain('{property}');
        expect(message).not.toContain('—');
    });
});
