import { VerificationService } from '@app/modules/verification/services/verification.service';
import { HelperDateService } from '@app/common/helper/services/helper.date.service';
import { HelperNumberService } from '@app/common/helper/services/helper.number.service';
import { HelperStringService } from '@app/common/helper/services/helper.string.service';
import { VerificationEntity } from '@app/modules/verification/repository/entity/verification.entity';

describe('VerificationService', () => {
    const configValues: Record<string, any> = {
        'verification.expiredInMinutes': 5,
        'verification.otpLength': 6,
        'verification.reference.length': 10,
        'verification.reference.prefix': 'VER',
        'app.timezone': 'UTC',
    };
    const get = jest.fn((key: string) => configValues[key]);
    const configService = { get } as any;

    const findOne = jest.fn();
    const save = jest.fn();
    const updateRaw = jest.fn();
    const getTotal = jest.fn();

    const build = () =>
        new VerificationService(
            { findOne, save, updateRaw, getTotal } as any,
            new HelperDateService(configService),
            new HelperNumberService(),
            new HelperStringService(),
            configService
        );

    beforeEach(() => {
        get.mockClear();
        findOne.mockReset();
        save.mockReset();
        updateRaw.mockReset();
        updateRaw.mockResolvedValue(1);
    });

    describe('findOneActiveLatestEmailByUser', () => {
        it('scopes the lookup to the caller user id, the email, isActive, and an unexpired row — ordered by createdAt DESC', async () => {
            const service = build();
            findOne.mockResolvedValue(null);

            await service.findOneActiveLatestEmailByUser('user-1', 'a@b.com');

            expect(findOne).toHaveBeenCalledTimes(1);
            const [find, options] = findOne.mock.calls[0];
            expect(find.user).toBe('user-1');
            expect(find.to).toBe('a@b.com');
            expect(find.isActive).toBe(true);
            expect(find.expiredDate).toHaveProperty('$gte');
            expect(find.expiredDate.$gte).toBeInstanceOf(Date);
            expect(options.order).toEqual({ createdAt: 'DESC' });
        });

        it('does not filter by user alone — a different user id never matches a row bound to someone else', async () => {
            const service = build();
            findOne.mockResolvedValue(null);

            const result = await service.findOneActiveLatestEmailByUser(
                'attacker-id',
                'victim@b.com'
            );

            expect(result).toBeNull();
            const [find] = findOne.mock.calls[0];
            expect(find.user).toBe('attacker-id');
        });
    });

    describe('findOneExpiredLatestEmailByUser', () => {
        it('scopes the lookup to the caller user id, the email, an active unverified row that has expired, newest first', async () => {
            const service = build();
            findOne.mockResolvedValue(null);

            await service.findOneExpiredLatestEmailByUser('user-1', 'a@b.com');

            expect(findOne).toHaveBeenCalledTimes(1);
            const [find, options] = findOne.mock.calls[0];
            expect(find.user).toBe('user-1');
            expect(find.to).toBe('a@b.com');
            expect(find.isActive).toBe(true);
            expect(find.isVerify).toBe(false);
            expect(find.expiredDate).toHaveProperty('$lt');
            expect(find.expiredDate.$lt).toBeInstanceOf(Date);
            expect(options.order).toEqual({ createdAt: 'DESC' });
        });
    });

    describe('incrementOtpAttempt', () => {
        it('increments otpAttempt and keeps the row active under the limit', async () => {
            const service = build();
            const entity = {
                id: 'ver-1',
                otpAttempt: 0,
                isActive: true,
            } as VerificationEntity;

            const updated = await service.incrementOtpAttempt(entity);

            expect(updated.otpAttempt).toBe(1);
            expect(updated.isActive).toBe(true);
        });

        it('locks the row (isActive=false) on the 5th failed attempt', async () => {
            const service = build();
            const entity = {
                id: 'ver-1',
                otpAttempt: 0,
                isActive: true,
            } as VerificationEntity;

            let updated = entity;
            for (let i = 0; i < 5; i += 1) {
                updated = await service.incrementOtpAttempt(updated);
            }

            expect(updated.otpAttempt).toBe(5);
            expect(updated.isActive).toBe(false);
        });

        it('increments atomically via updateRaw (otp_attempt = otp_attempt + 1), not a stale read-modify-write save()', async () => {
            const service = build();
            const entity = {
                id: 'ver-1',
                otpAttempt: 0,
                isActive: true,
            } as VerificationEntity;

            await service.incrementOtpAttempt(entity);

            expect(save).not.toHaveBeenCalled();
            expect(updateRaw).toHaveBeenCalledTimes(1);
            const [find, data] = updateRaw.mock.calls[0];
            expect(find).toEqual({ id: 'ver-1' });
            expect(data.otpAttempt.sql).toBe('otp_attempt + 1');
            expect(data.isActive.sql).toBe('is_active and otp_attempt + 1 < 5');
        });
    });

    // #143 review: auto sign-in made a guessed code open a session, so the
    // attempt cap must hold when guesses arrive at the same moment.
    describe('claimOtpAttempt', () => {
        const entity = () =>
            ({
                id: 'ver-1',
                otpAttempt: 2,
                isActive: true,
            }) as VerificationEntity;

        it('claims a guess in one conditional update, before the code is compared', async () => {
            const v = entity();

            await expect(build().claimOtpAttempt(v)).resolves.toBe(true);

            const [find, data] = updateRaw.mock.calls[0];
            expect(find).toEqual({
                id: 'ver-1',
                isActive: true,
                otpAttempt: { $lt: 5 },
            });
            expect(String(data.otpAttempt)).toContain('otp_attempt + 1');
            expect(v.otpAttempt).toBe(3);
        });

        it('refuses when no guess is left (the update matched no row)', async () => {
            updateRaw.mockResolvedValue(0);
            const v = entity();

            await expect(build().claimOtpAttempt(v)).resolves.toBe(false);
            expect(v.otpAttempt).toBe(2);
        });
    });

    describe('lockIfAttemptsSpent', () => {
        it('locks the code once its last guess is spent', async () => {
            const v = { id: 'ver-1', otpAttempt: 5 } as VerificationEntity;

            await expect(build().lockIfAttemptsSpent(v)).resolves.toBe(true);
            expect(updateRaw).toHaveBeenCalledWith(
                { id: 'ver-1' },
                { isActive: false },
                undefined
            );
        });

        it('leaves the code active while guesses remain', async () => {
            const v = { id: 'ver-1', otpAttempt: 3 } as VerificationEntity;

            await expect(build().lockIfAttemptsSpent(v)).resolves.toBe(false);
            expect(updateRaw).not.toHaveBeenCalled();
        });
    });

    describe('verifyOnce', () => {
        it('marks the code used only while it is still active, so one request wins', async () => {
            const v = { id: 'ver-1' } as VerificationEntity;

            await expect(build().verifyOnce(v)).resolves.toBe(true);
            const [find, data] = updateRaw.mock.calls[0];
            expect(find).toEqual({ id: 'ver-1', isActive: true });
            expect(data).toMatchObject({ isActive: false, isVerify: true });
            expect(data.verifyDate).toBeInstanceOf(Date);
        });

        it('reports a loss when another request used the code first', async () => {
            updateRaw.mockResolvedValue(0);

            await expect(
                build().verifyOnce({ id: 'ver-1' } as VerificationEntity)
            ).resolves.toBe(false);
        });
    });

    describe('countEmailIssuedSince', () => {
        it('counts the email codes issued to the user since a time', async () => {
            getTotal.mockResolvedValue(3);
            const since = new Date('2026-10-08T07:00:00Z');

            await expect(
                build().countEmailIssuedSince('user-1', since)
            ).resolves.toBe(3);
            const [find] = getTotal.mock.calls[0];
            expect(find).toMatchObject({
                user: 'user-1',
                createdAt: { $gte: since },
            });
        });
    });
});
