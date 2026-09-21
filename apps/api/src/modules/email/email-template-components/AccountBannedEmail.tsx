import { Body, Head, Html } from '@react-email/components';
import React from 'react';

interface AccountBannedEmailProps {
    name: string;
    supportEmail: string;
    homeUrl: string;
    homeName: string;
}

const AccountBannedEmail: React.FC<AccountBannedEmailProps> = ({
    name,
    supportEmail,
    homeUrl,
    homeName,
}) => (
    <Html>
        <Head />
        <Body>
            <p>Hi {name},</p>
            <br />
            <p>Your account has been suspended by an administrator.</p>
            <p>
                If you believe this is a mistake, please contact us at{' '}
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

export default AccountBannedEmail;
