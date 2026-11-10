import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';

/** The parts of a channel account a tracked link's URL is built from. */
export interface ITrackedLinkAccount {
    type: ENUM_ACCOUNT_TYPE;
    externalId: string;
    link?: string;
}
