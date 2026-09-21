import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS } from '../../enums/customer.enum';

export class CustomerMergeSuggestionCustomerSummaryDto {
    @Expose()
    @ApiProperty()
    id: string;

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
    @ApiProperty()
    createdAt: Date;
}

export class CustomerMergeSuggestionGetResponseDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty({ enum: ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS })
    status: ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS;

    @Expose()
    @ApiProperty({ enum: ['phone', 'email'] })
    matchField: 'phone' | 'email';

    @Expose()
    @ApiProperty()
    matchValue: string;

    @Expose()
    @Type(() => CustomerMergeSuggestionCustomerSummaryDto)
    @ApiProperty({ type: () => CustomerMergeSuggestionCustomerSummaryDto })
    customerA: CustomerMergeSuggestionCustomerSummaryDto;

    @Expose()
    @Type(() => CustomerMergeSuggestionCustomerSummaryDto)
    @ApiProperty({ type: () => CustomerMergeSuggestionCustomerSummaryDto })
    customerB: CustomerMergeSuggestionCustomerSummaryDto;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    resolvedAt?: Date;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    mergedSurvivorId?: string;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    mergedLoserId?: string;

    @Expose()
    @ApiProperty()
    createdAt: Date;

    @Expose()
    @ApiProperty({ required: false })
    updatedAt?: Date;
}
