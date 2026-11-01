import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { ResendProvider } from '@app/modules/email/providers/resend';
import { renderTemplate } from '@app/modules/email/constraint/templates';
import { EmailSubject } from '@app/modules/email/enum/email-subject.enum';

jest.mock('@app/modules/email/constraint/templates', () => ({
    renderTemplate: jest.fn().mockResolvedValue('<html />'),
}));

// A plan paid once (SePay bank transfer) ends with its period unless the
// owner pays for the next one, so they are told ahead of time.
describe('ResendProvider.sendPlanRenewalReminder', () => {
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

    it('names the plan and its end date and links to the billing page, in Vietnamese', async () => {
        await provider.sendPlanRenewalReminder(
            { name: 'Chi', email: 'owner@b.com' },
            {
                workspaceName: 'Kunmart',
                planName: 'Growth',
                // Read back from JSON, so a string.
                periodEnd: '2026-12-15T03:00:00.000Z' as any,
                billingUrl: '/kunmart/settings/billing',
                language: 'vi',
            }
        );

        expect(render).toHaveBeenCalledWith(
            EmailSubject.PlanRenewalReminder,
            expect.objectContaining({
                planName: 'Growth',
                billingUrl: 'https://app.ecbot.dev/kunmart/settings/billing',
                language: 'vi',
            })
        );
        expect(props().periodEnd).toMatch(/15 thg 12, 2026/);
        expect(subject()).toBe(
            `Gói Growth của Kunmart hết hạn vào ${props().periodEnd}`
        );
    });

    it('writes English otherwise', async () => {
        await provider.sendPlanRenewalReminder(
            { name: 'Chi', email: 'owner@b.com' },
            {
                workspaceName: 'Kunmart',
                planName: 'Growth',
                periodEnd: new Date('2026-12-15T03:00:00.000Z'),
                billingUrl: '/kunmart/settings/billing',
            }
        );

        expect(props().periodEnd).toMatch(/Dec 15, 2026/);
        expect(subject()).toBe(
            `Your Growth plan for Kunmart ends on ${props().periodEnd}`
        );
    });
});
