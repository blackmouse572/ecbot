import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { ResendProvider } from '@app/modules/email/providers/resend';
import { renderTemplate } from '@app/modules/email/constraint/templates';
import { EmailSubject } from '@app/modules/email/enum/email-subject.enum';

jest.mock('@app/modules/email/constraint/templates', () => ({
    renderTemplate: jest.fn().mockResolvedValue('<html />'),
}));

describe('ResendProvider.sendLowTokenBalance', () => {
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

    it('writes in Vietnamese: readable date, workspace usage link, VI subject', async () => {
        await provider.sendLowTokenBalance(
            { name: 'Chi', email: 'owner@b.com' },
            {
                workspaceName: 'Kunmart',
                usedPercent: 36,
                // Read back from JSON, so a string.
                periodEnd: '2026-10-31T17:00:00.000Z' as any,
                usageUrl: '/kunmart/usage',
                language: 'vi',
            }
        );

        expect(render).toHaveBeenCalledWith(
            EmailSubject.LowTokenBalance,
            expect.objectContaining({
                usageUrl: 'https://app.ecbot.dev/kunmart/usage',
                usedPercent: 36,
                language: 'vi',
            })
        );
        expect(props().periodEnd).not.toMatch(/\+0700/);
        expect(props().periodEnd).toContain('GMT+7');
        expect(subject()).toBe('Kunmart đã dùng 36% token của kỳ này');
    });

    it('defaults to English', async () => {
        await provider.sendLowTokenBalance(
            { name: 'Chi', email: 'owner@b.com' },
            {
                workspaceName: 'Kunmart',
                usedPercent: 36,
                periodEnd: new Date('2026-10-31T17:00:00.000Z'),
                usageUrl: '/kunmart/usage',
            }
        );

        expect(props().periodEnd).toMatch(/Nov 1, 2026.*GMT\+7/);
        expect(subject()).toBe('Kunmart has used 36% of its token quota');
    });
});
