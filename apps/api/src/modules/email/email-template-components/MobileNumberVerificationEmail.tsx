import { Body, Head, Html } from '@react-email/components';
import React from 'react';

interface MobileNumberVerificationEmailProps {
    name: string;
    mobileNumber: string;
    reference: string;
    supportEmail: string;
    homeUrl: string;
    homeName: string;
}

const MobileNumberVerificationEmail: React.FC<
    MobileNumberVerificationEmailProps
> = ({ name, mobileNumber, reference, supportEmail, homeUrl, homeName }) => (
    <Html>
        <Head />
        <Body>
            <p>Hi{name},</p>
            <br />
            <p>Mobile Number is verified successfully.</p>
            <p>Mobile Number: {mobileNumber}.</p>
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

export default MobileNumberVerificationEmail;
