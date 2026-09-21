import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class AwsS3PresignRequestDto {
    @ApiProperty({
        required: true,
        example: '/usr/libdata/querulous_playfully.xlc',
        description: 'key of aws s3',
    })
    @IsString()
    @IsNotEmpty()
    key: string;

    @ApiProperty({
        required: true,
        example: 1,
        description: 'Unit in bytes',
    })
    @Min(1)
    @IsInt()
    @IsNotEmpty()
    size: number;
}
