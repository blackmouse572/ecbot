import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class AuthImpersonateExchangeRequestDto {
    @ApiProperty({ required: true, description: 'Single-use hand-off code' })
    @IsString()
    @IsNotEmpty()
    @Length(20, 128)
    code: string;
}
