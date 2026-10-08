import { Text } from '@react-email/components';
import React from 'react';
import EmailCode from './EmailCode';
import EmailLayout from './EmailLayout';
import { EMAIL_THEME as T } from './email-theme';
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
        <EmailLayout
            language={language}
            preview={`${copy.intro} ${otp}`}
            heading={copy.heading}
            homeUrl={homeUrl}
            homeName={homeName}
            supportEmail={supportEmail}
            supportLabel={copy.support}
            signOff={copy.signOff}
        >
            <Text style={body}>{copy.greeting(name)}</Text>
            <Text style={body}>{copy.intro}</Text>
            <EmailCode code={otp} />
            {expiredAt && <Text style={body}>{copy.expires(expiredAt)}</Text>}
            <Text style={muted}>{copy.ignore}</Text>
            <Text style={muted}>
                {copy.reference}: {reference}
            </Text>
        </EmailLayout>
    );
};

const body: React.CSSProperties = {
    margin: '0 0 12px',
    fontSize: '14px',
    lineHeight: '20px',
    color: T.fgSubtle,
};

const muted: React.CSSProperties = {
    ...body,
    fontSize: '12px',
    color: T.fgMuted,
};

export default VerificationEmail;
