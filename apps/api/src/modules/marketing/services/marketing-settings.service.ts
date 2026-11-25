import { CUSTOMER_MARKETING_OPT_OUT_KEYWORDS } from '@app/modules/customer/constants/customer-marketing.constant';
import {
    isMarketingOptOutMessage,
    optOutWord,
} from '@app/modules/customer/utils/customer-marketing-opt-out.util';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
    MARKETING_MAX_PER_DAY,
    MARKETING_SETTINGS_DEFAULT,
    MARKETING_SETTINGS_MAX_STOP_KEYWORD_LENGTH,
} from '../constants/marketing-send.constant';
import { MarketingSettingsUpdateRequestDto } from '../dtos/request/marketing-settings.update.request.dto';
import { MarketingSettingsGetResponseDto } from '../dtos/response/marketing-settings.get.response.dto';
import {
    IMarketingSendRules,
    IMarketingStopReply,
} from '../interfaces/marketing-send.interface';
import { MarketingSettingsEntity } from '../repository/entities/marketing-settings.entity';
import { MarketingSettingsRepository } from '../repository/repositories/marketing-settings.repository';

/** Cài đặt gửi tin (#505): caps, the rest rule, send hours, opting out. */
@Injectable()
export class MarketingSettingsService {
    constructor(private readonly repository: MarketingSettingsRepository) {}

    async get(workspaceId: string): Promise<MarketingSettingsGetResponseDto> {
        return this.map(await this.find(workspaceId));
    }

    async update(
        workspaceId: string,
        dto: MarketingSettingsUpdateRequestDto
    ): Promise<MarketingSettingsGetResponseDto> {
        const saved = await this.find(workspaceId);
        const current = this.effective(saved);
        const sendFrom = dto.sendFrom ?? current.sendFrom;
        const sendTo = dto.sendTo ?? current.sendTo;
        // "HH:mm" sorts as text the way it sorts as time.
        if (sendFrom >= sendTo) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'marketingSettings.error.sendHours',
            });
        }
        const changes: Partial<MarketingSettingsEntity> = {
            maxPer30Days: dto.maxPer30Days,
            restAfter: dto.restAfter,
            restDays: dto.restDays,
            sendFrom: dto.sendFrom,
            sendTo: dto.sendTo,
            stopKeywords:
                dto.stopKeywords === undefined
                    ? undefined
                    : this.keywords(dto.stopKeywords),
            stopReply:
                dto.stopReply === undefined
                    ? undefined
                    : dto.stopReply?.trim() || null,
            stopReplyEnabled: dto.stopReplyEnabled,
        };
        const defined = Object.fromEntries(
            Object.entries(changes).filter(([, value]) => value !== undefined)
        ) as Partial<MarketingSettingsEntity>;

        if (saved) {
            return this.map(
                await this.repository.save(Object.assign(saved, defined))
            );
        }
        try {
            return this.map(
                await this.repository.create({
                    workspace: this.repository
                        .getEntityManager()
                        .getReference(WorkspaceEntity, workspaceId),
                    ...defined,
                })
            );
        } catch (error: unknown) {
            // Two first saves at once: the unique index keeps one row, and
            // this change goes onto it.
            if (!(error instanceof UniqueConstraintViolationException)) {
                throw error;
            }
            const row = await this.find(workspaceId);
            return this.map(
                await this.repository.save(Object.assign(row, defined))
            );
        }
    }

    /** The send rules the audience exclusions and the planner apply. */
    async rules(workspaceId: string): Promise<IMarketingSendRules> {
        return this.effective(await this.find(workspaceId));
    }

    /**
     * Whether a whole message opts the customer out under the workspace's
     * keywords. Only a message short enough to be a keyword costs a lookup.
     */
    async isStopMessage(
        workspaceId: string,
        text: string | null | undefined
    ): Promise<boolean> {
        const word = optOutWord(text);
        if (!word || word.length > MARKETING_SETTINGS_MAX_STOP_KEYWORD_LENGTH) {
            return false;
        }
        const saved = await this.find(workspaceId);
        return isMarketingOptOutMessage(
            word,
            saved?.stopKeywords ?? CUSTOMER_MARKETING_OPT_OUT_KEYWORDS
        );
    }

    /** The keyword an offer tells the customer to send to opt out. */
    async stopKeyword(workspaceId: string): Promise<string> {
        const saved = await this.find(workspaceId);
        return (saved?.stopKeywords ?? CUSTOMER_MARKETING_OPT_OUT_KEYWORDS)[0];
    }

    /**
     * The opt-out confirmation: whether the shop sends one, and its own text
     * (null for the built-in one).
     */
    async stopReply(workspaceId: string): Promise<IMarketingStopReply> {
        const saved = await this.find(workspaceId);
        return {
            enabled: saved?.stopReplyEnabled ?? true,
            text: saved?.stopReply ?? null,
        };
    }

    private find(workspaceId: string): Promise<MarketingSettingsEntity | null> {
        return this.repository.findOne(
            { workspace: workspaceId },
            { populate: [] }
        );
    }

    /** Stored as compared, without repeats; null goes back to the built-in words. */
    private keywords(keywords: string[] | null): string[] | null {
        if (!keywords) return null;
        const words = [...new Set(keywords.map(optOutWord).filter(Boolean))];
        if (!words.length) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'marketingSettings.error.stopKeywords',
            });
        }
        return words;
    }

    private effective(
        saved: MarketingSettingsEntity | null
    ): IMarketingSendRules {
        const d = MARKETING_SETTINGS_DEFAULT;
        return {
            maxPer30Days: saved?.maxPer30Days ?? d.maxPer30Days,
            restAfter: saved?.restAfter ?? d.restAfter,
            restDays: saved?.restDays ?? d.restDays,
            sendFrom: saved?.sendFrom ?? d.sendFrom,
            sendTo: saved?.sendTo ?? d.sendTo,
        };
    }

    private map(
        saved: MarketingSettingsEntity | null
    ): MarketingSettingsGetResponseDto {
        return plainToInstance(
            MarketingSettingsGetResponseDto,
            {
                ...this.effective(saved),
                maxPerDay: MARKETING_MAX_PER_DAY,
                stopKeywords: saved?.stopKeywords ?? [
                    ...CUSTOMER_MARKETING_OPT_OUT_KEYWORDS,
                ],
                stopReply: saved?.stopReply ?? null,
                stopReplyEnabled: saved?.stopReplyEnabled ?? true,
            },
            { excludeExtraneousValues: true }
        );
    }
}
