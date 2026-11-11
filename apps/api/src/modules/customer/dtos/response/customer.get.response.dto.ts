import { DatabaseDto } from '@app/common/database/dtos/database.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CustomerMarketingSummaryResponseDto } from './customer-marketing-summary.response.dto';

export class CustomerGetResponseDto extends DatabaseDto {
    @Expose()
    @ApiProperty({ required: false, nullable: true })
    name?: string;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    phone?: string;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    email?: string;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    language?: string;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    notes?: string;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    profileSummary?: string;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    mergedIntoCustomerId?: string;

    @Expose()
    @ApiProperty({
        required: false,
        description:
            'Number of conversations this customer has. Present on list responses only.',
    })
    conversationCount?: number;

    @Expose()
    @ApiProperty({
        required: false,
        type: [String],
        description:
            'Distinct channel (account) types the customer talked on. Present on list responses only.',
    })
    channels?: string[];

    @Expose()
    @Type(() => CustomerMarketingSummaryResponseDto)
    @ApiProperty({
        required: false,
        type: CustomerMarketingSummaryResponseDto,
        description:
            'Stage, offers permission, Khó chịu and Ngủ đông. Present on list responses only.',
    })
    marketing?: CustomerMarketingSummaryResponseDto;
}
