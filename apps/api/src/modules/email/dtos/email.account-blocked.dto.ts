import { ApiProperty } from '@nestjs/swagger';
import { AccountBlockedReason } from '../email-template-components/account-blocked-email.copy';

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

    @ApiProperty({
        required: false,
        example: 'vi',
        description: 'Language to write the email in; English otherwise',
    })
    language?: string;

    @ApiProperty({
        required: false,
        enum: ['refresh_failed', 'auth_failed', 'send_failing'],
        description:
            'Why the channel needs attention; refresh_failed otherwise',
    })
    reason?: AccountBlockedReason;
}
