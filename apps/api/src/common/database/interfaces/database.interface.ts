import {
    CreateOptions,
    EntityManager,
    PopulateHint,
    UpsertOptions,
} from '@mikro-orm/postgresql';
import { IPaginationOrder } from 'src/common/pagination/interfaces/pagination.interface';

export interface IDatabaseQueryContainOptions {
    fullWord: boolean;
}

// Find
export interface IDatabaseOptions<TEntity extends object = any> {
    populate?: string[];
    em?: EntityManager;
    withDeleted?: boolean;
}

export interface IDatabaseExistsOptions extends IDatabaseOptions {
    excludeId?: string;
}

export interface IDatabaseFindOneOptions extends IDatabaseOptions {
    order?: IPaginationOrder;
    cache?: number; // in seconds
    select?: string[];
    exclude?: string[];
    populateWhere?: PopulateHint;
}

export type IDatabaseGetTotalOptions = Omit<IDatabaseOptions, 'populate'>;

export interface IDatabaseFindAllPagingOptions {
    limit: number;
    offset: number;
}

export interface IDatabaseFindAllOptions extends IDatabaseFindOneOptions {
    paging?: IDatabaseFindAllPagingOptions;
    limit?: number;
    offset?: number;
    orderBy?: Record<string, 'ASC' | 'DESC'>;
}

// Action
type IDatabaseActionByOptions = {
    actionBy?: string;
};

export type IDatabaseCreateOptions = Pick<IDatabaseOptions, 'em'> &
    IDatabaseActionByOptions &
    CreateOptions<true>;
export type IDatabaseUpdateOptions = Omit<IDatabaseOptions, 'populate'> &
    IDatabaseActionByOptions;
export type IDatabaseUpsertOptions<
    Entity,
    Fields extends string = never,
> = UpsertOptions<Entity, Fields> & IDatabaseActionByOptions;
export type IDatabaseDeleteOptions = Omit<IDatabaseOptions, 'populate'> &
    IDatabaseActionByOptions;
export type IDatabaseSaveOptions = Pick<IDatabaseOptions, 'em'> &
    IDatabaseActionByOptions;
export type IDatabaseSoftDeleteOptions = IDatabaseOptions &
    IDatabaseActionByOptions;

// Bulk
export type IDatabaseCreateManyOptions = Pick<IDatabaseOptions, 'em'> &
    IDatabaseActionByOptions;
export interface IDatabaseUpdateManyOptions
    extends
        Pick<IDatabaseOptions, 'em' | 'withDeleted'>,
        IDatabaseActionByOptions {
    upsert?: boolean;
}
export type IDatabaseDeleteManyOptions = Pick<
    IDatabaseOptions,
    'em' | 'withDeleted'
> &
    IDatabaseActionByOptions;

// Raw
export type IDatabaseAggregateOptions = Pick<
    IDatabaseOptions,
    'em' | 'withDeleted'
>;
export type IDatabaseFindAllAggregateOptions = Omit<
    IDatabaseFindAllOptions,
    'populate'
>;
