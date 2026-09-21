import { Body, Head, Html } from '@react-email/components';
import React from 'react';

interface ResendPasswordEmailProps {
    name: string;
    url: string;
    expiredDate: string;
    supportEmail: string;
    homeUrl: string;
    homeName: string;
}

const ResetPasswordEmail: React.FC<ResendPasswordEmailProps> = ({
    name,
    url,
    expiredDate,
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
                Your reset password link is here <a href={url}>{url}</a>
            </p>
            <p>Expired until {expiredDate}.</p>
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

export default ResetPasswordEmail;
