import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { AccountCreateRequestDto } from 'src/modules/account/dtos/request/account.create.request.dto';

/**
 * Set on create, never through an update: `addedBy` records who linked the
 * account, `cookies`/`proxies` are managed by their own endpoints.
 */
const CREATE_ONLY_FIELDS = ['addedBy', 'cookies', 'proxies'] as const;

export class AccountUpdateRequestDto extends OmitType(AccountCreateRequestDto, [
    ...CREATE_ONLY_FIELDS,
    'accessToken',
] as const) {
    @ApiProperty({
        required: false,
        description:
            'New platform token. Leave out to keep the stored one. Stored encrypted; an already enveloped value is kept as-is.',
    })
    // Only an absent token means "keep"; @IsOptional would also let null
    // through to the NOT NULL column.
    @ValidateIf((_o, value) => value !== undefined)
    @IsString()
    @IsNotEmpty()
    accessToken?: string;
}
