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

export interface IAccountEntityWithPages extends IAccountEntity {
    pages: any;
}
