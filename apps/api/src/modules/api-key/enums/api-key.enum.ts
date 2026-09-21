export enum ENUM_API_KEY_TYPE {
    SYSTEM = 'SYSTEM',
    DEFAULT = 'DEFAULT',
    // Browser-exposed key. Only reaches routes marked @ApiKeyPublicProtected().
    PUBLIC = 'PUBLIC',
}
