import { HelperDateService } from '@app/common/helper/services/helper.date.service';
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ENUM_MESSAGE_AUTHOR } from '@app/modules/conversation/enums/message.enum';
import { ConversationEntity } from '@app/modules/conversation/repository/entities/conversation.entity';
import { ConversationRepository } from '@app/modules/conversation/repository/repositories/conversation.repository';
import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';
import { ENUM_SEND_FAILURE } from '@app/modules/platform/constants/channel-health.constant';
import { OutboundMessage } from '@app/modules/platform/interfaces/message-model';
import { PlatformAdapterRegistry } from '@app/modules/platform/services/platform-adapter.registry';
import { classifySendError } from '@app/modules/platform/utils/send-failure.util';
import { ENUM_FEATURE_FLAG } from '@app/modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagService } from '@app/modules/feature-flag/services/feature-flag.service';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { IDatabaseFindAllOptions } from '@app/common/database/interfaces/database.interface';
import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { randomUUID } from 'crypto';
import {
    MARKETING_SEND_BOUGHT_PRESETS,
    MARKETING_SEND_EMPTY_STATS,
    MARKETING_SEND_ENQUEUE_BATCH,
    MARKETING_SEND_PAGE_SIZE,
    MARKETING_SEND_PER_ACCOUNT_PER_MINUTE,
    MARKETING_SEND_QUEUE,
    MARKETING_SEND_TASK_PREFIX,
    MARKETING_STOP_ACTION_ID,
    MARKETING_STOP_HINT,
    MARKETING_STOP_LABEL,
    MARKETING_TEXT_PRODUCT,
} from '../constants/marketing-send.constant';
import { MarketingSendUpdateRequestDto } from '../dtos/request/marketing-send.update.request.dto';
import {
    MarketingSendGetResponseDto,
    MarketingSendListResponseDto,
    MarketingSendReplyResponseDto,
} from '../dtos/response/marketing-send.get.response.dto';
import { IMarketingAudience } from '../interfaces/marketing-audience.interface';
import { MarketingSendEntity } from '../repository/entities/marketing-send.entity';
import { marketingText } from '../utils/marketing-text.util';
import {
    ENUM_MARKETING_MESSAGE_STATUS as S,
    ENUM_MARKETING_SEND_MODE,
    ENUM_MARKETING_SEND_PROCESS,
    ENUM_MARKETING_SKIP_REASON,
} from '../enums/marketing-send.enum';
import {
    IMarketingLastInbound,
    IMarketingSendInput,
    IMarketingSendReply,
    IMarketingSendStats,
} from '../interfaces/marketing-send.interface';
import { MarketingMessageEntity } from '../repository/entities/marketing-message.entity';
import { MarketingMessageRepository } from '../repository/repositories/marketing-message.repository';
import { MarketingSendRepository } from '../repository/repositories/marketing-send.repository';
import { marketingRoute } from '../utils/marketing-route.util';
import {
    marketingSendAt,
    marketingSendEnd,
} from '../utils/marketing-send-time.util';
import { MarketingAudienceService } from './marketing-audience.service';
import { MarketingSettingsService } from './marketing-settings.service';

const DEFAULT_LANGUAGE = 'vi';

/**
 * Sends one offer to an audience (#505): each reached customer gets one
 * message on the free channel they wrote on last, inside the shop's send
 * hours, through the marketing-send queue. It shows in the inbox as the
 * bot's message.
 */
@Injectable()
export class MarketingSendService {
    private readonly logger = new Logger(MarketingSendService.name);

    constructor(
        private readonly sendRepository: MarketingSendRepository,
        private readonly marketingMessageRepository: MarketingMessageRepository,
        private readonly audienceService: MarketingAudienceService,
        private readonly settingsService: MarketingSettingsService,
        private readonly conversationRepository: ConversationRepository,
        private readonly messageRepository: MessageRepository,
        private readonly cloudTasksClient: CloudTasksQueueClient,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService,
        private readonly moduleRef: ModuleRef,
        private readonly featureFlagService: FeatureFlagService
    ) {}

