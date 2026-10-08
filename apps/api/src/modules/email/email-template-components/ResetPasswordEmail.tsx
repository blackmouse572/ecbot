import { Link, Text } from '@react-email/components';
import React from 'react';
import EmailButton from './EmailButton';
import EmailLayout from './EmailLayout';
import { EMAIL_BODY, EMAIL_MUTED } from './email-text.styles';
import { EMAIL_THEME as T } from './email-theme';
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
        <EmailLayout
            language={language}
            preview={copy.intro}
            heading={copy.heading}
            homeUrl={homeUrl}
            homeName={homeName}
            supportEmail={supportEmail}
            supportLabel={copy.support}
            signOff={copy.signOff}
        >
            <Text style={EMAIL_BODY}>{copy.greeting(name)}</Text>
            <Text style={EMAIL_BODY}>{copy.intro}</Text>
            <div style={{ margin: '24px 0' }}>
                <EmailButton href={url}>{copy.action}</EmailButton>
            </div>
            {expiredDate && (
                <Text style={EMAIL_BODY}>{copy.expires(expiredDate)}</Text>
            )}
            <Text style={EMAIL_MUTED}>
                {copy.pasteLink}
                <br />
                <Link
                    href={url}
                    style={{ color: T.fgInteractive, wordBreak: 'break-all' }}
                >
                    {url}
                </Link>
            </Text>
            <Text style={EMAIL_MUTED}>{copy.ignore}</Text>
        </EmailLayout>
    );
};

export default ResetPasswordEmail;
