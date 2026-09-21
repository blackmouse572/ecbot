import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseUpdateOptions,
} from 'src/common/database/interfaces/database.interface';
import { FacebookActivityCreateRequestDto as CreateDto } from '../dtos/request/facebook-activity.create.request.dto';
import { FacebookActivityUpdateRequestDto as UpdateDto } from '../dtos/request/facebook-activity.update.request.dto';
import { FacebookActivityListResponseDto as ActivityDto } from '../dtos/response/facebook-activity.list.response.dto';
import { FacebookActivityEntity as Row } from '../repository/entities/facebook-activity.entity';

/** Filter object handed straight to the MikroORM repository. */
export type ActivityFilter = Record<string, any>;

/** Short names for the database option bags this module passes around. */
export type FindAllOpts = IDatabaseFindAllOptions;
export type FindOneOpts = IDatabaseFindOneOptions;
export type ReadOpts = IDatabaseOptions;
export type CountOpts = IDatabaseGetTotalOptions;
export type CreateOpts = IDatabaseCreateOptions;
export type UpdateOpts = IDatabaseUpdateOptions;
export type DeleteOpts = IDatabaseDeleteManyOptions;

/**
 * Read and write surface over the stored activity feed. A page or sender
 * scoped listing is a plain `findAll` whose scope is merged into the filter.
 */
export interface IFacebookActivityService {
    findAll(where?: ActivityFilter, opts?: FindAllOpts): Promise<Row[]>;
    findOne(where: ActivityFilter, opts?: ReadOpts): Promise<Row>;
    findOneById(id: string, opts?: ReadOpts): Promise<Row>;
    getTotal(where?: ActivityFilter, opts?: CountOpts): Promise<number>;
    create(data: CreateDto, opts?: CreateOpts): Promise<Row>;
    updateOneById(id: string, data: UpdateDto, opts?: UpdateOpts): Promise<Row>;
    markAsProcessed(id: string, opts?: UpdateOpts): Promise<Row>;
    markAsError(id: string, reason: string, opts?: UpdateOpts): Promise<Row>;
    deleteMany(where?: ActivityFilter, opts?: DeleteOpts): Promise<boolean>;
    mapList(rows: Row[]): ActivityDto[];
}
