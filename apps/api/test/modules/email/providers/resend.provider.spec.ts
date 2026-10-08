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

    // Sign-up is open to every country: without a zone, someone abroad
    // reads the server's local time as their own.
    it('labels the expiry time with its timezone', async () => {
        await build().sendVerification(
            { name: 'Chi', email: 'chi@b.com' },
            data('vi')
        );

        expect(props().expiredAt).toMatch(/GMT\+7/);
    });

    it('passes no support address when none is configured', async () => {
        await build().sendVerification(
            { name: 'Chi', email: 'chi@b.com' },
            data()
        );

        expect(props().supportEmail).toBeUndefined();
    });
});

// #187: the reset email carried a link and a code, was English-only, and
// shared a generic subject with every other email.
describe('ResendProvider.sendResetPassword', () => {
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
    // From the queue as JSON: the date is a string.
    const data = (language?: string) =>
        ({
            url: 'https://app.ecbot.dev/reset-password?token=abc',
            otp: '482913',
            expiredDate: '2026-10-01T03:05:00.000Z',
            language,
        }) as any;
    const props = () => render.mock.calls[0][1];

    beforeEach(() => {
        render.mockClear();
        sendEmail.mockReset();
        sendEmail.mockResolvedValue({ error: null });
    });

    it('sends a Vietnamese user the Vietnamese email with its own subject', async () => {
        await provider.sendResetPassword(
            { name: 'Chi', email: 'chi@b.com' },
            data('vi')
        );

        expect(props()).toMatchObject({ language: 'vi' });
        expect(sendEmail.mock.calls[0][0].subject).toBe(
            'Đặt lại mật khẩu Ecbot'
        );
    });

    it('names the product in the English subject too', async () => {
        await provider.sendResetPassword(
            { name: 'Chi', email: 'chi@b.com' },
            data()
        );

        expect(sendEmail.mock.calls[0][0].subject).toBe(
            'Reset your Ecbot password'
        );
    });

    it('shows when the link expires, with its timezone', async () => {
        await provider.sendResetPassword(
            { name: 'Chi', email: 'chi@b.com' },
            data()
        );

        expect(props().expiredDate).toMatch(/Oct 1, 2026.*10:05.*GMT\+7/);
    });

    it('sends only the link: the page no longer asks for a code', async () => {
        await provider.sendResetPassword(
            { name: 'Chi', email: 'chi@b.com' },
            data()
        );

        expect(props().url).toBe(
            'https://app.ecbot.dev/reset-password?token=abc'
        );
        expect(props()).not.toHaveProperty('otp');
    });
});
