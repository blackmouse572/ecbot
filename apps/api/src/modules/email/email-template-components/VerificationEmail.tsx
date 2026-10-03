import { Body, Head, Html } from '@react-email/components';
import React from 'react';
import { verificationEmailCopy } from './verification-email.copy';

interface VerificationEmailProps {
    name: string;
    otp: string;
    expiredAt: string;
    reference: string;
    supportEmail?: string;
    homeUrl: string;
    homeName: string;
    language?: string;
}

const VerificationEmail: React.FC<VerificationEmailProps> = ({
    name,
    otp,
    expiredAt,
    reference,
    supportEmail,
    homeUrl,
    homeName,
    language,
}) => {
    const copy = verificationEmailCopy(language, homeName);

    return (
        <Html lang={language ?? 'en'}>
            <Head />
            <Body style={{ fontFamily: 'Arial, sans-serif', color: '#111' }}>
                <p>{copy.greeting(name)}</p>
                <p>{copy.intro}</p>
                <p
                    style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        letterSpacing: '6px',
                    }}
                >
                    {otp}
                </p>
                {expiredAt && <p>{copy.expires(expiredAt)}</p>}
                <p>{copy.ignore}</p>
                {supportEmail && (
                    <p>
                        {copy.support}{' '}
                        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
                    </p>
                )}
                <p style={{ color: '#666', fontSize: '12px' }}>
                    {copy.reference}: {reference}
                </p>
                <p>
                    <a href={homeUrl}>{copy.signOff}</a>
                </p>
            </Body>
        </Html>
    );
};

export default VerificationEmail;
