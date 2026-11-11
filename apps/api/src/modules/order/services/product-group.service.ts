import { IDatabaseFindAllOptions } from '@app/common/database/interfaces/database.interface';
import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ProductGroupGetResponseDto } from '../dtos/response/product-group.get.response.dto';
import { IProductGroupInput } from '../interfaces/order.interface';
import { ProductGroupEntity } from '../repository/entities/product-group.entity';
import { ProductGroupRepository } from '../repository/repositories/product-group.repository';

@Injectable()
export class ProductGroupService {
    constructor(
        private readonly productGroupRepository: ProductGroupRepository
    ) {}

    findAll(
        workspaceId: string,
        find: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ProductGroupEntity[]> {
        return this.productGroupRepository.find(
            { ...find, workspace: workspaceId },
            { ...options, populate: [] }
        );
    }

    getTotal(workspaceId: string, find: Record<string, any>): Promise<number> {
        return this.productGroupRepository.getTotal({
            ...find,
            workspace: workspaceId,
        });
    }

    async findOneInWorkspaceOrFail(
        id: string,
        workspaceId: string
    ): Promise<ProductGroupEntity> {
        const group = await this.productGroupRepository.findOne(
            { id, workspace: workspaceId },
            { populate: [] }
        );
        if (!group) {
            throw new NotFoundException({
                message: 'order.productGroup.error.notFound',
                statusCode: 404,
            });
        }
        return group;
    }

    async create(
        workspaceId: string,
        input: IProductGroupInput & { name: string }
    ): Promise<ProductGroupEntity> {
        await this.assertNameFree(workspaceId, input.name);
        return this.productGroupRepository.create({
            workspace: workspaceId as any,
            name: input.name,
            defaultRepurchaseDays: input.defaultRepurchaseDays ?? undefined,
        });
    }

    async update(
        id: string,
        workspaceId: string,
        input: IProductGroupInput
    ): Promise<ProductGroupEntity> {
        const group = await this.findOneInWorkspaceOrFail(id, workspaceId);
        if (input.name !== undefined && input.name !== group.name) {
            await this.assertNameFree(workspaceId, input.name, id);
            group.name = input.name;
        }
        if (input.defaultRepurchaseDays !== undefined) {
            group.defaultRepurchaseDays =
                input.defaultRepurchaseDays ?? undefined;
        }
        return this.productGroupRepository.save(group);
    }

    // Hard delete: items keep their name and lose the group (FK set null).
    async delete(id: string, workspaceId: string): Promise<ProductGroupEntity> {
        const group = await this.findOneInWorkspaceOrFail(id, workspaceId);
        await this.productGroupRepository.delete({ id: group.id });
        return group;
    }

    /**
     * The group an item belongs to when nobody picked one: the longest group
     * name found in the item name, ignoring case ("Kem chống nắng SPF50" is in
     * "Kem chống nắng").
     */
    matchItemName(
        itemName: string,
        groups: ProductGroupEntity[]
    ): ProductGroupEntity | undefined {
        const name = itemName.toLocaleLowerCase('vi');
        let best: ProductGroupEntity | undefined;
        for (const group of groups) {
            const groupName = group.name.toLocaleLowerCase('vi');
            const longer = !best || group.name.length > best.name.length;
            if (name.includes(groupName) && longer) best = group;
        }
        return best;
    }

    /** Recompute the learned repurchase cycle of each group from its orders. */
    refreshLearnedCycles(ids: string[]): Promise<void> {
        return this.productGroupRepository.refreshLearnedRepurchaseDays(ids);
    }

    mapGet(group: ProductGroupEntity): ProductGroupGetResponseDto {
        return plainToInstance(
            ProductGroupGetResponseDto,
            {
                ...group,
                repurchaseDays:
                    group.learnedRepurchaseDays ??
                    group.defaultRepurchaseDays ??
                    null,
            },
            { excludeExtraneousValues: true }
        );
    }

    mapList(groups: ProductGroupEntity[]): ProductGroupGetResponseDto[] {
        return groups.map(group => this.mapGet(group));
    }

    private async assertNameFree(
        workspaceId: string,
        name: string,
        excludeId?: string
    ): Promise<void> {
        const taken = await this.productGroupRepository.exists(
            { workspace: workspaceId, name },
            { excludeId }
        );
        if (taken) {
            throw new ConflictException({
                message: 'order.productGroup.error.duplicate',
                statusCode: 409,
            });
        }
    }
}
