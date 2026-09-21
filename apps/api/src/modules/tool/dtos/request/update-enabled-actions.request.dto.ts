import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsString } from 'class-validator';

export class UpdateEnabledActionsRequestDto {
    @ApiProperty({
        type: [String],
        description: 'Replaces the current enabledActions list entirely.',
    })
    @IsArray()
    @ArrayUnique()
    @IsString({ each: true })
    enabledActions!: string[];
}
