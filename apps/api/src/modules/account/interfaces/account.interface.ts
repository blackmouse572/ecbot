import { ENUM_ACCOUNT_TYPE } from '../enums/account.enum';
import { AccountEntity } from '../repository/entities/account.entity';
import { Cookie } from '../repository/entities/cookie.entity';
import { Proxy } from '../repository/entities/proxy.entity';

export type IAccountDoc = AccountEntity;

export interface IAccountEntity extends Omit<
    AccountEntity,
    'cookies' | 'proxies'
> {
    cookies: Cookie[];
    proxies: Proxy[];
}

/** A Page the login manages that stayed in the workspace that already has it. */
export interface IAccountSkippedPage {
    externalId: string;
    name: string;
    avatar?: string;
    type: ENUM_ACCOUNT_TYPE;
}

export interface IAccountEntityWithPages extends IAccountEntity {
    pages: any;
    skippedPages?: IAccountSkippedPage[];
}
