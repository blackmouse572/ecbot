import { ConfigService } from '@nestjs/config';
import { ChatbotTimezoneService } from '../../../../src/modules/chatbot/services/chatbot-timezone.service';

describe('ChatbotTimezoneService', () => {
    const service = new ChatbotTimezoneService({
        get: () => 'Asia/Ho_Chi_Minh',
    } as unknown as ConfigService);

    it('falls back to the deployment default when nothing is set', () => {
        expect(service.resolve({ timezone: null }, null)).toEqual({
            agent: 'Asia/Ho_Chi_Minh',
            customer: 'Asia/Ho_Chi_Minh',
        });
    });

    it('uses the agent timezone for both clocks when the conversation has none', () => {
        expect(service.resolve({ timezone: 'Asia/Bangkok' })).toEqual({
            agent: 'Asia/Bangkok',
            customer: 'Asia/Bangkok',
        });
    });

    // Business hours stay in the agent's zone; only the customer's clock moves.
    it('puts the conversation timezone in front for the customer only', () => {
        expect(
            service.resolve(
                { timezone: 'Asia/Bangkok' },
                { timezone: 'America/New_York' }
            )
        ).toEqual({ agent: 'Asia/Bangkok', customer: 'America/New_York' });
        expect(
            service.resolve({ timezone: null }, { timezone: 'Europe/London' })
        ).toEqual({ agent: 'Asia/Ho_Chi_Minh', customer: 'Europe/London' });
    });
});
