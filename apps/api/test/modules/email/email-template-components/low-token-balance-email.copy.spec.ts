import { lowTokenBalanceEmailCopy } from '@app/modules/email/email-template-components/low-token-balance-email.copy';

describe('low token balance email copy', () => {
    const date = 'Nov 1, 2026, 12:00 AM GMT+7';

    it('subject: names the workspace and the percent used', () => {
        expect(
            lowTokenBalanceEmailCopy('en', 'Ecbot').subject('Kunmart', 36)
        ).toBe('Kunmart has used 36% of its token quota');
        expect(
            lowTokenBalanceEmailCopy('vi', 'Ecbot').subject('Kunmart', 36)
        ).toBe('Kunmart đã dùng 36% token của kỳ này');
    });

    it('impact: says when the quota renews and what happens at 100%', () => {
        expect(lowTokenBalanceEmailCopy('en', 'Ecbot').impact(date)).toBe(
            `Your quota renews on ${date}. If it runs out before then, your chatbots stop replying until you top up or upgrade.`
        );
        expect(lowTokenBalanceEmailCopy('vi', 'Ecbot').impact(date)).toContain(
            `Hạn mức được làm mới vào ${date}.`
        );
    });

    it('falls back to English for an unknown language', () => {
        const fr = lowTokenBalanceEmailCopy('fr', 'Ecbot');
        expect(fr.signOff).toBe('The Ecbot team');
        expect(fr.action).toBe('Check usage');
    });
});
