import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ENUM_CUSTOMER_JOURNEY_STAGE } from '@app/modules/customer/enums/customer-marketing.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ENUM_MARKETING_TODO } from '../../enums/marketing-overview.enum';

export class MarketingOverviewStageDto {
    @Expose()
    @ApiProperty({
        enum: ENUM_CUSTOMER_JOURNEY_STAGE,
    })
    stage: ENUM_CUSTOMER_JOURNEY_STAGE;

    @Expose()
    @ApiProperty({ example: 274, description: 'Customers at the stage now' })
    current: number;

    @Expose()
    @ApiProperty({
        example: 292,
        description: 'Customers at the stage 7 days ago',
    })
    previous: number;
}

export class MarketingOverviewStageCountDto {
    @Expose()
    @ApiProperty({
        enum: ENUM_CUSTOMER_JOURNEY_STAGE,
    })
    stage: ENUM_CUSTOMER_JOURNEY_STAGE;

    @Expose()
    @ApiProperty({ example: 820 })
    count: number;
}

export class MarketingOverviewFunnelDto {
    @Expose()
    @ApiProperty({
        enum: ENUM_ACCOUNT_TYPE,
        description: 'The channel the customers first wrote from',
    })
    platform: ENUM_ACCOUNT_TYPE;

    @Expose()
    @Type(() => MarketingOverviewStageCountDto)
    @ApiProperty({
        type: [MarketingOverviewStageCountDto],
        description:
            'Customers who reached each stage or a later one, in stage order',
    })
    stages: MarketingOverviewStageCountDto[];
}

export class MarketingOverviewMoveDto {
    @Expose()
    @ApiProperty({
        enum: ENUM_CUSTOMER_JOURNEY_STAGE,
    })
    from: ENUM_CUSTOMER_JOURNEY_STAGE;

    @Expose()
    @ApiProperty({
        enum: ENUM_CUSTOMER_JOURNEY_STAGE,
    })
    to: ENUM_CUSTOMER_JOURNEY_STAGE;

    @Expose()
    @ApiProperty({ example: 43 })
    count: number;
}

export class MarketingOverviewTodoCountDto {
    @Expose()
    @ApiProperty({ example: 48, description: 'Customers worth a message' })
    count: number;

    @Expose()
    @ApiProperty({
        example: 6,
        description: 'Customers left out: opted out, paused or Khó chịu',
    })
    excluded: number;
}

export class MarketingOverviewTodoDto extends MarketingOverviewTodoCountDto {
    @Expose()
    @ApiProperty({ enum: ENUM_MARKETING_TODO })
    key: ENUM_MARKETING_TODO;
}

export class MarketingOverviewHealthDto {
    @Expose()
    @ApiProperty({ example: 7, description: 'Opt-outs in the last 30 days' })
    optOuts: number;

    @Expose()
    @ApiProperty({ example: 5, description: 'Opt-outs in the 30 days before' })
    optOutsPrevious: number;

    @Expose()
    @ApiProperty({ example: 244, description: 'Customers paused now' })
    paused: number;
}

export class MarketingOverviewResponseDto {
    @Expose()
    @ApiProperty({ example: 3502, description: 'Live customers' })
    total: number;

    @Expose()
    @ApiProperty({ description: 'Start of the 7-day window' })
    since: Date;

    @Expose()
    @Type(() => MarketingOverviewStageDto)
    @ApiProperty({
        type: [MarketingOverviewStageDto],
        description: 'In stage order',
    })
    stages: MarketingOverviewStageDto[];

    @Expose()
    @ApiProperty({
        example: 402,
        description: 'Lâu không nhắn: no message and no order for 120 days',
    })
    dormant: number;

    @Expose()
    @Type(() => MarketingOverviewFunnelDto)
    @ApiProperty({
        type: [MarketingOverviewFunnelDto],
        description: 'Largest channel first',
    })
    funnel: MarketingOverviewFunnelDto[];

    @Expose()
    @Type(() => MarketingOverviewMoveDto)
    @ApiProperty({
        type: [MarketingOverviewMoveDto],
        description: 'Largest first',
    })
    moves: MarketingOverviewMoveDto[];

    @Expose()
    @Type(() => MarketingOverviewTodoDto)
    @ApiProperty({
        type: [MarketingOverviewTodoDto],
        description: 'Việc nên làm, in stage order',
    })
    todos: MarketingOverviewTodoDto[];

    @Expose()
    @Type(() => MarketingOverviewTodoCountDto)
    @ApiProperty({
        type: MarketingOverviewTodoCountDto,
        description: 'Customers in any row, each counted once',
    })
    todoTotal: MarketingOverviewTodoCountDto;

    @Expose()
    @Type(() => MarketingOverviewHealthDto)
    @ApiProperty({ type: MarketingOverviewHealthDto })
    health: MarketingOverviewHealthDto;
}
