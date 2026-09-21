import {
    EntityManager,
    EntityName,
    FilterQuery,
    FindOptions,
    OrderDefinition,
} from '@mikro-orm/postgresql';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import type {
    IDatabaseAggregateOptions,
    IDatabaseCreateManyOptions,
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseDeleteOptions,
    IDatabaseExistsOptions,
    IDatabaseFindAllAggregateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseSaveOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseUpdateManyOptions,
    IDatabaseUpdateOptions,
    IDatabaseUpsertOptions,
} from '../interfaces/database.interface';

export class DatabaseRepository<TEntity extends object> {
    protected readonly entityName: EntityName<TEntity>;
    protected readonly _populate?: string[];
    protected readonly em: EntityManager;

    constructor(
        em: EntityManager,
        entity: EntityName<TEntity>,
        populate: string[] = ['createdBy', 'updatedBy', 'deletedBy']
    ) {
        this.entityName = entity;
        this._populate = populate;
        this.em = em;
    }

    // Find Methods
    async find<T = TEntity>(
        find?: FilterQuery<NoInfer<TEntity>>,
        options?: IDatabaseFindAllOptions
    ): Promise<T[]> {
        const findOptions: FindOptions<NoInfer<TEntity>> = {};

        // Handle pagination
        if (options?.limit) findOptions.limit = options.limit;
        if (options?.offset) findOptions.offset = options.offset;
        if (options?.paging) {
            findOptions.limit = options.paging.limit;
            findOptions.offset = options.paging.offset;
        }

        // Handle ordering
        if (options?.orderBy) {
            findOptions.orderBy = [
                options.orderBy,
            ] as unknown as OrderDefinition<NoInfer<TEntity>>;
        } else if (options?.order) {
            // Convert pagination order format to MikroORM format
            const orderBy: Record<string, 'ASC' | 'DESC'> = {};
            Object.entries(options.order).forEach(([key, value]) => {
                orderBy[key] =
                    value === ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC
                        ? 'ASC'
                        : 'DESC';
            });
            findOptions.orderBy = [orderBy] as unknown as OrderDefinition<
                NoInfer<TEntity>
            >;
        }

        // Handle population (relationships)
        if (options?.populate) {
            findOptions.populate = options.populate as any;
        } else if (this._populate) {
            findOptions.populate = this._populate as any;
        }

        // Use custom entity manager if provided
        const em = options?.em || this.em;
        return em.find(
            this.entityName,
            find || ({} as any),
            findOptions
        ) as Promise<T[]>;
    }

    async findOne<T = TEntity>(
        find: FilterQuery<TEntity>,
        options?: IDatabaseFindOneOptions
    ): Promise<T | null> {
        if (
            !find ||
            typeof find !== 'object' ||
            Object.keys(find).length === 0
        ) {
            return null;
        }

        const findOptions: Record<string, any> = {};

        // Handle ordering
        if (options?.order) {
            const orderBy: Record<string, 'ASC' | 'DESC'> = {};
            Object.entries(options.order).forEach(([key, value]) => {
                orderBy[key] =
                    value === ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC
                        ? 'ASC'
                        : 'DESC';
            });
            findOptions.orderBy = orderBy;
        }

        // Handle population
        if (options?.populate) {
            findOptions.populate = options.populate as any;
        } else if (this._populate) {
            findOptions.populate = this._populate as any;
        }

        const em = options?.em || this.em;
        return em.findOne(
            this.entityName,
            find,
            findOptions
        ) as Promise<T | null>;
    }

