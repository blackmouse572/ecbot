import { PickType } from '@nestjs/swagger';
import { AccountCreateRequestDto } from './account.create.request.dto';

export class AccountUpdateProfileRequestDto extends PickType(
    AccountCreateRequestDto,
    ['name', 'avatar', 'link'] as const
) {}
