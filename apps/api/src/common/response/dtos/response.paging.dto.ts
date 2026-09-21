import { ApiProperty, PickType } from '@nestjs/swagger';
import { PAGINATION_DEFAULT_AVAILABLE_ORDER_DIRECTION } from 'src/common/pagination/constants/pagination.constant';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import {
    ResponseDto,
    ResponseMetadataDto,
} from 'src/common/response/dtos/response.dto';

export class ResponsePagingMetadataPaginationRequestDto {
    @ApiProperty({
        required: true,
        example: 'Pedro Friesen',
    })
    search: string;

    @ApiProperty({
        required: true,
    })
    filters: Record<
        string,
        string | number | boolean | Array<string | number | boolean> | Date
    >;

    @ApiProperty({
        required: true,
        example: 1,
    })
    page: number;

    @ApiProperty({
        required: true,
        example: 20,
    })
    perPage: number;

    @ApiProperty({
        required: true,
        example: 'createdAt',
    })
    orderBy: string;

    @ApiProperty({
        required: true,
        enum: ENUM_PAGINATION_ORDER_DIRECTION_TYPE,
        example: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
    })
    orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE;

    @ApiProperty({
        required: true,
        example: ['name'],
    })
    availableSearch: string[];

    @ApiProperty({
        required: true,
        isArray: true,
        example: ['name', 'createdAt'],
    })
    availableOrderBy: string[];

    @ApiProperty({
        required: true,
        enum: ENUM_PAGINATION_ORDER_DIRECTION_TYPE,
        isArray: true,
        example: Object.values(ENUM_PAGINATION_ORDER_DIRECTION_TYPE),
    })
    availableOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE[];

    @ApiProperty({
        required: false,
    })
    total?: number;

    @ApiProperty({
        required: false,
    })
    totalPage?: number;
}

export class ResponsePagingMetadataDto extends ResponseMetadataDto {
    @ApiProperty({
        required: false,
        type: ResponsePagingMetadataPaginationRequestDto,
    })
    pagination?: ResponsePagingMetadataPaginationRequestDto;
}

export class ResponsePagingDto extends PickType(ResponseDto, [
    'statusCode',
    'message',
] as const) {
    @ApiProperty({
        name: '_metadata',
        required: true,
        description: 'Contain metadata about API',
        type: ResponsePagingMetadataDto,
        example: {
            language: 'en',
            timestamp: 1660190937231,
            timezone: 'Asia/Jakarta',
            path: '/api/v1/test/hello',
            version: '1',
            repoVersion: '1.0.0',
            pagination: {
                search: 'Mrs. Nadine Grady',
                filters: {},
                page: 1,
                perPage: 20,
                orderBy: 'createdAt',
                orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
                availableSearch: ['name'],
                availableOrderBy: ['createdAt'],
                availableOrderDirection:
                    PAGINATION_DEFAULT_AVAILABLE_ORDER_DIRECTION,
                total: 100,
                totalPage: 5,
            },
        },
    })
    _metadata: ResponsePagingMetadataDto;

    @ApiProperty({
        required: true,
        isArray: true,
        type: Object,
        description: 'Array of objects representing paginated data',
        example: [{ id: 1, name: 'Example' }],
    })
    data: Record<string, any>[];
}
