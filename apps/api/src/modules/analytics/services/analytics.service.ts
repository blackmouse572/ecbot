import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import {
    ANALYTICS_CACHE_TTL_MS,
    ANALYTICS_HANDOFF_REASONS,
    ANALYTICS_UNHAPPY_LIMIT,
    ENUM_ANALYTICS_RANGE,
} from '../constants/analytics.constant';
import { AnalyticsBotResponseDto } from '../dtos/response/analytics.bot.response.dto';
import { AnalyticsConversionResponseDto } from '../dtos/response/analytics.conversion.response.dto';
import { AnalyticsCustomersResponseDto } from '../dtos/response/analytics.customers.response.dto';
import { AnalyticsMarketingResponseDto } from '../dtos/response/analytics.marketing.response.dto';
import {
    IAnalyticsHandoffReasonRow,
    IAnalyticsWindow,
} from '../interfaces/analytics.interface';
import { AnalyticsRepository } from '../repository/repositories/analytics.repository';
import { analyticsWindows } from '../utils/analytics-window.util';

const round1 = (value: number): number => Math.round(value * 10) / 10;
const percent = (part: number, whole: number): number =>
    whole > 0 ? round1((part / whole) * 100) : 0;
const sum = <T>(rows: T[], pick: (row: T) => number): number =>
    rows.reduce((total, row) => total + pick(row), 0);

/** One row per day of the period, zeros where the query returned none. */
function fillDays<T extends { day: string }>(
    days: string[],
    rows: T[],
    empty: Omit<T, 'day'>
): T[] {
    const byDay = new Map(rows.map(row => [row.day, row]));
    return days.map(day => byDay.get(day) ?? ({ day, ...empty } as T));
}

type AnalyticsWindows = {
    current: IAnalyticsWindow;
    previous: IAnalyticsWindow;
    days: string[];
};

/**
 * The workspace dashboard numbers, one section per tab. Each section is
 * cached for ten minutes per workspace, range and timezone.
 */
@Injectable()
export class AnalyticsService {
    constructor(
        private readonly analyticsRepository: AnalyticsRepository,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
    ) {}

    getConversion(
        workspaceId: string,
        range: ENUM_ANALYTICS_RANGE,
        timezone: string,
        now = new Date()
    ): Promise<AnalyticsConversionResponseDto> {
        return this.cached(
            'conversion',
            workspaceId,
            range,
            timezone,
            now,
            async ({ current, previous, days }) => {
                const [byChannel, before, daily, median] = await Promise.all([
                    this.analyticsRepository.conversionByChannel(current),
                    this.analyticsRepository.conversionByChannel(previous),
                    this.analyticsRepository.conversionDaily(current),
                    this.analyticsRepository.medianHoursToOrder(current),
                ]);
                const rate = (rows: typeof byChannel) =>
                    percent(
                        sum(rows, r => r.orders),
                        sum(rows, r => r.newCustomers)
                    );
                return {
                    generatedAt: now.toISOString(),
                    conversionRate: {
                        current: rate(byChannel),
                        previous: rate(before),
                    },
                    daily: fillDays(days, daily, {
                        newCustomers: 0,
                        orders: 0,
                    }),
                    byChannel,
                    medianHoursToOrder: round1(median ?? 0),
                };
            }
        );
    }

    getMarketing(
        workspaceId: string,
        range: ENUM_ANALYTICS_RANGE,
        timezone: string,
        now = new Date()
    ): Promise<AnalyticsMarketingResponseDto> {
        return this.cached(
            'marketing',
            workspaceId,
            range,
            timezone,
            now,
            async ({ current, previous, days }) => {
                const [daily, before, byChannel, unhappy] = await Promise.all([
                    this.analyticsRepository.sentimentDaily(current),
                    this.analyticsRepository.sentimentDaily(previous),
                    this.analyticsRepository.sentimentByChannel(current),
                    this.analyticsRepository.unhappyCustomers(
                        current,
                        ANALYTICS_UNHAPPY_LIMIT
                    ),
                ]);
                const rate = (rows: typeof daily) =>
                    percent(
                        sum(rows, r => r.positive),
                        sum(rows, r => r.positive + r.negative + r.complaint)
                    );
                return {
                    generatedAt: now.toISOString(),
                    positiveRate: {
                        current: rate(daily),
                        previous: rate(before),
                    },
                    daily: fillDays(days, daily, {
                        positive: 0,
                        negative: 0,
                        complaint: 0,
                    }),
                    // Shares of the channel's conversations, for the table.
                    byChannel: byChannel.map(row => ({
                        platform: row.platform,
                        conversations: row.conversations,
                        positive: Math.min(
                            100,
                            percent(row.positive, row.conversations)
                        ),
                        negative: Math.min(
                            100,
                            percent(row.negative, row.conversations)
                        ),
                    })),
                    unhappy: unhappy.map(row => ({
                        customerId: row.customerId,
                        conversationId: row.conversationId ?? undefined,
                        name: row.name ?? undefined,
                        platform: row.platform ?? undefined,
                        tagName: row.tagName,
                        emoji: row.emoji ?? undefined,
                        at: row.at.toISOString(),
                    })),
                };
            }
        );
    }

