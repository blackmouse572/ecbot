import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { VerificationEmailController } from '@app/modules/verification/controllers/verification.email.controller';
import { VerificationService } from '@app/modules/verification/services/verification.service';
import { UserService } from '@app/modules/user/services/user.service';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { ENUM_SEND_EMAIL_PROCESS } from '@app/modules/email/enums/email.enum';

describe('VerificationEmailController — email dispatch', () => {
    let controller: VerificationEmailController;

    const enqueue = jest.fn();
    const findOne = jest.fn();
    const findOneById = jest.fn();
    const validateOtp = jest.fn();
    const verify = jest.fn();
    const updateVerificationEmail = jest.fn();
    const begin = jest.fn();
    const commit = jest.fn();
    const rollback = jest.fn();
    const fork = jest.fn(() => ({ begin, commit, rollback }));

    beforeEach(async () => {
        enqueue.mockReset();
        findOne.mockReset();
        findOneById.mockReset();
        validateOtp.mockReset();
        verify.mockReset();
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
                    useValue: { findOne, validateOtp, verify },
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
        findOne.mockResolvedValue(verification);
        findOneById.mockResolvedValue(user);

        await controller.resendVerificationEmail({
            email: 'a@b.com',
            id: 'user-1',
        } as any);

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

    it('verifyEmail: enqueues EMAIL_VERIFIED via CloudTasksQueueClient after the verify transaction commits', async () => {
        const user = { id: 'user-2', email: 'c@d.com', name: 'C' };
        const verification = { reference: 'ref-email-verify-1' };
        findOne.mockResolvedValue(verification);
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
        findOne.mockResolvedValue(verification);
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
        findOne.mockResolvedValue(verification);
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
});
