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

    it('resolves a conversation through its chatbot', () => {
        const service = buildService('Asia/Ho_Chi_Minh');
        expect(
            service.resolveConversationTimezone({
                chatbot: { timezone: 'Asia/Bangkok' } as any,
            })
        ).toBe('Asia/Bangkok');
    });
});
