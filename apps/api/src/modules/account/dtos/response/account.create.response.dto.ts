import { OmitType } from '@nestjs/swagger';
import { AccountGetResponseDto } from './account.get.response.dto';

export class AccountCreateResponseDto extends OmitType(AccountGetResponseDto, [
    'status',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
    'deletedAt',
    'deletedBy',
    'deleted',
] as const) {}
