import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class NavCountGetResponseDto {
    @Expose()
    @ApiProperty({ description: 'Pending customer merge suggestions' })
    pendingSuggestions: number;

    @Expose()
    @ApiProperty({
        description: 'Accounts in a blocked state needing attention',
    })
    accountsNeedingAttention: number;

    @Expose()
    @ApiProperty({
        description:
            'Tools with a broken connection (re-auth / expired / revoked)',
    })
    toolsNeedingAttention: number;
}
