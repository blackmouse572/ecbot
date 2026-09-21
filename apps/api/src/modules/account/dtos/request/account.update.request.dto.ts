import { OmitType } from '@nestjs/swagger';
import { AccountCreateRequestDto } from 'src/modules/account/dtos/request/account.create.request.dto';

/**
 * Set on create, never through an update: `addedBy` records who linked the
 * account, `cookies`/`proxies` are managed by their own endpoints.
 */
const CREATE_ONLY_FIELDS = ['addedBy', 'cookies', 'proxies'] as const;

export class AccountUpdateRequestDto extends OmitType(
    AccountCreateRequestDto,
    CREATE_ONLY_FIELDS
) {}
