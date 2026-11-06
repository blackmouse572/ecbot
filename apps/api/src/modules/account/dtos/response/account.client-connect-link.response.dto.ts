import { ApiProperty } from '@nestjs/swagger';

export class AccountClientConnectLinkResponseDto {
    @ApiProperty({
        description:
            "The app's connect page with the platform picked. The person opens it, signs in on the platform and approves.",
        example:
            'https://app.ecbot.dev/my-shop/accounts/create?platform=FACEBOOK_ACCOUNT',
    })
    url: string;
}
