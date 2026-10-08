import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { VerificationEmailController } from '@app/modules/verification/controllers/verification.email.controller';
import { VerificationService } from '@app/modules/verification/services/verification.service';
import { UserService } from '@app/modules/user/services/user.service';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { ENUM_SEND_EMAIL_PROCESS } from '@app/modules/email/enums/email.enum';
import { ENUM_VERIFICATION_STATUS_CODE_ERROR } from '@app/modules/verification/enums/verification.status-code.constant';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { SessionService } from '@app/modules/session/services/session.service';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { ENUM_USER_STATUS } from '@app/modules/user/enums/user.enum';

describe('VerificationEmailController — email dispatch', () => {
    const req = {} as any;
    const res = {} as any;
    let controller: VerificationEmailController;

    const enqueue = jest.fn();
    const findOneActiveLatestEmailByUser = jest.fn();
    const findOneExpiredLatestEmailByUser = jest.fn();
    const findOneById = jest.fn();
    const validateOtp = jest.fn();
    const verify = jest.fn();
    const incrementOtpAttempt = jest.fn();
    const claimOtpAttempt = jest.fn();
    const lockIfAttemptsSpent = jest.fn();
    const verifyOnce = jest.fn();
    const countEmailIssuedSince = jest.fn();
    const inactiveEmailManyByUser = jest.fn();
    const createEmailByUser = jest.fn();
    const updateVerificationEmail = jest.fn();
    const begin = jest.fn();
    const commit = jest.fn();
    const rollback = jest.fn();
    const fork = jest.fn(() => ({ begin, commit, rollback }));
    const join = jest.fn();
    const createSession = jest.fn();
    const setLoginSession = jest.fn();
    const createToken = jest.fn();
    const setRefreshTokenCookie = jest.fn();
    const checkPasswordExpired = jest.fn();
    const createByUser = jest.fn();

    beforeEach(async () => {
        enqueue.mockReset();
        findOneActiveLatestEmailByUser.mockReset();
        findOneExpiredLatestEmailByUser.mockReset();
        findOneById.mockReset();
        validateOtp.mockReset();
        verify.mockReset();
        incrementOtpAttempt.mockReset();
        claimOtpAttempt.mockReset().mockResolvedValue(true);
        lockIfAttemptsSpent.mockReset().mockResolvedValue(false);
        verifyOnce.mockReset().mockResolvedValue(true);
        countEmailIssuedSince.mockReset().mockResolvedValue(0);
        inactiveEmailManyByUser.mockReset();
        createEmailByUser.mockReset();
        updateVerificationEmail.mockReset();
        begin.mockReset();
        commit.mockReset();
        rollback.mockReset();
        fork.mockClear();
        for (const m of [
            join,
            createSession,
            setLoginSession,
            createToken,
            setRefreshTokenCookie,
            checkPasswordExpired,
            createByUser,
        ]) {
            m.mockReset();
        }

        const module: TestingModule = await Test.createTestingModule({
            controllers: [VerificationEmailController],
            providers: [
                { provide: CloudTasksQueueClient, useValue: { enqueue } },
                {
                    provide: VerificationService,
                    useValue: {
                        findOneActiveLatestEmailByUser,
                        findOneExpiredLatestEmailByUser,
                        validateOtp,
                        verify,
                        incrementOtpAttempt,
                        claimOtpAttempt,
                        lockIfAttemptsSpent,
                        verifyOnce,
                        countEmailIssuedSince,
                        inactiveEmailManyByUser,
                        createEmailByUser,
                    },
                },
                {
                    provide: UserService,
                    useValue: { findOneById, updateVerificationEmail, join },
                },
                { provide: EntityManager, useValue: { fork } },
                {
                    provide: AuthService,
                    useValue: {
                        createToken,
                        setRefreshTokenCookie,
                        checkPasswordExpired,
                    },
                },
                {
                    provide: SessionService,
                    useValue: { create: createSession, setLoginSession },
                },
                { provide: ActivityService, useValue: { createByUser } },
            ],
        }).compile();

        controller = module.get(VerificationEmailController);
        enqueue.mockResolvedValue(undefined);
    });

    it('resendVerificationEmail: writes the email in the request language', async () => {
        findOneActiveLatestEmailByUser.mockResolvedValue({
            otp: '222222',
            expiredDate: new Date(Date.now() + 10 * 60 * 1000),
            reference: 'ref-vi',
        });
        findOneById.mockResolvedValue({
            id: 'user-1',
            email: 'a@b.com',
            name: 'A',
        });

        await controller.resendVerificationEmail(
            { email: 'a@b.com', id: 'user-1' } as any,
            'vi'
        );

        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
            expect.objectContaining({
                data: expect.objectContaining({ language: 'vi' }),
            }),
            expect.anything()
        );
    });

    it('resendVerificationEmail: re-sends the active code while it has time left, so codes from earlier emails keep working', async () => {
        const user = { id: 'user-1', email: 'a@b.com', name: 'A' };
        const verification = {
            otp: '222222',
            expiredDate: new Date(Date.now() + 10 * 60 * 1000),
            reference: 'ref-still-fresh',
        };
        findOneActiveLatestEmailByUser.mockResolvedValue(verification);
        findOneById.mockResolvedValue(user);

        await controller.resendVerificationEmail({
            email: 'a@b.com',
            id: 'user-1',
        } as any);

        expect(inactiveEmailManyByUser).not.toHaveBeenCalled();
        expect(createEmailByUser).not.toHaveBeenCalled();
        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
            {
                send: { email: 'a@b.com', name: 'A' },
                data: {
                    otp: '222222',
                    expiredAt: verification.expiredDate,
                    reference: 'ref-still-fresh',
                },
            },
            {
                taskName: expect.stringMatching(
                    /^VERIFICATION-user-1-[0-9a-f-]{36}$/
                ),
            }
        );
    });

    it('resendVerificationEmail: issues and enqueues a fresh code when the active one is about to expire', async () => {
        // Re-sending a code with seconds left could mail one that is already
        // expired on arrival.
        const user = { id: 'user-1', email: 'a@b.com', name: 'A' };
        findOneActiveLatestEmailByUser.mockResolvedValue({
            otp: '111111',
            expiredDate: new Date(Date.now() + 60 * 1000),
            reference: 'ref-about-to-expire',
        });
        const verification = {
            otp: '444444',
            expiredDate: new Date('2026-06-01T00:15:00.000Z'),
            reference: 'ref-email-resend-1',
        };
        createEmailByUser.mockResolvedValue(verification);
        findOneById.mockResolvedValue(user);

        await controller.resendVerificationEmail({
            email: 'a@b.com',
            id: 'user-1',
        } as any);

        expect(findOneActiveLatestEmailByUser).toHaveBeenCalledWith(
            'user-1',
            'a@b.com'
        );
        expect(inactiveEmailManyByUser).toHaveBeenCalledWith('user-1', {
            em: expect.objectContaining({ begin }),
        });
        expect(commit).toHaveBeenCalledTimes(1);
        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
            {
                send: { email: 'a@b.com', name: 'A' },
                data: {
                    otp: '444444',
                    expiredAt: verification.expiredDate,
                    reference: 'ref-email-resend-1',
                },
            },
            {
                taskName: expect.stringMatching(
                    /^VERIFICATION-user-1-[0-9a-f-]{36}$/
                ),
            }
        );
    });

    it('resendVerificationEmail: throws NOT_FOUND when the row is not bound to this user/email/active/unexpired', async () => {
        findOneActiveLatestEmailByUser.mockResolvedValue(null);
        findOneById.mockResolvedValue({ id: 'user-1' });

        await expect(
            controller.resendVerificationEmail({
                email: 'a@b.com',
                id: 'user-1',
            } as any)
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'verification.error.notFound',
            },
        });
    });

    describe('resendVerificationEmail: no active row', () => {
        const unverifiedUser = {
            id: 'user-1',
            email: 'a@b.com',
            name: 'A',
            verification: { email: false },
        };
        const fresh = {
            otp: '777777',
            expiredDate: new Date('2026-06-01T00:05:00.000Z'),
            reference: 'ref-fresh-1',
        };

        const expectFreshCodeIssued = () => {
            expect(inactiveEmailManyByUser).toHaveBeenCalledWith('user-1', {
                em: expect.objectContaining({ begin }),
            });
            expect(createEmailByUser).toHaveBeenCalledWith(unverifiedUser, {
                em: expect.objectContaining({ begin }),
            });
            expect(commit).toHaveBeenCalledTimes(1);
            expect(enqueue).toHaveBeenCalledWith(
                'email',
                ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
                {
                    send: { email: 'a@b.com', name: 'A' },
                    data: {
                        otp: '777777',
                        expiredAt: fresh.expiredDate,
                        reference: 'ref-fresh-1',
                    },
                },
                {
                    taskName: expect.stringMatching(
                        /^VERIFICATION-user-1-[0-9a-f-]{36}$/
                    ),
                }
            );
        };

        it('resend after expiry issues a fresh code', async () => {
            // the 5-minute row expired, so the active+unexpired lookup is empty
            findOneActiveLatestEmailByUser.mockResolvedValue(null);
            findOneById.mockResolvedValue(unverifiedUser);
            createEmailByUser.mockResolvedValue(fresh);

            await controller.resendVerificationEmail({
                email: 'a@b.com',
                id: 'user-1',
            } as any);

            expectFreshCodeIssued();
        });

        it('resend after lock issues a fresh code', async () => {
            // the 5th wrong OTP set isActive=false on the row
            findOneActiveLatestEmailByUser.mockResolvedValue(null);
            findOneById.mockResolvedValue(unverifiedUser);
            createEmailByUser.mockResolvedValue(fresh);

            await controller.resendVerificationEmail({
                email: 'A@B.com',
                id: 'user-1',
            } as any);

            expectFreshCodeIssued();
        });

        it('resend for an already-verified user does not issue a code', async () => {
            findOneActiveLatestEmailByUser.mockResolvedValue(null);
            findOneById.mockResolvedValue({
                ...unverifiedUser,
                verification: { email: true },
            });

            await expect(
                controller.resendVerificationEmail({
                    email: 'a@b.com',
                    id: 'user-1',
                } as any)
            ).rejects.toMatchObject({
                response: {
                    statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.NOT_FOUND,
                    message: 'verification.error.notFound',
                },
            });
            expect(createEmailByUser).not.toHaveBeenCalled();
            expect(enqueue).not.toHaveBeenCalled();
        });

        it("resend for an email that is not the user's does not issue a code", async () => {
            findOneActiveLatestEmailByUser.mockResolvedValue(null);
            findOneById.mockResolvedValue(unverifiedUser);

            await expect(
                controller.resendVerificationEmail({
                    email: 'victim@b.com',
                    id: 'user-1',
                } as any)
            ).rejects.toMatchObject({
                response: {
                    statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.NOT_FOUND,
                    message: 'verification.error.notFound',
                },
            });
            expect(createEmailByUser).not.toHaveBeenCalled();
            expect(enqueue).not.toHaveBeenCalled();
        });

        it('resend for an unknown user answers the same not-found as a missing row', async () => {
            findOneActiveLatestEmailByUser.mockResolvedValue(null);
            findOneById.mockResolvedValue(null);

            await expect(
                controller.resendVerificationEmail({
                    email: 'a@b.com',
                    id: 'nobody',
                } as any)
            ).rejects.toMatchObject({
                response: {
                    statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.NOT_FOUND,
                    message: 'verification.error.notFound',
                },
            });
            expect(createEmailByUser).not.toHaveBeenCalled();
        });
    });

    it('verifyEmail: enqueues EMAIL_VERIFIED via CloudTasksQueueClient after the verify transaction commits', async () => {
        const user = { id: 'user-2', email: 'c@d.com', name: 'C' };
        const verification = { reference: 'ref-email-verify-1' };
        findOneActiveLatestEmailByUser.mockResolvedValue(verification);
        findOneById.mockResolvedValue(user);
        validateOtp.mockReturnValue(true);
        verify.mockResolvedValue(undefined);
        updateVerificationEmail.mockResolvedValue(undefined);
        commit.mockResolvedValue(undefined);

        await controller.verifyEmail(
            {
                email: 'c@d.com',
                id: 'user-2',
                otp: '555555',
            } as any,
            req,
            res
        );

        expect(findOneActiveLatestEmailByUser).toHaveBeenCalledWith(
            'user-2',
            'c@d.com'
        );
        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED,
            {
                send: { email: 'c@d.com', name: 'C' },
                data: { reference: 'ref-email-verify-1' },
            },
            {
                taskName: expect.stringMatching(
                    /^EMAIL_VERIFIED-user-2-[0-9a-f-]{36}$/
                ),
            }
        );
    });

    it('resendVerificationEmail: does not throw when enqueue fails', async () => {
        const user = { id: 'user-1', email: 'a@b.com', name: 'A' };
        const verification = {
            otp: '444444',
            expiredDate: new Date('2026-06-01T00:00:00.000Z'),
            reference: 'ref-email-resend-1',
        };
        findOneActiveLatestEmailByUser.mockResolvedValue(verification);
        createEmailByUser.mockResolvedValue(verification);
        findOneById.mockResolvedValue(user);
        enqueue.mockRejectedValue(new Error('boom'));

        await expect(
            controller.resendVerificationEmail({
                email: 'a@b.com',
                id: 'user-1',
            } as any)
        ).resolves.toBeUndefined();
    });

    it('verifyEmail: does not roll back the already-committed session when enqueue fails', async () => {
        const user = { id: 'user-2', email: 'c@d.com', name: 'C' };
        const verification = { reference: 'ref-email-verify-1' };
        findOneActiveLatestEmailByUser.mockResolvedValue(verification);
        findOneById.mockResolvedValue(user);
        validateOtp.mockReturnValue(true);
        verify.mockResolvedValue(undefined);
        updateVerificationEmail.mockResolvedValue(undefined);
        commit.mockResolvedValue(undefined);
        enqueue.mockRejectedValue(new Error('boom'));

        await expect(
            controller.verifyEmail(
                {
                    email: 'c@d.com',
                    id: 'user-2',
                    otp: '555555',
                } as any,
                req,
                res
            )
        ).resolves.toBeUndefined();

        expect(commit).toHaveBeenCalledTimes(1);
        expect(rollback).not.toHaveBeenCalled();
    });

    it('verifyEmail: an OTP guessed against another user (or a stale/expired row) is rejected as not found, never matched cross-user', async () => {
        // findOneActiveLatestEmailByUser is scoped to { user: id, to: email,
        // isActive: true, expiredDate >= now } (see verification.service.spec.ts
        // for the query shape assertion) — a row belonging to a different
        // user never comes back here, so the controller sees the same `null`
        // it would for an unknown email.
        findOneActiveLatestEmailByUser.mockResolvedValue(null);
        findOneById.mockResolvedValue({ id: 'attacker-id' });

        await expect(
            controller.verifyEmail(
                {
                    email: 'victim@b.com',
                    id: 'attacker-id',
                    otp: '000000',
                } as any,
                req,
                res
            )
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'verification.error.notFound',
            },
        });
        expect(validateOtp).not.toHaveBeenCalled();
    });

    it('verifyEmail: an expired code is rejected as EXPIRED so the user knows to resend', async () => {
        // The active lookup excludes the expired row (its `expiredDate:
        // { $gte: now }` filter, proven in verification.service.spec.ts); the
        // expired lookup is scoped to the same user and email.
        findOneActiveLatestEmailByUser.mockResolvedValue(null);
        findOneExpiredLatestEmailByUser.mockResolvedValue({
            otp: '123456',
            expiredDate: new Date('2026-06-01T00:00:00.000Z'),
        });
        findOneById.mockResolvedValue({ id: 'user-1' });

        await expect(
            controller.verifyEmail(
                {
                    email: 'a@b.com',
                    id: 'user-1',
                    otp: '123456',
                } as any,
                req,
                res
            )
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.EXPIRED,
                message: 'verification.error.expired',
            },
        });
    });

    it('verifyEmail: OTP mismatch under the attempt limit throws OTP_NOT_MATCH and keeps the row active', async () => {
        const user = { id: 'user-2', email: 'c@d.com', name: 'C' };
        const verification = { id: 'ver-1', otp: '111111' };
        findOneActiveLatestEmailByUser.mockResolvedValue(verification);
        findOneById.mockResolvedValue(user);
        validateOtp.mockReturnValue(false);

        await expect(
            controller.verifyEmail(
                { email: 'c@d.com', id: 'user-2', otp: '000000' } as any,
                req,
                res
            )
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.OTP_NOT_MATCH,
                message: 'verification.error.otpNotMatch',
            },
        });
        expect(claimOtpAttempt).toHaveBeenCalledWith(verification);
        expect(lockIfAttemptsSpent).toHaveBeenCalledWith(verification);
    });

    it('verifyEmail: the wrong guess that spends the last attempt locks the row and throws ATTEMPT_MAX', async () => {
        findOneActiveLatestEmailByUser.mockResolvedValue({ id: 'ver-1' });
        findOneById.mockResolvedValue({ id: 'user-2', email: 'c@d.com' });
        validateOtp.mockReturnValue(false);
        lockIfAttemptsSpent.mockResolvedValue(true);

        await expect(
            controller.verifyEmail(
                { email: 'c@d.com', id: 'user-2', otp: '000000' } as any,
                req,
                res
            )
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.ATTEMPT_MAX,
                message: 'verification.error.attemptMax',
            },
        });
    });

    // #143 review: N simultaneous requests used to each compare a guess
    // before any of them counted it.
    it('verifyEmail: claims the guess before comparing, and compares nothing once no guess is left', async () => {
        findOneActiveLatestEmailByUser.mockResolvedValue({ id: 'ver-1' });
        findOneById.mockResolvedValue({ id: 'user-2', email: 'c@d.com' });
        claimOtpAttempt.mockResolvedValue(false);

        await expect(
            controller.verifyEmail(
                { email: 'c@d.com', id: 'user-2', otp: '123456' } as any,
                req,
                res
            )
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.ATTEMPT_MAX,
            },
        });
        expect(validateOtp).not.toHaveBeenCalled();
    });

    it('verifyEmail: of two requests with the right code, the one that loses is refused and opens no session', async () => {
        findOneActiveLatestEmailByUser.mockResolvedValue({ id: 'ver-1' });
        findOneById.mockResolvedValue({ id: 'user-2', email: 'c@d.com' });
        validateOtp.mockReturnValue(true);
        verifyOnce.mockResolvedValue(false);

        await expect(
            controller.verifyEmail(
                { email: 'c@d.com', id: 'user-2', otp: '123456' } as any,
                req,
                res
            )
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.NOT_FOUND,
            },
        });
        expect(rollback).toHaveBeenCalled();
        expect(updateVerificationEmail).not.toHaveBeenCalled();
    });

    describe('verifyEmail: signs the new user in (#143)', () => {
        const user = {
            id: 'user-9',
            email: 'n@e.w',
            name: 'N',
            status: ENUM_USER_STATUS.ACTIVE,
        };
        const req = {} as any;
        const res = {} as any;
        const token = { accessToken: 'at', refreshToken: 'rt' };

        beforeEach(() => {
            findOneActiveLatestEmailByUser.mockResolvedValue({
                reference: 'ref-9',
            });
            findOneById.mockResolvedValue(user);
            validateOtp.mockReturnValue(true);
            enqueue.mockResolvedValue(undefined);
            checkPasswordExpired.mockReturnValue(false);
            createSession.mockResolvedValue({ id: 'sess-1' });
            createToken.mockReturnValue(token);
            createByUser.mockResolvedValue(undefined);
        });

        it('returns a login token and sets the refresh cookie, like a login', async () => {
            join.mockResolvedValue({ ...user, role: { isActive: true } });

            const result = await controller.verifyEmail(
                { email: 'n@e.w', id: 'user-9', otp: '123456' } as any,
                req,
                res
            );

            expect(createSession).toHaveBeenCalledWith(
                req,
                { user: 'user-9' },
                expect.anything()
            );
            expect(createToken).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'user-9' }),
                'sess-1',
                false
            );
            expect(setRefreshTokenCookie).toHaveBeenCalledWith(
                res,
                'rt',
                false
            );
            expect(result).toEqual({ data: token });
        });

        it.each([ENUM_USER_STATUS.BLOCKED, ENUM_USER_STATUS.INACTIVE])(
            'verifies but does not sign in a %s user',
            async status => {
                findOneById.mockResolvedValue({ ...user, status });
                join.mockResolvedValue({ ...user, role: { isActive: true } });

                const result = await controller.verifyEmail(
                    { email: 'n@e.w', id: 'user-9', otp: '123456' } as any,
                    req,
                    res
                );

                expect(createSession).not.toHaveBeenCalled();
                expect(result).toBeUndefined();
            }
        );

        it('never opens a session on a wrong code', async () => {
            validateOtp.mockReturnValue(false);

            await expect(
                controller.verifyEmail(
                    { email: 'n@e.w', id: 'user-9', otp: '000000' } as any,
                    req,
                    res
                )
            ).rejects.toBeDefined();
            expect(createSession).not.toHaveBeenCalled();
            expect(setRefreshTokenCookie).not.toHaveBeenCalled();
        });

        it('verifies but does not sign in when the role is inactive', async () => {
            join.mockResolvedValue({ ...user, role: { isActive: false } });

            const result = await controller.verifyEmail(
                { email: 'n@e.w', id: 'user-9', otp: '123456' } as any,
                req,
                res
            );

            expect(updateVerificationEmail).toHaveBeenCalled();
            expect(createSession).not.toHaveBeenCalled();
            expect(result).toBeUndefined();
        });

        it('verifies but does not sign in when the password has expired', async () => {
            join.mockResolvedValue({ ...user, role: { isActive: true } });
            checkPasswordExpired.mockReturnValue(true);

            const result = await controller.verifyEmail(
                { email: 'n@e.w', id: 'user-9', otp: '123456' } as any,
                req,
                res
            );

            expect(createSession).not.toHaveBeenCalled();
            expect(result).toBeUndefined();
        });
    });

    // #143 review: a locked or expired code used to be reissued without
    // limit, so the 5-guess cap only slowed a brute force down.
    it('resendVerificationEmail: refuses a fresh code after too many this hour', async () => {
        findOneActiveLatestEmailByUser.mockResolvedValue(null);
        findOneById.mockResolvedValue({
            id: 'user-1',
            email: 'a@b.com',
            verification: { email: false },
        });
        countEmailIssuedSince.mockResolvedValue(5);

        await expect(
            controller.resendVerificationEmail({
                email: 'a@b.com',
                id: 'user-1',
            } as any)
        ).rejects.toMatchObject({
            status: 429,
            response: {
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.MAX_IN_DAY,
                message: 'verification.error.tooManyCodes',
            },
        });
        expect(createEmailByUser).not.toHaveBeenCalled();
        expect(enqueue).not.toHaveBeenCalled();
    });
});
