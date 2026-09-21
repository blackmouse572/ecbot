import { Body, Head, Html } from '@react-email/components';
import React from 'react';

interface ChangePasswordEmailProps {
    name: string;
    supportEmail: string;
    homeUrl: string;
    homeName: string;
}

const ChangePasswordEmail: React.FC<ChangePasswordEmailProps> = ({
    name,
    supportEmail,
    homeUrl,
    homeName,
}) => (
    <Html>
        <Head />
        <Body>
            <p>Hi{name},</p>
            <br />
            <p>Change password successfully.</p>
            <p>Support Email: {supportEmail}.</p>
            <p>
                Visit us: <a href={homeUrl}>{homeUrl}</a>.
            </p>
            <br />
            <p>By: {homeName}.</p>
        </Body>
    </Html>
);

export default ChangePasswordEmail;
