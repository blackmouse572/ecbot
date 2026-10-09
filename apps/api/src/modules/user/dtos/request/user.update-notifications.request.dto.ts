import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UserUpdateNotificationsRequestDto {
    @ApiProperty({
        required: true,
        example: false,
        description: 'Email me when a customer is handed over to a person',
    })
    @IsBoolean()
    handoffEmails: boolean;
}
