import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsIn,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    ValidateNested,
} from 'class-validator';

export class CustomerMergeSuggestionFieldResolutionsDto {
    @ApiProperty({ required: false, enum: ['A', 'B'] })
    @IsOptional()
    @IsIn(['A', 'B'])
    name?: 'A' | 'B';

    @ApiProperty({ required: false, enum: ['A', 'B'] })
    @IsOptional()
    @IsIn(['A', 'B'])
    phone?: 'A' | 'B';

    @ApiProperty({ required: false, enum: ['A', 'B'] })
    @IsOptional()
    @IsIn(['A', 'B'])
    email?: 'A' | 'B';

    @ApiProperty({ required: false, enum: ['A', 'B'] })
    @IsOptional()
    @IsIn(['A', 'B'])
    language?: 'A' | 'B';

    @ApiProperty({ required: false, enum: ['A', 'B'] })
    @IsOptional()
    @IsIn(['A', 'B'])
    notes?: 'A' | 'B';

    @ApiProperty({ required: false, enum: ['A', 'B'] })
    @IsOptional()
    @IsIn(['A', 'B'])
    profileSummary?: 'A' | 'B';
}

export class CustomerMergeSuggestionConfirmRequestDto {
    @ApiProperty({ description: 'Customer id to keep as survivor' })
    @IsString()
    @IsUUID()
    survivorId: string;

    @ApiProperty({
        required: false,
        type: () => CustomerMergeSuggestionFieldResolutionsDto,
    })
    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => CustomerMergeSuggestionFieldResolutionsDto)
    fieldResolutions?: CustomerMergeSuggestionFieldResolutionsDto;
}
