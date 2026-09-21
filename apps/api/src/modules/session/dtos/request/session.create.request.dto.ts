import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class SessionCreateRequestDto {
    @ApiProperty({
        example: 'f6f37e7b-0719-4741-a72a-2f579c09a758',
        required: true,
    })
    @IsNotEmpty()
    @IsUUID()
    user: string;
}
