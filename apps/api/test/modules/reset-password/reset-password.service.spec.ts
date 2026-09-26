import { ResetPasswordService } from '@app/modules/reset-password/services/reset-password.service';
import { HelperDateService } from '@app/common/helper/services/helper.date.service';
import { HelperNumberService } from '@app/common/helper/services/helper.number.service';
import { HelperStringService } from '@app/common/helper/services/helper.string.service';
import { ResetPasswordEntity } from '@app/modules/reset-password/repository/entities/reset-password.entity';

describe('ResetPasswordService', () => {
    const configValues: Record<string, any> = {
        'resetPassword.expiredInMinutes': 5,
        'resetPassword.otpLength': 6,
        'resetPassword.tokenLength': 20,
        'resetPassword.reference.length': 10,
        'resetPassword.reference.prefix': 'RES',
        'app.timezone': 'UTC',
        'home.url': 'https://app.example.com/',
    };
    const get = jest.fn((key: string) => configValues[key]);
    const configService = { get } as any;

    const findOne = jest.fn();
    const create = jest.fn();
    const save = jest.fn();
    const updateRaw = jest.fn();
    const getReference = jest.fn((_entity: unknown, id: string) => ({ id }));
    const getEntityManager = jest.fn(() => ({ getReference }));

    const build = () =>
        new ResetPasswordService(
            { findOne, create, save, updateRaw, getEntityManager } as any,
            new HelperDateService(configService),
            new HelperNumberService(),
            new HelperStringService(),
            configService
        );

    beforeEach(() => {
        get.mockClear();
        findOne.mockReset();
        create.mockReset();
        save.mockReset();
        updateRaw.mockReset();
        updateRaw.mockResolvedValue(1);
        getReference.mockClear();
    });

    describe('reset-password link (home.url based)', () => {
        it('requestEmailByUser builds the link from home.url with the trailing slash stripped and ?token=', async () => {
            const service = build();
            create.mockImplementation(entity => entity);

            const { created } = await service.requestEmailByUser('user-1', {
                email: 'a@b.com',
            } as any);

            expect(created.url).toMatch(
                /^https:\/\/app\.example\.com\/reset-password\?token=.+$/
            );
            expect(created.url.startsWith('https://app.example.com//')).toBe(
                false
            );
        });

        it("checkActiveLatestEmailByUser builds the link from the row's own token", async () => {
            const service = build();
            const expiredDate = new Date('2026-08-30T05:29:50.057Z');
            findOne.mockResolvedValue({
                token: 'existing-token',
                to: 'a@b.com',
                expiredDate,
            });

            const result = await service.checkActiveLatestEmailByUser('user-1');

            expect(result.created.url).toBe(
                'https://app.example.com/reset-password?token=existing-token'
            );
        });
    });

    describe('reset OTP delivered with the email job (regression: /reset can never succeed without it)', () => {
        it("requestEmailByUser carries the row's own OTP so the email job can render it", async () => {
            const service = build();
            create.mockImplementation(entity => ({
                ...entity,
                otp: '123456',
            }));

            const { created } = await service.requestEmailByUser('user-1', {
                email: 'a@b.com',
            } as any);

            expect(created.otp).toBe('123456');
        });

        it('checkActiveLatestEmailByUser also carries the OTP for interface consistency', async () => {
            const service = build();
            findOne.mockResolvedValue({
                token: 'existing-token',
                otp: '654321',
                to: 'a@b.com',
                expiredDate: new Date(),
            });

            const result = await service.checkActiveLatestEmailByUser('user-1');

            expect(result.created.otp).toBe('654321');
        });
    });

    describe('response shape (no token/url/otp leak)', () => {
        it('mapResetPasswordResponse returns only expiredDate and to', () => {
            const service = build();
            const expiredDate = new Date('2026-08-30T05:29:50.057Z');
            const entity = {
                expiredDate,
                token: 'secret-token',
                otp: '111111',
            } as ResetPasswordEntity;

            const mapped = service.mapResetPasswordResponse(entity, {
                email: 'a@b.com',
            } as any);

            expect(Object.keys(mapped).sort()).toEqual(['expiredDate', 'to']);
            expect(mapped).not.toHaveProperty('token');
            expect(mapped).not.toHaveProperty('url');
            expect(mapped).not.toHaveProperty('otp');
            expect(mapped.expiredDate).toBe(expiredDate);
        });

        it('checkActiveLatestEmailByUser censors the stored `to` email, not the user id', async () => {
            const service = build();
            findOne.mockResolvedValue({
                token: 'tok',
                to: 'a@b.com',
                expiredDate: new Date(),
            });

            const result = await service.checkActiveLatestEmailByUser(
                'user-uuid-not-an-email'
            );

            // Regression guard: `to` must be derived from the row's stored
            // `to` (the real email), never from the opaque user id.
            expect(result.created.to).not.toContain('user-uuid-not-an-email');
        });
    });

    describe('incrementOtpAttempt', () => {
        it('increments otpAttempt and keeps the row active under the limit', async () => {
            const service = build();
            const entity = {
                id: 'reset-1',
                otpAttempt: 0,
                isActive: true,
            } as ResetPasswordEntity;

            const updated = await service.incrementOtpAttempt(entity);

            expect(updated.otpAttempt).toBe(1);
            expect(updated.isActive).toBe(true);
        });

        it('locks the row (isActive=false) on the 5th failed attempt', async () => {
            const service = build();
            const entity = {
                id: 'reset-1',
                otpAttempt: 0,
                isActive: true,
            } as ResetPasswordEntity;

            let updated = entity;
            for (let i = 0; i < 5; i += 1) {
                updated = await service.incrementOtpAttempt(updated);
            }

            expect(updated.otpAttempt).toBe(5);
            expect(updated.isActive).toBe(false);
        });

        it('keeps incrementing past the limit while staying locked, if ever called again on an already-locked row', async () => {
            // Real HTTP traffic can't actually reach this: once isActive is
            // false, ResetPasswordExpiredPipe rejects the next /verify/:token
            // call before the controller ever calls incrementOtpAttempt
            // again. This just pins the service method's own behavior in
            // isolation — it has no upper bound and never re-activates a
            // locked row.
            const service = build();
            const entity = {
                id: 'reset-1',
                otpAttempt: 5,
                isActive: false,
            } as ResetPasswordEntity;

            const updated = await service.incrementOtpAttempt(entity);

            expect(updated.otpAttempt).toBe(6);
            expect(updated.isActive).toBe(false);
        });

        it('increments atomically via updateRaw (otp_attempt = otp_attempt + 1), not a stale read-modify-write save()', async () => {
            const service = build();
            const entity = {
                id: 'reset-1',
                otpAttempt: 0,
                isActive: true,
            } as ResetPasswordEntity;

            await service.incrementOtpAttempt(entity);

            expect(save).not.toHaveBeenCalled();
            expect(updateRaw).toHaveBeenCalledTimes(1);
            const [find, data] = updateRaw.mock.calls[0];
            expect(find).toEqual({ id: 'reset-1' });
            expect(data.otpAttempt.sql).toBe('otp_attempt + 1');
            expect(data.isActive.sql).toBe('is_active and otp_attempt + 1 < 5');
        });
    });
});
