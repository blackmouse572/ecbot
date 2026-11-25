import { Logger } from '@nestjs/common';
import { RedisConnectionProvider } from '../../../src/common/redis/redis-connection.provider';
import { MessageRepository } from '../../../src/modules/conversation/repository/repositories/message.repository';
import { CloudTasksQueueClient } from '../../../src/worker/cloud-tasks-queue.client';
import { IUnansweredInboundRow } from '../../../src/modules/conversation/interfaces/message.interface';
import { ReplyMissedAlertService } from '../../../src/modules/platform/services/reply-missed-alert.service';
import {
    ENUM_REPLY_MISSED_PROCESS,
    REPLY_MISSED_DELAY_SECONDS,
    REPLY_MISSED_EVENT,
    REPLY_MISSED_KEY_TTL_SECONDS,
    REPLY_MISSED_QUEUE,
} from '../../../src/modules/platform/constants/reply-missed.constant';

describe('ReplyMissedAlertService', () => {
    const set = jest.fn();
    const findUnansweredInboundById = jest.fn();
    const enqueue = jest.fn();
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

    const build = (redisAvailable: boolean) =>
        new ReplyMissedAlertService(
            { client: { set } } as unknown as RedisConnectionProvider,
            redisAvailable,
            {
                findUnansweredInboundById,
            } as unknown as MessageRepository,
            { enqueue } as unknown as CloudTasksQueueClient
        );

    beforeEach(() => {
        jest.clearAllMocks();
        set.mockResolvedValue('OK');
        findUnansweredInboundById.mockResolvedValue(row());
        enqueue.mockResolvedValue(undefined);
        service = build(true);
        warn = jest
            .spyOn(Logger.prototype, 'warn')
            .mockImplementation(() => undefined);
    });

    afterEach(() => {
        warn.mockRestore();
        jest.restoreAllMocks();
    });

    it('schedules one check five minutes out, named by message', async () => {
        const now = new Date('2026-11-24T12:00:00Z').getTime();
        jest.spyOn(Date, 'now').mockReturnValue(now);

        await service.scheduleCheck('m-1');

        expect(enqueue).toHaveBeenCalledWith(
            REPLY_MISSED_QUEUE,
            ENUM_REPLY_MISSED_PROCESS.CHECK,
            { messageId: 'm-1' },
            {
                taskName: 'reply-missed-m-1',
                scheduleTime: new Date(now + REPLY_MISSED_DELAY_SECONDS * 1000),
            }
        );
    });

    it('logs the delayed check with the fields the metric and alert need', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(
            new Date('2026-11-24T12:06:00Z').getTime()
        );

        await service.check('m-1');

        expect(warn).toHaveBeenCalledWith(
            {
                event: REPLY_MISSED_EVENT,
                source: 'check',
                conversationId: 'conv-1',
                chatbotId: 'bot-1',
                workspaceId: 'ws-1',
                platform: 'TELEGRAM_BOT',
                ageSec: 360,
            },
            'inbound message left unanswered by the bot'
        );
    });

    it('stays silent when the message was answered or is a deliberate silence', async () => {
        findUnansweredInboundById.mockResolvedValue(null);

        await service.check('m-1');

        expect(warn).not.toHaveBeenCalled();
    });

    it('skips a message another run already claimed', async () => {
        set.mockResolvedValue(null);

        await service.check('m-1');

        expect(warn).not.toHaveBeenCalled();
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

    it('still alerts when Redis is unavailable — duplicates beat a silent miss', async () => {
        service = build(false);

        await service.check('m-1');

        expect(set).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledTimes(1);
    });
});
