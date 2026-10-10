import { ApiProperty } from '@nestjs/swagger';

export class EmailMfaChangedDto {
    @ApiProperty({
        required: true,
        example: true,
        description: 'True when two-step verification was turned on',
    })
    enabled: boolean;

    @ApiProperty({
        required: false,
        example: 'vi',
        description: 'Language to write the email in; English otherwise',
    })
    language?: string;
}