    /**
     * Saves a send and runs it once now. An AUTO send then runs again each
     * day (`runDueAuto`) for customers who newly match.
     */
    async create(
        workspaceId: string,
        input: IMarketingSendInput,
        createdBy?: string,
        now: Date = new Date()
    ): Promise<MarketingSendEntity> {
        const audience = this.audienceService.toAudience(input.audience);
        const preview = await this.audienceService.preview(
            workspaceId,
            input.audience,
            now
        );
        const rules = await this.settingsService.rules(workspaceId);
        const workspace = this.sendRepository
            .getEntityManager()
            .getReference(WorkspaceEntity, workspaceId);
        const send = await this.sendRepository.create({
            workspace,
            // This first run's day, so the hourly AUTO run starts the day after.
            lastRunDay: this.helperDateService.formatToIsoDate(
                marketingSendAt(now, this.zone(), rules.sendFrom, rules.sendTo)
            ),
            name: input.name,
            mode: input.mode,
            audience,
            text: input.text,
            imageUrl: input.imageUrl ?? null,
            excluded: Object.fromEntries(
                preview.excluded.reasons
                    .filter(r => r.count > 0)
                    .map(r => [r.reason, r.count])
            ),
            ...(createdBy && { createdBy: { id: createdBy } }),
        });
        await this.run(send, now);
        return send;
    }

