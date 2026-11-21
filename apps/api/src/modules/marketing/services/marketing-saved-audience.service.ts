import { IDatabaseFindAllOptions } from '@app/common/database/interfaces/database.interface';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { MarketingSavedAudienceCreateRequestDto } from '../dtos/request/marketing-saved-audience.create.request.dto';
import { MarketingSavedAudienceUpdateRequestDto } from '../dtos/request/marketing-saved-audience.update.request.dto';
import { MarketingSavedAudienceGetResponseDto } from '../dtos/response/marketing-saved-audience.get.response.dto';
import { IMarketingAudience } from '../interfaces/marketing-audience.interface';
import { MarketingSavedAudienceEntity } from '../repository/entities/marketing-saved-audience.entity';
import { MarketingSavedAudienceRepository } from '../repository/repositories/marketing-saved-audience.repository';
import { MarketingAudienceService } from './marketing-audience.service';

/** Audiences a shop saves to reuse (#504). */
@Injectable()
export class MarketingSavedAudienceService {
    constructor(
        private readonly repository: MarketingSavedAudienceRepository,
        private readonly audienceService: MarketingAudienceService
    ) {}

    findAll(
        workspaceId: string,
        find: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<MarketingSavedAudienceEntity[]> {
        return this.repository.find(
            { ...find, workspace: workspaceId },
            { ...options, populate: [] }
        );
    }

    getTotal(workspaceId: string, find: Record<string, any>): Promise<number> {
        return this.repository.getTotal({ ...find, workspace: workspaceId });
    }

    async findOneOrFail(
        id: string,
        workspaceId: string
    ): Promise<MarketingSavedAudienceEntity> {
        const audience = await this.repository.findOne(
            { id, workspace: workspaceId },
            { populate: [] }
        );
        if (!audience) {
            throw new NotFoundException({
                statusCode: 404,
                message: 'marketingAudience.error.notFound',
            });
        }
        return audience;
    }

    async create(
        workspaceId: string,
        dto: MarketingSavedAudienceCreateRequestDto
    ): Promise<MarketingSavedAudienceEntity> {
        const definition = this.audienceService.toAudience(dto);
        await this.assertNameFree(workspaceId, dto.name);
        return this.onDuplicate(
            this.repository.create({
                workspace: workspaceId as any,
                name: dto.name,
                ...this.columns(definition),
            })
        );
    }

    async update(
        id: string,
        workspaceId: string,
        dto: MarketingSavedAudienceUpdateRequestDto
    ): Promise<MarketingSavedAudienceEntity> {
        const audience = await this.findOneOrFail(id, workspaceId);
        if (dto.preset !== undefined || dto.conditions !== undefined) {
            Object.assign(
                audience,
                this.columns(this.audienceService.toAudience(dto))
            );
        } else if (dto.match !== undefined) {
            // A preset has no conditions to match.
            if (!audience.conditions) {
                throw new BadRequestException({
                    statusCode: 400,
                    message: 'marketingAudience.error.presetOrConditions',
                });
            }
            audience.match = dto.match;
        }
        // `null` passes the optional check; the name cannot be cleared.
        if (typeof dto.name === 'string' && dto.name !== audience.name) {
            await this.assertNameFree(workspaceId, dto.name, id);
            audience.name = dto.name;
        }
        return this.onDuplicate(this.repository.save(audience));
    }

    // Hard delete, like product groups: the name is free again at once.
    async delete(
        id: string,
        workspaceId: string
    ): Promise<MarketingSavedAudienceEntity> {
        const audience = await this.findOneOrFail(id, workspaceId);
        await this.repository.delete({ id: audience.id });
        return audience;
    }

    mapGet(
        audience: MarketingSavedAudienceEntity
    ): MarketingSavedAudienceGetResponseDto {
        return plainToInstance(MarketingSavedAudienceGetResponseDto, audience, {
            excludeExtraneousValues: true,
        });
    }

    mapList(
        audiences: MarketingSavedAudienceEntity[]
    ): MarketingSavedAudienceGetResponseDto[] {
        return audiences.map(audience => this.mapGet(audience));
    }

    /** One of preset or match + conditions is set; the other is cleared. */
    private columns(
        definition: IMarketingAudience
    ): Pick<MarketingSavedAudienceEntity, 'preset' | 'match' | 'conditions'> {
        if ('preset' in definition) {
            return {
                preset: definition.preset,
                match: null,
                conditions: null,
            };
        }
        return {
            preset: null,
            match: definition.match,
            // Plain objects, so the stored JSON holds only the four fields.
            conditions: definition.conditions.map(
                ({ field, operator, values, number }) => ({
                    field,
                    operator,
                    values,
                    number,
                })
            ),
        };
    }

    /**
     * Two saves of one name can both pass assertNameFree; the unique index
     * stops the second, which gets the same 409.
     */
    private async onDuplicate<T>(write: Promise<T>): Promise<T> {
        try {
            return await write;
        } catch (error: unknown) {
            if (error instanceof UniqueConstraintViolationException) {
                throw new ConflictException({
                    statusCode: 409,
                    message: 'marketingAudience.error.duplicate',
                });
            }
            throw error;
        }
    }

    private async assertNameFree(
        workspaceId: string,
        name: string,
        excludeId?: string
    ): Promise<void> {
        const taken = await this.repository.exists(
            { workspace: workspaceId, name },
            { excludeId }
        );
        if (taken) {
            throw new ConflictException({
                statusCode: 409,
                message: 'marketingAudience.error.duplicate',
            });
        }
    }
}
