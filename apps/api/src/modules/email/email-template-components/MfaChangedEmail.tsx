import { Text } from '@react-email/components';
import React from 'react';
import EmailLayout from './EmailLayout';
import { EMAIL_BODY, EMAIL_MUTED } from './email-text.styles';
import { mfaChangedEmailCopy } from './mfa-changed-email.copy';

interface MfaChangedEmailProps {
    name: string;
    enabled: boolean;
    supportEmail?: string;
    homeUrl: string;
    homeName: string;
    language?: string;
}

/** Tells a user that two-step verification was turned on or off. */
const MfaChangedEmail: React.FC<MfaChangedEmailProps> = ({
    name,
    enabled,
    supportEmail,
    homeUrl,
    homeName,
    language,
}) => {
    const copy = mfaChangedEmailCopy(language, homeName);

    return (
        <EmailLayout
            language={language}
            preview={copy.intro(enabled)}
            heading={copy.subject(enabled)}
            homeUrl={homeUrl}
            homeName={homeName}
            supportEmail={supportEmail}
            supportLabel={copy.support}
            signOff={copy.signOff}
        >
            <Text style={EMAIL_BODY}>{copy.greeting(name)}</Text>
            <Text style={EMAIL_BODY}>{copy.intro(enabled)}</Text>
            <Text style={EMAIL_BODY}>{copy.sessions}</Text>
            <Text style={EMAIL_MUTED}>{copy.warning}</Text>
        </EmailLayout>
    );
};

export default MfaChangedEmail;
