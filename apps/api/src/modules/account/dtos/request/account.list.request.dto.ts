import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { DEFAULT_ACCOUNT_STATUS } from '../../constants/account.list.constant';
import {
    ENUM_ACCOUNT_STATUS,
    ENUM_ACCOUNT_TYPE,
} from '../../enums/account.enum';

/**
 * Filters a workspace's account list. Every field is optional and an omitted
 * one is left out of the query entirely rather than matched against null.
 */
export class AccountListQueryDto {
    @ApiPropertyOptional({
        description: 'Keep only accounts in this state',
        enum: ENUM_ACCOUNT_STATUS,
        default: DEFAULT_ACCOUNT_STATUS,
    })
    @IsEnum(ENUM_ACCOUNT_STATUS)
    @IsOptional()
    status?: ENUM_ACCOUNT_STATUS;

    @ApiPropertyOptional({
        description: 'Keep only channels of this platform',
        enum: ENUM_ACCOUNT_TYPE,
    })
    @IsEnum(ENUM_ACCOUNT_TYPE)
    @IsOptional()
    type?: ENUM_ACCOUNT_TYPE;

    @ApiPropertyOptional({
        description: 'Keep only the children of this parent account',
    })
    @IsUUID()
    @IsOptional()
    account?: string;
}

/** Admin reads are cross-tenant, so the workspace becomes a filter. */
export class AccountAdminListQueryDto extends AccountListQueryDto {
    @ApiPropertyOptional({
        description: 'Keep only accounts owned by this workspace',
    })
    @IsUUID()
    @IsOptional()
    workspace?: string;
}

/**
 * Turns the filters the caller actually sent into query conditions. An
 * omitted filter contributes no key, so it never narrows the result.
 */
export function accountListFilter(
    query: AccountListQueryDto = {}
): Record<string, any> {
    const { status, type, account } = query;

    return {
        ...(status && { status }),
        ...(type && { type }),
        ...(account && { account }),
    };
}