    getBot(
        workspaceId: string,
        range: ENUM_ANALYTICS_RANGE,
        timezone: string,
        now = new Date()
    ): Promise<AnalyticsBotResponseDto> {
        return this.cached(
            'bot',
            workspaceId,
            range,
            timezone,
            now,
            async ({ current, previous, days }) => {
                const [daily, before, byChatbot, reasons] = await Promise.all([
                    this.analyticsRepository.botDaily(current),
                    this.analyticsRepository.botDaily(previous),
                    this.analyticsRepository.botByChatbot(current),
                    this.analyticsRepository.handoffReasons(current),
                ]);
                const rate = (rows: typeof daily) =>
                    percent(
                        sum(rows, r => r.handedOver),
                        sum(rows, r => r.conversations)
                    );
                return {
                    generatedAt: now.toISOString(),
                    handoffRate: {
                        current: rate(daily),
                        previous: rate(before),
                    },
                    daily: fillDays(
                        days,
                        daily.map(({ day, botResolved, handedOver }) => ({
                            day,
                            botResolved,
                            handedOver,
                        })),
                        { botResolved: 0, handedOver: 0 }
                    ),
                    reasons: this.mapReasons(reasons),
                    byChatbot: byChatbot.map(row => ({
                        id: row.id,
                        name: row.name,
                        conversations: row.conversations,
                        botResolvedRate: percent(
                            row.botResolved,
                            row.conversations
                        ),
                        handoffRate: percent(row.handedOver, row.conversations),
                        firstReplySeconds: Math.round(
                            row.firstReplySeconds ?? 0
                        ),
                        toolErrorRate: percent(row.toolErrors, row.toolCalls),
                    })),
                };
            }
        );
    }

    getCustomers(
        workspaceId: string,
        range: ENUM_ANALYTICS_RANGE,
        timezone: string,
        now = new Date()
    ): Promise<AnalyticsCustomersResponseDto> {
        return this.cached(
            'customers',
            workspaceId,
            range,
            timezone,
            now,
            async ({ current, days }) => {
                const [tags, totals, byChannel, daily] = await Promise.all([
                    this.analyticsRepository.customerTags(workspaceId),
                    this.analyticsRepository.customerTotals(workspaceId),
                    this.analyticsRepository.customersByChannel(workspaceId),
                    this.analyticsRepository.customersDaily(current),
                ]);
                return {
                    generatedAt: now.toISOString(),
                    tags: tags.map(tag => ({
                        ...tag,
                        emoji: tag.emoji ?? undefined,
                    })),
                    total: totals.total,
                    untagged: totals.untagged,
                    daily: fillDays(days, daily, {
                        newCustomers: 0,
                        returning: 0,
                    }),
                    byChannel,
                };
            }
        );
    }

    /**
     * A tag rule shows the tag itself (while it still exists); a known cause
     * keeps its key for the app to label; anything else counts as "other".
     */
    private mapReasons(
        rows: IAnalyticsHandoffReasonRow[]
    ): AnalyticsBotResponseDto['reasons'] {
        const reasons = new Map<
            string,
            AnalyticsBotResponseDto['reasons'][number]
        >();
        for (const row of rows) {
            const key =
                row.tagId && row.tagName
                    ? row.tagId
                    : row.reason &&
                        ANALYTICS_HANDOFF_REASONS.includes(row.reason)
                      ? row.reason
                      : 'other';
            const existing = reasons.get(key);
            if (existing) {
                existing.count += row.count;
                continue;
            }
            reasons.set(key, {
                key,
                ...(key === row.tagId
                    ? {
                          tagName: row.tagName ?? undefined,
                          ...(row.emoji ? { emoji: row.emoji } : {}),
                      }
                    : {}),
                count: row.count,
            });
        }
        return [...reasons.values()].sort((a, b) => b.count - a.count);
    }

    private async cached<T>(
        section: string,
        workspaceId: string,
        range: ENUM_ANALYTICS_RANGE,
        timezone: string,
        now: Date,
        compute: (windows: AnalyticsWindows) => Promise<T>
    ): Promise<T> {
        const key = `analytics:${workspaceId}:${section}:${range}:${timezone}`;
        const hit = await this.cacheManager.get<T>(key);
        if (hit) return hit;

        const { current, previous, days } = analyticsWindows(
            range,
            timezone,
            now
        );
        const result = await compute({
            current: { workspaceId, timezone, ...current },
            previous: { workspaceId, timezone, ...previous },
            days,
        });
        await this.cacheManager.set(key, result, ANALYTICS_CACHE_TTL_MS);
        return result;
    }
}
