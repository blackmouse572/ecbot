import { ApiHideProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { IPaginationOrder } from 'src/common/pagination/interfaces/pagination.interface';

export class PaginationListDto {
    @ApiHideProperty()
    _search: Record<string, any>;

    @ApiHideProperty()
    _limit: number;

    @ApiHideProperty()
    _offset: number;

    @ApiHideProperty()
    _order: IPaginationOrder;

    @ApiHideProperty()
    _availableOrderBy: string[];

    @ApiHideProperty()
    _availableOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE[];

    // Declared so the global pipe keeps it for PaginationSearchPipe; the
    // `_`-prefixed fields above stay undecorated, so a client can't set them.
    @IsOptional()
    @IsString()
    @ApiHideProperty()
    search?: string;

    @IsOptional()
    @ApiHideProperty()
    perPage?: number;

    @IsOptional()
    @ApiHideProperty()
    page?: number;

    @IsOptional()
    @ApiHideProperty()
    orderBy?: string;

    @IsOptional()
    @ApiHideProperty()
    orderDirection?: ENUM_PAGINATION_ORDER_DIRECTION_TYPE;
}
