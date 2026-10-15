import { ENUM_CONVERSATION_ACTIVITY_KIND } from '../../../src/modules/conversation/enums/conversation-activity.enum';
import { ReplyActivityCollector } from '../../../src/modules/platform/utils/reply-activity-collector';

describe('ReplyActivityCollector', () => {
    it('keeps why the agent ended a turn without a reply', () => {
        const collector = new ReplyActivityCollector();

        collector.observe({
            type: 'tool-input-start',
            toolCallId: 'c1',
            toolName: 'end_without_reply',
        });
        collector.observe({
            type: 'tool-input-available',
            toolCallId: 'c1',
            toolName: 'end_without_reply',
            input: { reason: 'customer said ok' },
        });

        expect(collector.endedWithoutReply).toBe(true);
        expect(collector.activities).toEqual([
            expect.objectContaining({
                kind: ENUM_CONVERSATION_ACTIVITY_KIND.NO_REPLY,
                label: 'customer said ok',
            }),
        ]);
    });
});
