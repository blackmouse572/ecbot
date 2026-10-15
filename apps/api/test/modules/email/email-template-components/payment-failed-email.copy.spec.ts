import { paymentFailedEmailCopy } from '@app/modules/email/email-template-components/payment-failed-email.copy';

describe('payment failed email copy', () => {
    const date = '22 Oct 2026, 10:00 GMT+7';

    it('subject: names the workspace, and the stop date on the reminder', () => {
        const en = paymentFailedEmailCopy('en', 'Ecbot');
        const vi = paymentFailedEmailCopy('vi', 'Ecbot');

        expect(en.subject('Kunmart', date, false)).toBe(
            'Payment failed for Kunmart'
        );
        expect(en.subject('Kunmart', date, true)).toBe(
            `Kunmart: chatbots stop answering on ${date}`
        );
        expect(vi.subject('Kunmart', date, false)).toBe(
            'Thanh toán cho Kunmart chưa thành công'
        );
        expect(vi.subject('Kunmart', date, true)).toBe(
            `Kunmart: chatbot sẽ ngừng trả lời từ ${date}`
        );
    });

    it('heading and intro: the reminder says the payment is still missing', () => {
        const en = paymentFailedEmailCopy('en', 'Ecbot');
        const vi = paymentFailedEmailCopy('vi', 'Ecbot');

        expect(en.heading(false)).toBe('Your payment did not go through');
        expect(en.heading(true)).toBe('Your chatbots stop answering soon');
        expect(en.intro('Kunmart', true)).toBe(
            'The renewal payment for Kunmart still has not gone through.'
        );
        expect(vi.heading(true)).toBe('Chatbot của bạn sắp ngừng trả lời');
        expect(vi.intro('Kunmart', false)).toContain(
            'Chúng tôi chưa thu được phí gia hạn cho Kunmart.'
        );
    });

    it('impact: says when the chatbots stop', () => {
        expect(paymentFailedEmailCopy('en', 'Ecbot').impact(date)).toBe(
            `Your chatbots keep answering customers until ${date}. After that, they stop replying until a payment goes through.`
        );
    });

    it('falls back to English for an unknown language', () => {
        const fr = paymentFailedEmailCopy('fr', 'Ecbot');
        expect(fr.signOff).toBe('The Ecbot team');
        expect(fr.action).toBe('Update payment method');
    });
});
