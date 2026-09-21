import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { Injectable } from '@nestjs/common';
import { BaseStubPlatformAdapter } from '../base-stub.platform-adapter';

/**
 * Shopee is declared in ENUM_ACCOUNT_TYPE but not implemented — every method
 * throws 501 and the platform is disabled in the account-create UI.
 *
 * This is an open adapter slot. See "Adding a channel adapter" in
 * CONTRIBUTING.md; `telegram/` is the smallest complete reference.
 */
@Injectable()
export class ShopeePlatformAdapter extends BaseStubPlatformAdapter {
    readonly type = ENUM_ACCOUNT_TYPE.SHOPEE_SHOP;
}
