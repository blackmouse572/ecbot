import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ENUM_TURNSTILE_ACTION } from '../../../../src/common/turnstile/enums/turnstile.action.enum';
import { TurnstileService } from '../../../../src/common/turnstile/services/turnstile.service';

describe('TurnstileService', () => {
    let service: TurnstileService;

    const VERIFY_URL =
        'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    const config: Record<string, any> = {
        'turnstile.secretKey': undefined,
        'turnstile.verifyUrl': VERIFY_URL,
    };

    const mockConfigService = { get: jest.fn((key: string) => config[key]) };

    const build = async (): Promise<void> => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TurnstileService,
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        service = module.get<TurnstileService>(TurnstileService);
    };

    const mockSiteverify = (body: Record<string, any>): jest.SpyInstance =>
        jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => body,
        } as Response);

    beforeEach(async () => {
        config['turnstile.secretKey'] = undefined;
        await build();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe('verify', () => {
        it('skips verification when no secret is configured', async () => {
            const fetchSpy = jest.spyOn(global, 'fetch');

            await expect(service.verify('any-token')).resolves.toBeUndefined();

            expect(fetchSpy).not.toHaveBeenCalled();
        });

        it('throws when the token is missing', async () => {
            config['turnstile.secretKey'] = 'sk_test';
            await build();
            const fetchSpy = jest.spyOn(global, 'fetch');

            await expect(service.verify(undefined)).rejects.toThrow(
                ForbiddenException
            );
            expect(fetchSpy).not.toHaveBeenCalled();
        });

        it('throws when siteverify rejects the token', async () => {
            config['turnstile.secretKey'] = 'sk_test';
            await build();
            mockSiteverify({ success: false });

            await expect(service.verify('bad')).rejects.toThrow(
                ForbiddenException
            );
        });

        it('passes when siteverify accepts the token', async () => {
            config['turnstile.secretKey'] = 'sk_test';
            await build();
            mockSiteverify({ success: true });

            await expect(service.verify('good')).resolves.toBeUndefined();
        });

        it('fails closed when siteverify is unreachable', async () => {
            config['turnstile.secretKey'] = 'sk_test';
            await build();
            jest.spyOn(global, 'fetch').mockRejectedValue(
                new Error('network down')
            );

            await expect(service.verify('good')).rejects.toThrow(
                ForbiddenException
            );
        });

        it('posts the secret and token form-encoded to siteverify', async () => {
            config['turnstile.secretKey'] = 'sk_test';
            await build();
            const fetchSpy = mockSiteverify({ success: true });

            await service.verify('good');

            expect(fetchSpy).toHaveBeenCalledTimes(1);
            const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
            expect(url).toBe(VERIFY_URL);
            expect(init.method).toBe('POST');
            const body = init.body as URLSearchParams;
            expect(body).toBeInstanceOf(URLSearchParams);
            expect(body.get('secret')).toBe('sk_test');
            expect(body.get('response')).toBe('good');
        });
    });

    describe('action check', () => {
        beforeEach(async () => {
            config['turnstile.secretKey'] = 'sk_test';
            await build();
        });

        it('passes when the returned action matches the expected one', async () => {
            mockSiteverify({
                success: true,
                action: ENUM_TURNSTILE_ACTION.LOGIN,
            });

            await expect(
                service.verify('good', ENUM_TURNSTILE_ACTION.LOGIN)
            ).resolves.toBeUndefined();
        });

        it('rejects a token minted for a different form', async () => {
            // A bot solves the cheap waitlist challenge, then replays that
            // token against login. The action check is what stops it.
            mockSiteverify({
                success: true,
                action: ENUM_TURNSTILE_ACTION.WAITLIST,
            });

            await expect(
                service.verify('good', ENUM_TURNSTILE_ACTION.LOGIN)
            ).rejects.toThrow(ForbiddenException);
        });

        it('skips the check when no action is expected', async () => {
            mockSiteverify({ success: true, action: 'anything' });

            await expect(service.verify('good')).resolves.toBeUndefined();
        });
    });

    describe('Cloudflare testing keys', () => {
        // Testing keys return no `action`, so enforcing it would reject every
        // local request. Cloudflare flags them via result_with_testing_key.
        beforeEach(async () => {
            config['turnstile.secretKey'] =
                '1x0000000000000000000000000000000AA';
            await build();
        });

        it('skips the action check for a testing-key response', async () => {
            mockSiteverify({
                success: true,
                metadata: { result_with_testing_key: true },
            });

            await expect(
                service.verify('dummy', ENUM_TURNSTILE_ACTION.LOGIN)
            ).resolves.toBeUndefined();
        });

        it('still rejects a failed testing-key response', async () => {
            mockSiteverify({
                success: false,
                'error-codes': ['timeout-or-duplicate'],
                metadata: { result_with_testing_key: true },
            });

            await expect(
                service.verify('dummy', ENUM_TURNSTILE_ACTION.LOGIN)
            ).rejects.toThrow(ForbiddenException);
        });

        it('does NOT relax the checks for a real key', async () => {
            config['turnstile.secretKey'] = '0x4realsecret';
            await build();
            mockSiteverify({ success: true });

            await expect(
                service.verify('good', ENUM_TURNSTILE_ACTION.LOGIN)
            ).rejects.toThrow(ForbiddenException);
        });
    });
});
