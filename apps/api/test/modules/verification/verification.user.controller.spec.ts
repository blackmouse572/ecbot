import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { InternalServerErrorException } from '@nestjs/common';
import { VerificationUserController } from '@app/modules/verification/controllers/verification.user.controller';
import { VerificationService } from '@app/modules/verification/services/verification.service';
import { UserService } from '@app/modules/user/services/user.service';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { ENUM_SEND_EMAIL_PROCESS } from '@app/modules/email/enums/email.enum';
import { ENUM_SEND_SMS_PROCESS } from '@app/modules/sms/enums/sms.enum';
import { ENUM_VERIFICATION_STATUS_CODE_ERROR } from '@app/modules/verification/enums/verification.status-code.constant';

describe('VerificationUserController — email dispatch', () => {
    let controller: VerificationUserController;

    const enqueue = jest.fn();
    const findOneLatestEmailByUser = jest.fn();
    const findOneLatestMobileNumberByUser = jest.fn();
    const inactiveEmailManyByUser = jest.fn();
    const createEmailByUser = jest.fn();
    const inactiveMobileNumberManyByUser = jest.fn();
    const createMobileNumberByUser = jest.fn();
    const validateOtp = jest.fn();
    const verify = jest.fn();
    const incrementOtpAttempt = jest.fn();
    const map = jest.fn();
    const updateVerificationEmail = jest.fn();
    const updateVerificationMobileNumber = jest.fn();
    const begin = jest.fn();
    const commit = jest.fn();
    const rollback = jest.fn();
    const fork = jest.fn(() => ({ begin, commit, rollback }));

    beforeEach(async () => {
        enqueue.mockReset();
        findOneLatestEmailByUser.mockReset();
        findOneLatestMobileNumberByUser.mockReset();
        inactiveEmailManyByUser.mockReset();
        createEmailByUser.mockReset();
        inactiveMobileNumberManyByUser.mockReset();
        createMobileNumberByUser.mockReset();
        validateOtp.mockReset();
        verify.mockReset();
        incrementOtpAttempt.mockReset();
        map.mockReset();
        updateVerificationEmail.mockReset();
        updateVerificationMobileNumber.mockReset();
        begin.mockReset();
        commit.mockReset();
        rollback.mockReset();
        fork.mockClear();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [VerificationUserController],
            providers: [
                { provide: EntityManager, useValue: { fork } },
                { provide: CloudTasksQueueClient, useValue: { enqueue } },
                {
                    provide: VerificationService,
                    useValue: {
                        findOneLatestEmailByUser,
                        findOneLatestMobileNumberByUser,
                        inactiveEmailManyByUser,
                        createEmailByUser,
                        inactiveMobileNumberManyByUser,
                        createMobileNumberByUser,
                        validateOtp,
                        verify,
                        incrementOtpAttempt,
                        map,
                    },
                },
                {
                    provide: UserService,
                    useValue: {
                        updateVerificationEmail,
                        updateVerificationMobileNumber,
                    },
                },
            ],
        }).compile();

        controller = module.get(VerificationUserController);
        commit.mockResolvedValue(undefined);
        enqueue.mockResolvedValue(undefined);
    });

    it('resendEmail: enqueues VERIFICATION via CloudTasksQueueClient after issuing a new OTP', async () => {
        const user = { id: 'user-1', email: 'a@b.com', name: 'A' };
        const verification = {
            otp: '111111',
            expiredDate: new Date('2026-05-01T00:00:00.000Z'),
            reference: 'ref-resend-1',
        };
        findOneLatestEmailByUser.mockResolvedValue(null);
        inactiveEmailManyByUser.mockResolvedValue(undefined);
        createEmailByUser.mockResolvedValue(verification);
        map.mockReturnValue({});

        await controller.resendEmail(user as any);

        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
            {
                send: { email: 'a@b.com', name: 'A' },
                data: {
                    otp: '111111',
                    expiredAt: verification.expiredDate,
                    reference: 'ref-resend-1',
                },
            },
            { taskName: expect.stringMatching(/^VERIFICATION-user-1-VE\d+$/) }
        );
    });

    it('verifyEmail: enqueues EMAIL_VERIFIED via CloudTasksQueueClient after marking the email verified', async () => {
        const user = { id: 'user-2', email: 'c@d.com', name: 'C' };
        const verification = { reference: 'ref-verify-1' };
        findOneLatestEmailByUser.mockResolvedValue(verification);
        validateOtp.mockReturnValue(true);
        verify.mockResolvedValue(undefined);
        updateVerificationEmail.mockResolvedValue(undefined);

        await controller.verifyEmail(user as any, { otp: '222222' } as any);

        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED,
            {
                send: { email: 'c@d.com', name: 'C' },
                data: { reference: 'ref-verify-1' },
            },
            { taskName: expect.stringMatching(/^EMAIL_VERIFIED-user-2-EV\d+$/) }
        );
    });

    it('verifyMobileNumber: enqueues MOBILE_NUMBER_VERIFIED via CloudTasksQueueClient after marking the mobile number verified', async () => {
        const user = { id: 'user-3', email: 'e@f.com', name: 'E' };
        const verification = { reference: 'ref-verify-mobile-1' };
        findOneLatestMobileNumberByUser.mockResolvedValue(verification);
        validateOtp.mockReturnValue(true);
        verify.mockResolvedValue(undefined);
        updateVerificationMobileNumber.mockResolvedValue(undefined);
        map.mockReturnValue({ to: '+84123456789' });

        await controller.verifyMobileNumber(
            user as any,
            { otp: '333333' } as any
        );

        expect(enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.MOBILE_NUMBER_VERIFIED,
            {
                send: { email: 'e@f.com', name: 'E' },
                data: {
                    mobileNumber: '+84123456789',
                    reference: 'ref-verify-mobile-1',
                },
            },
            {
                taskName: expect.stringMatching(
                    /^MOBILE_NUMBER_VERIFIED-user-3-MV\d+$/
                ),
            }
        );
    });

    it('resendMobileNumber: enqueues SMS verification with a unique Cloud Tasks name', async () => {
        const user = {
            id: 'user-4',
            email: 'g@h.com',
            name: 'G',
            mobileNumber: {
                number: '+84123456789',
                country: { code: 'VN' },
            },
        };
        const verification = {
            otp: '444444',
            expiredDate: new Date('2026-05-01T00:00:00.000Z'),
        };
        findOneLatestMobileNumberByUser.mockResolvedValue(null);
        inactiveMobileNumberManyByUser.mockResolvedValue(undefined);
        createMobileNumberByUser.mockResolvedValue(verification);
        map.mockReturnValue({});

        await controller.resendMobileNumber(user as any);
        await controller.resendMobileNumber(user as any);

        expect(enqueue).toHaveBeenCalledTimes(2);
        expect(enqueue).toHaveBeenNthCalledWith(
            1,
            'sms',
            ENUM_SEND_SMS_PROCESS.VERIFICATION,
            {
                send: { name: 'G', mobileNumber: '+84123456789' },
                data: {
                    otp: '444444',
                    expiredAt: verification.expiredDate,
                },
            },
            { taskName: expect.stringMatching(/^VERIFICATION-user-4-SMS\d+$/) }
        );
        expect(enqueue.mock.calls[0][3].taskName).not.toBe(
            enqueue.mock.calls[1][3].taskName
        );
    });

    it('resendMobileNumber: rolls back and rejects when SMS enqueue fails', async () => {
        const user = { id: 'user-5', email: 'i@j.com', name: 'I' };
        const verification = {
            otp: '555555',
            expiredDate: new Date('2026-05-01T00:00:00.000Z'),
        };
        findOneLatestMobileNumberByUser.mockResolvedValue(null);
        inactiveMobileNumberManyByUser.mockResolvedValue(undefined);
        createMobileNumberByUser.mockResolvedValue(verification);
        enqueue.mockRejectedValue(new Error('sms unavailable'));

        await expect(
            controller.resendMobileNumber(user as any)
        ).rejects.toThrow(InternalServerErrorException);

        expect(commit).toHaveBeenCalledTimes(1);
        expect(rollback).toHaveBeenCalledTimes(1);
    });

    it('resendEmail: does not roll back the already-committed session when enqueue fails', async () => {
        const user = { id: 'user-1', email: 'a@b.com', name: 'A' };
        const verification = {
            otp: '111111',
            expiredDate: new Date('2026-05-01T00:00:00.000Z'),
            reference: 'ref-resend-1',
        };
        findOneLatestEmailByUser.mockResolvedValue(null);
        inactiveEmailManyByUser.mockResolvedValue(undefined);
        createEmailByUser.mockResolvedValue(verification);
        map.mockReturnValue({});
        enqueue.mockRejectedValue(new Error('boom'));

        await expect(
            controller.resendEmail(user as any)
        ).resolves.toBeDefined();

        expect(commit).toHaveBeenCalledTimes(1);
        expect(rollback).not.toHaveBeenCalled();
    });

    it('verifyEmail: does not roll back the already-committed session when enqueue fails', async () => {
        const user = { id: 'user-2', email: 'c@d.com', name: 'C' };
        const verification = { reference: 'ref-verify-1' };
        findOneLatestEmailByUser.mockResolvedValue(verification);
        validateOtp.mockReturnValue(true);
        verify.mockResolvedValue(undefined);
        updateVerificationEmail.mockResolvedValue(undefined);
        enqueue.mockRejectedValue(new Error('boom'));

        await expect(
            controller.verifyEmail(user as any, { otp: '222222' } as any)
        ).resolves.toBeUndefined();

        expect(commit).toHaveBeenCalledTimes(1);
        expect(rollback).not.toHaveBeenCalled();
    });

    it('verifyMobileNumber: does not roll back the already-committed session when enqueue fails', async () => {
        const user = { id: 'user-3', email: 'e@f.com', name: 'E' };
        const verification = { reference: 'ref-verify-mobile-1' };
        findOneLatestMobileNumberByUser.mockResolvedValue(verification);
        validateOtp.mockReturnValue(true);
        verify.mockResolvedValue(undefined);
        updateVerificationMobileNumber.mockResolvedValue(undefined);
        map.mockReturnValue({ to: '+84123456789' });
        enqueue.mockRejectedValue(new Error('boom'));

        await expect(
            controller.verifyMobileNumber(user as any, { otp: '333333' } as any)
        ).resolves.toBeUndefined();

        expect(commit).toHaveBeenCalledTimes(1);
        expect(rollback).not.toHaveBeenCalled();
    });
    // Same attempt counter / lockout as the public /verify/email path.
    describe.each([
        ['verifyEmail', findOneLatestEmailByUser],
        ['verifyMobileNumber', findOneLatestMobileNumberByUser],
    ] as const)('%s: wrong OTP attempts', (method, findLatest) => {
        const user = { id: 'user-9', email: 'x@y.com', name: 'X' };
        const verification = { id: 'ver-9', otp: '111111', otpAttempt: 2 };

        it('counts a wrong OTP and throws OTP_NOT_MATCH under the limit', async () => {
            findLatest.mockResolvedValue(verification);
            validateOtp.mockReturnValue(false);
            incrementOtpAttempt.mockResolvedValue({
                ...verification,
                otpAttempt: 3,
                isActive: true,
            });

            await expect(
                controller[method](user as any, { otp: '000000' } as any)
            ).rejects.toMatchObject({
                response: {
                    statusCode:
                        ENUM_VERIFICATION_STATUS_CODE_ERROR.OTP_NOT_MATCH,
                    message: 'verification.error.otpNotMatch',
                },
            });
            expect(incrementOtpAttempt).toHaveBeenCalledWith(verification);
            expect(verify).not.toHaveBeenCalled();
        });

        it('locks the row on the last wrong OTP and throws ATTEMPT_MAX', async () => {
            findLatest.mockResolvedValue(verification);
            validateOtp.mockReturnValue(false);
            incrementOtpAttempt.mockResolvedValue({
                ...verification,
                otpAttempt: 5,
                isActive: false,
            });

            await expect(
                controller[method](user as any, { otp: '000000' } as any)
            ).rejects.toMatchObject({
                response: {
                    statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.ATTEMPT_MAX,
                    message: 'verification.error.attemptMax',
                },
            });
            expect(verify).not.toHaveBeenCalled();
        });

        it('is throttled to 5 requests per minute', () => {
            const handler = VerificationUserController.prototype[method];
            expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler)).toBe(
                5
            );
            expect(Reflect.getMetadata('THROTTLER:TTLdefault', handler)).toBe(
                60000
            );
        });
    });
});
