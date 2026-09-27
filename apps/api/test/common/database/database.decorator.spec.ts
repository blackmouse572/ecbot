import { DatabaseHelperQueryContain } from '@app/common/database/decorators/database.decorator';

describe('DatabaseHelperQueryContain', () => {
    it('treats regex metacharacters in the search value as literal text', () => {
        const { name } = DatabaseHelperQueryContain('name', 'a.*b');

        expect(name).toBeInstanceOf(RegExp);
        // '.' and '*' must be escaped: only the literal string 'a.*b' matches.
        expect(name.test('a.*b')).toBe(true);
        expect(name.test('aXXXb')).toBe(false);
        expect(name.test('ab')).toBe(false);
    });

    it('does not throw on an unbalanced pattern like an unmatched "("', () => {
        expect(() => DatabaseHelperQueryContain('name', '(')).not.toThrow();

        const { name } = DatabaseHelperQueryContain('name', '(');
        expect(name.test('(')).toBe(true);
        expect(name.test('x')).toBe(false);
    });

    it('still performs a "contains" match for plain text', () => {
        const { name } = DatabaseHelperQueryContain('name', 'smith');

        expect(name.test('john smith')).toBe(true);
        expect(name.test('SMITH')).toBe(false); // case handling unchanged
    });

    it('escapes metacharacters inside the fullWord \\b...\\b wrapper too', () => {
        const { name } = DatabaseHelperQueryContain('name', 'a+b', {
            fullWord: true,
        });

        expect(name.test('a+b')).toBe(true);
        expect(name.test('aab')).toBe(false); // '+' must not be treated as "one or more"
    });
});
