import { IDatabaseFindAllOptions } from '@app/common/database/interfaces/database.interface';
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { AccountRepository } from '@app/modules/account/repository/repositories/account.repository';
import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { plainToInstance } from 'class-transformer';
import {
    TRACKED_LINK_ACCOUNT_TYPES,
    TRACKED_LINK_CHILD_CODE_MAX_LENGTH,
} from '../constants/tracked-link.constant';
import { TrackedLinkCreateChildRequestDto } from '../dtos/request/tracked-link.create-child.request.dto';
import { TrackedLinkCreateRequestDto } from '../dtos/request/tracked-link.create.request.dto';
import { TrackedLinkUpdateRequestDto } from '../dtos/request/tracked-link.update.request.dto';
import { TrackedLinkDetailResponseDto } from '../dtos/response/tracked-link.detail.response.dto';
import { TrackedLinkGetResponseDto } from '../dtos/response/tracked-link.get.response.dto';
import { ENUM_TRACKED_LINK_KIND } from '../enums/tracked-link.enum';
import { TrackedLinkEntity } from '../repository/entities/tracked-link.entity';
import { ITrackedLinkStats } from '../interfaces/tracked-link.interface';
import { CustomerMarketingStateRepository } from '../repository/repositories/customer-marketing-state.repository';
import { CustomerTagRepository } from '../repository/repositories/customer-tag.repository';
import { TrackedLinkRepository } from '../repository/repositories/tracked-link.repository';
import { trackedLinkCodeFromName } from '../utils/tracked-link-code.util';
import { trackedLinkUrl } from '../utils/tracked-link-url.util';

@Injectable()
export class TrackedLinkService {
    constructor(
        private readonly trackedLinkRepository: TrackedLinkRepository,
        private readonly accountRepository: AccountRepository,
        private readonly customerTagRepository: CustomerTagRepository,
        private readonly marketingStateRepository: CustomerMarketingStateRepository
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

        return this.insertWithFreeCode(
            workspaceId,
            trackedLinkCodeFromName(dto.name),
            code =>
                this.trackedLinkRepository.createLink({
                    workspaceId,
                    accountId: account.id,
                    kind: ENUM_TRACKED_LINK_KIND.LINK,
                    name: dto.name,
                    code,
                    greeting: dto.greeting ?? null,
                    tagIds: dto.tagIds ?? [],
                    promisesOffer: dto.promisesOffer ?? false,
                    targetUrl: dto.targetUrl ?? null,
                })
        );
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
        const base = `${parent.code}-${trackedLinkCodeFromName(dto.name)}`
            .slice(0, TRACKED_LINK_CHILD_CODE_MAX_LENGTH - 3)
            .replace(/-+$/, '');

        return this.insertWithFreeCode(workspaceId, base, code =>
            this.trackedLinkRepository.createLink({
                workspaceId,
                accountId: parent.account.id,
                parentId: parent.id,
                kind: dto.kind,
                name: dto.name,
                code,
                // A website code opens the source's page with its own code.
                targetUrl: parent.targetUrl,
            })
        );
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
        const saved = await this.trackedLinkRepository.save(link);
        // Its QR and KOL codes open the same page.
        if (dto.targetUrl !== undefined && !link.parent) {
            await this.trackedLinkRepository.updateRaw(
                { parent: id },
                { targetUrl: dto.targetUrl }
            );
        }

        return saved;
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

    /** The list page: each source with its own and its codes' counts. */
    async mapListWithStats(
        workspaceId: string,
        sources: TrackedLinkEntity[]
    ): Promise<TrackedLinkGetResponseDto[]> {
        const children = sources.length
            ? await this.trackedLinkRepository.find({
                  parent: { $in: sources.map(source => source.id) },
                  deletedAt: null,
              })
            : [];
        const stats = await this.statsByLink(workspaceId, [
            ...sources,
            ...children,
        ]);
        return sources.map(source =>
            plainToInstance(
                TrackedLinkGetResponseDto,
                { ...this.toPlain(source), stats: stats(source, children) },
                { excludeExtraneousValues: true }
            )
        );
    }

    /** The detail page: the source's total, and each code on its own. */
    async mapDetailWithStats(
        workspaceId: string,
        link: TrackedLinkEntity,
        children: TrackedLinkEntity[]
    ): Promise<TrackedLinkDetailResponseDto> {
        const stats = await this.statsByLink(workspaceId, [link, ...children]);
        return plainToInstance(
            TrackedLinkDetailResponseDto,
            {
                ...this.toPlain(link),
                stats: stats(link, children),
                children: children.map(child => ({
                    ...this.toPlain(child),
                    stats: stats(child, []),
                })),
            },
            { excludeExtraneousValues: true }
        );
    }

    /** Loads the counts once, then sums a link with the children under it. */
    private async statsByLink(
        workspaceId: string,
        links: TrackedLinkEntity[]
    ): Promise<
        (
            link: TrackedLinkEntity,
            children: TrackedLinkEntity[]
        ) => ITrackedLinkStats
    > {
        const rows = await this.marketingStateRepository.statsByFirstSource(
            workspaceId,
            links.map(link => link.id)
        );
        const byId = new Map(rows.map(row => [row.linkId, row]));
        return (link, children) =>
            [link, ...children.filter(c => c.parent?.id === link.id)].reduce(
                (sum, { id }) => {
                    const row = byId.get(id);
                    return {
                        newCustomers:
                            sum.newCustomers + (row?.newCustomers ?? 0),
                        potentialCustomers:
                            sum.potentialCustomers +
                            (row?.potentialCustomers ?? 0),
                        orders: sum.orders + (row?.orders ?? 0),
                    };
                },
                { newCustomers: 0, potentialCustomers: 0, orders: 0 }
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

    /**
     * Inserts with a free code. Two creates with the same name at once can
     * pick the same code; the loser re-picks once instead of failing.
     */
    private async insertWithFreeCode(
        workspaceId: string,
        base: string,
        insert: (code: string) => Promise<TrackedLinkEntity>
    ): Promise<TrackedLinkEntity> {
        try {
            return await insert(await this.freeCode(workspaceId, base));
        } catch (err) {
            if (!(err instanceof UniqueConstraintViolationException)) throw err;

            return insert(await this.freeCode(workspaceId, base));
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
