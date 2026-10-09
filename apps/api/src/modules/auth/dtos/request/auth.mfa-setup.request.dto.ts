import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AuthMfaSetupRequestDto {
    @ApiProperty({ required: true, description: 'Current password' })
    @IsString()
    @IsNotEmpty()
    password: string;
}
