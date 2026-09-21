import { ForbiddenException } from '@nestjs/common';
import { TestHelpersGuard } from 'src/modules/test-helpers/test-helpers.guard';
import { shouldLoadTestHelpers } from 'src/modules/test-helpers/test-helpers.module';

function ctx(headers: Record<string, any>) {
    const request: any = { headers };
    return {
        switchToHttp: () => ({ getRequest: () => request }),
    } as any;
}

describe('TestHelpersGuard', () => {
    let guard: TestHelpersGuard;
    const originalKey = process.env.E2E_TEST_KEY;

    beforeEach(() => {
        guard = new TestHelpersGuard();
        process.env.E2E_TEST_KEY = 'correct-key';
    });

    afterAll(() => {
        process.env.E2E_TEST_KEY = originalKey;
    });

    it('accepts the correct key', () => {
        expect(guard.canActivate(ctx({ 'x-test-key': 'correct-key' }))).toBe(
            true
        );
    });

    it('rejects a wrong key', () => {
        expect(() =>
            guard.canActivate(ctx({ 'x-test-key': 'wrong-key' }))
        ).toThrow(ForbiddenException);
    });

    it('rejects when E2E_TEST_KEY is unset', () => {
        delete process.env.E2E_TEST_KEY;
        expect(() =>
            guard.canActivate(ctx({ 'x-test-key': 'correct-key' }))
        ).toThrow(ForbiddenException);
    });

    it('rejects a key of a different length without throwing TypeError', () => {
        expect(() =>
            guard.canActivate(ctx({ 'x-test-key': 'short' }))
        ).toThrow(ForbiddenException);
    });

    it('rejects when the header is present as an array', () => {
        expect(() =>
            guard.canActivate(ctx({ 'x-test-key': ['correct-key'] }))
        ).toThrow(ForbiddenException);
    });
});

describe('shouldLoadTestHelpers', () => {
    it('loads when E2E_TEST_HELPERS=true', () => {
        expect(shouldLoadTestHelpers({ E2E_TEST_HELPERS: 'true' })).toBe(
            true
        );
    });

    it('refuses to load when NODE_ENV=production, even with E2E_TEST_HELPERS=true', () => {
        expect(
            shouldLoadTestHelpers({
                E2E_TEST_HELPERS: 'true',
                NODE_ENV: 'production',
            })
        ).toBe(false);
    });

    it('refuses to load when APP_ENV=production, even with E2E_TEST_HELPERS=true', () => {
        expect(
            shouldLoadTestHelpers({
                E2E_TEST_HELPERS: 'true',
                APP_ENV: 'production',
            })
        ).toBe(false);
    });

    it('loads when APP_ENV=staging', () => {
        expect(
            shouldLoadTestHelpers({
                E2E_TEST_HELPERS: 'true',
                APP_ENV: 'staging',
            })
        ).toBe(true);
    });

    it('refuses to load when NODE_ENV=production even if APP_ENV is not', () => {
        expect(
            shouldLoadTestHelpers({
                E2E_TEST_HELPERS: 'true',
                NODE_ENV: 'production',
                APP_ENV: 'development',
            })
        ).toBe(false);
    });

    it('does not load when E2E_TEST_HELPERS is unset', () => {
        expect(shouldLoadTestHelpers({ NODE_ENV: 'development' })).toBe(
            false
        );
    });
});
