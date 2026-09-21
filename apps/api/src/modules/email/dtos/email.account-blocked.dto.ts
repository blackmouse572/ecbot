import { ApiProperty } from '@nestjs/swagger';

export class EmailAccountBlockedDto {
    @ApiProperty({
        required: true,
        example: 'Considine, Dickens and Feil',
    })
    accountName: string;

    @ApiProperty({
        required: true,
        example: '/my-workspace/accounts/abc-123',
        description: 'Relative path to the account reconnect page',
    })
    reconnectUrl: string;
}
