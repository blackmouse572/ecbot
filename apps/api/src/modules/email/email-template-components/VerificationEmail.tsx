import { Text } from '@react-email/components';
import React from 'react';
import EmailCode from './EmailCode';
import EmailLayout from './EmailLayout';
import { EMAIL_BODY, EMAIL_MUTED } from './email-text.styles';
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
            // Never the code: a correct code signs the user in, and the
            // preview shows on lock screens.
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
            <EmailCode code={otp} />
            {expiredAt && (
                <Text style={EMAIL_BODY}>{copy.expires(expiredAt)}</Text>
            )}
            <Text style={EMAIL_MUTED}>{copy.ignore}</Text>
            <Text style={EMAIL_MUTED}>
                {copy.reference}: {reference}
            </Text>
        </EmailLayout>
    );
};

export default VerificationEmail;
