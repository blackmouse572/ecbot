import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { ResendProvider } from '@app/modules/email/providers/resend';
import { renderTemplate } from '@app/modules/email/constraint/templates';
import { EmailSubject } from '@app/modules/email/enum/email-subject.enum';

jest.mock('@app/modules/email/constraint/templates', () => ({
    renderTemplate: jest.fn().mockResolvedValue('<html />'),
}));

// eccho-ee#128: a failed renewal cut the chatbots off with no word to the owner.
describe('ResendProvider.sendPaymentFailed', () => {
    const sendEmail = jest.fn();
    const render = renderTemplate as jest.Mock;
    const values: Record<string, any> = {
        'email.fromEmail': 'Ecbot <noreply@ecbot.dev>',
        'home.name': 'Ecbot',
        'home.url': 'https://app.ecbot.dev',
        'app.timezone': 'Asia/Ho_Chi_Minh',
    };
    const config = { get: (key: string) => values[key] } as any;
    const provider = new ResendProvider(
        { sendEmail } as any,
        config,
        new HelperDateService(config)
    );
    const props = () => render.mock.calls[0][1];
    const subject = () => sendEmail.mock.calls[0][0].subject;

    beforeEach(() => {
        render.mockClear();
        sendEmail.mockReset();
        sendEmail.mockResolvedValue({ error: null });
    });

    it('says when the chatbots stop and links to the billing page, in Vietnamese', async () => {
        await provider.sendPaymentFailed(
            { name: 'Chi', email: 'owner@b.com' },
            {
                workspaceName: 'Kunmart',
                // Read back from JSON, so a string.
                graceEndsAt: '2026-10-22T03:00:00.000Z' as any,
                billingUrl: '/kunmart/subscription',
                language: 'vi',
            }
        );

        expect(render).toHaveBeenCalledWith(
            EmailSubject.PaymentFailed,
            expect.objectContaining({
                billingUrl: 'https://app.ecbot.dev/kunmart/subscription',
                reminder: false,
                language: 'vi',
            })
        );
        expect(props().graceEndsAt).toContain('22');
        expect(props().graceEndsAt).toContain('10:00');
        expect(subject()).toBe('Thanh toán cho Kunmart chưa thành công');
    });

    it('reminder: puts the stop date in the subject', async () => {
        await provider.sendPaymentFailed(
            { name: 'Chi', email: 'owner@b.com' },
            {
                workspaceName: 'Kunmart',
                graceEndsAt: new Date('2026-10-22T03:00:00.000Z'),
                billingUrl: '/kunmart/subscription',
                reminder: true,
            }
        );

        expect(subject()).toBe(
            `Kunmart: chatbots stop answering on ${props().graceEndsAt}`
        );
        expect(props().graceEndsAt).toMatch(/Oct 22, 2026.*GMT\+7/);
    });
});
