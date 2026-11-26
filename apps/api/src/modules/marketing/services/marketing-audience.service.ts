import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ENUM_CUSTOMER_JOURNEY_STAGE } from '@app/modules/customer/enums/customer-marketing.enum';
import { HelperDateService } from '@app/common/helper/services/helper.date.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { isUUID } from 'class-validator';
import {
    MARKETING_AUDIENCE_LIST_OPERATORS,
    MARKETING_AUDIENCE_MAX_DAYS,
    MARKETING_AUDIENCE_NUMBER_OPERATORS,
    MARKETING_AUDIENCE_OPERATORS,
} from '../constants/marketing-audience.constant';
import { MarketingAudienceConditionRequestDto } from '../dtos/request/marketing-audience-condition.request.dto';
import { MarketingAudiencePreviewRequestDto } from '../dtos/request/marketing-audience-preview.request.dto';
import { MarketingAudienceRequestDto } from '../dtos/request/marketing-audience.request.dto';
import { MarketingAudiencePreviewResponseDto } from '../dtos/response/marketing-audience-preview.response.dto';
import {
    ENUM_MARKETING_AUDIENCE_EXCLUSION,
    ENUM_MARKETING_AUDIENCE_FIELD as F,
    ENUM_MARKETING_AUDIENCE_MATCH,
} from '../enums/marketing-audience.enum';
import {
    IMarketingAudience,
    IMarketingAudienceCustomerFilter,
    IMarketingAudienceWindow,
} from '../interfaces/marketing-audience.interface';
import { MarketingAudienceRepository } from '../repository/repositories/marketing-audience.repository';
import { MarketingSettingsService } from './marketing-settings.service';

const STAGES = Object.values(ENUM_CUSTOMER_JOURNEY_STAGE) as string[];
const CHANNELS = Object.values(ENUM_ACCOUNT_TYPE) as string[];

/** What a value in `values` must be, per field. */
const VALID_VALUE: Partial<Record<F, (value: string) => boolean>> = {
    [F.STAGE]: value => STAGES.includes(value),
    [F.CHANNEL]: value => CHANNELS.includes(value),
    [F.PRODUCT_GROUP_ASKED]: value => isUUID(value),
    [F.PRODUCT_GROUP_BOUGHT]: value => isUUID(value),
    [F.LABEL]: value => isUUID(value),
};

const invalid = (): BadRequestException =>
    new BadRequestException({
        statusCode: 400,
        message: 'marketingAudience.error.invalidCondition',
    });

/** Audiences (#504): who a preset or a set of conditions reaches. */
@Injectable()
export class MarketingAudienceService {
    constructor(
        private readonly repository: MarketingAudienceRepository,
        private readonly settingsService: MarketingSettingsService,
        private readonly helperDateService: HelperDateService
    ) {}

    async preview(
        workspaceId: string,
        dto: MarketingAudiencePreviewRequestDto,
        now: Date = new Date()
    ): Promise<MarketingAudiencePreviewResponseDto> {
        const audience = this.toAudience(dto);
        const { reasons, channels } = await this.repository.preview(
            await this.window(workspaceId, now),
            audience
        );
        const countOf = (reason: ENUM_MARKETING_AUDIENCE_EXCLUSION | null) =>
            reasons.find(r => r.reason === reason)?.count ?? 0;
        const excluded = Object.values(ENUM_MARKETING_AUDIENCE_EXCLUSION).map(
            reason => ({ reason, count: countOf(reason) })
        );
        return plainToInstance(
            MarketingAudiencePreviewResponseDto,
            {
                count: countOf(null),
                excluded: {
                    total: excluded.reduce((sum, r) => sum + r.count, 0),
                    reasons: excluded,
                },
                channels,
            },
            { excludeExtraneousValues: true }
        );
    }

    /**
     * One page of reached customer ids, latest message first, and the total.
     * `notReachedBy` leaves out who that send already queued or sent to.
     */
    async reached(
        workspaceId: string,
        dto: MarketingAudiencePreviewRequestDto,
        limit: number,
        offset: number,
        {
            now = new Date(),
            notReachedBy,
            filter = {},
        }: {
            now?: Date;
            notReachedBy?: string;
            filter?: IMarketingAudienceCustomerFilter;
        } = {}
    ): Promise<{ ids: string[]; total: number }> {
        const audience = this.toAudience(dto);
        return this.repository.reached(
            await this.window(workspaceId, now),
            audience,
            limit,
            offset,
            notReachedBy,
            filter
        );
    }

    /** The send rules count days in the shop's time, the app timezone. */
    private async window(
        workspaceId: string,
        now: Date
    ): Promise<IMarketingAudienceWindow> {
        return {
            workspaceId,
            now,
            today: this.helperDateService.formatToIsoDate(now),
            rules: await this.settingsService.rules(workspaceId),
        };
    }

    /**
     * A preset, or conditions that each fit their field (anything else is a
     * 400), less the customers the shop unticked.
     */
    toAudience(dto: MarketingAudiencePreviewRequestDto): IMarketingAudience {
        const audience = this.pick(dto);
        if (dto.excludedCustomerIds?.length) {
            audience.excludedCustomerIds = dto.excludedCustomerIds;
        }

        return audience;
    }

    private pick(dto: MarketingAudienceRequestDto): IMarketingAudience {
        const hasConditions = dto.conditions !== undefined;
        if (dto.preset && hasConditions) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'marketingAudience.error.presetOrConditions',
            });
        }
        if (dto.preset) return { preset: dto.preset };
        if (!dto.conditions?.length) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'marketingAudience.error.presetOrConditions',
            });
        }
        dto.conditions.forEach(c => this.check(c));
        return {
            match: dto.match ?? ENUM_MARKETING_AUDIENCE_MATCH.ALL,
            conditions: dto.conditions,
        };
    }

    private check(c: MarketingAudienceConditionRequestDto): void {
        if (!MARKETING_AUDIENCE_OPERATORS[c.field]?.includes(c.operator)) {
            throw invalid();
        }
        if (MARKETING_AUDIENCE_LIST_OPERATORS.includes(c.operator)) {
            const valid = VALID_VALUE[c.field] ?? (() => false);
            if (!c.values?.length || !c.values.every(valid)) throw invalid();
        }
        if (MARKETING_AUDIENCE_NUMBER_OPERATORS.includes(c.operator)) {
            if (c.number === undefined) throw invalid();
            if (
                c.field === F.LAST_MESSAGE &&
                (c.number < 1 || c.number > MARKETING_AUDIENCE_MAX_DAYS)
            ) {
                throw invalid();
            }
        }
    }
}
