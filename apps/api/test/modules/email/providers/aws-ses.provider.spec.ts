import { AwsSESProvider } from '@app/modules/email/providers/aws-ses';

describe('AwsSESProvider.sendResetPassword', () => {
    const send = jest.fn();
    const formatToIsoDate = jest.fn(() => '2026-08-30');

    const configValues: Record<string, any> = {
        'email.fromEmail': 'noreply@app.example.com',
        'email.supportEmail': 'support@app.example.com',
        'home.name': 'ecbot',
        'home.url': 'https://app.example.com',
    };
    const get = jest.fn((key: string) => configValues[key]);

    const build = () =>
        new AwsSESProvider(
            { send } as any,
            { formatToIsoDate } as any,
            { get } as any
        );

    beforeEach(() => {
        send.mockReset();
        send.mockResolvedValue(undefined);
        formatToIsoDate.mockClear();
    });

    it('passes the already-absolute reset-password url through unchanged, not re-prefixed with home.url', async () => {
        const provider = build();
        const absoluteUrl =
            'https://app.example.com/reset-password?token=tok-1';

        await provider.sendResetPassword(
            { name: 'Jane', email: 'jane@b.com' } as any,
            {
                url: absoluteUrl,
                otp: '482913',
                expiredDate: new Date('2026-08-30T05:29:50.057Z'),
            } as any
        );

        expect(send).toHaveBeenCalledTimes(1);
        const [{ templateData }] = send.mock.calls[0];
        // Regression guard: this used to be
        // `${homeUrl}/${url}` — with `url` already absolute, that produced
        // "https://app.example.com/https://app.example.com/reset-password?...".
        expect(templateData.url).toBe(absoluteUrl);
        expect(templateData.url).not.toContain('app.example.com/https://');
    });

    it('carries the OTP into the template data', async () => {
        const provider = build();

        await provider.sendResetPassword(
            { name: 'Jane', email: 'jane@b.com' } as any,
            {
                url: 'https://app.example.com/reset-password?token=tok-1',
                otp: '482913',
                expiredDate: new Date('2026-08-30T05:29:50.057Z'),
            } as any
        );

        const [{ templateData }] = send.mock.calls[0];
        expect(templateData.otp).toBe('482913');
    });
});
