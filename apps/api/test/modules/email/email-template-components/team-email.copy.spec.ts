import { accountBlockedEmailCopy } from '@app/modules/email/email-template-components/account-blocked-email.copy';
import { handoffEmailCopy } from '@app/modules/email/email-template-components/handoff-email.copy';
import { memberJoinedEmailCopy } from '@app/modules/email/email-template-components/member-joined-email.copy';

describe('team email copy', () => {
    it('handoff: turns a reason code into the sentence the in-app notification uses', () => {
        const vi = handoffEmailCopy('vi', 'Ecbot');

        expect(vi.reason('keyword_trigger')).toBe(
            'Khách hàng muốn nói chuyện với nhân viên.'
        );
        // A guardrail name or anything unknown reads as "other".
        expect(handoffEmailCopy('en', 'Ecbot').reason('pii_block')).toBe(
            'The assistant flagged a message it should not answer.'
        );
    });

    it('tag notice (#288): names the tag and says the assistant keeps replying', () => {
        const en = handoffEmailCopy('en', 'Ecbot').notice;

        expect(en.subject('Linh', 'Order placed')).toBe(
            'Linh tagged a customer "Order placed"'
        );
        expect(en.intro('Linh', 'Order placed')).toBe(
            'Linh tagged a customer "Order placed" in a conversation.'
        );
        expect(en.body).toBe(
            'The assistant keeps replying. Open the conversation to follow up.'
        );
        expect(handoffEmailCopy('vi', 'Ecbot').notice.body).toBe(
            'Trợ lý vẫn tiếp tục trả lời. Mở cuộc hội thoại để theo dõi.'
        );
    });

    it('member joined: names who joined which workspace', () => {
        expect(
            memberJoinedEmailCopy('en', 'Ecbot').subject('Tran Linh', 'Kunmart')
        ).toBe('Tran Linh joined Kunmart');
        expect(
            memberJoinedEmailCopy('vi', 'Ecbot').intro('Tran Linh', 'Kunmart')
        ).toBe('Tran Linh đã tham gia Kunmart.');
    });

    it('channel disconnected: says what stops working until it is reconnected', () => {
        expect(accountBlockedEmailCopy('fr', 'Ecbot').impact).toBe(
            'Until you reconnect it, your agent cannot read or answer messages on this channel.'
        );
        expect(accountBlockedEmailCopy('vi', 'Ecbot').action).toBe(
            'Kết nối lại kênh'
        );
    });
});
