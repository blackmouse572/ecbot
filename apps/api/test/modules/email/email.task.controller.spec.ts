import { Test, TestingModule } from '@nestjs/testing';
import { EmailTaskController } from '../../../src/modules/email/controllers/email.task.controller';
import { EmailService } from '../../../src/modules/email/services/email.service';
import { ENUM_SEND_EMAIL_PROCESS } from '../../../src/modules/email/enums/email.enum';

describe('EmailTaskController.handle', () => {
    let controller: EmailTaskController;
    const sendWelcome = jest.fn();
    const sendVerification = jest.fn();

    beforeEach(async () => {
        sendWelcome.mockReset();
        sendVerification.mockReset();
        const module: TestingModule = await Test.createTestingModule({
            controllers: [EmailTaskController],
            providers: [
                {
                    provide: EmailService,
                    useValue: { sendWelcome, sendVerification },
                },
            ],
        }).compile();
        controller = module.get(EmailTaskController);
    });

    it('dispatches WELCOME to EmailService.sendWelcome with the send payload', async () => {
        const res = await controller.handle({
            jobName: ENUM_SEND_EMAIL_PROCESS.WELCOME,
            send: { email: 'a@b.com', name: 'A' },
        });
        expect(sendWelcome).toHaveBeenCalledWith({
            email: 'a@b.com',
            name: 'A',
        });
        expect(res).toEqual({});
    });

    it('dispatches VERIFICATION to EmailService.sendVerification with send + data', async () => {
        const res = await controller.handle({
            jobName: ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
            send: { email: 'a@b.com', name: 'A' },
            data: { otp: '123456', expiredAt: new Date(0), reference: 'ref' },
        });
        expect(sendVerification).toHaveBeenCalledWith(
            { email: 'a@b.com', name: 'A' },
            { otp: '123456', expiredAt: new Date(0), reference: 'ref' }
        );
        expect(res).toEqual({});
    });
});
