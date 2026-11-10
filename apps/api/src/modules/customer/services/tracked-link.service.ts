import { IDatabaseFindAllOptions } from '@app/common/database/interfaces/database.interface';
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { AccountRepository } from '@app/modules/account/repository/repositories/account.repository';
import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { TRACKED_LINK_ACCOUNT_TYPES } from '../constants/tracked-link.constant';
import { TrackedLinkCreateChildRequestDto } from '../dtos/request/tracked-link.create-child.request.dto';
import { TrackedLinkCreateRequestDto } from '../dtos/request/tracked-link.create.request.dto';
import { TrackedLinkUpdateRequestDto } from '../dtos/request/tracked-link.update.request.dto';
import { TrackedLinkDetailResponseDto } from '../dtos/response/tracked-link.detail.response.dto';
import { TrackedLinkGetResponseDto } from '../dtos/response/tracked-link.get.response.dto';
import { ENUM_TRACKED_LINK_KIND } from '../enums/tracked-link.enum';
import { TrackedLinkEntity } from '../repository/entities/tracked-link.entity';
import { CustomerTagRepository } from '../repository/repositories/customer-tag.repository';
import { TrackedLinkRepository } from '../repository/repositories/tracked-link.repository';
import { trackedLinkCodeFromName } from '../utils/tracked-link-code.util';
import { trackedLinkUrl } from '../utils/tracked-link-url.util';

@Injectable()
export class TrackedLinkService {
    constructor(
        private readonly trackedLinkRepository: TrackedLinkRepository,
        private readonly accountRepository: AccountRepository,
        private readonly customerTagRepository: CustomerTagRepository
    ) {}

    async findAll(
        find: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<TrackedLinkEntity[]> {
        return this.trackedLinkRepository.find(find, {
            ...options,
            populate: ['account'],
        });
    }

    async getTotal(find: Record<string, any>): Promise<number> {
        return this.trackedLinkRepository.getTotal(find);
    }

    async findOneInWorkspace(
        workspaceId: string,
        id: string
    ): Promise<TrackedLinkEntity> {
        const link = await this.trackedLinkRepository.findInWorkspace(
            id,
            workspaceId
        );
        if (!link) {
            throw new NotFoundException({
                message: 'trackedLink.error.notFound',
            });
        }
        return link;
    }

    async findChildren(parentId: string): Promise<TrackedLinkEntity[]> {
        return this.trackedLinkRepository.findChildren(parentId);
    }

    async create(
        workspaceId: string,
        dto: TrackedLinkCreateRequestDto
    ): Promise<TrackedLinkEntity> {
        const account = await this.accountRepository.findOne({
            id: dto.accountId,
            workspace: workspaceId,
            deletedAt: null,
        });
        if (!account) {
            throw new NotFoundException({
                message: 'trackedLink.error.accountNotFound',
            });
        }
        if (!TRACKED_LINK_ACCOUNT_TYPES.includes(account.type)) {
            throw new BadRequestException({
                message: 'trackedLink.error.channelNotSupported',
            });
        }
        this.assertTargetUrl(account, dto.targetUrl);
        await this.assertTags(workspaceId, dto.tagIds);

        const code = await this.freeCode(
            workspaceId,
            trackedLinkCodeFromName(dto.name)
        );
        // SAFETY: MikroORM's create takes ids for relations; the account was
        // just loaded from this workspace.
        return this.trackedLinkRepository.create({
            workspace: workspaceId,
            account: account.id,
            kind: ENUM_TRACKED_LINK_KIND.LINK,
            name: dto.name,
            code,
            greeting: dto.greeting ?? null,
            tagIds: dto.tagIds ?? [],
            promisesOffer: dto.promisesOffer ?? false,
            targetUrl: dto.targetUrl ?? null,
        } as any);
    }

    async createChild(
        workspaceId: string,
        parentId: string,
        dto: TrackedLinkCreateChildRequestDto
    ): Promise<TrackedLinkEntity> {
        const parent = await this.findOneInWorkspace(workspaceId, parentId);
        if (parent.parent || parent.kind !== ENUM_TRACKED_LINK_KIND.LINK) {
            throw new BadRequestException({
                message: 'trackedLink.error.notASource',
            });
        }
        const code = await this.freeCode(
            workspaceId,
            `${parent.code}-${trackedLinkCodeFromName(dto.name)}`
        );
        // SAFETY: ids for relations, as above; the parent is in this workspace.
        return this.trackedLinkRepository.create({
            workspace: workspaceId,
            parent: parent.id,
            account: parent.account.id,
            kind: dto.kind,
            name: dto.name,
            code,
        } as any);
    }

    async update(
        workspaceId: string,
        id: string,
        dto: TrackedLinkUpdateRequestDto
    ): Promise<TrackedLinkEntity> {
        const link = await this.findOneInWorkspace(workspaceId, id);
        if (dto.targetUrl !== undefined) {
            this.assertTargetUrl(link.account, dto.targetUrl);
        }
        await this.assertTags(workspaceId, dto.tagIds);

        Object.assign(
            link,
            Object.fromEntries(
                Object.entries(dto).filter(([, value]) => value !== undefined)
            )
        );
        return this.trackedLinkRepository.save(link);
    }

    async delete(workspaceId: string, id: string): Promise<void> {
        await this.findOneInWorkspace(workspaceId, id);
        await this.trackedLinkRepository.updateRaw(
            { $or: [{ id }, { parent: id }] },
            { deleted: true, deletedAt: new Date() }
        );
    }

    mapGet(link: TrackedLinkEntity): TrackedLinkGetResponseDto {
        return plainToInstance(TrackedLinkGetResponseDto, this.toPlain(link), {
            excludeExtraneousValues: true,
        });
    }

    mapList(links: TrackedLinkEntity[]): TrackedLinkGetResponseDto[] {
        return links.map(link => this.mapGet(link));
    }

    mapDetail(
        link: TrackedLinkEntity,
        children: TrackedLinkEntity[]
    ): TrackedLinkDetailResponseDto {
        return plainToInstance(
            TrackedLinkDetailResponseDto,
            {
                ...this.toPlain(link),
                children: children.map(child => this.toPlain(child)),
            },
            { excludeExtraneousValues: true }
        );
    }

    private toPlain(link: TrackedLinkEntity): Record<string, unknown> {
        const { account } = link;
        return {
            ...link,
            url: trackedLinkUrl(account, link.code, link.targetUrl),
            account: { id: account.id, name: account.name, type: account.type },
        };
    }

    private assertTargetUrl(
        account: AccountEntity,
        targetUrl?: string | null
    ): void {
        if (account.type === ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET && !targetUrl) {
            throw new BadRequestException({
                message: 'trackedLink.error.targetUrlRequired',
            });
        }
    }

    private async assertTags(
        workspaceId: string,
        tagIds?: string[]
    ): Promise<void> {
        if (!tagIds?.length) return;
        const tags = await this.customerTagRepository.findByWorkspace(
            workspaceId,
            { id: { $in: tagIds } }
        );
        if (tags.length !== new Set(tagIds).size) {
            throw new BadRequestException({
                message: 'trackedLink.error.tagNotFound',
            });
        }
    }

    /** `base`, or `base-2`, `base-3`... when an earlier link holds it. */
    private async freeCode(workspaceId: string, base: string): Promise<string> {
        const taken = new Set(
            await this.trackedLinkRepository.findCodesStartingWith(
                workspaceId,
                base
            )
        );
        if (!taken.has(base)) return base;
        let n = 2;
        while (taken.has(`${base}-${n}`)) n++;
        return `${base}-${n}`;
    }
}
