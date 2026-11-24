import { Logger } from '@nestjs/common';
import { RedisConnectionProvider } from '../../../src/common/redis/redis-connection.provider';
import { IUnansweredInboundRow } from '../../../src/modules/conversation/interfaces/message.interface';
import { ReplyMissedAlertService } from '../../../src/modules/platform/services/reply-missed-alert.service';
import {
    REPLY_MISSED_EVENT,
    REPLY_MISSED_KEY_TTL_SECONDS,
} from '../../../src/modules/platform/constants/reply-missed.constant';

describe('ReplyMissedAlertService', () => {
    const set = jest.fn();
    let service: ReplyMissedAlertService;
    let warn: jest.SpyInstance;

    const row = (
        overrides: Partial<IUnansweredInboundRow> = {}
    ): IUnansweredInboundRow => ({
        messageId: 'm-1',
        createdAt: new Date('2026-11-24T12:00:00Z'),
        conversationId: 'conv-1',
        chatbotId: 'bot-1',
        workspaceId: 'ws-1',
        platform: 'TELEGRAM_BOT',
        ...overrides,
    });

    beforeEach(() => {
        jest.clearAllMocks();
        set.mockResolvedValue('OK');
        service = new ReplyMissedAlertService(
            { client: { set } } as unknown as RedisConnectionProvider,
            true
        );
        warn = jest
            .spyOn(Logger.prototype, 'warn')
            .mockImplementation(() => undefined);
    });

    afterEach(() => {
        warn.mockRestore();
        jest.restoreAllMocks();
    });

    it('logs a failed turn once, with its conversation and reason', async () => {
        await service.reportTurnMiss({
            source: 'turn',
            conversationId: 'conv-1',
            reason: 'not_delivered',
            messageIds: ['m-1', 'm-2'],
        });

        // One claim per message, one log for the turn.
        expect(set).toHaveBeenCalledTimes(2);
        expect(set).toHaveBeenCalledWith(
            'reply-missed:m-1',
            '1',
            'EX',
            REPLY_MISSED_KEY_TTL_SECONDS,
            'NX'
        );
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledWith(
            {
                event: REPLY_MISSED_EVENT,
                source: 'turn',
                conversationId: 'conv-1',
                reason: 'not_delivered',
            },
            'inbound message left unanswered by the bot'
        );
    });

    it('does not log a turn whose messages were already claimed', async () => {
        set.mockResolvedValue(null);

        await service.reportTurnMiss({
            source: 'poc-reply',
            conversationId: 'conv-1',
            reason: 'not_delivered',
            messageIds: ['m-1'],
        });

        expect(warn).not.toHaveBeenCalled();
    });

    it('logs the sweep fields the metric and alert need', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(
            new Date('2026-11-24T12:06:00Z').getTime()
        );

        const alerted = await service.reportSweepMisses([row()]);

        expect(alerted).toBe(1);
        expect(warn).toHaveBeenCalledWith(
            {
                event: REPLY_MISSED_EVENT,
                source: 'sweep',
                conversationId: 'conv-1',
                chatbotId: 'bot-1',
                workspaceId: 'ws-1',
                platform: 'TELEGRAM_BOT',
                ageSec: 360,
            },
            'inbound message left unanswered by the bot'
        );
    });

    it('skips a message another run already alerted on', async () => {
        set.mockResolvedValue(null);

        const alerted = await service.reportSweepMisses([row()]);

        expect(alerted).toBe(0);
        expect(warn).not.toHaveBeenCalled();
    });

    it('still alerts when Redis is unavailable — duplicates beat a silent miss', async () => {
        service = new ReplyMissedAlertService(
            { client: { set } } as unknown as RedisConnectionProvider,
            false
        );

        await service.reportTurnMiss({
            source: 'turn',
            conversationId: 'conv-1',
            reason: 'stream_failed',
        });

        expect(set).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledTimes(1);
    });
});
