import { ApiProperty } from '@nestjs/swagger';
import {
    ArrayMaxSize,
    ArrayNotEmpty,
    ArrayUnique,
    IsArray,
    IsBoolean,
    IsUUID,
} from 'class-validator';

// Max ids accepted in a single batch request.
export const BATCH_MAX_IDS = 100;

export class BatchIdsRequestDto {
    @ApiProperty({
        type: [String],
        description: `Ids to act on (max ${BATCH_MAX_IDS}).`,
        example: ['0f6b1f4c-1f1a-4f9e-9c1a-9d0b6d2e5a11'],
    })
    @IsArray()
    @ArrayNotEmpty()
    @ArrayUnique()
    @ArrayMaxSize(BATCH_MAX_IDS)
    @IsUUID('4', { each: true })
    ids: string[];
}

export class BatchIdsWithActiveRequestDto extends BatchIdsRequestDto {
    @ApiProperty({
        description: 'True activates the selected records, false deactivates.',
        example: true,
    })
    @IsBoolean()
    active: boolean;
}
