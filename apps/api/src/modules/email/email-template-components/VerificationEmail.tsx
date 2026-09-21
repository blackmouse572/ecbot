import { Body, Head, Html } from '@react-email/components';
import React from 'react';

interface VerificationEmailProps {
    name: string;
    otp: string;
    expiredAt: string;
    reference: string;
    supportEmail: string;
    homeUrl: string;
    homeName: string;
}

const VerificationEmail: React.FC<VerificationEmailProps> = ({
    name,
    otp,
    expiredAt,
    reference,
    supportEmail,
    homeUrl,
    homeName,
}) => (
    <Html>
        <Head />
        <Body>
            <p>Hi{name},</p>
            <br />
            <p>
                Here is your OTP <b>{otp}</b> for verification.
            </p>
            <p>
                The OTP will expire until <b>{expiredAt}</b>.
            </p>
            <p>
                Reference: <b>{reference}</b>.
            </p>
            <p>
                Support Email:{' '}
                <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
            </p>
            <p>
                Visit us: <a href={homeUrl}>{homeUrl}</a>.
            </p>
            <br />
            <p>
                By: <b>{homeName}</b>.
            </p>
        </Body>
    </Html>
);

export default VerificationEmail;
