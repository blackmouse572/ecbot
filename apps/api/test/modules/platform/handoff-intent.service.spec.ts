import { HANDOFF_INTENT_MIN_CONFIDENCE } from '@app/modules/platform/constants/handoff.constant';
import { HandoffIntentService } from '@app/modules/platform/services/handoff-intent.service';

// A keyword match alone handed off ordinary questions ("Shop có hỗ trợ ship
// COD không?"), so the cheap model confirms the customer wants a person. Only
// a confident yes hands off; anything else lets the agent answer.
describe('HandoffIntentService.wantsPerson', () => {
    const systemOne = jest.fn();
    const service = new HandoffIntentService({ systemOne } as any);

    beforeEach(() => systemOne.mockReset());

    const answer = (choice: string, confidence: number) =>
        systemOne.mockResolvedValue({
            wants_person: { type: 'choice', choice, confidence },
        });

    it('hands off on a confident "wants a person"', async () => {
        answer('wants_person', 0.95);

        await expect(
            service.wantsPerson('Cho mình gặp nhân viên với', 'nhân viên')
        ).resolves.toBe(true);
    });

    it('asks about the message and the keyword that flagged it', async () => {
        answer('wants_person', 0.95);

        await service.wantsPerson('Cho mình gặp nhân viên với', 'nhân viên');

        const [state, questions] = systemOne.mock.calls[0];
        expect(state).toContain('Cho mình gặp nhân viên với');
        expect(state).toContain('nhân viên');
        expect(questions.wants_person).toMatchObject({
            type: 'choice',
            criteria: {
                wants_person: expect.any(String),
                not_asking: expect.any(String),
            },
        });
    });

    it('does not hand off an ordinary question', async () => {
        answer('not_asking', 0.9);

        await expect(
            service.wantsPerson('Shop có hỗ trợ ship COD không?', 'hỗ trợ')
        ).resolves.toBe(false);
    });

    it('does not hand off when the model is unsure', async () => {
        answer('wants_person', HANDOFF_INTENT_MIN_CONFIDENCE - 0.01);

        await expect(service.wantsPerson('support?', 'support')).resolves.toBe(
            false
        );
    });

    it('does not hand off when there is no answer', async () => {
        systemOne.mockResolvedValue({});

        await expect(service.wantsPerson('help me', 'help me')).resolves.toBe(
            false
        );
    });

    it('does not hand off when the decision call fails', async () => {
        systemOne.mockRejectedValue(new Error('timeout'));

        await expect(service.wantsPerson('help me', 'help me')).resolves.toBe(
            false
        );
    });
});