    /**
     * Hourly: runs each AUTO send that is on, once a shop day, while the
     * shop's send hours are open.
     */
    async runDueAuto(now: Date = new Date()): Promise<void> {
        const today = this.helperDateService.formatToIsoDate(now);
        for (const send of await this.sendRepository.findDueAuto(today)) {
            try {
                await this.runIfDue(send, today, now);
            } catch (error: unknown) {
                // One shop's failure leaves the others to run; this one
                // tries again next hour, or tomorrow once it claimed today.
                this.logger.warn(
                    `marketing send ${send.id} auto run failed: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }
    }

    /**
     * Runs an AUTO send when its shop has Tiếp thị on and its send hours
     * are open. With the flag off it waits unclaimed, so it runs again the
     * day the flag comes back on.
     */
    private async runIfDue(
        send: MarketingSendEntity,
        today: string,
        now: Date
    ): Promise<void> {
        const workspaceId = send.workspace.id;
        if (
            !(await this.featureFlagService.isEnabled(
                ENUM_FEATURE_FLAG.MARKETING,
                workspaceId
            ))
        ) {
            return;
        }
        const rules = await this.settingsService.rules(workspaceId);
        const opensAt = marketingSendAt(
            now,
            this.zone(),
            rules.sendFrom,
            rules.sendTo
        );
        if (opensAt.getTime() !== now.getTime()) return;
        if (!(await this.sendRepository.claimRun(send.id, today))) return;
        await this.run(send, now);
    }

    /**
     * Plans one run and queues a task per customer it can reach for free.
     * Who is skipped, and why, is kept with the send. An AUTO run leaves
     * out who this send already reached.
     */
    private async run(send: MarketingSendEntity, now: Date): Promise<void> {
        const workspaceId = send.workspace.id;
        const customerIds = await this.reachedIds(
            workspaceId,
            send.audience,
            now,
            send.mode === ENUM_MARKETING_SEND_MODE.AUTO ? send.id : undefined
        );
        const rules = await this.settingsService.rules(workspaceId);
        const sendAt = marketingSendAt(
            now,
            this.zone(),
            rules.sendFrom,
            rules.sendTo
        );
        const sendDay = this.helperDateService.formatToIsoDate(sendAt);
        const inbound = await this.lastInbound(customerIds, workspaceId);
        const rows = customerIds.map(customerId => {
            const route = marketingRoute(
                customerId,
                inbound.get(customerId) ?? [],
                channel => this.windowHours(channel),
                sendAt
            );
            return 'skip' in route
                ? {
                      customerId,
                      channel: route.channel ?? null,
                      conversationId: null,
                      status: S.SKIPPED as const,
                      skipReason: route.skip,
                      sendDay,
                  }
                : {
                      customerId,
                      channel: route.channel,
                      conversationId: route.conversationId,
                      status: S.QUEUED as const,
                      skipReason: null,
                      sendDay,
                  };
        });
        // A crash between this write and the last task leaves those rows
        // QUEUED with no task: the customer misses that one day (the cap
        // counts QUEUED only on its own send_day) and is free again after.
        const queued = await this.marketingMessageRepository.plan(
            workspaceId,
            send.id,
            rows
        );
        // Each page sends at its own pace from sendAt, inside the shop's
        // hours that day; the free window is checked again when each offer
        // goes out.
        const closesAt = marketingSendEnd(sendAt, this.zone(), rules.sendTo);
        const accountOf = new Map(
            [...inbound.values()]
                .flat()
                .map(r => [r.conversationId, r.accountId])
        );
        const conversationOf = new Map(
            rows.map(r => [r.customerId, r.conversationId])
        );
        const perAccount = new Map<string, number>();
        const paced = queued.map(row => {
            const conversationId = conversationOf.get(row.customerId);
            const account =
                (conversationId && accountOf.get(conversationId)) ?? '';
            const n = perAccount.get(account) ?? 0;
            perAccount.set(account, n + 1);
            const minutes = Math.floor(
                n / MARKETING_SEND_PER_ACCOUNT_PER_MINUTE
            );
            return {
                id: row.id,
                at: new Date(sendAt.getTime() + minutes * 60_000),
            };
        });
        // Past closing, the offer is not sent: the customer stays free for
        // another send on a later day.
        for (const row of paced.filter(r => r.at >= closesAt)) {
            await this.marketingMessageRepository.finish(row.id, {
                status: S.SKIPPED,
                skipReason: ENUM_MARKETING_SKIP_REASON.SEND_HOURS_ENDED,
            });
        }
        const inHours = paced.filter(r => r.at < closesAt);
        for (let i = 0; i < inHours.length; i += MARKETING_SEND_ENQUEUE_BATCH) {
            await Promise.all(
                inHours
                    .slice(i, i + MARKETING_SEND_ENQUEUE_BATCH)
                    .map(row => this.enqueue(row.id, row.at))
            );
        }
    }

    /** Cloud Tasks: sends one queued offer, unless it should no longer go. */
    async deliver(messageId: string, now: Date = new Date()): Promise<void> {
        const row = await this.marketingMessageRepository.findQueued(messageId);
        // Already sent, failed or skipped: a retried task sends nothing.
        if (!row) return;
        // Two overlapping runs of one task both read QUEUED; only the one
        // that claims the row goes on.
        if (!(await this.marketingMessageRepository.claim(row.id))) return;

        const skip = await this.skipReason(row, now);
        const conversation = row.conversation;
        if (skip || !conversation) {
            await this.finish(row, {
                status: S.SKIPPED,
                skipReason: skip ?? ENUM_MARKETING_SKIP_REASON.NO_CHANNEL,
            });
            return;
        }

        try {
            await this.sendTo(row, conversation);
        } catch (error: unknown) {
            this.logger.warn(
                `marketing message ${row.id} failed: ${error instanceof Error ? error.message : String(error)}`
            );
            await this.finish(row, { status: S.FAILED });
            // Every other offer from this page would fail too, and keep
            // trying could deepen the block.
            if (
                classifySendError(error) === ENUM_SEND_FAILURE.ACCOUNT_BLOCKED
            ) {
                await this.marketingMessageRepository.skipQueuedOnAccount(
                    row.send.id,
                    conversation.account.id
                );
            }
            return;
        }
        await this.finish(row, { status: S.SENT, sentAt: new Date() });
    }

    /** The customer wrote: answers their offers of the last 72 hours. */
    markReplied(customerId: string, at: Date = new Date()): Promise<void> {
        return this.marketingMessageRepository.markReplied(customerId, at);
    }

    stats(sendId: string): Promise<IMarketingSendStats> {
        return this.marketingMessageRepository.stats(sendId);
    }

    findAll(
        workspaceId: string,
        find: Record<string, any>,
        options: IDatabaseFindAllOptions
    ): Promise<MarketingSendEntity[]> {
        return this.sendRepository.find(
            { ...find, workspace: workspaceId },
            { ...options, populate: [] }
        );
    }

    getTotal(workspaceId: string, find: Record<string, any>): Promise<number> {
        return this.sendRepository.getTotal({
            ...find,
            workspace: workspaceId,
        });
    }

    async findOneOrFail(
        id: string,
        workspaceId: string
    ): Promise<MarketingSendEntity> {
        const send = await this.sendRepository.findOne(
            { id, workspace: workspaceId },
            { populate: [] }
        );
        if (!send) {
            throw new NotFoundException({
                statusCode: 404,
                message: 'marketingSend.error.notFound',
            });
        }
        return send;
    }

    /**
     * Renames the send, changes its text or picture (offers still waiting
     * go out with the new ones), or turns an AUTO send off or on.
     */
    async update(
        id: string,
        workspaceId: string,
        dto: MarketingSendUpdateRequestDto
    ): Promise<MarketingSendEntity> {
        const send = await this.findOneOrFail(id, workspaceId);
        if (
            dto.active !== undefined &&
            send.mode !== ENUM_MARKETING_SEND_MODE.AUTO
        ) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'marketingSend.error.notAuto',
            });
        }
        if (dto.name !== undefined) send.name = dto.name;
        if (dto.text !== undefined) send.text = dto.text;
        if (dto.imageUrl !== undefined) send.imageUrl = dto.imageUrl;
        if (dto.active !== undefined) send.active = dto.active;
        return this.sendRepository.save(send);
    }

    async mapList(
        sends: MarketingSendEntity[]
    ): Promise<MarketingSendListResponseDto[]> {
        const stats = await this.marketingMessageRepository.statsBySend(
            sends.map(s => s.id)
        );
        return sends.map(send =>
            plainToInstance(
                MarketingSendListResponseDto,
                {
                    ...this.fields(send),
                    stats: stats.get(send.id) ?? MARKETING_SEND_EMPTY_STATS,
                },
                { excludeExtraneousValues: true }
            )
        );
    }

    /** A send with its results: totals, by channel, and who was not sent to. */
    async mapGet(
        send: MarketingSendEntity
    ): Promise<MarketingSendGetResponseDto> {
        const [stats, channels, skipped] = await Promise.all([
            this.marketingMessageRepository.stats(send.id),
            this.marketingMessageRepository.statsByChannel(send.id),
            this.marketingMessageRepository.skipReasons(send.id),
        ]);
        return plainToInstance(
            MarketingSendGetResponseDto,
            {
                ...this.fields(send),
                stats,
                channels,
                notSent: [
                    ...Object.entries(send.excluded).map(([reason, count]) => ({
                        reason,
                        count,
                    })),
                    ...skipped,
                ],
            },
            { excludeExtraneousValues: true }
        );
    }

    replies(
        sendId: string,
        limit: number,
        offset: number
    ): Promise<IMarketingSendReply[]> {
        return this.marketingMessageRepository.replies(sendId, limit, offset);
    }

    mapReplies(
        replies: IMarketingSendReply[]
    ): MarketingSendReplyResponseDto[] {
        return plainToInstance(MarketingSendReplyResponseDto, replies, {
            excludeExtraneousValues: true,
        });
    }

    private fields(send: MarketingSendEntity) {
        return {
            id: send.id,
            name: send.name,
            mode: send.mode,
            active: send.active,
            text: send.text,
            imageUrl: send.imageUrl ?? null,
            ...send.audience,
            createdAt: send.createdAt,
        };
    }

    /** Stages about something the customer bought name that product first. */
    private aboutPurchase(audience: IMarketingAudience): boolean {
        return (
            'preset' in audience &&
            MARKETING_SEND_BOUGHT_PRESETS.includes(audience.preset)
        );
    }

    /** Each customer's last message per channel, read in pages. */
    private async lastInbound(
        customerIds: string[],
        workspaceId: string
    ): Promise<Map<string, IMarketingLastInbound[]>> {
        const byCustomer = new Map<string, IMarketingLastInbound[]>();
        for (let i = 0; i < customerIds.length; i += MARKETING_SEND_PAGE_SIZE) {
            const rows =
                await this.conversationRepository.lastInboundByCustomerChannel(
                    customerIds.slice(i, i + MARKETING_SEND_PAGE_SIZE),
                    workspaceId
                );
            for (const row of rows) {
                byCustomer.set(row.customerId, [
                    ...(byCustomer.get(row.customerId) ?? []),
                    row,
                ]);
            }
        }
        return byCustomer;
    }

    private async reachedIds(
        workspaceId: string,
        audience: IMarketingAudience,
        now: Date,
        notReachedBy?: string
    ): Promise<string[]> {
        // Read every page before writing a row: a queued row counts as
        // today's offer, so later pages would shift under the offset.
        const ids: string[] = [];
        for (let offset = 0; ; offset += MARKETING_SEND_PAGE_SIZE) {
            const page = await this.audienceService.reached(
                workspaceId,
                audience,
                MARKETING_SEND_PAGE_SIZE,
                offset,
                now,
                notReachedBy
            );
            ids.push(...page.ids);
            if (page.ids.length < MARKETING_SEND_PAGE_SIZE) return ids;
        }
    }

    private async enqueue(messageId: string, sendAt: Date): Promise<void> {
        try {
            await this.cloudTasksClient.enqueue(
                MARKETING_SEND_QUEUE,
                ENUM_MARKETING_SEND_PROCESS.DELIVER,
                { messageId },
                {
                    taskName: `${MARKETING_SEND_TASK_PREFIX}${messageId}`,
                    scheduleTime: sendAt,
                }
            );
        } catch (error: unknown) {
            // No task will ever send it; FAILED frees the customer's day.
            this.logger.warn(
                `marketing message ${messageId} not queued: ${error instanceof Error ? error.message : String(error)}`
            );
            await this.marketingMessageRepository.finish(messageId, {
                status: S.FAILED,
            });
        }
    }

    /** Checked again at send time: the customer may have opted out or gone quiet. */
    private async skipReason(
        row: MarketingMessageEntity,
        now: Date
    ): Promise<ENUM_MARKETING_SKIP_REASON | null> {
        if (await this.marketingMessageRepository.isStopped(row.customer.id)) {
            return ENUM_MARKETING_SKIP_REASON.OPTED_OUT;
        }
        if (!row.conversation || !row.channel) {
            return ENUM_MARKETING_SKIP_REASON.NO_CHANNEL;
        }
        const inbound =
            await this.conversationRepository.lastInboundByCustomerChannel(
                [row.customer.id],
                row.workspace.id
            );
        const route = marketingRoute(
            row.customer.id,
            inbound.filter(r => r.channel === row.channel),
            channel => this.windowHours(channel),
            now
        );
        return 'skip' in route ? route.skip : null;
    }

    private async sendTo(
        row: MarketingMessageEntity,
        conversation: ConversationEntity
    ): Promise<void> {
        const { account, chatbot } = conversation;
        const adapter = this.registry.get(account.type);
        const language = chatbot.primaryLanguage ?? DEFAULT_LANGUAGE;
        const keyword = await this.settingsService.stopKeyword(
            row.workspace.id
        );
        const messages: {
            outbound: OutboundMessage;
            text?: string;
            imageUrl?: string;
        }[] = [];

        // The product the customer asked about, or bought for a bought
        // stage, names {product}; its photo goes when the send has none.
        const product =
            row.send.text.includes(MARKETING_TEXT_PRODUCT) || !row.send.imageUrl
                ? await this.marketingMessageRepository.productFor(
                      row.customer.id,
                      this.aboutPurchase(row.send.audience)
                  )
                : null;
        const offer = marketingText(
            row.send.text,
            { name: row.customer.name, product: product?.name },
            language
        );
        const imageUrl = row.send.imageUrl ?? product?.imageUrl;
        if (imageUrl) {
            messages.push({
                outbound: {
                    content: {
                        kind: 'media',
                        url: imageUrl,
                        mediaType: 'image',
                    },
                    fallbackText: imageUrl,
                },
                imageUrl,
            });
        }
        // Where the customer can tap "Không nhận nữa", the tap sends the
        // stop keyword; elsewhere the last line says which word to send.
        // Zalo shows buttons only on mobile, so its message keeps the line.
        const tap = adapter.capabilities.quickReplies;
        const hint = (
            MARKETING_STOP_HINT[language] ??
            MARKETING_STOP_HINT[DEFAULT_LANGUAGE]
        )(keyword);
        const text =
            tap && account.type !== ENUM_ACCOUNT_TYPE.ZALO_PAGE
                ? offer
                : `${offer}\n\n${hint}`;
        messages.push({
            outbound: {
                content: { kind: 'text', text },
                fallbackText: text,
                ...(tap && {
                    quickReplies: [
                        {
                            id: MARKETING_STOP_ACTION_ID,
                            label:
                                MARKETING_STOP_LABEL[language] ??
                                MARKETING_STOP_LABEL[DEFAULT_LANGUAGE],
                            value: keyword,
                        },
                    ],
                }),
            },
            text,
        });

        for (const message of messages) {
            const nonce = randomUUID();
            await this.messageRepository.insertPendingOutbound(
                conversation.id,
                nonce,
                {
                    authorType: ENUM_MESSAGE_AUTHOR.BOT,
                    authorId: chatbot.id,
                    text: message.text,
                    attachments: message.imageUrl
                        ? [{ type: 'image', url: message.imageUrl }]
                        : undefined,
                    dateSent: new Date(),
                }
            );
            try {
                const { externalId } = await adapter.sendMessage(
                    account,
                    conversation.senderId,
                    message.outbound
                );
                await this.messageRepository.markOutboundSent(
                    nonce,
                    externalId
                );
            } catch (error: unknown) {
                await this.messageRepository.markOutboundFailed(nonce);
                throw error;
            }
        }
    }

    private async finish(
        row: MarketingMessageEntity,
        update: Partial<
            Pick<MarketingMessageEntity, 'skipReason' | 'sentAt'>
        > & { status: S }
    ): Promise<void> {
        const ended = await this.marketingMessageRepository.finish(row.id, {
            sentAt: null,
            ...update,
        });
        this.logger.log(
            ended
                ? `marketing message=${row.id} status=${update.status} reason=${update.skipReason ?? '-'}`
                : `marketing message=${row.id} already ended elsewhere`
        );
    }

    // The shop's time is the app timezone, as HelperDateService reads it.
    private zone(): string | undefined {
        return this.configService.get<string>('app.timezone');
    }

    // The platform module sends; it is reached lazily, as the customer
    // module does for the same window.
    private get registry(): PlatformAdapterRegistry {
        return this.moduleRef.get(PlatformAdapterRegistry, { strict: false });
    }

    private windowHours(channel: ENUM_ACCOUNT_TYPE): number | null | undefined {
        return this.registry.has(channel)
            ? this.registry.get(channel).capabilities.freeMessageWindowHours
            : undefined;
    }
}
