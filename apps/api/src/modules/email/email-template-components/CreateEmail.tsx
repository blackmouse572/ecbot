import { Body, Head, Html } from '@react-email/components';
import React from 'react';

interface CreateEmailProps {
    name: string;
    password: string;
    passwordExpiredAt: string;
    supportEmail: string;
    homeUrl: string;
    homeName: string;
}

const CreateEmail: React.FC<CreateEmailProps> = ({
    name,
    password,
    passwordExpiredAt,
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
                Your account has created by admin and your password is{' '}
                <strong>{password}</strong>.
            </p>
            <p>Expired At {passwordExpiredAt}.</p>
            <br />
            <p>Support Email: {supportEmail}.</p>
            <p>
                Visit us: <a href={homeUrl}>{homeUrl}</a>.
            </p>
            <br />
            <p>By: {homeName}.</p>
        </Body>
    </Html>
);

export default CreateEmail;
