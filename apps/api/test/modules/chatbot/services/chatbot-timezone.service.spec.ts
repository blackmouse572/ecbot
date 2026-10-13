import { ChatbotTimezoneService } from '@app/modules/chatbot/services/chatbot-timezone.service';

function buildService(appTimezone?: string) {
    const configService = { get: jest.fn().mockReturnValue(appTimezone) };
    return new ChatbotTimezoneService(configService as any);
}

describe('ChatbotTimezoneService', () => {
    it('uses the agent timezone when it is set', () => {
        const service = buildService('Asia/Ho_Chi_Minh');
        expect(service.resolveAgentTimezone({ timezone: 'Asia/Tokyo' })).toBe(
            'Asia/Tokyo'
        );
    });

    it('falls back to APP_TIMEZONE when the agent has none', () => {
        const service = buildService('Asia/Ho_Chi_Minh');
        expect(service.resolveAgentTimezone({ timezone: undefined })).toBe(
            'Asia/Ho_Chi_Minh'
        );
        expect(service.resolveAgentTimezone(null)).toBe('Asia/Ho_Chi_Minh');
    });

    it('skips an invalid stored zone instead of failing', () => {
        const service = buildService('Asia/Ho_Chi_Minh');
        expect(service.resolveAgentTimezone({ timezone: 'Not/AZone' })).toBe(
            'Asia/Ho_Chi_Minh'
        );
    });

    it('falls back to UTC when nothing valid is configured', () => {
        const service = buildService(undefined);
        expect(service.resolveAgentTimezone(null)).toBe('UTC');
    });

    it('resolves a conversation without its own zone through its chatbot', () => {
        const service = buildService('Asia/Ho_Chi_Minh');
        expect(
            service.resolveConversationTimezone({
                chatbot: { timezone: 'Asia/Bangkok' } as any,
                timezone: null,
            })
        ).toBe('Asia/Bangkok');
    });

    // #292: business hours stay in the agent's zone; only the customer's
    // clock moves to the conversation's.
    it('puts the conversation timezone in front for the customer only', () => {
        const service = buildService('Asia/Ho_Chi_Minh');
        expect(
            service.resolve(
                { timezone: 'Asia/Bangkok' },
                { timezone: 'America/New_York' }
            )
        ).toEqual({ agent: 'Asia/Bangkok', customer: 'America/New_York' });
        expect(service.resolve({ timezone: null }, null)).toEqual({
            agent: 'Asia/Ho_Chi_Minh',
            customer: 'Asia/Ho_Chi_Minh',
        });
        expect(
            service.resolveConversationTimezone({
                chatbot: { timezone: 'Asia/Bangkok' } as any,
                timezone: 'Europe/London',
            })
        ).toBe('Europe/London');
    });
});
