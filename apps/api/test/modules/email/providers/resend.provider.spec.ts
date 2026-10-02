import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { ResendProvider } from '@app/modules/email/providers/resend';
import { renderTemplate } from '@app/modules/email/constraint/templates';
import { EmailSubject } from '@app/modules/email/enum/email-subject.enum';

jest.mock('@app/modules/email/constraint/templates', () => ({
    renderTemplate: jest.fn().mockResolvedValue('<html />'),
}));

// #141: a Vietnamese sign-up got an English email whose expiry date was
// empty and whose support address was a placeholder.
describe('ResendProvider.sendVerification', () => {
    const sendEmail = jest.fn();
    const render = renderTemplate as jest.Mock;

    const build = (overrides: Record<string, any> = {}) => {
        const values: Record<string, any> = {
            'email.fromEmail': 'Ecbot <noreply@ecbot.dev>',
            'email.supportEmail': undefined,
            'home.name': 'Ecbot',
            'home.url': 'https://app.ecbot.dev',
            'app.timezone': 'Asia/Ho_Chi_Minh',
            ...overrides,
        };
        const config = { get: (key: string) => values[key] } as any;
        return new ResendProvider(
            { sendEmail } as any,
            config,
            new HelperDateService(config)
        );
    };

    // The job comes back from the queue as JSON, so the date is a string.
    const data = (language?: string) =>
        ({
            otp: '482913',
            expiredAt: '2026-10-01T03:05:00.000Z',
            reference: 'REF-1',
            language,
        }) as any;

    const props = () => render.mock.calls[0][1];

    beforeEach(() => {
        render.mockClear();
        sendEmail.mockReset();
        sendEmail.mockResolvedValue({ error: null });
    });

    it('sends a Vietnamese user the Vietnamese email and subject', async () => {
        await build().sendVerification(
            { name: 'Chi Huong', email: 'chi@b.com' },
            data('vi')
        );

        expect(render).toHaveBeenCalledWith(
            EmailSubject.EmailVerification,
            expect.objectContaining({ language: 'vi', name: 'Chi Huong' })
        );
        expect(sendEmail.mock.calls[0][0].subject).toBe(
            'Mã xác minh email của bạn'
        );
    });

    it('keeps the English subject for everyone else', async () => {
        await build().sendVerification(
            { name: 'Chi', email: 'chi@b.com' },
            data()
        );

        expect(sendEmail.mock.calls[0][0].subject).toBe(
            EmailSubject.EmailVerification
        );
    });

    it('shows when the code expires, even with the date as a string', async () => {
        await build().sendVerification(
            { name: 'Chi', email: 'chi@b.com' },
            data()
        );

        // 03:05 UTC is 10:05 in Ho Chi Minh City.
        expect(props().expiredAt).toMatch(/10:05/);
        expect(props().expiredAt).toMatch(/2026/);
    });

    it('passes no support address when none is configured', async () => {
        await build().sendVerification(
            { name: 'Chi', email: 'chi@b.com' },
            data()
        );

        expect(props().supportEmail).toBeUndefined();
    });
});
