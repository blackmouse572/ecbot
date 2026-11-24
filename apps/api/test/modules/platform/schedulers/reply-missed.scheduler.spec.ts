import { MikroORM } from '@mikro-orm/core';
import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';
import { IUnansweredInboundRow } from '@app/modules/conversation/interfaces/message.interface';
import { ReplyMissedScheduler } from '@app/modules/platform/schedulers/reply-missed.scheduler';
import { ReplyMissedAlertService } from '@app/modules/platform/services/reply-missed-alert.service';
import {
    REPLY_MISSED_MAX_PER_RUN,
    REPLY_MISSED_MIN_AGE_SECONDS,
    REPLY_MISSED_WINDOW_SECONDS,
} from '@app/modules/platform/constants/reply-missed.constant';

// instanceof MikroORM so @ContextualCron's @CreateRequestContext() context resolver accepts it.
const mockEm = { name: 'default', fork: jest.fn(() => ({ name: 'default' })) };
const mockOrm = Object.assign(Object.create(MikroORM.prototype), {
    em: mockEm,
});

describe('ReplyMissedScheduler', () => {
    const findUnansweredInbound = jest.fn();
    const reportSweepMisses = jest.fn();
    let scheduler: ReplyMissedScheduler;

    const rows: IUnansweredInboundRow[] = [
        {
            messageId: 'm-1',
            createdAt: new Date('2026-11-24T11:55:00Z'),
            conversationId: 'conv-1',
            chatbotId: 'bot-1',
            workspaceId: 'ws-1',
            platform: 'TELEGRAM_BOT',
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        findUnansweredInbound.mockResolvedValue([]);
        reportSweepMisses.mockResolvedValue(0);
        scheduler = new ReplyMissedScheduler(
            { findUnansweredInbound } as unknown as MessageRepository,
            { reportSweepMisses } as unknown as ReplyMissedAlertService,
            mockOrm
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('scans the 5-30 minute window, capped per run', async () => {
        const now = new Date('2026-11-24T12:00:00Z').getTime();
        jest.spyOn(Date, 'now').mockReturnValue(now);

        await scheduler.sweep();

        expect(findUnansweredInbound).toHaveBeenCalledWith(
            new Date(now - REPLY_MISSED_WINDOW_SECONDS * 1000),
            new Date(now - REPLY_MISSED_MIN_AGE_SECONDS * 1000),
            REPLY_MISSED_MAX_PER_RUN
        );
    });

    it('does nothing when no message is unanswered', async () => {
        await scheduler.sweep();

        expect(reportSweepMisses).not.toHaveBeenCalled();
    });

    it('reports every unanswered message the sweep finds', async () => {
        findUnansweredInbound.mockResolvedValue(rows);

        await scheduler.sweep();

        expect(reportSweepMisses).toHaveBeenCalledWith(rows);
    });
});
