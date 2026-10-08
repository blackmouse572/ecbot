import { Body, Head, Html } from '@react-email/components';
import React from 'react';
import { resetPasswordEmailCopy } from './reset-password-email.copy';

interface ResetPasswordEmailProps {
    name: string;
    url: string;
    expiredDate: string;
    supportEmail?: string;
    homeUrl: string;
    homeName: string;
    language?: string;
}

// The link alone resets the password (#187): no code to copy across.
const ResetPasswordEmail: React.FC<ResetPasswordEmailProps> = ({
    name,
    url,
    expiredDate,
    supportEmail,
    homeUrl,
    homeName,
    language,
}) => {
    const copy = resetPasswordEmailCopy(language, homeName);

    return (
        <Html lang={language ?? 'en'}>
            <Head />
            <Body style={{ fontFamily: 'Arial, sans-serif', color: '#111' }}>
                <p>{copy.greeting(name)}</p>
                <p>{copy.intro}</p>
                <p>
                    <a
                        href={url}
                        style={{
                            display: 'inline-block',
                            padding: '10px 16px',
                            background: '#111',
                            color: '#fff',
                            borderRadius: '6px',
                            textDecoration: 'none',
                        }}
                    >
                        {copy.action}
                    </a>
                </p>
                <p style={{ fontSize: '13px', color: '#444' }}>
                    {copy.pasteLink}
                    <br />
                    <a href={url} style={{ wordBreak: 'break-all' }}>
                        {url}
                    </a>
                </p>
                {expiredDate && <p>{copy.expires(expiredDate)}</p>}
                <p>{copy.ignore}</p>
                {supportEmail && (
                    <p>
                        {copy.support}{' '}
                        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
                    </p>
                )}
                <p>
                    <a href={homeUrl}>{copy.signOff}</a>
                </p>
            </Body>
        </Html>
    );
};

export default ResetPasswordEmail;
