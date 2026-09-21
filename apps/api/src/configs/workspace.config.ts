import { registerAs } from '@nestjs/config';

export default registerAs(
    'workspace',
    (): Record<string, any> => ({
        invitationKey: process.env.WORK_SPACE_INVITATION_TOKEN_SECRET_KEY,
        invitationExpired: process.env.WORK_SPACE_INVITATION_TOKEN_EXPIRED,
    })
);
