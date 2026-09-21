import { Test, TestingModule } from '@nestjs/testing';
import { EmailTasksSystemController } from '../../../src/modules/email/controllers/email-tasks.system.controller';
import { EmailService } from '../../../src/modules/email/services/email.service';
import { ENUM_SEND_EMAIL_PROCESS } from '../../../src/modules/email/enums/email.enum';

describe('EmailTasksSystemController.handle', () => {
    let controller: EmailTasksSystemController;
    const sendWelcome = jest.fn();
    const sendVerification = jest.fn();

    beforeEach(async () => {
        sendWelcome.mockReset();
        sendVerification.mockReset();
        const module: TestingModule = await Test.createTestingModule({
            controllers: [EmailTasksSystemController],
            providers: [
                {
                    provide: EmailService,
                    useValue: { sendWelcome, sendVerification },
                },
            ],
        }).compile();
        controller = module.get(EmailTasksSystemController);
    });

    it('dispatches WELCOME to EmailService.sendWelcome with the send payload', async () => {
        await controller.handle({
            jobName: ENUM_SEND_EMAIL_PROCESS.WELCOME,
            send: { email: 'a@b.com', name: 'A' },
        });
        expect(sendWelcome).toHaveBeenCalledWith({
            email: 'a@b.com',
            name: 'A',
        });
    });

    it('dispatches VERIFICATION to EmailService.sendVerification with send + data', async () => {
        await controller.handle({
            jobName: ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
            send: { email: 'a@b.com', name: 'A' },
            data: { otp: '123456', expiredAt: new Date(0), reference: 'ref' },
        });
        expect(sendVerification).toHaveBeenCalledWith(
            { email: 'a@b.com', name: 'A' },
            { otp: '123456', expiredAt: new Date(0), reference: 'ref' }
        );
    });
});
