import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** An operator's "Tạm hoãn <product group> đến <date>". */
export class CustomerProductReactionUpdateRequestDto {
    @Type(() => Date)
    @IsDate()
    @ApiProperty({ description: 'Do not offer this group before this date.' })
    until: Date;

    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    @ApiProperty()
    reason: string;
}
