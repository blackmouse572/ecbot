import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseUpdateOptions,
} from '@app/common/database/interfaces/database.interface';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { CustomerTagGetResponseDto } from '../dtos/response/customer-tag.get.response.dto';
import { CustomerTagEntity } from '../repository/entities/customer-tag.entity';
import { CustomerTagAssignmentRepository } from '../repository/repositories/customer-tag-assignment.repository';
import { CustomerTagRepository } from '../repository/repositories/customer-tag.repository';

export interface ICustomerTagCreate {
    workspace: string;
    name: string;
    emoji?: string | null;
    description?: string | null;
    triggersHandoff?: boolean;
}

export interface ICustomerTagUpdate {
    name?: string;
    emoji?: string | null;
    description?: string | null;
    triggersHandoff?: boolean;
}

@Injectable()
export class CustomerTagService {
    private readonly logger = new Logger(CustomerTagService.name);

    constructor(
        private readonly em: EntityManager,
        private readonly customerTagRepository: CustomerTagRepository,
        private readonly customerTagAssignmentRepository: CustomerTagAssignmentRepository
    ) {}

    async findAllByWorkspace(
        workspaceId: string,
        options?: IDatabaseFindAllOptions
    ): Promise<CustomerTagEntity[]> {
        return this.customerTagRepository.findByWorkspace(
            workspaceId,
            undefined,
            options
        );
    }

    async findOne(
        id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<CustomerTagEntity | null> {
        return this.customerTagRepository.findOneById(id, options);
    }

    /**
     * BOLA-safe variant: returns null when the tag does not exist OR belongs
     * to a different workspace, so the caller can collapse missing +
     * cross-workspace into a single 404.
     */
    async findOneInWorkspace(
        id: string,
        workspaceId: string,
        options?: IDatabaseFindOneOptions
    ): Promise<CustomerTagEntity | null> {
        return this.customerTagRepository.findOne(
            { id, workspace: workspaceId } as any,
            options
        );
    }

    async findOneByWorkspaceAndName(
        workspaceId: string,
        name: string
    ): Promise<CustomerTagEntity | null> {
        return this.em.findOne(CustomerTagEntity, {
            workspace: workspaceId,
            name,
            deletedAt: null,
        } as any);
    }

    async create(
        payload: ICustomerTagCreate,
        options?: IDatabaseCreateOptions
    ): Promise<CustomerTagEntity> {
        const em = options?.em ?? this.em;

        const existing = await em.findOne(CustomerTagEntity, {
            workspace: payload.workspace,
            name: payload.name,
            deletedAt: null,
        } as any);

        if (existing) {
            throw new ConflictException({
                message: 'customerTag.error.duplicate',
                statusCode: 409,
            });
        }

        const tag = new CustomerTagEntity();
        tag.workspace = em.getReference(WorkspaceEntity, payload.workspace);
        tag.name = payload.name;
        tag.emoji = payload.emoji ?? undefined;
        tag.description = payload.description ?? undefined;
        tag.triggersHandoff = payload.triggersHandoff ?? false;

        await em.persistAndFlush(tag);
        return tag;
    }

    async update(
        id: string,
        patch: ICustomerTagUpdate,
        workspaceId?: string,
        options?: IDatabaseUpdateOptions
    ): Promise<CustomerTagEntity> {
        // BOLA guard — when called from a workspace-scoped controller, refuse
        // to patch a tag that lives elsewhere. Collapse to 404 so existence
        // does not leak.
        const tag = workspaceId
            ? await this.findOneInWorkspace(id, workspaceId)
            : await this.customerTagRepository.findOneById(id);
        if (!tag) {
            throw new NotFoundException({
                message: 'customerTag.error.notFound',
                statusCode: 404,
            });
        }

        const data: Partial<CustomerTagEntity> = {};
        if (patch.name !== undefined) data.name = patch.name;
        if (patch.emoji !== undefined) data.emoji = patch.emoji ?? undefined;
        if (patch.description !== undefined)
            data.description = patch.description ?? undefined;
        if (patch.triggersHandoff !== undefined)
            data.triggersHandoff = patch.triggersHandoff;

        const updated = await this.customerTagRepository.updateEntity(
            { id },
            data as any,
            options
        );

        if (!updated) {
            throw new NotFoundException({
                message: 'customerTag.error.notFound',
                statusCode: 404,
            });
        }

        return updated;
    }

    async delete(id: string, workspaceId?: string): Promise<void> {
        const tag = workspaceId
            ? await this.findOneInWorkspace(id, workspaceId)
            : await this.customerTagRepository.findOneById(id);
        if (!tag) {
            throw new NotFoundException({
                message: 'customerTag.error.notFound',
                statusCode: 404,
            });
        }

        // Soft-delete all assignments for this tag in a single bulk update,
        // then the tag itself. softDelete operates on one entity, so we use
        // updateMany to mirror the soft-delete fields across all matches.
        await this.customerTagAssignmentRepository.updateMany(
            { tag: id, deletedAt: null } as any,
            { deleted: true, deletedAt: new Date() } as any
        );

        await this.customerTagRepository.softDelete({ id } as any);
    }

    mapGet(tag: CustomerTagEntity): CustomerTagGetResponseDto {
        return plainToInstance(CustomerTagGetResponseDto, tag, {
            excludeExtraneousValues: true,
        });
    }

    mapList(tags: CustomerTagEntity[]): CustomerTagGetResponseDto[] {
        return tags.map(t => this.mapGet(t));
    }
}
