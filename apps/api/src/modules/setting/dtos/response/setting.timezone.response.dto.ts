import { ApiProperty } from '@nestjs/swagger';

export class SettingTimezoneResponseDto {
    @ApiProperty({
        required: true,
        example: 'Antarctica/DumontDUrville',
    })
    timezone: string;

    @ApiProperty({
        required: true,
        example: '+00:00',
    })
    timezoneOffset: string;
}
