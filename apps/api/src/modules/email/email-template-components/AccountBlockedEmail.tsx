import { Body, Head, Html } from '@react-email/components';
import React from 'react';

interface AccountBlockedEmailProps {
    name: string;
    accountName: string;
    reconnectUrl: string;
    supportEmail: string;
    homeUrl: string;
    homeName: string;
}

const AccountBlockedEmail: React.FC<AccountBlockedEmailProps> = ({
    name,
    accountName,
    reconnectUrl,
    supportEmail,
    homeUrl,
    homeName,
}) => (
    <Html>
        <Head />
        <Body>
            <p>Hi {name},</p>
            <br />
            <p>
                Your connected account <strong>{accountName}</strong> has been
                disconnected because we could not refresh its access token.
            </p>
            <p>
                Please reconnect it here:{' '}
                <a href={reconnectUrl}>{reconnectUrl}</a>
            </p>
            <p>
                Support Email:{' '}
                <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
            </p>
            <p>
                Visit us: <a href={homeUrl}>{homeUrl}</a>.
            </p>
            <br />
            <p>By: {homeName}.</p>
        </Body>
    </Html>
);

export default AccountBlockedEmail;
