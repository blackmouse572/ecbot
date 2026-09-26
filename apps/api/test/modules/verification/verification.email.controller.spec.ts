import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { VerificationEmailController } from '@app/modules/verification/controllers/verification.email.controller';
import { VerificationService } from '@app/modules/verification/services/verification.service';
import { UserService } from '@app/modules/user/services/user.service';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { ENUM_SEND_EMAIL_PROCESS } from '@app/modules/email/enums/email.enum';
import { ENUM_VERIFICATION_STATUS_CODE_ERROR } from '@app/modules/verification/enums/verification.status-code.constant';

describe('VerificationEmailController — email dispatch', () => {
    let controller: VerificationEmailController;

    const enqueue = jest.fn();
    const findOneActiveLatestEmailByUser = jest.fn();
    const findOneById = jest.fn();
    const validateOtp = jest.fn();
    const verify = jest.fn();
    const incrementOtpAttempt = jest.fn();
    const inactiveEmailManyByUser = jest.fn();
    const createEmailByUser = jest.fn();
    const updateVerificationEmail = jest.fn();
    const begin = jest.fn();
    const commit = jest.fn();
    const rollback = jest.fn();
    const fork = jest.fn(() => ({ begin, commit, rollback }));

    beforeEach(async () => {
        enqueue.mockReset();
        findOneActiveLatestEmailByUser.mockReset();
        findOneById.mockReset();
        validateOtp.mockReset();
        verify.mockReset();
        incrementOtpAttempt.mockReset();
        inactiveEmailManyByUser.mockReset();
        createEmailByUser.mockReset();
        updateVerificationEmail.mockReset();
        begin.mockReset();
        commit.mockReset();
        rollback.mockReset();
        fork.mockClear();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [VerificationEmailController],
            providers: [
                { provide: CloudTasksQueueClient, useValue: { enqueue } },
                {
                    provide: VerificationService,
                    useValue: {
                        findOneActiveLatestEmailByUser,
                        validateOtp,
                        verify,
                        incrementOtpAttempt,
                        inactiveEmailManyByUser,
                        createEmailByUser,
                    },
                },
                {
                    provide: UserService,
                    useValue: { findOneById, updateVerificationEmail },
                },
                { provide: EntityManager, useValue: { fork } },
            ],
        }).compile();

        controller = module.get(VerificationEmailController);
        enqueue.mockResolvedValue(undefined);
    });

    it('resendVerificationEmail: enqueues VERIFICATION via CloudTasksQueueClient', async () => {
        const user = { id: 'user-1', email: 'a@b.com', name: 'A' };
        const verification = {
            otp: '444444',
            expiredDate: new Date('2026-06-01T00:00:00.000Z'),
            reference: 'ref-email-resend-1',
        };
        findOneActiveLatestEmailByUser.mockResolvedValue(verification);
        findOneById.mockResolvedValue(user);

        await controller.resendVerificationEmail({
            email: 'a@b.com',
            id: 'user-1',
        } as any);

        expect(findOneActiveLatestEmailByUser).toHaveBeenCalledWith(
            'user-1',
            'a@b.com'
        );
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
            { taskName: expect.stringMatching(/^VERIFICATION-user-1-VE\d+$/) }
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
                        /^VERIFICATION-user-1-VE\d+$/
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

        await controller.verifyEmail({
            email: 'c@d.com',
            id: 'user-2',
            otp: '555555',
        } as any);

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
            { taskName: expect.stringMatching(/^EMAIL_VERIFIED-user-2-EV\d+$/) }
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
            controller.verifyEmail({
                email: 'c@d.com',
                id: 'user-2',
                otp: '555555',
            } as any)
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
            controller.verifyEmail({
                email: 'victim@b.com',
                id: 'attacker-id',
                otp: '000000',
            } as any)
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'verification.error.notFound',
            },
        });
        expect(validateOtp).not.toHaveBeenCalled();
    });

    it('verifyEmail: an expired verification row is not accepted', async () => {
        // Same contract as the cross-user case: the service query's
        // `expiredDate: { $gte: now }` filter excludes an expired row, so it
        // never reaches the controller — proven directly in
        // verification.service.spec.ts.
        findOneActiveLatestEmailByUser.mockResolvedValue(null);
        findOneById.mockResolvedValue({ id: 'user-1' });

        await expect(
            controller.verifyEmail({
                email: 'a@b.com',
                id: 'user-1',
                otp: '123456',
            } as any)
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'verification.error.notFound',
            },
        });
    });

    it('verifyEmail: OTP mismatch under the attempt limit throws OTP_NOT_MATCH and keeps the row active', async () => {
        const user = { id: 'user-2', email: 'c@d.com', name: 'C' };
        const verification = { id: 'ver-1', otp: '111111' };
        findOneActiveLatestEmailByUser.mockResolvedValue(verification);
        findOneById.mockResolvedValue(user);
        validateOtp.mockReturnValue(false);
        incrementOtpAttempt.mockResolvedValue({
            ...verification,
            otpAttempt: 3,
            isActive: true,
        });

        await expect(
            controller.verifyEmail({
                email: 'c@d.com',
                id: 'user-2',
                otp: '000000',
            } as any)
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.OTP_NOT_MATCH,
                message: 'verification.error.otpNotMatch',
            },
        });
        expect(incrementOtpAttempt).toHaveBeenCalledWith(verification);
    });

    it('verifyEmail: the 5th wrong OTP locks the row and throws ATTEMPT_MAX instead of OTP_NOT_MATCH', async () => {
        const user = { id: 'user-2', email: 'c@d.com', name: 'C' };
        const verification = { id: 'ver-1', otp: '111111' };
        findOneActiveLatestEmailByUser.mockResolvedValue(verification);
        findOneById.mockResolvedValue(user);
        validateOtp.mockReturnValue(false);
        incrementOtpAttempt.mockResolvedValue({
            ...verification,
            otpAttempt: 5,
            isActive: false,
        });

        await expect(
            controller.verifyEmail({
                email: 'c@d.com',
                id: 'user-2',
                otp: '000000',
            } as any)
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.ATTEMPT_MAX,
                message: 'verification.error.attemptMax',
            },
        });
    });
});