    async findOneById<T = TEntity>(
        id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<T | null> {
        if (!id || typeof id !== 'string') {
            return null;
        }

        return this.findOne<T>({ id } as any, options);
    }

    async getTotal(
        find?: FilterQuery<NoInfer<TEntity>>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        const em = options?.em || this.em;
        return em.count(this.entityName, find || ({} as any));
    }

    async exists(
        find: Record<string, any>,
        options?: IDatabaseExistsOptions
    ): Promise<boolean> {
        if (
            !find ||
            typeof find !== 'object' ||
            Object.keys(find).length === 0
        ) {
            return false;
        }

        // Add excludeId logic if provided
        if (options?.excludeId) {
            find = {
                ...find,
                id: { $ne: options.excludeId },
            };
        }

        const em = options?.em || this.em;
        const count = await em.count(this.entityName, find as any);
        return count > 0;
    }

    // Action Methods
    async create<T extends Partial<TEntity>>(
        data: T,
        options?: IDatabaseCreateOptions
    ): Promise<TEntity> {
        if (
            !data ||
            typeof data !== 'object' ||
            Object.keys(data).length === 0
        ) {
            throw new Error('Data must be a non-empty object');
        }

        const em = options?.em || this.em;
        const actionBy = options?.actionBy;

        // If actionBy is provided, set createdBy/updatedBy fields if they exist
        if (actionBy) {
            if ('createdBy' in data) {
                (data as any).createdBy = actionBy;
            }
            if ('updatedBy' in data) {
                (data as any).updatedBy = actionBy;
            }
        }
        const entity = em.create(this.entityName, data as any);
        await em.persistAndFlush(entity);
        return entity;
    }

    async updateEntity<T = TEntity>(
        find: FilterQuery<NoInfer<TEntity>>,
        data: Partial<TEntity>,
        options?: IDatabaseUpdateOptions
    ): Promise<T | null> {
        if (
            !find ||
            typeof find !== 'object' ||
            Object.keys(find).length === 0
        ) {
            throw new Error('Find criteria must be a non-empty object');
        }

        if (
            !data ||
            typeof data !== 'object' ||
            Object.keys(data).length === 0
        ) {
            throw new Error('Update data must be a non-empty object');
        }

        const em = options?.em || this.em;
        const entity = await em.findOne(this.entityName, find as any);

        if (!entity) {
            return null;
        }

        const actionBy = options?.actionBy;
        // If actionBy is provided, set updatedBy field if it exists
        if (actionBy) {
            if ('updatedBy' in data) {
                (data as any).updatedBy = actionBy;
            }
        }
        // Update entity properties
        Object.assign(entity, data);
        await em.persistAndFlush(entity);
        return entity as T;
    }

    async updateRaw(
        find: Record<string, any>,
        data: Record<string, any>,
        options?: IDatabaseUpdateOptions
    ): Promise<number> {
        const em = options?.em || this.em;
        const actionBy = options?.actionBy;

        // If actionBy is provided, set updatedBy field if it exists
        if (actionBy) {
            data['updatedBy'] = actionBy;
        }
        // Use MikroORM's nativeUpdate for raw updates
        const result = await em.nativeUpdate(
            this.entityName,
            find as any,
            data as any
        );
        return result;
    }

    async delete(
        find: FilterQuery<NoInfer<TEntity>>,
        options?: IDatabaseDeleteOptions
    ): Promise<TEntity | null> {
        if (
            !find ||
            typeof find !== 'object' ||
            Object.keys(find).length === 0
        ) {
            throw new Error('Find criteria must be a non-empty object');
        }

        const em = options?.em || this.em;
        const entity = await em.findOne(this.entityName, find as any);

        if (!entity) {
            return null;
        }

        const actionBy = options?.actionBy;
        if (actionBy) {
            if ('deletedBy' in entity) {
                (entity as any).deletedBy = actionBy;
            }
        }

        await em.removeAndFlush(entity);
        return entity as TEntity;
    }

    async save(
        entity: TEntity,
        options?: IDatabaseSaveOptions
    ): Promise<TEntity> {
        const em = options?.em || this.em;
        const actionBy = options?.actionBy;
        if (actionBy) {
            if ('updatedBy' in entity) {
                (entity as any).updatedBy = actionBy;
            }
        }
        await em.persistAndFlush(entity);
        return entity;
    }

    // Bulk Operations
    async createMany<T extends Partial<TEntity>>(
        data: T[],
        options?: IDatabaseCreateManyOptions
    ): Promise<TEntity[]> {
        if (!data || !Array.isArray(data) || data.length === 0) {
            throw new Error('Data must be a non-empty array');
        }

        const em = options?.em || this.em;
        const actionBy = options?.actionBy;

        // If actionBy is provided, set createdBy/updatedBy fields if they exist
        if (actionBy) {
            data = data.map(item => {
                if ('createdBy' in item) {
                    (item as any).createdBy = actionBy;
                }
                if ('updatedBy' in item) {
                    (item as any).updatedBy = actionBy;
                }
                return item;
            });
        }
        const entities = data.map(item =>
            em.create(this.entityName, item as any)
        );
        await em.persistAndFlush(entities);
        return entities as TEntity[];
    }

    async updateMany<T = TEntity>(
        find: FilterQuery<NoInfer<TEntity>>,
        data: Partial<TEntity>,
        options?: IDatabaseUpdateManyOptions
    ): Promise<T[]> {
        if (!find || typeof find !== 'object') {
            throw new Error('Find criteria must be an object');
        }

        if (
            !data ||
            typeof data !== 'object' ||
            Object.keys(data).length === 0
        ) {
            throw new Error('Update data must be a non-empty object');
        }

        const em = options?.em || this.em;
        const entities = await em.find(this.entityName, find as any);
        const actionBy = options?.actionBy;
        entities.forEach(entity => {
            Object.assign(entity, data);
            if (actionBy) {
                if ('updatedBy' in entity) {
                    (entity as any).updatedBy = actionBy;
                }
            }
        });

        await em.persistAndFlush(entities);
        return entities as T[];
    }

    async updateManyRaw(
        find: Record<string, any>,
        data: Record<string, any>,
        options?: IDatabaseUpdateManyOptions
    ): Promise<number> {
        const em = options?.em || this.em;
        const actionBy = options?.actionBy;

        // If actionBy is provided, set updatedBy field if it exists
        if (actionBy) {
            data['updatedBy'] = actionBy;
        }
        // Use MikroORM's nativeUpdate for raw updates
        const result = await em.nativeUpdate(
            this.entityName,
            find as any,
            data as any
        );
        return result;
    }

    async deleteMany(
        find?: FilterQuery<NoInfer<TEntity>>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<TEntity[]> {
        if (!find) {
            return this.deleteAll();
        }

        const em = options?.em || this.em;
        const entities = await em.find(this.entityName, find as any);

        if (entities.length === 0) {
            return [];
        }

        const actionBy = options?.actionBy;
        if (actionBy) {
            entities.forEach(entity => {
                if ('deletedBy' in entity) {
                    (entity as any).deletedBy = actionBy;
                }
            });
        }

        await em.removeAndFlush(entities);
        return entities as TEntity[];
    }

    async softDelete(
        find: FilterQuery<NoInfer<TEntity>>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<TEntity | null> {
        // For soft delete, we update the entity with a deleted flag/timestamp
        const deleteData = {
            deleted: true,
            deletedAt: new Date(),
            deletedBy: options?.actionBy,
        };

        return this.updateEntity(
            find,
            deleteData as any,
            options
        ) as Promise<TEntity | null>;
    }

    // Aggregation methods for compatibility (basic implementations)
    async aggregate<_AggregateResult = any>(
        _pipeline: any[],
        options?: IDatabaseAggregateOptions
    ): Promise<any[]> {
        // Basic aggregation support - would need more sophisticated implementation
        // for complex aggregations in MikroORM
        const _em = options?.em || this.em;

        // This is a simplified version - real implementation would need
        // to translate MongoDB aggregation pipeline to SQL equivalents
        throw new Error(
            'Aggregation not fully implemented for MikroORM - use native query builder'
        );
    }

    async findAllAggregate<AggregateResult = any>(
        pipeline: any[],
        options?: IDatabaseFindAllAggregateOptions
    ): Promise<AggregateResult[]> {
        return this.aggregate<AggregateResult>(pipeline, options);
    }

    async getTotalAggregate<_AggregateResult = any>(
        _pipeline: any[],
        options?: IDatabaseAggregateOptions
    ): Promise<number> {
        // Simplified count implementation
        const em = options?.em || this.em;
        return em.count(this.entityName, {} as any);
    }

    // Utility method to get the underlying EntityManager
    async model(): Promise<EntityManager> {
        return this.em;
    }

    async upsert(
        data: Partial<TEntity>,
        options?: IDatabaseUpsertOptions<TEntity>
    ): Promise<TEntity> {
        const acionBy = options?.actionBy;
        // If actionBy is provided, set createdBy/updatedBy fields if they exist
        if (acionBy) {
            if ('createdBy' in data) {
                (data as any).createdBy = acionBy;
            }
            if ('updatedBy' in data) {
                (data as any).updatedBy = acionBy;
            }
        }

        const entity = await this.em.upsert(this.entityName, data, options);
        return entity;
    }

    async upsertMany(
        data: Partial<TEntity>[],
        options?: IDatabaseUpsertOptions<TEntity>
    ): Promise<TEntity[]> {
        if (!data || !Array.isArray(data) || data.length === 0) {
            throw new Error('Data must be a non-empty array');
        }
        const entities = await this.em.upsertMany(
            this.entityName,
            data,
            options
        );

        return entities;
    }

    async populate(entity: TEntity, relations?: string[]) {
        return this.em.populate(entity, (relations as any) || false);
    }

    async clearCache(key?: string) {
        await this.em.clearCache(key);
    }

    async deleteAll(): Promise<TEntity[]> {
        return this.em.nativeDelete(this.entityName, {}) as any;
    }

    getEntityManager(): EntityManager {
        return this.em;
    }
}
