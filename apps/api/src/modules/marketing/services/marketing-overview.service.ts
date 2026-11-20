import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { CUSTOMER_JOURNEY_STAGE_ORDER } from '@app/modules/customer/constants/customer-marketing.constant';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
    MarketingOverviewFunnelDto,
    MarketingOverviewResponseDto,
} from '../dtos/response/marketing-overview.response.dto';
import { ENUM_MARKETING_TODO } from '../enums/marketing-overview.enum';
import { IMarketingOverviewFunnelRow } from '../interfaces/marketing-overview.interface';
import { MarketingOverviewRepository } from '../repository/repositories/marketing-overview.repository';

const DAY_MS = 86_400_000;

@Injectable()
export class MarketingOverviewService {
    constructor(private readonly repository: MarketingOverviewRepository) {}

    async get(
        workspaceId: string,
        days: number,
        now: Date = new Date()
    ): Promise<MarketingOverviewResponseDto> {
        const w = { workspaceId, now, days };
        const [stageRows, moves, funnelRows, counts, optOuts] =
            await Promise.all([
                this.repository.stageCounts(w),
                this.repository.moves(w),
                this.repository.funnel(w),
                this.repository.now(w),
                this.repository.optOuts(w),
            ]);
        const stages = CUSTOMER_JOURNEY_STAGE_ORDER.map(stage => {
            const row = stageRows.find(r => r.stage === stage);
            return {
                stage,
                current: row?.current ?? 0,
                previous: row?.previous ?? 0,
            };
        });
        return plainToInstance(
            MarketingOverviewResponseDto,
            {
                total: counts.total,
                days,
                since: new Date(now.getTime() - days * DAY_MS),
                stages,
                dormant: counts.dormant,
                funnel: this.funnel(funnelRows),
                moves,
                todos: Object.values(ENUM_MARKETING_TODO).map(key => ({
                    key,
                    ...counts.todos[key],
                })),
                todoTotal: counts.todoTotal,
                health: {
                    optOuts: optOuts.current,
                    optOutsPrevious: optOuts.previous,
                    paused: counts.paused,
                },
            },
            { excludeExtraneousValues: true }
        );
    }

    /** Per channel, each stage counts the customers at it or further along. */
    private funnel(
        rows: IMarketingOverviewFunnelRow[]
    ): MarketingOverviewFunnelDto[] {
        const platforms = [...new Set(rows.map(row => row.platform))];
        return platforms
            .map((platform: ENUM_ACCOUNT_TYPE) => {
                const at = CUSTOMER_JOURNEY_STAGE_ORDER.map(
                    stage =>
                        rows.find(
                            r => r.platform === platform && r.stage === stage
                        )?.count ?? 0
                );
                const reached = at.map((_, i) =>
                    at.slice(i).reduce((sum, n) => sum + n, 0)
                );
                return {
                    platform,
                    stages: CUSTOMER_JOURNEY_STAGE_ORDER.map((stage, i) => ({
                        stage,
                        count: reached[i],
                    })),
                };
            })
            .sort((a, b) => b.stages[0].count - a.stages[0].count);
    }
}
