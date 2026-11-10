/**
 * LINK is a source the shop creates (its own default link). QR and KOL are
 * extra codes under it, so each placement or KOL is counted on its own.
 * POST (auto-posting) and AD (Meta ad referrals) are created by later work.
 */
export enum ENUM_TRACKED_LINK_KIND {
    LINK = 'LINK',
    QR = 'QR',
    KOL = 'KOL',
    POST = 'POST',
    AD = 'AD',
}

export enum ENUM_TRACKED_LINK_STATUS {
    ACTIVE = 'ACTIVE',
    STOPPED = 'STOPPED',
}
