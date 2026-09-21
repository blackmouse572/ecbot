import { Body, Head, Html } from '@react-email/components';
import React from 'react';

interface SendVerifiedEmailProps {
    name: string;
    reference: string;
    supportEmail: string;
    homeUrl: string;
    homeName: string;
}

const SendVerifiedEmail: React.FC<SendVerifiedEmailProps> = ({
    name,
    reference,
    supportEmail,
    homeUrl,
    homeName,
}) => (
    <Html>
        <Head />
        <Body>
            <p>Hi {name},</p>
            <br />
            <p>Email is verified successfully</p>
            <p>Reference: {reference}.</p>
            <p>Support Email: {supportEmail}.</p>
            <p>
                Visit us: <a href={homeUrl}>{homeUrl}</a>.
            </p>
            <br />
            <p>By: {homeName}.</p>
        </Body>
    </Html>
);

export default SendVerifiedEmail;
